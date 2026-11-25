#!/usr/bin/env python3
"""Красное поле скриншота CWS → светлое поле варианта Б (слово автора 25.11: «Б гораздо менее напряжно… давай его возьмём»).

Картинку не рисуем заново — меняем только поле (урок 04.10: «доработать тот, что у нас уже был — не нужно выдумывать»).
Модель пикселя: доля поля s × красное поле + всё остальное (окно, текст, тени — серые). Долю поля даёт краснота R−G:
у серого её нет, у поля — вся. Новый пиксель = старый + s × (светлое поле − красное поле). Так тень на красном становится
тенью на светлом, полупрозрачное окно — полупрозрачным на светлом. Цветное (иконки, эмодзи, шапка листа PDF, светофор
окна) — под защитой и не трогается. Рамки выбора на слайде 3 — тем же приёмом из красного в синий продукта.
$0, без сети, без библиотек: PNG ↔ BMP через sips (macOS). Запуск: python3 -I perekras.py 1|3 → base-<n>.png рядом.
"""
import os, struct, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FIELD = (246, 242, 236)        # #f6f2ec — поле варианта Б, как у слайда 2
BLUE = (47, 111, 237)          # #2F6FED — цвет «выбрано» в продукте (templates.js, --gptpdf-sel, с 17.11)

SLIDES = {
    '1': dict(
        src='../2026-10-04-dorabotka/original.png',     # слайд в сторе = он + плашки и «1 / 2» (HTML)
        keep_rrects=[(837, 121, 1212, 636, 7),          # лист PDF целиком (красная шапка «PDF» — его)
                     (415, 84, 497, 169, 0)],           # значок плашки Export
        keep_lights=(80, 50, 160, 85),                  # светофор окна: ищется по жёлтому и зелёному
        emoji=[(507, 372), (577, 371), (507, 403), (578, 400), (478, 434)],   # ❌ ❌ ❌ ⚠ ⚡ в таблице окна
        # где лежат предметы (окно, плашка Export, лист): внутри — смесь по доле поля; снаружи — чистое поле и тени
        zones=[[(70, 37), (690, 115), (690, 519), (70, 587)],          # окно браузера (в перспективе)
               [(368, 53), (693, 78), (693, 208), (378, 194)],          # плашка Export
               [(834, 118), (1215, 118), (1215, 639), (834, 639)]],     # лист PDF
        clear=[(56, 618, 830, 800)],                    # старый белый заголовок — заголовок наберёт HTML
    ),
    '3': dict(
        src='../../../html_pdf_converter/banner/slide2_large_1280_800.png',   # слайд «Export only what matters»
        keep_rrects=[(1030, 4, 1072, 48, 0)],           # значок плашки Export (2)
        keep_lights=(80, 5, 170, 50),
        # плашка Export (2) лежит и на окне, и на поле — как на слайде 1; внутри окна (на 3 px от края, углы скруглены,
        # чтобы край окна не посинел) красные рамки выбора и розовая заливка → синий продукта
        zones=[dict(rect=(1012, 0, 1230, 62, 8)),
               dict(rect=(79, 10, 1203, 703, 7), mode='blue')],
        red_ref=(178, 84, 54),                          # сердцевина красной рамки выбора на слайде
        clear=[(60, 734, 830, 800)],                    # старый белый заголовок (тень окна кончается к 734)
    ),
}
SHADOW = 0.4    # тени на светлом поле мягче, чем на красном: доля прежней глубины (у слайда 2 тени плиток лёгкие)


def inside(zone, x, y):
    if isinstance(zone, dict):                          # скруглённый прямоугольник
        x0, y0, x1, y1, r = zone['rect']
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            return False
        dx = max(x0 + r - x, 0, x - (x1 - r)); dy = max(y0 + r - y, 0, y - (y1 - r))
        return dx * dx + dy * dy <= r * r
    c = False                                           # многоугольник
    for (x1, y1), (x2, y2) in zip(zone, zone[1:] + zone[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def bounds(zone):
    if isinstance(zone, dict):
        x0, y0, x1, y1, _ = zone['rect']; return x0, y0, x1, y1
    xs = [p[0] for p in zone]; ys = [p[1] for p in zone]; return min(xs), min(ys), max(xs), max(ys)


def load(png):
    tmp = os.path.join(tempfile.mkdtemp(), 'a.bmp')
    subprocess.run(['sips', '-s', 'format', 'bmp', png, '--out', tmp], check=True, capture_output=True)
    b = open(tmp, 'rb').read()
    off, = struct.unpack_from('<I', b, 10); w, h = struct.unpack_from('<ii', b, 18); bpp, = struct.unpack_from('<H', b, 28)
    st = bpp // 8; row = (w * st + 3) & ~3; H = abs(h)
    px = bytearray(w * H * 3)
    for y in range(H):
        o = off + ((H - 1 - y) if h > 0 else y) * row
        r = b[o:o + w * st]
        px[y*w*3:(y+1)*w*3:3] = r[2::st]; px[y*w*3+1:(y+1)*w*3:3] = r[1::st]; px[y*w*3+2:(y+1)*w*3:3] = r[0::st]
    return w, H, px


def save(png, w, h, px):
    row = (w * 3 + 3) & ~3; pad = row - w * 3
    out = bytearray(b'BM' + struct.pack('<IHHI', 54 + row * h, 0, 0, 54) +
                    struct.pack('<IiiHHIIiiII', 40, w, h, 1, 24, 0, row * h, 2835, 2835, 0, 0))
    for y in range(h - 1, -1, -1):
        r = px[y*w*3:(y+1)*w*3]; line = bytearray(w * 3)
        line[0::3] = r[2::3]; line[1::3] = r[1::3]; line[2::3] = r[0::3]
        out += line + b'\0' * pad
    tmp = os.path.join(tempfile.mkdtemp(), 'b.bmp'); open(tmp, 'wb').write(out)
    subprocess.run(['sips', '-s', 'format', 'png', tmp, '--out', png], check=True, capture_output=True)


def field_map(w, h, px, keep):
    """Красное поле под каждой точкой: по клеткам 32×32 — светлые красные точки клетки (без теней), пустые клетки —
    от соседей, между центрами клеток — линейно."""
    C = 32; gw, gh = (w + C - 1) // C, (h + C - 1) // C
    grid = [[None] * gw for _ in range(gh)]
    for gy in range(gh):
        for gx in range(gw):
            pts = []
            for y in range(gy * C, min(h, gy * C + C), 2):
                for x in range(gx * C, min(w, gx * C + C), 2):
                    if keep[y * w + x]:
                        continue
                    i = (y * w + x) * 3; r, g, b = px[i], px[i+1], px[i+2]
                    if r > 150 and g < 115 and r - g > 110 and r - b > 120:
                        pts.append((r, g, b))
            if len(pts) >= 24:
                pts.sort(key=lambda c: -c[0]); top = pts[:max(8, len(pts) // 3)]
                grid[gy][gx] = tuple(sum(c[k] for c in top) / len(top) for k in range(3))
    while any(v is None for row in grid for v in row):
        new = [row[:] for row in grid]
        for gy in range(gh):
            for gx in range(gw):
                if grid[gy][gx] is None:
                    nb = [grid[yy][xx] for yy in range(gy-1, gy+2) for xx in range(gx-1, gx+2)
                          if 0 <= yy < gh and 0 <= xx < gw and grid[yy][xx] is not None]
                    if nb:
                        new[gy][gx] = tuple(sum(c[k] for c in nb) / len(nb) for k in range(3))
        grid = new

    def at(x, y):
        fx = min(max((x - C / 2) / C, 0), gw - 1); fy = min(max((y - C / 2) / C, 0), gh - 1)
        x0, y0 = int(fx), int(fy); x1, y1 = min(x0 + 1, gw - 1), min(y0 + 1, gh - 1); tx, ty = fx - x0, fy - y0
        return tuple((grid[y0][x0][k] * (1 - tx) + grid[y0][x1][k] * tx) * (1 - ty) +
                     (grid[y1][x0][k] * (1 - tx) + grid[y1][x1][k] * tx) * ty for k in range(3))
    return at


def main(n):
    cfg = SLIDES[n]
    w, h, px = load(os.path.join(HERE, cfg['src']))
    keep = bytearray(w * h)
    for (x0, y0, x1, y1, r) in cfg.get('keep_rrects', []):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                dx = max(x0 + r - x, 0, x - (x1 - r)); dy = max(y0 + r - y, 0, y - (y1 - r))
                if dx * dx + dy * dy <= r * r:
                    keep[y * w + x] = 1
    if 'keep_lights' in cfg:       # светофор: центры жёлтой и зелёной точек, красная — на том же шаге левее
        x0, y0, x1, y1 = cfg['keep_lights']
        def centroid(pred):
            pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if pred(*px[(y*w+x)*3:(y*w+x)*3+3])]
            return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        ye = centroid(lambda r, g, b: r > 200 and g > 140 and b < 110)
        gr = centroid(lambda r, g, b: g > 150 and r < 150 and b < 150)
        re = (2 * ye[0] - gr[0], 2 * ye[1] - gr[1])
        for (cx, cy) in (re, ye, gr):
            for y in range(int(cy) - 9, int(cy) + 10):
                for x in range(int(cx) - 9, int(cx) + 10):
                    if (x - cx) ** 2 + (y - cy) ** 2 <= 8.5 ** 2:
                        keep[y * w + x] = 1
        print('светофор:', [tuple(round(v) for v in c) for c in (re, ye, gr)])
    for (cx, cy) in cfg.get('emoji', []):   # эмодзи на полупрозрачном окне: сам знак — под защиту, фон вокруг — нет
        R = 12
        border = [tuple(px[((cy+dy)*w+cx+dx)*3:((cy+dy)*w+cx+dx)*3+3]) for dy in range(-R, R+1) for dx in range(-R, R+1)
                  if max(abs(dx), abs(dy)) == R]
        border = [c for c in border if sum(c) > 360] or border
        bg = tuple(sorted(c[k] for c in border)[len(border) // 2] for k in range(3))
        for y in range(cy - R + 1, cy + R):
            for x in range(cx - R + 1, cx + R):
                c = px[(y*w+x)*3:(y*w+x)*3+3]
                if sum((c[k] - bg[k]) ** 2 for k in range(3)) > 60 ** 2 and sum(c) > 120:
                    keep[y * w + x] = 1
    zones = cfg.get('zones') or []
    zmask = bytearray(w * h)       # где предметы: поле под ними не меряется (полупрозрачный край окна — не поле)
    for n_z, z in enumerate(zones, 1):                   # в маске — номер зоны; первая совпавшая главнее
        x0, y0, x1, y1 = bounds(z)
        for y in range(max(0, y0), min(h, y1 + 1)):
            for x in range(max(0, x0), min(w, x1 + 1)):
                if not zmask[y * w + x] and inside(z, x, y):
                    zmask[y * w + x] = n_z
    blue = [isinstance(z, dict) and z.get('mode') == 'blue' for z in zones]
    RED = cfg.get('red_ref'); dred = RED[0] - RED[1] if RED else 1
    at = field_map(w, h, px, bytearray(1 if (a or b) else 0 for a, b in zip(keep, zmask)))
    out = bytearray(px)
    lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
    for y in range(h):
        for x in range(w):
            if keep[y * w + x]:
                continue
            i = (y * w + x) * 3; c = px[i:i+3]
            B = at(x, y)
            if zones and not zmask[y * w + x]:
                # чистое поле: светлее поля (блик, белые буквы) — ровное светлое поле; темнее — тень, мягче прежней
                k = lum(c) / lum(B)
                f = 1.0 if k >= 0.96 else 1 - (1 - k) * SHADOW
                for j in range(3):
                    out[i + j] = round(FIELD[j] * f)
                continue
            if zones and blue[zmask[y * w + x] - 1]:     # рамка выбора: красная доля → синяя, остальное как было
                a = min(max((c[0] - c[1]) / dred, 0.0), 1.0)
                for j in range(3):
                    out[i + j] = min(255, max(0, round(c[j] + a * (BLUE[j] - RED[j]))))
                continue
            d = max(B[0] - B[1], 60)
            s = min(max((c[0] - c[1]) / d, 0.0), 1.0)
            for j in range(3):
                out[i + j] = min(255, max(0, round(c[j] + s * (FIELD[j] - B[j]))))
    for (x0, y0, x1, y1) in cfg.get('clear', []):
        for y in range(y0, min(y1, h)):
            for x in range(x0, min(x1, w)):
                out[(y*w+x)*3:(y*w+x)*3+3] = bytes(FIELD)
    dst = os.path.join(HERE, f'base-{n}.png'); save(dst, w, h, out); print(dst)


if __name__ == '__main__':
    main(sys.argv[1])
