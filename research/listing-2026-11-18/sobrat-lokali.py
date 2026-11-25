#!/usr/bin/env python3
"""Проверка переводов листинга и сборка _locales (краткое + полное; название не трогается). $0, без сети.

С 24.11 (после отказа Keyword Spam / Yellow Argon) — по тексту v8 и правилу Google (DECISIONS 24.11):
вход — teksty/v9.md (английский, утверждён автором 24.11) и perevody-v9/<код>.json ({"shortDesc", "storeDesc"}).
v9 = v8 с новым кратким: перед названием одно слово (канон 2.1:48, 53; слово автора 24.11 «переделай краткие»).
Прежний прогон (v5, perevody/) хранит git: коммит fddbc35.

Проверки на язык:
  · краткое ≤ 132; ключ из названия (часть до « - ») в кратком ровно 1 раз, перед ним ровно одно слово
    (vi — до двух слогов-слов; ja, zh, th — печатается для глаза);
  · ChatGPT пишется только «ChatGPT»: в кратком 1, в полном 1, на весь листинг (с названием) не больше 5;
  · вопросы — только в строках 📌, и без ChatGPT; строк-пунктов столько же, сколько в английском;
  · бренды и названия кнопок на месте; без кавычек и стоп-слов модерации; полное ≤ 5500;
  · повторы: слова от 4 букв, что встречаются на весь листинг больше 5 раз, печатаются как «⚠ повтор» — служебные
    (артикли, предлоги, местоимения) допустимы, слова продукта — нет. Для письма без пробелов (ja, zh, th) не считается.
Без флагов — только проверка. --only de,fr — только эти языки. --zapisat — пишет краткое и полное в
../../_locales/<код>/messages.json (en — из v8), только если у языка нет замечаний (повторы — не замечание).
Запуск: python3 -I sobrat-lokali.py [--only de,fr] [--zapisat]
"""
import html, json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
LOC = os.path.normpath(os.path.join(HERE, '..', '..', '_locales'))
SRC = os.path.join(HERE, 'teksty', 'v9.md')
DIR = os.path.join(HERE, 'perevody-v9')
MARKS = ('📦', '⚡', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '📄', '➤', '📝', '🤖', '📋', '✂️', '⚙️', '1.', '2.', '3.', '4.', '5.',
         '💡', '•', '🔒', '❓', '📌', '🎯')
KEEP = ['ChatGPT', 'PDF', 'Word', 'Google Docs', 'Claude', 'Notion', 'Obsidian', 'Markdown', 'Whole chat', 'Pick blocks',
        'What goes in']
QUOTES = '"“”„«»「」『』'
BANNED = re.compile(r'\b(free|best|premium|recommended)\b|#1', re.I)
QMARK = re.compile('[?？؟]')
NOSPACE = {'ja', 'zh_CN', 'zh_TW', 'th'}
# Где название пишет бренд по-своему, бренд в любом написании считается одним брендом (24.11: иначе проверка
# требовала латинское ChatGPT в кратком сверх названия — бренд дважды в одном предложении). Берётся из самого названия.
LOCAL_BRAND = {'bn': lambda k: k.split()[0], 'hi': lambda k: k.split()[0], 'mr': lambda k: k.split()[0],
               'te': lambda k: k.split()[0], 'ta': lambda k: k.split()[0], 'ml': lambda k: ' '.join(k.split()[:2]),
               'ja': lambda k: k.split('の')[0], 'he': lambda k: k.split()[-1]}

src = open(SRC, encoding='utf-8').read()
parts = dict(re.findall(r'<!-- (NAME|SHORT|FULL) -->\n(.*?)(?=\n<!-- |\Z)', src, re.S))
EN = {'shortDesc': parts['SHORT'].strip(), 'storeDesc': parts['FULL'].strip()}


def strip_marks(line):
    return line.lstrip('‏‎')


def marker_lines(t):
    return sum(1 for line in t.split('\n') if strip_marks(line).startswith(MARKS))


def key_phrase(name):
    return html.unescape(name).split(' - ')[0].strip()


def check(code, t, name):
    probs, notes = [], []
    s, f = t['shortDesc'], t['storeDesc']
    if len(s) > 132:
        probs.append(f'краткое {len(s)} > 132')
    kp = key_phrase(name)
    if code != 'en' and s.lower().count(kp.lower()) != 1:
        probs.append(f'имя «{kp}» в кратком ×{s.lower().count(kp.lower())}')
    local = LOCAL_BRAND[code](kp) if code in LOCAL_BRAND else ''
    assert not local or local in kp, (code, local)
    extra = local if local and 'chatgpt' not in local.lower() else ''

    def brand(x):
        return len(re.findall('chatgpt', x, re.I)) + (x.count(extra) if extra else 0)

    i = s.lower().find(kp.lower())
    before = [w for w in s[:i].split() if w.strip(':,–—-')] if i >= 0 else []
    if code in NOSPACE:
        notes.append('до названия: ' + s[:i].strip())
    elif i >= 0 and not (len(before) == 1 or (code == 'vi' and len(before) == 2)):
        probs.append(f'до названия слов {len(before)}: ' + s[:i].strip())
    g = [brand(x) for x in (html.unescape(name), s, f)]
    if g[1] != 1 or g[2] != 1 or sum(g) > 5:
        probs.append(f'бренд: имя {g[0]} · краткое {g[1]} · полное {g[2]} (нужно 1 и 1, всего ≤5)')
    odd = sorted(set(m for m in re.findall('chatgpt', (s + '\n' + f).replace(kp, ''), re.I) if m != 'ChatGPT'))
    if odd:
        probs.append('написание: ' + ', '.join(odd))
    for line in (s + '\n' + f).split('\n'):
        if QMARK.search(line) and not strip_marks(line).startswith('📌'):
            probs.append('вопрос не в строке 📌: ' + line[:50])
        if strip_marks(line).startswith('📌') and brand(line):
            probs.append('бренд в вопросе')
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
    if code not in NOSPACE:
        words = [w for w in re.findall(r'\w+', '\n'.join([html.unescape(name), s, f]).lower())
                 if len(w) >= 4 and not w.isdigit()]
        notes += [f'{w}×{n}' for w, n in Counter(words).most_common() if n > 5]
    return probs, notes


only = None
if '--only' in sys.argv:
    only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
codes = [c for c in sorted(os.listdir(LOC)) if not only or c in only]
ok = bad = 0
for code in codes:
    path = os.path.join(LOC, code, 'messages.json')
    m = json.load(open(path, encoding='utf-8'))
    name = m['appName']['message']
    if code == 'en':
        t = EN
    else:
        p = os.path.join(DIR, code + '.json')
        if not os.path.exists(p):
            print(f'{code:6} — нет перевода')
            bad += 1
            continue
        t = json.load(open(p, encoding='utf-8'))
    probs, notes = check(code, t, name)
    line = f'{code:6} краткое {len(t["shortDesc"]):>4} · полное {len(t["storeDesc"]):>5} · ' + ('ок' if not probs else '✗ ' + '; '.join(probs))
    if notes:
        line += ' · ⚠ повтор: ' + ', '.join(notes)
    print(line)
    if probs:
        bad += 1
        continue
    ok += 1
    if '--zapisat' in sys.argv:
        m['shortDesc']['message'] = t['shortDesc']
        m['storeDesc']['message'] = t['storeDesc']
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(m, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
print(f'\nбез замечаний {ok} из {len(codes)}' + (' · записаны в _locales' if '--zapisat' in sys.argv else
                                               ' · ничего не записано (флаг --zapisat)'))
