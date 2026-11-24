#!/usr/bin/env python3
"""Проверка переводов листинга и сборка _locales (краткое + полное; название не трогается). $0, без сети.

Вход: teksty/v5.md (английский, утверждён автором 19.11) и perevody/<код>.json ({"shortDesc", "storeDesc"}).
Без флагов — только проверка, таблица по всем языкам. С --zapisat — пишет shortDesc и storeDesc в
../../_locales/<код>/messages.json (appName остаётся как был), en — из v5. Прежние тексты хранит git.
Запуск: python3 -I sobrat-lokali.py [--zapisat]
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOC = os.path.normpath(os.path.join(HERE, '..', '..', '_locales'))
MARKS = ('📦', '⚡', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '📄', '➤', '📝', '🤖', '📋', '✂️', '⚙️', '1.', '2.', '3.', '4.', '5.',
         '💡', '•', '🔒', '❓', '📌', '🎯')
KEEP = ['ChatGPT', 'PDF', 'Word', 'Google Docs', 'Claude', 'Notion', 'Obsidian', 'Markdown', 'Whole chat', 'Pick blocks',
        'What goes in']
QUOTES = '"“”„«»「」『』'
BANNED = re.compile(r'\b(free|best|premium|recommended)\b|#1', re.I)

src = open(os.path.join(HERE, 'teksty', 'v5.md')).read()
parts = dict(re.findall(r'<!-- (NAME|SHORT|FULL) -->\n(.*?)(?=\n<!-- |\Z)', src, re.S))
EN = {'shortDesc': parts['SHORT'].strip(), 'storeDesc': parts['FULL'].strip()}


def marker_lines(t):
    return sum(1 for line in t.split('\n') if line.lstrip('‏‎').startswith(MARKS))


def key_phrase(name):
    return html.unescape(name).split(' - ')[0].strip()  # he: в имени живёт &#39;


def check(code, t, name):
    probs = []
    s, f = t['shortDesc'], t['storeDesc']
    if len(s) > 132:
        probs.append(f'краткое {len(s)} > 132')
    kp = key_phrase(name)
    n = s.lower().count(kp.lower())
    if code != 'en' and n != 1:
        probs.append(f'имя «{kp}» в кратком ×{n}')
    if marker_lines(f) != marker_lines(EN['storeDesc']):
        probs.append(f'строк-пунктов {marker_lines(f)} ≠ {marker_lines(EN["storeDesc"])}')
    missing = [k for k in KEEP if k not in f]
    if missing:
        probs.append('нет: ' + ', '.join(missing))
    if any(q in s + f for q in QUOTES):
        probs.append('кавычки')
    if BANNED.search(s + f):
        probs.append('стоп-слово: ' + BANNED.search(s + f).group(0))
    if len(f) > 5500:
        probs.append(f'полное {len(f)} > 5500')
    return probs


codes = sorted(os.listdir(LOC))
ok = bad = 0
rows = []
for code in codes:
    path = os.path.join(LOC, code, 'messages.json')
    m = json.load(open(path))
    name = m['appName']['message']
    if code == 'en':
        t = EN
    else:
        p = os.path.join(HERE, 'perevody', code + '.json')
        if not os.path.exists(p):
            rows.append((code, '—', '—', ['нет перевода']))
            bad += 1
            continue
        t = json.load(open(p))
    probs = check(code, t, name)
    rows.append((code, len(t['shortDesc']), len(t['storeDesc']), probs))
    if probs:
        bad += 1
    else:
        ok += 1
    if '--zapisat' in sys.argv and not probs:
        m['shortDesc']['message'] = t['shortDesc']
        m['storeDesc']['message'] = t['storeDesc']
        if '--imena' in sys.argv:  # только по слову автора: две поломки в живых названиях
            m['appName']['message'] = html.unescape(name).replace('Expport', 'Export')
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(m, fh, ensure_ascii=False, indent=2)
            fh.write('\n')

for code, s, f, probs in rows:
    print(f'{code:6} краткое {s!s:>4} · полное {f!s:>5} · ' + ('ок' if not probs else '⚠ ' + '; '.join(probs)))
print(f'\nбез замечаний {ok} из {len(codes)}' + (' · записаны в _locales' if '--zapisat' in sys.argv else
                                               ' · ничего не записано (флаг --zapisat)'))
