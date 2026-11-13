"""Vẽ đồ cho khu Mỏ đá & Hang sâu (pixel art, cùng bảng màu).

Tạo public/assets/quarry/:
  geode.png    (16x16) hốc đá — mang tới bàn đập để mở
  geode_ice.png(16x16) hốc băng
  geode_fire.png(16x16) hốc lửa
  boulder.png  (32x26) tảng đá lớn (2x2 ô)
  anvil.png    (32x22) bàn đập hốc đá
  cart.png     (32x24) xe goòng chở quặng (thùng bán quặng)
  crystal.png  (16x18) cụm pha lê (hang pha lê)
  rail.png     (16x16) đường ray
  coal.png     (16x16) than đá
Chạy: python3 tools/make_quarry.py
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/quarry')


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


O = rgb('#3d3333')
ST = rgb('#9a8f86')
ST_L = rgb('#c4b9ad')
ST_D = rgb('#6e655e')
ST_DD = rgb('#4f4843')
W = rgb('#a57855')
WL = rgb('#de9f47')
WD = rgb('#734c44')
GREY = rgb('#87857c')
GREY_L = rgb('#c9c7c0')
BLACK = rgb('#2a2428')
T = (0, 0, 0, 0)


class C:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h), T)
        self.px = self.im.load()
        self.w, self.h = w, h

    def rect(self, x0, y0, x1, y1, c):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            for y in range(max(0, y0), min(self.h, y1 + 1)):
                self.px[x, y] = c
        return self

    def box(self, x0, y0, x1, y1, fill, outline=O):
        self.rect(x0, y0, x1, y1, outline)
        self.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill)
        return self

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def blob(self, cx, cy, rx, ry, fill, outline=O, light=None, dark=None):
        inside = set()
        for x in range(self.w):
            for y in range(self.h):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    inside.add((x, y))
        for (x, y) in inside:
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            c = fill
            if light and dx + dy < -0.6:
                c = light
            elif dark and dx + dy > 0.7:
                c = dark
            self.px[x, y] = c
        for (x, y) in inside:
            if any((nx, ny) not in inside for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
                self.px[x, y] = outline
        return self

    def save(self, name):
        self.im.save(os.path.join(OUT, f'{name}.png'))


def geode(inner, inner_l):
    c = C(16, 16)
    c.blob(8, 9, 7, 6.5, ST, O, ST_L, ST_D)
    # vết nứt hé lộ tinh thể bên trong
    for (x, y) in ((7, 6), (8, 7), (9, 8), (8, 9), (10, 9)):
        c.set(x, y, inner)
    c.set(8, 6, inner_l), c.set(9, 7, inner_l)
    c.set(5, 11, ST_D), c.set(11, 12, ST_D)
    return c


def boulder():
    c = C(32, 26)
    c.blob(16, 15, 15, 10.5, ST, O, ST_L, ST_D)
    c.blob(9, 10, 7, 6, ST, O, ST_L, ST_D)
    c.blob(22, 11, 8, 6.5, ST, O, ST_L, ST_D)
    for (x, y) in ((6, 8), (7, 7), (19, 8), (20, 7), (12, 16), (13, 16)):
        c.set(x, y, rgb('#e2d8cc'))
    for (x0, y0, x1) in ((14, 19, 19), (24, 15, 27)):
        c.rect(x0, y0, x1, y0, ST_D)
    return c


def anvil():
    c = C(32, 22)
    c.box(2, 12, 29, 21, W)                    # bàn gỗ
    c.rect(3, 13, 28, 13, WL)
    c.rect(4, 17, 27, 17, WD)
    c.box(9, 4, 23, 9, GREY)                   # đe sắt
    c.rect(10, 5, 22, 5, GREY_L)
    c.box(13, 9, 19, 12, rgb('#5d5b55'))
    c.box(3, 2, 7, 6, rgb('#5d5b55'))          # búa
    c.rect(5, 6, 5, 12, WD)
    c.blob(26, 8, 3.5, 3, ST, O, ST_L, ST_D)   # hốc đá chờ đập
    c.set(26, 7, rgb('#b48ad6'))
    return c


def cart():
    c = C(32, 24)
    c.box(2, 6, 29, 17, rgb('#7a5a48'))        # thùng goòng
    c.rect(3, 7, 28, 7, rgb('#9b7560'))
    for x in (9, 16, 23):
        c.rect(x, 7, x, 16, rgb('#5c4236'))
    c.rect(1, 6, 30, 6, O)
    c.blob(8, 4, 3, 3, rgb('#c87a3c'), O)      # quặng chất đầy
    c.blob(14, 3, 3.5, 3, ST, O, ST_L, ST_D)
    c.blob(20, 4, 3, 3, rgb('#e3c16a'), O)
    c.blob(25, 4, 2.5, 2.5, ST_D, O)
    for x in (8, 23):                          # bánh xe
        c.blob(x, 19.5, 3.5, 3.5, BLACK, O)
        c.set(x, 19, GREY)
    return c


def crystal():
    c = C(16, 18)
    col, light, dark = rgb('#8fd3f0'), rgb('#e2f6ff'), rgb('#4f8fb8')
    for (x0, top, w) in ((3, 6, 3), (6, 1, 4), (10, 5, 3)):
        for y in range(top, 16):
            for x in range(x0, x0 + w):
                c.set(x, y, col if x > x0 else light)
        c.rect(x0, top, x0 + w - 1, top, O)
        c.set(x0 + w - 1, top + 1, dark)
        c.rect(x0 - 1, top, x0 - 1, 15, O)
        c.rect(x0 + w, top, x0 + w, 15, O)
    c.blob(8, 15.5, 6, 2.5, ST, O, ST_L, ST_D)
    return c


def rail():
    c = C(16, 16)
    for y in (2, 7, 12):
        c.rect(0, y, 15, y + 2, rgb('#7a5a48'))
        c.rect(0, y, 15, y, rgb('#9b7560'))
    c.rect(3, 0, 4, 15, GREY), c.rect(11, 0, 12, 15, GREY)
    c.rect(3, 0, 3, 15, GREY_L), c.rect(11, 0, 11, 15, GREY_L)
    return c


def coal():
    c = C(16, 16)
    c.blob(8, 9, 6, 5.5, rgb('#3c3a40'), O, rgb('#6a6870'), rgb('#26242a'))
    c.set(6, 7, rgb('#9a98a0')), c.set(10, 10, rgb('#6a6870'))
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    geode(rgb('#b48ad6'), rgb('#e2c8ff')).save('geode')
    geode(rgb('#8fd3f0'), rgb('#e2f6ff')).save('geode_ice')
    geode(rgb('#f08a4b'), rgb('#ffd27a')).save('geode_fire')
    boulder().save('boulder')
    anvil().save('anvil')
    cart().save('cart')
    crystal().save('crystal')
    rail().save('rail')
    coal().save('coal')
    print('saved quarry art')


if __name__ == '__main__':
    main()
