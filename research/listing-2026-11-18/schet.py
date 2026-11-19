#!/usr/bin/env python3
"""Локальная проверка черновика листинга до платной (Text Checker). $0, без сети.

Вход: teksty/vN.md с разделами <!-- NAME --> · <!-- SHORT --> · <!-- FULL -->.
Считает: длины; частоту слов по склейке «название + краткое + полное» (так канон отдаёт текст в Text Checker);
вхождения каждого ключа Main/Extra из kluchi.csv — точной фразой, в том числе внутри длинных (канон 2.1.4);
правила краткого (ключ названия 1 раз, главное слово ≤3, прочие ≤2); стоп-слова модерации; кавычки; ≥4 одинаковых
ключа в одном абзаце. Запуск: python3 -I schet.py teksty/v1.md
"""
import csv, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
NAME_KEY = 'export chatgpt conversation'
STOP = {'best', 'recommended', 'premium', 'free', '#1'}
SMALL = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'in', 'on', 'for', 'it', 'is', 'you', 'your', 'with', 'as', 'at', 'by',
         'from', 'that', 'this', 'be', 'are', 'its', 'so', 'if', 'how', 'can', 'do', 'not', 'no', 'one', 'there', 'each'}


def words(s):
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", s.lower())


def norm(s):
    return ' ' + ' '.join(words(s)) + ' '


src = open(sys.argv[1]).read()
parts = dict(re.findall(r'<!-- (NAME|SHORT|FULL) -->\n(.*?)(?=\n<!-- |\Z)', src, re.S))
name, short, full = (parts[k].strip() for k in ('NAME', 'SHORT', 'FULL'))
whole = '\n'.join([name, short, full])
W = words(whole)

print(f'название {len(name)} · краткое {len(short)}/132 · полное {len(full)} знаков (цель ~4500) · слов всего {len(W)}')
print('\nчастые слова (всего текста):')
cnt = Counter(W)
for w, n in cnt.most_common(18):
    mark = '  ⚠ ≥3%' if n / len(W) >= 0.03 and w not in SMALL else ''
    print(f'  {w:14} {n:3}  {100 * n / len(W):4.1f}%{mark}')

sw = Counter(words(short))
print('\nкраткое:', 'ключ названия ×%d' % norm(short).count(norm(NAME_KEY)),
      '· не первым словом' if not norm(short).startswith(norm(NAME_KEY)) else '· ⚠ первым словом')
over = [f'{w}×{n}' for w, n in sw.items() if (n > 3 if w in ('chatgpt', 'export') else n > 2) and w not in SMALL]
print('  повторы сверх нормы:', ', '.join(over) or 'нет')

bad = [w for w in STOP if w in cnt] + (['кавычки'] if re.search('["«»“”]', whole) else [])
print('стоп-слова и кавычки:', ', '.join(bad) or 'нет')

rows = [r for r in csv.DictReader(open(os.path.join(HERE, 'kluchi.csv'))) if r['group'] in ('Main', 'Extra')]
T = norm(whole)
for g in ('Main', 'Extra'):
    tot, zero = 0, []
    print(f'\n{g}:')
    for r in rows:
        if r['group'] != g:
            continue
        n = T.count(norm(r['key']))
        tot += n
        if not n:
            zero.append(r['key'])
        print(f'  {n:2}  {r["key"]}')
    print(f'  = {tot} вхождений (канон 15–20) · без вхождений: {", ".join(zero) or "нет"}')

print('\nзаглавные в ключах (канон 2.1:102 — убрать в 50 % случаев, и в кратком, и в полном):')
keys = sorted({r['key'] for r in rows}, key=len, reverse=True)
for label, part in (('краткое', short), ('полное', full)):
    low = cap = 0
    taken = []
    for k in keys:
        for m in re.finditer(r'(?<![A-Za-z0-9])' + r'\W+'.join(map(re.escape, k.split())) + r'(?![A-Za-z0-9])', part, re.I):
            if any(a < m.end() and m.start() < b for a, b in taken):
                continue  # уже внутри более длинного ключа
            taken.append((m.start(), m.end()))
            if m.group(0) == m.group(0).lower():
                low += 1
            else:
                cap += 1
    print(f'  {label}: строчными {low}, с заглавными {cap} — строчных {100 * low / max(1, low + cap):.0f} %')

print('\nабзацы с ≥4 одинаковыми ключами:')
hit = False
for p in re.split(r'\n\s*\n', full):
    P = norm(p)
    for r in rows:
        if P.count(norm(r['key'])) >= 4:
            hit = True
            print('  ', r['key'], '×', P.count(norm(r['key'])), '—', p[:60].replace('\n', ' '))
print('  нет' if not hit else '')
