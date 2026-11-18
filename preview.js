'use strict';

// The sheet (1.2.6): page 1 of the PDF, drawn in the page from the open chat
// with the SAME styles the export sends to the print server (buildExportCss).
// One renderer for three places: the big sheet in the settings window, the
// three style tiles, and the thumbnail in the Export menu — so what a person
// sees is what the PDF will be (dizajn/obzor-2026-11-16 §8, author 16.11:
// «берём за образец реальную страницу, первую страницу чата»).
//
// Drawn inside a shadow root: ChatGPT's own CSS (its reset strips list
// bullets, heading sizes) must not reach it, just as it does not reach the
// PDF. Fonts: the print server has Noto Sans / Noto Serif / Carlito / Noto
// Sans Mono; the page does not, so the extension carries them and adds them
// to the page from bytes (gptpdfSheetFonts) — a font loaded from bytes is not
// a request the page's CSP can block.

const GPTPDF_MM = 96 / 25.4;
// How many messages of the chat the sheet takes. Page 1 rarely holds more.
const GPTPDF_SHEET_MESSAGES = 8;

function gptpdfPaperPx(o) {
    let w = o.page_size === 'letter' ? 8.5 * 96 : 210 * GPTPDF_MM;
    let h = o.page_size === 'letter' ? 11 * 96 : 297 * GPTPDF_MM;
    if(o.orientation === 'landscape') { const t = w; w = h; h = t; }
    return { w: w, h: h };
}

// The margins background.js sends, in px (keep in step with sendToGotenberg).
function gptpdfMarginsPx(o) {
    const IN = 96;
    function len(v, dflt) {
        const s = String(v == null ? '' : v).trim();
        const n = parseFloat(s);
        if(!(n >= 0)) return dflt;
        if(/mm$/.test(s)) return n * GPTPDF_MM;
        if(/cm$/.test(s)) return n * 10 * GPTPDF_MM;
        if(/px$/.test(s)) return n;
        return n * IN;   // inches, written or bare
    }
    let m;
    if(o.margins === 'minimal') {
        m = { t: 0.1 * IN, b: 0.1 * IN, l: 0.1 * IN, r: 0.1 * IN };
    } else if(o.margins === 'narrow') {
        m = { t: 10 * GPTPDF_MM, b: 10 * GPTPDF_MM, l: 10 * GPTPDF_MM, r: 10 * GPTPDF_MM };
    } else if(o.margins === 'custom') {
        m = { t: len(o.margin_top, 0.4 * IN), b: len(o.margin_bottom, 0.4 * IN),
              l: len(o.margin_left, 0.4 * IN), r: len(o.margin_right, 0.4 * IN) };
    } else {
        m = { t: 18 * GPTPDF_MM, b: 18 * GPTPDF_MM, l: 20 * GPTPDF_MM, r: 20 * GPTPDF_MM };
    }
    if(o.page_numbers && !o.single_page) m.b = Math.max(m.b, 0.35 * IN);
    return m;
}

// ChatGPT's own messages, cloned and cleaned the way the export cleans them.
// Cached per chat while the window is open; `startLoaded` says whether the
// chat's first message is on the page (a long chat loads from the end).
let gptpdfSheetSourceCache = null;

function gptpdfSheetSource(force) {
    const root = gptpdfChatRoot();
    const key = location.pathname;
    if(!force && gptpdfSheetSourceCache && gptpdfSheetSourceCache.key === key) {
        return gptpdfSheetSourceCache;
    }
    const pair = gptpdfIsPairLayout(root);
    // DOM order is reading order (capture.js relies on it the same way). Not
    // the turns' own boxes: on the author's page 16.11 the sheet came out empty
    // — a turn wrapper there can have no box of its own, and filtering by box
    // size dropped them all. Skip only hidden ones and turns inside turns.
    const all = Array.from(root.querySelectorAll(GPTPDF_TURN));
    const turns = all.filter(function(t) {
        if(t.closest('[hidden]')) return false;
        const outer = t.parentElement && t.parentElement.closest(GPTPDF_TURN);
        return !outer || all.indexOf(outer) === -1;
    });
    const take = pair ? Math.ceil(GPTPDF_SHEET_MESSAGES / 2) : GPTPDF_SHEET_MESSAGES;
    const clone = document.createElement('main');
    turns.slice(0, take).forEach(function(t) { clone.appendChild(t.cloneNode(true)); });

    // Is the first message of the chat among them? The new page shows a
    // "load older" sentinel while older messages exist (CHATGPT-DOM §10);
    // the old page numbers its turns from 1–2.
    let startLoaded = true;
    if(root.querySelector('[data-testid="conversation-pagination-sentinel"]')) {
        startLoaded = false;
    } else if(!pair && turns.length) {
        const m = /conversation-turn-(\d+)/.exec(turns[0].getAttribute('data-testid') || '');
        if(m && parseInt(m[1], 10) > 2) startLoaded = false;
    }

    try {
        if(pair) gptpdfNormalizeTurns(clone);
        cleanupForPdf(clone);
    } catch(e) {
        console.log('[gptpdf] sheet: cleanup failed', e);
    }
    let title = '';
    try { title = getTitle(clone) || ''; } catch(e) { title = ''; }
    if(!title) title = (document.title || '').replace(/\s*[-|–]\s*ChatGPT\s*$/i, '');

    gptpdfSheetSourceCache = {
        key: key, clone: clone, title: title, startLoaded: startLoaded,
        empty: !turns.length,
        // What the sheet found, for dev builds (shown under the sheet).
        debug: 'turns ' + turns.length + ' of ' + all.length + (pair ? ' (pair)' : ' (classic)') +
            ' · questions ' + clone.querySelectorAll('[data-message-author-role="user"]').length +
            ' · answers ' + clone.querySelectorAll('[data-message-author-role="assistant"]').length
    };
    if(/-dev/.test(gptpdfShared.build)) console.log('[gptpdf] sheet: ' + gptpdfSheetSourceCache.debug);
    return gptpdfSheetSourceCache;
}

// buildExportCss writes for a whole document (body, html); inside the sheet
// they are two divs.
function gptpdfScopeCss(css) {
    return css.split('}').map(function(rule) {
        const i = rule.indexOf('{');
        if(i < 0) return rule;
        const sel = rule.slice(0, i).split(',').map(function(s) {
            return s.replace(/^(\s*)html(?=$|[\s>.:#\[])/, '$1.gptpdf-pv-html')
                    .replace(/^(\s*)body(?=$|[\s>.:#\[])/, '$1.gptpdf-pv-body');
        }).join(',');
        return sel + rule.slice(i);
    }).join('}');
}

// Hide what would not fit on page 1, whole lines at a time — the way the PDF
// breaks to page 2, so the sheet does not show half a line at the bottom.
function gptpdfFitSheet(area, scale) {
    const H = area.clientHeight;
    const box = area.getBoundingClientRect();
    if(!H || !scale) return;
    // Only small blocks (a few lines) are hidden whole. A block taller than
    // that — a long question, a long code listing — stays and is cut by the
    // page edge, as the PDF carries it on to page 2. Hiding it whole emptied
    // the sheet on the author's chat 16.11 (a two-page question).
    const SMALL = 80;   // px at full size ≈ 3–4 lines
    area.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr,pre,img,hr,' +
        '.katex-display,span[role="math"],.gptpdf-pv-meta,a[href^="#toc-"]').forEach(function(el) {
        const r = el.getBoundingClientRect();
        const top = (r.top - box.top) / scale;
        const bottom = (r.bottom - box.top) / scale;
        if(bottom > H + 0.5 && (top > H || (bottom - top) <= SMALL)) {
            el.style.visibility = 'hidden';
        }
    });
}

// Draw page 1 into `frame` (an element the caller owns and sizes nothing in).
// opt: { width, maxH, tiny } — tiny skips the text-fitting pass (tiles, menu).
// Markdown has no page (1.2.9): the sheet shows the file's first lines — this
// chat's own, written the way the export writes them (formats.js).
function gptpdfDrawMdSheet(frame, o, opt) {
    const src = gptpdfSheetSource(false);
    const W = 420, H = Math.round(W * 1.4142);
    let scale = opt.width / W;
    if(opt.maxH) scale = Math.min(scale, opt.maxH / H);
    frame.style.width = Math.round(W * scale) + 'px';
    frame.style.height = Math.round(H * scale) + 'px';
    let md = '';
    try {
        // Claude (1.2.10): the start of the text that goes to it, its one line on top.
        if(gptpdfFormat(o) === 'claude') {
            const c = gptpdfClaudeOptions(o);
            md = gptpdfToClaude(gptpdfFmtRead(src.clone.cloneNode(true), c), c, src.title);
        } else {
            md = gptpdfToMarkdown(gptpdfFmtRead(src.clone.cloneNode(true), o), o, src.title);
        }
    } catch(e) {
        console.log('[gptpdf] markdown sheet', e);
    }
    const lines = md.split('\n').slice(0, 70).map(function(l) {
        const e = gptpdfEscapeHtml(l.length > 400 ? l.slice(0, 400) : l);
        if(/^#{1,6} /.test(l)) return '<span class="h">' + e + '</span>';
        if(/^\*\*(You|ChatGPT):\*\*/.test(l)) return e.replace(/^(\*\*(?:You|ChatGPT):\*\*)/, '<span class="m">$1</span>');
        if(/^(\||```|---$)/.test(l)) return '<span class="q">' + e + '</span>';
        return e.replace(/^(\s*(?:[-*+]|\d+\.) )/, '<span class="m">$1</span>');
    });
    let root = frame.shadowRoot;
    if(!root) root = frame.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{all:initial;display:block;position:relative;overflow:hidden;background:#fff}' +
        'pre{position:absolute;left:0;top:0;margin:0;padding:26px 24px;box-sizing:border-box;width:' + W + 'px;height:' + H + 'px;' +
        'overflow:hidden;transform-origin:0 0;transform:scale(' + scale + ');font:13px/1.5 "Noto Sans Mono",ui-monospace,Menlo,monospace;' +
        'color:#24292f;white-space:pre-wrap;word-break:break-word;text-align:left;background:#fff}' +
        '.h{color:#0b5cad;font-weight:700}.m{color:#8a6d00}.q{color:#6e7781}</style><pre>' + lines.join('\n') + '</pre>';
    return src;
}

function gptpdfDrawSheet(frame, o, opt) {
    opt = opt || {};
    if(typeof gptpdfFormatText === 'function' && gptpdfFormatText(gptpdfFormat(o))) return gptpdfDrawMdSheet(frame, o, opt);
    const src = gptpdfSheetSource(false);
    const paper = gptpdfPaperPx(o);
    // Word has pages and a white sheet (1.2.9): its page 1 is drawn so.
    const pdf = typeof gptpdfFormat !== 'function' || gptpdfFormat(o) === 'pdf';
    const single = !!o.single_page && pdf;
    const W = paper.w;
    const H = single ? paper.h * 1.9 : paper.h;
    let scale = opt.width / W;
    if(opt.maxH && !single) scale = Math.min(scale, opt.maxH / H);
    if(opt.maxH && single) scale = Math.min(scale, opt.maxH / paper.h * 1.15);
    const shownH = single && opt.maxH ? Math.min(H * scale, opt.maxH) : H * scale;
    frame.style.width = Math.round(W * scale) + 'px';
    frame.style.height = Math.round(shownH) + 'px';

    const dark = o.theme === 'dark' && pdf;
    const look = gptpdfShared.look(o);
    const theme = EXPORT_THEMES[look.qColor] || EXPORT_THEMES['default'];
    let css = gptpdfScopeCss(buildExportCss(theme, dark, look));
    if(gptpdfKatexCssCache && gptpdfNeedsKatexCss(src.clone)) css += gptpdfKatexCssCache;
    const m = gptpdfMarginsPx(o);
    const bg = dark ? '#212121' : '#ffffff';

    // Same composition as the export (common.js doConvert).
    const clone = src.clone.cloneNode(true);
    try { applyQuestionStyles(clone, o); } catch(e) { /* the sheet is a picture */ }
    const toc = (function() { try { return buildTocHtml(o, clone); } catch(e) { return ''; } })();
    const metaRow = (function() { try { return buildNewspaperHeader(o); } catch(e) { return ''; } })();
    const title = o.title_mode === 'ask'
        ? '<span style="opacity:.55;font-style:italic;font-weight:400">The title you type on export</span>'
        : gptpdfEscapeHtml(src.title.length > 80 ? src.title.slice(0, 79) + '...' : src.title);
    const h1Hidden = o.title_mode === 'none' ? 'display:none;' : '';
    const classes = (function() { try { return buildCssClasses(o, single); } catch(e) { return ''; } })();

    let root = frame.shadowRoot;
    if(!root) root = frame.attachShadow({ mode: 'open' });
    root.innerHTML =
        '<style>' +
        ':host{all:initial;display:block;position:relative;overflow:hidden;background:' + bg + '}' +
        '.gptpdf-pv-sheet{position:absolute;left:0;top:0;transform-origin:0 0;background:' + bg + ';' +
            'width:' + W + 'px;height:' + H + 'px;transform:scale(' + scale + ')}' +
        '.gptpdf-pv-area{position:absolute;overflow:hidden;left:' + m.l + 'px;right:' + m.r + 'px;' +
            'top:' + m.t + 'px;bottom:' + m.b + 'px}' +
        '.gptpdf-pv-body{margin:' + (dark ? 0 : 8) + 'px;font-size:16px;color:#000;line-height:normal}' +
        '.gptpdf-pv-pnum{position:absolute;left:0;right:0;bottom:' + Math.max(m.b - 0.21 * 96, 4) + 'px;' +
            'text-align:center;font:9px/1 "Noto Sans",Helvetica,Arial,sans-serif;color:#999}' +
        '.gptpdf-pv-fade{position:absolute;left:0;right:0;bottom:0;height:34%;' +
            'background:linear-gradient(to bottom,rgba(0,0,0,0),' + bg + ')}' +
        'img{max-width:100% !important}' +
        css +
        '</style>' +
        '<div class="gptpdf-pv-sheet"><div class="gptpdf-pv-area"><div class="gptpdf-pv-html">' +
        '<div class="gptpdf-pv-body ' + classes + '">' +
        (metaRow ? '<div class="gptpdf-pv-meta">' + metaRow + '</div>' +
            '<hr style="border:none;border-top:2px solid #1a1a1a;margin:3px 0 5px">' : '') +
        '<h1 class="main-title" style="' + h1Hidden + 'font-size:26px;font-weight:700;margin:6px 0;line-height:1.22">' +
        title + '</h1>' + buildRuleLHtml() + toc + clone.outerHTML +
        '</div></div></div>' +
        // The page number shows where it prints; how many pages the whole chat
        // takes is known only to the export, so the sheet does not guess.
        (o.page_numbers && !single && src.startLoaded ? '<div class="gptpdf-pv-pnum">1</div>' : '') +
        '</div>' +
        (single ? '<div class="gptpdf-pv-fade"></div>' : '');

    const area = root.querySelector('.gptpdf-pv-area');
    // "Each question on a new page": page 1 ends before the second question.
    if(o.page_break === 'after' && !single) {
        const breaks = area.querySelectorAll('.gptpdf-newpage' + (o.no_questions ? '-ai' : ''));
        if(breaks.length) {
            let cut = breaks[0];
            while(cut) {
                const next = cut.nextElementSibling;
                cut.style.display = 'none';
                cut = next;
            }
        }
    }
    if(!opt.tiny && !single) gptpdfFitSheet(area, scale);
    return src;
}

function gptpdfEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Fonts ───────────────────────────────────────────────────────────────────
// The four families the print server uses, carried in fonts/ (SIL OFL, licence
// files beside them) and added to the page once: Latin and Cyrillic only (the
// Latin-extended files alone weighed 856 KB). Noto Sans and Serif are variable
// fonts — one file per alphabet covers both weights. Missing letters fall back
// to the page's fonts on the sheet; the PDF has them all on the server.
const GPTPDF_UR_LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, ' +
    'U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const GPTPDF_UR_CYRILLIC = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const GPTPDF_SHEET_FONTS = [
    ['Noto Sans', 'NotoSans-latin.woff2', '400 700', GPTPDF_UR_LATIN],
    ['Noto Sans', 'NotoSans-cyrillic.woff2', '400 700', GPTPDF_UR_CYRILLIC],
    ['Noto Serif', 'NotoSerif-latin.woff2', '400 700', GPTPDF_UR_LATIN],
    ['Noto Serif', 'NotoSerif-cyrillic.woff2', '400 700', GPTPDF_UR_CYRILLIC],
    ['Noto Sans Mono', 'NotoSansMono-latin.woff2', '400', GPTPDF_UR_LATIN],
    ['Noto Sans Mono', 'NotoSansMono-cyrillic.woff2', '400', GPTPDF_UR_CYRILLIC],
    ['Carlito', 'Carlito-400-latin.woff2', '400', GPTPDF_UR_LATIN],
    ['Carlito', 'Carlito-700-latin.woff2', '700', GPTPDF_UR_LATIN],
    ['Carlito', 'Carlito-400-cyrillic.woff2', '400', GPTPDF_UR_CYRILLIC],
    ['Carlito', 'Carlito-700-cyrillic.woff2', '700', GPTPDF_UR_CYRILLIC]
];
let gptpdfSheetFontsLoading = null;

function gptpdfSheetFonts() {
    if(gptpdfSheetFontsLoading) return gptpdfSheetFontsLoading;
    gptpdfSheetFontsLoading = Promise.all(GPTPDF_SHEET_FONTS.map(function(f) {
        return new Promise(function(resolve) {
            try {
                chrome.runtime.sendMessage({ action: 'gptpdfFont', file: f[1] }, function(r) {
                    if(chrome.runtime.lastError || !r || !r.b64) return resolve(false);
                    try {
                        const bin = atob(r.b64);
                        const bytes = new Uint8Array(bin.length);
                        for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                        const face = new FontFace(f[0], bytes.buffer, { weight: f[2], unicodeRange: f[3] });
                        face.load().then(function() {
                            document.fonts.add(face);
                            resolve(true);
                        }, function() { resolve(false); });
                    } catch(e) { resolve(false); }
                });
            } catch(e) { resolve(false); }
        });
    }));
    return gptpdfSheetFontsLoading;
}

// KaTeX's stylesheet with its fonts inlined (background.js), for formulas
// that new answers keep only as KaTeX's drawing. Loaded once, on the first
// export or sheet that needs it; '' when it cannot be had.
let gptpdfKatexCssCache = null;
// Without this stylesheet a square root alone makes the page ~9 times wider
// than the paper (KaTeX draws its line as a 400em picture and only its CSS
// hides the tail), and the printer then shrinks the WHOLE PDF to half size.
// Never rejects: no stylesheet means the export goes on without it.
function gptpdfKatexCssLoad() {
    if(gptpdfKatexCssCache) return Promise.resolve(gptpdfKatexCssCache);
    return new Promise(function(resolve) {
        const giveUp = setTimeout(function() { resolve(''); }, 5000);   // never hold the export
        try {
            chrome.runtime.sendMessage({ action: 'gptpdfKatexCss' }, function(r) {
                clearTimeout(giveUp);
                const css = (!chrome.runtime.lastError && r && r.css) ? r.css : '';
                if(css) gptpdfKatexCssCache = css;   // a miss is tried again next export
                resolve(css);
            });
        } catch(e) {
            resolve('');
        }
    });
}

// Does this copy hold formulas drawn by KaTeX that were not turned into
// MathML (gptpdfMathToMathML needs a TeX source the new answers do not keep)?
function gptpdfNeedsKatexCss(root) {
    return !!root.querySelector('.katex-html');
}

// ── The thumbnail in the Export menu ────────────────────────────────────────
function gptpdfRenderMenuSheet() {
    const frame = document.getElementById('gptpdf-menu-sheet');
    if(!frame) return;
    gptpdfShared.getOptions(function(o) {
        try {
            gptpdfSheetSourceCache = null;
            gptpdfDrawSheet(frame, o, { width: 92, tiny: true });
        } catch(e) {
            console.log('[gptpdf] menu sheet failed', e);
        }
        const style = gptpdfShared.lookStyle(o);
        const fmt = typeof gptpdfFormat === 'function' ? gptpdfFormat(o) : 'pdf';
        const name = document.getElementById('gptpdf-menu-style');
        const text = typeof gptpdfFormatText === 'function' && (gptpdfFormatText(fmt) || fmt === 'gdocs');
        const CAP = { claude: 'Text for Claude', obsidian: 'Note for Obsidian', notion: 'Page for Notion',
                      gdocs: 'Google Docs', md: 'Plain text' };
        if(name) name.textContent = CAP[fmt] || (style ? gptpdfShared.LOOK_NAMES[style] : 'Custom');
        const paper = document.getElementById('gptpdf-menu-paper');
        if(paper) paper.textContent = text ? '' : (o.page_size === 'letter' ? 'Letter' : 'A4') +
            (o.theme === 'dark' && fmt === 'pdf' ? ' · dark' : '') + ' · ';
    });
    gptpdfSheetFonts();
    gptpdfKatexCssLoad();
}
