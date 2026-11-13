"""Vẽ icon sản phẩm chế biến (16x16) cho nhà máy kiểu Hay Day.
Dùng: python3 tools/make_goods.py → public/assets/fp/goods.png (12 khung theo thứ tự GOODS)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fp', 'goods.png')
O = (64, 46, 40)
GOODS = ['flour', 'feed', 'bread', 'pie', 'cookie', 'butter', 'cheese', 'cream', 'juice_carrot', 'juice_tomato', 'juice_melon', 'tea_flower']


class Pix:
    def __init__(self):
        self.p = {}

    def ell(self, cx, cy, rx, ry, c, light=None, dark=None):
        for x in range(16):
            for y in range(16):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d <= 1:
                    col = c
                    if light and x < cx and y < cy and d < 0.55:
                        col = light
                    if dark and (y > cy + ry * 0.45 or x > cx + rx * 0.55):
                        col = dark
                    self.p[(x, y)] = col

    def rect(self, x0, y0, x1, y1, c):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                self.p[(x, y)] = c

    def img(self):
        im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        for (x, y), c in self.p.items():
            if 0 <= x < 16 and 0 <= y < 16:
                im.putpixel((x, y), c + (255,))
        src = im.copy()
        for x in range(16):
            for y in range(16):
                if not src.getpixel((x, y))[3] and any(0 <= x + a < 16 and 0 <= y + b < 16 and src.getpixel((x + a, y + b))[3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    im.putpixel((x, y), O + (255,))
        return im


def sack(body, light, dark, mark):
    s = Pix()
    s.ell(8, 10, 5.5, 4.5, body, light, dark)
    s.rect(6, 3, 10, 6, body)
    s.rect(6, 5, 10, 5, dark)
    s.p[(7, 3)] = light
    if mark:
        s.rect(7, 9, 9, 11, mark)
    return s


def bottle(liquid, light):
    s = Pix()
    s.rect(7, 2, 9, 4, (220, 226, 232))
    s.rect(5, 5, 11, 14, (200, 214, 226))
    s.rect(6, 7, 10, 13, liquid)
    s.rect(6, 7, 6, 12, light)
    s.rect(7, 1, 9, 1, (150, 104, 64))
    return s


def make(name):
    s = Pix()
    if name == 'flour':
        s = sack((236, 226, 204), (250, 246, 236), (200, 186, 160), (214, 174, 110))
    elif name == 'feed':
        s = sack((150, 176, 92), (186, 208, 120), (110, 134, 66), (232, 196, 110))
    elif name == 'bread':
        s.ell(8, 9, 6.5, 4, (206, 140, 70), (232, 176, 104), (166, 102, 50))
        for x in (5, 8, 11):
            s.p[(x, 7)] = (240, 200, 140)
            s.p[(x + 1, 8)] = (240, 200, 140)
    elif name == 'pie':
        s.ell(8, 10, 6.5, 4, (214, 150, 84), None, (170, 110, 60))
        s.ell(8, 9, 5, 2.6, (238, 140, 56), (250, 180, 90))
        for x in (5, 8, 11):
            s.p[(x, 9)] = (214, 150, 84)
    elif name == 'cookie':
        s.ell(8, 8, 6, 6, (226, 178, 110), (244, 206, 144), (190, 140, 82))
        for (x, y) in ((6, 6), (10, 7), (7, 10), (11, 11), (5, 9)):
            s.p[(x, y)] = (204, 60, 70)
    elif name == 'butter':
        s.rect(2, 11, 13, 13, (220, 226, 232))
        s.rect(4, 6, 11, 10, (250, 220, 110))
        s.rect(4, 6, 11, 6, (255, 240, 170))
        s.rect(11, 7, 11, 10, (220, 186, 80))
    elif name == 'cheese':
        for x in range(2, 14):
            for y in range(6, 13):
                if y >= 13 - (x - 2) * 0.6:
                    s.p[(x, y)] = (250, 206, 84)
        s.rect(2, 12, 13, 13, (226, 176, 60))
        for (x, y) in ((6, 10), (9, 11), (11, 9)):
            s.p[(x, y)] = (220, 170, 56)
    elif name == 'cream':
        s.rect(4, 8, 11, 13, (240, 244, 248))
        s.rect(4, 8, 11, 8, (250, 252, 255))
        s.ell(8, 7, 4.5, 2.5, (250, 190, 206), (255, 220, 230))
        s.p[(8, 4)] = (214, 56, 70)
    elif name == 'juice_carrot':
        s = bottle((240, 140, 50), (255, 190, 110))
    elif name == 'juice_tomato':
        s = bottle((214, 60, 52), (240, 120, 100))
    elif name == 'juice_melon':
        s = bottle((236, 96, 110), (255, 160, 170))
    elif name == 'tea_flower':
        s.rect(3, 8, 11, 13, (240, 244, 248))
        s.rect(4, 8, 10, 9, (196, 170, 90))
        s.rect(12, 9, 13, 11, (240, 244, 248))
        s.p[(6, 5)] = (250, 170, 190)
        s.p[(8, 4)] = (250, 200, 210)
    return s.img()


sheet = Image.new('RGBA', (16 * len(GOODS), 16), (0, 0, 0, 0))
for i, g in enumerate(GOODS):
    sheet.alpha_composite(make(g), (i * 16, 0))
sheet.save(OUT)
print('ok')
