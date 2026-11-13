"""Vẽ cây, bụi, gốc cây pixel art theo bảng màu game (khớp Farmer Pack).
Dùng: python3 tools/make_trees.py  → public/assets/fp/trees.png (+ bushes.png)
trees.png: 4 cột mùa (xuân, hạ, thu, đông) × 3 hàng kiểu cây, mỗi ô 32×44
bushes.png: 16×16 — bụi xanh, bụi quả mọng, gốc cây, cây non (× 4 mùa)
"""
import math, os, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fp')

OUTLINE = (52, 44, 46)
TRUNK = [(97, 64, 58), (128, 86, 70), (166, 118, 84)]  # tối → sáng
SEASONS = {
    'spring': [(52, 98, 44), (78, 138, 56), (122, 176, 70), (174, 210, 96)],
    'summer': [(40, 86, 40), (62, 120, 48), (100, 158, 60), (150, 196, 84)],
    'autumn': [(140, 62, 44), (196, 98, 52), (232, 146, 66), (250, 196, 104)],
    'winter': [(52, 90, 74), (74, 118, 90), (214, 222, 232), (250, 252, 255)],
}
BLOSSOM = [(240, 150, 170), (255, 205, 215)]
FRUIT = [(196, 58, 52), (240, 104, 86)]


def blob(shapes, w, h):
    inside = set()
    for cx, cy, r in shapes:
        for x in range(w):
            for y in range(h):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    inside.add((x, y))
    return inside


def shade_canopy(im, inside, cx, cy, pal, seed, season, extra=None):
    rnd = random.Random(seed)
    for (x, y) in inside:
        # ánh sáng từ trên-trái + vân lá theo cụm 3×3
        lx, ly = (x - cx) / 14, (y - cy) / 14
        light = -0.65 * lx - 0.85 * ly
        cluster = ((x // 3) * 7 + (y // 3) * 13 + seed) % 5
        light += (cluster - 2) * 0.12 + rnd.uniform(-0.08, 0.08)
        if (x + 1, y) not in inside or (x, y + 1) not in inside:
            light -= 0.45  # mép dưới/phải tối hơn
        idx = 0 if light < -0.55 else 1 if light < 0.05 else 2 if light < 0.55 else 3
        if season == 'winter':  # tuyết đọng phía trên
            idx = 3 if light > 0.25 else 2 if light > -0.05 else 1 if light > -0.5 else 0
        im.putpixel((x, y), pal[idx] + (255,))
    if extra:
        for i in range(extra[1]):
            x, y = rnd.choice(sorted(inside))
            if (x + 1, y) in inside and (x, y + 1) in inside:
                im.putpixel((x, y), extra[0][1] + (255,))
                im.putpixel((x + 1, y), extra[0][0] + (255,))
                im.putpixel((x, y + 1), extra[0][0] + (255,))


def outline(im):
    w, h = im.size
    src = im.copy()
    for x in range(w):
        for y in range(h):
            if src.getpixel((x, y))[3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and src.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), OUTLINE + (255,))


def trunk(im, x0, x1, y0, y1):
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            t = 2 if x == x0 + 1 else 0 if x >= x1 - 1 else 1
            im.putpixel((x, y), TRUNK[t] + (255,))
    # rễ
    for dx, c in ((-2, 0), (-1, 1), (x1 - x0 + 1, 0), (x1 - x0 + 2, 0)):
        im.putpixel((x0 + dx, y1), TRUNK[c] + (255,))


def make_tree(kind, season, seed):
    W, H = 32, 44
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pal = SEASONS[season]
    if kind == 0:  # cây tán tròn
        trunk(im, 14, 18, 28, 42)
        shapes = [(16, 14, 11), (8, 19, 7), (24, 19, 7), (12, 24, 7), (20, 24, 7), (16, 8, 7)]
    elif kind == 1:  # cây thông
        trunk(im, 14, 17, 34, 42)
        shapes = []
        for i, (cy, r) in enumerate([(9, 5), (15, 7), (22, 9), (29, 11)]):
            for dx in range(-r, r + 1):
                shapes.append((16 + dx * 0.9, cy + abs(dx) * 0.35, 3.2))
    else:  # cây ăn quả (tán rộng thấp)
        trunk(im, 14, 18, 30, 42)
        shapes = [(16, 17, 10), (7, 21, 7), (25, 21, 7), (16, 25, 8), (11, 11, 6), (21, 11, 6)]
    inside = blob(shapes, W, H)
    extra = None
    if season == 'spring' and kind != 1:
        extra = (BLOSSOM, 14)
    if kind == 2 and season in ('summer', 'autumn'):
        extra = (FRUIT, 9)
    shade_canopy(im, inside, 13, 12, pal if not (kind == 1 and season == 'autumn') else SEASONS['summer'], seed, season, extra)
    outline(im)
    return im


def make_bush(season, berries, seed):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    inside = blob([(8, 9, 6), (4, 11, 4), (12, 11, 4)], 16, 16)
    pal = SEASONS[season]
    shade_canopy(im, inside, 6, 7, pal, seed, season, (FRUIT, 4) if berries else None)
    outline(im)
    return im


def make_stump():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for x in range(3, 13):
        for y in range(8, 15):
            im.putpixel((x, y), TRUNK[1 if 4 < x < 11 else 0] + (255,))
    for x in range(4, 12):  # mặt cắt
        for y in range(6, 9):
            im.putpixel((x, y), (214, 176, 120, 255) if (x + y) % 3 else (190, 148, 96, 255))
    outline(im)
    return im


SEAS = ['spring', 'summer', 'autumn', 'winter']
trees = Image.new('RGBA', (32 * 4, 44 * 3), (0, 0, 0, 0))
for col, s in enumerate(SEAS):
    for kind in range(3):
        trees.alpha_composite(make_tree(kind, s, 11 + kind * 5 + col), (col * 32, kind * 44))
trees.save(os.path.join(OUT, 'trees.png'))

bushes = Image.new('RGBA', (16 * 4, 16 * 3), (0, 0, 0, 0))
for col, s in enumerate(SEAS):
    bushes.alpha_composite(make_bush(s, False, 3 + col), (col * 16, 0))
    bushes.alpha_composite(make_bush(s, s in ('summer', 'autumn'), 7 + col), (col * 16, 16))
bushes.alpha_composite(make_stump(), (0, 32))
bushes.save(os.path.join(OUT, 'bushes.png'))
print('ok')
