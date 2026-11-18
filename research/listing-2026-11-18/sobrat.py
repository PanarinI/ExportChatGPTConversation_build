#!/usr/bin/env python3
"""Таблица ключей Main / Extra для листинга ExportGPT (канон 2.1.3) — из купленного 16.11 и выдач 18.11 (serp.md), без сети.

Вход:  ../novye-vygruzki-2026-11-16/keys.csv (объёмы Google Ads США и мир за 12 мес ноя.25 → окт.26);
       KD 18.11 — raw/kd-dfs.json (DataForSEO), raw/semrush-bulk-2026-11-18.tsv (Semrush ноябрь),
       raw/semrush-kd-mesyacy-2026-11-18.tsv (Semrush август–октябрь, 10 голов).
Выход: kluchi.csv рядом. Запуск: python3 -I sobrat.py  (с --md печатает таблицы для README)
"""
import csv, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'novye-vygruzki-2026-11-16', 'keys.csv')

# (ключ, склейки — та же группа Google Ads или перестановка слов, кто ищет, зачем)
MAIN = [
    ('export chatgpt conversation', 'export chatgpt conversations · chatgpt export conversation(s) · chatgpt conversation export',
     'ищут именно выгрузку чата — ключ нашего названия, держим его мы (карточка 16.11) 🔶 по словам',
     'ключ названия: точное вхождение 7–10 раз (канон 2.1.4)'),
    ('chatgpt export', 'chatgpt exporter · export chatgpt',
     'выдача 16.11 ✅: 8 из 8 по делу, 5 — один чат в файл, 2 — архив целиком; «ChatGPT Exporter» — ещё и имя лидера ниши 🔶',
     'самый крупный ключ замера; голова названия — вариация без conversation'),
    ('how to export chatgpt conversation', 'how to export chatgpt conversations · chatgpt how to export conversation',
     'спрашивают, как сделать 🔶 по словам', 'хвост ключа названия; вопрос → FAQ'),
    ('chatgpt export extension', '',
     'ищут расширение 🔶 по словам', 'вариация с хвостом extension'),
    ('chatgpt export chat', 'chatgpt export chats · export chatgpt chat · chatgpt chat export',
     'выгрузка чата; chat = conversation словами людей 🔶', 'вариация: chat вместо conversation'),
    ('how to export a chatgpt conversation', '', 'спрашивают, как сделать 🔶', 'хвост ключа названия; вопрос → FAQ'),
    ('how to export chatgpt chat', '', 'спрашивают, как сделать 🔶', 'вариация chat; вопрос'),
    ('export chatgpt conversation to pdf', '', 'чат в PDF 🔶 по словам', 'хвост: PDF'),
    ('how to export chatgpt conversation to pdf', '', 'спрашивают, как получить PDF 🔶', 'хвост: PDF; вопрос'),
    ('export chatgpt to claude', '',
     'выдача 18.11 ✅: 5 из 7 — переезд целиком (память и история; ИИ-обзор — встроенный импорт памяти Claude); 1 из 7 — ровно '
     'наше: «продолжить разговор ChatGPT в Claude» (memdex.ai); 1 — Reddit: свой инструмент выгрузки памяти',
     'вариация с хвостом to claude — новое место 1.2.10; теперь единственный ключ Claude в таблице (transfer и import ушли); '
     'честно: переносим разговор, не память'),
    ('how to export chatgpt conversation as pdf', 'how to export chatgpt conversations as pdf (10)',
     'спрашивают, как получить PDF 🔶', 'хвост: as pdf; вопрос'),
    ('can you export chatgpt conversations', '', 'сомневаются, можно ли 🔶', 'хвост; вопрос → FAQ'),
    ('how to export chatgpt conversation as text', '', 'спрашивают про текст 🔶', 'хвост: text — Markdown это текст'),
    ('export chatgpt conversation chrome extension', '', 'ищут расширение 🔶', 'хвост: chrome extension'),
    ('export entire chatgpt conversation', '', 'весь чат целиком 🔶', 'хвост: entire — наш Whole chat'),
]
EXTRA = [
    ('download chatgpt chat', 'chatgpt chat download',
     'скачать чат 🔶 по словам (своей выдачи нет)',
     '↔ вместо transfer chatgpt to claude, из Запаса: растёт весь год (×2), сейчас ≈113; слово задачи download'),
    ('how to save chatgpt conversation', 'how to save chatgpt conversations',
     'выдача 18.11 ✅: 5 из 7 — сохранить один чат (расширение в CWS, гайды, видео про PDF, HTML-файл); 2 из 7 — весь аккаунт '
     '(справка OpenAI, Reddit «все мои разговоры»); ИИ-обзор делит: один чат · вся история · архив',
     'слово задачи save (не export)'),
    ('how to save chatgpt chats', 'chatgpt how to save chats',
     'спрашивают, как сохранить чаты 🔶 по словам (своей выдачи нет; у how to save chatgpt conversation — 5 из 7 про один чат)',
     '↔ вместо import chatgpt to claude, из Запаса: ровно ≈70 в месяц весь год; save'),
    ('chatgpt to pdf', '',
     'выдача 18.11 ✅: 8 из 8 — чат в PDF: 3 инструмента (сайт, приложение Google Play, видео про PDFCrowd) и 5 «как сделать» '
     '(Reddit, YouTube, Facebook); ИИ-обзор — печать в PDF, расширения, конвертеры',
     'главная функция: PDF; не путать с «chatgpt pdf» — там загружают PDF в ChatGPT'),
    ('how to save chatgpt conversation as pdf', '', 'спрашивают, как сохранить в PDF 🔶', 'save + PDF; растёт'),
    ('how to download chatgpt conversation', '',
     'выдача 18.11 ✅: 5 из 7 — скачать один чат (Reddit: «весь разговор, а не пересказ»; расширение в CWS, 2 сайта-выгрузчика, '
     'видео про PDF и Word); 2 из 7 — все разговоры разом (справка OpenAI, скрипт на GitHub)',
     'слово задачи download'),
    ('how to download a chatgpt conversation', '', 'спрашивают, как скачать 🔶 (та же фраза без a — выдача ✅, 5 из 7 про один чат)',
     'download; растёт'),
    ('print chatgpt conversation', '',
     'выдача 18.11 ✅: 9 из 9 по делу — как распечатать, сохранить или выгрузить чат (3 гайда, 6 видео; одно — про «ExportGPT», '
     'наше ли — ⬜); ИИ-обзор — печать браузера (Ctrl+P), ссылка, расширение',
     'слово задачи print'),
    ('chatgpt to word extension', '',
     'выдача 18.11 ✅: 7 из 9 — чат в Word расширением (первое — чужое «ChatGPT to Word or PDF»; Reddit — «весь разговор в Word '
     'или PDF»); 2 из 9 — официальная надстройка ChatGPT for Word (другое)',
     'Word'),
    ('chatgpt to google docs extension', '',
     'выдача 18.11 ✅: пополам — 4 из 8 вынести чат в Docs (2 расширения в CWS, 2 гайда), 4 из 8 — ChatGPT внутри Docs '
     '(дополнения, «как добавить ChatGPT в Docs»)',
     'Google Docs — новое место 1.3.0; в тексте — «чат в Google Docs», не «ChatGPT в Docs»'),
    ('chatgpt to markdown', '', 'выдача 11.10 ✅: 9 из 9 — чат в Markdown, софт 5 из 9', 'Markdown'),
    ('save chatgpt conversation', 'save chatgpt conversations', 'сохранить чат 🔶', 'save'),
    ('chatgpt to word', '',
     'выдача 16.11 ✅: 7 из 9 — перенести текст в Word без потери вида; ИИ-обзор начинает с надстройки ChatGPT для Word (другое)',
     'Word; в мире в 22 раза больше, чем в США'),
    ('chatgpt to notion', '',
     'выдача 16.11 ✅: 3 из 7 — сохранить чат в Notion расширением; 4 — интеграция и сравнение (другое)',
     'Notion — новое место 1.3.0'),
    ('chatgpt to markdown extension', '',
     'ищут расширение 🔶 по словам (своей выдачи нет; у chatgpt to markdown — 9 из 9 по делу)',
     '↔ вместо chatgpt to obsidian, из Запаса: заметки Obsidian — это файлы Markdown'),
]
RESERVE = [
    ('export chatgpt conversation to claude', 'export chatgpt conversations to claude', 'один разговор в Claude 🔶 по словам',
     'точный хвост названия; Claude на уровне разговора'),
    ('transfer chats from chatgpt to claude', '', 'перенести чаты в Claude 🔶 по словам (выдачи нет)',
     'новый кандидат 18.11, в таблице не было: единственный ключ Claude, что растёт после волны (авг–окт: 170 · 210 · 210); '
     'слово chats — ровно наш перенос; выдача ≈$0,002 решит'),
    ('export chatgpt conversation to markdown', '', 'чат в Markdown 🔶', 'точный хвост названия'),
    ('export chatgpt conversation to word', '', 'чат в Word 🔶', 'точный хвост названия'),
    ('how do i export chatgpt conversations', '', 'вопрос 🔶', 'хвост названия'),
    ('export chatgpt conversation extension', '', 'ищут расширение 🔶', 'хвост названия'),
    ('chatgpt to google docs', '', 'выдача 11.10 ✅: 4 из 8 — перенести ответ или таблицу в Docs', 'Google Docs'),
    ('chatgpt to pdf extension', '', 'ищут расширение 🔶', 'большой за год, но падает весь год: 1300 в ноябре 2025 → 30 в октябре 2026'),
    ('save chatgpt chrome extension', '', 'ищут расширение 🔶', 'почти ноль с сентября'),
]
# Вышли из Main / Extra / Запаса по выдаче 18.11: ищут другое
NE_VZYALI = [
    ('transfer chatgpt to claude', '',
     'выдача 16.11 ✅: 8 из 8 — переезд целиком (память, данные, «перенести всё»); софта 0',
     'было Extra 1 → замена download chatgpt chat'),
    ('import chatgpt to claude', '',
     'выдача 18.11 ✅: 6 из 6 — встроенный импорт памяти Claude и переезд целиком; софта 0',
     'было Extra 3 → замена how to save chatgpt chats'),
    ('how to transfer chatgpt to claude', '',
     'вопрос о переезде 🔶 — те же слова, что у transfer chatgpt to claude (8 из 8 — переезд)',
     'был в Запасе'),
    ('chatgpt to obsidian', '',
     'выдача 18.11 ✅: 5 из 7 — ChatGPT внутри Obsidian (плагины, GitHub, видео); выгрузить чат в Obsidian — 2 из 7 (форум, расширение в CWS)',
     'было Extra 15 → замена chatgpt to markdown extension'),
]

rows = {r['key']: r for r in csv.DictReader(open(SRC, encoding='utf-8'))}


def tsv(name):
    p = os.path.join(HERE, 'raw', name)
    if not os.path.exists(p):
        return []
    return list(csv.DictReader([x for x in open(p, encoding='utf-8') if not x.startswith('#')], delimiter='\t'))


# KD (правило автора 18.11: KD реальный = наибольшее из Semrush ноябрь, Semrush август–октябрь и DataForSEO):
# DataForSEO 18.11 — raw/kd-dfs.json (serp.py kd) · Semrush ноябрь — Bulk Analysis · Semrush авг–окт — Keyword Overview с date=
KD_DFS, KD_NOW, KD_MES = {}, {}, {}
_p = os.path.join(HERE, 'raw', 'kd-dfs.json')
if os.path.exists(_p):
    for it in (json.load(open(_p))['tasks'][0]['result'][0].get('items') or []):
        KD_DFS[it['keyword']] = it.get('keyword_difficulty')
for r in tsv('semrush-bulk-2026-11-18.tsv'):
    KD_NOW[r['keyword']] = int(r['kd']) if r['kd'] else None
for r in tsv('semrush-kd-mesyacy-2026-11-18.tsv'):
    KD_MES.setdefault(r['keyword'], []).append((r['month'], int(r['kd']) if r['kd'] else None))
MES_RU = {'202608': 'авг', '202609': 'сен', '202610': 'окт'}


def kd_fields(key):
    dfs, now, mes = KD_DFS.get(key), KD_NOW.get(key), KD_MES.get(key)
    vals = [v for _, v in (mes or []) if v is not None]
    if mes:
        months = ' · '.join(MES_RU[m] for m, _ in sorted(mes))
        aug_oct = ('%d (%s)' % (max(vals), months)) if vals else 'n/a (%s)' % months
    else:
        aug_oct = 'не снимали'
    nums = [v for v in [now, dfs] + vals if v is not None]
    if vals:
        cov = '✅ Semrush ноя + авг–окт' + (' + DFS' if dfs is not None else '')
    elif mes:
        cov = '🔶 только DFS: Semrush KD не знает ни в одном месяце' if dfs is not None else '⬜ нет ни у кого'
    elif now is not None and dfs is not None:
        cov = '🔶 Semrush ноя + DFS; месяцы не сняты'
    elif now is not None:
        cov = '🔶 только Semrush ноя'
    elif dfs is not None:
        cov = '🔶 только DFS: Semrush KD не знает'
    else:
        cov = '⬜ нет ни у кого'
    return {'kd_semrush_now': now if now is not None else 'n/a', 'kd_semrush_aug_oct': aug_oct,
            'kd_dfs': dfs if dfs is not None else 'n/a', 'kd_real': max(nums) if nums else '⬜', 'kd_covers': cov}


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def line(kind, key, twins, who, why):
    r = rows.get(key)
    if not r:
        return dict({'group': kind, 'key': key, 'twins': twins, 'us_12m': '⬜', 'us_aug_oct': '⬜', 'world_12m': '⬜',
                     'yoy': '⬜', 'who': who, 'why': why, 'trend': 'нет в замере 16.11'}, **kd_fields(key))
    m = [num(v) for v in r['us_12_months'].split()]
    now = round(sum(m[-3:]) / 3) if len(m) == 12 and all(v is not None for v in m[-3:]) else ''
    year_ago = re.search(r'год назад \(11\.24–10\.25\) ≈(\d+)', r['notes'] or '')
    us = num(r['us_avg']) or 0
    if year_ago:
        ya = int(year_ago.group(1))
        yoy = ('новый (год назад ≈%d)' % ya) if ya < 10 else '%+d %%' % round((us / ya - 1) * 100)
    else:
        mm = re.search(r'год к году ([+−-]?\d+)%', r['trend_note'] or '')
        yoy = (mm.group(1) + ' %') if mm else '⬜'
    flag = ''
    if 'провал' in (r['notes'] or '') and 'extension' in key:
        flag = '; окт.: провал всех ключей со словом extension (причина ⬜)'
    return dict({'group': kind, 'key': key, 'twins': twins, 'us_12m': int(us), 'us_aug_oct': now,
                 'world_12m': int(num(r['world_avg']) or 0), 'yoy': yoy,
                 'who': who, 'why': why, 'trend': (r['trend_note'] or '') + flag}, **kd_fields(key))


out = ([line('Main', *x) for x in MAIN] + [line('Extra', *x) for x in EXTRA] + [line('запас', *x) for x in RESERVE]
       + [line('не взяли', *x) for x in NE_VZYALI])
cols = ['group', 'key', 'twins', 'us_12m', 'us_aug_oct', 'world_12m', 'yoy', 'kd_semrush_now', 'kd_semrush_aug_oct', 'kd_dfs',
        'kd_real', 'kd_covers', 'who', 'why', 'trend']
with open(os.path.join(HERE, 'kluchi.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(out)


def kd_short(o):
    return '%s %s' % (o['kd_real'], o['kd_covers'][0]) if o['kd_real'] != '⬜' else '⬜'


if '--md' not in sys.argv:
    for o in out:
        print('%-8s %-44s %5s %5s | KD ноя %-4s авг–окт %-22s DFS %-4s → %-4s %s' % (
            o['group'], o['key'][:44], o['us_12m'], o['us_aug_oct'], o['kd_semrush_now'], o['kd_semrush_aug_oct'], o['kd_dfs'],
            o['kd_real'], o['kd_covers']))
    print('Main', sum(o['us_12m'] for o in out if o['group'] == 'Main' and isinstance(o['us_12m'], int)),
          '· Extra', sum(o['us_12m'] for o in out if o['group'] == 'Extra' and isinstance(o['us_12m'], int)))
else:
    for kind in ('Main', 'Extra'):
        print('\n## %s' % kind)
        i = 0
        for o in out:
            if o['group'] != kind:
                continue
            i += 1
            tw = ' (= %s)' % o['twins'] if o['twins'] else ''
            print('| %d | `%s`%s | %s | %s | %s | %s | %s | %s | %s |' % (
                i, o['key'], tw, o['us_12m'], o['us_aug_oct'], o['world_12m'], o['yoy'], kd_short(o), o['who'], o['why']))
    for kind in ('запас', 'не взяли'):
        print('\n## %s' % kind)
        for o in out:
            if o['group'] == kind:
                print('- `%s` — %s в мес (сейчас %s), мир %s, KD %s · %s' % (
                    o['key'], o['us_12m'], o['us_aug_oct'], o['world_12m'], kd_short(o), o['why']))
    print('\n## KD')
    for o in out:
        print('| `%s` | %s | %s | %s | %s | **%s** | %s |' % (
            o['key'], o['group'], o['kd_semrush_now'], o['kd_semrush_aug_oct'], o['kd_dfs'], o['kd_real'], o['kd_covers']))
