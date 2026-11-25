#!/usr/bin/env python3
"""Проверка листинга по правилу Google (Keyword Spam / Yellow Argon) — после отказа 24.11. $0, без сети.

Правило (developer.chrome.com/docs/webstore/troubleshooting, «Keyword stuffing», сверено 24.11.2026): пример переспама —
«Unnatural repetition of the same keyword more than 5 times». Отказ 1.3.1 (24.11): ChatGPT 18+ раз «throughout the listing»
и ключи дословно («how to export chatgpt conversation», «chatgpt to word»…).

Наши пороги (слово автора 24.11 «давай… чтобы уж точно пройти»):
  · ChatGPT — не больше 5 на весь листинг (название + краткое + полное); пишется только «ChatGPT»;
  · любое слово на весь листинг (название + краткое + полное), кроме служебных, — не больше 5 (слова сводятся грубо:
    pictures → picture). Служебные — короче, чем у Text Checker: «one» он считает значимым (жёлтое 2,12 % в v6).
  · без вопросов-запросов: нет «how to», «looking for», «wondering», «need to know» и вопросов с ChatGPT; без кавычек.
    Обычные вопросы раздела «вопрос-ответ» (канон 2.1:90) можно — вернули по слову автора 24.11 (v8).
Запуск: python3 -I pravilo-google.py teksty/v6.md
"""
import re, sys
from collections import Counter

SMALL = set('''a an the to of and or in on for it is you your with as at by from that this be are its so if how can do not
no there what then them they their here all any also only just into out up down over after before than too
has have had was were will would should which who where when while our we us me my i about like
been being per'''.split())
QUERY = re.compile(r'\bhow (to|do)\b|\blooking for\b|\bwondering\b|\bneed to know\b|\?.*chatgpt|chatgpt.*\?', re.I)
# Обычные вопросы раздела «вопрос-ответ» (канон 2.1:90) можно; вопрос с ChatGPT или в виде поискового запроса — нет.
QUOTES = '"“”„«»「」『』'


def fold(w):
    w = re.sub(r"'s$", '', w)
    return w[:-1] if len(w) > 3 and w.endswith('s') and not w.endswith('ss') else w


src = open(sys.argv[1]).read()
parts = dict(re.findall(r'<!-- (NAME|SHORT|FULL) -->\n(.*?)(?=\n<!-- |\Z)', src, re.S))
name, short, full = (parts[k].strip() for k in ('NAME', 'SHORT', 'FULL'))
probs = []

g = [len(re.findall(r'chatgpt', t, re.I)) for t in (name, short, full)]
odd = sorted(set(m for m in re.findall(r'chatgpt', name + short + full, re.I) if m != 'ChatGPT'))
print(f'ChatGPT: название {g[0]} · краткое {g[1]} · полное {g[2]} · всего {sum(g)} (порог 5)')
if sum(g) > 5:
    probs.append(f'ChatGPT ×{sum(g)} > 5')
if odd:
    probs.append('написание: ' + ', '.join(odd))

words = [fold(w) for w in re.findall(r"[a-z0-9]+(?:'[a-z]+)?", '\n'.join([name, short, full]).lower()) if w not in SMALL]
cnt = Counter(w for w in words if w not in SMALL)
top = [(w, n) for w, n in cnt.most_common() if n >= 4]
print(f'полное {len(full)} знаков · значимых слов листинга {len(words)} · чаще всего: ' +
      ', '.join(f'{w} {n}' + (' ✗' if n > 5 else '') for w, n in top))
probs += [f'«{w}» ×{n} > 5' for w, n in cnt.items() if n > 5]

for line in full.split('\n'):
    if QUERY.search(line):
        probs.append('вопрос-запрос: ' + line[:70])
if any(q in name + short + full for q in QUOTES):
    probs.append('кавычки')
if len(short) > 132:
    probs.append(f'краткое {len(short)} > 132')
print(f'краткое {len(short)}/132')
print('\n' + ('без замечаний' if not probs else '⚠ ' + '\n⚠ '.join(probs)))
