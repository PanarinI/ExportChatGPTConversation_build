#!/usr/bin/env python3
"""Таблица ключей Main / Extra для листинга ExportGPT (канон 2.1.3) — только из купленного 16.11, без сети.

Вход:  ../novye-vygruzki-2026-11-16/keys.csv (объёмы Google Ads США и мир за 12 мес ноя.25 → окт.26, KD DataForSEO 16.11).
Выход: kluchi.csv рядом. Запуск: python3 -I sobrat.py
"""
import csv, os, re

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
     'переезд в Claude: выдача «transfer…» 16.11 ✅ — гайды переезда целиком (память, история), софта 0; наш перенос — по одному чату 🔶',
     'вариация с хвостом to claude — новое место 1.2.10'),
    ('how to export chatgpt conversation as pdf', 'how to export chatgpt conversations as pdf (10)',
     'спрашивают, как получить PDF 🔶', 'хвост: as pdf; вопрос'),
    ('can you export chatgpt conversations', '', 'сомневаются, можно ли 🔶', 'хвост; вопрос → FAQ'),
    ('how to export chatgpt conversation as text', '', 'спрашивают про текст 🔶', 'хвост: text — Markdown это текст'),
    ('export chatgpt conversation chrome extension', '', 'ищут расширение 🔶', 'хвост: chrome extension'),
    ('export entire chatgpt conversation', '', 'весь чат целиком 🔶', 'хвост: entire — наш Whole chat'),
]
EXTRA = [
    ('transfer chatgpt to claude', '',
     'выдача 16.11 ✅: 8 из 8 — гайды переезда; ИИ-обзор — встроенный импорт памяти в Claude; софта 0',
     'Claude — самый большой новый спрос; честно: переносим разговор, не память'),
    ('how to save chatgpt conversation', 'how to save chatgpt conversations',
     'спрашивают, как сохранить 🔶; выдача «save chatgpt chat» 11.10 ✅: 8 из 8 — сохранить или выгрузить чат',
     'слово задачи save (не export)'),
    ('import chatgpt to claude', '', 'переезд в Claude 🔶 (как transfer)', 'Claude: слово import'),
    ('chatgpt to pdf', '', 'чат в PDF 🔶 по словам (выдача «chatgpt pdf» — про другое, это не она)', 'главная функция: PDF'),
    ('how to save chatgpt conversation as pdf', '', 'спрашивают, как сохранить в PDF 🔶', 'save + PDF; растёт'),
    ('how to download chatgpt conversation', '', 'спрашивают, как скачать 🔶', 'слово задачи download'),
    ('how to download a chatgpt conversation', '', 'спрашивают, как скачать 🔶', 'download; растёт'),
    ('print chatgpt conversation', '', 'хотят распечатать 🔶', 'слово задачи print'),
    ('chatgpt to word extension', '', 'ищут расширение для Word 🔶', 'Word'),
    ('chatgpt to google docs extension', '', 'ищут расширение для Google Docs 🔶', 'Google Docs — новое место 1.3.0'),
    ('chatgpt to markdown', '', 'выдача 11.10 ✅: 9 из 9 — чат в Markdown, софт 5 из 9', 'Markdown'),
    ('save chatgpt conversation', 'save chatgpt conversations', 'сохранить чат 🔶', 'save'),
    ('chatgpt to word', '',
     'выдача 16.11 ✅: 7 из 9 — перенести текст в Word без потери вида; ИИ-обзор начинает с надстройки ChatGPT для Word (другое)',
     'Word; в мире в 22 раза больше, чем в США'),
    ('chatgpt to notion', '',
     'выдача 16.11 ✅: 3 из 7 — сохранить чат в Notion расширением; 4 — интеграция и сравнение (другое)',
     'Notion — новое место 1.3.0'),
    ('chatgpt to obsidian', '', 'перенести в Obsidian 🔶 (выдачи нет; «obsidian chatgpt» — плагины внутри Obsidian, другое)',
     'Obsidian — новое место 1.3.0; спрос маленький'),
]
RESERVE = [
    ('how to transfer chatgpt to claude', '', 'вопрос о переезде 🔶', 'четвёртый ключ Claude — если не перегрузит текст'),
    ('export chatgpt conversation to claude', 'export chatgpt conversations to claude', 'переезд, один разговор 🔶', 'точный хвост названия'),
    ('export chatgpt conversation to markdown', '', 'чат в Markdown 🔶', 'точный хвост названия'),
    ('export chatgpt conversation to word', '', 'чат в Word 🔶', 'точный хвост названия'),
    ('how do i export chatgpt conversations', '', 'вопрос 🔶', 'хвост названия'),
    ('export chatgpt conversation extension', '', 'ищут расширение 🔶', 'хвост названия'),
    ('download chatgpt chat', '', 'скачать чат 🔶', 'KD DataForSEO 45 — самый высокий в таблице'),
    ('chatgpt to markdown extension', '', 'ищут расширение 🔶', 'падает'),
    ('how to save chatgpt chats', '', 'вопрос 🔶', 'save'),
    ('chatgpt to google docs', '', 'выдача 11.10 ✅: 4 из 8 — перенести ответ или таблицу в Docs', 'Google Docs'),
    ('chatgpt to pdf extension', '', 'ищут расширение 🔶', 'большой за год, но последние месяцы почти ноль — см. «сейчас»'),
    ('save chatgpt chrome extension', '', 'ищут расширение 🔶', 'то же: почти ноль сейчас'),
]

rows = {r['key']: r for r in csv.DictReader(open(SRC, encoding='utf-8'))}


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def line(kind, key, twins, who, why):
    r = rows.get(key)
    if not r:
        return {'group': kind, 'key': key, 'twins': twins, 'us_12m': '⬜', 'us_aug_oct': '⬜', 'world_12m': '⬜',
                'yoy': '⬜', 'kd_dfs': '⬜', 'who': who, 'why': why, 'trend': 'нет в замере 16.11'}
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
    kd = r['kd_dfs']
    if kd in ('', '⬜'):
        k2 = re.search(r'KD DFS 11\.10: (\d+)', r['notes'] or '')
        kd = (k2.group(1) + ' (11.10)') if k2 else '⬜'
    flag = ''
    if 'провал' in (r['notes'] or '') and 'extension' in key:
        flag = '; окт.: провал всех ключей со словом extension (причина ⬜)'
    return {'group': kind, 'key': key, 'twins': twins, 'us_12m': int(us), 'us_aug_oct': now,
            'world_12m': int(num(r['world_avg']) or 0), 'yoy': yoy, 'kd_dfs': kd,
            'who': who, 'why': why, 'trend': (r['trend_note'] or '') + flag}


out = [line('Main', *x) for x in MAIN] + [line('Extra', *x) for x in EXTRA] + [line('запас', *x) for x in RESERVE]
cols = ['group', 'key', 'twins', 'us_12m', 'us_aug_oct', 'world_12m', 'yoy', 'kd_dfs', 'who', 'why', 'trend']
with open(os.path.join(HERE, 'kluchi.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(out)
for o in out:
    print('%-6s %-48s %6s %6s %7s %-22s kd=%s' % (o['group'], o['key'][:48], o['us_12m'], o['us_aug_oct'], o['world_12m'], o['yoy'][:22], o['kd_dfs']))
print('Main', sum(o['us_12m'] for o in out if o['group'] == 'Main' and isinstance(o['us_12m'], int)),
      '· Extra', sum(o['us_12m'] for o in out if o['group'] == 'Extra' and isinstance(o['us_12m'], int)))
