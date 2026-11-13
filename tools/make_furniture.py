"""Vẽ bộ nội thất trang trí nhà (pixel art, bảng màu Farmer Pack / Tiny Wonder).

Tạo atlas: public/assets/furn/furn.png + furn.json (định dạng Phaser JSON Hash)
  - đồ đặt sàn, thảm, đồ treo tường
  - giấy dán tường (wall_*, 16x32) và sàn nhà (floor_*, 16x16)
  - ghép lại vài món có sẵn (giường, bàn, bếp) thành 1 hình để di chuyển được

Chạy: python3 tools/make_furniture.py
"""
from PIL import Image
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/furn')
TW = Image.open(os.path.join(ROOT, 'public/assets/tiny-wonder/furniture.png')).convert('RGBA')
INTERIOR = Image.open(os.path.join(ROOT, 'public/assets/interior/interior.png')).convert('RGBA')


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


O = rgb('#3d3333')
WL = rgb('#de9f47')
W = rgb('#a57855')
WD = rgb('#734c44')
WDD = rgb('#5a3a36')
GOLD = rgb('#fdd179')
CREAM = rgb('#fbe9c8')
CREAM_D = rgb('#e8cf9a')
WHITE = rgb('#ffffff')
GREY_L = rgb('#c9c7c0')
GREY = rgb('#87857c')
GREY_D = rgb('#5d5b55')
RED = rgb('#c85a4a')
RED_D = rgb('#93413a')
RED_L = rgb('#e58a73')
BLUE = rgb('#5479bd')
BLUE_D = rgb('#3a5390')
BLUE_L = rgb('#a3b5d2')
GREEN = rgb('#6f9a4f')
GREEN_D = rgb('#4a6b3a')
GREEN_L = rgb('#a2cf8e')
PINK = rgb('#e88aa0')
PINK_D = rgb('#b9607a')
PINK_L = rgb('#f6c3cf')
PURPLE = rgb('#8e6aa0')
PURPLE_D = rgb('#62487a')
TEAL = rgb('#4f9a9a')
TEAL_L = rgb('#9fd3e8')
TEAL_D = rgb('#356b6e')
ORANGE = rgb('#ec9a4e')
YELLOW = rgb('#f2d16b')
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

    def ellipse(self, cx, cy, rx, ry, fill, outline=O):
        for x in range(self.w):
            for y in range(self.h):
                d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
                if d <= 1:
                    self.px[x, y] = fill
        # viền
        pts = [(x, y) for x in range(self.w) for y in range(self.h) if self.px[x, y] == fill and ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1]
        s = set(pts)
        for x, y in pts:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) not in s:
                    self.px[x, y] = outline
                    break
        return self

    def paste(self, im, x, y):
        self.im.alpha_composite(im, (x, y))
        self.px = self.im.load()
        return self


def tw(col, row):
    return TW.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16))


def it(i):
    return INTERIOR.crop(((i % 10) * 16, (i // 10) * 16, (i % 10) * 16 + 16, (i // 10) * 16 + 16))


# ---------------- Đồ có sẵn ghép lại ----------------
def old_bed():
    c = C(16, 32)
    c.paste(tw(0, 0), 0, 0).paste(tw(0, 1), 0, 16)
    return c


def old_table():
    c = C(32, 32)
    c.paste(tw(2, 0), 0, 0).paste(tw(3, 0), 16, 0).paste(tw(2, 1), 0, 16).paste(tw(3, 1), 16, 16)
    return c


def old_stove():
    """Bếp lò + nồi (32x24)."""
    c = C(32, 24)
    c.box(0, 8, 31, 23, GREY_D)                # thân bếp
    c.rect(1, 9, 30, 9, GREY)
    c.box(2, 12, 14, 21, BLACK)                # cửa lò
    c.rect(4, 14, 12, 15, ORANGE), c.rect(5, 16, 11, 16, RED)
    c.box(17, 12, 29, 21, GREY)                # ngăn kéo
    c.rect(21, 16, 25, 16, O)
    c.box(3, 1, 13, 9, GREY_L)                 # nồi
    c.rect(4, 2, 12, 2, WHITE)
    c.rect(1, 4, 2, 5, GREY_D), c.rect(14, 4, 15, 5, GREY_D)
    c.ellipse(23, 7, 5, 2, BLACK)              # chảo
    c.rect(27, 6, 31, 7, WD)
    c.set(7, 0, WHITE), c.set(9, -1, WHITE)
    return c


# ---------------- Giường ----------------
def bed(quilt, quilt_d, quilt_l, w=16):
    c = C(w, 32)
    c.box(0, 0, w - 1, 31, WD)                 # khung
    c.box(1, 0, w - 2, 7, W)                   # đầu giường
    c.rect(2, 1, w - 3, 1, WL)
    c.box(2, 6, w - 3, 12, WHITE)              # gối
    if w > 16:
        c.rect(w // 2, 7, w // 2, 11, GREY_L)
    c.rect(3, 11, w - 4, 11, GREY_L)
    c.box(1, 12, w - 2, 29, quilt)             # chăn
    c.rect(2, 13, w - 3, 14, quilt_l)
    c.rect(2, 27, w - 3, 28, quilt_d)
    for x in range(4, w - 3, 5):
        c.set(x, 19, quilt_l), c.set(x + 1, 22, quilt_d)
    c.rect(1, 30, w - 2, 31, WDD)
    return c


# ---------------- Ghế, sofa ----------------
def sofa(col, col_d, col_l):
    c = C(32, 22)
    c.box(1, 0, 30, 12, col)                   # lưng
    c.rect(2, 1, 29, 2, col_l)
    c.rect(15, 3, 16, 11, col_d)
    c.box(0, 7, 4, 19, col)                    # tay vịn
    c.box(27, 7, 31, 19, col)
    c.box(4, 11, 27, 19, col_l)                # đệm
    c.rect(15, 12, 16, 18, col)
    c.rect(5, 18, 26, 18, col)
    c.rect(1, 20, 2, 21, WDD), c.rect(29, 20, 30, 21, WDD)
    return c


def armchair(col, col_d, col_l):
    c = C(16, 20)
    c.box(2, 0, 13, 10, col)
    c.rect(3, 1, 12, 2, col_l)
    c.box(0, 6, 3, 17, col), c.box(12, 6, 15, 17, col)
    c.box(3, 10, 12, 17, col_l)
    c.rect(4, 16, 11, 16, col)
    c.rect(1, 18, 2, 19, WDD), c.rect(13, 18, 14, 19, WDD)
    return c


def stool_round():
    c = C(16, 16)
    c.ellipse(8, 5, 6, 3.5, RED)
    c.rect(4, 3, 10, 3, RED_L)
    c.rect(4, 8, 5, 15, WD), c.rect(10, 8, 11, 15, WD)
    c.rect(4, 12, 11, 12, W)
    return c


def chair(col):
    c = C(16, 22)
    c.box(3, 0, 12, 10, W)                     # lưng ghế
    c.rect(4, 1, 11, 1, WL)
    c.rect(5, 3, 10, 8, col)
    c.box(2, 10, 13, 14, WL)                   # mặt ghế
    c.rect(3, 15, 4, 21, WD), c.rect(11, 15, 12, 21, WD)
    return c


# ---------------- Bàn ----------------
def table_round(top, top_l, w=32):
    c = C(w, 22)
    c.ellipse(w / 2, 7, w / 2 - 0.5, 6.5, top)
    c.rect(w // 2 - 6, 3, w // 2 + 2, 3, top_l)
    c.rect(w // 2 - 2, 13, w // 2 + 1, 20, WD)
    c.rect(w // 2 - 6, 20, w // 2 + 5, 21, WDD)
    return c


def table_long():
    c = C(32, 22)
    c.box(0, 0, 31, 12, WL)
    c.rect(1, 1, 30, 2, GOLD)
    c.rect(1, 11, 30, 11, W)
    c.box(1, 12, 30, 15, W)
    c.rect(2, 16, 4, 21, WD), c.rect(27, 16, 29, 21, WD)
    # khăn trải bàn caro
    for x in range(8, 24):
        for y in range(2, 10):
            if (x // 2 + y // 2) % 2 == 0:
                c.set(x, y, RED_L if (x // 2) % 2 else WHITE)
    return c


def coffee_table():
    c = C(32, 14)
    c.box(0, 0, 31, 7, W)
    c.rect(1, 1, 30, 1, WL)
    c.box(2, 7, 29, 9, WD)
    c.rect(3, 10, 4, 13, WDD), c.rect(27, 10, 28, 13, WDD)
    c.box(12, -2, 19, 3, CREAM)                # cuốn sách
    c.rect(13, 1, 18, 1, RED)
    return c


def desk():
    c = C(32, 24)
    c.box(0, 8, 31, 13, WL)
    c.rect(1, 9, 30, 9, GOLD)
    c.box(1, 13, 12, 23, W)
    c.rect(3, 16, 10, 16, WD), c.rect(3, 20, 10, 20, WD)
    c.rect(27, 14, 29, 23, WD)
    c.box(16, 0, 27, 9, GREY_D)                # đèn bàn / sách
    c.rect(17, 1, 26, 2, GREY_L)
    c.box(3, 3, 9, 9, BLUE)
    c.rect(4, 4, 8, 4, BLUE_L)
    return c


# ---------------- Tủ, kệ ----------------
def bookshelf():
    c = C(16, 32)
    c.box(0, 0, 15, 31, W)
    c.rect(1, 1, 14, 1, WL)
    cols = [RED, BLUE, GREEN, YELLOW, PURPLE, TEAL, ORANGE, PINK]
    for i, y in enumerate((3, 12, 21)):
        c.rect(1, y + 8, 14, y + 8, WD)
        x = 2
        k = i * 3
        while x < 13:
            bw = 2 if (x + k) % 3 else 3
            h = 6 if (x + k) % 2 else 7
            c.rect(x, y + 8 - h, x + bw - 1, y + 7, cols[(x + k) % len(cols)])
            c.set(x, y + 8 - h, O)
            x += bw + (1 if (x + i) % 4 == 0 else 0)
    c.rect(1, 30, 14, 31, WD)
    return c


def wardrobe():
    c = C(32, 32)
    c.box(0, 0, 31, 31, W)
    c.rect(1, 1, 30, 2, WL)
    c.box(2, 4, 15, 28, WL)
    c.box(16, 4, 29, 28, WL)
    c.rect(3, 5, 14, 5, GOLD), c.rect(17, 5, 28, 5, GOLD)
    c.rect(13, 15, 13, 18, O), c.rect(18, 15, 18, 18, O)
    c.rect(1, 29, 30, 31, WD)
    return c


def dresser():
    c = C(32, 26)
    c.box(0, 6, 31, 25, W)
    c.rect(1, 7, 30, 7, WL)
    for y in (9, 15, 21):
        c.box(2, y, 29, y + 4, WL)
        c.rect(14, y + 2, 17, y + 2, O)
    c.box(4, 0, 9, 6, PINK)                    # lọ hoa nhỏ
    c.rect(5, 1, 8, 1, PINK_L)
    c.box(20, 2, 27, 6, CREAM)                 # hộp
    return c


def cabinet():
    c = C(16, 24)
    c.box(0, 4, 15, 23, W)
    c.rect(1, 5, 14, 5, WL)
    c.box(2, 7, 7, 21, WL), c.box(8, 7, 13, 21, WL)
    c.set(6, 14, O), c.set(9, 14, O)
    c.ellipse(8, 2.5, 3, 2.5, TEAL)            # bình
    return c


def fridge():
    c = C(16, 30)
    c.box(0, 0, 15, 29, WHITE)
    c.rect(1, 1, 14, 1, rgb('#eef2f5'))
    c.rect(1, 10, 14, 10, GREY_L)
    c.rect(12, 3, 12, 8, GREY), c.rect(12, 13, 12, 19, GREY)
    c.rect(1, 27, 14, 28, GREY_L)
    c.box(3, 13, 6, 16, RED), c.box(7, 15, 9, 17, YELLOW)   # nam châm
    return c


def kitchen_counter(top=GREY_L):
    c = C(16, 24)
    c.box(0, 6, 15, 10, top)
    c.rect(1, 7, 14, 7, WHITE)
    c.box(0, 10, 15, 23, W)
    c.box(2, 12, 13, 21, WL)
    c.rect(6, 15, 9, 15, O)
    c.box(3, 0, 8, 6, CREAM)                   # hũ
    c.rect(4, 1, 7, 1, RED)
    c.box(10, 2, 13, 6, GREEN)
    return c


def sink():
    c = C(16, 24)
    c.box(0, 6, 15, 10, GREY_L)
    c.box(3, 7, 12, 9, TEAL_L)
    c.rect(7, 1, 8, 6, GREY), c.rect(7, 1, 11, 2, GREY)
    c.box(0, 10, 15, 23, W)
    c.box(2, 12, 13, 21, WL)
    c.rect(7, 13, 8, 20, WD)
    return c


# ---------------- Đồ lớn ----------------
def fireplace():
    c = C(32, 32)
    c.box(0, 4, 31, 31, rgb('#b06a4d'))        # gạch
    for y in range(6, 31, 4):
        off = 0 if (y // 4) % 2 else 4
        for x in range(off + 1, 31, 8):
            c.rect(x, y, x, y + 3, rgb('#8a4f3a'))
        c.rect(1, y + 3, 30, y + 3, rgb('#8a4f3a'))
    c.box(0, 0, 31, 5, W)                      # mặt lò
    c.rect(1, 1, 30, 1, WL)
    c.box(7, 12, 24, 31, BLACK)
    c.ellipse(16, 25, 6, 6, ORANGE, RED)       # lửa
    c.ellipse(16, 27, 3.5, 4, YELLOW, ORANGE)
    c.rect(9, 29, 22, 30, WD)
    c.box(3, -1, 7, 1, GOLD)                   # đồ trên bệ
    return c


def piano():
    c = C(32, 28)
    c.box(0, 0, 31, 17, BLACK)
    c.rect(1, 1, 30, 2, GREY_D)
    c.box(4, 4, 27, 9, CREAM)                  # giá nhạc
    c.rect(6, 6, 25, 6, GREY), c.rect(6, 8, 20, 8, GREY)
    c.box(0, 16, 31, 21, WHITE)               # phím
    for x in range(3, 31, 4):
        c.rect(x, 17, x + 1, 19, BLACK)
    c.box(0, 21, 31, 23, BLACK)
    c.rect(2, 24, 3, 27, BLACK), c.rect(28, 24, 29, 27, BLACK)
    return c


def aquarium():
    c = C(32, 26)
    c.box(0, 0, 31, 17, TEAL_L)
    c.rect(1, 1, 30, 2, rgb('#d6f0f7'))
    c.rect(1, 14, 30, 16, CREAM_D)             # cát
    c.rect(5, 8, 6, 14, GREEN), c.rect(7, 10, 7, 14, GREEN_D), c.rect(25, 9, 26, 14, GREEN)
    for (fx, fy, col) in ((11, 6, ORANGE), (19, 10, YELLOW), (14, 11, RED_L)):
        c.rect(fx, fy, fx + 3, fy + 1, col), c.set(fx - 1, fy, col), c.set(fx + 1, fy - 1, O)
    c.set(22, 4, WHITE), c.set(23, 2, WHITE)
    c.box(0, 17, 31, 25, W)
    c.rect(1, 18, 30, 18, WL)
    c.rect(14, 21, 17, 21, O)
    return c


def bathtub():
    c = C(32, 20)
    c.box(0, 2, 31, 17, WHITE)
    c.box(3, 4, 28, 10, TEAL_L)
    c.rect(4, 5, 12, 5, WHITE)
    c.ellipse(9, 6, 3, 2, WHITE, GREY_L)       # bọt
    c.ellipse(20, 7, 4, 2.5, WHITE, GREY_L)
    c.rect(26, 0, 27, 3, GREY)
    c.rect(2, 18, 4, 19, GOLD), c.rect(27, 18, 29, 19, GOLD)
    return c


def tv_radio():
    c = C(16, 16)
    c.box(1, 3, 14, 12, WD)
    c.rect(2, 4, 13, 4, W)
    c.box(3, 6, 8, 11, GREY_D)                 # loa
    for y in (7, 9):
        c.rect(4, y, 7, y, GREY)
    c.ellipse(11.5, 8, 1.5, 1.5, GOLD)
    c.rect(4, 0, 4, 3, GREY), c.set(3, 0, GREY)
    c.rect(2, 13, 3, 15, WDD), c.rect(12, 13, 13, 15, WDD)
    return c


def toy_box():
    c = C(16, 16)
    c.box(0, 4, 15, 15, RED)
    c.rect(1, 5, 14, 5, RED_L)
    c.box(0, 2, 15, 5, YELLOW)
    c.ellipse(4, 2.5, 2.5, 2.5, BLUE)          # bóng
    c.box(9, -1, 13, 3, GREEN)                 # khối
    c.rect(6, 9, 9, 10, YELLOW)
    return c


def floor_lamp():
    c = C(16, 28)
    c.box(3, 0, 12, 7, CREAM)
    c.rect(4, 1, 11, 1, WHITE)
    c.rect(3, 7, 12, 7, O)
    c.rect(7, 8, 8, 25, GREY_D)
    c.box(4, 25, 11, 27, GREY_D)
    return c


def table_lamp():
    c = C(16, 18)
    c.box(1, 6, 14, 17, W)                     # tủ đầu giường
    c.rect(2, 7, 13, 7, WL)
    c.rect(6, 11, 9, 11, O)
    c.box(4, 0, 11, 4, YELLOW)
    c.rect(7, 4, 8, 6, GREY_D)
    return c


# ---------------- Cây ----------------
def plant_big():
    c = C(16, 28)
    for (cx, cy, r) in ((8, 8, 6), (4, 12, 4), (12, 12, 4), (8, 4, 4)):
        c.ellipse(cx, cy, r, r, GREEN, GREEN_D)
    for (x, y) in ((6, 6), (10, 9), (4, 12), (9, 3)):
        c.set(x, y, GREEN_L), c.set(x + 1, y, GREEN_L)
    c.rect(7, 16, 8, 19, GREEN_D)
    c.box(3, 19, 12, 27, rgb('#b06a4d'))
    c.rect(4, 20, 11, 20, rgb('#d58a66'))
    return c


def cactus():
    c = C(16, 20)
    c.box(6, 1, 10, 14, GREEN)
    c.rect(7, 2, 7, 13, GREEN_L)
    c.box(2, 5, 5, 10, GREEN), c.box(11, 3, 14, 9, GREEN)
    c.set(8, 0, PINK), c.set(9, 0, PINK)
    c.box(4, 13, 12, 19, ORANGE)
    c.rect(5, 14, 11, 14, YELLOW)
    return c


def flower_vase(col, col_l):
    c = C(16, 20)
    for (cx, cy) in ((5, 4), (11, 4), (8, 2), (8, 7)):
        c.ellipse(cx, cy, 2.5, 2.5, col, O)
        c.set(int(cx), int(cy) - 1, col_l)
    c.rect(7, 8, 8, 11, GREEN_D), c.set(5, 9, GREEN), c.set(10, 9, GREEN)
    c.box(4, 11, 11, 19, BLUE_L)
    c.rect(5, 12, 10, 12, WHITE)
    return c


def hanging_plant():
    c = C(16, 16)
    c.rect(7, 0, 8, 3, GREY_D)
    c.box(4, 3, 11, 8, rgb('#b06a4d'))
    for x, h in ((3, 13), (6, 15), (9, 12), (12, 14)):
        c.rect(x, 7, x, h, GREEN_D)
        c.set(x - 1, h - 2, GREEN), c.set(x + 1, h - 4, GREEN_L)
    c.ellipse(8, 6, 4, 2.5, GREEN, GREEN_D)
    return c


# ---------------- Đồ treo tường ----------------
def painting(scene):
    c = C(16, 14)
    c.box(0, 0, 15, 13, GOLD)
    c.rect(1, 1, 14, 1, rgb('#fff1cf'))
    c.box(2, 2, 13, 11, rgb('#9fd3e8'))
    if scene == 'mountain':
        for x in range(3, 13):
            h = 9 - abs(x - 7) if x < 11 else 9 - abs(x - 11) * 2
            c.rect(x, max(3, 10 - h), x, 10, GREY if x < 9 else GREY_L)
        c.rect(3, 10, 12, 10, GREEN)
    elif scene == 'sun':
        c.rect(3, 8, 12, 10, GREEN)
        c.ellipse(10, 5, 2.5, 2.5, YELLOW, ORANGE)
        c.rect(3, 9, 6, 9, GREEN_L)
    elif scene == 'flower':
        c.rect(3, 3, 12, 10, CREAM)
        c.ellipse(8, 5, 3, 2.5, PINK, PINK_D)
        c.rect(8, 7, 8, 10, GREEN_D), c.set(7, 9, GREEN)
    elif scene == 'farm':
        c.rect(3, 7, 12, 10, GREEN)
        c.box(5, 4, 10, 9, RED)
        c.rect(4, 3, 11, 4, RED_D)
        c.rect(7, 7, 8, 9, WD)
    return c


def clock():
    c = C(16, 16)
    c.ellipse(8, 8, 7, 7, CREAM, WD)
    c.set(8, 2, O), c.set(8, 13, O), c.set(2, 8, O), c.set(13, 8, O)
    c.rect(8, 4, 8, 8, O)
    c.rect(8, 8, 11, 8, RED)
    return c


def wall_window(curtain, curtain_d):
    c = C(16, 16)
    c.box(1, 1, 14, 14, WD)
    c.rect(3, 3, 12, 12, TEAL_L)
    c.rect(3, 3, 6, 6, rgb('#e2f4fb'))
    c.rect(7, 3, 8, 12, WD), c.rect(3, 7, 12, 8, WD)
    c.rect(0, 0, 3, 15, curtain), c.rect(12, 0, 15, 15, curtain)
    c.rect(3, 0, 3, 15, curtain_d), c.rect(12, 0, 12, 15, curtain_d)
    c.rect(0, 0, 15, 1, WDD)
    return c


def wall_shelf():
    c = C(32, 14)
    c.box(0, 9, 31, 11, W)
    c.rect(1, 9, 30, 9, WL)
    c.rect(3, 12, 4, 13, WD), c.rect(27, 12, 28, 13, WD)
    c.box(2, 3, 7, 9, CREAM), c.rect(3, 4, 6, 4, RED)        # hũ mứt
    c.box(10, 1, 15, 9, BLUE_L)                             # bình
    c.ellipse(21, 6, 3, 3, ORANGE)                          # bí nhỏ
    c.rect(21, 2, 21, 3, GREEN_D)
    c.box(25, 4, 29, 9, GREEN)
    return c


def mirror():
    c = C(16, 16)
    c.ellipse(8, 8, 6.5, 7.5, GOLD, WD)
    c.ellipse(8, 8, 4.5, 5.5, rgb('#d6f0f7'), GOLD)
    c.rect(6, 5, 6, 8, WHITE)
    return c


def calendar():
    c = C(16, 16)
    c.box(2, 1, 13, 14, WHITE)
    c.box(2, 1, 13, 4, RED)
    for y in (6, 9, 12):
        for x in (4, 7, 10):
            c.set(x, y, GREY), c.set(x + 1, y, GREY)
    c.set(10, 9, RED), c.set(11, 9, RED)
    return c


def garland():
    c = C(32, 10)
    for x in range(32):
        y = 2 + int(2.5 * (1 - ((x - 16) / 16) ** 2))
        c.set(x, y, GREEN_D)
    for i, x in enumerate(range(2, 31, 5)):
        y = 3 + int(2.5 * (1 - ((x - 16) / 16) ** 2))
        col = [RED, YELLOW, BLUE, PINK, GREEN, ORANGE][i % 6]
        c.rect(x - 1, y, x + 1, y + 3, col)
        c.set(x, y + 4, col)
    return c


# ---------------- Thảm ----------------
def rug(w, h, col, col_d, col_l, pattern='border'):
    c = C(w, h)
    c.box(0, 0, w - 1, h - 1, col, col_d)
    if pattern == 'border':
        c.rect(2, 2, w - 3, 2, col_l), c.rect(2, h - 3, w - 3, h - 3, col_l)
        c.rect(2, 2, 2, h - 3, col_l), c.rect(w - 3, 2, w - 3, h - 3, col_l)
        for x in range(5, w - 5, 4):
            c.set(x, h // 2, col_l), c.set(x + 1, h // 2 - 1, col_d)
    elif pattern == 'stripe':
        for y in range(2, h - 2, 3):
            c.rect(1, y, w - 2, y, col_l)
    elif pattern == 'check':
        for x in range(1, w - 1):
            for y in range(1, h - 1):
                if ((x - 1) // 4 + (y - 1) // 4) % 2:
                    c.set(x, y, col_l)
    # tua rua
    for x in range(1, w - 1, 2):
        c.set(x, 0, CREAM), c.set(x, h - 1, CREAM)
    return c


def rug_round(w, h, col, col_d, col_l):
    c = C(w, h)
    c.ellipse(w / 2, h / 2, w / 2 - 0.5, h / 2 - 0.5, col, col_d)
    c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, col_l, col_l)
    c.ellipse(w / 2, h / 2, w / 2 - 7, h / 2 - 7, col, col)
    return c


# ---------------- Tường & sàn ----------------
def wallpaper(kind):
    c = C(16, 32)
    base = {'cream': CREAM, 'green': rgb('#b9d8a0'), 'blue': rgb('#b7cbe6'), 'pink': PINK_L, 'wood': W, 'brick': rgb('#b06a4d'), 'purple': rgb('#c9b2d6'), 'mint': rgb('#bfe3d4')}[kind]
    c.rect(0, 0, 15, 31, base)
    if kind == 'cream':
        for x in (3, 11):
            c.rect(x, 0, x + 1, 25, CREAM_D)
    elif kind == 'green':
        for (x, y) in ((3, 4), (11, 12), (4, 19), (12, 3), (7, 11)):
            c.set(x, y, GREEN), c.set(x + 1, y - 1, GREEN), c.set(x, y + 1, GREEN_D)
    elif kind == 'blue':
        for y in range(0, 26, 8):
            c.rect(0, y, 15, y, BLUE_L)
        for x in range(0, 16, 8):
            c.rect(x, 0, x, 25, BLUE_L)
    elif kind == 'pink':
        for (x, y) in ((3, 3), (11, 7), (5, 13), (13, 17), (3, 21), (9, 23)):
            c.rect(x, y, x + 1, y + 1, WHITE)
    elif kind == 'wood':
        for x in (0, 5, 10):
            c.rect(x, 0, x, 25, WD)
        c.rect(1, 0, 3, 25, rgb('#b88765'))
    elif kind == 'brick':
        for y in range(0, 26, 4):
            off = 0 if (y // 4) % 2 else 4
            c.rect(0, y + 3, 15, y + 3, rgb('#8a4f3a'))
            for x in range(off, 16, 8):
                c.rect(x, y, x, y + 3, rgb('#8a4f3a'))
    elif kind == 'purple':
        for y in range(2, 26, 6):
            for x in range(1 + (y // 6) % 2 * 4, 16, 8):
                c.set(x, y, PURPLE), c.set(x + 1, y + 1, PURPLE), c.set(x - 1, y + 1, PURPLE), c.set(x, y + 2, PURPLE)
    elif kind == 'mint':
        for y in range(0, 26):
            if y % 6 < 3:
                c.rect(0, y, 15, y, rgb('#a8d6c3')) if y % 6 == 0 else None
    # chân tường (len chân tường gỗ)
    c.rect(0, 26, 15, 29, WL)
    c.rect(0, 26, 15, 26, GOLD)
    c.rect(0, 30, 15, 31, WD)
    return c


def floor_tile(kind):
    c = C(16, 16)
    if kind == 'wood_dark':
        c.rect(0, 0, 15, 15, rgb('#8a5a40'))
        for y in (3, 7, 11, 15):
            c.rect(0, y, 15, y, rgb('#6b4231'))
        for (x, y) in ((5, 0), (11, 4), (3, 8), (9, 12)):
            c.rect(x, y, x, y + 2, rgb('#6b4231'))
        c.rect(1, 1, 3, 1, rgb('#a06c4f'))
    elif kind == 'check':
        for x in range(16):
            for y in range(16):
                c.set(x, y, WHITE if (x // 8 + y // 8) % 2 == 0 else rgb('#3d3a44'))
    elif kind == 'tile_blue':
        c.rect(0, 0, 15, 15, rgb('#cfe0ef'))
        c.rect(0, 0, 15, 0, rgb('#9fb6cf')), c.rect(0, 0, 0, 15, rgb('#9fb6cf'))
        c.rect(0, 8, 15, 8, rgb('#9fb6cf')), c.rect(8, 0, 8, 15, rgb('#9fb6cf'))
        c.set(4, 4, WHITE), c.set(12, 12, WHITE)
    elif kind == 'stone':
        c.rect(0, 0, 15, 15, GREY_L)
        for (x0, y0, x1, y1) in ((0, 0, 8, 6), (9, 0, 15, 9), (0, 7, 6, 15), (7, 10, 15, 15)):
            c.box(x0, y0, x1, y1, GREY_L, GREY)
        c.set(3, 2, WHITE), c.set(12, 4, WHITE)
    elif kind == 'carpet':
        c.rect(0, 0, 15, 15, rgb('#d9b98f'))
        for (x, y) in ((2, 3), (9, 1), (13, 9), (5, 11), (10, 14)):
            c.set(x, y, rgb('#c4a079'))
    elif kind == 'pink':
        c.rect(0, 0, 15, 15, rgb('#f2c7c2'))
        for y in (7, 15):
            c.rect(0, y, 15, y, rgb('#d9a09a'))
        c.rect(7, 0, 7, 7, rgb('#d9a09a')), c.rect(15, 8, 15, 15, rgb('#d9a09a'))
    elif kind == 'grass':
        c.rect(0, 0, 15, 15, rgb('#8fbf6a'))
        for (x, y) in ((2, 2), (9, 5), (5, 10), (13, 12), (11, 1)):
            c.set(x, y, rgb('#6f9a4f')), c.set(x, y + 1, rgb('#6f9a4f'))
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    sprites = {
        # có sẵn
        'bed_basic': old_bed(), 'table_basic': old_table(), 'stove': old_stove(),
        # giường
        'bed_blue': bed(BLUE, BLUE_D, BLUE_L), 'bed_pink': bed(PINK, PINK_D, PINK_L), 'bed_green': bed(GREEN, GREEN_D, GREEN_L),
        'bed_double': bed(RED, RED_D, RED_L, 32), 'bed_double_purple': bed(PURPLE, PURPLE_D, rgb('#c9b2d6'), 32),
        # ngồi
        'sofa_red': sofa(RED, RED_D, RED_L), 'sofa_blue': sofa(BLUE, BLUE_D, BLUE_L), 'sofa_green': sofa(GREEN, GREEN_D, GREEN_L),
        'armchair_red': armchair(RED, RED_D, RED_L), 'armchair_teal': armchair(TEAL, TEAL_D, TEAL_L),
        'stool_round': stool_round(), 'chair_wood': chair(RED), 'chair_blue': chair(BLUE),
        # bàn
        'table_round': table_round(WL, GOLD), 'table_long': table_long(), 'coffee_table': coffee_table(), 'desk': desk(),
        # tủ kệ
        'bookshelf': bookshelf(), 'wardrobe': wardrobe(), 'dresser': dresser(), 'cabinet': cabinet(),
        'fridge': fridge(), 'kitchen_counter': kitchen_counter(), 'sink': sink(),
        # lớn
        'fireplace': fireplace(), 'piano': piano(), 'aquarium': aquarium(), 'bathtub': bathtub(),
        'radio': tv_radio(), 'toy_box': toy_box(), 'floor_lamp': floor_lamp(), 'table_lamp': table_lamp(),
        # cây
        'plant_big': plant_big(), 'cactus': cactus(), 'vase_pink': flower_vase(PINK, PINK_L), 'vase_yellow': flower_vase(YELLOW, WHITE),
        # tường
        'hanging_plant': hanging_plant(), 'painting_mountain': painting('mountain'), 'painting_sun': painting('sun'),
        'painting_flower': painting('flower'), 'painting_farm': painting('farm'), 'clock': clock(),
        'window_red': wall_window(RED, RED_D), 'window_blue': wall_window(BLUE, BLUE_D), 'wall_shelf': wall_shelf(),
        'mirror': mirror(), 'calendar': calendar(), 'garland': garland(),
        # thảm
        'rug_red': rug(32, 32, RED, RED_D, RED_L), 'rug_blue': rug(48, 32, BLUE, BLUE_D, BLUE_L, 'stripe'),
        'rug_green': rug_round(48, 32, GREEN, GREEN_D, GREEN_L), 'rug_check': rug(32, 32, YELLOW, ORANGE, CREAM, 'check'),
        'rug_pink': rug_round(32, 32, PINK, PINK_D, PINK_L), 'rug_long': rug(48, 16, PURPLE, PURPLE_D, rgb('#c9b2d6')),
    }
    for k in ('cream', 'green', 'blue', 'pink', 'wood', 'brick', 'purple', 'mint'):
        sprites[f'wall_{k}'] = wallpaper(k)
    sprites['floor_wood'] = C(16, 16).paste(it(19), 0, 0)
    for k in ('wood_dark', 'check', 'tile_blue', 'stone', 'carpet', 'pink', 'grass'):
        sprites[f'floor_{k}'] = floor_tile(k)

    # Cắt bớt hàng trong suốt ở đáy (đồ ghép từ hình cũ) để đáy ảnh = chân đồ
    for name, c in list(sprites.items()):
        if name.startswith(('wall_', 'floor_')):
            continue
        bb = c.im.getbbox()
        if bb and bb[3] < c.h:
            t = C(c.w, bb[3])
            t.paste(c.im.crop((0, 0, c.w, bb[3])), 0, 0)
            sprites[name] = t
    # Xếp vào atlas theo hàng
    W_MAX = 256
    x = y = row_h = 0
    places = {}
    for name, c in sprites.items():
        w, h = c.im.size
        if x + w > W_MAX:
            x, y, row_h = 0, y + row_h + 1, 0
        places[name] = (x, y, w, h)
        x += w + 1
        row_h = max(row_h, h)
    sheet = Image.new('RGBA', (W_MAX, y + row_h + 1), T)
    frames = {}
    for name, c in sprites.items():
        px, py, w, h = places[name]
        sheet.paste(c.im, (px, py))
        frames[name] = {'frame': {'x': px, 'y': py, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
                        'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}}
    sheet.save(os.path.join(OUT, 'furn.png'))
    with open(os.path.join(OUT, 'furn.json'), 'w') as f:
        json.dump({'frames': frames, 'meta': {'image': 'furn.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': '1'}}, f)
    print('saved', len(sprites), 'sprites', sheet.size)


if __name__ == '__main__':
    main()
