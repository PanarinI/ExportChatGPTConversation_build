#!/usr/bin/env python3
"""Выдачи Google США для 9 ключей таблицы Main/Extra, у которых выдачи не было (слово автора 18.11: «Выдачу для 9 ключей,
конечно, докупи»; оценка ≈$0,02, жёсткий потолок $0,05).

DataForSEO — только REST через curl (как run.py 16.11). Ключ — заголовок Authorization из ~/.claude.json
(mcpServers.dataforseo); идёт в curl через stdin, в вывод и файлы не пишется. Каждый платный вызов — строка в spend.log,
баланс до и после — бесплатный appendix/user_data. Сырьё — raw/serp-<ключ>.json.

  python3 -I serp.py balance        — баланс (бесплатно)
  python3 -I serp.py serp           — 9 выдач (desktop, en, США, верхние 10)
  python3 -I serp.py serp_md        — raw → serp.md (ссылки google.com/goto развёрнуты в настоящие адреса)
  python3 -I serp.py serp_md --fast — то же без сети: неразвёрнутые ссылки остаются обёрткой google.com/goto
  python3 -I serp.py kd             — KD DataForSEO по всем ключам kluchi.csv, одна задача bulk_keyword_difficulty (США)
                                      → raw/kd-dfs.json (слово автора 18.11: «кадехи датафорсеошные… переделать»; ≈$0,02)
  python3 -I serp.py vol_new        — объём Google Ads нового ключа: Labs historical_keyword_data, США (мира в Labs нет)
                                      → raw/vol-<ключ>.json; потолок $0,02
  python3 -I serp.py serp2          — выдачи для интента (слово автора 18.11 «померяем интенты»): 18 ключей Main/Extra без ✅ +
                                      новый ключ; потолок $0,06 на шаг serp2 (с заменами)
  python3 -I serp.py serp2 'ключ'…  — то же для перечисленных ключей (замены из Запаса), в тот же потолок"""
import datetime, glob, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
SPEND = os.path.join(HERE, 'spend.log')
API = 'https://api.dataforseo.com/v3/'
STOP_AT = 0.05
US = {'location_code': 2840, 'language_code': 'en'}
KEYS = ['chatgpt to pdf', 'how to save chatgpt conversation', 'how to download chatgpt conversation',
        'print chatgpt conversation', 'export chatgpt to claude', 'import chatgpt to claude',
        'chatgpt to word extension', 'chatgpt to google docs extension', 'chatgpt to obsidian']
# Интент 18.11: ключи Main/Extra, у которых «кто ищет» ещё не ✅, и новый ключ Main
KEYS2 = ['export chatgpt conversation', 'how to export chatgpt conversation', 'chatgpt export extension', 'chatgpt export chat',
         'how to export a chatgpt conversation', 'how to export chatgpt chat', 'export chatgpt conversation to pdf',
         'how to export chatgpt conversation to pdf', 'how to export chatgpt conversation as pdf', 'can you export chatgpt conversations',
         'how to export chatgpt conversation as text', 'export chatgpt conversation chrome extension',
         'download chatgpt chat', 'how to save chatgpt chats', 'how to save chatgpt conversation as pdf',
         'how to download a chatgpt conversation', 'save chatgpt conversation', 'chatgpt to markdown extension',
         'how to export a chat from chatgpt']
NEW_KEY = 'how to export a chat from chatgpt'
os.makedirs(RAW, exist_ok=True)


def _auth():
    h = json.load(open(os.path.expanduser('~/.claude.json')))['mcpServers']['dataforseo']['headers']
    for k, v in h.items():
        if k.lower() == 'authorization':
            return v
    raise SystemExit('нет заголовка Authorization у mcpServers.dataforseo')


def call(path, payload=None, name=None):
    cfg = f'header = "Authorization: {_auth()}"\nheader = "Content-Type: application/json"\n'
    args = ['curl', '-s', '--max-time', '300', '-K', '-']
    if payload is not None:
        req = os.path.join(RAW, f'{name}.request.json')
        with open(req, 'w') as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
        args += ['-X', 'POST', '--data-binary', '@' + req]
    args.append(API + path)
    out = subprocess.run(args, input=cfg, capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        raise SystemExit(f'не JSON от {path}: {out[:200]}')


def spent():
    if not os.path.exists(SPEND):
        return 0.0
    tot = 0.0
    for line in open(SPEND):
        p = line.rstrip('\n').split('\t')
        if len(p) > 2 and p[2].startswith('$'):
            tot += float(p[2][1:])
    return tot


def log_spend(step, cost, note=''):
    tot = spent() + cost
    with open(SPEND, 'a') as f:
        f.write(f"{datetime.datetime.now(datetime.timezone.utc):%Y-%m-%dT%H:%M:%SZ}\t{step}\t${cost:.5f}\t"
                f"итого ${tot:.5f}\t{note}\n")


def balance():
    res = call('appendix/user_data')
    m = res['tasks'][0]['result'][0]['money']
    print(f"баланс DataForSEO: ${m['balance']:.4f}")
    with open(SPEND, 'a') as f:
        f.write(f"{datetime.datetime.now(datetime.timezone.utc):%Y-%m-%dT%H:%M:%SZ}\tbalance\t$0.00000\t"
                f"итого ${spent():.5f}\tбаланс ${m['balance']:.4f} (бесплатный appendix/user_data)\n")


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def serp():
    for k in KEYS:
        name = f'serp-{slug(k)}'
        cached = os.path.join(RAW, f'{name}.json')
        if os.path.exists(cached):
            continue
        if spent() + 0.004 > STOP_AT:
            raise SystemExit(f'СТОП: потрачено ${spent():.4f} — следующий вызов вышел бы за потолок ${STOP_AT}')
        res = call('serp/google/organic/live/advanced', [dict(keyword=k, depth=10, device='desktop', **US)], name)
        with open(cached, 'w') as f:
            json.dump(res, f, ensure_ascii=False)
        t = (res.get('tasks') or [{}])[0]
        log_spend('serp', float(res.get('cost') or 0), f"{k} · task {t.get('status_code')} {t.get('status_message')}")
    print(f'потрачено за прогон: ${spent():.4f}')


def kd():
    import csv
    keys = list(dict.fromkeys(r['key'] for r in csv.DictReader(open(os.path.join(HERE, 'kluchi.csv'), encoding='utf-8'))))
    cached = os.path.join(RAW, 'kd-dfs.json')
    if os.path.exists(cached):
        raise SystemExit(f'уже снято: {cached}')
    est = 0.012 + 0.00012 * len(keys)  # цена Labs: $0,012 за задачу + $0,00012 за ключ
    if est > 0.03:
        raise SystemExit(f'СТОП: оценка ${est:.4f} выше потолка $0,03 для KD')
    res = call('dataforseo_labs/google/bulk_keyword_difficulty/live', [dict(keywords=keys, **US)], 'kd-dfs')
    with open(cached, 'w') as f:
        json.dump(res, f, ensure_ascii=False)
    t = (res.get('tasks') or [{}])[0]
    log_spend('kd', float(res.get('cost') or 0),
              f"bulk_keyword_difficulty США · {len(keys)} ключей (оценка ${est:.4f}) · task {t.get('status_code')} {t.get('status_message')}")
    items = ((t.get('result') or [{}])[0] or {}).get('items') or []
    got = {i['keyword']: i.get('keyword_difficulty') for i in items}
    for k in keys:
        print(f"{k:48} {got.get(k, '—')}")
    print(f"ключей {len(keys)}, с KD {sum(1 for v in got.values() if v is not None)}, стоимость ${float(res.get('cost') or 0):.5f}")


def spent_step(step):
    tot = 0.0
    if os.path.exists(SPEND):
        for line in open(SPEND):
            p = line.rstrip('\n').split('\t')
            if len(p) > 2 and p[1] == step and p[2].startswith('$'):
                tot += float(p[2][1:])
    return tot


def vol_new():
    name = f'vol-{slug(NEW_KEY)}'
    cached = os.path.join(RAW, f'{name}.json')
    if os.path.exists(cached):
        raise SystemExit(f'уже снято: {cached}')
    if spent_step('vol_new') + 0.0122 > 0.02:
        raise SystemExit('СТОП: потолок $0,02 на объём нового ключа')
    res = call('dataforseo_labs/google/historical_keyword_data/live', [dict(keywords=[NEW_KEY], **US)], name)
    with open(cached, 'w') as f:
        json.dump(res, f, ensure_ascii=False)
    t = (res.get('tasks') or [{}])[0]
    log_spend('vol_new', float(res.get('cost') or 0),
              f"Labs historical_keyword_data США · {NEW_KEY} · task {t.get('status_code')} {t.get('status_message')}")
    items = ((t.get('result') or [{}])[0] or {}).get('items') or []
    print('стоимость', res.get('cost'), '· строк', len(items))
    for it in items:
        for h in (it.get('history') or [])[:3]:
            ki = h.get('keyword_info') or {}
            print(h.get('year'), h.get('month'), ki.get('search_volume'), [(m['year'], m['month'], m['search_volume']) for m in (ki.get('monthly_searches') or [])][:13])


def serp2():
    keys = sys.argv[2:] or KEYS2
    for k in keys:
        name = f'serp-{slug(k)}'
        cached = os.path.join(RAW, f'{name}.json')
        if os.path.exists(cached):
            print('уже есть:', k)
            continue
        if spent_step('serp2') + 0.002 > 0.06 + 1e-9:
            raise SystemExit(f"СТОП: шаг serp2 потратил ${spent_step('serp2'):.4f} — следующий вызов вышел бы за потолок $0,06")
        res = call('serp/google/organic/live/advanced', [dict(keyword=k, depth=10, device='desktop', **US)], name)
        with open(cached, 'w') as f:
            json.dump(res, f, ensure_ascii=False)
        t = (res.get('tasks') or [{}])[0]
        log_spend('serp2', float(res.get('cost') or 0), f"{k} · task {t.get('status_code')} {t.get('status_message')}")
    print(f"шаг serp2: ${spent_step('serp2'):.4f}")


def resolve(url):
    """DataForSEO отдаёт ссылки обёрткой google.com/goto — настоящий адрес из перенаправления Google (бесплатно)."""
    if not url or 'google.com/goto' not in url:
        return url
    u = url.replace('https://google.com/', 'https://www.google.com/')
    out = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{redirect_url}', '--max-time', '20', '-A',
                          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', u],
                         capture_output=True, text=True).stdout.strip()
    return out or url


def serp_md():
    cache_p = os.path.join(RAW, 'serp-links.json')
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    lines = ['# Выдача Google США (desktop, en, верхние 10) — DataForSEO live, 18.11.2026',
             '', 'Первая закупка — 9 ключей без выдачи (16:14 UTC); вторая — для интента: 18 ключей Main/Extra без ✅ и новый '
             'ключ (17:17 UTC). Буквы интента у каждого результата — в sobrat.py (INTENT).', '']
    for k in KEYS + [x for x in KEYS2 if x not in KEYS]:
        p = os.path.join(RAW, f'serp-{slug(k)}.json')
        if not os.path.exists(p):
            continue
        r = json.load(open(p))['tasks'][0]['result'][0]
        items = r.get('items') or []
        lines.append(f"## `{r['keyword']}` — {r['datetime'][:16]} UTC")
        lines.append(f"Блоки страницы по порядку: {', '.join(dict.fromkeys(i.get('type') for i in items))}")
        ai = next((i for i in items if i.get('type') == 'ai_overview'), None)
        if ai:
            txt = ' '.join((x.get('text') or '') for x in (ai.get('items') or []) if isinstance(x, dict))
            lines.append(f"ИИ-обзор (начало): {re.sub(r'\\s+', ' ', txt)[:300]}")
        lines.append('')
        for i in items:
            if i.get('type') != 'organic':
                continue
            u = i.get('url')
            if '--fast' not in sys.argv and (u not in cache or 'google.com/goto' in (cache.get(u) or '')):
                cache[u] = resolve(u)
                time.sleep(1)
            real = cache.get(u) or u
            dom = re.sub(r'^https?://(www\.)?', '', real).split('/')[0]
            lines.append(f"{i.get('rank_group')}. {dom} — {i.get('title')} ({i.get('website_name') or ''})  \n   {real}")
        lines.append('')
    json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, 'serp.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else ''
    {'balance': balance, 'serp': serp, 'serp_md': serp_md, 'kd': kd, 'vol_new': vol_new, 'serp2': serp2}.get(step, lambda: print(__doc__))()
