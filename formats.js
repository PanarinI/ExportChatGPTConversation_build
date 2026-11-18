'use strict';

// ── Word and Markdown (1.2.9) ──────────────────────────────────────────────
// Both files are made here, in the browser, from the copy of the chat a PDF is
// printed from: by then the harvest, the pair → classic translation, the
// pictures as data: and the code widgets are all done (common.js convert). No
// server: the chat stays on the device. The copy is read once into a small
// model — turns made of blocks — and the model is written out as Markdown here
// or as .docx in docx.js. Design and the reasons: dizajn/formaty/README.md,
// DECISIONS 17.11.
//
// Model:
//   turn   { role: 'user' | 'assistant', blocks: [block] }
//   block  { t: 'h', level, inl } · { t: 'p', inl } · { t: 'code', lang, text }
//          { t: 'list', ordered, start, items: [{ blocks, check }] }
//          { t: 'table', rows: [{ cells: [{ blocks, head, align }] }] }
//          { t: 'quote', blocks } · { t: 'hr' } · { t: 'img', src, alt, w, h }
//          { t: 'math', tex, mathml, display: true }
//   inline { t: 'text', v, b, i, s, code, href, sup, sub } · { t: 'br' }
//          { t: 'math', tex, mathml } · { t: 'img', src, alt, w, h }

const GPTPDF_FORMATS = {
    pdf:  { name: 'PDF',      ext: '.pdf',  book: 'PDF', what: 'the PDF',
            hint: 'Pages as they print — to keep, send or print.' },
    word: { name: 'Word',     ext: '.docx', book: 'DOC', what: 'the Word file',
            hint: 'A document to edit — opens in Word, Google Docs or Pages.' },
    md:   { name: 'Markdown', ext: '.md',   book: 'MD',  what: 'the Markdown file',
            hint: 'Plain text with headings — for Obsidian, Notion or another AI.' }
};

function gptpdfFormat(o) {
    return o && GPTPDF_FORMATS[o.export_format] ? o.export_format : 'pdf';
}

// The file the menu shows as chosen (common.js keeps it); an export reads its
// options, this is for the card's words before they are read.
let gptpdfFormatNow = 'pdf';

// The end of an export for Word and Markdown — where a PDF goes to the print
// server. `done` ends the export (button, card) as the PDF's reply does.
function gptpdfMakeFile(format, clone, options, title, filename, done) {
    const F = GPTPDF_FORMATS[format];
    const t0 = Date.now();
    if(typeof gptpdfExportCard !== 'undefined' && gptpdfExportCard.shown) gptpdfExportStep('Writing ' + F.what + '…', '', true);
    setTimeout(function() {
        Promise.resolve().then(function() {
            const model = gptpdfFmtRead(clone, options);
            if(format === 'md') {
                return { data: gptpdfToMarkdown(model, options, title), type: 'text/markdown;charset=utf-8', turns: model.turns.length };
            }
            return gptpdfToDocx(model, options, title).then(function(bytes) {
                return { data: bytes, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         turns: model.turns.length };
            });
        }).then(function(file) {
            console.log('[gptpdf] ' + F.name + ': ' + file.turns + ' messages, ' +
                Math.round((file.data.length || 0) / 1024) + ' KB in ' + (Date.now() - t0) + ' ms');
            done();
            gptpdfFmtSave(file.data, file.type, gptpdfFmtFilename(filename || title, format), format);
        }).catch(function(e) {
            console.log('[gptpdf] ' + F.name + ' failed', e);
            done();
            gptpdfChatGPT.showError(null, 'Failed to make ' + F.what + ':<br><small>' +
                String(e && e.message || e).replace(/[<>&]/g, '') + '</small>');
        });
    }, 30);
}

// What the export CSS hides in a PDF is left out of these files too
// (buildExportCss), plus what only a screen shows.
const GPTPDF_FMT_SKIP = 'script,style,template,noscript,button,svg,input:not([type="checkbox"]),select,textarea,' +
    'canvas,video,audio,iframe,object,embed,.sr-only,.katex-mathml,[data-markdown-copy="exclude"],' +
    '.gptpdf-user-label,.gptpdf-ai-label,.gptpdf-block-cb,.gptpdf-img-sel-row,[hidden],' +
    '[data-d-component="badge"]:has([data-d-component="favicon"]),' +
    '[data-message-author-role="user"] [style*="max-height"] ~ span[aria-hidden="true"]';

const GPTPDF_FMT_BLOCK_TAGS = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV',
    'FIGURE', 'FIGCAPTION', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'PRE',
    'BLOCKQUOTE', 'HR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DL', 'DT', 'DD', 'DETAILS', 'SUMMARY', 'FORM',
    'FIELDSET', 'ADDRESS', 'CENTER']);
// (A picture alone does not make a block: a favicon sits inside a source pill.)
const GPTPDF_FMT_BLOCKISH = Array.from(GPTPDF_FMT_BLOCK_TAGS).join(',').toLowerCase() +
    ',.katex-display,[data-code-block],[data-gptpdf-code-block]';

function gptpdfFmtSkip(el) {
    try { return el.matches(GPTPDF_FMT_SKIP) || (el.style && el.style.display === 'none'); }
    catch(e) { return false; }
}

function gptpdfFmtIsCode(el) {
    return el.tagName === 'PRE' ||
        el.matches('[data-code-block],[data-markdown-copy="code-block"],[data-gptpdf-code-block]');
}

// The picture being edited, shown in a question as a small faded reference
// ("Исходное изображение", h-7: 28 px tall) — the PDF keeps it that small too
// (render.js). Word took it full size: every picture of «мудрец» came twice,
// the second half a page tall in the next question (18.11).
function gptpdfFmtIsRef(img) {
    return img.classList.contains('h-7') && !!img.closest('[data-message-author-role]');
}

// A picture of the chat, not a favicon, a blank pixel or an icon.
function gptpdfFmtContentImg(img) {
    const src = img.getAttribute('src') || '';
    if(!src || /^data:image\/gif;base64,R0lGODlhAQABA/.test(src)) return false;
    if(/favicon/.test(src) || img.closest('[data-d-component="favicon"]')) return false;
    if(!/^(data:image\/|https?:|blob:)/.test(src)) return false;
    if(gptpdfFmtIsRef(img)) return true;
    // The size the page showed it at: a stamp (common.js), or the style the
    // cleanup made of it (render.js, step 9).
    const w = +img.getAttribute('data-gptpdf-w') || parseFloat(img.style.width) || img.naturalWidth || 0;
    const h = +img.getAttribute('data-gptpdf-h') || parseFloat(img.style.height) || img.naturalHeight || 0;
    if(w && h && w < 28 && h < 28) return false;
    // Markdown fetches no picture (common.js): one of ChatGPT's own is known
    // by its mark (gptpdfMarkPicture) — unmarked, it is an icon or a thumbnail.
    if(/^https?:/.test(src) && typeof GPTPDF_PICTURE_HOST !== 'undefined' && GPTPDF_PICTURE_HOST.test(src)) {
        return img.hasAttribute('data-gptpdf-pic');
    }
    return true;
}

function gptpdfFmtImg(img) {
    return {
        t: 'img',
        src: img.getAttribute('src') || '',
        alt: (img.getAttribute('alt') || '').trim(),
        w: +img.getAttribute('data-gptpdf-w') || img.naturalWidth || 0,
        h: +img.getAttribute('data-gptpdf-h') || img.naturalHeight || 0,
        ref: gptpdfFmtIsRef(img)
    };
}

// What a question or an answer carried as a file: one line, «File: name».
function gptpdfFmtFileNote(names) {
    return { t: 'p', file: true, inl: [{ t: 'text', v: names.length > 1 ? 'Files: ' : 'File: ', i: true },
                                       { t: 'text', v: names.join(', '), i: true }] };
}

const GPTPDF_FMT_FILE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|tiff?|heic|pdf|docx?|xlsx?|xlsm|csv|tsv|pptx?|txt|md|rtf|odt|ods|json|xml|ya?ml|zip|tar|gz|py|ipynb|js|ts|html?|css|java|cpp|rb|go|rs|php|sh|sql|mp3|wav|m4a|ogg|mp4|mov|webm|epub)$/i;

// A file an answer made, shown as a card («Photon_Sprite.png · Изображение ·
// Открыть файл»): read as its name alone. The card's words were glued to it —
// «Photon_Sprite.pngИзображение», 8 times in the author's «Художник_базовый»
// (18.11). The card's name is an element whose title is its whole text; a
// name inside a sentence or a link stays as it is.
function gptpdfFmtFileCards(root) {
    root.querySelectorAll('[title]').forEach(function(el) {
        if(!root.contains(el) || el.closest('[data-message-author-role="user"]')) return;
        const t = el.getAttribute('title');
        if(!t || !GPTPDF_FMT_FILE_EXT.test(t) || el.textContent.trim() !== t) return;
        if(el.closest('p,li,td,th,pre,code,h1,h2,h3,h4,h5,h6,a,' + GPTPDF_FMT_PILL)) return;
        const box = el.parentElement;
        if(!box || box.closest('[data-gptpdf-file]')) return;
        const note = root.ownerDocument.createElement('p');
        note.setAttribute('data-gptpdf-file', t);
        box.replaceWith(note);
    });
}

function gptpdfFmtHasBlock(el) {
    const hit = el.querySelector(GPTPDF_FMT_BLOCKISH);
    return !!hit && !(hit.closest(GPTPDF_FMT_PILL) && el.contains(hit.closest(GPTPDF_FMT_PILL)) &&
        !Array.from(el.querySelectorAll(GPTPDF_FMT_BLOCKISH)).some(function(x) { return !x.closest(GPTPDF_FMT_PILL); }));
}

// ── formulas ──────────────────────────────────────────────────────────────
// Old answers keep the TeX (data-math-source; render.js has turned the drawing
// into MathML by now). New answers keep only KaTeX's drawing, so the TeX is
// read back from it: fractions, powers and indices, roots, operators, text.
function gptpdfFmtMath(el) {
    let host = el.closest('[data-math-source]') || (el.matches('[data-math-source]') ? el : null);
    if(!host && el.querySelector) host = el.querySelector('[data-math-source]');
    const mathml = (host || el).querySelector ? (host || el).querySelector('math') : null;
    const display = !!(el.matches('.katex-display') || el.closest('.katex-display') ||
        (el.querySelector && el.querySelector('.katex-display')) ||
        (mathml && mathml.getAttribute('display') === 'block'));
    let tex = host ? (host.getAttribute('data-math-source') || '').trim() : '';
    if(!tex) {
        const ann = (host || el).querySelector('annotation[encoding="application/x-tex"]');
        if(ann) tex = ann.textContent.trim();
    }
    if(!tex) {
        const kh = el.matches('.katex-html') ? el : el.querySelector('.katex-html');
        if(kh) tex = gptpdfKatexToTex(kh);
    }
    if(!tex && !mathml) tex = (el.textContent || '').trim();
    return { tex: tex, mathml: mathml, display: display };
}

function gptpdfFmtIsMath(el) {
    return el.matches('[data-math-source],.katex,.katex-display,math') ||
        (el.matches('span[role="math"]'));
}

// KaTeX's HTML back to TeX. The drawing is regular: atoms (.mord, .mbin, …)
// hold the characters; .mfrac, .msupsub and .sqrt hold their parts in a
// vertical list whose items are placed by their CSS top.
const GPTPDF_TEX_OF = {
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon', 'ϵ': '\\epsilon',
    'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ϑ': '\\vartheta', 'ι': '\\iota', 'κ': '\\kappa',
    'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho', 'σ': '\\sigma',
    'ς': '\\varsigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\varphi', 'ϕ': '\\phi', 'χ': '\\chi',
    'ψ': '\\psi', 'ω': '\\omega', 'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
    'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
    '×': '\\times', '÷': '\\div', '·': '\\cdot', '⋅': '\\cdot', '±': '\\pm', '∓': '\\mp',
    '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '≈': '\\approx', '≡': '\\equiv', '∼': '\\sim', '≅': '\\cong',
    '∝': '\\propto', '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla', '∈': '\\in', '∉': '\\notin',
    '⊂': '\\subset', '⊆': '\\subseteq', '⊃': '\\supset', '⊇': '\\supseteq', '∪': '\\cup', '∩': '\\cap',
    '∅': '\\emptyset', '∀': '\\forall', '∃': '\\exists', '¬': '\\neg', '∧': '\\land', '∨': '\\lor',
    '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow', '⇒': '\\Rightarrow', '⇐': '\\Leftarrow',
    '⇔': '\\Leftrightarrow', '↦': '\\mapsto', '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint',
    '∮': '\\oint', '…': '\\ldots', '⋯': '\\cdots', '°': '^\\circ', '′': "'", '−': '-', '∣': '\\mid',
    '⟨': '\\langle', '⟩': '\\rangle', '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil',
    '∖': '\\setminus', '∘': '\\circ', '⊕': '\\oplus', '⊗': '\\otimes', 'ℝ': '\\mathbb{R}',
    'ℕ': '\\mathbb{N}', 'ℤ': '\\mathbb{Z}', 'ℚ': '\\mathbb{Q}', 'ℂ': '\\mathbb{C}', 'ℓ': '\\ell', 'ħ': '\\hbar'
};

function gptpdfTexChars(s) {
    let out = '';
    for(const ch of s) {
        if(ch === '​' || ch === '⁡' || ch === '⁢') continue;
        const t = GPTPDF_TEX_OF[ch];
        if(t) out += (/^\\[a-zA-Z]+$/.test(t) ? t + ' ' : t);
        else if(ch === '{' || ch === '}' || ch === '%' || ch === '#' || ch === '&' || ch === '$' || ch === '_') out += '\\' + ch;
        else if(ch === ' ') out += '~';
        else out += ch;
    }
    return out;
}

function gptpdfVlistItems(el) {
    // The items of the first vlist below el, each with its CSS top (em).
    const vl = el.querySelector('.vlist');
    if(!vl) return [];
    const items = [];
    vl.childNodes.forEach(function(c) {
        if(c.nodeType !== 1 || !c.style) return;
        const top = parseFloat(c.style.top);
        if(isNaN(top)) return;
        const strut = c.querySelector(':scope > .pstrut');
        const ph = strut ? parseFloat(strut.style.height) || 0 : 0;
        items.push({ el: c, shift: top + ph });   // < 0: above the baseline
    });
    return items;
}

function gptpdfKatexToTex(el) {
    let out = '';
    el.childNodes.forEach(function(n) { out += gptpdfKatexNode(n); });
    // (A space before } stays: inside \text{if } it is a word's.)
    return out.replace(/\s+/g, ' ').replace(/ ([\^_)\]])/g, '$1').trim();
}

// Inside \text{…} the letters are words: no TeX names, a space is a space.
function gptpdfKatexText(n) {
    if(n.nodeType === 3) return n.nodeValue.replace(/[\u00a0]/g, ' ').replace(/[\u200b]/g, '').replace(/([{}%#&$_\\])/g, '\\$1');
    if(n.nodeType !== 1) return '';
    if(n.classList.contains('mspace')) return ' ';
    let s = '';
    n.childNodes.forEach(function(k) { s += gptpdfKatexText(k); });
    return s;
}

function gptpdfKatexNode(n) {
    if(n.nodeType === 3) return gptpdfTexChars(n.nodeValue);
    if(n.nodeType !== 1) return '';
    const c = n.classList;
    if(c.contains('strut') || c.contains('pstrut') || c.contains('vlist-s') || c.contains('frac-line') ||
       c.contains('hide-tail') || n.tagName === 'svg' || n.tagName === 'SVG') return '';
    if(c.contains('mspace')) {
        // KaTeX spaces atoms itself (a binary +, a relation ≤): those come back
        // by themselves. Only a wide one was typed (\quad).
        const w = parseFloat(n.style && (n.style.marginRight || n.style.width)) || 0;
        return w >= 0.9 ? ' \\quad ' : ' ';
    }
    if(c.contains('mfrac')) {
        const items = gptpdfVlistItems(n).filter(function(it) { return !it.el.querySelector('.frac-line'); });
        if(items.length >= 2) {
            items.sort(function(a, b) { return a.shift - b.shift; });
            return '\\frac{' + gptpdfKatexToTex(items[0].el) + '}{' + gptpdfKatexToTex(items[items.length - 1].el) + '}';
        }
    }
    if(c.contains('msupsub')) {
        let sup = '', sub = '';
        gptpdfVlistItems(n).forEach(function(it) {
            const t = gptpdfKatexToTex(it.el);
            if(!t) return;
            if(it.shift < 0) sup = t; else sub = t;
        });
        return (sub ? '_{' + sub + '}' : '') + (sup ? '^{' + sup + '}' : '');
    }
    if(c.contains('sqrt')) {
        const root = n.querySelector(':scope > .root');
        const body = n.querySelector('.svg-align') || n;
        let rad = '';
        body.childNodes.forEach(function(k) { if(!(k.classList && k.classList.contains('hide-tail'))) rad += gptpdfKatexNode(k); });
        const deg = root ? gptpdfKatexToTex(root) : '';
        return '\\sqrt' + (deg ? '[' + deg + ']' : '') + '{' + rad.trim() + '}';
    }
    if(c.contains('op-limits')) {
        // \sum_{a}^{b} drawn with its limits above and below the sign.
        const items = gptpdfVlistItems(n);
        items.sort(function(a, b) { return a.shift - b.shift; });
        if(items.length >= 3) {
            const sup = gptpdfKatexToTex(items[0].el);
            const op = gptpdfKatexToTex(items[1].el);
            const sub = gptpdfKatexToTex(items[items.length - 1].el);
            return op + (sub ? '_{' + sub + '}' : '') + (sup ? '^{' + sup + '}' : '');
        }
    }
    if(c.contains('accent')) {
        const items = gptpdfVlistItems(n);
        if(items.length >= 2) {
            items.sort(function(a, b) { return a.shift - b.shift; });
            const mark = (items[0].el.textContent || '').trim();
            const base = gptpdfKatexToTex(items[items.length - 1].el);
            const cmd = { '^': 'hat', 'ˆ': 'hat', '~': 'tilde', '˜': 'tilde', '→': 'vec', '⃗': 'vec', '¯': 'bar',
                          'ˉ': 'bar', '˙': 'dot', '¨': 'ddot' }[mark] || 'hat';
            return '\\' + cmd + '{' + base + '}';
        }
    }
    if(c.contains('overline') || c.contains('underline')) {
        const items = gptpdfVlistItems(n).filter(function(it) { return !it.el.querySelector('.overline-line,.underline-line'); });
        const body = items.length ? gptpdfKatexToTex(items[0].el) : gptpdfKatexToTex(n);
        return '\\' + (c.contains('overline') ? 'overline' : 'underline') + '{' + body + '}';
    }
    if(c.contains('mtable')) {
        const cols = Array.from(n.querySelectorAll(':scope > [class*="col-align-"]'));
        const grid = cols.map(function(col) {
            return gptpdfVlistItems(col).sort(function(a, b) { return a.shift - b.shift; })
                .map(function(it) { return gptpdfKatexToTex(it.el); });
        });
        const rows = Math.max.apply(null, grid.map(function(g) { return g.length; }).concat([0]));
        const lines = [];
        for(let r = 0; r < rows; r++) lines.push(grid.map(function(g) { return g[r] || ''; }).join(' & '));
        return '\\begin{matrix} ' + lines.join(' \\\\ ') + ' \\end{matrix}';
    }
    if(c.contains('text') && n.textContent.trim()) return '\\text{' + gptpdfKatexText(n) + '}';
    let inner = '';
    n.childNodes.forEach(function(k) { inner += gptpdfKatexNode(k); });
    if(c.contains('mathbf') || c.contains('boldsymbol')) return '\\mathbf{' + inner + '}';
    if(c.contains('mathbb') || c.contains('amsrm')) return /^[A-Z]$/.test(inner) ? '\\mathbb{' + inner + '}' : inner;
    if(c.contains('mathrm') && inner.length > 1 && !c.contains('mop')) return '\\mathrm{' + inner + '}';
    if(c.contains('mop') && /^[a-z]{2,}$/.test(inner) && !c.contains('op-symbol')) return '\\' + inner + ' ';
    return inner;
}

// ── reading the copy ──────────────────────────────────────────────────────
function gptpdfFmtRead(clone, options) {
    const turns = [];
    gptpdfFmtFileCards(clone);
    // A turn of the copy (classic markup by now) is a question or an answer.
    // The whole answer turn is read: a picture made for it sits beside its
    // message element, not inside.
    let units = Array.from(clone.querySelectorAll('[data-testid^="conversation-turn"]'))
        .filter(function(t) { return !t.parentElement || !t.parentElement.closest('[data-testid^="conversation-turn"]'); });
    if(!units.length) {
        units = Array.from(clone.querySelectorAll('[data-message-author-role]'))
            .filter(function(m) { return !m.parentElement || !m.parentElement.closest('[data-message-author-role]'); });
    }
    units.forEach(function(u) {
        const q = u.matches('[data-message-author-role="user"]') ? u : u.querySelector('[data-message-author-role="user"]');
        if(q && options && options.no_questions) return;
        const blocks = q ? gptpdfFmtQuestion(q) : gptpdfFmtBlocks(u, {});
        if(!blocks.length) return;
        const last = turns[turns.length - 1];
        if(!q && last && last.role === 'assistant') last.blocks = last.blocks.concat(blocks);
        else turns.push({ role: q ? 'user' : 'assistant', blocks: blocks });
    });
    return { turns: turns };
}

// A question: its words as typed (line breaks kept), then any files and
// pictures it carried.
function gptpdfFmtQuestion(m) {
    const blocks = [];
    const textEl = (typeof gptpdfQuestionTextEl === 'function') ? gptpdfQuestionTextEl(m) : null;
    const files = [];
    m.querySelectorAll('[title]').forEach(function(el) {
        if(textEl && textEl.contains(el)) return;
        const t = el.getAttribute('title');
        if(t && /\.[a-z0-9]{1,6}$/i.test(t) && el.textContent.trim() === t && files.indexOf(t) === -1) files.push(t);
    });
    if(files.length) blocks.push(gptpdfFmtFileNote(files));
    m.querySelectorAll('img').forEach(function(img) {
        if(gptpdfFmtContentImg(img) && !(textEl && textEl.contains(img))) blocks.push(gptpdfFmtImg(img));
    });
    const text = textEl ? textEl.textContent : (files.length ? '' : m.textContent);
    String(text || '').replace(/\r/g, '').replace(/^\n+|\s+$/g, '').split(/\n{2,}/).forEach(function(par) {
        if(!par.trim()) return;
        const inl = [];
        par.split('\n').forEach(function(line, i) {
            if(i) inl.push({ t: 'br' });
            inl.push({ t: 'text', v: line, keep: true });
        });
        blocks.push({ t: 'p', inl: inl });
    });
    return blocks;
}

function gptpdfFmtPre(el) {
    // Whitespace as typed: a question, ChatGPT's "preserve" spans.
    const ws = el.closest && el.closest('.whitespace-pre-wrap,[data-d-whitespace="preserve"],pre');
    return !!ws;
}

function gptpdfFmtBlocks(el, fmt) {
    const out = [];
    let inl = [];
    const flush = function() {
        const p = gptpdfFmtTrim(inl);
        if(p.length) out.push({ t: 'p', inl: p });
        inl = [];
    };
    el.childNodes.forEach(function(n) {
        if(n.nodeType === 3) {
            gptpdfFmtText(n, fmt, inl);
            return;
        }
        if(n.nodeType !== 1 || gptpdfFmtSkip(n)) return;
        const tag = n.tagName;
        if(n.matches(GPTPDF_FMT_PILL)) { gptpdfFmtPill(n, fmt).forEach(function(x) { inl.push(x); }); return; }
        if(n.hasAttribute('data-gptpdf-file')) { flush(); out.push(gptpdfFmtFileNote([n.getAttribute('data-gptpdf-file')])); return; }
        if(gptpdfFmtIsMath(n)) {
            const m = gptpdfFmtMath(n);
            if(m.display) { flush(); out.push({ t: 'math', tex: m.tex, mathml: m.mathml, display: true }); }
            else inl.push({ t: 'math', tex: m.tex, mathml: m.mathml });
            return;
        }
        if(gptpdfFmtIsCode(n)) { flush(); const c = gptpdfFmtCode(n); if(c.text.trim()) out.push(c); return; }
        if(/^H[1-6]$/.test(tag)) {
            flush();
            const h = gptpdfFmtTrim(gptpdfFmtInline(n, {}));
            if(h.length) out.push({ t: 'h', level: +tag[1], inl: h });
            return;
        }
        if(tag === 'UL' || tag === 'OL') { flush(); out.push(gptpdfFmtList(n)); return; }
        if(tag === 'TABLE') { flush(); const t = gptpdfFmtTable(n); if(t.rows.length) out.push(t); return; }
        if(tag === 'BLOCKQUOTE') { flush(); const q = gptpdfFmtBlocks(n, fmt); if(q.length) out.push({ t: 'quote', blocks: q }); return; }
        if(tag === 'HR') { flush(); out.push({ t: 'hr' }); return; }
        if(tag === 'BR') { inl.push({ t: 'br' }); return; }
        if(tag === 'IMG') {
            if(gptpdfFmtContentImg(n)) { flush(); out.push(gptpdfFmtImg(n)); }
            return;
        }
        if(GPTPDF_FMT_BLOCK_TAGS.has(tag) || gptpdfFmtHasBlock(n)) {
            if(tag === 'P' && !gptpdfFmtHasBlock(n)) {
                flush();
                const p = gptpdfFmtTrim(gptpdfFmtInline(n, fmt));
                if(p.length) out.push({ t: 'p', inl: p });
                return;
            }
            flush();
            gptpdfFmtBlocks(n, gptpdfFmtStyle(n, fmt)).forEach(function(b) { out.push(b); });
            return;
        }
        gptpdfFmtInline(n, fmt).forEach(function(x) { inl.push(x); });
    });
    flush();
    return out;
}

function gptpdfFmtStyle(el, fmt) {
    const tag = el.tagName;
    const f = Object.assign({}, fmt);
    if(tag === 'STRONG' || tag === 'B') f.b = true;
    else if(tag === 'EM' || tag === 'I') f.i = true;
    else if(tag === 'DEL' || tag === 'S' || tag === 'STRIKE') f.s = true;
    else if(tag === 'SUP') f.sup = true;
    else if(tag === 'SUB') f.sub = true;
    else if(tag === 'A' && el.getAttribute('href')) {
        const href = el.getAttribute('href');
        if(/^(https?:|mailto:)/i.test(href)) f.href = href;
    }
    return f;
}

function gptpdfFmtText(n, fmt, into) {
    let v = n.nodeValue;
    if(!v) return;
    if(fmt.code || gptpdfFmtPre(n.parentElement)) {
        v.replace(/\r/g, '').split('\n').forEach(function(line, i) {
            if(i) into.push({ t: 'br' });
            if(line) into.push(Object.assign({ t: 'text', v: line, keep: true }, fmt));
        });
        return;
    }
    v = v.replace(/[\s​]+/g, function(s) { return / /.test(s) ? ' ' : ' '; });
    if(v) into.push(Object.assign({ t: 'text', v: v }, fmt));
}

// A source pill ("Federal Tax Service +1") is one link with the source's name.
const GPTPDF_FMT_PILL = 'a[data-testid="chatgpt-citation"],[data-testid="webpage-citation-pill"]';

function gptpdfFmtPill(n, fmt) {
    const a = n.matches('a[href]') ? n : n.querySelector('a[href]');
    const href = a ? a.getAttribute('href') : '';
    let name = (n.textContent || '').replace(/\s*\+\d+\s*$/, '').replace(/\s+/g, ' ').trim();
    if(!name && a) name = (a.getAttribute('aria-label') || '').split(':')[0].trim();
    if(!name) return [];
    if(!/^(https?:|mailto:)/i.test(href || '')) return [Object.assign({ t: 'text', v: ' ' + name }, fmt)];
    return [Object.assign({ t: 'text', v: ' ' }, fmt), Object.assign({ t: 'text', v: name }, fmt, { href: href })];
}

function gptpdfFmtInline(el, fmt) {
    const out = [];
    el.childNodes.forEach(function(n) {
        if(n.nodeType === 3) { gptpdfFmtText(n, fmt, out); return; }
        if(n.nodeType !== 1 || gptpdfFmtSkip(n)) return;
        const tag = n.tagName;
        if(n.matches(GPTPDF_FMT_PILL)) { gptpdfFmtPill(n, fmt).forEach(function(x) { out.push(x); }); return; }
        if(gptpdfFmtIsMath(n)) {
            const m = gptpdfFmtMath(n);
            out.push({ t: 'math', tex: m.tex, mathml: m.mathml });
            return;
        }
        if(tag === 'BR') { out.push({ t: 'br' }); return; }
        if(tag === 'IMG') { if(gptpdfFmtContentImg(n)) out.push(gptpdfFmtImg(n)); return; }
        if(tag === 'CODE' && !fmt.code) {
            const v = n.textContent.replace(/\s+/g, ' ');
            if(v) out.push(Object.assign({ t: 'text', v: v, code: true }, fmt));
            return;
        }
        if(n.classList.contains('gptpdf-check') || (tag === 'INPUT' && n.type === 'checkbox')) {
            const on = n.classList.contains('gptpdf-check-on') || n.checked || n.hasAttribute('checked');
            out.push({ t: 'text', v: on ? '☑ ' : '☐ ', check: on });
            return;
        }
        if(tag === 'INPUT') return;
        gptpdfFmtInline(n, gptpdfFmtStyle(n, fmt)).forEach(function(x) { out.push(x); });
    });
    return out;
}

// Spaces at the edges of a paragraph go; inside, one space between words.
function gptpdfFmtTrim(inl) {
    const out = [];
    inl.forEach(function(x) {
        if(x.t === 'text' && !x.keep && !x.code) {
            const prev = out[out.length - 1];
            let v = x.v;
            if((!prev || prev.t === 'br' || (prev.t === 'text' && /\s$/.test(prev.v))) && !x.keep) v = v.replace(/^ +/, '');
            if(!v) return;
            out.push(Object.assign({}, x, { v: v }));
        } else {
            out.push(x);
        }
    });
    while(out.length && out[out.length - 1].t === 'br') out.pop();
    while(out.length && out[0].t === 'br') out.shift();
    const last = out[out.length - 1];
    if(last && last.t === 'text' && !last.keep) {
        last.v = last.v.replace(/\s+$/, '');
        if(!last.v) out.pop();
    }
    const hasContent = out.some(function(x) {
        return x.t === 'math' || x.t === 'img' || (x.t === 'text' && x.v.trim());
    });
    return hasContent ? out : [];
}

function gptpdfFmtCode(el) {
    let lang = '';
    const lc = el.querySelector('code[class*="language-"]');
    if(lc) {
        const m = /language-([\w#+.-]+)/.exec(lc.className);
        if(m) lang = m[1];
    }
    let label = el.querySelector('[data-markdown-copy="exclude"]');
    if(!label && el.matches('[data-gptpdf-code-block]')) label = el.firstElementChild;
    if(!label && el.tagName === 'PRE') {
        const first = el.querySelector(':scope > div > div:first-child');
        if(first && !first.querySelector('code') && first.textContent.trim().length < 30) label = first;
    }
    if(!lang && label) lang = label.textContent.trim();
    if(!/^[a-z][\w#+.-]{0,23}$/i.test(lang) || /^(code|text|plain|plaintext)$/i.test(lang)) lang = '';
    let src = el.querySelector('[data-code-block-source]') || el.querySelector('code') ||
        el.querySelector('pre') || el;
    let text;
    if(src === el && label) {
        const copy = el.cloneNode(true);
        const l2 = copy.querySelector('[data-markdown-copy="exclude"]') ||
            (el.matches('[data-gptpdf-code-block]') ? copy.firstElementChild : copy.querySelector(':scope > div > div:first-child'));
        if(l2) l2.remove();
        text = copy.textContent;
    } else {
        text = src.textContent;
    }
    return { t: 'code', lang: lang.toLowerCase(), text: String(text || '').replace(/\r/g, '').replace(/\n+$/, '') };
}

function gptpdfFmtList(el) {
    const ordered = el.tagName === 'OL';
    const start = parseInt(el.getAttribute('start'), 10);
    const items = [];
    Array.from(el.children).forEach(function(li) {
        if(li.tagName !== 'LI' || gptpdfFmtSkip(li)) return;
        let check = null;
        const box = li.querySelector('.gptpdf-check, input[type="checkbox"]');
        if(box && (!box.closest('li') || box.closest('li') === li)) {
            check = box.classList.contains('gptpdf-check-on') || box.checked || box.hasAttribute('checked');
            box.setAttribute('data-gptpdf-fmt-used', '');
        }
        let blocks = gptpdfFmtBlocks(li, {});
        if(check !== null) blocks = gptpdfFmtDropCheck(blocks);
        items.push({ blocks: blocks, check: check });
    });
    return { t: 'list', ordered: ordered, start: start > 0 ? start : 1, items: items };
}

function gptpdfFmtDropCheck(blocks) {
    const first = blocks[0];
    if(first && first.t === 'p' && first.inl[0] && first.inl[0].check !== undefined) {
        first.inl = gptpdfFmtTrim(first.inl.slice(1));
        if(!first.inl.length) blocks = blocks.slice(1);
    }
    return blocks;
}

function gptpdfFmtTable(table) {
    const rows = [];
    table.querySelectorAll('tr').forEach(function(tr) {
        if(tr.closest('table') !== table || gptpdfFmtSkip(tr)) return;
        const cells = [];
        Array.from(tr.children).forEach(function(td) {
            if(td.tagName !== 'TD' && td.tagName !== 'TH') return;
            const a = (td.getAttribute('data-d-align') || td.style.textAlign || td.getAttribute('align') || '').toLowerCase();
            cells.push({
                blocks: gptpdfFmtBlocks(td, {}),
                head: td.tagName === 'TH',
                align: /end|right/.test(a) ? 'right' : (/center/.test(a) ? 'center' : '')
            });
        });
        if(cells.length) rows.push({ cells: cells });
    });
    return { t: 'table', rows: rows };
}

// ── the chat's header: title, date, link — as the PDF has it ─────────────
function gptpdfFmtHeader(options, title) {
    const h = { title: options.title_mode === 'none' ? '' : title, date: '', url: '' };
    if(options.datetime_format && options.datetime_format !== 'none') {
        const now = new Date();
        h.date = options.datetime_format === 'date_only' ? now.toLocaleDateString() : now.toLocaleString();
    }
    if(options.source_link) h.url = window.location.href;
    return h;
}

// The contents: each question's words, as in the PDF (buildTocHtml).
function gptpdfFmtTocItems(model) {
    const items = [];
    model.turns.forEach(function(t, i) {
        if(t.role !== 'user') return;
        const words = gptpdfFmtPlain(t.blocks.filter(function(b) { return b.t === 'p'; }).slice(-1)[0] || t.blocks[0]);
        if(words) items.push({ turn: i, text: words.length > 90 ? words.slice(0, 89) + '…' : words });
    });
    return items;
}

function gptpdfFmtPlain(block) {
    if(!block) return '';
    const inl = block.inl || [];
    return inl.map(function(x) { return x.t === 'text' ? x.v : (x.t === 'math' ? x.tex : ' '); })
        .join('').replace(/\s+/g, ' ').trim();
}

// ── Markdown ──────────────────────────────────────────────────────────────
// Questions as the Questions setting has them: Bubble — "**You:**" and
// "**ChatGPT:**" before each side (a chat; an AI reads the roles); Heading — the
// question is a "##" heading and the answer's own headings step one level down
// (a document with an outline, as in Obsidian). Pictures stay out of the text:
// a line says where one was (a picture as text is megabytes of letters).
function gptpdfToMarkdown(model, options, title) {
    const look = gptpdfShared.look(options);
    const asHeading = look.qLook === 'heading';
    const head = gptpdfFmtHeader(options, title);
    const parts = [];
    if(head.title) parts.push('# ' + gptpdfMdEscape(head.title.replace(/\s+/g, ' ').trim(), true));
    const meta = [head.date, head.url ? '<' + head.url + '>' : ''].filter(Boolean).join(' · ');
    if(meta) parts.push(meta);
    if(options.toc && !options.no_questions) {
        const items = gptpdfFmtTocItems(model);
        if(items.length > 1) {
            parts.push('**Contents**\n\n' + items.map(function(it, k) {
                return (k + 1) + '. ' + gptpdfMdEscape(it.text);
            }).join('\n'));
        }
    }
    if(parts.length) parts.push('---');
    let shift = asHeading ? 1 : 0;
    model.turns.forEach(function(t) {
        if(t.role === 'user') {
            // The picture being edited stays out (gptpdfMdImgNote).
            const qb = t.blocks.filter(function(b) { return !(b.t === 'img' && b.ref); });
            if(asHeading) {
                // The question's first line is the heading; the rest of its
                // words, its file and its pictures follow as they are.
                const first = qb.findIndex(function(b) { return b.t === 'p' && !b.file; });
                const blocks = qb.slice();
                let words = '';
                if(first !== -1) {
                    const inl = blocks[first].inl;
                    const br = inl.findIndex(function(x) { return x.t === 'br'; });
                    words = gptpdfFmtPlain({ inl: br === -1 ? inl : inl.slice(0, br) });
                    const rest = br === -1 ? [] : gptpdfFmtTrim(inl.slice(br + 1));
                    if(rest.length) blocks[first] = { t: 'p', inl: rest };
                    else blocks.splice(first, 1);
                }
                if(words) parts.push('## ' + gptpdfMdEscape(words, true));
                if(blocks.length) parts.push(gptpdfMdBlocks(blocks, 0));
            } else {
                const md = gptpdfMdBlocks(qb, 0);
                parts.push(/^[^\n#>|`\-*0-9!]/.test(md) && qb[0] && qb[0].t === 'p'
                    ? '**You:** ' + md : '**You:**\n\n' + md);
            }
        } else {
            if(!asHeading && !options.no_questions) parts.push('**ChatGPT:**');
            parts.push(gptpdfMdBlocks(t.blocks, shift));
        }
    });
    return parts.filter(function(p) { return p && p.trim(); }).join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function gptpdfMdEscape(s, heading) {
    let v = String(s).replace(/\\/g, '\\\\').replace(/([*`\[\]])/g, '\\$1')
        .replace(/(^|[\s(])_|_(?=$|[\s).,;:!?])/g, function(m) { return m.replace('_', '\\_'); })
        .replace(/<(?=[a-zA-Z\/!])/g, '\\<');
    if(heading) return v.replace(/#+$/, function(m) { return '\\' + m; });
    return v;
}

function gptpdfMdLineStart(s) {
    // A line that would read as a heading, a list, a quote or a rule keeps its
    // words: "1\." "\-" "\#" (a backslash before a digit is not an escape).
    return s.replace(/(^|\n)( {0,3})(\d{1,9})([.)])(?=[ \t]|$)/g, '$1$2$3\\$4')
        .replace(/(^|\n)( {0,3})([#>+]|-(?=[ \t]|$)|[-=](?=[-=]*[ \t]*(\n|$)))/g, '$1$2\\$3');
}

function gptpdfMdInline(inl) {
    let out = '';
    let i = 0;
    while(i < inl.length) {
        const x = inl[i];
        if(x.t === 'br') { out += '  \n'; i++; continue; }
        if(x.t === 'math') { out += '$' + (x.tex || '').replace(/\$/g, '\\$') + '$'; i++; continue; }
        if(x.t === 'img') { out += gptpdfMdImgNote(x); i++; continue; }
        if(x.href) {
            // A link: its run of pieces with the same address.
            let j = i, label = '';
            while(j < inl.length && inl[j].t === 'text' && inl[j].href === x.href) {
                label += gptpdfMdRun(Object.assign({}, inl[j], { href: '' }));
                j++;
            }
            if(j === i) { i++; continue; }
            label = label.trim() || x.href;
            out += label === x.href.replace(/^mailto:/, '') ? '<' + x.href + '>' : '[' + label + '](' + x.href.replace(/[()\s]/g, encodeURIComponent) + ')';
            i = j;
            continue;
        }
        // Merge neighbours of one style so **a** **b** becomes **a b**.
        let j = i, v = '';
        while(j < inl.length && inl[j].t === 'text' && !inl[j].href && inl[j].code === x.code &&
              !!inl[j].b === !!x.b && !!inl[j].i === !!x.i && !!inl[j].s === !!x.s &&
              !!inl[j].sup === !!x.sup && !!inl[j].sub === !!x.sub) {
            v += inl[j].v;
            j++;
        }
        out += gptpdfMdRun(Object.assign({}, x, { v: v }));
        i = j;
    }
    return out;
}

function gptpdfMdRun(x) {
    if(x.code) {
        const ticks = (x.v.match(/`+/g) || []).reduce(function(m, s) { return Math.max(m, s.length); }, 0);
        const f = '`'.repeat(ticks + 1);
        const pad = /^`|`$|^ .* $/.test(x.v) ? ' ' : '';
        return f + pad + x.v + pad + f;
    }
    let v = gptpdfMdEscape(x.v);
    if(!v.trim()) return v;
    const lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0];
    v = v.trim();
    if(x.sup) v = '<sup>' + v + '</sup>';
    if(x.sub) v = '<sub>' + v + '</sub>';
    if(x.s) v = '~~' + v + '~~';
    if(x.i) v = '*' + v + '*';
    if(x.b) v = '**' + v + '**';
    return lead + v + tail;
}

function gptpdfMdImgNote(img) {
    // The picture being edited, a 28 px reference in a question: the picture
    // itself is named a line above, in the answer that made it. Named here too
    // it came and went with what was on the screen at the click (an on-screen
    // reference is too small to count as a picture).
    if(img.ref) return '';
    const what = img.alt && !/^(image|picture)$/i.test(img.alt) ? img.alt : 'Picture';
    return '*[' + gptpdfMdEscape(what).replace(/[\[\]]/g, '') + ']*';
}

function gptpdfMdBlocks(blocks, shift) {
    return blocks.map(function(b) { return gptpdfMdBlock(b, shift); })
        .filter(function(s) { return s && s.trim(); }).join('\n\n');
}

function gptpdfMdBlock(b, shift) {
    switch(b.t) {
    case 'h':
        // A heading is bold by itself: ChatGPT's <strong> inside it is dropped.
        return '#'.repeat(Math.min(6, b.level + (shift || 0))) + ' ' + gptpdfMdInline(b.inl.map(function(x) {
            return x.t === 'text' ? Object.assign({}, x, { b: false }) : x;
        })).replace(/\s*\n\s*/g, ' ');
    case 'p':
        return gptpdfMdLineStart(gptpdfMdInline(b.inl));
    case 'code': {
        const longest = (b.text.match(/`{3,}/g) || []).reduce(function(m, s) { return Math.max(m, s.length); }, 2);
        const fence = '`'.repeat(longest + 1);
        return fence + (b.lang || '') + '\n' + b.text + '\n' + fence;
    }
    case 'list':
        return b.items.map(function(it, k) {
            const mark = b.ordered ? (b.start + k) + '.' : '-';
            const box = it.check === null || it.check === undefined ? '' : (it.check ? '[x] ' : '[ ] ');
            const pad = ' '.repeat(mark.length + 1);
            let body = '';
            it.blocks.forEach(function(ib, k) {
                const s = gptpdfMdBlock(ib, shift);
                if(!s || !s.trim()) return;
                body += (body ? (ib.t === 'list' ? '\n' : '\n\n') : '') + s;
            });
            const lines = body.split('\n');
            return mark + ' ' + box + lines[0] + (lines.length > 1 ? '\n' + lines.slice(1).map(function(l) {
                return l ? pad + l : '';
            }).join('\n') : '');
        }).join('\n');
    case 'table': {
        const width = Math.max.apply(null, b.rows.map(function(r) { return r.cells.length; }));
        const cell = function(c) {
            return c ? c.blocks.map(function(x) {
                return x.t === 'p' || x.t === 'h' ? gptpdfMdInline(x.inl) : gptpdfMdBlock(x, 0);
            }).join('<br>').replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
        };
        const row = function(r) {
            const cs = [];
            for(let k = 0; k < width; k++) cs.push(cell(r.cells[k]));
            return '| ' + cs.join(' | ') + ' |';
        };
        const first = b.rows[0];
        const sep = [];
        for(let k = 0; k < width; k++) {
            const c = b.rows[Math.min(1, b.rows.length - 1)].cells[k] || first.cells[k];
            const al = c && c.align;
            sep.push(al === 'right' ? '---:' : (al === 'center' ? ':---:' : '---'));
        }
        return [row(first), '| ' + sep.join(' | ') + ' |'].concat(b.rows.slice(1).map(row)).join('\n');
    }
    case 'quote':
        return gptpdfMdBlocks(b.blocks, shift).split('\n').map(function(l) { return l ? '> ' + l : '>'; }).join('\n');
    case 'hr':
        return '---';
    case 'img':
        return gptpdfMdImgNote(b);
    case 'math':
        return '$$\n' + (b.tex || '') + '\n$$';
    }
    return '';
}

// A file of text or bytes, saved like the PDF (Rate us counts it too).
function gptpdfFmtSave(data, type, filename, format) {
    const url = URL.createObjectURL(new Blob([data], { type: type }));
    gptpdfChatGPT.saveBlob(url, filename, format);
}

function gptpdfFmtFilename(title, format) {
    const base = String(title || 'ChatGPT').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim()
        .replace(/\.+$/, '').slice(0, 120) || 'ChatGPT';
    return base + GPTPDF_FORMATS[format].ext;
}
