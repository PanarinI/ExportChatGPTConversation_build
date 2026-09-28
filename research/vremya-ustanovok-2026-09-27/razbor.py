#!/usr/bin/env python3
"""Когда ставят ExportGPT: дни недели и часы по МЕСТНОМУ времени, первая десятка стран.

Вопрос автора (27.09): видны ли временные паттерны установок по странам — например, «в среду вечером
в США заходят значимо чаще»?

Источник часов — GA4 (ресурс 540507186), событие `first_visit` на странице приветствия
`/ExportChatGPTConversation/`: она открывается сама сразу после установки. У события есть час
(в поясе ресурса — America/Los_Angeles), страна, регион и город. Стор (CWS) даёт только дни, и
в каком поясе он их режет — не сказано; поэтому стор здесь — для сверки, что событие = установка.

    python3 research/vremya-ustanovok-2026-09-27/razbor.py

Вход: ga4_first_visit_dateHour_country_region_city.csv (выгружен 27.09 этим же днём, см. README),
выгрузки CWS из ~/Downloads. Выход — печать + tablitsy.csv. Ничего не платно.
"""
import csv, math, os, random, datetime as dt
from collections import Counter, defaultdict
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.expanduser("~/Downloads")
LA = ZoneInfo("America/Los_Angeles")
random.seed(20260927)

# ── пояса: страна → зона; для многопоясных — по региону GA4 ─────────────
COUNTRY_TZ = {
    "United States": "America/Chicago", "Brazil": "America/Sao_Paulo", "Russia": "Europe/Moscow",
    "India": "Asia/Kolkata", "Japan": "Asia/Tokyo", "South Korea": "Asia/Seoul",
    "Indonesia": "Asia/Jakarta", "China": "Asia/Shanghai", "Taiwan": "Asia/Taipei",
    "Vietnam": "Asia/Ho_Chi_Minh", "Germany": "Europe/Berlin", "United Kingdom": "Europe/London",
    "France": "Europe/Paris", "Spain": "Europe/Madrid", "Italy": "Europe/Rome", "Turkey": "Europe/Istanbul",
    "Ukraine": "Europe/Kyiv", "Poland": "Europe/Warsaw", "Netherlands": "Europe/Amsterdam",
    "Mexico": "America/Mexico_City", "Canada": "America/Toronto", "Australia": "Australia/Sydney",
    "Hong Kong": "Asia/Hong_Kong", "Singapore": "Asia/Singapore", "Thailand": "Asia/Bangkok",
    "Philippines": "Asia/Manila", "Malaysia": "Asia/Kuala_Lumpur", "Pakistan": "Asia/Karachi",
    "Bangladesh": "Asia/Dhaka", "Kazakhstan": "Asia/Almaty", "Uzbekistan": "Asia/Tashkent",
    "Israel": "Asia/Jerusalem", "Egypt": "Africa/Cairo", "Saudi Arabia": "Asia/Riyadh",
    "United Arab Emirates": "Asia/Dubai", "Iran": "Asia/Tehran", "Argentina": "America/Argentina/Buenos_Aires",
    "Colombia": "America/Bogota", "Peru": "America/Lima", "Chile": "America/Santiago",
    "Belarus": "Europe/Minsk", "Georgia": "Asia/Tbilisi", "Portugal": "Europe/Lisbon",
    "Sweden": "Europe/Stockholm", "Switzerland": "Europe/Zurich", "Austria": "Europe/Vienna",
    "Belgium": "Europe/Brussels", "Czechia": "Europe/Prague", "Romania": "Europe/Bucharest",
    "Greece": "Europe/Athens", "Hungary": "Europe/Budapest", "South Africa": "Africa/Johannesburg",
    "Nigeria": "Africa/Lagos", "Kenya": "Africa/Nairobi", "Morocco": "Africa/Casablanca",
    "Algeria": "Africa/Algiers", "Nepal": "Asia/Kathmandu", "Sri Lanka": "Asia/Colombo",
    "Cambodia": "Asia/Phnom_Penh", "New Zealand": "Pacific/Auckland", "Ireland": "Europe/Dublin",
    "Denmark": "Europe/Copenhagen", "Norway": "Europe/Oslo", "Finland": "Europe/Helsinki",
    # GA4 пишет названия по-своему («Türkiye», «Czechia») — ключи сверены с выгрузкой
    "Türkiye": "Europe/Istanbul", "Laos": "Asia/Vientiane", "Jordan": "Asia/Amman",
    "Kyrgyzstan": "Asia/Bishkek", "Tajikistan": "Asia/Dushanbe", "Azerbaijan": "Asia/Baku",
    "Armenia": "Asia/Yerevan", "Serbia": "Europe/Belgrade", "Croatia": "Europe/Zagreb",
    "Bulgaria": "Europe/Sofia", "Lithuania": "Europe/Vilnius", "Latvia": "Europe/Riga",
    "Estonia": "Europe/Tallinn", "Slovakia": "Europe/Bratislava", "Cyprus": "Asia/Nicosia",
    "Iraq": "Asia/Baghdad", "Yemen": "Asia/Aden", "Tunisia": "Africa/Tunis", "Ecuador": "America/Guayaquil",
    "Venezuela": "America/Caracas", "Guatemala": "America/Guatemala", "Honduras": "America/Tegucigalpa",
    "Dominican Republic": "America/Santo_Domingo", "Panama": "America/Panama",
    "Puerto Rico": "America/Puerto_Rico", "Bolivia": "America/La_Paz", "Uruguay": "America/Montevideo",
    "Paraguay": "America/Asuncion", "Costa Rica": "America/Costa_Rica", "Myanmar (Burma)": "Asia/Yangon",
    "Mongolia": "Asia/Ulaanbaatar", "Angola": "Africa/Luanda", "Ethiopia": "Africa/Addis_Ababa",
    "Ghana": "Africa/Accra", "Tanzania": "Africa/Dar_es_Salaam", "Uganda": "Africa/Kampala",
    "Qatar": "Asia/Qatar", "Kuwait": "Asia/Kuwait", "Oman": "Asia/Muscat", "Bahrain": "Asia/Bahrain",
    "Lebanon": "Asia/Beirut", "Moldova": "Europe/Chisinau", "Slovenia": "Europe/Ljubljana",
    "Luxembourg": "Europe/Luxembourg", "Macao": "Asia/Macau",
}
US_TZ = {}
for zone, states in {
    "America/New_York": "Connecticut Delaware Florida Georgia Maine Maryland Massachusetts Michigan New_Hampshire "
                        "New_Jersey New_York North_Carolina Ohio Pennsylvania Rhode_Island South_Carolina Vermont "
                        "Virginia West_Virginia District_of_Columbia Washington_D.C. Indiana Kentucky",
    "America/Chicago": "Alabama Arkansas Illinois Iowa Kansas Louisiana Minnesota Mississippi Missouri Nebraska "
                       "North_Dakota Oklahoma South_Dakota Tennessee Texas Wisconsin",
    "America/Denver": "Colorado Montana New_Mexico Utah Wyoming Idaho",
    "America/Phoenix": "Arizona",
    "America/Los_Angeles": "California Nevada Oregon Washington",
    "America/Anchorage": "Alaska",
    "Pacific/Honolulu": "Hawaii",
}.items():
    for s in states.split():
        US_TZ[s.replace("_", " ")] = zone
REGION_TZ = {
    "Canada": {"British Columbia": "America/Vancouver", "Alberta": "America/Edmonton",
               "Saskatchewan": "America/Regina", "Manitoba": "America/Winnipeg",
               "Nova Scotia": "America/Halifax", "New Brunswick": "America/Moncton",
               "Newfoundland and Labrador": "America/St_Johns"},
    "Australia": {"Western Australia": "Australia/Perth", "Queensland": "Australia/Brisbane",
                  "South Australia": "Australia/Adelaide", "Northern Territory": "Australia/Darwin"},
    "Russia": {"Novosibirsk Oblast": "Asia/Novosibirsk", "Sverdlovsk Oblast": "Asia/Yekaterinburg",
               "Krasnoyarsk Krai": "Asia/Krasnoyarsk", "Primorsky Krai": "Asia/Vladivostok",
               "Omsk Oblast": "Asia/Omsk", "Irkutsk Oblast": "Asia/Irkutsk", "Tyumen Oblast": "Asia/Yekaterinburg",
               "Chelyabinsk Oblast": "Asia/Yekaterinburg", "Bashkortostan": "Asia/Yekaterinburg",
               "Samara Oblast": "Europe/Samara", "Kaliningrad Oblast": "Europe/Kaliningrad"},
    "Brazil": {"State of Amazonas": "America/Manaus", "Mato Grosso": "America/Cuiaba",
               "Mato Grosso do Sul": "America/Campo_Grande", "Acre": "America/Rio_Branco"},
    "Indonesia": {"Bali": "Asia/Makassar", "South Sulawesi": "Asia/Makassar", "Papua": "Asia/Jayapura"},
    "Mexico": {"Baja California": "America/Tijuana", "Sonora": "America/Hermosillo",
               "Chihuahua": "America/Chihuahua", "Quintana Roo": "America/Cancun"},
}
WEEK = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
BLOCKS = [(0, 6, "ночь 0–6"), (6, 12, "утро 6–12"), (12, 18, "день 12–18"), (18, 24, "вечер 18–24")]


def zone_for(country, region):
    if country == "United States":
        return US_TZ.get(region), region in US_TZ
    if country in REGION_TZ and region in REGION_TZ[country]:
        return REGION_TZ[country][region], True
    z = COUNTRY_TZ.get(country)
    return z, z is not None


def chi2_sf(x, k):
    """P(χ²_k > x) — регуляризованная неполная гамма, без scipy."""
    a, xx = k / 2.0, x / 2.0
    if xx <= 0:
        return 1.0
    if xx < a + 1:           # ряд для P, потом 1-P
        term = s = 1.0 / a
        n = a
        for _ in range(500):
            n += 1; term *= xx / n; s += term
            if abs(term) < abs(s) * 1e-12: break
        p = s * math.exp(-xx + a * math.log(xx) - math.lgamma(a))
        return max(0.0, 1.0 - p)
    b = xx + 1 - a; c = 1e300; d = 1 / b; h = d   # цепная дробь для Q
    for i in range(1, 500):
        an = -i * (i - a); b += 2
        d = an * d + b; d = 1e-300 if abs(d) < 1e-300 else d
        c = b + an / c; c = 1e-300 if abs(c) < 1e-300 else c
        d = 1 / d; de = d * c; h *= de
        if abs(de - 1) < 1e-12: break
    return h * math.exp(-xx + a * math.log(xx) - math.lgamma(a))


def chi2_test(obs, exp):
    x = sum((o - e) ** 2 / e for o, e in zip(obs, exp) if e > 0)
    return x, chi2_sf(x, len(obs) - 1)


def holm(pvals):
    order = sorted(range(len(pvals)), key=lambda i: pvals[i])
    adj = [0] * len(pvals); running = 0
    for rank, i in enumerate(order):
        running = max(running, min(1, (len(pvals) - rank) * pvals[i]))
        adj[i] = running
    return adj


# ── 1. GA4 → местное время ─────────────────────────────────────────────
events = []          # (country, local datetime, zone_is_known)
unknown_zone = Counter()
with open(os.path.join(HERE, "ga4_first_visit_dateHour_country_region_city.csv")) as f:
    for r in csv.DictReader(f):
        n = int(r["first_visits"])
        t = dt.datetime.strptime(r["dateHour_property_tz"], "%Y%m%d%H").replace(tzinfo=LA)
        z, known = zone_for(r["country"], r["region"])
        if not z:
            unknown_zone[r["country"]] += n
            continue
        loc = t.astimezone(ZoneInfo(z))
        for _ in range(n):
            events.append((r["country"], loc, known))
first = min(e[1] for e in events).date(); last = max(e[1] for e in events).date()
print(f"GA4 first_visit: {len(events)} установок с поясом · без пояса {sum(unknown_zone.values())} "
      f"({dict(unknown_zone.most_common(5))}) · окно {first} … {last}")

# ── 2. сверка со стором: событие = установка? ──────────────────────────
def cws_daily():
    out = {}
    for name in ("Installs_aighdeikamhkemngfanhnamdlpoceimo.csv", "Installs_aighdeikamhkemngfanhnamdlpoceimo (1).csv"):
        with open(os.path.join(DL, name)) as f:
            rows = list(csv.reader(f))[2:]
        for d, v in rows:
            out[dt.datetime.strptime(d, "%m/%d/%y").date()] = int(v)
    return out

def cws_by_country():
    tot = Counter()
    for name in ("Installs by region_aighdeikamhkemngfanhnamdlpoceimo (8).csv",
                 "Installs by region_aighdeikamhkemngfanhnamdlpoceimo (9).csv"):
        with open(os.path.join(DL, name)) as f:
            rows = list(csv.reader(f))
        head = rows[1]
        for r in rows[2:]:
            d = dt.datetime.strptime(r[0], "%m/%d/%y").date()
            if d < dt.date(2026, 6, 9):
                continue
            for c, v in zip(head[1:], r[1:]):
                tot[c] += int(v or 0)
    return tot

ga_daily = Counter()
with open(os.path.join(HERE, "ga4_first_visit_daily.csv")) as f:
    for r in csv.DictReader(f):
        ga_daily[dt.datetime.strptime(r["date"], "%Y%m%d").date()] = int(r["first_visits"])
cws = cws_daily()
common = sorted(d for d in cws if d in ga_daily or (d >= dt.date(2026, 6, 9) and d <= last))
common = [d for d in common if d >= dt.date(2026, 6, 9)]
a = [cws[d] for d in common]; b = [ga_daily.get(d, 0) for d in common]
ma, mb = sum(a) / len(a), sum(b) / len(b)
corr = sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(
    sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
print(f"\nСверка по дням ({len(common)} общих дней): стор {sum(a)} установок · GA4 {sum(b)} first_visit · "
      f"отношение {sum(b)/sum(a):.2f} · корреляция по дням r = {corr:.2f}")

cc = cws_by_country()
ga_c = Counter(e[0] for e in events)
# Сверка стран — в ОДНИХ И ТЕХ ЖЕ днях (дни стора; для GA4 — дата по поясу ресурса)
def in_cws_window(d):
    return dt.date(2026, 6, 9) <= d <= dt.date(2026, 8, 4) or dt.date(2026, 8, 17) <= d <= dt.date(2026, 9, 15)
ga_same = Counter()
with open(os.path.join(HERE, "ga4_first_visit_dateHour_country_region_city.csv")) as f:
    for r in csv.DictReader(f):
        if in_cws_window(dt.datetime.strptime(r["dateHour_property_tz"][:8], "%Y%m%d").date()):
            ga_same[{"Türkiye": "Turkey"}.get(r["country"], r["country"])] += int(r["first_visits"])
print("\nСтраны в одних и тех же днях (09.06–04.08 + 17.08–15.09): стор (регион аккаунта) против GA4 (по IP):")
print(f"  {'страна':16}{'стор':>6}{'GA4':>6}")
for c, n in cc.most_common(12):
    print(f"  {c:16}{n:>6}{ga_same.get(c, 0):>6}")
print(f"  {'всего':16}{sum(cc.values()):>6}{sum(ga_same.values()):>6}")

# ── 3. первая десятка GA4: дни недели и часы ───────────────────────────
days_in_window = Counter()
day = first
while day <= last:
    days_in_window[day.weekday()] += 1; day += dt.timedelta(days=1)

top = [c for c, _ in ga_c.most_common(10)]
rows_out = []
p_week, p_hour, p_cell = [], [], []
print("\n" + "═" * 100)
for c in top:
    ev = [e for e in events if e[0] == c]
    n = len(ev)
    wk = Counter(e[1].weekday() for e in ev)
    obs_w = [wk[i] for i in range(7)]
    exp_w = [n * days_in_window[i] / sum(days_in_window.values()) for i in range(7)]
    x_w, pw = chi2_test(obs_w, exp_w)
    hb = Counter(next(k for k, (lo, hi, _) in enumerate(BLOCKS) if lo <= e[1].hour < hi) for e in ev)
    obs_h = [hb[k] for k in range(4)]
    x_h, ph = chi2_test(obs_h, [n / 4] * 4)
    # «среда вечером»: день × часть суток против независимости (что день и время живут отдельно)
    cell = Counter((e[1].weekday(), next(k for k, (lo, hi, _) in enumerate(BLOCKS) if lo <= e[1].hour < hi)) for e in ev)
    rowm = [sum(cell[(d, k)] for k in range(4)) for d in range(7)]
    colm = [sum(cell[(d, k)] for d in range(7)) for k in range(4)]
    def max_resid(cellc, rowm, colm, n):
        best = (0, None)
        for d in range(7):
            for k in range(4):
                e_ = rowm[d] * colm[k] / n
                if e_ > 0:
                    z = (cellc[(d, k)] - e_) / math.sqrt(e_)
                    if z > best[0]: best = (z, (d, k))
        return best
    zmax, where = max_resid(cell, rowm, colm, n)
    # перестановка: тасуем части суток между событиями, дни на месте → насколько часто max z не меньше
    days_l = [e[1].weekday() for e in ev]
    blocks_l = [next(k for k, (lo, hi, _) in enumerate(BLOCKS) if lo <= e[1].hour < hi) for e in ev]
    ge = 0; SIM = 2000
    for _ in range(SIM):
        random.shuffle(blocks_l)
        cs = Counter(zip(days_l, blocks_l))
        if max_resid(cs, rowm, colm, n)[0] >= zmax - 1e-9: ge += 1
    pc = (ge + 1) / (SIM + 1)
    p_week.append(pw); p_hour.append(ph); p_cell.append(pc)
    peak_h = Counter(e[1].hour for e in ev).most_common(3)
    known = sum(1 for e in ev if e[2])
    rows_out.append({"страна": c, "n": n, "пояс_известен": known,
                     **{f"день_{WEEK[i]}": obs_w[i] for i in range(7)},
                     **{BLOCKS[k][2]: obs_h[k] for k in range(4)},
                     "p_дни": pw, "p_части_суток": ph, "max_ячейка": f"{WEEK[where[0]]} {BLOCKS[where[1]][2]}" if where else "",
                     "z_ячейки": round(zmax, 2), "p_ячейки_перестановкой": pc})
    print(f"{c} · n = {n}" + (f" (пояс по штату известен у {known})" if c == "United States" else ""))
    print("   дни:  " + "  ".join(f"{WEEK[i]} {obs_w[i]:>3} ({obs_w[i]/exp_w[i]:.2f}×)" for i in range(7))
          + f"   χ² p = {pw:.3f}")
    print("   часы: " + "  ".join(f"{BLOCKS[k][2]} {obs_h[k]:>3}" for k in range(4))
          + f"   χ² p = {ph:.2g}   пик: " + ", ".join(f"{h}:00×{k}" for h, k in peak_h))
    print(f"   самая выпирающая ячейка «день × часть суток»: {rows_out[-1]['max_ячейка']} "
          f"(z = {zmax:.2f}), случайно такая или сильнее — p = {pc:.3f}")

hw, hh, hc = holm(p_week), holm(p_hour), holm(p_cell)
print("\n" + "═" * 100)
print("С поправкой на то, что проверок много (Холм, по 10 стран в каждом вопросе):")
for i, c in enumerate(top):
    rows_out[i].update({"p_дни_Холм": hw[i], "p_части_суток_Холм": hh[i], "p_ячейки_Холм": hc[i]})
    flag = lambda p: "✅ значимо" if p < 0.05 else "—"
    print(f"  {c:16} дни недели: {hw[i]:.3f} {flag(hw[i]):10} части суток: {hh[i]:.2g} {flag(hh[i]):10} "
          f"«день × время»: {hc[i]:.3f} {flag(hc[i])}")

with open(os.path.join(HERE, "tablitsy.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows_out[0].keys())); w.writeheader(); w.writerows(rows_out)

# ── 4. все страны вместе: дни недели (самый мощный срез) ───────────────
n_all = len(events)
wk_all = Counter(e[1].weekday() for e in events)
obs = [wk_all[i] for i in range(7)]
exp = [n_all * days_in_window[i] / sum(days_in_window.values()) for i in range(7)]
x, p = chi2_test(obs, exp)
print(f"\nВсе страны вместе, дни недели по местному времени (n = {n_all}): " +
      "  ".join(f"{WEEK[i]} {obs[i]/exp[i]:.2f}×" for i in range(7)) + f"   χ² p = {p:.3f}")
hours_all = Counter(e[1].hour for e in events)
print("Все страны вместе, часы по местному времени: " + " ".join(f"{h}:{hours_all[h]}" for h in range(24)))
