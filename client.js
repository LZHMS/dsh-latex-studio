/**
 * Browser half of the LaTeX Studio bundle.
 *
 * Everything lives in the right Sidebar's `latex` tab (the centre column is
 * never touched):
 * - Toolbar: main .tex path + Browse… + engine + Save + Compile + status.
 * - Split body: source editor LEFT, PDF preview RIGHT, with a draggable
 *   vertical splitter (default 50/50, 20–80 range). The sidebar fullscreen
 *   button enlarges the whole workbench.
 * - Compiler log below.
 * The left-Sidebar footer entry opens the tab, or closes it while the tab
 * body is mounted.
 *
 * Compilation runs on the Host over the exact /dsh-latex/* routes registered
 * by this bundle's node half; file reads use the standard workspaceFiles
 * Remote.
 */
window.__ModuleLoader__.load({
  id: '@zhaulee/dsh-latex-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useLayoutEffect = React.useLayoutEffect;
    const useReducer = React.useReducer;
    const useRef = React.useRef;

    const NS = 'latexWorkbench';
    const TAB_ID = 'dsh-latex-studio';
    const KIND = 'latex';
    const ENGINES = ['pdflatex', 'xelatex', 'lualatex'];

    const CSS = [
      '.dsh-latex{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;}',
      '.dsh-latex-toolbar{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex-wrap:wrap;flex:none;}',
      '.dsh-latex-input{min-width:110px;max-width:300px;flex:1 1 130px;min-height:29px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;outline:none;box-sizing:border-box;}',
      '.dsh-latex-input:focus{border-color:var(--dsw-alias-brand-primary);}',
      '.dsh-latex-select{padding:5px 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;outline:none;}',
      '.dsh-latex-btn{padding:5px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;white-space:nowrap;}',
      '.dsh-latex-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);}',
      '.dsh-latex-btn:disabled{opacity:.5;cursor:default;}',
      '.dsh-latex-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff;}',
      '.dsh-latex-btn-primary:hover:not(:disabled){opacity:.9;}',
      // ColTeX-style toolbar: blue Recompile split with an engine dropdown,
      // a Logs button with a count badge, a Download icon button.
      '.dsh-latex-re-wrap{position:relative;display:inline-flex;flex:none;}',
      '.dsh-latex-recompile{display:inline-flex;align-items:stretch;border-radius:7px;overflow:hidden;}',
      '.dsh-latex-re-main{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border:none;background:#2f6fed;color:#fff;font-size:12px;cursor:pointer;}',
      '.dsh-latex-re-main:hover:not(:disabled){background:#2559c9;}',
      '.dsh-latex-re-caret{border:none;border-left:1px solid rgba(255,255,255,.28);background:#2f6fed;color:#fff;font-size:10px;padding:0 8px;cursor:pointer;}',
      '.dsh-latex-re-caret:hover{background:#2559c9;}',
      '.dsh-latex-recompile button:disabled{opacity:.55;cursor:default;}',
      '.dsh-latex-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:20;min-width:190px;background:var(--dsw-static-neutral-bluish-00);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 10px 26px rgba(0,0,0,.28);padding:4px;}',
      'body[data-ds-dark-theme] .dsh-latex-menu{background:var(--dsw-static-neutral-bluish-875);}',
      '.dsh-latex-menu button{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:6px 10px;border:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;border-radius:7px;}',
      '.dsh-latex-menu button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06));}',
      '.dsh-latex-menu button[disabled]{opacity:.45;cursor:default;}',
      '.dsh-latex-menu-sep{height:1px;background:var(--dsw-alias-border-l1);margin:4px 2px;}',
      '.dsh-latex-menu-label{padding:3px 10px;font-size:10px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-latex-menu-check{color:#2f6fed;font-weight:700;}',
      '.dsh-latex-auto-dot{color:#2ee6a8;font-size:9px;margin-right:4px;}',
      '.dsh-latex-backdrop{position:fixed;inset:0;z-index:19;}',
      '.dsh-latex-badge{display:inline-block;min-width:15px;margin-left:6px;padding:1px 5px;border-radius:8px;background:rgba(120,130,150,.18);font-size:10px;}',
      '.dsh-latex-badge-err{background:#e5484d;color:#fff;}',
      '.dsh-latex-logstats{display:inline-flex;align-items:center;gap:8px;margin-left:8px;}',
      '.dsh-latex-stat{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-latex-stat-n-err{color:#e5484d;font-weight:700;}',
      '.dsh-latex-dl{display:inline-flex;align-items:center;justify-content:center;padding:5px 8px;flex:none;}',
      '.dsh-latex-seg{display:inline-flex;gap:2px;}',
      '.dsh-latex-segb{display:inline-flex;align-items:center;justify-content:center;padding:5px 7px;flex:none;}',
      '.dsh-latex-seg-on{border-color:#2f6fed;color:#2f6fed;background:rgba(47,111,237,.08);}',
      '.dsh-latex-status{font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-latex-status-ok{color:var(--dsw-alias-state-success-primary);}',
      '.dsh-latex-status-err{color:var(--dsw-alias-state-error-primary);}',
      '.dsh-latex-dot{color:var(--dsw-alias-state-warn-primary);font-size:9px;flex:none;}',
      // Split body: source left, PDF right, draggable vertical splitter.
      '.dsh-latex-cols{flex:1;min-height:0;display:flex;align-items:stretch;position:relative;}',
      '.dsh-latex-col-src{box-sizing:border-box;flex:0 0 50%;min-width:0;position:relative;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l1);}',
      '.dsh-latex-srcbar{display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-static-neutral-bluish-100);flex:none;flex-wrap:wrap;}',
      'body[data-ds-dark-theme] .dsh-latex-srcbar{background:var(--dsw-static-neutral-bluish-875);}',
      '.dsh-latex-srcbody{position:relative;flex:1;min-height:0;}',
      '.dsh-latex-col-pdf{flex:1;min-width:0;position:relative;display:flex;flex-direction:column;}',
      // PDF column header: Recompile + engine menu + Logs toggle + version + Download
      '.dsh-latex-pdfbar{display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-static-neutral-bluish-100);flex:none;flex-wrap:wrap;}',
      'body[data-ds-dark-theme] .dsh-latex-pdfbar{background:var(--dsw-static-neutral-bluish-875);}',
      '.dsh-latex-pdfbody{position:relative;flex:1;min-height:0;}',
      '.dsh-latex-btn-active{border-color:#2f6fed;color:#2f6fed;}',
      '.dsh-latex-logpane{position:absolute;inset:0;margin:0;overflow:auto;padding:10px;background:var(--dsw-static-neutral-bluish-00);color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;}',
      'body[data-ds-dark-theme] .dsh-latex-logpane{background:var(--dsw-static-neutral-bluish-950);}',
      '.dsh-latex-lerr{color:#e5484d;font-weight:700;}',
      '.dsh-latex-lwarn{color:#d98a1f;}',
      '.dsh-latex-linfo{color:#4d9fe8;}',
      '.dsh-latex-splitter{flex:0 0 9px;position:relative;cursor:col-resize;background:transparent;touch-action:none;margin:0 -1px;z-index:2;}',
      '.dsh-latex-splitter::after{content:\'\';position:absolute;top:0;bottom:0;left:3px;width:2px;border-radius:2px;background:var(--dsw-alias-border-l2);}',
      '.dsh-latex-splitter:hover::after,.dsh-latex-splitter[data-drag]::after{background:var(--dsw-alias-brand-primary);}',
      '.dsh-latex-source{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;resize:none;border:none;outline:none;padding:10px 10px 10px 56px;background:transparent;color:transparent;caret-color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.55;white-space:pre;overflow:auto;scrollbar-width:none;tab-size:4;z-index:2;}',
      // The overlay highlight layer must wrap at EXACTLY the textarea's width
      // or soft-wrap selection drifts; keep scrollbars off both so the
      // content boxes match to the pixel.
      '.dsh-latex-source::-webkit-scrollbar{width:0;height:0;}',
      '.dsh-latex-source::selection{background:rgba(77,127,255,.45);}',
      '.dsh-latex-source::placeholder{color:var(--dsw-alias-label-secondary);}',
      // Syntax-highlight overlay under the transparent textarea. Font metrics
      // MUST match .dsh-latex-source exactly; scroll positions are synced.
      '.dsh-latex-hl{position:absolute;inset:0;margin:0;box-sizing:border-box;padding:10px 10px 10px 56px;overflow:hidden;white-space:pre;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.55;tab-size:4;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);pointer-events:none;z-index:1;}',
      '.dsh-latex-hl .t-cmd{color:var(--dsw-alias-syntax-keyword,#8250df);}',
      '.dsh-latex-hl .t-env{color:var(--dsw-alias-syntax-control,#1a7f37);font-weight:600;}',
      '.dsh-latex-hl .t-cm{color:var(--dsw-alias-syntax-comment,#6a737d);font-style:italic;}',
      '.dsh-latex-hl .t-math{color:var(--dsw-alias-syntax-string,#0a7ea4);}',
      '.dsh-latex-hl .t-ml{color:var(--dsw-alias-syntax-string,#0a7ea4);font-weight:700;}',
      '.dsh-latex-hl .t-brace{color:var(--dsw-alias-label-secondary);}',
      '.dsh-latex-hl .t-sep{color:var(--dsw-alias-state-warn-primary);}',
      '.dsh-latex-hl .tline{display:block;min-height:1.55em;}',
      // Line-number gutter and selection line bands (sync-scrolled layers).
      '.dsh-latex-gutter{position:absolute;left:0;top:0;bottom:0;width:46px;box-sizing:border-box;margin:0;padding:10px 8px 10px 0;overflow:hidden;background:var(--dsw-alias-bg-base);border-right:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right;white-space:pre;line-height:1.55;user-select:none;z-index:3;pointer-events:none;}',
      '.dsh-latex-gutter span{display:block;}',
      '.dsh-latex-lines{position:absolute;left:46px;right:0;top:0;bottom:0;overflow:hidden;z-index:0;pointer-events:none;}',
      '.dsh-latex-lineband{position:absolute;left:0;right:0;background:rgba(122,158,255,.17);}',
      // Comments: yellow bands, gutter chips, add button and popovers.
      '.dsh-latex-commentband{position:absolute;left:0;right:0;background:rgba(245,196,81,.14);}',
      '.dsh-latex-anno{position:absolute;left:0;top:0;bottom:0;right:0;overflow:hidden;pointer-events:none;z-index:5;}',
      '.dsh-latex-anno button,.dsh-latex-anno .dsh-latex-commentpop{pointer-events:auto;}',
      '.dsh-latex-chip{position:absolute;left:.1em;width:1.5em;height:1.5em;padding:0;border:none;border-radius:.4em;background:rgba(245,196,81,.45);cursor:pointer;font-size:.85em;line-height:1.5em;}',
      '.dsh-latex-pendingchip{position:absolute;left:.1em;width:1.5em;height:1.5em;padding:0;border:1px dashed rgba(120,130,150,.7);border-radius:.4em;background:rgba(120,130,150,.12);cursor:pointer;font-size:.8em;line-height:1.4em;opacity:.85;}',
      '.dsh-latex-commentadd{position:absolute;font-size:.95em;padding:.25em .7em;border-radius:.5em;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-static-neutral-bluish-100);color:var(--dsw-alias-label-primary);cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18);}',
      'body[data-ds-dark-theme] .dsh-latex-commentadd{background:var(--dsw-static-neutral-bluish-875);}',
      '.dsh-latex-commentpop{position:absolute;width:min(28em, calc(100% - 2em));box-sizing:border-box;background:var(--dsw-static-neutral-bluish-00);border:1px solid var(--dsw-alias-border-l2);border-radius:.8em;box-shadow:0 10px 26px rgba(0,0,0,.25);padding:.8em;font-size:.95em;z-index:6;}',
      'body[data-ds-dark-theme] .dsh-latex-commentpop{background:var(--dsw-static-neutral-bluish-875);}',
      '.dsh-latex-commentquote{color:var(--dsw-alias-label-secondary);font-size:.9em;border-left:.25em solid rgba(245,196,81,.6);padding:0 0 0 .6em;margin:0 0 .5em;font-family:ui-monospace,Consolas,monospace;}',
      '.dsh-latex-commentnote{white-space:pre-wrap;margin:0 0 .5em;}',
      '.dsh-latex-commentinput{width:100%;box-sizing:border-box;min-height:3.2em;margin:0 0 .5em;padding:.5em;border:1px solid var(--dsw-alias-border-l2);border-radius:.5em;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:1em;resize:vertical;font-family:inherit;}',
      '.dsh-latex-commentactions{display:flex;gap:.5em;justify-content:flex-end;}',
      // Line-wrap mode (Alt+Z toggle): soft wrap in BOTH layers so they stay aligned.
      '.dsh-latex-source.dsh-wrap,.dsh-latex-hl.dsh-wrap{white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;}',
      // pdf.js rendered pages (scrollable, lazy per-page canvases + selectable text)
      '.dsh-latex-pdfwrap{position:absolute;inset:0;}',
      '.dsh-latex-pdfpages{position:absolute;inset:0;overflow:auto;background:#3f4652;padding:8px;box-sizing:border-box;}',
      '.dsh-latex-pdfpage{position:relative;background:#fff;margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.4);}',
      '.dsh-latex-pdfpage canvas{display:block;width:100%;height:auto;}',
      '.dsh-latex-textlayer{position:absolute;inset:0;overflow:hidden;line-height:1;user-select:text;}',
      '.dsh-latex-textlayer span{position:absolute;white-space:pre;color:transparent;}',
      '.dsh-latex-textlayer ::selection{background:rgba(77,127,255,.4);}',
      '.dsh-latex-zoombar{position:absolute;top:10px;right:14px;z-index:6;display:flex;align-items:center;gap:2px;background:rgba(12,16,26,.82);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:2px;}',
      '.dsh-latex-zoombar button{width:24px;height:22px;border:none;background:transparent;color:#d6dcec;font-size:13px;cursor:pointer;border-radius:5px;}',
      '.dsh-latex-zoombar button:hover{background:rgba(255,255,255,.14);}',
      '.dsh-latex-zoombar span{min-width:42px;text-align:center;font-size:11px;color:#aeb6c8;}',
      '.dsh-latex-pdf-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);font-size:12px;padding:16px;text-align:center;}',
      '.dsh-latex-logwrap{border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary);flex:none;}',
      '.dsh-latex-logwrap summary{padding:6px 10px;cursor:pointer;user-select:none;}',
      '.dsh-latex-log{margin:0;max-height:160px;overflow:auto;padding:8px 10px;border-top:1px solid var(--dsw-alias-border-l1);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-base);}',
      // Entry row mirrors the shipped sidebar footer entries (dsh-m "插件市场").
      '.dsh-latex-entry{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:42px;margin:4px 0;padding:0 9px;border:0;border-inline:var(--dsh-sidebar-paint-inset,3px) solid transparent;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;cursor:pointer;overflow:hidden;}',
      '.dsh-latex-entry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06));}',
      '.dsh-latex-entry svg{flex:none;width:16px;height:16px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-latex-entry span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dsh-latex-entry.rail{width:36px;height:36px;margin:8px auto 10px;padding:0;justify-content:center;border-radius:50%;gap:0;}',
      '.dsh-latex-entry.rail svg{width:18px;height:18px;}',
      // Tab chip: glyph before the label (same pattern as the file/guide chips).
      '.dsh-latex-title-icon{display:inline-flex;align-items:center;flex:none;margin-right:6px;color:var(--dsw-alias-label-secondary);}',
      // Engine version chip (toolbar right edge)
      '.dsh-latex-engineinfo{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-secondary);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 8px;border:1px dashed var(--dsw-alias-border-l2);border-radius:6px;}',
      // File browser (overlay over the source column)
      '.dsh-latex-browse{position:absolute;top:6px;left:6px;right:6px;z-index:3;display:flex;flex-direction:column;max-height:65%;border-radius:12px;border:1px solid var(--dsw-alias-border-l2);box-shadow:0 10px 28px rgba(0,0,0,.22);overflow:hidden;background:var(--dsw-static-neutral-bluish-00);}',
      'body[data-ds-dark-theme] .dsh-latex-browse{background:var(--dsw-static-neutral-bluish-950);}',
      '.dsh-latex-browse-head{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-static-neutral-bluish-100);}',
      'body[data-ds-dark-theme] .dsh-latex-browse-head{background:var(--dsw-static-neutral-bluish-875);}',
      '.dsh-latex-browse-dir{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-latex-browse-list{flex:1;min-height:0;overflow:auto;padding:4px 0;}',
      '.dsh-latex-browse-row{display:flex;align-items:center;gap:8px;width:100%;padding:6px 10px;border:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:12.5px;cursor:pointer;text-align:left;}',
      '.dsh-latex-browse-row:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.dsh-latex-browse-glyph{display:inline-flex;align-items:center;color:var(--dsw-alias-label-secondary);flex:none;}',
      '.dsh-latex-browse-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}',
      '.dsh-latex-browse-size{font-size:11px;color:var(--dsw-alias-label-secondary);flex:none;}',
      '.dsh-latex-browse-hint{padding:12px 10px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
    ].join('\n');

    // ---------------------------------------------------------------- store
    // Module-level workbench state (the tab body is the only consumer now;
    // the store also lets the left entry close the mounted tab).
    const wbStore = (() => {
      let state = {
        closeCurrent: null,
        texPath: 'main.tex',
        engine: 'xelatex',
        splitPct: 50,
        wrap: false,
        fontSize: 12,
        source: '',
        dirty: false,
        loading: false,
        compiling: false,
        status: null,
        pdfUrl: null,
        pdfAbs: '',
        engineInfo: null,
        loadedKey: null,
        loadedVer: null,
        loadedText: '',
        diskChanged: false,
        compileMode: 'once', // 'once' | 'clean' | 'auto'
        layout: 'split', // 'code' | 'split' | 'pdf'
        histStack: [],
        histIdx: -1,
        savedIdx: -1,
        staleAt: 0,
        synctex: null,
      };
      const listeners = new Set();
      return {
        get: () => state,
        set(patch) {
          state = typeof patch === 'function' ? patch(state) : Object.assign({}, state, patch);
          listeners.forEach((l) => l());
        },
        subscribe(l) {
          listeners.add(l);
          return () => { listeners.delete(l); };
        },
      };
    })();

    // Two-level undo history. Entries are { text, t, saved }.
    // - Typing pushes entries, but keystrokes within a short burst coalesce
    //   into one step (neither per-letter nor all-at-once).
    // - Save/load/adopt push a saved:true checkpoint; savedIdx tracks the
    //   latest one, and ⇤ jumps straight back to it.
    function pushInput(s, text) {
      const now = Date.now();
      const stack = s.histStack.slice(0, s.histIdx + 1);
      if (stack.length === 0) stack.push({ text, t: now, saved: true });
      const last = stack[stack.length - 1];
      if (!last.saved && now - last.t < 1500) last.text = text;
      else stack.push({ text, t: now, saved: false });
      let idx = stack.length - 1;
      let saved = s.savedIdx;
      while (stack.length > 500) { stack.shift(); idx -= 1; saved -= 1; }
      if (stack[saved] && stack[saved].saved === false) { while (saved > 0 && !stack[saved].saved) saved -= 1; }
      return { histStack: stack, histIdx: idx, savedIdx: saved };
    }

    function pushSaved(s, text) {
      const stack = s.histStack.slice(0, s.histIdx + 1);
      stack.push({ text, t: Date.now(), saved: true });
      let idx = stack.length - 1;
      let saved = idx;
      while (stack.length > 500) { stack.shift(); idx -= 1; saved -= 1; }
      return { histStack: stack, histIdx: idx, savedIdx: saved };
    }

    function useWb() {
      const [, force] = useReducer((x) => x + 1, 0);
      useEffect(() => wbStore.subscribe(force), []);
      return wbStore.get();
    }

    // ---------------------------------------------------------------- icons
    /** Quill glyph shared by the tab chip, the entry and file rows: an
     *  elegant calligraphic feather whose width tapers — narrow at the nib,
     *  full mid-blade, fine at the tip — plus shaft and writing trail. */
    function Glyph({ size }) {
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, fill: 'none' },
        // Feather blade (solid, width-graded outline)
        h('path', {
          d: 'M20.5 3.5C16.8 5.6 11.6 8.6 7.6 13.4c-1.4 1.7-2.2 3.2-2.6 4.9 2-.7 3.8-2.1 6-4.1 3.2-2.9 6.9-7.2 9.5-10.7Z',
          fill: 'currentColor', stroke: 'currentColor', strokeWidth: 1, strokeLinejoin: 'round',
        }),
        // Shaft to the nib
        h('path', { d: 'M5 18.3 3 20.5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        // Writing trail (curve)
        h('path', {
          d: 'M6.2 22.4c2.3-1.3 4.4 1 6.9-.5',
          stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
        }),
      );
    }

    function FolderGlyph({ size }) {
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, fill: 'none' },
        h('path', {
          d: 'M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2c.4 0 .78.16 1.06.44l1.1 1.1c.28.28.66.44 1.06.44H19a1.5 1.5 0 0 1 1.5 1.5v8.62a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-10.1Z',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round',
        }),
      );
    }

    // ----------------------------------------------------------------- face
    /** Host bridge: the bundle's exact /dsh-latex routes + workspaceFiles Remote. */
    function makeFace(ctx, sessionId) {
      const wf = ctx.remote.workspaceFiles;
      const postJson = (url, body) => fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then((response) => response.json().catch(() => ({ ok: false, error: `http-${response.status}` })));
      const getJson = (url) => fetch(url).then((response) => response.json().catch(() => ({ ok: false, error: `http-${response.status}` })));
      return {
        sessionId,
        readBytes: (p) => wf.readBytes(sessionId, p, {}, undefined),
        stat: (p) => wf.stat(sessionId, p, undefined),
        list: (p) => wf.list(sessionId, p, undefined),
        compile: (tex, engine) => postJson('/dsh-latex/compile', { tex, engine }),
        write: (path, content) => postJson('/dsh-latex/write', { path, content }),
        engines: () => getJson('/dsh-latex/engines'),
        version: (engine) => getJson('/dsh-latex/version?engine=' + encodeURIComponent(engine)),
        sync: (payload) => postJson('/dsh-latex/sync', payload),
        clean: (dir, base) => postJson('/dsh-latex/clean', { dir, base }),
      };
    }

    // --------------------------------------------------------------- actions
    const resolveAbs = async (face, texPath) => {
      const res = await face.stat(texPath.trim());
      if (!res.ok) throw new Error(res.error.code);
      return res.value.absolutePath;
    };

    async function doLoad(face, t) {
      const s = wbStore.get();
      const p = s.texPath.trim();
      if (!p || !face) return;
      const key = (face.sessionId || '') + '\u0000' + p;
      // Keep unsaved edits: re-loading the same document while dirty is a no-op.
      if (s.dirty && s.loadedKey === key) return;
      wbStore.set({ loading: true, status: null, loadedKey: key, synctex: null });
      try {
        const res = await face.readBytes(p);
        if (wbStore.get().loadedKey !== key) return; // stale: a newer load started
        if (res.ok) {
          const text = new TextDecoder('utf-8').decode(res.value.data);
          wbStore.set({ source: text, dirty: false, diskChanged: false, loadedVer: (res.value && res.value.version) || null, loadedText: text, histStack: [{ text, t: Date.now(), saved: true }], histIdx: 0, savedIdx: 0 });
        } else {
          wbStore.set({ source: '', status: { ok: false, message: `${t('error.load')}: ${res.error.code}`, log: '' } });
        }
      } catch (error) {
        if (wbStore.get().loadedKey === key) {
          wbStore.set({ status: { ok: false, message: `${t('error.load')}: ${error && error.message ? error.message : String(error)}`, log: '' } });
        }
      } finally {
        if (wbStore.get().loadedKey === key) wbStore.set({ loading: false });
      }
    }

    async function doCompile(face, t, opts = {}) {
      if (!face) return;
      if (wbStore.get().compiling) return; // never run two engines at once
      const s = wbStore.get();
      // Compile reads the file on disk: flush unsaved edits first so the
      // editor is always what gets compiled. This internal save must not
      // re-trigger the auto-compile watcher (recursion guard).
      if (s.dirty) {
        try { await doSave(face, t, { silentAuto: true, force: opts.force }); } catch (e) { /* fall through to disk content */ }
      }
      // Editing a section subfile? Find the compilable root document and
      // compile THAT instead (the subfile stays open in the editor).
      let rel = s.texPath.trim();
      let autoNote = '';
      let notIncludedNote = '';
      if (s.source && s.source.indexOf('\\documentclass') === -1) {
        const found = await findMainFile(face, rel);
        if (found === null) {
          wbStore.set({ status: { ok: false, message: t('error.subfile'), log: '' } });
          return;
        }
        autoNote = t('status.autoMain') + ' ' + found.rel;
        if (!mainReferences(found.text, rel)) notIncludedNote = t('warn.notincluded');
        rel = found.rel;
      }
      wbStore.set({ compiling: true, status: { ok: true, message: autoNote || t('status.compiling'), log: '' } });
      try {
        const abs = await resolveAbs(face, rel);
        if (opts.clean) {
          try { await face.clean(String(abs).replace(/[\\/][^\\/]+$/, ''), String(abs).split(/[\\/]/).pop().replace(/\.(tex|ltx)$/i, '')); } catch (e) { /* clean is best effort */ }
        }
        const result = await face.compile(abs, s.engine);
        if (result && result.ok && result.pdf) {
          const pdfRes = await face.readBytes(result.pdf);
          if (pdfRes.ok) {
            const prev = wbStore.get().pdfUrl;
            const url = URL.createObjectURL(new Blob([pdfRes.value.data], { type: 'application/pdf' }));
            wbStore.set({ pdfUrl: url, pdfAbs: result.pdf || '', status: { ok: true, message: t('status.ok') + (notIncludedNote ? ' — ' + notIncludedNote : ''), log: result.log || '' } });
            if (prev) URL.revokeObjectURL(prev);
            try {
              const gzRel = rel.replace(/\.(tex|ltx)$/i, '.synctex.gz');
              const gzRes = await face.readBytes(gzRel);
              wbStore.set({ synctex: gzRes.ok ? await parseSynctex(gzRes.value.data) : null });
            } catch (e) { wbStore.set({ synctex: null }); }
          } else {
            wbStore.set({ status: { ok: false, message: `${t('error.load')} (PDF)`, log: (result && result.log) || '' } });
          }
        } else {
          wbStore.set({ status: { ok: false, message: `${t('status.error')} (exit ${result && result.exitCode !== undefined ? result.exitCode : '?'})`, log: (result && result.log) || '' } });
        }
      } catch (error) {
        wbStore.set({ status: { ok: false, message: `${t('error.compile')}: ${error && error.message ? error.message : String(error)}`, log: '' } });
      } finally {
        wbStore.set({ compiling: false });
      }
    }

    // Save the current buffer. If the file changed on disk since load
    // (another agent or device), the three-way line merge combines BOTH the
    // external changes and the local edits — only genuinely overlapping,
    // different edits abort the write. The Host additionally snapshots the
    // disk copy into .dsh-latex-studio-backups/ before every write.
    // A genuine conflict is bypassed by clicking Save again within 30s
    // (explicit overwrite; the disk copy still gets the backup).
    async function doSave(face, t, opts = {}) {
      if (!face) return { ok: false };
      const s = wbStore.get();
      try {
        const abs = await resolveAbs(face, s.texPath);
        let outText = s.source;
        let mergedNote = '';
        if (!opts.force && s.loadedVer && s.loadedText) {
          const st = await face.stat(s.texPath.trim());
          if (st.ok && st.value.version && st.value.version !== s.loadedVer) {
            const disk = await face.readBytes(s.texPath.trim());
            let handled = false;
            if (disk.ok) {
              const diskText = new TextDecoder('utf-8').decode(disk.value.data);
              if (diskText !== s.loadedText) {
                const m = mergeThree(s.loadedText, s.source, diskText);
                if (m.conflicts === 0) {
                  outText = m.text;
                  mergedNote = t('status.merged');
                } else {
                  wbStore.set({ staleAt: Date.now(), diskChanged: true, status: { ok: false, message: t('status.conflict'), log: '' } });
                  return { ok: false, conflict: true };
                }
                handled = true;
              }
            }
            if (!handled && !mergedNote) {
              wbStore.set({ staleAt: Date.now(), diskChanged: true, status: { ok: false, message: t('status.stale'), log: '' } });
              return { ok: false, stale: true };
            }
          }
        }
        const forced = opts.force === true;
        const result = await face.write(abs, outText);
        if (result && result.ok) {
          try {
            const st2 = await face.stat(s.texPath.trim());
            if (st2.ok) wbStore.set({ loadedVer: st2.value.version || null });
          } catch (e) { /* keep the previous token */ }
          wbStore.set((prev) => {
            // The saved text (possibly a merge) becomes a new checkpoint.
            const ph = pushSaved(prev, outText);
            return Object.assign({}, ph, {
              dirty: false,
              diskChanged: false,
              staleAt: 0,
              loadedText: outText,
              source: outText,
              status: { ok: true, message: mergedNote || (forced ? t('status.forced') : t('toolbar.saved')), log: wbStore.get().status ? wbStore.get().status.log : '' },
            });
          });
        } else {
          wbStore.set({ status: { ok: false, message: `${t('error.write')}: ${result && result.error ? String(result.error) : ''}`, log: '' } });
        }
        // Auto compile mode: a completed save (not the internal save that
        // starts a compile) kicks off a compile when the mode is on.
        if (result && result.ok && !opts.silentAuto && wbStore.get().compileMode === 'auto' && !wbStore.get().compiling) void doCompile(face, t);
        return result || { ok: false };
      } catch (error) {
        wbStore.set({ status: { ok: false, message: `${t('error.write')}: ${error && error.message ? error.message : String(error)}`, log: '' } });
        return { ok: false };
      }
    }

    const joinPath = (dir, name) => (!dir || dir === '.' ? name : dir.replace(/\/+$/, '') + '/' + name);
    const parentPath = (dir) => {
      const parts = (dir || '').split('/').filter((p) => p && p !== '.');
      parts.pop();
      return parts.length ? parts.join('/') : '.';
    };
    // TeX log line severity: 'err' | 'warn' | 'info' | null. Continuation
    // lines such as "(Font) ..." inherit the warning bucket.
    function logLevel(line) {
      if (/^!/.test(line)) return 'err';
      if (/warning/i.test(line) || /^\(Font\)/.test(line)) return 'warn';
      if (/overfull|underfull|missing character|no font shape|undefined references|citation.*undefined/i.test(line)) return 'info';
      return null;
    }

    const LOG_LEVEL_CLASS = { err: 'dsh-latex-lerr', warn: 'dsh-latex-lwarn', info: 'dsh-latex-linfo' };

    const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
    const relDir = (p) => {
      const parts = String(p).split(/[\\/]+/);
      parts.pop();
      return parts.filter((x) => x && x !== '.').join('/');
    };
    const normPath = (p) => String(p).replace(/\\/g, '/').toLowerCase();
    const upDir = (dir) => {
      const parts = String(dir).split(/[\\/]+/).filter((x) => x && x !== '.');
      parts.pop();
      return parts.join('/');
    };

    // ------------------------------------------------------------- merge3
    // Line-level change hunks of `other` relative to `base` (common
    // prefix/suffix trimmed, then an LCS walk): [{ start, len, lines }].
    function hunksBetween(base, other) {
      let p = 0;
      while (p < base.length && p < other.length && base[p] === other[p]) p += 1;
      let s = 0;
      while (s < base.length - p && s < other.length - p && base[base.length - 1 - s] === other[other.length - 1 - s]) s += 1;
      const A = base.slice(p, base.length - s);
      const B = other.slice(p, other.length - s);
      const la = A.length;
      const lb = B.length;
      const w = lb + 1;
      const dp = new Uint32Array((la + 1) * w);
      for (let i = la - 1; i >= 0; i -= 1) {
        for (let j = lb - 1; j >= 0; j -= 1) {
          dp[i * w + j] = A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
        }
      }
      const hunks = [];
      let i = 0;
      let j = 0;
      let cs = -1;
      let cl = 0;
      let nl = [];
      const close = () => { if (cs !== -1) hunks.push({ start: cs + p, len: cl, lines: nl }); cs = -1; cl = 0; nl = []; };
      while (i < la || j < lb) {
        if (i < la && j < lb && A[i] === B[j]) { close(); i += 1; j += 1; continue; }
        if (cs === -1) cs = i;
        if (i < la && (j >= lb || dp[(i + 1) * w + j] >= dp[i * w + j + 1])) { cl += 1; i += 1; }
        else { nl.push(B[j]); j += 1; }
      }
      close();
      return hunks;
    }

    const sameLines = (x, y) => x.length === y.length && x.every((v, k) => v === y[k]);

    /** Three-way line merge of `mine` and `theirs` over the shared `base`.
     *  The same change made on BOTH sides at the same place (the double-paste
     *  pollution shape) is deduplicated to one copy; overlapping edits of
     *  different content count as conflicts (conflicts > 0). */
    function mergeThree(baseText, mineText, theirsText) {
      const base = String(baseText).split('\n');
      const mine = String(mineText).split('\n');
      const theirs = String(theirsText).split('\n');
      if (base.length > 20000) return { text: '', conflicts: 1 };
      const all = hunksBetween(base, mine).map((h) => ({ ...h, src: 0 }))
        .concat(hunksBetween(base, theirs).map((h) => ({ ...h, src: 1 })));
      all.sort((x, y) => x.start - y.start || x.len - y.len);
      const out = [];
      let bp = 0;
      let applied = null;
      let conflicts = 0;
      for (const h of all) {
        // The SAME block inserted at the same place on both sides (the
        // double-paste pollution shape) must be applied exactly ONCE.
        if (applied !== null && h.src !== applied.src && h.start === applied.start0 && sameLines(h.lines, applied.lines)) continue;
        if (applied !== null && h.start < applied.end) conflicts += 1; // genuine overlap, different content
        for (let k = bp; k < h.start; k += 1) out.push(base[k]);
        for (const line of h.lines) out.push(line);
        applied = { end: h.start + h.len, src: h.src, lines: h.lines, start0: h.start };
        bp = h.start + h.len;
      }
      for (let k = bp; k < base.length; k += 1) out.push(base[k]);
      return { text: out.join('\n'), conflicts };
    }

    /** True if mainText has an uncommented \input/\include/\subfile pulling in
     *  subRel (matched by workspace-relative path or bare name). */
    function mainReferences(mainText, subRel) {
      const rel = String(subRel).replace(/\\/g, '/').replace(/\.(tex|ltx)$/i, '');
      const base = rel.split('/').pop();
      for (const line of String(mainText).split('\n')) {
        let cut = line.length;
        for (let i = 0; i < line.length; i += 1) {
          if (line.charAt(i) === '%' && (i === 0 || line.charAt(i - 1) !== '\\')) { cut = i; break; }
        }
        const code = line.slice(0, cut);
        const re = /\\(?:input|include|subfile)\s*\{([^}]*)\}/g;
        let m;
        while ((m = re.exec(code)) !== null) {
          const target = m[1].replace(/\\/g, '/').replace(/\.(tex|ltx)$/i, '');
          if (target === rel || target === base || rel === target || rel.endsWith('/' + target)) return true;
        }
      }
      return false;
    }

    /** Find the compilable root document for a section subfile: walk up from
     *  the subfile's directory, prefer main.tex, require \documentclass.
     *  Returns { rel, text } or null. */
    async function findMainFile(face, texRel) {
      let dir = relDir(texRel);
      for (let guard = 0; guard <= 12; guard += 1) {
        const res = await face.list(dir || '.');
        if (res.ok) {
          const relOf = (name) => (dir ? dir + '/' + name : name);
          const texs = res.value.entries
            .filter((e) => e.type === 'file' && /\.tex$/i.test(e.name) && relOf(e.name) !== texRel.trim());
          texs.sort((a, b) => (/^main\.tex$/i.test(a.name) ? -1 : 0) - (/^main\.tex$/i.test(b.name) ? -1 : 0));
          for (const e of texs.slice(0, 8)) {
            const p = relOf(e.name);
            try {
              const rd = await face.readBytes(p);
              if (rd.ok) {
                const text = new TextDecoder('utf-8').decode(rd.value.data);
                if (text.indexOf('\\documentclass') !== -1) return { rel: p, text };
              }
            } catch (err) { /* keep looking */ }
          }
        }
        if (!dir) break;
        dir = upDir(dir);
      }
      return null;
    }

    // ------------------------------------------------------- highlight/synctex
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const colorChunk = (chunk) => {
      let out = '';
      const re = /(\\(?:begin|end)\s*\{[^}]*\})|(\\[a-zA-Z@]+\*?)|(\\.|[{}&])/g;
      let last = 0;
      let m;
      while ((m = re.exec(chunk)) !== null) {
        out += escapeHtml(chunk.slice(last, m.index));
        const tok = escapeHtml(m[0]);
        if (m[1]) out += `<span class="t-env">${tok}</span>`;
        else if (m[2]) out += `<span class="t-cmd">${tok}</span>`;
        else if (m[3] === '{' || m[3] === '}') out += `<span class="t-brace">${tok}</span>`;
        else if (m[3] === '&') out += `<span class="t-sep">${tok}</span>`;
        else out += `<span class="t-cmd">${tok}</span>`;
        last = re.lastIndex;
      }
      out += escapeHtml(chunk.slice(last));
      return out;
    };

    /** Lightweight LaTeX tokenizer for the highlight overlay (per line).
     *  Each logical line is wrapped in its own block span so the caret-line
     *  band can measure real geometry even in soft-wrap mode. */
    function highlightTex(text) {
      const lines = text.split('\n');
      const out = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === '') { out.push('<span class="tline"></span>'); continue; }
        // Comment: % not escaped by a backslash runs to end of line.
        let code = line;
        let comment = '';
        for (let j = 0; j < line.length; j += 1) {
          if (line.charAt(j) === '%' && (j === 0 || line.charAt(j - 1) !== '\\')) {
            code = line.slice(0, j);
            comment = line.slice(j);
            break;
          }
        }
        // Inline math: split on unescaped $; alternate chunks are math.
        const chunks = code.split(/(?<!\\)\$/);
        let html = '';
        for (let k = 0; k < chunks.length; k += 1) {
          if (k > 0) html += '<span class="t-ml">$</span>';
          const colored = colorChunk(chunks[k]);
          html += k % 2 === 1 ? `<span class="t-math">${colored}</span>` : colored;
        }
        if (comment) html += `<span class="t-cm">${escapeHtml(comment)}</span>`;
        out.push(`<span class="tline">${html}</span>`);
      }
      return out.join('');
    }

    /**
     * Parse the engine's .synctex.gz into {rows, inputs}: which source-line
     * span each (file, page) pair covers, plus the input-file table (index ->
     * absolute path) so per-file forward sync works in multi-file projects.
     */
    async function parseSynctex(bytes) {
      if (typeof window.DecompressionStream !== 'function') return null;
      const ds = new window.DecompressionStream('gzip');
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      const text = await new Response(stream).text();
      const inputs = [];
      const rows = [];
      let page = 0;
      const rePage = /^!\d+\s+.*\bpage:(\d+)/;
      const reNode = /^\{\d+\}\{[^}]*\}\{([^}:]+):(\d+)\}/;
      const reInput = /^Input:(\d+):(.+)$/;
      for (const line of text.split('\n')) {
        const mp = rePage.exec(line);
        if (mp) { page = Number(mp[1]); continue; }
        if (page === 0) {
          const mi = reInput.exec(line);
          if (mi) inputs[Number(mi[1])] = mi[2];
          continue;
        }
        const mn = reNode.exec(line);
        if (mn && page) {
          const idx = mn[1];
          const ln = Number(mn[2]);
          let row = null;
          for (const r of rows) if (r.page === page && r.fileIdx === idx) { row = r; break; }
          if (row === null) { row = { page, fileIdx: idx, minLine: ln, maxLine: ln }; rows.push(row); }
          else if (ln < row.minLine) row.minLine = ln;
          else if (ln > row.maxLine) row.maxLine = ln;
        }
      }
      rows.sort((a, b) => a.page - b.page);
      if (rows.length === 0) return null;
      for (let i = 0; i < rows.length - 1; i += 1) {
        if (rows[i].fileIdx === rows[i + 1].fileIdx && rows[i].maxLine < rows[i + 1].minLine) rows[i].maxLine = rows[i + 1].minLine;
      }
      return { rows, inputs };
    }

    // ------------------------------------------------------------- pdf pane
    // Bundled pdf.js (served by our Host route) rendered as per-page canvases,
    // lazily rendered as pages scroll into view; powers both sync directions.
    let pdfjsPromise = null;
    async function loadPdfJs() {
      if (pdfjsPromise) return pdfjsPromise;
      pdfjsPromise = (async () => {
        const modText = await (await fetch('/dsh-latex/pdfjs?file=pdf')).text();
        const modUrl = URL.createObjectURL(new Blob([modText], { type: 'text/javascript' }));
        const pdfjs = await import(modUrl);
        const workerText = await (await fetch('/dsh-latex/pdfjs?file=worker')).text();
        const workerUrl = URL.createObjectURL(new Blob([workerText], { type: 'text/javascript' }));
        pdfjs.GlobalWorkerOptions.workerPort = new window.Worker(workerUrl, { type: 'module' });
        return pdfjs;
      })().catch((error) => { pdfjsPromise = null; throw error; });
      return pdfjsPromise;
    }

    function PdfPane({ pdfUrl, target, onTopPage, failLabel }) {
      const holderRef = useRef(null);
      const [pageCount, setPageCount] = useState(0);
      const [failed, setFailed] = useState(false);
      const [zoomPct, setZoomPct] = useState(100);
      const entriesRef = useRef([]); // per page: { div, rendered, tl }
      const docRef = useRef(null);
      const libRef = useRef(null);
      const zoomRef = useRef(1);
      const genRef = useRef(0);

      useEffect(() => {
        let alive = true;
        entriesRef.current = [];
        docRef.current = null;
        setPageCount(0);
        setFailed(false);
        if (!pdfUrl) return undefined;
        (async () => {
          try {
            const pdfjs = await loadPdfJs();
            libRef.current = pdfjs;
            const data = new Uint8Array(await (await fetch(pdfUrl)).arrayBuffer());
            const doc = await pdfjs.getDocument({ data }).promise;
            if (!alive) { void doc.destroy(); return; }
            docRef.current = doc;
            setPageCount(doc.numPages);
          } catch (e) { setFailed(true); }
        })();
        return () => {
          alive = false;
          if (docRef.current) { void docRef.current.destroy(); docRef.current = null; }
        };
      }, [pdfUrl]);

      const renderEntry = async (idx) => {
        const entry = entriesRef.current[idx];
        const doc = docRef.current;
        const gen = genRef.current;
        if (!entry || !entry.div || entry.rendered || !doc) return;
        entry.rendered = true;
        try {
          const page = await doc.getPage(idx + 1);
          if (!entry.div.isConnected || genRef.current !== gen) { entry.rendered = false; page.cleanup(); return; }
          // Render at the pane's real width x device pixel ratio: no CSS
          // stretching anywhere, so text stays crisp at any pane size.
          const holder = holderRef.current;
          const fit = Math.max(240, (holder ? holder.clientWidth : 540) - 18);
          const width = Math.max(200, Math.round(fit * zoomRef.current));
          entry.div.style.width = width + 'px';
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: width / base.width });
          entry.div.style.minHeight = Math.ceil(vp.height) + 'px';
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const canvas = entry.div.querySelector('canvas');
          if (!canvas) return;
          canvas.width = Math.ceil(vp.width * dpr);
          canvas.height = Math.ceil(vp.height * dpr);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: [dpr, 0, 0, dpr, 0, 0] }).promise;
          if (genRef.current !== gen) { entry.rendered = false; return; }
          // Selectable / searchable text layer over the canvas. Placed with
          // pdf.js's classic renderTextLayer math (Util.transform + baseline
          // correction) so spans align with the canvas WITHOUT depending on
          // pdf.js's external stylesheet.
          const lib = libRef.current;
          let tlDiv = entry.div.querySelector('.dsh-latex-textlayer');
          if (!tlDiv) { tlDiv = document.createElement('div'); tlDiv.className = 'dsh-latex-textlayer'; entry.div.appendChild(tlDiv); }
          tlDiv.innerHTML = '';
          if (lib && lib.Util) {
            try {
              const content = await page.getTextContent();
              const frag = document.createDocumentFragment();
              for (const item of content.items) {
                if (!item.str || !item.str.trim()) continue;
                const tx = lib.Util.transform(vp.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.left = tx[4] + 'px';
                span.style.top = (tx[5] - fontHeight) + 'px';
                span.style.fontSize = (fontHeight || vp.scale) + 'px';
                frag.appendChild(span);
              }
              tlDiv.appendChild(frag);
            } catch (e) { /* selection is optional */ }
          }
          page.cleanup();
        } catch (e) { entry.rendered = false; }
      };

      // Serialized render queue: rendering several pages of a large PDF at
      // once spiked memory and crashed the renderer; one at a time is safe.
      const queueRef = useRef([]);
      const busyRef = useRef(false);
      const pumpRef = useRef(null);
      pumpRef.current = () => {
        if (busyRef.current) return;
        let idx;
        while ((idx = queueRef.current.shift()) !== undefined) {
          const entry = entriesRef.current[idx];
          if (!entry || entry.rendered) continue;
          busyRef.current = true;
          void renderEntry(idx).finally(() => { busyRef.current = false; window.setTimeout(() => pumpRef.current(), 40); });
          return;
        }
      };

      // Zoom (buttons + Ctrl+wheel): a zoom change drops every rendered
      // page and re-renders the ones in view at the new size, one at a time.
      const rerenderVisible = () => {
        genRef.current += 1;
        queueRef.current = [];
        const entries = entriesRef.current;
        entries.forEach((entry) => {
          if (!entry) return;
          entry.rendered = false;
          if (!entry.div) return;
          const canvas = entry.div.querySelector('canvas');
          if (canvas) { canvas.width = 0; canvas.height = 0; }
          const tlDiv = entry.div.querySelector('.dsh-latex-textlayer');
          if (tlDiv) tlDiv.innerHTML = '';
          if (entry.tl) { try { entry.tl.cancel(); } catch (e) { /* gone */ } entry.tl = null; }
        });
        const holder = holderRef.current;
        if (holder) {
          const top = holder.scrollTop;
          const bottom = top + holder.clientHeight;
          let startIdx = 0;
          for (let i = 0; i < entries.length; i += 1) {
            const div = entries[i] && entries[i].div;
            if (!div) break;
            if (div.offsetTop + div.offsetHeight > top) { startIdx = i; break; }
          }
          let endIdx = startIdx;
          for (let i = startIdx; i < entries.length; i += 1) {
            const div = entries[i] && entries[i].div;
            if (!div) break;
            if (div.offsetTop > bottom) break;
            endIdx = i;
          }
          for (let i = Math.max(0, startIdx - 1); i <= Math.min(entries.length - 1, endIdx + 1); i += 1) queueRef.current.push(i);
        }
        pumpRef.current();
      };
      const applyZoom = (next) => {
        const z = Math.min(3, Math.max(0.4, next));
        if (Math.abs(z - zoomRef.current) < 0.001) return;
        zoomRef.current = z;
        setZoomPct(Math.round(z * 100));
        rerenderVisible();
      };

      // Re-render when the pane width changes (splitter drag, fullscreen):
      // the fit-width base depends on it, and stretched canvases blur.
      useEffect(() => {
        if (pageCount === 0) return undefined;
        const holder = holderRef.current;
        if (!holder) return undefined;
        let lastW = holder.clientWidth;
        const ro = new window.ResizeObserver(() => {
          const w = holder.clientWidth;
          if (Math.abs(w - lastW) < 8) return;
          lastW = w;
          rerenderVisible();
        });
        ro.observe(holder);
        return () => ro.disconnect();
      }, [pageCount]);

      // Ctrl + mouse wheel zooms the PDF.
      useEffect(() => {
        const holder = holderRef.current;
        if (!holder) return undefined;
        const onWheel = (event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          applyZoom(zoomRef.current * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
        };
        holder.addEventListener('wheel', onWheel, { passive: false });
        return () => holder.removeEventListener('wheel', onWheel);
      }, [pageCount]);

      // Render pages entering the view; release canvases leaving it (bounds
      // memory on long documents).
      useEffect(() => {
        if (pageCount === 0) return undefined;
        const holder = holderRef.current;
        if (!holder) return undefined;
        queueRef.current = [];
        const io = new window.IntersectionObserver((items) => {
          items.forEach((it) => {
            const idx = Number(it.target.getAttribute('data-page'));
            const entry = entriesRef.current[idx];
            if (!entry) return;
            if (it.isIntersecting) {
              if (!entry.rendered) { queueRef.current.push(idx); pumpRef.current(); }
            } else if (entry.rendered) {
              const canvas = entry.div && entry.div.querySelector('canvas');
              if (canvas) { canvas.width = 0; canvas.height = 0; }
              const tlDiv = entry.div && entry.div.querySelector('.dsh-latex-textlayer');
              if (tlDiv) tlDiv.innerHTML = '';
              if (entry.tl) { try { entry.tl.cancel(); } catch (e) { /* gone */ } entry.tl = null; }
              entry.rendered = false;
            }
          });
        }, { root: holder, rootMargin: '320px 0px' });
        holder.querySelectorAll('.dsh-latex-pdfpage').forEach((el) => io.observe(el));
        let timer = 0;
        const onScroll = () => {
          if (timer) window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            const entries = entriesRef.current;
            let top = 0;
            const st = holder.scrollTop;
            for (let i = 0; i < entries.length; i += 1) {
              const div = entries[i] && entries[i].div;
              if (!div) break;
              top = i;
              if (div.offsetTop + div.offsetHeight * 0.5 > st) break;
            }
            if (onTopPage) onTopPage(top + 1);
          }, 180);
        };
        holder.addEventListener('scroll', onScroll);
        return () => { io.disconnect(); holder.removeEventListener('scroll', onScroll); if (timer) window.clearTimeout(timer); };
      }, [pageCount]);

      // Forward sync: jump the view to the target page.
      useEffect(() => {
        if (!target.page) return;
        const holder = holderRef.current;
        const entry = entriesRef.current[target.page - 1];
        if (holder && entry && entry.div) holder.scrollTo({ top: entry.div.offsetTop - 8, behavior: 'smooth' });
      }, [target.n]);

      // Clicking a page also reports it (click PDF -> editor jumps).
      const onClickPage = (event) => {
        const pageDiv = event.target && event.target.closest ? event.target.closest('.dsh-latex-pdfpage') : null;
        if (pageDiv && onTopPage) onTopPage(Number(pageDiv.getAttribute('data-page')) + 1);
      };

      return h('div', { className: 'dsh-latex-pdfwrap' },
        pageCount > 0 ? h('div', { className: 'dsh-latex-zoombar' },
          h('button', { type: 'button', title: 'zoom out (Ctrl+wheel)', onClick: () => applyZoom(zoomRef.current / 1.25) }, '−'),
          h('span', null, zoomPct + '%'),
          h('button', { type: 'button', title: 'zoom in (Ctrl+wheel)', onClick: () => applyZoom(zoomRef.current * 1.25) }, '+'),
          h('button', { type: 'button', title: 'fit width', onClick: () => applyZoom(1) }, '⤢'),
        ) : null,
        h('div', { className: 'dsh-latex-pdfpages', ref: holderRef, onClick: onClickPage },
          failed ? h('div', { className: 'dsh-latex-pdf-empty' }, failLabel) : null,
          pageCount === 0 && !failed ? h('div', { className: 'dsh-latex-pdf-empty' }, '…') : null,
          Array.from({ length: pageCount }, (_unused, idx) => h('div', {
            key: idx,
            className: 'dsh-latex-pdfpage',
            'data-page': idx,
            ref: (el) => {
              const list = entriesRef.current;
              list[idx] = list[idx] || {};
              if (el) list[idx].div = el;
            },
          }, h('canvas', null))),
        ),
      );
    }

    // ------------------------------------------------------------ tab chip
    /** The tab chip's title: the document glyph before the label (like the
     *  file type's sheet and the guide's compass). */
    function LatexTitle(props) {
      const info = typeof props.useTabInfo === 'function' ? props.useTabInfo() : null;
      const title = info && info.tab ? info.tab.title : '';
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('span', { className: 'dsh-latex-title-icon' }, h(Glyph, { size: 16 })),
        title,
      );
    }

    // -------------------------------------------------------- tab body
    /** The right-Sidebar tab: toolbar + (source | PDF) split + splitter + log. */
    function LatexBody(props) {
      const t = props.t;
      const face = props;
      const s = useWb();

      const [browsing, setBrowsing] = useState(false);
      const [browseDir, setBrowseDir] = useState('.');
      const [browseEntries, setBrowseEntries] = useState(null);
      const [browseLoading, setBrowseLoading] = useState(false);
      const [browseError, setBrowseError] = useState(null);
      const pdfRef = useRef(null);
      const colsRef = useRef(null);
      const dragRef = useRef(null);
      const hlRef = useRef(null);
      const taRef = useRef(null);
      const [hlHtml, setHlHtml] = useState('');
      const [pdfTarget, setPdfTarget] = useState({ page: 0, n: 0 });
      const suppressReverse = useRef(0);
      const [engineVer, setEngineVer] = useState('');
      const [engineMenu, setEngineMenu] = useState(false);
      const [showLogs, setShowLogs] = useState(false);
      const [selLines, setSelLines] = useState(0);
      const [band, setBand] = useState(null);
      const [hlHeight, setHlHeight] = useState(0);
      // Comments (sidecar annotations, never modify the .tex itself).
      const [comments, setComments] = useState([]);
      const [commentMarks, setCommentMarks] = useState([]);
      const [floatSel, setFloatSel] = useState(null);
      const [draft, setDraft] = useState(null);
      const [stashed, setStashed] = useState([]);
      const [stashedMarks, setStashedMarks] = useState([]);
      const [openComment, setOpenComment] = useState(null);
      const [floatPos, setFloatPos] = useState(null);
      const [gutterHeights, setGutterHeights] = useState([]);
      const charWCache = useRef({ key: '', w: 0 });
      const annoRef = useRef(null);
      const gutterRef = useRef(null);
      const linesRef = useRef(null);

      // This tab's own identity + actions (close) from the slot hook; the left
      // entry uses closeCurrent to close THIS tab.
      let tabId = null;
      let closeSelf = null;
      if (typeof props.useTabInfo === 'function') {
        const info = props.useTabInfo();
        tabId = info && info.tab ? info.tab.id : null;
        closeSelf = info && info.tab && info.tab.actions ? info.tab.actions.close : null;
      }
      useEffect(() => {
        if (tabId === null) return undefined;
        wbStore.set({ closeCurrent: () => { if (closeSelf) { try { closeSelf(); } catch (e) { /* tab already gone */ } } } });
        return () => { wbStore.set({ closeCurrent: null }); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tabId]);

      // Engine availability probe (Host PATH).
      useEffect(() => {
        let live = true;
        face.engines()
          .then((res) => { if (live && res && res.engines) wbStore.set({ engineInfo: res.engines }) })
          .catch(() => {});
        return () => { live = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      // Engine version chip: `<engine> --version` first line, per engine.
      useEffect(() => {
        let live = true;
        face.version(s.engine)
          .then((res) => { if (live) setEngineVer(res && res.ok ? res.version : ''); })
          .catch(() => { if (live) setEngineVer(''); });
        return () => { live = false; };
      }, [s.engine]);

      // Load the source on mount and when the document changes.
      useEffect(() => {
        void doLoad(face, t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [face.sessionId, s.texPath]);

      // Multi-writer watcher: while the tab is open, check the file's
      // freshness token every 5s. With NO unsaved edits, external changes
      // (another agent or device) are ADOPTED immediately, so a stale
      // buffer can never overwrite them. With unsaved edits, the flag arms
      // the automatic three-way merge at save time and warns now instead of
      // surprising the user only at save.
      useEffect(() => {
        const id = window.setInterval(() => {
          void (async () => {
            try {
              const st0 = wbStore.get();
              if (!st0.loadedVer) return;
              const st = await face.stat(st0.texPath.trim());
              if (!st.ok || !st.value.version || st.value.version === wbStore.get().loadedVer) return;
              if (wbStore.get().dirty) {
                if (!wbStore.get().diskChanged) {
                  wbStore.set({ diskChanged: true, status: { ok: true, message: t('status.diskchanged'), log: wbStore.get().status ? wbStore.get().status.log : '' } });
                }
                return;
              }
              const res = await face.readBytes(st0.texPath.trim());
              if (!res.ok || wbStore.get().dirty) return;
              const text = new TextDecoder('utf-8').decode(res.value.data);
              wbStore.set({
                source: text,
                dirty: false,
                diskChanged: false,
                loadedVer: res.value.version || st.value.version,
                loadedText: text,
                histStack: [{ text, t: Date.now(), saved: true }],
                histIdx: 0,
                savedIdx: 0,
                status: { ok: true, message: t('status.adopted'), log: wbStore.get().status ? wbStore.get().status.log : '' },
              });
              if (wbStore.get().compileMode === 'auto' && !wbStore.get().compiling) void doCompile(face, t);
            } catch (e) { /* quiet; next tick retries */ }
          })();
        }, 5000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [face.sessionId, s.texPath]);

      // Ctrl + mouse wheel over the editor adjusts the source font size
      // (same gesture as the PDF pane). Re-attach when the layout toggle
      // remounts the textarea.
      useEffect(() => {
        const ta = taRef.current;
        if (!ta) return undefined;
        const onWheel = (event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          const cur = wbStore.get().fontSize;
          wbStore.set({ fontSize: Math.min(28, Math.max(8, cur + (event.deltaY < 0 ? 1 : -1))) });
        };
        ta.addEventListener('wheel', onWheel, { passive: false });
        return () => ta.removeEventListener('wheel', onWheel);
      }, [s.layout]);

      // Measure the caret line's real geometry from the highlight layer
      // (works with soft wrap: a wrapped logical line spans multiple rows).
      useLayoutEffect(() => {
        const ta = taRef.current;
        const hl = hlRef.current;
        if (ta) {
          if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
          if (linesRef.current) linesRef.current.scrollTop = ta.scrollTop;
          if (annoRef.current) annoRef.current.scrollTop = ta.scrollTop;
        }
        if (!hl) { setBand(null); setCommentMarks([]); setFloatPos(null); return; }
        setHlHeight(hl.scrollHeight);
        const tlines = hl.querySelectorAll(':scope > .tline');
        if (selLines < 0) setBand(null);
        else {
          const el = tlines[selLines];
          setBand(el ? { top: el.offsetTop, height: el.offsetHeight || Math.round(s.fontSize * 1.55) } : null);
        }
        setCommentMarks(comments.map((c) => {
          const elA = tlines[c.lineA];
          const elB = tlines[Math.min(c.lineB, tlines.length - 1)];
          if (!elA) return null;
          const top = elA.offsetTop;
          const bottom = elB ? elB.offsetTop + elB.offsetHeight : top + Math.round(s.fontSize * 1.55);
          return { id: c.id, top, height: bottom - top, note: c.note, text: c.text };
        }).filter(Boolean));
        if (floatSel) {
          // Sit tight at the bottom-right corner of the selection.
          const el = tlines[floatSel.b];
          if (el) {
            // Measure the real monospace advance in the highlight layer so
            // the button lands flush against the selection end.
            const key = s.fontSize + '@' + (s.wrap ? 'w' : 'n');
            if (charWCache.current.key !== key) {
              const probe = document.createElement('span');
              probe.textContent = '0123456789';
              probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
              hl.appendChild(probe);
              charWCache.current = { key, w: probe.getBoundingClientRect().width / 10 };
              probe.remove();
            }
            const charW = charWCache.current.w || s.fontSize * 0.602;
            const rowH = s.fontSize * 1.55;
            let x = floatSel.colEnd * charW;
            let visualRows = 1;
            if (s.wrap) {
              // Exact wrap position: lay the line prefix into a hidden mirror
              // with the same font/width, then read the caret rect after the
              // selection end via a Range.
              const rowW = Math.max(80, (hl.clientWidth || 600) - 66);
              const cs = window.getComputedStyle(hl);
              const mirror = document.createElement('pre');
              mirror.style.cssText = 'position:absolute;left:-9999px;top:-9999px;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;width:' + rowW + 'px;padding:0;margin:0;border:0;';
              mirror.style.fontFamily = cs.fontFamily;
              mirror.style.fontSize = cs.fontSize;
              mirror.style.lineHeight = cs.lineHeight;
              mirror.style.letterSpacing = cs.letterSpacing;
              mirror.style.wordSpacing = cs.wordSpacing;
              mirror.textContent = (el.textContent || '').slice(0, floatSel.colEnd);
              hl.appendChild(mirror);
              try {
                const node = mirror.firstChild;
                if (node && node.nodeType === 3) {
                  const range = document.createRange();
                  range.setStart(node, node.length);
                  range.collapse(true);
                  const caret = range.getBoundingClientRect();
                  const box = mirror.getBoundingClientRect();
                  x = Math.max(0, caret.left - box.left);
                  visualRows = Math.max(1, Math.round(mirror.offsetHeight / rowH));
                }
              } catch (e) { /* fall back to the estimate */ }
              mirror.remove();
            }
            const top = el.offsetTop + Math.min(el.offsetHeight, visualRows * rowH);
            const left = Math.max(56, Math.min(56 + x, (hl.clientWidth || 600) - 96));
            setFloatPos({ top, left });
          } else setFloatPos(null);
        } else setFloatPos(null);
        // Gutter mirrors wrapped row heights: one number per logical line,
        // continuation rows stay blank.
        const heights = [];
        for (let i = 0; i < tlines.length; i += 1) heights.push(Math.max(1, Math.round(tlines[i].offsetHeight)));
        setGutterHeights(heights);
        // Pending draft chips at their anchor lines.
        setStashedMarks(stashed.map((d, i) => {
          const el = tlines[d.a];
          return { i, top: el ? el.offsetTop : 0 };
        }));
      }, [selLines, hlHtml, s.fontSize, s.wrap, s.layout, comments, floatSel, stashed]);

      // Load the directory listing while the file browser is open.
      useEffect(() => {
        if (!browsing) return undefined;
        let live = true;
        setBrowseLoading(true);
        setBrowseError(null);
        setBrowseEntries(null);
        face.list(browseDir)
          .then((res) => {
            if (!live) return;
            if (res.ok) {
              const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
              const dirs = res.value.entries.filter((e) => e.type === 'directory').sort(byName);
              const files = res.value.entries
                .filter((e) => e.type === 'file' && /\.(tex|ltx)$/i.test(e.name))
                .sort(byName);
              setBrowseEntries([...dirs, ...files]);
            } else {
              setBrowseError(res.error.code);
            }
          })
          .catch((error) => { if (live) setBrowseError(error && error.message ? error.message : String(error)); })
          .finally(() => { if (live) setBrowseLoading(false); });
        return () => { live = false; };
      }, [browsing, browseDir]);

      // Re-highlight (debounced) as the source changes.
      useEffect(() => {
        const id = window.setTimeout(() => setHlHtml(highlightTex(wbStore.get().source)), 120);
        return () => window.clearTimeout(id);
      }, [s.source]);

      // Alt + mouse wheel adjusts the editor font size (VSCode-style).
      useEffect(() => {
        const ta = taRef.current;
        if (!ta) return undefined;
        const onWheel = (event) => {
          if (!event.altKey) return;
          event.preventDefault();
          const d = event.deltaY < 0 ? 1 : -1;
          wbStore.set({ fontSize: Math.min(28, Math.max(8, wbStore.get().fontSize + d)) });
        };
        ta.addEventListener('wheel', onWheel, { passive: false });
        return () => ta.removeEventListener('wheel', onWheel);
      }, []);

      // Reset the synced page when a fresh PDF arrives.
      useEffect(() => { setPdfTarget({ page: 0, n: 0 }); }, [s.pdfUrl]);

      const syncScroll = (event) => {
        const hl = hlRef.current;
        if (hl) { hl.scrollTop = event.target.scrollTop; hl.scrollLeft = event.target.scrollLeft; }
        if (gutterRef.current) gutterRef.current.scrollTop = event.target.scrollTop;
        if (linesRef.current) linesRef.current.scrollTop = event.target.scrollTop;
        if (annoRef.current) annoRef.current.scrollTop = event.target.scrollTop;
      };

      // Highlight the line the caret sits on; a non-empty selection also
      // surfaces the "Comment" affordance.
      const updateSel = () => {
        const ta = taRef.current;
        if (!ta) return;
        const linesArr = ta.value.split('\n');
        const a = ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
        setSelLines(a);
        if (ta.selectionStart === ta.selectionEnd) { setFloatSel(null); return; }
        const b = ta.value.slice(0, ta.selectionEnd).split('\n').length - 1;
        let lineStart = 0;
        for (let i = 0; i < a; i += 1) lineStart += linesArr[i].length + 1;
        let lineStartB = 0;
        for (let i = 0; i < b; i += 1) lineStartB += linesArr[i].length + 1;
        setFloatSel({
          a,
          b,
          colA: ta.selectionStart - lineStart,
          colEnd: ta.selectionEnd - lineStartB,
          text: ta.value.slice(ta.selectionStart, ta.selectionEnd).slice(0, 200),
        });
      };

      // Comments sidecar: a hidden JSON file next to the .tex, so notes
      // persist per document without touching the LaTeX source.
      const commentFileRel = () => {
        const parts = wbStore.get().texPath.trim().split(/[\\/]+/).filter(Boolean);
        const base = (parts.pop() || 'doc.tex').replace(/\.(tex|ltx)$/i, '');
        const dir = parts.join('/');
        return (dir ? dir + '/' : '') + '.' + base + '.dshstudio.comments.json';
      };
      const persistComments = async (list) => {
        try {
          const st = await face.stat(wbStore.get().texPath.trim());
          if (!st.ok) return;
          const abs = st.value.absolutePath;
          const dir = abs.replace(/[\\/][^\\/]+$/, '');
          const sep = abs.indexOf('\\') !== -1 ? '\\' : '/';
          const base = abs.split(/[\\/]/).pop().replace(/\.(tex|ltx)$/i, '');
          await face.write(dir + sep + '.' + base + '.dshstudio.comments.json', JSON.stringify(list, null, 1));
        } catch (e) { /* comments stay local */ }
      };
      useEffect(() => {
        let live = true;
        setComments([]);
        setFloatSel(null);
        setDraft(null);
        setOpenComment(null);
        void (async () => {
          try {
            const res = await face.readBytes(commentFileRel());
            if (live && res.ok) setComments(JSON.parse(new TextDecoder('utf-8').decode(res.value.data)) || []);
          } catch (e) { /* no sidecar yet */ }
        })();
        return () => { live = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [s.loadedKey]);
      // Moving to a different selection while a draft is open: stash the
      // draft (restorable via a pending chip) and start fresh.
      useEffect(() => {
        if (!draft || !floatSel) return;
        if (draft.a !== floatSel.a || draft.b !== floatSel.b || draft.colEnd !== floatSel.colEnd || draft.text !== floatSel.text) {
          setStashed((prev) => prev.concat([draft]));
          setDraft(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [floatSel]);
      const saveDraft = () => {
        if (!draft) return;
        const c = { id: Date.now(), lineA: draft.a, lineB: draft.b, colA: draft.colA, text: draft.text, note: ((draft.note || '').trim() || '—'), ts: Date.now() };
        const next = comments.concat([c]);
        setComments(next);
        void persistComments(next);
        setDraft(null);
        setFloatSel(null);
      };
      const deleteComment = (id) => {
        const next = comments.filter((c) => c.id !== id);
        setComments(next);
        setOpenComment(null);
        void persistComments(next);
      };

      // Synctex rows filtered to the file currently open in the editor
      // (matched through the synctex input table), falling back to all rows.
      const rowsForCurrentFile = async () => {
        const st = wbStore.get();
        const syn = st.synctex;
        if (!syn || !syn.rows.length) return null;
        let rows = syn.rows;
        try {
          const res = await face.stat(st.texPath.trim());
          if (res.ok) {
            const absN = normPath(res.value.absolutePath);
            const idx = (syn.inputs || []).findIndex((p) => p && normPath(p) === absN);
            if (idx > 0) {
              const mine = syn.rows.filter((r) => String(r.fileIdx) === String(idx));
              if (mine.length > 0) rows = mine;
            }
          }
        } catch (e) { /* fall back to all rows */ }
        return rows;
      };

      const dirOf = (abs) => String(abs).replace(/[\\/][^\\/]+$/, '');

      // Download the current PDF (blob) under the document's base name.
      const downloadPdf = () => {
        const st = wbStore.get();
        if (!st.pdfUrl) return;
        const base = String(st.texPath).trim().split(/[\\/]/).pop().replace(/\.(tex|ltx)$/i, '') || 'document';
        const a = document.createElement('a');
        a.href = st.pdfUrl;
        a.download = `${base}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };

      // A failed compile with a log opens the log panel automatically.
      useEffect(() => {
        if (s.status && s.status.ok === false && s.status.log) setShowLogs(true);
      }, [s.status]);

      // Forward sync: DOUBLE-click in the code -> smooth-scroll the PDF to
      // the owning page. Uses the distribution's own `synctex` tool first
      // (authoritative), falling back to the built-in parse.
      const onDoubleCode = () => {
        const st = wbStore.get();
        if (!st.pdfUrl) return;
        const ta = taRef.current;
        if (!ta) return;
        const pos = ta.selectionStart || 0;
        const before = st.source.slice(0, pos);
        const line = before.split('\n').length;
        const col = pos - before.lastIndexOf('\n') - 1;
        void (async () => {
          if (st.pdfAbs) {
            try {
              const res = await face.stat(st.texPath.trim());
              if (res.ok) {
                const r = await face.sync({ mode: 'view', tex: res.value.absolutePath, pdf: st.pdfAbs, dir: dirOf(st.pdfAbs), line, col });
                if (r && r.ok && r.page > 0) {
                  suppressReverse.current = Date.now() + 900;
                  setPdfTarget((prev) => ({ page: r.page, n: prev.n + 1 }));
                  return;
                }
              }
            } catch (e) { /* fall back to the built-in rows below */ }
          }
          const rows = await rowsForCurrentFile();
          if (!rows) { wbStore.set({ status: { ok: false, message: t('sync.nodata'), log: '' } }); return; }
          let page = rows[rows.length - 1].page;
          for (const r of rows) { if (line <= r.maxLine) { page = r.page; break; } }
          suppressReverse.current = Date.now() + 900;
          setPdfTarget((prev) => ({ page, n: prev.n + 1 }));
        })();
      };

      // Reverse sync: scrolling the PDF -> scroll the editor to that page's
      // source line (same tool-first order; results cached per page).
      const reverseCacheRef = useRef(new Map());
      useEffect(() => { reverseCacheRef.current = new Map(); }, [s.pdfUrl]);
      const onTopPdfPage = (page) => {
        if (Date.now() < suppressReverse.current) return;
        const st = wbStore.get();
        if (!st.pdfUrl) return;
        void (async () => {
          let target = reverseCacheRef.current.get(page) || null;
          if (!target && st.pdfAbs) {
            try {
              const r = await face.sync({ mode: 'edit', pdf: st.pdfAbs, dir: dirOf(st.pdfAbs), page, x: 0, y: 0 });
              if (r && r.ok && r.input && r.line > 0) { target = { input: r.input, line: r.line }; reverseCacheRef.current.set(page, target); }
            } catch (e) { /* built-in fallback below */ }
          }
          if (target) {
            try {
              const cur = await face.stat(st.texPath.trim());
              if (!cur.ok || normPath(cur.value.absolutePath) !== normPath(target.input)) return;
            } catch (e) { return; }
            const ta = taRef.current;
            if (!ta) return;
            const lineHeight = wbStore.get().fontSize * 1.55;
            ta.scrollTop = Math.max(0, (target.line - 1) * lineHeight - ta.clientHeight / 3);
            return;
          }
          const rows = await rowsForCurrentFile();
          if (!rows) return;
          const hit = rows.find((r) => r.page === page);
          if (!hit) return;
          const ta = taRef.current;
          if (!ta) return;
          const lineHeight = wbStore.get().fontSize * 1.55;
          ta.scrollTop = Math.max(0, (hit.minLine - 1) * lineHeight - ta.clientHeight / 3);
        })();
      };

      // Release the PDF blob URL on unmount.
      useEffect(() => () => {
        if (pdfRef.current) {
          URL.revokeObjectURL(pdfRef.current);
          pdfRef.current = null;
        }
      }, []);
      useEffect(() => { pdfRef.current = s.pdfUrl; }, [s.pdfUrl]);

      const openBrowse = () => {
        const p = wbStore.get().texPath.trim();
        const parts = p.split(/[\\/]+/).filter((s) => s && s !== '.');
        const isAbs = /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('/') || p.startsWith('\\');
        setBrowseDir(!isAbs && parts.length > 1 ? parts.slice(0, -1).join('/') : '.');
        setBrowsing(true);
      };

      const onSplitDown = (event) => {
        const cols = colsRef.current;
        if (!cols) return;
        const width = cols.getBoundingClientRect().width || 1;
        dragRef.current = { startX: event.clientX, startPct: wbStore.get().splitPct, width };
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch (e) { /* not captured */ }
        event.currentTarget.setAttribute('data-drag', '');
      };
      const onSplitMove = (event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const pct = Math.min(80, Math.max(20, drag.startPct + ((event.clientX - drag.startX) / drag.width) * 100));
        wbStore.set({ splitPct: Math.round(pct) });
      };
      const onSplitUp = (event) => {
        if (!dragRef.current) return;
        dragRef.current = null;
        event.currentTarget.removeAttribute('data-drag');
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (e) { /* already released */ }
      };

      const unavailable = (name) => Boolean(s.engineInfo && s.engineInfo[name] && s.engineInfo[name].available === false);
      const busy = s.compiling || s.loading;
      const status = s.status;
      // Undo/redo over our own snapshot history (shared with Ctrl+Z / Ctrl+Y).
      const doUndo = () => {
        const st = wbStore.get();
        if (st.histIdx <= 0) return;
        const idx = st.histIdx - 1;
        wbStore.set({ source: st.histStack[idx].text, histIdx: idx, dirty: idx !== st.savedIdx });
      };
      const doRedo = () => {
        const st = wbStore.get();
        if (st.histIdx >= st.histStack.length - 1) return;
        const idx = st.histIdx + 1;
        wbStore.set({ source: st.histStack[idx].text, histIdx: idx, dirty: idx !== st.savedIdx });
      };
      const doJumpSaved = () => {
        const st = wbStore.get();
        if (st.histIdx === st.savedIdx || st.savedIdx < 0) return;
        wbStore.set({ source: st.histStack[st.savedIdx].text, histIdx: st.savedIdx, dirty: false });
      };
      // Layout segment control; rendered in the PDF bar and, in code-only
      // mode (where the PDF bar collapses), mirrored into the source bar.
      const segBtn = (mode, icon, label) => h('button', {
        type: 'button',
        className: `dsh-latex-btn dsh-latex-segb${s.layout === mode ? ' dsh-latex-seg-on' : ''}`,
        title: label,
        'aria-label': label,
        onClick: () => wbStore.set({ layout: mode }),
      }, icon);
      const segGroup = (extraStyle) => h('span', { className: 'dsh-latex-seg', style: extraStyle || {} },
        segBtn('code',
          h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, fill: 'none' },
            h('path', { d: 'M5.6 4.4L2 8l3.6 3.6M10.4 4.4L14 8l-3.6 3.6', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' })),
          t('layout.code')),
        segBtn('split',
          h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, fill: 'none' },
            h('rect', { x: 2, y: 3.5, width: 5, height: 9, rx: 1, stroke: 'currentColor', strokeWidth: 1.4 }),
            h('rect', { x: 9, y: 3.5, width: 5, height: 9, rx: 1, stroke: 'currentColor', strokeWidth: 1.4 })),
          t('layout.split')),
        segBtn('pdf', h(Glyph, { size: 14 }), t('layout.pdf')));
      // Log severity tallies shown on the Logs button.
      let errCount = 0;
      let warnCount = 0;
      let infoCount = 0;
      if (status && status.log) {
        status.log.split('\n').forEach((line) => {
          const level = logLevel(line);
          if (level === 'err') errCount += 1;
          else if (level === 'warn') warnCount += 1;
          else if (level === 'info') infoCount += 1;
        });
      }

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', { className: 'dsh-latex' },
          h('div', { className: 'dsh-latex-cols', ref: colsRef },
            s.layout === 'pdf' ? null : h('div', { className: 'dsh-latex-col-src', style: { flexBasis: s.layout === 'code' ? '100%' : s.splitPct + '%' } },
              h('div', { className: 'dsh-latex-srcbar' },
            s.dirty ? h('span', { className: 'dsh-latex-dot', title: t('status.unsaved') }, '●') : null,
            h('input', {
              className: 'dsh-latex-input',
              value: s.texPath,
              placeholder: t('toolbar.tex'),
              spellCheck: false,
              'aria-label': t('toolbar.tex'),
              title: s.texPath,
              onChange: (event) => wbStore.set({ texPath: event.target.value }),
              onKeyDown: (event) => { if (event.key === 'Enter') void doCompile(face, t, wbStore.get().compileMode === 'clean' ? { clean: true } : {}); },
            }),
            h('button', {
              type: 'button',
              className: 'dsh-latex-btn',
              onClick: openBrowse,
              'aria-label': t('toolbar.browse'),
            }, t('toolbar.browse')),
            h('button', {
              type: 'button',
              className: 'dsh-latex-btn',
              disabled: s.histIdx <= 0,
              title: `${t('toolbar.undo')} (Ctrl+Z)`,
              onClick: doUndo,
            }, '↶'),
            h('button', {
              type: 'button',
              className: 'dsh-latex-btn',
              disabled: s.histIdx >= s.histStack.length - 1,
              title: `${t('toolbar.redo')} (Ctrl+Y)`,
              onClick: doRedo,
            }, '↷'),
            h('button', {
              type: 'button',
              className: 'dsh-latex-btn',
              disabled: s.histIdx === s.savedIdx || s.savedIdx < 0,
              title: `${t('toolbar.jumpSaved')} (Ctrl+Alt+Z)`,
              onClick: doJumpSaved,
            }, '⇤'),
            s.diskChanged ? h('button', {
              type: 'button',
              className: 'dsh-latex-btn',
              title: t('status.adopted'),
              onClick: () => {
                void (async () => {
                  try {
                    const res = await face.readBytes(wbStore.get().texPath.trim());
                    if (!res.ok) return;
                    const text = new TextDecoder('utf-8').decode(res.value.data);
                    wbStore.set({
                      source: text,
                      dirty: false,
                      diskChanged: false,
                      loadedVer: (res.value && res.value.version) || wbStore.get().loadedVer,
                      loadedText: text,
                      histStack: [{ text, t: Date.now(), saved: true }],
                      histIdx: 0,
                      savedIdx: 0,
                      status: { ok: true, message: t('status.adopted'), log: wbStore.get().status ? wbStore.get().status.log : '' },
                    });
                  } catch (e) { /* quiet */ }
                })();
              },
            }, '↻') : null,
            s.layout === 'code' ? segGroup({ marginLeft: 'auto' }) : null,
            engineMenu ? h('div', { className: 'dsh-latex-backdrop', onClick: () => setEngineMenu(false) }) : null,
            status ? h('span', {
              className: `dsh-latex-status${status.ok ? ' dsh-latex-status-ok' : ' dsh-latex-status-err'}`,
            }, status.message) : null,
              ),
              h('div', { className: 'dsh-latex-srcbody' },
              h('div', { className: 'dsh-latex-lines', ref: linesRef },
                h('div', { style: { position: 'relative', height: (hlHeight || (10 + (s.source.split('\n').length + 2) * s.fontSize * 1.55)) + 'px' } },
                  band ? h('div', {
                    className: 'dsh-latex-lineband',
                    style: { top: band.top + 'px', height: band.height + 'px' },
                  }) : null,
                  commentMarks.map((m) => h('div', {
                    key: 'b' + m.id,
                    className: 'dsh-latex-commentband',
                    style: { top: m.top + 'px', height: m.height + 'px' },
                  })))),
              h('pre', {
                className: s.wrap ? 'dsh-latex-hl dsh-wrap' : 'dsh-latex-hl',
                style: { fontSize: s.fontSize + 'px' },
                ref: hlRef,
                'aria-hidden': true,
                dangerouslySetInnerHTML: { __html: hlHtml },
              }),
              h('textarea', {
                ref: taRef,
                className: s.wrap ? 'dsh-latex-source dsh-wrap' : 'dsh-latex-source',
                style: { fontSize: s.fontSize + 'px' },
                value: s.source,
                spellCheck: false,
                wrap: s.wrap ? 'soft' : 'off',
                placeholder: t('source.placeholder'),
                onScroll: syncScroll,
                onSelect: updateSel,
                onKeyUp: updateSel,
                onMouseUp: updateSel,
                onDoubleClick: onDoubleCode,
                onChange: (event) => wbStore.set((prev) => Object.assign({ source: event.target.value, dirty: true }, pushInput(prev, event.target.value))),
                onKeyDown: (event) => {
                  // Undo/redo go through our shared history (toolbar buttons
                  // and keys stay in sync; native textarea undo is overridden).
                  // Ctrl+Z steps through grouped edits; Ctrl+Alt+Z jumps
                  // straight back to the last saved state.
                  if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'z' || event.key === 'Z')) {
                    event.preventDefault();
                    doJumpSaved();
                    return;
                  }
                  if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === 'z' || event.key === 'Z')) {
                    event.preventDefault();
                    if (event.shiftKey) doRedo(); else doUndo();
                    return;
                  }
                  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) {
                    event.preventDefault();
                    doRedo();
                    return;
                  }
                  if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
                    event.preventDefault();
                    const st = wbStore.get();
                    if (st.dirty) void doSave(face, t, { force: st.staleAt > 0 && Date.now() - st.staleAt < 30000 });
                  }
                  // VSCode-style soft-wrap toggle.
                  if (event.altKey && (event.key === 'z' || event.key === 'Z')) {
                    event.preventDefault();
                    wbStore.set({ wrap: !wbStore.get().wrap });
                  }
                  // Font size: Ctrl/Cmd + "+" / "-" / "0" (reset).
                  if ((event.ctrlKey || event.metaKey) && !event.altKey) {
                    const cur = wbStore.get().fontSize;
                    if (event.key === '=' || event.key === '+') {
                      event.preventDefault();
                      wbStore.set({ fontSize: Math.min(28, cur + 1) });
                    } else if (event.key === '-') {
                      event.preventDefault();
                      wbStore.set({ fontSize: Math.max(8, cur - 1) });
                    } else if (event.key === '0') {
                      event.preventDefault();
                      wbStore.set({ fontSize: 12 });
                    }
                  }
                },
              }),
              h('pre', {
                className: 'dsh-latex-gutter',
                ref: gutterRef,
                'aria-hidden': true,
                style: { fontSize: s.fontSize + 'px' },
              }, (() => {
                const total = s.source.split('\n').length;
                const pad = Math.max(2, String(total).length);
                const kids = [];
                for (let i = 0; i < total; i += 1) {
                  const hpx = gutterHeights[i];
                  kids.push(h('span', { key: i, style: hpx ? { height: hpx + 'px' } : {} }, String(i + 1).padStart(pad, '0')));
                }
                return kids;
              })()),
              h('div', { className: 'dsh-latex-anno', ref: annoRef, style: { fontSize: s.fontSize + 'px' } },
                h('div', { style: { position: 'relative', height: (hlHeight || 0) + 'px' } },
                  commentMarks.map((m) => h('button', {
                    key: 'm' + m.id,
                    type: 'button',
                    className: 'dsh-latex-chip',
                    style: { top: m.top + 'px' },
                    title: m.note,
                    onClick: () => setOpenComment(openComment === m.id ? null : m.id),
                  }, '💬')),
                  stashedMarks.map((s) => h('button', {
                    key: 'p' + s.i,
                    type: 'button',
                    className: 'dsh-latex-pendingchip',
                    style: { top: s.top + 'px' },
                    title: t('comment.pending'),
                    onClick: () => {
                      setDraft(stashed[s.i]);
                      setStashed((prev) => prev.filter((_x, j) => j !== s.i));
                      const d = stashed[s.i];
                      setFloatSel({ a: d.a, b: d.b, colA: d.colA, colEnd: d.colEnd, text: d.text });
                    },
                  }, '📝')),
                  floatPos && !draft ? h('button', {
                    type: 'button',
                    className: 'dsh-latex-commentadd',
                    style: { top: floatPos.top + 'px', left: Math.min(floatPos.left, 600) + 'px' },
                    onClick: () => setDraft(Object.assign({}, floatSel, { note: '' })),
                  }, '💬 Comment') : null,
                  floatPos && draft ? h('div', {
                    className: 'dsh-latex-commentpop',
                    style: (() => {
                      const ta = taRef.current;
                      const aw = (annoRef.current && annoRef.current.clientWidth) || 600;
                      const popW = Math.max(200, Math.min(28 * s.fontSize, aw - 14));
                      let top = floatPos.top;
                      // flip above when the popover would clip at the bottom
                      if (ta && top + 150 > ta.scrollTop + ta.clientHeight) top = Math.max(ta.scrollTop + 4, top - 150);
                      const left = Math.max(4, Math.min(floatPos.left, aw - popW - 6));
                      return { top: top + 'px', left: left + 'px', width: popW + 'px' };
                    })(),
                  },
                    h('div', { className: 'dsh-latex-commentquote' }, draft.text.length > 80 ? draft.text.slice(0, 80) + '…' : draft.text),
                    h('textarea', {
                      className: 'dsh-latex-commentinput',
                      value: draft.note,
                      autoFocus: true,
                      placeholder: t('comment.placeholder'),
                      onChange: (event) => setDraft(Object.assign({}, draft, { note: event.target.value })),
                      onKeyDown: (event) => {
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); saveDraft(); }
                        if (event.key === 'Escape') { event.preventDefault(); setDraft(null); }
                        event.stopPropagation();
                      },
                    }),
                    h('div', { className: 'dsh-latex-commentactions' },
                      h('button', { type: 'button', className: 'dsh-latex-btn', onClick: () => setDraft(null) }, t('comment.cancel')),
                      h('button', { type: 'button', className: 'dsh-latex-btn dsh-latex-btn-primary', onClick: saveDraft }, t('comment.add'))),
                  ) : null,
                  openComment !== null ? (() => {
                    const m = commentMarks.find((x) => x.id === openComment);
                    if (!m) return null;
                    const aw = (annoRef.current && annoRef.current.clientWidth) || 600;
                    const popW = Math.max(200, Math.min(28 * s.fontSize, aw - 14));
                    const left = Math.max(4, Math.min(Math.round(s.fontSize * 4.5), aw - popW - 6));
                    let top = m.top + 4;
                    const ta = taRef.current;
                    if (ta && top + 130 > ta.scrollTop + ta.clientHeight) top = Math.max(ta.scrollTop + 4, top - 130);
                    return h('div', { className: 'dsh-latex-commentpop', style: { top: top + 'px', left: left + 'px', width: popW + 'px' } },
                      h('div', { className: 'dsh-latex-commentquote' }, m.text && m.text.length > 80 ? m.text.slice(0, 80) + '…' : (m.text || '')),
                      h('div', { className: 'dsh-latex-commentnote' }, m.note),
                      h('div', { className: 'dsh-latex-commentactions' },
                        h('button', { type: 'button', className: 'dsh-latex-btn', onClick: () => setOpenComment(null) }, t('browse.close')),
                        h('button', { type: 'button', className: 'dsh-latex-btn dsh-latex-status-err', onClick: () => deleteComment(m.id) }, t('comment.delete'))));
                  })() : null)),
              browsing
                ? h('div', { className: 'dsh-latex-browse' },
                  h('div', { className: 'dsh-latex-browse-head' },
                    h('span', { className: 'dsh-latex-browse-dir' }, browseDir && browseDir !== '.' ? browseDir : t('browse.root')),
                    browseDir && browseDir !== '.'
                      ? h('button', {
                        type: 'button',
                        className: 'dsh-latex-btn',
                        onClick: () => setBrowseDir(parentPath(browseDir)),
                        'aria-label': t('browse.up'),
                      }, t('browse.up'))
                      : null,
                    h('button', {
                      type: 'button',
                      className: 'dsh-latex-btn',
                      onClick: () => setBrowsing(false),
                      'aria-label': t('browse.close'),
                    }, t('browse.close')),
                  ),
                  h('div', { className: 'dsh-latex-browse-list' },
                    browseLoading
                      ? h('div', { className: 'dsh-latex-browse-hint' }, t('browse.loading'))
                      : browseError
                        ? h('div', { className: 'dsh-latex-browse-hint dsh-latex-status-err' }, `${t('browse.error')}: ${browseError}`)
                        : !browseEntries || browseEntries.length === 0
                          ? h('div', { className: 'dsh-latex-browse-hint' }, t('browse.empty'))
                          : browseEntries.map((entry) => h('button', {
                            key: entry.name,
                            type: 'button',
                            className: 'dsh-latex-browse-row',
                            onClick: () => {
                              if (entry.type === 'directory') setBrowseDir(joinPath(browseDir, entry.name));
                              else {
                                wbStore.set({ texPath: joinPath(browseDir, entry.name) });
                                setBrowsing(false);
                              }
                            },
                          },
                            h('span', { className: 'dsh-latex-browse-glyph' },
                              entry.type === 'directory' ? h(FolderGlyph, { size: 15 }) : h(Glyph, { size: 15 })),
                            h('span', { className: 'dsh-latex-browse-name' }, entry.name),
                            entry.type === 'file' && entry.size !== undefined
                              ? h('span', { className: 'dsh-latex-browse-size' }, fmtSize(entry.size))
                              : null,
                          )),
                  ),
                )
                : null,
              ),
            ),
            s.layout === 'split' ? h('div', {
              className: 'dsh-latex-splitter',
              'aria-hidden': true,
              title: t('split.hint'),
              onPointerDown: onSplitDown,
              onPointerMove: onSplitMove,
              onPointerUp: onSplitUp,
              onPointerCancel: onSplitUp,
            }) : null,
            h('div', { className: 'dsh-latex-col-pdf', style: s.layout === 'code' ? { flex: '0 0 auto', minWidth: 'max-content' } : {} },
              h('div', { className: 'dsh-latex-pdfbar' },
                h('div', { className: 'dsh-latex-re-wrap' },
                  h('div', { className: 'dsh-latex-recompile' },
                    h('button', {
                      type: 'button',
                      className: 'dsh-latex-re-main',
                      disabled: busy,
                      title: `${s.engine} — ${t('engine.menu')}`,
                      onClick: () => void doCompile(face, t, s.compileMode === 'clean' ? { clean: true } : {}),
                    },
                      h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, 'aria-hidden': true },
                        h('path', { d: 'M2.5 1.5l8 4.5-8 4.5Z', fill: 'currentColor' })),
                      s.compiling ? t('toolbar.compiling') : t('toolbar.compile'),
                    ),
                    h('button', {
                      type: 'button',
                      className: 'dsh-latex-re-caret',
                      title: t('engine.menu'),
                      'aria-label': t('engine.menu'),
                      onClick: () => setEngineMenu(!engineMenu),
                    },
                      s.compileMode === 'auto' ? h('span', { className: 'dsh-latex-auto-dot' }, '●') : null,
                      '▾'),
                  ),
                  engineMenu ? h('div', { className: 'dsh-latex-menu' },
                    h('div', { className: 'dsh-latex-menu-label' }, 'Mode'),
                    // One compile-mode radio: single pass, clean-then-compile,
                    // or auto on save. Selecting keeps the menu open so the
                    // state is visible; the Compiler group is independent.
                    h('button', {
                      type: 'button',
                      onClick: () => wbStore.set({ compileMode: 'once' }),
                    }, 'Recompile', s.compileMode === 'once' ? h('span', { className: 'dsh-latex-menu-check' }, '✓') : null),
                    h('button', {
                      type: 'button',
                      onClick: () => wbStore.set({ compileMode: 'clean' }),
                    }, 'Clean and recompile', s.compileMode === 'clean' ? h('span', { className: 'dsh-latex-menu-check' }, '✓') : null),
                    h('button', {
                      type: 'button',
                      onClick: () => wbStore.set({ compileMode: 'auto' }),
                    }, 'Auto compile', s.compileMode === 'auto' ? h('span', { className: 'dsh-latex-menu-check' }, '✓') : null),
                    h('div', { className: 'dsh-latex-menu-sep' }),
                    h('div', { className: 'dsh-latex-menu-label' }, 'Compiler'),
                    ENGINES.map((name) => h('button', {
                      key: name,
                      type: 'button',
                      disabled: unavailable(name),
                      onClick: () => wbStore.set({ engine: name }),
                    }, name + (unavailable(name) ? `  (${t('engines.unavailable')})` : ''), s.engine === name ? h('span', { className: 'dsh-latex-menu-check' }, '✓') : null)),
                  ) : null,
                ),
                h('button', {
                  type: 'button',
                  className: `dsh-latex-btn${showLogs ? ' dsh-latex-btn-active' : ''}`,
                  disabled: !(s.status && s.status.log),
                  title: t('log.title'),
                  onClick: () => setShowLogs(!showLogs),
                },
                  t('logs.button'),
                  h('span', { className: 'dsh-latex-logstats' },
                    h('span', { className: 'dsh-latex-stat', title: 'errors' },
                      h('svg', { viewBox: '0 0 14 14', width: 13, height: 13, 'aria-hidden': true, fill: 'none' },
                        h('circle', { cx: 7, cy: 7, r: 5.6, stroke: '#e5484d', strokeWidth: 1.4 }),
                        h('path', { d: 'M4.9 4.9l4.2 4.2M9.1 4.9L4.9 9.1', stroke: '#e5484d', strokeWidth: 1.4, strokeLinecap: 'round' })),
                    h('span', { className: errCount ? 'dsh-latex-stat-n-err' : '' }, String(errCount))),
                    h('span', { className: 'dsh-latex-stat', title: 'warnings' },
                      h('svg', { viewBox: '0 0 14 14', width: 13, height: 13, 'aria-hidden': true, fill: 'none' },
                        h('path', { d: 'M7 1.8L12.8 11.6H1.2Z', stroke: '#f5a623', strokeWidth: 1.3, strokeLinejoin: 'round' }),
                        h('path', { d: 'M7 5.6v3M7 10.2v.4', stroke: '#f5a623', strokeWidth: 1.3, strokeLinecap: 'round' })),
                    h('span', null, String(warnCount))),
                    h('span', { className: 'dsh-latex-stat', title: 'over/underfull boxes' },
                      h('svg', { viewBox: '0 0 14 14', width: 13, height: 13, 'aria-hidden': true, fill: 'none' },
                        h('circle', { cx: 7, cy: 7, r: 5.6, stroke: '#4d9fe8', strokeWidth: 1.4 }),
                        h('path', { d: 'M7 6.2v3.6M7 3.8v.4', stroke: '#4d9fe8', strokeWidth: 1.4, strokeLinecap: 'round' })),
                    h('span', null, String(infoCount))),
                  ),
                ),
                h('span', {
                  className: 'dsh-latex-engineinfo',
                  title: engineVer || t('engines.unavailable'),
                }, engineVer || '…'),
                segGroup(),
                h('button', {
                  type: 'button',
                  className: 'dsh-latex-btn dsh-latex-dl',
                  disabled: !s.pdfUrl,
                  title: t('pdf.download'),
                  'aria-label': t('pdf.download'),
                  onClick: downloadPdf,
                },
                  h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, fill: 'none' },
                    h('path', { d: 'M8 2.2v7.6m0 0L5.2 7m2.8 2.8L10.8 7', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    h('path', { d: 'M3 12.8h10', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' })),
                ),
              ),
              s.layout === 'code' ? null : h('div', { className: 'dsh-latex-pdfbody' },
                showLogs
                  ? h('pre', {
                    className: 'dsh-latex-logpane',
                    dangerouslySetInnerHTML: {
                      __html: (s.status && s.status.log)
                        ? escapeHtml(s.status.log).split('\n').map((line) => {
                          const level = logLevel(line); // patterns only use ! ( ) letters: unaffected by escaping
                          return level ? `<span class="${LOG_LEVEL_CLASS[level]}">${line}</span>` : line;
                        }).join('\n')
                        : '—',
                    },
                  })
                  : (s.pdfUrl
                    ? h(PdfPane, {
                      pdfUrl: s.pdfUrl,
                      target: pdfTarget,
                      onTopPage: onTopPdfPage,
                      failLabel: `${t('error.load')} PDF`,
                    })
                    : h('div', { className: 'dsh-latex-pdf-empty' }, t('pdf.empty')))),
            ),
          ),
        ),
      );
    }

    // ------------------------------------------------------------ left entry
    /** Left-Sidebar footer entry: opens the LaTeX tab; closes it while mounted. */
    function LatexEntry({ wide, t, openLatex }) {
      // The style tag must be rendered here as well: the tab body (which also
      // injects it) is unmounted while the entry is the only live surface.
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('button', {
          type: 'button',
          className: wide ? 'dsh-latex-entry' : 'dsh-latex-entry rail',
          'aria-label': t('entry.aria'),
          title: t('entry.label'),
          onClick: openLatex,
        },
          h(Glyph, { size: wide ? 16 : 18 }),
          wide ? h('span', null, t('entry.label')) : null,
        ),
      );
    }

    // ----------------------------------------------------------------- locales
    const en = {
      'entry.aria': 'Open or close the LaTeX workbench',
      'entry.label': 'LaTeX Studio',
      'tab.title': 'LaTeX',
      'guide.title': 'LaTeX Studio',
      'guide.desc': 'Edit .tex, compile, preview the PDF',
      'toolbar.tex': 'main.tex — path relative to the workspace',
      'toolbar.browse': 'Browse…',
      'toolbar.save': 'Save',
      'toolbar.compile': 'Compile',
      'toolbar.compiling': 'Compiling…',
      'toolbar.saved': 'Saved',
      'split.hint': 'Drag to resize source / PDF',
      'browse.root': 'workspace root',
      'browse.up': 'Up',
      'browse.close': 'Close',
      'browse.loading': 'Loading…',
      'browse.empty': 'No folders or .tex files here',
      'browse.error': 'Could not list the directory',
      'status.idle': 'Ready',
      'status.ok': 'Compiled',
      'status.error': 'Failed',
      'status.compiling': 'Compiling…',
      'status.autoMain': 'Section file — auto-compiled',
      'warn.notincluded': 'the main document does not reference this subfile (its \\input line may be commented out, so edits will not show in the PDF)',
      'source.placeholder': 'Type or load a .tex path to edit its source.',
      'pdf.empty': 'Compile the document to preview the PDF here.',
      'log.title': 'Compiler output',
      'logs.button': 'Logs',
      'pdf.download': 'Download PDF',
      'engine.menu': 'Compiler',
      'status.unsaved': 'unsaved changes — Ctrl+S to save',
        'toolbar.undo': 'Undo',
      'toolbar.jumpSaved': 'Back to last saved',
      'toolbar.redo': 'Redo',
      'layout.code': 'Source only',
      'layout.split': 'Source + PDF',
      'layout.pdf': 'PDF only',
      'comment.placeholder': 'Write a comment… (Ctrl+Enter adds)',
      'comment.add': 'Add',
      'comment.cancel': 'Cancel',
      'comment.delete': 'Delete',
      'comment.pending': 'Unfinished comment — click to continue',
      'error.load': 'Could not read the file',
      'error.compile': 'Compilation failed',
      'error.write': 'Could not save the file',
      'error.subfile': 'Section subfile — no main document (a .tex containing \\documentclass) was found automatically',
      'sync.nodata': 'no SyncTeX yet — click Compile once to enable sync jumps',
      'status.stale': 'the file changed on disk and could not be merged automatically — this save was aborted; click Save again within 30s to overwrite (the disk copy is backed up first)',
      'status.conflict': 'external edits overlap yours on the same lines — save aborted so nothing is lost; click Save again within 30s to overwrite, or use ↻ to adopt the disk version (backups kept in .dsh-latex-studio-backups/)',
      'status.diskchanged': 'the file changed on disk (another agent or device) — your next Save will merge both changes automatically',
      'status.merged': 'saved — your edits and the external changes were merged automatically',
      'status.adopted': 'file updated on disk — the latest version was loaded automatically',
      'status.forced': 'overwrote the external version; the previous disk copy was saved under .dsh-latex-studio-backups/',
      'engines.unavailable': 'not found',
    };
    const zh = {
      'entry.aria': '打开或关闭 LaTeX 工作台',
      'entry.label': 'LaTeX Studio',
      'tab.title': 'LaTeX',
      'guide.title': 'LaTeX Studio',
      'guide.desc': '编辑 .tex、编译、预览 PDF',
      'toolbar.tex': 'main.tex — 相对工作区的路径',
      'toolbar.browse': '浏览…',
      'toolbar.save': '保存',
      'toolbar.compile': '编译',
      'toolbar.compiling': '编译中…',
      'toolbar.saved': '已保存',
      'split.hint': '拖动调整源码 / PDF 比例',
      'browse.root': '工作区根目录',
      'browse.up': '上级目录',
      'browse.close': '关闭',
      'browse.loading': '加载中…',
      'browse.empty': '此目录没有子目录或 .tex 文件',
      'browse.error': '无法列出目录',
      'status.idle': '就绪',
      'status.ok': '编译成功',
      'status.error': '编译失败',
      'status.compiling': '编译中…',
      'status.autoMain': '这是子文件，已自动编译主文档',
      'warn.notincluded': '主文档没有引用当前子文件（\\input 行可能被注释，改动不会进入 PDF）',
      'source.placeholder': '输入 .tex 路径并编辑源码。',
      'pdf.empty': '编译文档后在此预览 PDF。',
      'log.title': '编译器输出',
      'logs.button': '日志',
      'pdf.download': '下载 PDF',
      'engine.menu': '编译引擎',
      'status.unsaved': '有未保存的修改——Ctrl+S 保存',
        'toolbar.undo': '撤销',
      'toolbar.jumpSaved': '回到上次保存',
      'toolbar.redo': '重做',
      'layout.code': '仅源码',
      'layout.split': '源码 + PDF',
      'layout.pdf': '仅 PDF',
      'comment.placeholder': '写下评论…（Ctrl+Enter 添加）',
      'comment.add': '添加',
      'comment.cancel': '取消',
      'comment.delete': '删除',
      'comment.pending': '未完成的评论——点击继续编辑',
      'error.load': '无法读取文件',
      'error.compile': '编译失败',
      'error.write': '无法保存文件',
      'error.subfile': '这是章节子文件，且未自动找到主文档（含 \\documentclass 的 .tex）',
      'sync.nodata': '尚无 SyncTeX 数据，点一次「编译」即可启用同步跳转',
      'status.stale': '磁盘文件已被外部修改且无法自动合并：本次保存已中止；30 秒内再点一次「保存」将强制覆盖（磁盘旧版自动备份）',
      'status.conflict': '外部改动与你的改动改到了同一行：保存已中止，两边都不会丢；30 秒内再点「保存」= 以本地覆盖，或点 ↻ 采用磁盘版（备份在 .dsh-latex-studio-backups/）',
      'status.diskchanged': '磁盘文件已被外部（另一个 agent/设备）修改——下次保存将自动合并双方改动',
      'status.merged': '已保存——你的改动与外部改动已自动合并',
      'status.adopted': '磁盘文件已被外部更新——已自动载入最新版本',
      'status.forced': '已覆盖外部版本；被覆盖的磁盘旧版已备份到 .dsh-latex-studio-backups/',
      'engines.unavailable': '未找到',
    };

    // ----------------------------------------------------------------- apply
    return {
      inject: ['slots', 'locale', 'layout', 'sidebarRight', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles'],
      apply(ctx) {
        const t = ctx.locale.bind(NS);

        // Dictionaries (the locale service falls back per key; both languages supplied).
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-latex-studio: dictionaries');

        // Stage one: what the `latex` tab type IS.
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: TAB_ID,
          kind: KIND,
          title: () => t('tab.title'),
          guide: [{
            id: 'latex',
            order: 50,
            title: () => t('guide.title'),
            description: () => t('guide.desc'),
            icon: Glyph,
          }],
        }), 'dsh-latex-studio: tab type');

        // The left entry's intent: open/focus the tab, or close the mounted tab.
        const openLatex = () => {
          const st = wbStore.get();
          if (st.closeCurrent) {
            st.closeCurrent();
            return;
          }
          try {
            ctx.layout.openRightbar(true, false);
            ctx.sidebarRight.openTab(KIND);
          } catch (e) {
            // No session to host the tab (blank home without an adopted session):
            // the workbench needs a session; the entry stays inert here.
          }
        };

        // Stage two: the tab body, under the definition's own id.
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: TAB_ID,
          locale: NS,
          inject: (sessionId) => makeFace(ctx, sessionId),
        }, LatexBody));

        // The chip's face: glyph + label, under the definition's own id.
        ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: TAB_ID,
        }, LatexTitle));

        // Left-Sidebar entry (footer action row, beside the other panel actions).
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'dsh-latex-studio',
          order: 10,
          locale: NS,
          label: () => t('entry.label'),
          inject: () => ({ openLatex }),
        }, LatexEntry));
      },
    };
  },
});
