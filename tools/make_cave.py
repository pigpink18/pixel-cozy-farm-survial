"""Vẽ bộ ô & đồ trang trí cho hầm mỏ / hang (pixel art).

Ô nền & vách vẽ bằng tông xám trung tính → trong game nhuộm (tint) theo chủ đề hang
(đất, băng, dung nham, pha lê).

Tạo public/assets/cave/:
  floor0..3.png  (16x16)  sàn hang (4 kiểu xen kẽ)
  wall_top.png   (16x16)  khối đá nhìn từ trên
  wall_face.png  (16x16)  mặt vách đứng (khi bên dưới là sàn)
  edge_l/r/t.png (16x16)  viền sáng của khối đá giáp sàn (trái/phải/trên)
  torch.png      (32x16)  đuốc treo vách, 2 khung lửa
  beam.png       (16x32)  cột chống gỗ dựa vách
  stalagmite.png (16x20)  măng đá
  pebbles.png    (16x16)  sỏi vụn (đi qua được)
  puddle.png     (32x16)  vũng nước
  crate.png      (16x16)  thùng gỗ thợ mỏ
  lava.png       (32x16)  ô dung nham, 2 khung
Chạy: python3 tools/make_cave.py
"""
from PIL import Image
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/cave')
R = random.Random(7)


def rgb(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


O = rgb('#2a2428')
T = (0, 0, 0, 0)
# Tông xám trung tính (được nhuộm trong game)
F0, F1, F2, F3 = rgb('#b4ada6'), rgb('#a39c95'), rgb('#8f8882'), rgb('#cbc5be')
W0, W1, W2, W3 = rgb('#5e5853'), rgb('#4c4743'), rgb('#3b3734'), rgb('#77706a')
WOOD, WOOD_L, WOOD_D = rgb('#a57855'), rgb('#de9f47'), rgb('#734c44')


class C:
    def __init__(self, w, h, fill=T):
        self.im = Image.new('RGBA', (w, h), fill)
        self.px = self.im.load()
        self.w, self.h = w, h

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def rect(self, x0, y0, x1, y1, c):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            for y in range(max(0, y0), min(self.h, y1 + 1)):
                self.px[x, y] = c

    def blob(self, cx, cy, rx, ry, fill, outline=O, light=None, dark=None):
        cells = {(x, y) for x in range(self.w) for y in range(self.h) if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1}
        for (x, y) in cells:
            dx, dy = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            self.px[x, y] = light if light and dx + dy < -.6 else dark if dark and dx + dy > .7 else fill
        for (x, y) in cells:
            if any(n not in cells for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
                self.px[x, y] = outline

    def save(self, name):
        self.im.save(os.path.join(OUT, f'{name}.png'))


def floor(seed):
    r = random.Random(seed)
    c = C(16, 16, F1)
    for _ in range(40):  # lốm đốm
        c.set(r.randrange(16), r.randrange(16), r.choice([F0, F2, F1, F1]))
    for _ in range(r.randrange(1, 3)):  # vết nứt
        x, y = r.randrange(2, 14), r.randrange(2, 14)
        for _ in range(r.randrange(3, 6)):
            c.set(x, y, F2)
            x += r.choice([-1, 0, 1])
            y += r.choice([0, 1])
    for _ in range(r.randrange(0, 3)):  # sỏi nhỏ
        x, y = r.randrange(1, 15), r.randrange(1, 15)
        c.set(x, y, F3), c.set(x, y + 1, F2)
    return c


def wall_top():
    r = random.Random(3)
    c = C(16, 16, W1)
    for _ in range(60):
        c.set(r.randrange(16), r.randrange(16), r.choice([W0, W2, W1]))
    for (x, y) in ((3, 4), (10, 9), (6, 12)):
        c.set(x, y, W3), c.set(x + 1, y, W0)
    return c


def wall_face():
    r = random.Random(5)
    c = C(16, 16, W0)
    for x in range(16):  # sọc đá dọc
        col = r.choice([W0, W0, W3, W1])
        for y in range(2, 15):
            if r.random() < .55:
                c.set(x, y, col)
    for x in range(16):
        c.set(x, 0, W3), c.set(x, 1, W3 if r.random() < .7 else W0)  # mép trên sáng
        c.set(x, 14, W1), c.set(x, 15, W2)  # chân vách tối
    for (x, y) in ((4, 6), (11, 9), (7, 11)):
        c.rect(x, y, x + 1, y, W2)
    return c


def edge(side):
    c = C(16, 16)
    for i in range(16):
        if side == 'l':
            c.set(0, i, W3), c.set(1, i, W0)
        elif side == 'r':
            c.set(15, i, W3), c.set(14, i, W0)
        else:
            c.set(i, 0, W3), c.set(i, 1, W0)
    return c


def torch():
    c = C(32, 16)
    for f in range(2):
        ox = f * 16
        c.rect(ox + 7, 7, ox + 8, 15, WOOD_D)       # cán đuốc
        c.rect(ox + 7, 7, ox + 7, 15, WOOD)
        c.rect(ox + 5, 12, ox + 10, 13, rgb('#5d5b55'))  # giá sắt
        c.rect(ox + 6, 6, ox + 9, 7, rgb('#5d5b55'))
        flame = [(7, 1), (8, 2), (6, 3), (9, 3), (7, 4), (8, 4), (7, 5), (8, 5), (6, 4), (9, 5)] if f == 0 else \
                [(8, 1), (7, 2), (9, 3), (6, 3), (7, 4), (8, 4), (7, 5), (8, 5), (9, 4), (6, 5)]
        for (x, y) in flame:
            c.set(ox + x, y, rgb('#f08a4b'))
        for (x, y) in ((7, 4), (8, 4), (7, 5), (8, 5), (7 + f, 3)):
            c.set(ox + x, y, rgb('#ffd27a'))
    return c


def beam():
    c = C(16, 32)
    c.rect(1, 0, 14, 4, WOOD)          # xà ngang
    c.rect(1, 0, 14, 0, WOOD_L)
    c.rect(1, 4, 14, 4, WOOD_D)
    for x0 in (2, 11):                 # 2 cột
        c.rect(x0, 4, x0 + 2, 31, WOOD)
        c.rect(x0, 4, x0, 31, WOOD_L)
        c.rect(x0 + 2, 4, x0 + 2, 31, WOOD_D)
    for y in (9, 20):                  # đinh
        c.set(3, y, O), c.set(12, y, O)
    return c


def stalagmite():
    c = C(16, 20)
    pts = []
    for y in range(20):
        half = max(0, int((y + 1) / 20 * 6))
        for x in range(8 - half, 8 + half):
            pts.append((x, y))
    s = set(pts)
    for (x, y) in pts:
        c.set(x, y, F3 if x < 7 else F2 if x > 8 else F1)
    for (x, y) in pts:
        if any(n not in s for n in ((x + 1, y), (x - 1, y), (x, y - 1))):
            c.set(x, y, O)
    c.blob(4, 18, 3, 2, F2, O, F3)
    return c


def pebbles():
    c = C(16, 16)
    r = random.Random(11)
    for _ in range(5):
        x, y = r.randrange(2, 14), r.randrange(4, 14)
        c.set(x, y, F3), c.set(x + 1, y, F1), c.set(x, y + 1, F2), c.set(x + 1, y + 1, O)
    return c


def puddle():
    c = C(32, 16)
    c.blob(16, 8, 14, 5.5, rgb('#4f7f9e'), rgb('#2f4f66'), rgb('#7fb0cf'))
    c.rect(9, 6, 13, 6, rgb('#bfe0f0'))
    return c


def crate():
    c = C(16, 16)
    c.rect(1, 3, 14, 15, O)
    c.rect(2, 4, 13, 14, WOOD)
    c.rect(2, 4, 13, 4, WOOD_L)
    c.rect(2, 9, 13, 9, WOOD_D)
    for i in range(10):
        c.set(3 + i, 13 - i, WOOD_D)
    return c


def lava():
    c = C(32, 16)
    for f in range(2):
        r = random.Random(20 + f)
        for x in range(16):
            for y in range(16):
                c.set(f * 16 + x, y, rgb('#c8452a'))
        for _ in range(26):
            x, y = r.randrange(16), r.randrange(16)
            c.set(f * 16 + x, y, rgb('#f08a4b'))
            c.set(f * 16 + (x + 1) % 16, y, rgb('#ffd27a') if r.random() < .4 else rgb('#f08a4b'))
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    for i in range(4):
        floor(100 + i).save(f'floor{i}')
    wall_top().save('wall_top')
    wall_face().save('wall_face')
    for sd in 'lrt':
        edge(sd).save(f'edge_{sd}')
    torch().save('torch')
    beam().save('beam')
    stalagmite().save('stalagmite')
    pebbles().save('pebbles')
    puddle().save('puddle')
    crate().save('crate')
    lava().save('lava')
    print('saved cave art')


if __name__ == '__main__':
    main()
