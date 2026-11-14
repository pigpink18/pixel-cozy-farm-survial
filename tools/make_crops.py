"""Vẽ cây trồng khoai tây, bí ngô, đậu que cùng phong cách Farmer Pack.
Dùng: python3 tools/make_crops.py → public/assets/fp/crops2.png
6 cột (giai đoạn 0–4, cột 5 trống) × 3 hàng (khoai tây, bí ngô, đậu que), ô 16×16
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fp', 'crops2.png')
O = (36, 74, 38)  # viền xanh lá tối (giống cây Farmer Pack)
G = [(46, 96, 44), (70, 130, 54), (110, 170, 70), (160, 206, 96)]  # tối → sáng
STEM = (86, 120, 50)
SEED = (120, 84, 60)
POTATO = [(150, 104, 64), (196, 150, 96)]
PUMPKIN = [(176, 82, 36), (232, 130, 50), (250, 176, 84)]
POD = [(74, 140, 56), (130, 190, 80)]


def leaf(px, cx, cy, w, h, flip=False):
    for x in range(-w, w + 1):
        for y in range(-h, h + 1):
            if (x / (w + 0.3)) ** 2 + (y / (h + 0.3)) ** 2 <= 1:
                shade = 2 if (y < 0 and x <= 0) else 1 if y <= 0 else 0
                if x == 0 and y == 0:
                    shade = 3
                px[(cx + (-x if flip else x), cy + y)] = G[shade]


def render(px, outline=True):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 <= x < 16 and 0 <= y < 16:
            im.putpixel((x, y), c + (255,))
    if not outline:
        return im
    src = im.copy()
    for x in range(16):
        for y in range(16):
            if not src.getpixel((x, y))[3] and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and src.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), O + (255,))
    return im


def seeds():
    return {(6, 12): SEED, (7, 12): (150, 110, 76), (9, 11): SEED, (10, 11): (150, 110, 76), (8, 14): SEED, (11, 14): SEED}


def sprout():
    px = {(8, 13): STEM, (8, 12): STEM}
    leaf(px, 6, 11, 1, 1)
    leaf(px, 10, 11, 1, 1, True)
    return px


def plant(size):
    px = {}
    for y in range(14 - size * 2, 15):
        px[(8, y)] = STEM
    leaf(px, 5, 12 - size, 2, 1)
    leaf(px, 11, 12 - size, 2, 1, True)
    leaf(px, 8, 9 - size * 2, 2, 2)
    if size >= 2:
        leaf(px, 4, 9 - size, 2, 1)
        leaf(px, 12, 9 - size, 2, 1, True)
    return px


def potato_ripe():
    px = plant(2)
    for (x, y) in ((4, 14), (11, 14)):
        for dx in range(3):
            px[(x + dx, y)] = POTATO[0]
        px[(x + 1, y - 1)] = POTATO[1]
    return px


def pumpkin(stage):
    px = {}
    for x in range(2, 14):  # dây bò
        px[(x, 13)] = STEM
    leaf(px, 4, 11, 2, 2)
    leaf(px, 12, 10, 2, 2, True)
    if stage >= 3:
        leaf(px, 8, 8, 2, 2)
    if stage == 4:
        for x in range(4, 13):
            for y in range(8, 15):
                if ((x - 8) / 4.6) ** 2 + ((y - 11.3) / 3.4) ** 2 <= 1:
                    px[(x, y)] = PUMPKIN[2] if (x < 7 and y < 11) else PUMPKIN[0] if x in (6, 10) else PUMPKIN[1]
        px[(8, 7)] = STEM
        px[(8, 6)] = STEM
    return px


def beans(stage):
    px = {}
    for y in range(1 + (4 - stage) * 3, 15):  # cọc leo
        px[(8, y)] = (150, 110, 70)
    for i, y in enumerate(range(13, 1 + (4 - stage) * 3, -3)):
        leaf(px, 6 if i % 2 else 10, y, 2, 1, i % 2 == 0)
    if stage == 4:
        for (x, y) in ((5, 7), (11, 9), (5, 11)):
            px[(x, y)] = POD[1]
            px[(x, y + 1)] = POD[0]
            px[(x, y + 2)] = POD[0]
    return px


CAB = [(120, 176, 84), (176, 214, 128), (214, 236, 170)]
CORN = [(214, 160, 40), (246, 206, 70), (255, 236, 140)]
HUSK = [(120, 160, 60), (170, 196, 90)]
EGG = [(70, 40, 90), (110, 64, 140), (170, 120, 200)]


def blob(px, cx, cy, rx, ry, cols, hl=True):
    for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            d = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
            if d <= 1:
                px[(x, y)] = cols[2] if hl and (x + .5 - cx) + (y + .5 - cy) < -rx * .5 else cols[0] if (x + .5 - cx) + (y + .5 - cy) > rx * .6 else cols[1]


def cabbage(stage):
    px = {}
    if stage == 2:
        leaf(px, 6, 12, 2, 1), leaf(px, 10, 12, 2, 1, True), leaf(px, 8, 11, 1, 1)
    elif stage == 3:
        leaf(px, 5, 12, 2, 2), leaf(px, 11, 12, 2, 2, True), blob(px, 8, 11, 3, 2.5, CAB)
    else:
        leaf(px, 4, 12, 2, 2), leaf(px, 12, 12, 2, 2, True), blob(px, 8, 10.5, 4.2, 3.8, CAB)
        px[(8, 10)] = CAB[0]
        px[(7, 9)] = CAB[0]
    return px


def cabbage_icon():
    px = {}
    blob(px, 8, 9, 5.5, 5, CAB)
    leaf(px, 4, 12, 2, 1), leaf(px, 12, 12, 2, 1, True)
    for y in range(6, 12):
        px[(8, y)] = CAB[0]
    return px


def corn(stage):
    px = {}
    top = {2: 9, 3: 5, 4: 2}[stage]
    for y in range(top, 15):
        px[(8, y)] = STEM
    for i, y in enumerate(range(13, top + 1, -3)):
        leaf(px, 6 if i % 2 else 10, y, 2, 1, i % 2 == 0)
    if stage == 4:
        for y in range(6, 11):
            px[(10, y)] = CORN[1] if y % 2 else CORN[2]
            px[(11, y)] = CORN[0] if y % 2 else CORN[1]
        px[(10, 11)] = HUSK[0]
        px[(11, 11)] = HUSK[1]
        px[(9, 7)] = HUSK[1]
        px[(8, 1)] = CORN[2]
        px[(7, 2)] = CORN[2]
        px[(9, 2)] = CORN[2]
    return px


def corn_icon():
    px = {}
    for y in range(3, 13):
        for x in range(6, 11):
            if abs(x - 8) <= 2 - (1 if y in (3, 12) else 0):
                px[(x, y)] = CORN[(x + y) % 2 + (1 if x < 8 else 0)]
    for y in range(8, 15):
        px[(5, y)] = HUSK[0]
        px[(11, y)] = HUSK[1]
    px[(6, 13)] = HUSK[0]
    px[(10, 13)] = HUSK[1]
    px[(8, 13)] = HUSK[0]
    px[(8, 14)] = HUSK[0]
    return px


def eggplant(stage):
    px = plant(min(2, stage - 1))
    if stage >= 3:
        leaf(px, 8, 7, 3, 2)
    if stage == 4:
        for cx, cy in ((5, 12), (11, 11)):
            blob(px, cx, cy, 1.6, 2.6, EGG)
            px[(cx, cy - 3)] = STEM
    return px


def eggplant_icon():
    px = {}
    blob(px, 8, 10, 3.6, 4.6, EGG)
    for x in range(6, 11):
        px[(x, 5)] = HUSK[0]
    px[(8, 4)] = STEM
    px[(8, 3)] = STEM
    px[(7, 6)] = HUSK[1]
    px[(9, 6)] = HUSK[1]
    return px


rows = [
    [seeds(), sprout(), plant(1), plant(2), potato_ripe()],
    [seeds(), sprout(), pumpkin(2), pumpkin(3), pumpkin(4)],
    [seeds(), sprout(), beans(2), beans(3), beans(4)],
    [seeds(), sprout(), cabbage(2), cabbage(3), cabbage(4), cabbage_icon()],
    [seeds(), sprout(), corn(2), corn(3), corn(4), corn_icon()],
    [seeds(), sprout(), eggplant(2), eggplant(3), eggplant(4), eggplant_icon()],
]
sheet = Image.new('RGBA', (16 * 6, 16 * len(rows)), (0, 0, 0, 0))
for r, row in enumerate(rows):
    for c, px in enumerate(row):
        sheet.alpha_composite(render(px, outline=c > 0), (c * 16, r * 16))
sheet.save(OUT)
print('ok')
