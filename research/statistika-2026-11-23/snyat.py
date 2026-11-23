#!/usr/bin/env python3
"""Снимок GA4 ExportGPT (ресурс 540507186: события расширения + лендинг) — $0, только чтение.

Вход — сервис-аккаунт `~/.garden-keys/ga4-service-account.json` (тот же, что у app-studio/analytics/pulse.py).
Пишет сырьё в raw/<имя>.json. Запуск: python3 -I snyat.py
"""
import json, os, sys, urllib.request, urllib.error

sys.path.insert(0, os.path.expanduser('~/PycharmProjects/app-studio/analytics'))
from pulse import ga4_token  # noqa: E402

PROP = '540507186'
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)
TOKEN = ga4_token(os.path.expanduser('~/.garden-keys/ga4-service-account.json'))
BASE = f'https://analyticsdata.googleapis.com/v1beta/properties/{PROP}'


def call(path, body=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
                                 method='POST' if body else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'text': e.read().decode()[:400]}


def report(name, dims, metrics, start, end='today', filt=None, limit=1000):
    body = {'dateRanges': [{'startDate': start, 'endDate': end}],
            'dimensions': [{'name': d} for d in dims], 'metrics': [{'name': m} for m in metrics], 'limit': limit}
    if filt:
        body['dimensionFilter'] = filt
    data = call(':runReport', body)
    json.dump(data, open(os.path.join(RAW, name + '.json'), 'w'), ensure_ascii=False, indent=1)
    if 'error' in data:
        print(f'## {name}: ОШИБКА {data["error"]} {data["text"][:200]}')
        return []
    rows = [[v['value'] for v in r['dimensionValues']] + [v['value'] for v in r['metricValues']]
            for r in data.get('rows', [])]
    print(f'## {name} ({start} → {end}) · {dims} · {metrics} · строк {len(rows)}')
    return rows


def ev(name):
    return {'filter': {'fieldName': 'eventName', 'stringFilter': {'value': name}}}


if __name__ == '__main__':
    meta = call('/metadata')
    json.dump(meta, open(os.path.join(RAW, 'metadata.json'), 'w'), ensure_ascii=False, indent=1)
    custom = [d['apiName'] for d in meta.get('dimensions', []) if d['apiName'].startswith('customEvent:')]
    cmetrics = [m['apiName'] for m in meta.get('metrics', []) if m['apiName'].startswith('customEvent:')]
    print('заведённые измерения:', custom)
    print('заведённые метрики:', cmetrics)

    for r in report('sobytiya-po-dnyam', ['date', 'eventName'], ['eventCount', 'totalUsers'], '2026-10-25'):
        pass
    tot = report('sobytiya-noyabr', ['eventName'], ['eventCount', 'totalUsers'], '2026-11-01')
    for r in sorted(tot, key=lambda r: -int(r[1])):
        print('   ', r)
    for dim in custom:
        rows = report('razrez-' + dim.split(':')[1], ['eventName', dim], ['eventCount', 'totalUsers'], '2026-11-01')
        for r in sorted(rows, key=lambda r: (r[0], -int(r[2]))):
            if r[1] not in ('(not set)', ''):
                print('   ', r)
