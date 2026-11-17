#!/usr/bin/env python3
"""Собирает dizajn/animaciya/maket-c.html — макет человечка 1.2.8, клерк из прошлого, одним файлом.

Всё внутри: настоящие shared.js, templates.js, helpers.js, capture.js, человечек 1.2.7
(anim-1.2.7.js — копия «было») и новый (anim.js + stil.css из этой папки). Страница
открывается из Finder в любом браузере, Safari тоже: соседних файлов ей не нужно.

Каждая карточка — свой iframe: человечек один на страницу (gptpdfAnim — одна сцена).
Строки — 1.2.7 · в котелке · без шляпы; столбцы — наверх · вниз · книга.
  ?dark   — тёмная тема;
  ?manual — время вручную, для кадров в headless (виртуальное время не двигает кадры анимации).

Запуск из корня репо:
  python3 dizajn/animaciya/maket-c/sobrat.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = HERE.parent / 'maket-c.html'


def read(p):
    text = p.read_text(encoding='utf-8')
    if '</script' in text.lower():
        raise SystemExit(f'{p}: в тексте есть </script — встроить нельзя')
    return text


lib = '\n;\n'.join(read(ROOT / f) for f in ('shared.js', 'templates.js', 'helpers.js', 'capture.js'))
old = read(HERE / 'anim-1.2.7.js')
new = read(HERE / 'anim.js')
css = read(HERE / 'stil.css')

PAGE = r'''<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Человечек-клерк — макет 1.2.8</title>
<!--
  Собран dizajn/animaciya/maket-c/sobrat.py — не править руками, править исходники в maket-c/ и пересобрать.
  ?dark — тёмная тема; ?manual — время вручную (кадры в headless).
-->
<style>
:root { --bg:#f4f4f2; --text:#1f1f1e; --muted:#6b6a66; --line:rgba(0,0,0,.14); }
:root.dark { --bg:#171717; --text:#ececea; --muted:#a8a7a1; --line:rgba(255,255,255,.16); }
body { margin:0; padding:20px 16px; background:var(--bg); color:var(--text);
       font:14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
h1 { font-size:16px; font-weight:600; margin:0 0 12px; }
.tabs { display:flex; gap:6px; margin:0 0 14px; }
.tabs button { font:inherit; padding:5px 10px; border-radius:8px; border:0.5px solid var(--line);
               background:transparent; color:inherit; cursor:pointer; }
.tabs button.on { border-color:var(--text); font-weight:500; }
.grid { display:grid; grid-template-columns:auto repeat(3, 320px); gap:6px 10px; align-items:center; }
.grid .col { font-size:13px; color:var(--muted); padding-left:10px; }
.grid .row { font-size:13px; color:var(--muted); text-align:right; white-space:nowrap; }
.grid iframe { border:0; width:320px; height:178px; display:block; border-radius:12px; }
</style>
<h1>Человечек-клерк — макет 1.2.8</h1>
<div class="tabs"><button data-t="light">Светлая</button><button data-t="dark">Тёмная</button></div>
<div class="grid" id="grid"></div>
<script type="text/plain" id="lib">__LIB__</script>
<script type="text/plain" id="anim-old">__OLD__</script>
<script type="text/plain" id="anim-new">__NEW__</script>
<script type="text/plain" id="css-new">__CSS__</script>
<script>
(function() {
    const q = new URLSearchParams(location.search);
    const manual = q.get('manual') !== null;
    const text = id => document.getElementById(id).textContent;
    const ROWS = [['1.2.7', 'old'], ['Котелок', 'c-hat'], ['Без шляпы', 'c-hair']];
    const COLS = [['Наверх', 'up'], ['Вниз', 'down'], ['Книга', 'bind']];
    // The card alone: no button, no dimming, no Cancel (it comes and goes by step).
    const MOCK = '*,::before,::after{box-sizing:border-box}' +
        'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
        '#gptpdf-host{position:static!important;height:auto!important}' +
        '#gptpdf-host>*:not(#gptpdf-progress){display:none!important}' +
        '#gptpdf-cancel-loading{display:none!important}' +
        '#gptpdf-progress{position:static!important;margin:0;width:320px;box-shadow:none!important}';
    // What each column plays, over and over.
    const PLAYS = {
        up: 'showLoadingOverlay(); var p = 1;' +
            'function climb() { setHarvestProgress("Loading older messages… " + p + (p === 1 ? " part" : " parts")); p++; }' +
            'climb(); setInterval(climb, 900);',
        down: 'showLoadingOverlay(); var k = 1; setHarvestProgress("Reading 1 of 40 messages…");' +
            '(function next() { k = k >= 40 ? 1 : k + 1; setHarvestProgress("Reading " + k + " of 40 messages…");' +
            ' setTimeout(next, k % 10 === 0 ? 3500 : 650); })();',
        bind: '(function cycle() {' +
            ' showLoadingOverlay(); setHarvestProgress("Reading 1 of 40 messages…");' +
            ' for(var i = 2; i <= 6; i++) (function(i) { setTimeout(function() {' +
            '   setHarvestProgress("Reading " + i + " of 40 messages…"); }, (i - 1) * 450); })(i);' +
            ' setTimeout(function() {' +
            '   hideLoadingOverlay(); gptpdfExportStep("Preparing the PDF…"); var n = 0;' +
            '   var iv = setInterval(function() { n++;' +
            '     if(n <= 6) gptpdfExportImages("Adding images", n, 6); else { clearInterval(iv); gptpdfExportServer(40); } }, 700);' +
            '   setTimeout(function() { clearInterval(iv); hideLoadingOverlay(); gptpdfExportEnd(); cycle(); }, 13000);' +
            ' }, 2600);' +
            '})();'
    };
    const close = '</' + 'script>';
    function page(style, play, dark) {
        return '<!doctype html><meta charset="utf-8"><body style="margin:0;background:' +
            (dark ? '#2a2a2a' : '#fff') + '">' +
            (style !== 'old' ? '<script>document.documentElement.classList.add("' + style + '")' + close : '') +
            '<div id="gptpdf-host" class="gptpdf-block gptpdf-text-right"></div>' +
            '<script>' + text('lib') + close +
            '<script>' + text(style === 'old' ? 'anim-old' : 'anim-new') + close +
            '<script>document.head.insertAdjacentHTML("beforeend", "<style>" + UI_CSS + ' +
            JSON.stringify((style === 'old' ? '' : text('css-new')) + MOCK) + ' + "</style>");' +
            'document.getElementById("gptpdf-host").innerHTML = EXPORT_BUTTON_HTML;' +
            (manual ? 'gptpdfAnim._manual(true); setInterval(function() { gptpdfAnim._tick(33); }, 33);' : '') +
            PLAYS[play] + close;
    }
    function render(dark) {
        document.documentElement.classList.toggle('dark', dark);
        document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', (b.dataset.t === 'dark') === dark));
        const grid = document.getElementById('grid');
        grid.textContent = '';
        grid.appendChild(document.createElement('div'));
        COLS.forEach(c => {
            const h = document.createElement('div');
            h.className = 'col';
            h.textContent = c[0];
            grid.appendChild(h);
        });
        ROWS.forEach(r => {
            const h = document.createElement('div');
            h.className = 'row';
            h.textContent = r[0];
            grid.appendChild(h);
            COLS.forEach(c => {
                const f = document.createElement('iframe');
                f.title = r[0] + ' · ' + c[0];
                f.srcdoc = page(r[1], c[1], dark);
                grid.appendChild(f);
            });
        });
    }
    document.querySelectorAll('.tabs button').forEach(b =>
        b.addEventListener('click', () => render(b.dataset.t === 'dark')));
    render(q.get('dark') !== null);
})();
</script>
'''

html = (PAGE.replace('__LIB__', lib).replace('__OLD__', old)
            .replace('__NEW__', new).replace('__CSS__', css))
OUT.write_text(html, encoding='utf-8')
print(f'{OUT.relative_to(ROOT)}: {len(html.encode()) // 1024} КБ')
