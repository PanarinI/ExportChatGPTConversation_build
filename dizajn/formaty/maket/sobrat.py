#!/usr/bin/env python3
"""Собирает dizajn/formaty/maket-formaty.html — макет 1.2.9 «форматы в меню», одним файлом.

Основа — живой стенд tests/blockmode-live-stand.html (демо-чат про Лиссабон) с настоящими скриптами
расширения в порядке манифеста. Сверху — слой вариантов varianty.js + varianty.css: меню Export
перестраивается в вариант A–D, «AI answers only» переезжает в настройки (Questions · Hidden).
Всё вшито: скрипты, шрифты листа, картинка. Страница открывается из Finder в любом браузере, Safari тоже.

Адрес: ?v=A|B|C|D · &f=pdf|word|md · &dark · &show=menu|style|paper|header · &noq

Запуск из корня репо:
  python3 dizajn/formaty/maket/sobrat.py
"""
import base64
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
STAND = ROOT / 'tests' / 'blockmode-live-stand.html'
OUT = HERE.parent / 'maket-formaty.html'


def read(p):
    text = p.read_text(encoding='utf-8')
    # common.js пишет '</script>' в строках выгрузок; в строке JS «<\/script» значит то же самое,
    # а страницу не обрывает. В других местах (не в строке) такого текста быть не должно — проверяем.
    hits = [m.start() for m in re.finditer(r'</script', text, re.I)]
    for i in hits:
        line = text[text.rfind('\n', 0, i) + 1:text.find('\n', i)]
        if "'</script" not in line and "+ '</script" not in line:
            raise SystemExit(f'{p}: </script не в строке — встроить нельзя:\n{line.strip()[:160]}')
    return re.sub(r'</script', r'<\\/script', text, flags=re.I)


page = STAND.read_text(encoding='utf-8')

# Демо-чат всегда (витрина CWS снята с него же).
page = page.replace('/demo=1/.test(location.search)', 'true', 1)

# Шрифты листа — из файла, а не из соседней папки.
fonts = {f.name: base64.b64encode(f.read_bytes()).decode() for f in sorted((ROOT / 'fonts').glob('*.woff2'))}
assert "fetch('../fonts/' + msg.file)" in page, 'стенд поменялся: нет загрузки шрифтов'
page = page.replace("fetch('../fonts/' + msg.file)", 'fxFontFetch(msg.file)', 1)
FONT_JS = ('window.__fxFonts = ' + json.dumps(fonts) + ';\n'
           'function fxFontFetch(f) {\n'
           '    const b64 = window.__fxFonts[f];\n'
           '    if(!b64) return Promise.resolve({ ok: false });\n'
           '    const bin = atob(b64), u = new Uint8Array(bin.length);\n'
           '    for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);\n'
           '    return Promise.resolve({ ok: true, arrayBuffer: function() { return Promise.resolve(u.buffer); } });\n'
           '}\n')

pic = base64.b64encode((ROOT / 'tests' / 'fixtures' / 'demo-picture.jpg').read_bytes()).decode()
page = page.replace('fixtures/demo-picture.jpg', 'data:image/jpeg;base64,' + pic)

# Скрипты расширения — внутрь. KaTeX стенд грузит дважды; второй раз не нужен.
seen = set()


def inline(m):
    src = m.group(1)
    if src in seen:
        return ''
    seen.add(src)
    return '<script>/* ' + src + ' */\n' + read((STAND.parent / src).resolve()) + '\n</script>'


page, n = re.subn(r'<script src="(\.\./[^"]+)"></script>', inline, page)
assert n >= 13, f'встроено {n} скриптов — стенд поменялся'

page = page.replace('<title>«Select to export» — живой стенд на макете страницы</title>',
                    '<title>Макет 1.2.9 — форматы в меню</title>\n'
                    '<!-- Собран dizajn/formaty/maket/sobrat.py из tests/blockmode-live-stand.html — руками не править. -->', 1)
page = page.replace('<div id="app">', '<script>\n' + FONT_JS + '</script>\n<div id="app">', 1)
page = page.rstrip() + ('\n<style>\n' + read(HERE / 'varianty.css') + '\n</style>\n'
                        '<script>\n' + read(HERE / 'varianty.js') + '\n</script>\n')

OUT.write_text(page, encoding='utf-8')
print(OUT.relative_to(ROOT), f'{OUT.stat().st_size // 1024} КБ, скриптов {len(seen)}')
