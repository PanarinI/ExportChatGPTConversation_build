#!/usr/bin/env python3
"""Объём поисков: было (ключи в живом тексте листинга) и стало (новый набор Main + Extra). $0, без сети.

Было: какие из 910 ключей замера 16.11 (`../novye-vygruzki-2026-11-16/keys.csv`) стоят в нынешнем тексте
(название + краткое + полное, `_locales/en/messages.json`), точной фразой, в том числе внутри длинных фраз — так канон
считает вхождения (2.1.4). Близнецы (одинаковый помесячный ряд и мир) складываются один раз.
Стало: строки Main и Extra из `kluchi.csv` (близнецы уже свёрнуты в строку).
Числа — Google Ads через DataForSEO: среднее за 12 месяцев (ноя.25 → окт.26) и «сейчас» = август–октябрь 2026, США.
Пишет `bylo-v-tekste.csv`. Запуск: python3 -I bylo-stalo.py
"""
import csv, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
BRAND = {'chatgpt print and save extension', 'chatgpt print and save'}  # имя чужого расширения


def norm(s):
    return ' ' + re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip() + ' '


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


msg = json.load(open(os.path.join(ROOT, '_locales', 'en', 'messages.json')))
text = norm(' '.join(msg[k]['message'] for k in ('appName', 'shortDesc', 'storeDesc')))

old, seen = [], {}
for r in csv.DictReader(open(os.path.join(ROOT, 'research', 'novye-vygruzki-2026-11-16', 'keys.csv'))):
    key = r['key'].strip().lower()
    times = text.count(norm(key))
    if not times:
        continue
    sig = (r['us_12_months'].strip(), r['world_avg'])
    if sig[0] and sig in seen:
        seen[sig]['twins'].append(key)
        continue
    series = [float(v) for v in r['us_12_months'].split()]
    row = {'key': key, 'times': times, 'us_12m': num(r['us_avg']) or 0,
           'us_now': round(sum(series[-3:]) / 3) if len(series) >= 3 else 0,
           'world_12m': num(r['world_avg']) or 0, 'brand': key in BRAND, 'twins': []}
    seen[sig] = row
    old.append(row)

new = [r for r in csv.DictReader(open(os.path.join(HERE, 'kluchi.csv'))) if r['group'] in ('Main', 'Extra')]


def total(rows, a, b, c):
    return tuple(round(sum(num(r[k]) or 0 for r in rows)) for k in (a, b, c))


with open(os.path.join(HERE, 'bylo-v-tekste.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['key', 'times_in_text', 'us_12m', 'us_now', 'world_12m', 'brand', 'twins'])
    for r in sorted(old, key=lambda r: -r['us_12m']):
        w.writerow([r['key'], r['times'], round(r['us_12m']), r['us_now'], round(r['world_12m']),
                    'да' if r['brand'] else '', ' · '.join(r['twins'])])

print('было (ключи в тексте):     США год %d · США сейчас %d · мир год %d · ключей %d'
      % (*total(old, 'us_12m', 'us_now', 'world_12m'), len(old)))
nb = [r for r in old if not r['brand']]
print('было без чужого имени:      США год %d · США сейчас %d · мир год %d · ключей %d'
      % (*total(nb, 'us_12m', 'us_now', 'world_12m'), len(nb)))
known = [r for r in new if num(r['us_12m']) is not None]
print('стало (Main + Extra):       США год %d · США сейчас %d · мир год %d · ключей %d из %d'
      % (*total(new, 'us_12m', 'us_aug_oct', 'world_12m'), len(known), len(new)))
