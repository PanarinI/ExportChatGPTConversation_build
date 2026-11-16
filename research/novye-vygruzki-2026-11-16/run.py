#!/usr/bin/env python3
"""Новые выгрузки ExportGPT — спрос по каждой цели (замер 2026-11-16).

Вопрос автора: сколько ищут каждую цель выгрузки (Word, Google Docs, Markdown, Obsidian, Notion, txt, HTML, JSON,
картинка, таблицы Excel/CSV, EPUB; «обратно в ИИ» — Claude, Gemini, NotebookLM, «продолжить в новом чате»;
бэкап всей истории; для сравнения — наши нынешние двери), растёт спрос или падает, насколько труден ключ
и занято ли имя в Chrome Web Store.

DataForSEO — только REST через curl (Python urllib падает здесь на SSL). Ключ — заголовок Authorization из
~/.claude.json (mcpServers.dataforseo); в вывод и в файлы не пишется. Каждый платный вызов — строка в spend.log
с полем cost ответа; на $1.40 скрипт останавливается.

Шаги (по одному; сырьё кэшируется в raw/, повтор бесплатный):
  python3 -I run.py balance        — баланс (бесплатно)
  python3 -I run.py suggest [N..]  — подсказки Labs (US, en), по зерну; без номеров — все ещё не снятые
  python3 -I run.py keys           — сборка списка ключей → kandidaty.csv (без сети)
  python3 -I run.py volume         — Google Ads: ОДНА задача США + ОДНА мир (с 2024-11, чтобы видеть ступеньку 11.2025)
  python3 -I run.py kd             — KD DataForSEO, США, одна задача
  python3 -I run.py serp "k1" ..   — выдача Google США, desktop, верхние 10
  python3 -I run.py analyze        — keys.csv + svod.json (без сети)
Занятость стора — отдельный скрипт census.py ($0)."""
import csv, datetime, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
SPEND = os.path.join(HERE, 'spend.log')
API = 'https://api.dataforseo.com/v3/'
STOP_AT = 1.40           # потолок трат прогона (автор одобрил ≈$1, жёсткий потолок $1.50)
US = {'location_code': 2840, 'language_code': 'en'}
DATE_FROM = '2024-11-01'  # 24 месяца: 12 «своих» + 12 до них (ступенька ноября 2025 видна только с прошлыми месяцами)

STUDIO = os.path.expanduser('~/PycharmProjects/app-studio/research')
OLD_1110 = os.path.join(STUDIO, 'probes/klassika-cws-2026-10-11/syrye')
OLD_2209 = os.path.join(STUDIO, 'perenos-chata-2026-09-22/raw')

os.makedirs(RAW, exist_ok=True)


# ---------------------------------------------------------------- сеть и деньги
def _auth():
    h = json.load(open(os.path.expanduser('~/.claude.json')))['mcpServers']['dataforseo']['headers']
    for k, v in h.items():
        if k.lower() == 'authorization':
            return v
    raise SystemExit('нет заголовка Authorization у mcpServers.dataforseo')


def call(path, payload=None, name=None):
    """curl к DataForSEO. Ключ идёт конфигом через stdin (не в argv, не в файлы). Тело запроса — raw/<name>.request.json."""
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
        raise SystemExit(f'не JSON от {path}: {out[:300]}')


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


def guard(expected):
    if spent() + expected > STOP_AT:
        raise SystemExit(f'СТОП: потрачено ${spent():.4f}, следующий вызов ≈${expected:.3f} — выше потолка ${STOP_AT}')


def paid(path, task, name, step, expected, note=''):
    """Платный вызов: потолок → запрос → сырьё как пришло → строка в spend.log."""
    cached = os.path.join(RAW, f'{name}.json')
    if os.path.exists(cached):
        return json.load(open(cached))
    guard(expected)
    res = call(path, [task], name)
    with open(cached, 'w') as f:
        json.dump(res, f, ensure_ascii=False)
    cost = float(res.get('cost') or 0)
    t = (res.get('tasks') or [{}])[0]
    log_spend(step, cost, f"{note} · task {t.get('status_code')} {t.get('status_message')}")
    if res.get('status_code') != 20000 or t.get('status_code') != 20000:
        print(f"!! {name}: {res.get('status_code')} {res.get('status_message')} / {t.get('status_code')} {t.get('status_message')}")
    return res


def balance():
    res = call('appendix/user_data')
    m = res['tasks'][0]['result'][0]['money']
    print(f"баланс DataForSEO: ${m['balance']:.4f}")
    with open(SPEND, 'a') as f:
        f.write(f"{datetime.datetime.now(datetime.timezone.utc):%Y-%m-%dT%H:%M:%SZ}\tbalance\t$0.00000\t"
                f"итого ${spent():.5f}\tбаланс ${m['balance']:.4f} (бесплатный appendix/user_data)\n")


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


# ---------------------------------------------------------------- 1. подсказки
# зерно → фильтр (только у «шумных» зёрен: слова совпадают, а смысл другой — «chatgpt for notion», «image generator»).
# Подсказки Labs ищут ВСЕ слова зерна в любом порядке, поэтому у каждого зерна свой набор слов.
EXP = 'export|save|download|convert|copy|paste|transfer|move|import|backup|back up|archive|sync|send'
SEEDS = [
    ('chatgpt word',       f'{EXP}|to word|into word|in word|as word|word doc|word file|word format|docx|ms word|microsoft word'),
    ('chatgpt docx',       None),
    ('chatgpt markdown',   f'{EXP}|to markdown|as markdown|into markdown|markdown file|md file|obsidian|notion|exporter|extension'),
    ('chatgpt obsidian',   None),
    ('chatgpt notion',     f'{EXP}|to notion|into notion|clip|exporter|extension'),
    ('chatgpt txt',        None),
    ('chatgpt html',       f'{EXP}|to html|as html|html file|conversation|exporter'),
    ('chatgpt json',       f'{EXP}|to json|as json|json file|conversations|history|exporter'),
    ('chatgpt screenshot', None),
    ('chatgpt table',      f'{EXP}|to excel|into excel|to sheets|to google|to word|to docs|to csv|csv|excel|spreadsheet'),
    ('chatgpt csv',        None),
    ('chatgpt epub',       None),
    ('chatgpt to gemini',  'transfer|import|export|move|switch|migrat|copy|continue|history|chats|conversation|memory|data'),
    ('chatgpt notebooklm', f'{EXP}|to notebooklm|into notebooklm|add|upload|chats|conversation|history|source'),
    ('continue chatgpt',   None),
    ('chatgpt new chat',   f'{EXP}|carry|continue|context|memory|conversation|history|bring|summar|same'),
    ('transfer chatgpt',   None),
    ('backup chatgpt',     None),
    ('export chatgpt',     None),
    ('save chatgpt',       None),
    ('download chatgpt',   'chats|chat$|chat |conversation|history|data|pdf|backup|archive|all '),
    ('chatgpt pdf',        f'{EXP}|to pdf|as pdf|into pdf|pdf export|pdf file|print|exporter|extension|conversation'),
]
SUG_LIMIT = 200
SUG_EXPECTED = 0.012 + SUG_LIMIT * 0.00012   # цена Labs 11.10: $0.012 за задачу + $0.00012 за строку


def sugg_file(seed):
    return f'sugg-{slug(seed)}'


def labs_items(path):
    """Строки подсказок из файла (свой формат — полный ответ API; 22.09 — список result)."""
    d = json.load(open(path))
    res = d['tasks'][0].get('result') if isinstance(d, dict) and 'tasks' in d else d
    out = {}
    for r in res or []:
        for it in (r.get('items') or []) + ([r['seed_keyword_data']] if r.get('seed_keyword_data') else []):
            if it and it.get('keyword'):
                out[it['keyword']] = it
    return out


def all_sugg_sources():
    srcs = []
    for seed, _ in SEEDS:
        p = os.path.join(RAW, sugg_file(seed) + '.json')
        if os.path.exists(p):
            srcs.append((seed, p))
    # переиспользуем купленное раньше (не покупаем второй раз)
    srcs.append(('chatgpt to google docs [11.10]', os.path.join(OLD_1110, 'sugg-chatgpt-to-google-docs.json')))
    srcs.append(('chatgpt to claude [22.09]', os.path.join(OLD_2209, 'suggest_chatgpt_to_claude.json')))
    return srcs


def suggest(which):
    known = {}
    for name, p in all_sugg_sources():
        known.update({k: name for k in labs_items(p)})
    idx = [int(x) for x in which] if which else range(1, len(SEEDS) + 1)
    for i in idx:
        seed, flt = SEEDS[i - 1]
        name = sugg_file(seed)
        if os.path.exists(os.path.join(RAW, name + '.json')):
            print(f'[{i}] {seed}: уже снято, пропуск')
            continue
        task = dict(keyword=seed, limit=SUG_LIMIT, include_seed_keyword=True,
                    order_by=['keyword_info.search_volume,desc'], **US)
        if flt:
            task['filters'] = ['keyword', 'regex', flt]
        res = paid('dataforseo_labs/google/keyword_suggestions/live', task, name, 'suggest', SUG_EXPECTED, seed)
        t = res['tasks'][0]
        r = (t.get('result') or [{}])[0] or {}
        items = labs_items(os.path.join(RAW, name + '.json'))
        new = [k for k in items if k not in known]
        known.update({k: seed for k in items})
        print(f"[{i}] {seed}: всего {r.get('total_count')} · строк {r.get('items_count')} · новых {len(new)} · "
              f"${res.get('cost')} · потрачено ${spent():.4f}")
        for it in sorted(items.values(), key=lambda x: -((x.get('keyword_info') or {}).get('search_volume') or 0))[:25]:
            ki = it.get('keyword_info') or {}
            print(f"      {ki.get('search_volume') or 0:>7}  {it['keyword']}")


# ---------------------------------------------------------------- 2. список ключей
# Ручные ключи: зёрна автора по каждой цели + двери, измеренные 11.10 (их ряды обновляем: та же цена) + группы 22.09.
MANUAL = """
chatgpt to word|chatgpt to docx|export chatgpt to word|export chatgpt conversation to word|chatgpt to word converter
save chatgpt as word document|convert chatgpt to word|copy chatgpt to word|chatgpt to word extension|chatgpt to microsoft word
chatgpt to word or pdf|chatgpt conversation to word|chatgpt to google docs|export chatgpt to google docs|chatgpt google docs
chatgpt to docs|chatgpt to google doc|save chatgpt to google docs|copy chatgpt to google docs|chatgpt to google docs extension
export chatgpt conversation to google docs|chatgpt google docs extension|chatgpt to markdown|chatgpt to md|export chatgpt to markdown
chatgpt markdown export|chatgpt conversation to markdown|save chatgpt as markdown|copy chatgpt as markdown|chatgpt to markdown extension
chatgpt to obsidian|export chatgpt to obsidian|import chatgpt to obsidian|save chatgpt to obsidian|chatgpt conversation to obsidian
chatgpt to notion|save chatgpt to notion|export chatgpt to notion|chatgpt notion export|chatgpt to notion extension
chatgpt to txt|chatgpt to text|export chatgpt to txt|save chatgpt as txt|chatgpt text file|chatgpt to text file|export chatgpt as text
chatgpt to html|export chatgpt to html|save chatgpt as html|chatgpt conversation to html|chatgpt to json|export chatgpt to json
chatgpt conversations json|chatgpt json export|chatgpt export json|chatgpt screenshot|chatgpt conversation screenshot|chatgpt to image
chatgpt conversation to image|save chatgpt conversation as image|chatgpt long screenshot|screenshot chatgpt conversation
how to screenshot chatgpt conversation|share chatgpt as image|chatgpt chat to image|chatgpt to png|chatgpt to excel
export chatgpt to excel|chatgpt table to excel|copy chatgpt table to excel|chatgpt to csv|export chatgpt to csv|chatgpt table to csv
chatgpt to excel converter|chatgpt table to google sheets|chatgpt to google sheets|chatgpt to epub|export chatgpt to epub|chatgpt epub
chatgpt conversation to epub|chatgpt to ebook|chatgpt to kindle|send chatgpt to kindle|chatgpt to powerpoint|chatgpt to ppt
export chatgpt to powerpoint|chatgpt to gemini|transfer chatgpt to gemini|import chatgpt to gemini|export chatgpt to gemini
move chatgpt to gemini|switch from chatgpt to gemini|import chatgpt history to gemini|transfer chatgpt chats to gemini
chatgpt to gemini migration|gemini to chatgpt|chatgpt to notebooklm|import chatgpt to notebooklm|export chatgpt to notebooklm
add chatgpt to notebooklm|chatgpt notebooklm|upload chatgpt conversation to notebooklm|notebooklm import chatgpt
continue chatgpt conversation in new chat|continue chatgpt conversation|transfer chatgpt conversation to new chat
move chatgpt conversation to new chat|chatgpt new chat with same context|chatgpt conversation too long|chatgpt chat too long
chatgpt maximum conversation length|maximum length for this conversation|reached the maximum length for this conversation
chatgpt conversation limit|chatgpt conversation length limit|chatgpt continue in new chat|carry over chatgpt conversation
how to continue a chatgpt conversation in a new chat|chatgpt chat length limit|backup chatgpt|chatgpt backup
backup chatgpt conversations|backup chatgpt chats|chatgpt history export|export chatgpt history|download chatgpt history
export all chatgpt chats|export all chatgpt conversations|download all chatgpt chats|download all chatgpt conversations
export chatgpt data|chatgpt data export|how to export chatgpt data|chatgpt export data|download chatgpt data|chatgpt export all chats
bulk export chatgpt|save all chatgpt chats|archive chatgpt chats|chatgpt archive|chatgpt conversation history export
export chat history chatgpt|how to export chatgpt history|chatgpt export not working|chatgpt data export not received
export chatgpt conversation|chatgpt to pdf|chatgpt exporter|chatgpt export|save chatgpt conversation|export chatgpt chat|save chatgpt chat
download chatgpt chat|download chatgpt conversation|how to export chatgpt chat|how to save chatgpt conversation
how to save chatgpt conversation as pdf|export chatgpt to pdf|save chatgpt as pdf|chatgpt conversation to pdf|print chatgpt conversation
print chatgpt|chatgpt pdf export|convert chatgpt to pdf|chatgpt to pdf extension|chatgpt to pdf converter|ai chat exporter
export chatgpt|chatgpt chat export|chatgpt pdf|chat gpt to pdf|chatgpt chat backup|chatgpt response to pdf|save chatgpt response
chatgpt history export|export claude chat|export gemini chat|chatgpt to word or pdf
chatgpt to claude|transfer chatgpt to claude|move chatgpt to claude|import chatgpt to claude|migrate chatgpt to claude
export chatgpt to claude|switch from chatgpt to claude|chatgpt to claude migration|transfer chatgpt conversation to claude
move chatgpt conversation to claude|export chatgpt conversation to claude|import chatgpt conversations to claude
import chatgpt history to claude|transfer chatgpt chats to claude|move chats from chatgpt to claude|chatgpt to claude extension
import chatgpt memory to claude|transfer chatgpt memory to claude|how to move from chatgpt to claude|continue chatgpt conversation in claude
transfer chat between ai|ai chat transfer|transfer ai conversation|move ai chat|ai chat migration
""".split('|')
MANUAL = [k.strip() for line in MANUAL for k in line.split('\n') if k.strip()]
NEIGHBORS = {'export claude chat', 'export gemini chat', 'ai chat exporter', 'transfer chat between ai', 'ai chat transfer',
             'transfer ai conversation', 'move ai chat', 'ai chat migration', 'gemini to chatgpt'}


def ok_for_ads(k):
    """Google Ads: ≤80 знаков, ≤10 слов, только буквы, цифры, пробел и дефис (апостроф и & не шлём — одна битая фраза может уронить задачу)."""
    return len(k) <= 80 and len(k.split()) <= 10 and re.fullmatch(r"[a-z0-9 -]+", k) is not None


def build_keys():
    sys.path.insert(0, HERE)
    import pravila
    pravila.FORCE_KEEP.update(MANUAL)
    pool = {}   # key -> dict(labs, src)
    for name, p in all_sugg_sources():
        for k, it in labs_items(p).items():
            k = k.lower().strip()
            r = pool.setdefault(k, dict(labs=(it.get('keyword_info') or {}).get('search_volume'), src=[]))
            r['src'].append(name)
    for k in MANUAL:
        pool.setdefault(k.lower(), dict(labs=None, src=[])).setdefault('src', []).append('вручную')
    rows = []
    for k, r in pool.items():
        c = pravila.classify(k)
        if k in NEIGHBORS:
            c['group'], c['block'] = 'Соседи (не цель)', 'cur'
        rows.append(dict(key=k, group=c['group'], block=pravila.BLOCKS.get(c['block'], c['block']), noise=c['noise'],
                         ambiguous='да' if c['ambiguous'] else '', flags='; '.join(c['flags']), labs_us=r['labs'],
                         ads_ok='да' if ok_for_ads(k) else 'нет', src='; '.join(dict.fromkeys(r['src']))))
    rows.sort(key=lambda r: (r['noise'] != '', r['block'], r['group'], -(r['labs_us'] or 0), r['key']))
    with open(os.path.join(HERE, 'kandidaty.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    return rows


def keys_step():
    rows = build_keys()
    keep = [r for r in rows if not r['noise'] and r['ads_ok'] == 'да']
    noise = [r for r in rows if r['noise']]
    print(f"всего {len(rows)} · шум {len(noise)} · к покупке {len(keep)} · не годятся для Ads {sum(r['ads_ok'] != 'да' for r in rows)}")
    from collections import Counter
    for (g, n) in Counter(r['group'] for r in keep).most_common():
        print(f'  {n:>4}  {g}')
    print('шум по причинам:')
    for (g, n) in Counter(r['noise'] for r in noise).most_common():
        print(f'  {n:>4}  {g}')


def final_keys():
    rows = list(csv.DictReader(open(os.path.join(HERE, 'kandidaty.csv'))))
    keys = [r['key'] for r in rows if not r['noise'] and r['ads_ok'] == 'да']
    if len(keys) > 1000:
        raise SystemExit(f'ключей {len(keys)} > 1000 — сократить список')
    return keys


# ---------------------------------------------------------------- 3. объёмы Google Ads (одна задача США + одна мир)
def volume():
    keys = final_keys()
    us = paid('keywords_data/google_ads/search_volume/live', dict(keywords=keys, date_from=DATE_FROM, **US),
              'volume_us', 'volume_us', 0.09, f'{len(keys)} ключей, США, с {DATE_FROM}')
    mir = paid('keywords_data/google_ads/search_volume/live', dict(keywords=keys, date_from=DATE_FROM),
               'volume_world', 'volume_world', 0.09, f'{len(keys)} ключей, весь мир (без страны и языка), с {DATE_FROM}')
    for name, res in (('США', us), ('мир', mir)):
        t = res['tasks'][0]
        rs = t.get('result') or []
        ms = sorted({(m['year'], m['month']) for r in rs for m in (r.get('monthly_searches') or [])})
        print(f"{name}: ответов {len(rs)} из {len(keys)} · месяцы {ms[0] if ms else '-'} → {ms[-1] if ms else '-'} ({len(ms)}) · ${res.get('cost')}")
    print(f'потрачено ${spent():.4f}')


def series(res):
    """keyword -> {(y, m): volume}, плюс поля задачи (cpc, competition)."""
    out = {}
    for r in (res['tasks'][0].get('result') or []):
        ms = {(m['year'], m['month']): m.get('search_volume') for m in (r.get('monthly_searches') or [])}
        out[r['keyword']] = dict(ms=ms, cpc=r.get('cpc'), comp=r.get('competition_index'), sv=r.get('search_volume'))
    return out


# ---------------------------------------------------------------- 4. KD (только ключи с объёмом США > 0 — у пустых KD не нужен)
def kd():
    us = series(json.load(open(os.path.join(RAW, 'volume_us.json'))))
    last12 = sorted({m for v in us.values() for m in v['ms']})[-12:]
    keys = [k for k, v in us.items() if any((v['ms'].get(m) or 0) > 0 for m in last12)]
    exp = 0.012 + 0.00012 * len(keys)
    res = paid('dataforseo_labs/google/bulk_keyword_difficulty/live', dict(keywords=keys, **US), 'kd_us', 'kd_us', exp + 0.01,
               f'{len(keys)} ключей с объёмом США > 0 за 12 мес')
    items = (res['tasks'][0].get('result') or [{}])[0].get('items') or []
    print(f"KD: {len(items)} из {len(keys)} · ${res.get('cost')} · потрачено ${spent():.4f}")


# ---------------------------------------------------------------- 5. выдача Google США
def serp(keys):
    for k in keys:
        res = paid('serp/google/organic/live/advanced', dict(keyword=k, depth=10, device='desktop', **US),
                   f'serp-{slug(k)}', 'serp', 0.004, k)
        items = (res['tasks'][0].get('result') or [{}])[0].get('items') or []
        print(f"\n== {k} · ${res.get('cost')} · блоки: {', '.join(sorted({i.get('type') for i in items}))}")
        for i in items:
            if i.get('type') == 'organic':
                print(f"  {i.get('rank_group')}. {i.get('domain')} — {(i.get('title') or '')[:80]}\n     {i.get('url')}")
    print(f'\nпотрачено ${spent():.4f}')


def resolve(url):
    """Ссылки выдачи DataForSEO теперь приходят обёрткой google.com/goto — настоящий адрес берём из перенаправления
    (два шага: google.com → www.google.com → сайт). Бесплатно, без данных автора."""
    if not url or 'google.com/goto' not in url:
        return url
    u = url.replace('https://google.com/', 'https://www.google.com/')
    out = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{redirect_url}', '--max-time', '20', '-A',
                          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', u],
                         capture_output=True, text=True).stdout.strip()
    return out or url


def serp_md():
    """raw/serp-*.json → serp.md (позиция · сайт · заголовок · настоящий адрес) + raw/serp-links.json (кэш адресов)."""
    import glob
    cache_p = os.path.join(RAW, 'serp-links.json')
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    lines = ['# Выдача Google США (desktop, верхние 10) — DataForSEO live, 16.11.2026', '']
    for p in sorted(glob.glob(os.path.join(RAW, 'serp-*.json'))):
        if p.endswith('.request.json') or p.endswith('serp-links.json'):
            continue
        r = json.load(open(p))['tasks'][0]['result'][0]
        items = r.get('items') or []
        lines.append(f"## `{r['keyword']}` — {r['datetime'][:16]} UTC")
        lines.append(f"Блоки страницы по порядку: {', '.join(dict.fromkeys(i.get('type') for i in items))}")
        lines.append('')
        for i in items:
            if i.get('type') != 'organic':
                continue
            u = i.get('url')
            if u not in cache or 'google.com/goto' in (cache.get(u) or ''):
                cache[u] = resolve(u)
                time.sleep(1)
            real = cache[u]
            dom = re.sub(r'^https?://(www\.)?', '', real).split('/')[0]
            lines.append(f"{i.get('rank_group')}. {dom} — {i.get('title')} ({i.get('website_name') or ''})  \n   {real}")
        lines.append('')
    json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, 'serp.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else ''
    if step == 'serp_md':
        serp_md()
        sys.exit()
    if step == 'balance':
        balance()
    elif step == 'suggest':
        suggest(sys.argv[2:])
    elif step == 'keys':
        keys_step()
    elif step == 'volume':
        volume()
    elif step == 'kd':
        kd()
    elif step == 'serp':
        serp(sys.argv[2:])
    else:
        print(__doc__)
