#!/usr/bin/env python3
"""Занятость дверей в Chrome Web Store, 16.11.2026, $0. Двери, которых не было в переписи 11.10.

Метод — тот же, что 11.10 (`app-studio/research/probes/klassika-cws-2026-10-11/niches2/_g04-syrye/g04_census.py`;
парсер карточки и сравнение имён скопированы оттуда без изменений по смыслу):
- стор-поиск US-витрины `chromewebstore.google.com/search/<фраза>?hl=en-US&gl=US` (≈10 карточек), 4–8 формулировок на дверь;
- каждая карточка открывается: юзеры, число языков, длина полного описания (без первого абзаца-сводки);
- закон занятости (канон 1.1:159-172): занято, только если имя (или его часть между : | , ( ) « - ») из тех же слов
  И описание > 3 000 знаков И языков > 30; иначе держатель не оптимизирован — дверь считается открытой.
- `lib/sky/census_run.py` НЕ взят: у него старый критерий (языки ≥30 ИЛИ описание ≥3 000, только начало имени).

Шаги: python3 -I census.py search | cards | analyze | all
Выход: census/search.json, census/cards.json (сырьё), census.csv, zanyatost.csv, zanyatost_po_klyucham.json."""
import csv, json, os, re, subprocess, sys, time, html as H
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'census')
OLD_CARDS = os.path.expanduser('~/PycharmProjects/app-studio/research/probes/klassika-cws-2026-10-11/niches2/_g04-syrye/cards.json')
OLD_ZAN = os.path.expanduser('~/PycharmProjects/app-studio/research/probes/klassika-cws-2026-10-11/niches2/export-chat-to-pdf--chatgpt/zanyatost.csv')
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
os.makedirs(OUT, exist_ok=True)

DOORS = {
    'Obsidian': ['chatgpt to obsidian', 'export chatgpt to obsidian', 'save chatgpt to obsidian', 'chatgpt obsidian',
                 'obsidian chatgpt export', 'chatgpt markdown obsidian'],
    'Claude': ['chatgpt to claude', 'transfer chatgpt to claude', 'export chatgpt to claude', 'import chatgpt to claude',
               'move chatgpt to claude', 'chatgpt claude migration'],
    'Gemini': ['chatgpt to gemini', 'transfer chatgpt to gemini', 'export chatgpt to gemini', 'import chatgpt to gemini',
               'move chatgpt to gemini'],
    'NotebookLM': ['chatgpt to notebooklm', 'export chatgpt to notebooklm', 'import chatgpt to notebooklm', 'chatgpt notebooklm',
                   'notebooklm importer'],
    'Новый чат': ['continue chatgpt conversation', 'chatgpt new chat with context', 'transfer chatgpt chat',
                  'chatgpt conversation too long', 'chatgpt context transfer', 'continue chat in new chat'],
    'Бэкап и история': ['chatgpt backup', 'backup chatgpt chats', 'export all chatgpt chats', 'chatgpt history export',
                        'chatgpt bulk export', 'download all chatgpt conversations', 'chatgpt data export', 'chatgpt archive'],
    'Таблицы: Excel, CSV': ['chatgpt to excel', 'chatgpt table to excel', 'export chatgpt to csv', 'chatgpt to csv',
                            'chatgpt table export', 'copy chatgpt table'],
    'EPUB и Kindle': ['chatgpt to epub', 'export chatgpt to epub', 'chatgpt ebook', 'chatgpt to kindle'],
    'Картинка и скриншот': ['chatgpt to image', 'chatgpt screenshot', 'chatgpt conversation screenshot', 'chatgpt long screenshot',
                            'chatgpt chat to image', 'save chatgpt as image'],
    'Текст (txt)': ['chatgpt to txt', 'chatgpt to text', 'export chatgpt to txt', 'save chatgpt as text', 'chatgpt text export'],
    'HTML': ['chatgpt to html', 'export chatgpt to html', 'save chatgpt as html', 'chatgpt html export'],
    'JSON': ['chatgpt to json', 'export chatgpt to json', 'chatgpt json export', 'chatgpt conversations json'],
    'Память ChatGPT': ['export chatgpt memory', 'chatgpt memory export', 'chatgpt memory transfer'],
}


def curl(url):
    return subprocess.run(["curl", "-sL", "--compressed", "--max-time", "30", "-H", "User-Agent: " + UA, url],
                          capture_output=True, text=True, errors="replace").stdout


def store_search(q):
    h = curl(f"https://chromewebstore.google.com/search/{quote(q)}?hl=en-US&gl=US")
    out, seen = [], set()
    for slug, i in re.findall(r'/detail/([^/"]+)/([a-p]{32})', h):
        if i not in seen:
            seen.add(i)
            out.append((slug, i))
    return out


def card(eid, slug="x"):
    """Парсер карточки — как в g04_census.py (11.10), сверенный тогда с AppView на 7 игроках."""
    h = curl(f"https://chromewebstore.google.com/detail/{slug}/{eid}?hl=en")
    r = {"id": eid}
    mt = re.search(r"<title>([^<]+)", h)
    r["title"] = H.unescape(mt.group(1).replace(" - Chrome Web Store", "").strip()) if mt else ""
    mu = re.search(r">([\d,\.]+\+?)\s*users<", h) or re.search(r"([\d,\.]+)\s*users", h)
    u = re.sub(r"[^\d]", "", mu.group(1)) if mu else ""
    r["users"] = int(u) if u else None
    ml = re.search(r'Languages</div><div>(.*?)</div></div></li>', h, re.S)
    langs = None
    if ml:
        blk = ml.group(1)
        mn = re.search(r"(\d+)\s+languages?", blk)
        if mn:
            langs = int(mn.group(1))
        elif re.sub(r"<[^>]+>", "", blk).strip():
            langs = 1
    r["langs"] = langs
    i = h.find('jsname="ij8cu"')
    desc_full = None
    if i > 0:
        j = h.find("</div>", i)
        ps = re.findall(r"<p[^>]*>(.*?)</p>", h[i:j], re.S)

        def clean(s):
            return H.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", "\n", s)))
        texts = [clean(p) for p in ps]
        if texts:
            desc_full = sum(len(t) for t in texts[1:]) if len(texts) > 1 else len(texts[0])
    r["desc_full"] = desc_full
    r["in_app"] = "Offers in-app purchases" in h
    mr = re.search(r"(\d\.\d) out of 5", h)
    r["rating"] = float(mr.group(1)) if mr else None
    mup = re.search(r"Updated</div><div>([^<]+)", h)
    r["updated"] = mup.group(1) if mup else ""
    mo = re.search(r"Offered by</div><div>([^<]+)", h)
    r["offered_by"] = H.unescape(mo.group(1)) if mo else ""
    r["slug"] = slug
    r["fetched"] = bool(h)
    r["date"] = "2026-11-16"
    return r


# --- сравнение имён (канон 1.2: порядок слов, служебные слова и форма слова отличием не считаются) — как в g04
STOP = {"to", "for", "a", "an", "the", "and", "as", "of", "in", "with", "your", "from", "into", "on", "by", "my",
        "any", "all", "&", "or", "via", "one", "click", "1", "more", "free"}
STEM = {"exporter": "export", "exporting": "export", "exported": "export", "exports": "export",
        "saver": "save", "saving": "save", "saved": "save", "saves": "save",
        "downloader": "download", "downloading": "download", "downloads": "download",
        "converter": "convert", "converting": "convert", "conversion": "convert", "chats": "chat",
        "conversations": "conversation", "pdfs": "pdf", "backups": "backup", "notes": "note",
        "importer": "import", "importing": "import", "printer": "print", "printing": "print", "docs": "doc",
        "sheets": "sheet", "spreadsheets": "spreadsheet", "responses": "response", "answers": "answer",
        "screenshots": "screenshot", "images": "image", "transferring": "transfer", "transfers": "transfer",
        "migrator": "migrate", "migration": "migrate", "memories": "memory", "tables": "table"}


def words(s):
    s = H.unescape(s)
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    s = s.lower().replace("chat gpt", "chatgpt").replace("chat-gpt", "chatgpt").replace("notebook lm", "notebooklm")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    out = []
    for w in s.split():
        w = STEM.get(w, w)
        if w.endswith("s") and len(w) > 3 and w not in ("this", "plus", "canvas", "docs", "sheets"):
            w = w[:-1]
        if w not in STOP:
            out.append(w)
    return out


def segments(title):
    return [x for x in re.split(r"\s*[:|()\[\],]\s*|\s+[-–—]\s+", title) if x.strip()]


def name_class(key, title):
    k = set(words(key))
    if not k:
        return "NO"
    n = set(words(title))
    if n == k:
        return "SAME"
    for seg in segments(title):
        if set(words(seg)) == k:
            return "SAME"
    if k <= n:
        return "CONTAINS"
    if k & n:
        return "PARTIAL"
    return "NO"


def opt(c):
    return (c.get("langs") or 0) > 30 and (c.get("desc_full") or 0) > 3000


def fmt(c):
    return f"{c.get('title', '')[:70]} · {c.get('users')} юз · {c.get('langs')} яз · {c.get('desc_full')} симв"


def do_search():
    p = os.path.join(OUT, 'search.json')
    res = json.load(open(p)) if os.path.exists(p) else {}
    qs = [(d, q) for d, fs in DOORS.items() for q in fs]
    for n, (d, q) in enumerate(qs, 1):
        if q in res:
            continue
        hits = store_search(q)
        res[q] = {"door": d, "hits": hits}
        print(f"{n}/{len(qs)} {q!r}: {len(hits)}", flush=True)
        json.dump(res, open(p, 'w'), ensure_ascii=False)
        time.sleep(0.3)


def do_cards():
    res = json.load(open(os.path.join(OUT, 'search.json')))
    cf = os.path.join(OUT, 'cards.json')
    cards = json.load(open(cf)) if os.path.exists(cf) else {}
    ids = {}
    for v in res.values():
        for s, i in v["hits"]:
            ids.setdefault(i, s)
    # калибровка: лидер ниши и наш ExportGPT (сверка с 11.10)
    ids.setdefault('ilmdofdhpnhffldihboadndccenlnfll', 'chatgpt-exporter-chatgpt')
    ids.setdefault('aighdeikamhkemngfanhnamdlpoceimo', 'export-chatgpt-conversati')
    todo = [(i, s) for i, s in ids.items() if i not in cards or not cards[i].get('fetched')]

    def work(a):
        i, s = a
        time.sleep(0.3)
        return card(i, s)
    with ThreadPoolExecutor(3) as ex:
        for n, r in enumerate(ex.map(work, todo), 1):
            cards[r["id"]] = r
            if n % 25 == 0:
                json.dump(cards, open(cf, 'w'), ensure_ascii=False)
                print("cards", n, "/", len(todo), flush=True)
    json.dump(cards, open(cf, 'w'), ensure_ascii=False)
    print('карточек', len(cards))


def pool():
    """Новые карточки 16.11 + карточки 11.10 (для дверей, снятых тогда). Свежие важнее старых."""
    old = json.load(open(OLD_CARDS)) if os.path.exists(OLD_CARDS) else {}
    for c in old.values():
        c.setdefault('date', '2026-10-11')
    new = json.load(open(os.path.join(OUT, 'cards.json')))
    p = dict(old)
    p.update(new)
    return {i: c for i, c in p.items() if c.get('title')}


def verdict(phrase, cards):
    hold = [c for c in cards.values() if name_class(phrase, c.get("title", "")) == "SAME"]
    o = [c for c in hold if opt(c)]
    unk = [c for c in hold if c.get("langs") is None or c.get("desc_full") is None]
    v = "занято" if o else ("неясно (карточка не разобрана)" if unk else ("держатель не оптимизирован" if hold else "держателя нет"))
    top = sorted(o or hold, key=lambda c: -(c.get("users") or 0))
    cont = sorted([c for c in cards.values() if name_class(phrase, c.get("title", "")) == "CONTAINS"], key=lambda c: -(c.get("users") or 0))
    return v, hold, top, cont


def do_analyze():
    res = json.load(open(os.path.join(OUT, 'search.json')))
    new = json.load(open(os.path.join(OUT, 'cards.json')))
    allc = pool()
    rows = []
    for q, v in res.items():
        for rank, (slug, i) in enumerate(v["hits"], 1):
            c = new.get(i, {})
            rows.append(dict(query=q, door=v['door'], rank=rank, title=c.get('title', ''), users=c.get('users'), langs=c.get('langs'),
                             desc_full=c.get('desc_full'), optimized=opt(c) if c else None, name_class=name_class(q, c.get('title', '')),
                             in_app=c.get('in_app'), rating=c.get('rating'), updated=c.get('updated'),
                             url=f"https://chromewebstore.google.com/detail/{slug}/{i}"))
    with open(os.path.join(HERE, 'census.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    z = []
    for q, v in res.items():
        verd, hold, top, cont = verdict(q, allc)
        z.append(dict(door=v['door'], phrase=q, verdict=verd, holders=len(hold), top_holder=fmt(top[0]) if top else '',
                      biggest_with_these_words=fmt(cont[0]) if cont else '', biggest_optimized=opt(cont[0]) if cont else '',
                      source='перепись 16.11'))
    with open(os.path.join(HERE, 'zanyatost.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(z[0]))
        w.writeheader()
        w.writerows(z)
    for r in z:
        print(f"{r['door'][:20]:20} {r['phrase'][:36]:36} {r['verdict'][:26]:26} {r['top_holder'][:80]}")
        if r['biggest_with_these_words'] and r['verdict'] != 'занято':
            print(f"{'':58}рядом: {r['biggest_with_these_words'][:90]}")
    # калибровка
    for i in ('ilmdofdhpnhffldihboadndccenlnfll', 'aighdeikamhkemngfanhnamdlpoceimo'):
        c = new.get(i, {})
        print('калибровка:', fmt(c), '· in_app', c.get('in_app'), '· updated', c.get('updated'))


QUAL = re.compile(r'\b(chrome|firefox|safari|edge|browser|extension|extensions|plugin|addon|add-on|free|online|app|tool)\b')


def per_key(keys_csv=None):
    """Статус двери для каждого ключа keys.csv → zanyatost_po_klyucham.json (по всему пулу карточек 16.11 + 11.10)."""
    sys.path.insert(0, HERE)
    allc = pool()
    old_z = {r['key']: r for r in csv.DictReader(open(OLD_ZAN))} if os.path.exists(OLD_ZAN) else {}
    res = json.load(open(os.path.join(OUT, 'search.json')))
    checked_new = {v['door'] for v in res.values()}
    cand = {r['key']: r for r in csv.DictReader(open(os.path.join(HERE, 'kandidaty.csv')))}
    covered_1110 = {'Word', 'Google Docs', 'Markdown', 'Notion', 'PDF и печать', 'Чат в файл, формат не назван',
                    'Картинка и скриншот', 'Текст (txt)', 'Obsidian', 'Соседи (не цель)', 'Бэкап и история'}
    group_door = {'Таблицы: Excel, CSV, Sheets': 'Таблицы: Excel, CSV', 'EPUB и Kindle': 'EPUB и Kindle',
                  'Память ChatGPT (адресат не назван)': 'Память ChatGPT'}
    out = {}
    q = re.compile(r'^(how|can|could|does|do|is|are|what|why|where|when|will|should|which|best way)\b')
    for k, c in cand.items():
        if c['noise'] or c['ads_ok'] != 'да':
            continue
        if q.search(k):
            out[k] = 'вопрос — в имя не идёт'
            continue
        g = c['group']
        name = re.sub(r'\s+', ' ', QUAL.sub(' ', k)).strip() or k   # «… chrome extension» — уточнение поиска, в имя не входит
        verd, hold, top, cont = verdict(name, allc)
        src = '16.11' if (group_door.get(g, g) in checked_new) else ('11.10' if g in covered_1110 else '')
        if not src and not hold:
            out[k] = '⬜ стор не проверял'
            continue
        if name in old_z and src != '16.11':
            k_old = name
        else:
            k_old = None
        if k_old:
            r = old_z[k_old]
            vv = {'occupied': 'занято', 'weak': 'держатель не оптимизирован', 'free': 'держателя нет'}.get(r['verdict'], r['verdict'])
            out[k] = f"{vv}: {r['top_holder']} (перепись 11.10)" if r['top_holder'] else f"{vv} (перепись 11.10)"
            continue
        d = (top[0].get('date') or '') if top else ''
        when = {'2026-11-16': '16.11', '2026-10-11': '11.10'}.get(d, src or '?')
        out[k] = f"{verd}: {fmt(top[0])} (перепись {when})" if top else f"{verd} (перепись {src or '?'}, по карточкам из поиска)"
    json.dump(out, open(os.path.join(HERE, 'zanyatost_po_klyucham.json'), 'w'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(Counter(v.split(':')[0].split(' (')[0] for v in out.values()))


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if step in ('search', 'all'):
        do_search()
    if step in ('cards', 'all'):
        do_cards()
    if step in ('analyze', 'all'):
        do_analyze()
    if step in ('perkey', 'all'):
        per_key()
