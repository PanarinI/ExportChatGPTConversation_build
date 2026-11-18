'use strict';

// Settings window (1.2.6). Left: page 1 of this chat as it will print
// (preview.js). Right: Style · Paper · Header. Every change is saved at once
// and redrawn; Done only closes. Mock and the "what moved where" table:
// dizajn/obzor-2026-11-16 (maket/nastrojki.html, README §8).
// Style: three tiles set font, size, spacing, question look and colour at
// once; touching any of those knobs makes the look the person's own
// ("Custom · ↺ <style>") until a tile is picked again — Fill in the Blank.
// Uses gptpdfShared (options, look), EXPORT_THEMES, preview.js.

let gptpdfSwOpts = null;   // what the window shows; saved on every change

function gptpdfSetSegment(id, value) {
    const el = document.getElementById(id);
    if(!el) return;
    el.querySelectorAll('.gptpdf-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === value));
}

function gptpdfGetSegment(id) {
    const el = document.getElementById(id);
    if(!el) return '';
    const a = el.querySelector('.gptpdf-seg-btn.active');
    return a ? a.dataset.value : '';
}

// A stored margin ('0.4in', '20mm', '1.5cm', '12px', bare inches) in mm.
function gptpdfMarginMm(v) {
    const s = String(v == null ? '' : v).trim();
    const n = parseFloat(s);
    if(!(n >= 0)) return '';
    let mm = n * 25.4;
    if(/mm$/.test(s)) mm = n;
    else if(/cm$/.test(s)) mm = n * 10;
    else if(/px$/.test(s)) mm = n * 25.4 / 96;
    return Math.round(mm * 10) / 10;
}

function gptpdfOpenSettings() {
    const overlay = document.getElementById('gptpdf-settings-overlay');
    overlay.style.display = 'flex';
    gptpdfShared.getOptions(function(opts) {
        const o = Object.assign({}, opts);
        // The knobs show the look an export uses now — an old 150 % zoom
        // shows as 14 pt, not as the Chat default.
        const L = gptpdfShared.look(o);
        o.look_font = L.font;
        o.look_size = L.size;
        o.look_spacing = L.spacing;
        o.q_look = L.qLook;
        o.q_color = L.qColor;
        if(o.theme !== 'dark') o.theme = 'light';
        if(!gptpdfShared.LOOK_STYLES[o.look_base]) o.look_base = 'chat';
        gptpdfSwOpts = o;
        try { gptpdfSheetSource(true); } catch(e) { console.log('[gptpdf] sheet source', e); }
        gptpdfSwRender();
        Promise.all([gptpdfSheetFonts(), gptpdfKatexCssLoad()]).then(gptpdfSwRender);
    });
}

function gptpdfCloseSettings() {
    document.getElementById('gptpdf-settings-overlay').style.display = 'none';
    if(typeof gptpdfRenderMenuSheet === 'function') gptpdfRenderMenuSheet();
}

function gptpdfSwSave() {
    const o = gptpdfSwOpts;
    if(!o) return;
    gptpdfShared.getOptions(function(existing) {
        // Size is set in points now; the old whole-sheet zoom is retired.
        const next = Object.assign({}, existing, o, { zoom: 100 });
        // Questions › Hidden is set here since 1.2.9 (it was the menu's
        // "AI answers only"); the file type is the menu's.
        next.no_questions = !!o.no_questions;
        next.export_format = existing.export_format;
        try {
            chrome.storage.sync.set({ options: next });
        } catch(e) {
            console.error('gptpdf settings save error:', e);
        }
    });
}

function gptpdfSwSet(changes) {
    if(!gptpdfSwOpts) return;
    Object.assign(gptpdfSwOpts, changes);
    gptpdfSwSave();
    gptpdfSwRender();
}

function gptpdfSwRender() {
    const o = gptpdfSwOpts;
    if(!o) return;
    const style = gptpdfShared.lookStyle(o);
    if(style) o.look_base = style;

    gptpdfSetSegment('gptpdf-look-font', o.look_font);
    gptpdfSetSegment('gptpdf-look-spacing', o.look_spacing);
    gptpdfSetSegment('gptpdf-q-look', o.no_questions ? 'hidden' : o.q_look);
    gptpdfSetSegment('gptpdf-page-size', o.page_size || 'a4');
    gptpdfSetSegment('gptpdf-orientation', o.orientation || '');
    gptpdfSetSegment('gptpdf-margins', o.margins || '');
    gptpdfSetSegment('gptpdf-page-break', o.single_page ? 'long' : (o.page_break || ''));
    gptpdfSetSegment('gptpdf-title-mode', o.title_mode || '');
    gptpdfSetSegment('gptpdf-datetime', o.datetime_format || 'none');
    gptpdfSetSegment('gptpdf-toc', o.toc || '');

    const size = document.getElementById('gptpdf-look-size');
    if(size) size.textContent = (o.look_size % 1 ? o.look_size.toFixed(1) : o.look_size) + ' pt';
    const dn = document.getElementById('gptpdf-look-size-dn');
    const up = document.getElementById('gptpdf-look-size-up');
    if(dn) dn.disabled = o.look_size <= gptpdfShared.LOOK_SIZE_MIN;
    if(up) up.disabled = o.look_size >= gptpdfShared.LOOK_SIZE_MAX;

    document.querySelectorAll('#gptpdf-q-colors button').forEach(function(b) {
        b.classList.toggle('on', b.dataset.value === o.q_color);
    });
    document.querySelectorAll('#gptpdf-theme .gptpdf-theme-card').forEach(function(c) {
        c.classList.toggle('active', c.dataset.value === (o.theme === 'dark' ? 'dark' : 'light'));
    });

    const custom = document.getElementById('gptpdf-margins-custom');
    if(custom) {
        custom.classList.toggle('on', o.margins === 'custom');
        custom.querySelectorAll('input').forEach(function(inp) {
            if(document.activeElement !== inp) inp.value = gptpdfMarginMm(o[inp.dataset.k]);
        });
    }

    const pn = document.getElementById('gptpdf-page-numbers');
    if(pn) {
        pn.checked = !!o.page_numbers && !o.single_page;
        pn.disabled = !!o.single_page;
    }
    const pnHint = document.getElementById('gptpdf-page-numbers-hint');
    if(pnHint) pnHint.textContent = o.single_page ? 'not on one long page' : '';
    const sl = document.getElementById('gptpdf-source-link');
    if(sl) sl.checked = !!o.source_link;

    const state = document.getElementById('gptpdf-sw-state');
    if(state) {
        if(style) {
            state.className = 'gptpdf-sw-state';
            state.textContent = gptpdfShared.LOOK_NAMES[style];
            state.title = 'The style as it comes';
        } else {
            const base = gptpdfShared.LOOK_NAMES[o.look_base] || 'Chat';
            state.className = 'gptpdf-sw-state custom';
            state.textContent = 'Custom · ↺ ' + base;
            state.title = 'You changed the style. Click to return to ' + base + ' — or pick any style above.';
        }
    }

    // The sheets: each tile shows what you get if you click it — its style
    // with your paper and header; the big one shows what you have now.
    document.querySelectorAll('#gptpdf-sw-tiles .gptpdf-sw-tile').forEach(function(t) {
        const k = t.dataset.style;
        const o2 = Object.assign({}, o, gptpdfShared.LOOK_STYLES[k]);
        try { gptpdfDrawSheet(t.querySelector('.gptpdf-sw-mini'), o2, { width: 64, tiny: true }); }
        catch(e) { console.log('[gptpdf] tile sheet', e); }
        t.classList.toggle('on', style === k);
        t.classList.toggle('base', !style && o.look_base === k);
    });

    const box = document.getElementById('gptpdf-sw-sheetbox');
    const sheet = document.getElementById('gptpdf-sw-sheet');
    let src = null;
    if(box && sheet && box.clientWidth) {
        try {
            src = gptpdfDrawSheet(sheet, o, { width: box.clientWidth - 8, maxH: box.clientHeight - 4 });
        } catch(e) {
            console.log('[gptpdf] sheet', e);
        }
    }
    const cap = document.getElementById('gptpdf-sw-cap');
    if(cap) {
        let t = (o.page_size === 'letter' ? 'Letter' : 'A4') + ' · ' +
            (o.orientation === 'landscape' ? 'landscape' : 'portrait');
        if(src && src.empty) {
            t = 'Open a chat to see its first page here.';
        } else if(typeof gptpdfFormatText === 'function' && gptpdfFormatText(gptpdfFormat(o))) {
            // Markdown has no pages: the sheet is the start of the file (for
            // Claude, of the text copied for it).
            t = (gptpdfFormat(o) === 'claude' ? 'The start of the text for Claude' : 'The start of the .md file') +
                (src && !src.startLoaded ? ' — from the part of the chat on your screen' : '');
        } else if(src && !src.startLoaded) {
            // A long chat loads from the end: the beginning is not on the page
            // yet. Say so rather than pass a middle page off as page 1.
            t += ' · Showing the part of the chat on your screen — the PDF starts from the first message.';
        } else {
            t += ' · page 1 of this chat';
            if(o.single_page) t += ', one long page';
            else if(o.page_break === 'after') t += ' — the next question starts page 2';
        }
        // Dev builds: what the sheet found on this page, so a blank sheet on
        // a real chat says why without opening the console.
        if(src && /-dev/.test(gptpdfShared.build)) t += '  [dev: ' + src.debug + ']';
        cap.textContent = t;
    }

    const ver = document.getElementById('gptpdf-sw-ver');
    if(ver) ver.textContent = 'ExportGPT ' + String(gptpdfShared.version || '').replace(/^v/, '');
    gptpdfSwFormat(o);
}

// What the chosen file takes from these settings (1.2.9). Markdown is plain
// text: no fonts, sizes, colours or paper — questions and the header only.
// Word takes the look and the page, but not a dark sheet or one long page.
// What does not apply is dimmed, with a word why; nothing is lost — it comes
// back for a PDF.
function gptpdfSwFormat(o) {
    const fmt = typeof gptpdfFormat === 'function' ? gptpdfFormat(o) : 'pdf';
    // Claude (1.2.10) is Markdown text too, and always with the questions.
    const claude = fmt === 'claude', md = fmt === 'md' || claude, word = fmt === 'word';
    const off = function(el, yes, why) {
        if(!el) return;
        el.classList.toggle('gptpdf-fmt-off', !!yes);
        if(yes) el.title = why; else if(el.dataset.gptpdfTitle !== undefined) el.title = el.dataset.gptpdfTitle;
    };
    const keep = function(el) { if(el && el.dataset.gptpdfTitle === undefined) el.dataset.gptpdfTitle = el.title || ''; return el; };
    const row = function(id) { const e = document.getElementById(id); return e && keep(e.closest('.gptpdf-sw-row')); };
    const note = document.getElementById('gptpdf-sw-fmt-note');
    if(note) {
        note.textContent = claude ? 'Claude gets the chat as plain text with every question: the font, size, spacing, ' +
            'colour, paper and the way questions look do not apply. The Header tab does.'
            : md ? 'Markdown is plain text: the font, size, spacing, colour and paper do not apply. ' +
            'Questions and the Header tab do.' : '';
        note.classList.toggle('on', md);
    }
    const plain = claude ? 'Claude gets plain text' : 'Markdown is plain text';
    off(keep(document.getElementById('gptpdf-sw-tiles')), md, plain);
    off(row('gptpdf-look-font'), md, plain);
    off(row('gptpdf-look-size'), md, plain);
    off(row('gptpdf-look-spacing'), md, plain);
    const colors = row('gptpdf-q-colors');
    off(colors, md || !!o.no_questions, o.no_questions ? 'Questions are hidden — there is nothing to colour' : plain);
    off(row('gptpdf-q-look'), claude, 'Claude always gets every question, as "You:"');
    const noPaper = claude ? 'Text for Claude has no paper' : 'Markdown has no paper';
    off(keep(document.querySelector('#gptpdf-settings-modal .gptpdf-sw-tab[data-tab="paper"]')), md, noPaper);
    off(keep(document.querySelector('#gptpdf-settings-modal .gptpdf-sw-pane[data-pane="paper"]')), md, noPaper);
    off(keep(document.querySelector('#gptpdf-theme .gptpdf-theme-card[data-value="dark"]')), word, 'A Word document is always white');
    off(keep(document.querySelector('#gptpdf-page-break .gptpdf-seg-btn[data-value="long"]')), word, 'A Word document has pages');
}

// Wire up the window. Called from common.js init() AFTER the markup is in the
// page, so the targets exist.
function wireSettings() {
    const overlay = document.getElementById('gptpdf-settings-overlay');
    overlay.addEventListener('click', function(e) {
        if(e.target === this) gptpdfCloseSettings();
    });
    document.getElementById('gptpdf-settings-close').addEventListener('click', gptpdfCloseSettings);
    document.getElementById('gptpdf-settings-done').addEventListener('click', gptpdfCloseSettings);
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape' && overlay.style.display === 'flex') gptpdfCloseSettings();
    });

    // Tabs
    document.querySelectorAll('#gptpdf-settings-modal .gptpdf-sw-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('#gptpdf-settings-modal .gptpdf-sw-tab').forEach(t => t.classList.toggle('on', t === tab));
            document.querySelectorAll('#gptpdf-settings-modal .gptpdf-sw-pane').forEach(function(p) {
                p.classList.toggle('on', p.dataset.pane === tab.dataset.tab);
            });
        });
    });

    // Style tiles and the way back from Custom
    document.querySelectorAll('#gptpdf-sw-tiles .gptpdf-sw-tile').forEach(function(t) {
        t.addEventListener('click', function() {
            gptpdfSwSet(Object.assign({ look_base: t.dataset.style }, gptpdfShared.LOOK_STYLES[t.dataset.style]));
        });
    });
    document.getElementById('gptpdf-sw-state').addEventListener('click', function() {
        if(!gptpdfSwOpts || gptpdfShared.lookStyle(gptpdfSwOpts)) return;
        gptpdfSwSet(Object.assign({}, gptpdfShared.LOOK_STYLES[gptpdfSwOpts.look_base] || gptpdfShared.LOOK_STYLES.chat));
    });

    // Segments: which option each one sets
    const SEGMENT_KEYS = {
        'gptpdf-look-font': 'look_font', 'gptpdf-look-spacing': 'look_spacing', 'gptpdf-q-look': 'q_look',
        'gptpdf-page-size': 'page_size', 'gptpdf-orientation': 'orientation', 'gptpdf-margins': 'margins',
        'gptpdf-title-mode': 'title_mode', 'gptpdf-datetime': 'datetime_format', 'gptpdf-toc': 'toc'
    };
    document.querySelectorAll('#gptpdf-settings-modal .gptpdf-segment').forEach(function(seg) {
        seg.querySelectorAll('.gptpdf-seg-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const v = btn.dataset.value;
                if(seg.id === 'gptpdf-page-break') {
                    // One control for what were two (Page breaks + Single page).
                    gptpdfSwSet(v === 'long' ? { single_page: true, page_break: '' }
                                             : { single_page: false, page_break: v });
                    return;
                }
                const key = SEGMENT_KEYS[seg.id];
                if(!key) return;
                // Questions: Bubble, Heading — or Hidden (no_questions), the
                // menu's old "AI answers only" (1.2.9).
                if(key === 'q_look') {
                    gptpdfSwSet(v === 'hidden' ? { no_questions: true } : { q_look: v, no_questions: false });
                    return;
                }
                const change = {};
                change[key] = v;
                // Custom margins start from the margins the sheet has now.
                if(key === 'margins' && v === 'custom' && gptpdfSwOpts && gptpdfSwOpts.margins !== 'custom') {
                    const m = gptpdfMarginsPx(gptpdfSwOpts);
                    const mm = function(px) { return (Math.round(px / GPTPDF_MM)) + 'mm'; };
                    change.margin_top = mm(m.t); change.margin_bottom = mm(gptpdfSwOpts.page_numbers ? Math.min(m.b, 18 * GPTPDF_MM) : m.b);
                    change.margin_left = mm(m.l); change.margin_right = mm(m.r);
                }
                gptpdfSwSet(change);
            });
        });
    });

    // Size
    document.getElementById('gptpdf-look-size-dn').addEventListener('click', function() {
        if(gptpdfSwOpts) gptpdfSwSet({ look_size: Math.max(gptpdfShared.LOOK_SIZE_MIN, gptpdfSwOpts.look_size - 0.5) });
    });
    document.getElementById('gptpdf-look-size-up').addEventListener('click', function() {
        if(gptpdfSwOpts) gptpdfSwSet({ look_size: Math.min(gptpdfShared.LOOK_SIZE_MAX, gptpdfSwOpts.look_size + 0.5) });
    });

    // Question colours: the same nine as before (theme.js)
    const colors = document.getElementById('gptpdf-q-colors');
    Object.keys(EXPORT_THEMES).forEach(function(key) {
        const t = EXPORT_THEMES[key];
        const b = document.createElement('button');
        b.dataset.value = key;
        b.title = t.label + (key === 'none' ? ' — no background behind questions' : '');
        b.style.background = key === 'none' ? '#ffffff' : t.swatch;
        if(key === 'none') b.className = 'none';
        b.addEventListener('click', function() { gptpdfSwSet({ q_color: key }); });
        colors.appendChild(b);
    });

    // Sheet: light or dark
    document.querySelectorAll('#gptpdf-theme .gptpdf-theme-card').forEach(function(card) {
        card.addEventListener('click', function() { gptpdfSwSet({ theme: card.dataset.value }); });
    });

    // Custom margins, in mm
    document.querySelectorAll('#gptpdf-margins-custom input').forEach(function(inp) {
        inp.addEventListener('input', function() {
            const v = parseFloat(inp.value);
            if(!(v >= 0)) return;
            const change = {};
            change[inp.dataset.k] = Math.min(60, v) + 'mm';
            gptpdfSwSet(change);
        });
    });

    // Toggles
    document.getElementById('gptpdf-page-numbers').addEventListener('change', function() {
        gptpdfSwSet({ page_numbers: this.checked });
    });
    document.getElementById('gptpdf-source-link').addEventListener('change', function() {
        gptpdfSwSet({ source_link: this.checked });
    });

    // Reset: the Chat style and the standard paper and header
    document.getElementById('gptpdf-settings-reset').addEventListener('click', function() {
        if(!gptpdfSwOpts) return;
        const fresh = Object.assign({}, gptpdfShared.defaultOptions, gptpdfShared.LOOK_STYLES.chat,
            { look_base: 'chat', theme: 'light', no_questions: false, export_format: gptpdfSwOpts.export_format });
        gptpdfSwOpts = fresh;
        gptpdfSwSave();
        gptpdfSwRender();
    });

    window.addEventListener('resize', function() {
        if(overlay.style.display === 'flex') gptpdfSwRender();
    });
}
