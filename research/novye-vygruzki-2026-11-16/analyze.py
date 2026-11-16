#!/usr/bin/env python3
"""Сводка замера 2026-11-16 → keys.csv + svod.json. Без сети, всё из raw/ и kandidaty.csv.
Запуск: python3 -I analyze.py [--print]

Правила счёта (слово автора):
- среднее США и мир — за последние 12 месяцев (11.2025 → 10.2026), ряд США — все 12 месяцев;
- перестановки слов схлопнуты ДО сумм; склейки Google Ads (одинаковый ряд за 24 месяца + та же цена клика + тот же индекс
  конкуренции) считаются один раз; ступенька ноября 2025 помечается;
- «неясно» (голое «chatgpt + слово», смысл без выдачи не ясен) в сумму группы не входит, показан рядом;
- KD DataForSEO — только для порядка."""
import csv, json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
OLD_KD = os.path.expanduser('~/PycharmProjects/app-studio/research/probes/klassika-cws-2026-10-11/syrye/kd.json')
MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']


def series(name):
    out = {}
    for r in json.load(open(os.path.join(RAW, name)))['tasks'][0].get('result') or []:
        ms = {(m['year'], m['month']): (m.get('search_volume') or 0) for m in (r.get('monthly_searches') or [])}
        out[r['keyword']] = dict(ms=ms, cpc=r.get('cpc'), comp=r.get('competition_index'))
    return out


def kd_map(path):
    d = json.load(open(path))
    items = (d['tasks'][0].get('result') or [{}])[0].get('items') or []
    return {i['keyword']: i.get('keyword_difficulty') for i in items}


STOP = {'to', 'a', 'an', 'the', 'and', 'as', 'of', 'in', 'into', 'for', 'from', 'my', 'your', 'on', 'with'}
STEM = {'exporter': 'export', 'exporting': 'export', 'exports': 'export', 'chats': 'chat', 'conversations': 'conversation',
        'saving': 'save', 'saver': 'save', 'downloads': 'download', 'downloading': 'download', 'docs': 'doc', 'tables': 'table',
        'equations': 'equation', 'formulas': 'formula', 'screenshots': 'screenshot', 'images': 'image', 'responses': 'response',
        'answers': 'answer', 'files': 'file', 'extensions': 'extension'}


def normw(k):
    return tuple(sorted(STEM.get(w, w) for w in k.split() if w not in STOP))


def mean(xs):
    return sum(xs) / len(xs) if xs else 0


def trend(us12, prev_avg, labels):
    a = mean(us12)
    if a == 0:
        return 'нет объёма в США за 12 мес'
    f3, l3, pk = mean(us12[:3]), mean(us12[-3:]), max(us12)
    pm = labels[us12.index(pk)]
    if pk >= 3 * max(f3, l3, 1) and pk >= 100:
        t = f'волна: пик {pm} {pk}, сейчас ≈{l3:.0f}'
    elif f3 == 0 and l3 > 0:
        t = f'новый: с нуля до ≈{l3:.0f}'
    elif f3 == 0:
        t = f'редкий: был только в середине года (пик {pm} {pk})'
    elif l3 >= 1.3 * f3:
        t = f'растёт: ×{l3 / f3:.1f} (первые 3 мес → последние 3)'
    elif l3 <= 0.7 * f3:
        t = f'падает: ×{l3 / f3:.2f} (первые 3 мес → последние 3)'
    else:
        t = 'ровно'
    if prev_avg >= max(10, 0.1 * a):
        t += f'; год к году {(a / prev_avg - 1) * 100:+.0f}%'
    else:
        t += f'; год назад почти не было (≈{prev_avg:.0f} в мес)'
    return t


def step_nov2025(ms, months):
    """Ступенька ноября 2025: ноябрь ≥ ×2 к октябрю И ноябрь–январь ≥ ×2.5 к авг–окт И уровень держится."""
    i = months.index((2025, 11))
    pre = mean([ms.get(m, 0) for m in months[i - 3:i]])
    post = mean([ms.get(m, 0) for m in months[i:i + 3]])
    after = mean([ms.get(m, 0) for m in months[i:]])
    oct_, nov = ms.get(months[i - 1], 0), ms.get(months[i], 0)
    return pre >= 30 and nov >= 2 * max(oct_, 1) and post >= 2.5 * pre and after >= 2 * pre, pre


def build(store=None):
    cand = {r['key']: r for r in csv.DictReader(open(os.path.join(HERE, 'kandidaty.csv')))}
    us, mir = series('volume_us.json'), series('volume_world.json')
    kd = kd_map(os.path.join(RAW, 'kd_us.json'))
    kd_old = kd_map(OLD_KD) if os.path.exists(OLD_KD) else {}
    months = sorted({m for v in us.values() for m in v['ms']})
    last12, prev12 = months[-12:], months[:-12]
    labels = [f'{MON[m - 1]}.{str(y)[2:]}' for y, m in last12]

    rows = {}
    for k, v in us.items():
        c = cand.get(k, {})
        us12 = [v['ms'].get(m, 0) for m in last12]
        prev_avg = mean([v['ms'].get(m, 0) for m in prev12])
        w = mir.get(k, {'ms': {}})
        st, pre = step_nov2025(v['ms'], months)
        rows[k] = dict(key=k, group=c.get('group', '?'), block=c.get('block', ''), amb=c.get('ambiguous') == 'да',
                       flags=[f for f in (c.get('flags') or '').split('; ') if f], us12=us12, us_avg=mean(us12),
                       world_avg=mean([w['ms'].get(m, 0) for m in last12]), prev_avg=prev_avg,
                       world12=[w['ms'].get(m, 0) for m in last12],
                       s24=tuple(v['ms'].get(m, 0) for m in months), cpc=v['cpc'], comp=v['comp'],
                       kd=kd.get(k), kd_old=kd_old.get(k), step=st, pre=pre, rep=k, why='', labs=c.get('labs_us'),
                       ext_oct=('extension' in k and us12[-2] >= 50 and us12[-1] <= 0.3 * us12[-2]))

    # --- схлопывание: перестановки слов и склейки Google Ads (union-find)
    parent = {k: k for k in rows}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    by_perm, by_ser = defaultdict(list), defaultdict(list)
    for k, r in rows.items():
        by_perm[tuple(sorted(k.split()))].append(k)
        if sum(r['s24']) > 0:
            by_ser[(r['s24'], r['cpc'], r['comp'])].append(k)
    kind = {}
    for ks in by_perm.values():
        for k in ks[1:]:
            union(k, ks[0])
            kind[frozenset((k, ks[0]))] = 'perm'
    for (s24, cpc, comp), ks in by_ser.items():
        if len(ks) < 2:
            continue
        nontrivial = len(set(s24)) > 1 and mean(s24[-12:]) >= 20
        for a in ks:
            for b in ks:
                if a < b and (nontrivial or normw(a) == normw(b)):
                    union(a, b)
    clusters = defaultdict(list)
    for k in rows:
        clusters[find(k)].append(k)
    for ks in clusters.values():
        if len(ks) < 2:
            continue
        rep = sorted(ks, key=lambda k: (-rows[k]['us_avg'], rows[k]['amb'], len(k), k))[0]
        for k in ks:
            rows[k]['rep'] = rep
            if k != rep:
                perm_of = [m for m in ks if m != k and sorted(m.split()) == sorted(k.split())]
                same_as = [m for m in ks if m != k and rows[m]['s24'] == rows[k]['s24']]
                if sorted(k.split()) == sorted(rep.split()):
                    rows[k]['why'] = 'перестановка слов «%s»' % rep
                elif rows[k]['s24'] == rows[rep]['s24']:
                    rows[k]['why'] = 'склейка Google Ads с «%s» (одинаковый ряд)' % rep
                elif perm_of:
                    rows[k]['why'] = 'перестановка слов «%s» (та — в группе «%s»)' % (perm_of[0], rep)
                else:
                    rows[k]['why'] = 'склейка с «%s» через «%s»' % (rep, same_as[0] if same_as else '?')

    # --- занятость стора (census.py) — по ключу
    for k, r in rows.items():
        r['store'] = (store or {}).get(k, '')

    # --- сводка по группам
    groups = defaultdict(lambda: dict(keys=0, us=0.0, world=0.0, us_m=[0] * 12, prev=0.0, amb_us=0.0, amb_world=0.0,
                                      nav_us=0.0, amb_keys=[], top=[], merged=0, steps=[], sw_us=0.0, sw_world=0.0,
                                      sw_keys=[], ext_oct=[]))
    for k, r in rows.items():
        g = groups[r['group']]
        g['block'] = r['block']
        if r['rep'] != k:
            g['merged'] += 1
            continue
        if r['step']:
            g['steps'].append(k)
        if r['ext_oct']:
            g['ext_oct'].append(k)
        if r['amb']:
            g['amb_us'] += r['us_avg']
            g['amb_world'] += r['world_avg']
            g['amb_keys'].append(k)
            continue
        if 'переход (решение)' in r['flags']:
            g['sw_us'] += r['us_avg']
            g['sw_world'] += r['world_avg']
            g['sw_keys'].append(k)
            continue
        g['keys'] += 1
        g['us'] += r['us_avg']
        g['world'] += r['world_avg']
        g['prev'] += r['prev_avg']
        g['us_m'] = [a + b for a, b in zip(g['us_m'], r['us12'])]
        if 'имя чужого расширения' in r['flags']:
            g['nav_us'] += r['us_avg']
        g['top'].append(k)
    for name, g in groups.items():
        g['top'].sort(key=lambda k: -rows[k]['us_avg'])
        g['trend'] = trend(g['us_m'], g['prev'] / 1, labels) if g['us'] else 'нет объёма'
    return rows, groups, labels, months


def fmt_series(xs):
    return ' '.join(str(int(x)) for x in xs)


SERP_NOTES = {
    'chatgpt export': 'выдача 16.11: ИИ-обзор — родная выгрузка архива (Settings → Data controls → Export); 8 из 8 страниц про выгрузку чатов: 5 — один чат (PDF/Word, exportgpt.pro, приложение), 2 — архив целиком, 1 — CLI-инструмент',
    'chatgpt exporter': 'одна группа Google Ads с «chatgpt export» — выдача той в serp.md',
    'chatgpt export data': 'выдача 16.11: ИИ-обзор — родная выгрузка; 4 из 7 страниц про родную выгрузку архива (долго, письмом), 3 — инструменты выгрузки чатов',
    'chatgpt to word': 'выдача 16.11: 7 из 9 страниц — перенести текст ChatGPT в Word (вставка с форматированием, таблицы, конвертеры); ИИ-обзор начинает с надстройки ChatGPT для Word',
    'transfer chatgpt to claude': 'выдача 16.11: 8 из 8 — гайды переезда; ИИ-обзор — встроенный импорт памяти в Claude и выгрузка архива ChatGPT; софта 0',
    'import chatgpt to gemini': 'выдача 16.11: 8 из 8 про импорт, половина — новости о встроенном импорте в Gemini; софта 0',
    'how to continue chatgpt conversation in new chat': 'выдача 16.11: ИИ-обзор — встроенная функция ChatGPT «Branch in new chat»; по делу 3–4 из 7, софта 0',
    'chatgpt screenshot': 'выдача 16.11: 2 из 8 — расширения-скриншотеры чата; остальное — скриншот В ChatGPT и картинки интерфейса',
    'chatgpt to notion': 'выдача 16.11: 3 из 7 — сохранить чат в Notion (расширения); 4 — интеграция и сравнение',
    'chatgpt archive': 'выдача 16.11: 6 из 7 — функция «Архив» в самом ChatGPT (найти архивные чаты), не бэкап',
    'obsidian chatgpt': 'выдача 16.11: 7 из 8 — ChatGPT внутри Obsidian (плагины); 1 — сохранить разговоры',
    'chatgpt pdf': 'выдача 16.11: 1 из 9 — выгрузка чата в PDF; остальное — загрузить PDF в ChatGPT',
    'chatgpt to markdown': 'выдача 11.10: 9 из 9 — чат в Markdown, софт 5 из 9',
    'chatgpt to google docs': 'выдача 11.10: 4 из 8 — перенести ответ или таблицу в Docs; 4 — ChatGPT внутри Docs',
    'save chatgpt chat': 'выдача 11.10: 8 из 8 — сохранить или выгрузить чат; софт 2 из 8',
}
OTHER_MEANING = {'chatgpt archive', 'obsidian chatgpt', 'chatgpt pdf', 'chatgpt screenshot'}


def write_keys(rows, labels):
    out = []
    for k, r in rows.items():
        notes = []
        if k in OTHER_MEANING:
            notes.append('по выдаче смысл в основном другой — в сумму группы не входит')
        elif r['amb']:
            notes.append('неясно без выдачи — в сумму группы не входит')
        if k in SERP_NOTES:
            notes.append(SERP_NOTES[k])
        if r['why']:
            notes.append(r['why'] + ' — в сумме один раз')
        if r['step']:
            notes.append(f"ступенька 11.2025 (до неё ≈{r['pre']:.0f}) — похоже на склейку Google Ads")
        if r['ext_oct']:
            notes.append('окт. 2026: провал, как у 13 из 13 крупных запросов со словом extension (сен→окт, медиана ×0,14) — последний месяц под вопросом')
        if 'Export ChatGPT Conversation · 768' in (r['store'] or ''):
            notes.append('держатель — наш ExportGPT (карточка 16.11: 962 юз · 51 яз · 3 722 симв)')
        if k == 'chatgpt exporter':
            notes.append('так называется лидер ниши (ChatGPT Exporter, 200 000) — часть поиска навигационная 🔶')
        notes += r['flags']
        if r['kd_old'] is not None:
            notes.append(f"KD DFS 11.10: {r['kd_old']}")
        notes.append(f"год назад (11.24–10.25) ≈{r['prev_avg']:.0f}")
        out.append(dict(key=k, group=r['group'], us_avg=round(r['us_avg']), world_avg=round(r['world_avg']),
                        us_12_months=fmt_series(r['us12']), trend_note=trend(r['us12'], r['prev_avg'], labels),
                        kd_dfs='⬜' if r['kd'] is None else r['kd'], store_door_status=r['store'], notes='; '.join(notes)))
    order = {g: i for i, g in enumerate(GROUP_ORDER)}
    out.sort(key=lambda x: (order.get(x['group'], 99), -x['us_avg'], x['key']))
    with open(os.path.join(HERE, 'keys.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    return out


GROUP_ORDER = ['Word', 'Google Docs', 'Markdown', 'Obsidian', 'Notion', 'Текст (txt)', 'HTML', 'JSON', 'Картинка и скриншот',
               'Таблицы: Excel, CSV, Sheets', 'EPUB и Kindle', 'PowerPoint и Canva', 'Несколько форматов (имена расширений)',
               'Claude', 'Gemini', 'NotebookLM', 'Новый чат', 'Память ChatGPT (адресат не назван)',
               'Бэкап и история', 'Другой аккаунт ChatGPT',
               'PDF и печать', 'Чат в файл, формат не назван', 'Соседи (не цель)', '?']


def load_store():
    p = os.path.join(HERE, 'zanyatost_po_klyucham.json')
    return json.load(open(p)) if os.path.exists(p) else {}


if __name__ == '__main__':
    rows, groups, labels, months = build(load_store())
    write_keys(rows, labels)
    svod = dict(labels=labels, groups={n: {kk: vv for kk, vv in g.items()} for n, g in groups.items()})
    for n, g in svod['groups'].items():
        g['top'] = [dict(key=k, us=round(rows[k]['us_avg']), world=round(rows[k]['world_avg']), us12=rows[k]['us12'],
                         kd=rows[k]['kd'], trend=trend(rows[k]['us12'], rows[k]['prev_avg'], labels), flags=rows[k]['flags'],
                         store=rows[k]['store'])
                    for k in g['top'][:8]]
        g['amb_keys'] = [dict(key=k, us=round(rows[k]['us_avg']), world=round(rows[k]['world_avg'])) for k in
                         sorted(g['amb_keys'], key=lambda k: -rows[k]['us_avg'])]
    with open(os.path.join(HERE, 'svod.json'), 'w') as f:
        json.dump(svod, f, ensure_ascii=False, indent=1)
    if '--print' in sys.argv:
        print('месяцы:', ' '.join(labels))
        for n in sorted(groups, key=lambda n: -groups[n]['us']):
            g = groups[n]
            print(f"\n## {n} [{g['block']}] · ключей {g['keys']} · США {g['us']:.0f} · мир {g['world']:.0f} · "
                  f"год назад США {g['prev']:.0f} · из них имена чужих расш. {g['nav_us']:.0f} · неясно {g['amb_us']:.0f}/{g['amb_world']:.0f}"
                  f" · переход {g['sw_us']:.0f}/{g['sw_world']:.0f} · склеено {g['merged']} · ступеньки {len(g['steps'])} · extension-провал {len(g['ext_oct'])}")
            print(f"   ряд США: {fmt_series(g['us_m'])} · {g['trend']}")
            for k in g['top'][:6]:
                r = rows[k]
                print(f"   {r['us_avg']:6.0f} / {r['world_avg']:6.0f} · KD {r['kd']} · {k} · [{fmt_series(r['us12'])}]")
            if g['amb_keys']:
                print('   неясно:', ', '.join(f"{k} {rows[k]['us_avg']:.0f}" for k in sorted(g['amb_keys'], key=lambda k: -rows[k]['us_avg'])[:6]))
        st = [k for k, r in rows.items() if r['step']]
        print('\nступенька 11.2025:', st)
