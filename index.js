/**
 * Host half of the LaTeX Studio bundle.
 *
 * Registers three exact routes on the browser web server so the Client half can
 * drive a TeX compile without any framework remote plumbing:
 *
 * - POST /dsh-latex/compile  { tex, engine } -> runs the engine on the Host
 * - POST /dsh-latex/write    { path, content } -> saves edited .tex source
 * - GET  /dsh-latex/engines  -> engine availability (resolveExecutable probe)
 *
 * These are `WebRoute` handlers (raw IncomingMessage/ServerResponse), not
 * `WebResource` responders, because the resource seam only answers GET/HEAD and
 * 405s every POST. All paths arrive as absolute paths resolved by the Client
 * through the standard workspaceFiles stat Remote, so this half never touches
 * the Session.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PREFIX = '/dsh-latex'
const ENGINES = ['pdflatex', 'xelatex', 'lualatex']
const COLLECT_BYTES = 500_000
const LOG_TAIL = 20_000
const BODY_CAP = 5_000_000
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PDFJS_FILES = { pdf: 'pdf.min.mjs', worker: 'pdf.worker.min.mjs' }

export const inject = ['webServer']

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  const web = ctx.webServer
  const sub = ctx.get('subprocess')

  /** Collect a JSON request body from a raw IncomingMessage. */
  const readJsonBody = (req) => new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > BODY_CAP) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve(undefined)
      }
    })
    req.on('error', () => resolve(undefined))
  })

  const sendJson = (res, status, value) => {
    const body = JSON.stringify(value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  /** Drain a collect-mode reader (offset-based, non-consuming) to a tail string. */
  const drain = (reader) => {
    if (!reader) return ''
    let off = 0
    let out = ''
    for (let i = 0; i < 512; i += 1) {
      const chunk = reader.readFrom(off)
      if (chunk.text) out += chunk.text
      if (chunk.nextOffset === off) break
      off = chunk.nextOffset
    }
    return out.length > LOG_TAIL ? out.slice(-LOG_TAIL) : out
  }

  const compile = {
    kind: 'exact',
    path: `${PREFIX}/compile`,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'post-required' })
        return
      }
      if (!sub) {
        sendJson(res, 503, { ok: false, error: 'subprocess-unavailable' })
        return
      }
      const body = await readJsonBody(req)
      const tex = typeof body?.tex === 'string' ? body.tex : ''
      const engine = typeof body?.engine === 'string' ? body.engine : 'xelatex'
      if (!tex) {
        sendJson(res, 400, { ok: false, error: 'missing-tex' })
        return
      }
      if (!ENGINES.includes(engine)) {
        sendJson(res, 400, { ok: false, error: `unknown-engine: ${engine}` })
        return
      }
      try {
        await fs.access(tex)
      } catch {
        sendJson(res, 404, { ok: false, error: `tex-not-found: ${tex}` })
        return
      }
      let executable
      try {
        executable = await sub.resolveExecutable(engine)
      } catch {
        sendJson(res, 422, { ok: false, error: `engine-not-found: ${engine}` })
        return
      }
      const cwd = path.dirname(tex)
      const base = path.basename(tex).replace(/\.(tex|ltx)$/i, '')
      let handle
      try {
        handle = sub.spawn({
          argv: [executable, '-interaction=nonstopmode', '-halt-on-error', '-synctex=1', '-output-directory', cwd, `${base}.tex`],
          cwd,
          stdio: {
            stdin: 'ignore',
            stdout: { maxBytes: COLLECT_BYTES, spill: { maxBytes: COLLECT_BYTES } },
            stderr: { maxBytes: COLLECT_BYTES, spill: { maxBytes: COLLECT_BYTES } },
          },
          graceMs: 5000,
        })
      } catch (error) {
        sendJson(res, 422, { ok: false, error: `spawn-failed: ${error instanceof Error ? error.message : String(error)}` })
        return
      }
      const outcome = await handle.done.catch(() => ({ exitCode: null, signal: 'aborted' }))
      const log = [drain(handle.collected.stderr), drain(handle.collected.stdout)].filter(Boolean).join('\n')
      const pdf = path.join(cwd, `${base}.pdf`)
      let pdfOk = false
      try {
        await fs.access(pdf)
        pdfOk = true
      } catch {
        pdfOk = false
      }
      sendJson(res, 200, {
        ok: outcome.exitCode === 0 && pdfOk,
        exitCode: outcome.exitCode,
        pdf: pdfOk ? pdf : undefined,
        log,
      })
    },
  }

  const write = {
    kind: 'exact',
    path: `${PREFIX}/write`,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'post-required' })
        return
      }
      const body = await readJsonBody(req)
      const target = typeof body?.path === 'string' ? body.path : ''
      const content = typeof body?.content === 'string' ? body.content : null
      if (!target || content === null) {
        sendJson(res, 400, { ok: false, error: 'bad-body' })
        return
      }
      try {
        // Snapshot the current on-disk version into a per-directory backup
        // folder before overwriting, so multi-writer pollution (another agent
        // or device editing the same file) is always recoverable.
        let disk = null
        try {
          const st = await fs.stat(target)
          if (st.isFile()) disk = st
        } catch { /* new file: nothing to back up */ }
        if (disk !== null) {
          const backupDir = path.join(path.dirname(target), '.dsh-latex-studio-backups')
          const stamp = new Date(disk.mtimeMs).toISOString().replace(/[:.]/g, '-')
          const base = path.basename(target)
          await fs.mkdir(backupDir, { recursive: true })
          await fs.copyFile(target, path.join(backupDir, `${base}.${stamp}.bak`))
          const mine = (await fs.readdir(backupDir)).filter((name) => name.startsWith(`${base}.`)).sort()
          while (mine.length > 5) {
            await fs.rm(path.join(backupDir, mine.shift()), { force: true })
          }
        }
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, content, 'utf8')
        sendJson(res, 200, { ok: true })
      } catch (error) {
        sendJson(res, 422, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }

  const engines = {
    kind: 'exact',
    path: `${PREFIX}/engines`,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'get-required' })
        return
      }
      const found = {}
      for (const name of ENGINES) {
        if (!sub) {
          found[name] = { available: false }
          continue
        }
        try {
          found[name] = { available: true, path: await sub.resolveExecutable(name) }
        } catch {
          found[name] = { available: false }
        }
      }
      sendJson(res, 200, { engines: found })
    },
  }

  // Mount-state diagnostics reported by the Client workbench; kept in memory
  // (a ring of the latest few) so they can be read back without the GUI.
  const diagRing = []
  const diag = {
    kind: 'exact',
    path: `${PREFIX}/diag`,
    handler: async (req, res) => {
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        if (body && typeof body.diag === 'string') {
          diagRing.push({
            diag: body.diag.slice(0, 200),
            detail: body.detail ?? null,
            at: typeof body.at === 'number' ? body.at : Date.now(),
          })
          if (diagRing.length > 12) diagRing.shift()
        }
        sendJson(res, 200, { ok: true })
        return
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        sendJson(res, 200, { ok: true, latest: diagRing[diagRing.length - 1] ?? null, ring: diagRing })
        return
      }
      sendJson(res, 405, { ok: false, error: 'post-or-get' })
    },
  }

  // Engine version probe: `<engine> --version`, first output line.
  const version = {
    kind: 'exact',
    path: `${PREFIX}/version`,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'get-required' })
        return
      }
      if (!sub) {
        sendJson(res, 503, { ok: false, error: 'subprocess-unavailable' })
        return
      }
      const url = new URL(req.url || '', 'http://127.0.0.1')
      const engine = url.searchParams.get('engine') || ''
      if (!ENGINES.includes(engine)) {
        sendJson(res, 400, { ok: false, error: `unknown-engine: ${engine}` })
        return
      }
      let executable
      try {
        executable = await sub.resolveExecutable(engine)
      } catch {
        sendJson(res, 422, { ok: false, error: `engine-not-found: ${engine}` })
        return
      }
      let handle
      try {
        handle = sub.spawn({
          argv: [executable, '--version'],
          cwd: process.cwd(),
          stdio: {
            stdin: 'ignore',
            stdout: { maxBytes: 65536, spill: { maxBytes: 65536 } },
            stderr: { maxBytes: 65536, spill: { maxBytes: 65536 } },
          },
          graceMs: 3000,
        })
      } catch (error) {
        sendJson(res, 422, { ok: false, error: `spawn-failed: ${error instanceof Error ? error.message : String(error)}` })
        return
      }
      await handle.done.catch(() => null)
      const out = drain(handle.collected.stdout) || drain(handle.collected.stderr)
      const first = out.split('\n').map((line) => line.trim()).filter(Boolean)[0] || ''
      sendJson(res, 200, { ok: true, version: first })
    },
  }

  // Serve the bundled pdf.js module files to the Client half (ESM text).
  const pdfjsRoute = {
    kind: 'exact',
    path: `${PREFIX}/pdfjs`,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'get-required' })
        return
      }
      const url = new URL(req.url || '', 'http://127.0.0.1')
      const name = PDFJS_FILES[url.searchParams.get('file') || '']
      if (!name) {
        sendJson(res, 400, { ok: false, error: 'unknown-file' })
        return
      }
      try {
        const body = await fs.readFile(path.join(HERE, 'assets', name))
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          'content-length': body.length,
          'cache-control': 'public, max-age=86400',
        })
        res.end(body)
      } catch {
        sendJson(res, 404, { ok: false, error: 'pdfjs-missing' })
      }
    },
  }

  // SyncTeX resolution via the distribution's own `synctex` CLI:
  // view (tex line -> pdf page) and edit (pdf page -> tex file/line).
  const syncRoute = {
    kind: 'exact',
    path: `${PREFIX}/sync`,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'post-required' })
        return
      }
      if (!sub) {
        sendJson(res, 503, { ok: false, error: 'subprocess-unavailable' })
        return
      }
      const body = await readJsonBody(req)
      const mode = body?.mode === 'edit' ? 'edit' : 'view'
      const pdf = typeof body?.pdf === 'string' ? body.pdf : ''
      const dir = typeof body?.dir === 'string' ? body.dir : ''
      if (!pdf || !dir) {
        sendJson(res, 400, { ok: false, error: 'bad-body' })
        return
      }
      let exe
      try {
        exe = await sub.resolveExecutable('synctex')
      } catch {
        sendJson(res, 422, { ok: false, error: 'synctex-not-found' })
        return
      }
      let argv
      if (mode === 'view') {
        const tex = typeof body.tex === 'string' ? body.tex : ''
        const line = Number.isFinite(body.line) ? body.line : 1
        const col = Number.isFinite(body.col) ? body.col : 0
        if (!tex) {
          sendJson(res, 400, { ok: false, error: 'bad-body' })
          return
        }
        argv = [exe, 'view', '-i', `${line}:${col}:${tex}`, '-o', pdf, '-d', dir]
      } else {
        const page = Number.isFinite(body.page) ? body.page : 1
        const x = Number.isFinite(body.x) ? body.x : 0
        const y = Number.isFinite(body.y) ? body.y : 0
        argv = [exe, 'edit', '-o', `${page}:${x}:${y}:${pdf}`, '-d', dir]
      }
      let handle
      try {
        handle = sub.spawn({
          argv,
          cwd: dir,
          stdio: {
            stdin: 'ignore',
            stdout: { maxBytes: 65536, spill: { maxBytes: 65536 } },
            stderr: { maxBytes: 16384, spill: { maxBytes: 16384 } },
          },
          graceMs: 5000,
        })
      } catch (error) {
        sendJson(res, 422, { ok: false, error: `spawn-failed: ${error instanceof Error ? error.message : String(error)}` })
        return
      }
      await handle.done.catch(() => null)
      const out = drain(handle.collected.stdout)
      if (mode === 'view') {
        const m = /^Page:(\d+)/m.exec(out)
        sendJson(res, 200, { ok: m !== null, page: m ? Number(m[1]) : 0 })
      } else {
        const mi = /^Input:(.+)$/m.exec(out)
        const ml = /^Line:(-?\d+)/m.exec(out)
        sendJson(res, 200, { ok: mi !== null, input: mi ? mi[1].trim() : '', line: ml ? Number(ml[1]) : 0 })
      }
    },
  }

  // Remove one document's auxiliary outputs (the .bbl bibliography and the
  // PDF are kept so single-pass citation workflows survive a clean).
  const CLEAN_EXTS = ['.aux', '.log', '.out', '.toc', '.lof', '.lot', '.fls', '.fdb_latexmk', '.blg', '.synctex.gz', '.spl', '.loa', '.nav', '.snm', '.vrb']
  const clean = {
    kind: 'exact',
    path: `${PREFIX}/clean`,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'post-required' })
        return
      }
      const body = await readJsonBody(req)
      const dir = typeof body?.dir === 'string' ? body.dir : ''
      const base = typeof body?.base === 'string' ? body.base : ''
      if (!dir || !base || base.includes('..') || base.includes('/') || base.includes('\\')) {
        sendJson(res, 400, { ok: false, error: 'bad-body' })
        return
      }
      const deleted = []
      for (const ext of CLEAN_EXTS) {
        const target = path.join(dir, base + ext)
        try {
          await fs.rm(target, { force: true })
          deleted.push(base + ext)
        } catch { /* absent or locked: skip */ }
      }
      sendJson(res, 200, { ok: true, deleted })
    },
  }

  ctx.effect(() => web.register(compile), 'dsh-latex-studio: compile route')
  ctx.effect(() => web.register(write), 'dsh-latex-studio: write route')
  ctx.effect(() => web.register(engines), 'dsh-latex-studio: engines route')
  ctx.effect(() => web.register(version), 'dsh-latex-studio: version route')
  ctx.effect(() => web.register(syncRoute), 'dsh-latex-studio: sync route')
  ctx.effect(() => web.register(clean), 'dsh-latex-studio: clean route')
  ctx.effect(() => web.register(diag), 'dsh-latex-studio: diag route')
  ctx.effect(() => web.register(pdfjsRoute), 'dsh-latex-studio: pdfjs route')
}
