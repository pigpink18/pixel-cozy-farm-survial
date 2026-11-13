"""Vẽ đồ nội thất cửa hàng (pixel art, bảng màu Farmer Pack).

Tạo: public/assets/fp/shop_<tên>.png
  counter (48x24)  quầy bán hàng
  shelf   (32x32)  kệ gỗ 3 tầng (hàng hoá đặt lên bằng code)
  crate   (16x16)  thùng gỗ
  barrel  (16x20)  thùng tròn
  sack    (16x16)  bao tải
  window  (16x16)  cửa sổ trên tường
  planks  (32x14)  chồng ván gỗ
  bench   (32x16)  bàn thợ mộc
Chạy: python3 tools/make_shop_props.py
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/fp')


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


O = rgb('#3d3333')
WL = rgb('#de9f47')   # gỗ sáng
W = rgb('#a57855')    # gỗ
WD = rgb('#734c44')   # gỗ tối
WDD = rgb('#5a3a36')
GOLD = rgb('#fdd179')
SACK = rgb('#e8cf9a')
SACK_D = rgb('#c9a46a')
GLASS = rgb('#9fd3e8')
GLASS_L = rgb('#e2f4fb')
GREY = rgb('#87857c')


class Canvas:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()
        self.w, self.h = w, h

    def rect(self, x0, y0, x1, y1, c):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            for y in range(max(0, y0), min(self.h, y1 + 1)):
                self.px[x, y] = c

    def box(self, x0, y0, x1, y1, fill, outline=O):
        self.rect(x0, y0, x1, y1, outline)
        self.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill)

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def save(self, name):
        self.im.save(os.path.join(OUT, f'shop_{name}.png'))


def counter():
    c = Canvas(48, 24)
    c.box(0, 0, 47, 8, WL)                 # mặt quầy
    c.rect(1, 1, 46, 1, GOLD)              # vệt sáng
    c.rect(1, 7, 46, 7, W)
    c.box(1, 8, 46, 23, W)                 # thân quầy
    for x in range(8, 46, 8):              # ván dọc
        c.rect(x, 9, x, 22, WD)
    c.rect(2, 21, 45, 22, WD)              # bóng chân quầy
    c.rect(2, 10, 45, 10, WL)
    return c


def shelf():
    c = Canvas(32, 32)
    c.box(0, 0, 31, 31, WDD)               # lưng kệ
    c.rect(1, 1, 1, 30, WD)
    c.rect(30, 1, 30, 30, WD)
    for y in (10, 20, 30):                  # 3 tầng ván
        c.rect(1, y - 1, 30, y, W)
        c.rect(1, y - 1, 30, y - 1, WL)
    c.rect(0, 31, 31, 31, O)
    return c


def crate():
    c = Canvas(16, 16)
    c.box(0, 2, 15, 15, W)
    c.rect(1, 3, 14, 3, WL)
    c.rect(1, 8, 14, 9, WD)
    c.rect(4, 3, 4, 14, WD)
    c.rect(11, 3, 11, 14, WD)
    for i in range(10):                    # nẹp chéo
        c.set(2 + i, 13 - i // 1 if i < 10 else 3, WL)
    return c


def barrel():
    c = Canvas(16, 20)
    c.box(1, 2, 14, 19, W)
    c.rect(0, 5, 15, 6, O)                 # đai
    c.rect(0, 14, 15, 15, O)
    c.rect(1, 5, 14, 5, GREY)
    c.rect(1, 14, 14, 14, GREY)
    c.rect(3, 3, 12, 3, WL)                # nắp
    c.rect(4, 7, 4, 13, WL)
    c.rect(11, 7, 11, 18, WD)
    return c


def sack():
    c = Canvas(16, 16)
    pts = [(5, 2), (10, 2)]
    c.box(2, 5, 13, 15, SACK)
    c.box(5, 1, 10, 5, SACK)
    c.rect(4, 5, 11, 5, O)                 # dây buộc
    c.rect(3, 6, 3, 14, rgb('#fff1cf'))
    c.rect(11, 8, 12, 14, SACK_D)
    c.rect(5, 9, 9, 11, SACK_D)            # chữ in trên bao
    return c


def window():
    c = Canvas(16, 16)
    c.box(1, 1, 14, 14, WD)
    c.rect(3, 3, 12, 12, GLASS)
    c.rect(3, 3, 6, 6, GLASS_L)
    c.rect(7, 3, 8, 12, WD)
    c.rect(3, 7, 12, 8, WD)
    c.rect(1, 13, 14, 14, WL)              # bậu cửa
    return c


def planks():
    c = Canvas(32, 14)
    for i, y in enumerate((8, 4, 0)):
        x0 = [0, 2, 5][i]
        c.box(x0, y, x0 + 26, y + 5, [W, WL, W][i])
        c.rect(x0 + 1, y + 4, x0 + 25, y + 4, WD)
    return c


def bench():
    c = Canvas(32, 16)
    c.box(0, 2, 31, 7, WL)                 # mặt bàn
    c.rect(1, 6, 30, 6, W)
    c.box(2, 7, 5, 15, WD)
    c.box(26, 7, 29, 15, WD)
    c.rect(6, 10, 25, 11, W)               # thanh ngang
    c.box(8, 0, 14, 2, GREY)               # búa, cưa trên bàn
    c.rect(18, 1, 27, 2, GREY)
    c.rect(16, 1, 17, 2, WD)
    return c


def main():
    for name, fn in [('counter', counter), ('shelf', shelf), ('crate', crate), ('barrel', barrel), ('sack', sack), ('window', window), ('planks', planks), ('bench', bench)]:
        fn().save(name)
        print('saved', name)


if __name__ == '__main__':
    main()
