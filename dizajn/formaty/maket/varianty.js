/* Макет 1.2.9 «форматы в меню» — слой поверх живого стенда (tests/blockmode-live-stand.html).
 *
 * Меню Export перестраивается в вариант A–D. Кнопка Export, лист-миниатюра, окно настроек и
 * «Select to export» — настоящие (код расширения), подменена только раскладка меню.
 * Выгрузки в Word и Markdown ещё нет: на них макет показывает подсказку, что скачалось бы.
 *
 *   ?v=0|A|B|C|D   — вариант (0 — меню как сейчас; по умолчанию A)
 *   ?f=pdf|word|md — выбранный формат (A, C, D)
 *   ?dark          — тёмная тема ChatGPT
 *   ?show=menu|style|paper|header — открыть меню или окно настроек (это делает сам стенд)
 *   ?noq           — вопросы скрыты (бывшая «AI answers only», теперь в настройках)
 *   ?kadr          — для снимков: без плавных переходов
 */
(function() {
'use strict';
const Q = new URLSearchParams(location.search);

const VARIANTS = {
    0: ['Сейчас, 1.2.8',
        'Меню как в магазине сейчас: Select all · AI answers only · Select to export. Для сравнения.'],
    A: ['Формат — выбор в меню',
        'Три плитки выбирают, какой файл даст кнопка Export; значок на кнопке показывает выбранный. «Select to export» — одной строкой.'],
    B: ['Каждый формат — своя кнопка',
        'Строка сразу скачивает файл своего формата. Кнопка Export всегда даёт PDF. Подписи — по две строки, как сейчас.'],
    C: ['Три листа',
        'Формат выбирают по картинке файла: страница PDF, страница Word, текст Markdown. Щелчок по выбранному листу — настройки.'],
    D: ['Формат — в настройках',
        'В меню остаются лист и «Select to export». Формат выбирают в окне настроек, над закладками.']
};
let V = (Q.get('v') || 'A').toUpperCase();
if(!VARIANTS[V]) V = 'A';
const NOW = V === '0';   // the menu as it ships: nothing is rebuilt
const FORMATS = {
    pdf:  { name: 'PDF', ext: '.pdf', color: '#E5322D', label: 'PDF', fs: 7.2,
            hint: 'Pages as they print — to keep, send or print.',
            desc: 'Pages to keep, send or print' },
    word: { name: 'Word', ext: '.docx', color: '#2B5797', label: 'W', fs: 9,
            hint: 'A document to edit — opens in Word, Google Docs or Pages.',
            desc: 'To edit in Word or Google Docs' },
    md:   { name: 'Markdown', ext: '.md', color: '#3D444D', label: 'MD', fs: 7.4,
            hint: 'Plain text with headings — for Obsidian, Notion or another AI.',
            desc: 'For Obsidian, Notion or another AI' }
};
let FMT = FORMATS[Q.get('f')] ? Q.get('f') : 'pdf';
if(V === 'B' || NOW) FMT = 'pdf';   // in B the format is not remembered: each row downloads at once

if(Q.has('dark')) document.documentElement.classList.add('dark', 'fx-dark');
// ?kadr — для кадров в headless: без плавных переходов (иначе снимок ловит кнопку на полпути)
if(Q.has('kadr')) document.head.insertAdjacentHTML('beforeend', '<style>*,*::before,*::after{transition:none!important}</style>');
if(Q.has('noq')) {
    chrome.storage.sync.get('options', function(r) {
        chrome.storage.sync.set({ options: Object.assign({}, r.options || {}, { no_questions: true }) });
    });
}

// ── a file icon: page, folded corner, coloured band with the format's letters ──
function fileIcon(f, w, h) {
    const F = FORMATS[f];
    return '<svg class="fx-ico" width="' + w + '" height="' + h + '" viewBox="0 0 24 28" aria-hidden="true">' +
        '<path class="pg" d="M5.5 1.5h9.5l6.5 6.5v16.5a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-21a2 2 0 0 1 2-2z" stroke-width="1.2"/>' +
        '<path class="fd" d="M15 1.5v4.5a2 2 0 0 0 2 2h4.5" stroke-width="1.2"/>' +
        '<rect x="0.6" y="13.2" width="18" height="9.4" rx="2" fill="' + F.color + '"/>' +
        '<text x="9.6" y="20.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="' + F.fs +
        '" font-weight="700" fill="#fff">' + F.label + '</text></svg>';
}
function tip(f) {
    const F = FORMATS[f];
    return F.name + ' (' + F.ext + ') — ' + F.hint.replace(/^[^—]*— /, '');
}

// ── the first lines of this chat as Markdown (the demo chat of the stand) ──
const MD_TEXT =
    '<span class="h"># Lisbon trip: 3-day plan</span>\n\n' +
    '<span class="m">**You:**</span> Plan a 3-day trip to Lisbon for two, mid-range budget.\n\n' +
    '<span class="h">### Your 3-day Lisbon plan</span>\n\n' +
    'A relaxed pace: one big sight each morning, free evenings.\n\n' +
    '<span class="q">| Day | Morning | Afternoon | Evening |\n|---|---|---|---|</span>\n' +
    '<span class="q">|</span> 1 <span class="q">|</span> Alfama walk <span class="q">|</span> São Jorge Castle <span class="q">|</span> Fado dinner <span class="q">|</span>\n' +
    '<span class="q">|</span> 2 <span class="q">|</span> Belém Tower <span class="q">|</span> Jerónimos Monastery <span class="q">|</span> Pastéis de Belém <span class="q">|</span>\n' +
    '<span class="q">|</span> 3 <span class="q">|</span> Train to Sintra <span class="q">|</span> Pena Palace <span class="q">|</span> Sunset at a miradouro <span class="q">|</span>\n\n' +
    '<span class="m">-</span> Get a Viva Viagem card for trams and the metro.\n' +
    '<span class="m">-</span> Book Pena Palace tickets online a few days ahead.\n\n' +
    '<span class="m">**You:**</span> Split a €900 budget across the three days in Python.\n\n' +
    'Here is a small helper that splits the budget by weight:\n\n' +
    '<span class="q">```python</span>\ndef split_budget(total, weights):\n    s = sum(weights)\n' +
    '    return [round(total * w / s, 2) for w in weights]\n<span class="q">```</span>\n';
function mdSheet(width) {
    return '<div class="fx-md"><pre style="transform:scale(' + (width / 420).toFixed(4) + ')">' + MD_TEXT + '</pre></div>';
}

// ── toast: what would really happen ──
let toastTimer = 0;
function toast(text) {
    let t = document.getElementById('fx-toast');
    if(!t) { t = document.createElement('div'); t.id = 'fx-toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { t.classList.remove('on'); }, 3600);
}
function wouldDownload(f) {
    toast('Макет: здесь скачался бы файл ' + FORMATS[f].name + ' (' + FORMATS[f].ext + '). Выгрузки в ' +
        FORMATS[f].name + ' ещё нет — сначала выбираем вариант меню.');
}

function options(cb) { gptpdfShared.getOptions(cb); }
function closeMenu() { document.getElementById('gptpdf-extra-btns').classList.add('gptpdf-hidden'); }

// ── the bar over the chat: which variant, which theme ──
function topBar() {
    const top = document.getElementById('page-top');
    if(!top) return;
    const link = function(p) {
        const q = new URLSearchParams(location.search);
        Object.keys(p).forEach(function(k) { if(p[k] === null) q.delete(k); else q.set(k, p[k]); });
        q.delete('show');
        return '?' + q.toString().replace(/=(&|$)/g, '$1');
    };
    top.className = 'fx-top';
    top.innerHTML = '<b>Макет 1.2.9 · форматы</b>' +
        '<span class="fx-vs">' + Object.keys(VARIANTS).map(function(k) {
            return '<a href="' + link({ v: k }) + '" class="' + (k === V ? 'on' : '') + '" title="' + VARIANTS[k][0] + '">' +
                (k === '0' ? 'сейчас' : k) + '</a>';
        }).join('') + '</span>' +
        '<span class="fx-th"><a href="' + link({ dark: null }) + '" class="' + (Q.has('dark') ? '' : 'on') + '">светлая</a>' +
        '<a href="' + link({ dark: '' }) + '" class="' + (Q.has('dark') ? 'on' : '') + '">тёмная</a></span>' +
        '<div class="fx-vnote"><b>' + (NOW ? '' : V + ' · ') + VARIANTS[V][0] + '.</b> ' + VARIANTS[V][1] +
        ' Меню — стрелка ▾ у кнопки Export справа вверху.</div>';
}

// ── the Export button shows the file it gives (A, C, D) ──
function paintButton() {
    if(V === 'B' || NOW) return;
    const left = document.getElementById('gptpdf-btn-left');
    if(!left) return;
    const img = left.querySelector('img');
    if(img) img.style.display = 'none';
    let ico = left.querySelector('.fx-btn-ico');
    if(!ico) {
        ico = document.createElement('span');
        ico.className = 'fx-btn-ico';
        left.insertBefore(ico, left.firstChild);
    }
    ico.innerHTML = fileIcon(FMT, 15, 18);
    left.title = 'Export as ' + FORMATS[FMT].name + ' (' + FORMATS[FMT].ext + ')';
}

// ── the menu sheet: page 1, or the Markdown text ──
function paintSheetEntry() {
    const wrap = document.querySelector('#gptpdf-options .gptpdf-sheet-wrap');
    if(!wrap) return;
    let md = wrap.querySelector('.fx-md');
    if(FMT === 'md') {
        if(!md) wrap.insertAdjacentHTML('beforeend', mdSheet(92));
        md = wrap.querySelector('.fx-md');
        md.style.cssText = 'position:absolute;left:0;top:0;width:92px;height:130px;z-index:0';
        const pill = wrap.querySelector('.gptpdf-sheet-pill');
        if(pill) pill.style.zIndex = 1;
    } else if(md) {
        md.remove();
    }
    const cap = document.querySelector('#gptpdf-options .gptpdf-sheet-cap');
    if(!cap) return;
    options(function(o) {
        const style = gptpdfShared.lookStyle(o);
        const styleName = style ? gptpdfShared.LOOK_NAMES[style] : 'Custom';
        const paper = o.page_size === 'letter' ? 'Letter' : 'A4';
        if(FMT === 'md') cap.innerHTML = '<b>Plain text</b><br>Settings&nbsp;›';
        else if(V === 'D') cap.innerHTML = '<b>' + FORMATS[FMT].name + ' · ' + styleName + '</b><br>' + paper + ' · Settings&nbsp;›';
        else cap.innerHTML = '<b>' + styleName + '</b><br>' + paper + ' · Settings&nbsp;›';
    });
}

function setFormat(f) {
    FMT = f;
    document.querySelectorAll('[data-fx-f]').forEach(function(el) { el.classList.toggle('on', el.dataset.fxF === f); });
    const hint = document.getElementById('fx-hint');
    if(hint) hint.textContent = FORMATS[f].hint;
    paintButton();
    paintSheetEntry();
    paintCaptionC();
    if(document.getElementById('gptpdf-settings-overlay').style.display === 'flex' && typeof gptpdfSwRender === 'function') gptpdfSwRender();
}

// ── C: three sheets ──
function paintSheetsC() {
    if(V !== 'C') return;
    options(function(o) {
        ['pdf', 'word'].forEach(function(f) {
            const fr = document.getElementById('fx-sh-' + f);
            try { gptpdfSheetSourceCache = null; } catch(e) { /* older preview.js */ }
            try { gptpdfDrawSheet(fr, o, { width: 92, tiny: true }); } catch(e) { console.log('[fx] sheet', e); }
        });
        document.getElementById('fx-sh-md').innerHTML = mdSheet(92);
    });
    paintCaptionC();
}
function paintCaptionC() {
    const cap = document.getElementById('fx-c-cap');
    if(!cap) return;
    options(function(o) {
        const style = gptpdfShared.lookStyle(o);
        const what = FMT === 'md' ? '<b>Markdown</b> · plain text'
            : '<b>' + FORMATS[FMT].name + '</b> · ' + (style ? gptpdfShared.LOOK_NAMES[style] : 'Custom') + ' · ' +
              (o.page_size === 'letter' ? 'Letter' : 'A4');
        cap.innerHTML = what + ' · <a id="fx-c-settings">Settings ›</a>';
        document.getElementById('fx-c-settings').onclick = function(e) { e.preventDefault(); openSettings(); };
    });
}
function openSettings() {
    closeMenu();
    gptpdfOpenSettings();
}

// ── rebuild the menu once the extension has put it on the page ──
function patchMenu() {
    const menu = document.getElementById('gptpdf-extra-btns');
    const main = menu.querySelector('.gptpdf-menu-main');
    const actions = menu.querySelector('.gptpdf-menu-actions');
    const entry = document.getElementById('gptpdf-options');
    const blocks = document.getElementById('gptpdf-blocks');
    // «Select all» — то, что Export делает и так; «AI answers only» — переехала в настройки (Questions · Hidden)
    document.getElementById('gptpdf-everything').style.display = 'none';
    document.getElementById('gptpdf-ai-only').style.display = 'none';
    blocks.title = 'Pick the blocks you want in the file — the rest stays out';

    if(V === 'A') {
        actions.insertAdjacentHTML('afterbegin',
            '<div class="fx-label">Save as</div><div class="fx-tiles">' +
            Object.keys(FORMATS).map(function(f) {
                return '<button type="button" class="fx-tile" data-fx-f="' + f + '" title="' + tip(f) + '">' +
                    fileIcon(f, 28, 33) + '<span>' + FORMATS[f].name + '</span></button>';
            }).join('') + '</div><div class="fx-hint" id="fx-hint"></div><div class="fx-sep"></div>');
        blocks.classList.add('fx-oneline');
        actions.querySelectorAll('.fx-tile').forEach(function(t) {
            t.addEventListener('click', function() { setFormat(t.dataset.fxF); });
        });
    }

    if(V === 'B') {
        actions.insertAdjacentHTML('afterbegin',
            '<div class="fx-label">Download as</div>' +
            Object.keys(FORMATS).map(function(f) {
                return '<button type="button" class="gptpdf-extra-btn fx-row" data-fx-row="' + f + '" title="' + tip(f) + '">' +
                    '<span class="gptpdf-menu-icon">' + fileIcon(f, 24, 28) + '</span>' +
                    '<span class="gptpdf-menu-text"><span class="gptpdf-menu-title">' + FORMATS[f].name + '</span>' +
                    '<span class="gptpdf-menu-desc">' + FORMATS[f].desc + '</span></span>' +
                    '<span class="fx-dl" aria-hidden="true">↓</span></button>';
            }).join('') + '<div class="fx-sep"></div>');
        actions.querySelectorAll('.fx-row').forEach(function(r) {
            r.addEventListener('click', function() {
                closeMenu();
                if(r.dataset.fxRow === 'pdf') document.getElementById('gptpdf-convert-main').click();
                else wouldDownload(r.dataset.fxRow);
            });
        });
    }

    if(V === 'C') {
        menu.classList.add('fx-c');
        entry.style.display = 'none';
        main.insertAdjacentHTML('afterbegin',
            '<div class="fx-sheets">' + Object.keys(FORMATS).map(function(f) {
                return '<button type="button" class="fx-sh" data-fx-f="' + f + '" title="' + tip(f) + '">' +
                    '<span class="fx-sh-wrap"><span class="fx-sh-frame" id="fx-sh-' + f + '"></span>' +
                    '<span class="fx-sh-pill">Settings</span></span>' +
                    '<span class="fx-sh-name">' + fileIcon(f, 13, 15) + FORMATS[f].name + '</span></button>';
            }).join('') + '</div><div class="fx-c-cap" id="fx-c-cap"></div><div class="fx-sep"></div>');
        blocks.classList.add('fx-oneline');
        main.querySelectorAll('.fx-sh').forEach(function(s) {
            s.addEventListener('click', function() {
                if(s.dataset.fxF === FMT) openSettings();
                else setFormat(s.dataset.fxF);
            });
        });
    }

    if(V === 'D') {
        menu.classList.add('fx-d');
        actions.insertAdjacentHTML('afterbegin', '<div style="flex:1"></div>');
        actions.style.justifyContent = 'center';
        patchSettingsFileRow();
    }

    // Opening the menu: the extension draws page 1 first, then the variant adds its part.
    document.getElementById('gptpdf-more').addEventListener('click', function() {
        setTimeout(function() { paintSheetEntry(); paintSheetsC(); }, 0);
    });
    setFormat(FMT);
}

// ── D: the format in the Settings window, above the tabs ──
function patchSettingsFileRow() {
    const ctrl = document.querySelector('#gptpdf-settings-modal .gptpdf-sw-ctrl');
    if(!ctrl || ctrl.querySelector('.fx-file')) return;
    ctrl.insertAdjacentHTML('afterbegin',
        '<div class="fx-file"><span class="fx-label">File</span><div class="fx-tiles">' +
        Object.keys(FORMATS).map(function(f) {
            return '<button type="button" class="fx-tile" data-fx-f="' + f + '" title="' + tip(f) + '">' +
                fileIcon(f, 18, 21) + '<span>' + FORMATS[f].name + '</span></button>';
        }).join('') + '</div></div>');
    ctrl.querySelectorAll('.fx-file .fx-tile').forEach(function(t) {
        t.addEventListener('click', function() { setFormat(t.dataset.fxF); });
    });
}

// ── Settings: «AI answers only» becomes Questions · Hidden; Markdown dims what does not apply ──
function patchSettings() {
    const seg = document.getElementById('gptpdf-q-look');
    if(seg && !seg.querySelector('[data-value="hidden"]')) {
        seg.insertAdjacentHTML('beforeend',
            '<button class="gptpdf-seg-btn" data-value="hidden" title="Only the AI answers — your questions stay out of the file">' +
            '<svg width="30" height="18" viewBox="0 0 30 18"><path d="M2 4.5h26M2 9h26M2 13.5h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".55"/></svg>Hidden</button>');
        const setNoQ = function(v) {
            chrome.storage.sync.get('options', function(r) {
                chrome.storage.sync.set({ options: Object.assign({}, r.options || {}, { no_questions: v }) }, function() {
                    if(gptpdfSwOpts) gptpdfSwOpts.no_questions = v;
                    gptpdfSwRender();
                });
            });
        };
        seg.querySelectorAll('.gptpdf-seg-btn').forEach(function(b) {
            b.addEventListener('click', function() { setNoQ(b.dataset.value === 'hidden'); });
        });
    }
    const orig = window.gptpdfSwRender;
    window.gptpdfSwRender = function() {
        orig.apply(this, arguments);
        afterRender();
    };
}

function afterRender() {
    const o = gptpdfSwOpts;   // settings.js: a top-level let — shared by name, not a window property
    if(!o) return;
    // Questions · Hidden
    const seg = document.getElementById('gptpdf-q-look');
    if(seg && o.no_questions) {
        seg.querySelectorAll('.gptpdf-seg-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.value === 'hidden'); });
    }
    const colors = document.getElementById('gptpdf-q-colors');
    const colorRow = colors && colors.closest('.gptpdf-sw-row');
    if(colorRow) {
        colorRow.classList.toggle('fx-off', !!o.no_questions);
        colorRow.title = o.no_questions ? 'Questions are hidden — there is nothing to colour' : '';
    }

    // The format: what applies to Markdown and Word
    const modal = document.getElementById('gptpdf-settings-modal');
    const md = FMT === 'md';
    const styleTab = modal.querySelector('.gptpdf-sw-tab[data-tab="style"]');
    const paperTab = modal.querySelector('.gptpdf-sw-tab[data-tab="paper"]');
    paperTab.classList.toggle('fx-off', md);
    paperTab.title = md ? 'Markdown is plain text — it has no paper or pages' : 'Paper size, sheet colour, margins, pages';
    const stylePane = modal.querySelector('.gptpdf-sw-pane[data-pane="style"]');
    let note = stylePane.querySelector('.fx-md-note');
    if(md && !note) {
        stylePane.insertAdjacentHTML('afterbegin', '<div class="fx-md-note">Markdown is plain text: fonts, sizes and colours ' +
            'stay with the app you open it in. What still applies: <b>Questions</b> here and the <b>Header</b> tab.</div>');
    } else if(!md && note) {
        note.remove();
    }
    stylePane.querySelectorAll('.gptpdf-sw-sec, .gptpdf-sw-tiles, .gptpdf-sw-row').forEach(function(el) {
        const keep = el.querySelector('#gptpdf-q-look');
        if(!keep) el.classList.toggle('fx-off', md || (el === colorRow && !!o.no_questions));
    });
    if(md && paperTab.classList.contains('on')) styleTab.click();

    // The big sheet: page 1, or the Markdown text
    const box = document.getElementById('gptpdf-sw-sheetbox');
    box.style.position = 'relative';
    let over = box.querySelector('.fx-sw-md');
    if(over) over.remove();
    if(md) {
        // the text page stands where the PDF page stood, same size, and hides it
        const w = Math.round(Math.min(box.clientWidth - 8, (box.clientHeight - 4) / 1.4142));
        box.insertAdjacentHTML('beforeend', '<div class="fx-sw-md">' + mdSheet(w) + '</div>');
        const page = box.querySelector('.fx-sw-md .fx-md');
        page.style.width = w + 'px';
        page.style.height = Math.round(w * 1.4142) + 'px';
    }
    const cap = document.getElementById('gptpdf-sw-cap');
    if(cap && md) cap.textContent = 'Markdown · the first lines of this chat as text';
    else if(cap && FMT === 'word') cap.textContent = cap.textContent.replace(/^/, 'Word · ');
    if(V === 'D') {
        modal.querySelectorAll('.fx-file .fx-tile').forEach(function(t) { t.classList.toggle('on', t.dataset.fxF === FMT); });
    }
}

// ── main button with Word or Markdown chosen: say what would download ──
function guardExport() {
    const btn = document.getElementById('gptpdf-convert-main');
    btn.addEventListener('click', function(e) {
        if(V === 'B' || FMT === 'pdf') return;
        if(e.target.closest('#gptpdf-more')) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        wouldDownload(FMT);
    }, true);
}

topBar();
(function wait(n) {
    const menu = document.getElementById('gptpdf-extra-btns');
    if(!menu || typeof gptpdfSwRender !== 'function') {
        if(n < 400) setTimeout(function() { wait(n + 1); }, 25);
        return;
    }
    if(NOW) return;
    patchSettings();
    patchMenu();
    guardExport();
})(0);
})();
