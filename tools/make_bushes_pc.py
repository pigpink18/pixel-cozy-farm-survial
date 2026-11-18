"""Bụi rậm hái lượm: nền bụi Pixel Crawler (Vegetation.png) + vẽ thêm quả / lá / hoa bằng code.

public/assets/pc/bushes2.png — khung 32x32, mỗi loại 2 khung: [đầy, đã hái]
  0/1 dâu tằm · 2/3 việt quất · 4/5 lá thuốc · 6/7 lá trà · 8/9 hoa hồng · 10/11 hoa cúc · 12/13 oải hương
Chạy: python3 tools/make_bushes_pc.py
"""
import os
import random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VEG = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Props', 'Static', 'Vegetation.png')
OUT = os.path.join(ROOT, 'public', 'assets', 'pc', 'bushes2.png')
OL = (27, 20, 22, 255)


def h(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


veg = Image.open(VEG).convert('RGBA')
GREEN = veg.crop((2, 5, 31, 32))
LIME = veg.crop((50, 5, 79, 32))


def base(src):
    f = Image.new('RGBA', (32, 32))
    f.alpha_composite(src, ((32 - src.width) // 2, 32 - src.height - 1))
    return f


def inside(im, x, y):
    px = im.load()
    return 0 <= x < 32 and 0 <= y < 32 and px[x, y][3] and all(
        0 <= x + a < 32 and 0 <= y + b < 32 and px[x + a, y + b][3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))


def spots(im, n, seed, top=6, bottom=27):
    r = random.Random(seed)
    out = []
    for _ in range(600):
        x, y = r.randint(4, 27), r.randint(top, bottom)
        if inside(im, x, y) and all(abs(x - a) + abs(y - b) > 3 for a, b in out):
            out.append((x, y))
        if len(out) >= n:
            break
    return out


def put(im, x, y, pattern, cols):
    px = im.load()
    for j, row in enumerate(pattern):
        for i, ch in enumerate(row):
            if ch in cols and 0 <= x + i < 32 and 0 <= y + j < 32:
                px[x + i, y + j] = cols[ch]


BERRY = ['.hd.', 'hddd', 'dddo', '.do.']  # cụm 3 quả nhỏ có chấm sáng
FLOWER5 = ['.pp.', 'pccp', 'pccp', '.pp.']
ROSE = ['.rr.', 'rRrr', 'rrRr', '.rr.']
SPIKE = ['.l.', 'lll', '.l.', 'lll', '.l.', '.g.']
LEAF = ['..LL', '.LLL', 'LLl.', 'l...']


def decorate(kind, im):
    if kind == 'mulberry':
        for x, y in spots(im, 10, 1):
            put(im, x - 1, y - 1, BERRY, {'h': h('b85a9a'), 'd': h('3a1430'), 'o': h('6a2458')})
    elif kind == 'blueberry':
        for x, y in spots(im, 11, 2):
            put(im, x - 1, y - 1, BERRY, {'h': h('b8d8ff'), 'd': h('3a54a8'), 'o': h('24346e')})
    elif kind == 'herb':
        for x, y in spots(im, 9, 3):
            put(im, x - 1, y - 1, LEAF, {'L': h('c8f08a'), 'l': h('8ac050')})
            im.putpixel((x + 1, y - 2), h('ffffff'))
    elif kind == 'tea':
        for x, y in spots(im, 10, 4, top=4, bottom=20):
            put(im, x - 1, y - 1, LEAF, {'L': h('e6ff9a'), 'l': h('a8d860')})
    elif kind == 'rose':
        for x, y in spots(im, 7, 5):
            put(im, x - 1, y - 1, ROSE, {'r': h('d83a4a'), 'R': h('ff8a8a')})
    elif kind == 'daisy':
        for x, y in spots(im, 9, 6):
            put(im, x - 1, y - 1, FLOWER5, {'p': h('ffffff'), 'c': h('f2bd3c')})
    elif kind == 'lavender':
        for x, y in spots(im, 8, 7, top=4, bottom=18):
            put(im, x - 1, y - 4, SPIKE, {'l': h('a070e0'), 'g': h('6aa83c')})
            im.putpixel((x, y - 4), h('d8b8ff'))
    return im


def picked(im):
    """Đã hái: bụi hơi xỉn, rụng vài lá."""
    im = im.copy()
    px = im.load()
    for y in range(32):
        for x in range(32):
            r, g, b, a = px[x, y]
            if a and (r, g, b, a) != OL:
                px[x, y] = (int(r * 0.82), int(g * 0.82), int(b * 0.78), a)
    return im


KINDS = [('mulberry', GREEN), ('blueberry', GREEN), ('herb', LIME), ('tea', GREEN), ('rose', GREEN), ('daisy', LIME), ('lavender', LIME)]


def main():
    sheet = Image.new('RGBA', (len(KINDS) * 2 * 32, 32))
    for i, (kind, src) in enumerate(KINDS):
        b = base(src)
        sheet.alpha_composite(decorate(kind, b.copy()), (i * 64, 0))
        sheet.alpha_composite(picked(b), (i * 64 + 32, 0))
    sheet.save(OUT)
    print('saved', OUT)


if __name__ == '__main__':
    main()
