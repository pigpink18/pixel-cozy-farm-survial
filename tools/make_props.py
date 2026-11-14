"""Vẽ đồ trang trí ngoài trời (pixel art, cùng bảng màu với nội thất / Farmer Pack).

Tạo atlas: public/assets/props/props.png + props.json (Phaser JSON Hash).
Đáy mỗi hình = chân đồ vật (đặt origin 0.5, 1).

Chạy: python3 tools/make_props.py
"""
import json
import os
import random

from PIL import Image

from make_furniture import (C, O, WL, W, WD, WDD, GOLD, CREAM, CREAM_D, WHITE, GREY_L, GREY, GREY_D, RED, RED_D, RED_L,
                            BLUE, BLUE_D, BLUE_L, GREEN, GREEN_D, GREEN_L, PINK, PINK_L, PURPLE, PURPLE_D, TEAL, TEAL_L,
                            TEAL_D, ORANGE, YELLOW, BLACK, T, rgb)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/props')

STONE, STONE_L, STONE_D = rgb('#a39c95'), rgb('#cbc5be'), rgb('#77706a')
WATER, WATER_L, WATER_D = rgb('#5479bd'), rgb('#a3b5d2'), rgb('#3a5390')
LEAF, LEAF_D, LEAF_L = rgb('#6ea533'), rgb('#4a7840'), rgb('#b6bd56')
HAY, HAY_D, HAY_L = rgb('#e2b45a'), rgb('#b5843a'), rgb('#f6dc8c')
IRON, IRON_L = rgb('#3d3a40'), rgb('#6a6670')
LAMP = rgb('#ffe9a0')


def outline(c, color=O):
    """Viền 1px quanh mọi điểm không trong suốt (vẽ ra ngoài)."""
    px = c.px
    pts = [(x, y) for x in range(c.w) for y in range(c.h) if px[x, y][3] and px[x, y] != color]
    s = set(pts)
    for x, y in pts:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < c.w and 0 <= ny < c.h and (nx, ny) not in s and px[nx, ny][3] == 0:
                px[nx, ny] = color
    return c


def hline(c, x0, x1, y, col):
    c.rect(x0, y, x1, y, col)


# ---------------- Giếng nước ----------------
def well():
    c = C(32, 42)
    # mái gỗ
    for i in range(7):
        hline(c, 6 - i // 2 + 1, 25 + i // 2 - 1, 3 + i, WD if i % 2 else W)
    hline(c, 4, 27, 10, WDD)
    hline(c, 6, 25, 3, WL)
    # cột
    c.rect(6, 11, 7, 24, W), c.rect(24, 11, 25, 24, W)
    c.rect(6, 11, 6, 24, WL), c.rect(25, 11, 25, 24, WD)
    # trục & dây & gầu
    hline(c, 8, 23, 14, GREY_D)
    c.rect(15, 15, 15, 20, CREAM_D)
    c.box(13, 20, 18, 24, W)
    hline(c, 14, 17, 21, WL)
    # thành giếng đá
    c.ellipse(16, 27, 13, 4, WATER_D)
    c.rect(3, 27, 28, 38, STONE)
    for y in range(28, 39, 3):
        for x in range(3 + (y % 2) * 3, 29, 6):
            c.rect(x, y, x, y + 1, STONE_D)
        hline(c, 3, 28, y + 2, STONE_D)
    c.ellipse(16, 27, 13, 4, STONE_L)
    c.ellipse(16, 27, 10, 2.6, WATER_D)
    hline(c, 12, 15, 27, WATER)
    outline(c)
    return c


# ---------------- Đèn đường ----------------
def lamp():
    c = C(14, 40)
    c.rect(6, 12, 7, 37, IRON), c.rect(6, 12, 6, 37, IRON_L)
    c.rect(4, 36, 9, 39, IRON), hline(c, 4, 9, 36, IRON_L)
    # đầu đèn
    c.rect(3, 2, 10, 3, IRON)
    c.rect(4, 4, 9, 10, LAMP)
    c.rect(4, 4, 4, 10, IRON), c.rect(9, 4, 9, 10, IRON)
    c.rect(6, 5, 7, 8, WHITE)
    hline(c, 3, 10, 11, IRON)
    c.set(6, 1, IRON), c.set(7, 1, IRON), c.set(6, 0, IRON_L)
    outline(c)
    return c


# ---------------- Ghế dài ----------------
def bench():
    c = C(32, 22)
    for y, col in ((2, WL), (3, W), (5, WL), (6, W)):  # tựa lưng 2 thanh
        hline(c, 2, 29, y, col)
    hline(c, 2, 29, 4, WD), hline(c, 2, 29, 7, WD)
    c.rect(4, 8, 5, 11, WDD), c.rect(26, 8, 27, 11, WDD)
    for y, col in ((11, WL), (12, W), (13, W), (14, WD)):  # mặt ghế
        hline(c, 1, 30, y, col)
    for x in (3, 27):  # chân
        c.rect(x, 15, x + 1, 20, WDD)
    outline(c)
    return c


# ---------------- Bồn hoa gỗ ----------------
def planter(colors, seed):
    r = random.Random(seed)
    c = C(32, 20)
    for i in range(26):  # lá
        x, y = r.randrange(3, 29), r.randrange(2, 10)
        c.rect(x, y, x + 1, y + 1, r.choice([LEAF, LEAF_D, LEAF_L]))
    for i in range(10):  # hoa
        x, y = r.randrange(3, 28), r.randrange(1, 8)
        col = r.choice(colors)
        c.set(x, y, col), c.set(x + 1, y, col), c.set(x, y + 1, col), c.set(x + 1, y + 1, col)
        c.set(x, y, WHITE if r.random() < 0.3 else col)
    c.rect(1, 9, 30, 18, W)
    hline(c, 1, 30, 9, WL), hline(c, 1, 30, 13, WD), hline(c, 1, 30, 18, WDD)
    c.rect(1, 9, 1, 18, WD), c.rect(30, 9, 30, 18, WD)
    outline(c)
    return c


# ---------------- Đài phun nước ----------------
def fountain(frame):
    c = C(48, 40)
    c.ellipse(24, 28, 23, 9, STONE_D)
    c.rect(1, 28, 46, 35, STONE)
    for x in range(4, 46, 6):
        c.rect(x, 29, x, 35, STONE_D)
    hline(c, 1, 46, 35, STONE_D)
    c.ellipse(24, 28, 23, 9, STONE_L)
    c.ellipse(24, 28, 20, 7, WATER)
    for i in range(6):  # gợn sóng
        x = 8 + (i * 7 + frame * 3) % 32
        hline(c, x, x + 2, 26 + (i % 3) * 2, WATER_L)
    # trụ giữa & bát trên
    c.rect(21, 12, 26, 28, STONE)
    c.rect(21, 12, 21, 28, STONE_L), c.rect(26, 12, 26, 28, STONE_D)
    c.ellipse(24, 12, 9, 3, STONE_L)
    c.ellipse(24, 12, 7, 2, WATER)
    # tia nước
    jet = [(24, 2), (23, 3), (25, 3), (24, 4), (24, 5), (23, 6), (25, 6), (24, 7), (24, 8), (24, 9)]
    for i, (x, y) in enumerate(jet):
        c.set(x, y + (frame if i > 2 else 0) % 2, WATER_L if (i + frame) % 3 else WHITE)
    for x, y in ((15, 13), (14, 15), (14, 18), (33, 13), (34, 15), (34, 18)):  # nước tràn
        c.set(x + (frame % 2), y, WATER_L)
    outline(c)
    return c


# ---------------- Sạp chợ ----------------
def stall(a, a_d, goods):
    c = C(48, 44)
    # cột
    for x in (3, 43):
        c.rect(x, 10, x + 1, 42, W)
        c.rect(x, 10, x, 42, WL)
    # mái bạt sọc
    for y in range(2, 12):
        inset = max(0, 3 - y)
        for x in range(0 + inset, 48 - inset):
            c.set(x, y, a if (x // 6) % 2 == 0 else WHITE)
    for x in range(0, 48):  # mép bạt răng cưa
        if (x // 3) % 2 == 0:
            c.set(x, 12, a if (x // 6) % 2 == 0 else WHITE)
    hline(c, 0, 47, 11, a_d)
    # quầy
    c.rect(1, 28, 46, 42, W)
    hline(c, 1, 46, 28, WL), hline(c, 1, 46, 29, WL)
    for y in (33, 38):
        hline(c, 1, 46, y, WD)
    hline(c, 1, 46, 42, WDD)
    # hàng hoá trên quầy
    x = 4
    for col, col_l in goods:
        c.ellipse(x + 4, 25, 5, 3.5, WD)  # rổ
        for i in range(5):
            c.set(x + 1 + i * 1.5 if False else x + 1 + int(i * 1.6), 23 - (i % 2), col)
            c.set(x + 2 + int(i * 1.4), 22 + (i % 2), col_l)
        c.rect(x + 1, 22, x + 7, 24, col)
        c.set(x + 2, 22, col_l), c.set(x + 5, 22, col_l)
        hline(c, x, x + 8, 26, WDD)
        x += 10
    outline(c)
    return c


# ---------------- Hộp thư ----------------
def mailbox():
    c = C(14, 26)
    c.rect(6, 12, 7, 25, W), c.rect(6, 12, 6, 25, WL)
    c.rect(1, 3, 12, 12, RED)
    c.rect(2, 1, 11, 2, RED)
    hline(c, 2, 11, 1, RED_L), c.rect(1, 3, 1, 12, RED_L)
    c.rect(12, 3, 12, 12, RED_D), hline(c, 1, 12, 12, RED_D)
    c.rect(4, 6, 9, 7, RED_D)
    c.rect(11, 0, 12, 6, GOLD)  # cờ báo thư
    outline(c)
    return c


# ---------------- Bù nhìn ----------------
def scarecrow():
    c = C(22, 34)
    c.rect(10, 12, 11, 33, WD)
    hline(c, 1, 20, 14, W), hline(c, 1, 20, 15, WD)  # tay ngang
    c.rect(6, 13, 15, 23, rgb('#6f8fc0'))  # áo
    c.rect(6, 13, 7, 23, rgb('#9fb6dc'))
    c.rect(9, 17, 12, 18, rgb('#c06a4a'))  # miếng vá
    for x in (2, 4, 18, 20):
        c.set(x, 16, HAY), c.set(x, 17, HAY_D)
    c.ellipse(11, 9, 4.5, 4.5, HAY)  # đầu rơm
    c.set(9, 9, O), c.set(13, 9, O), hline(c, 9, 13, 11, HAY_D)
    hline(c, 3, 18, 5, HAY_D)  # nón
    c.rect(6, 1, 15, 5, HAY)
    hline(c, 6, 15, 4, RED)
    for x in range(8, 14, 2):
        c.set(x, 24, HAY), c.set(x + 1, 25, HAY_D)
    outline(c)
    return c


# ---------------- Đống củi ----------------
def woodpile():
    c = C(32, 20)
    logs = [(4, 14), (11, 14), (18, 14), (25, 14), (7.5, 9), (14.5, 9), (21.5, 9), (11, 4), (18, 4)]
    for cx, cy in logs:
        c.ellipse(cx + 0.5, cy + 0.5, 4, 4, W)
        c.ellipse(cx + 0.5, cy + 0.5, 2.4, 2.4, WL, WD)
        c.set(int(cx), int(cy), WD)
    outline(c)
    return c


# ---------------- Rơm ----------------
def haybale():
    c = C(20, 16)
    c.rect(1, 3, 18, 14, HAY)
    hline(c, 1, 18, 3, HAY_L), hline(c, 1, 18, 14, HAY_D)
    for x in (5, 14):
        c.rect(x, 3, x, 14, rgb('#a0522d'))
    for i in range(10):
        c.set(2 + i * 17 % 16, 5 + i * 7 % 8, HAY_D)
    outline(c)
    return c


# ---------------- Biển chỉ đường ----------------
def signpost():
    c = C(26, 30)
    c.rect(12, 4, 13, 29, W), c.rect(12, 4, 12, 29, WL)
    c.rect(3, 5, 22, 10, WL), hline(c, 3, 22, 10, W)  # mũi tên phải
    c.set(23, 7, WL), c.set(23, 8, WL), c.set(24, 7, W)
    c.rect(4, 13, 21, 18, W), hline(c, 4, 21, 13, WL)  # mũi tên trái
    c.set(3, 15, W), c.set(3, 16, W), c.set(2, 15, WD)
    for y in (7, 15):
        hline(c, 7, 18, y, WDD)
    outline(c)
    return c


# ---------------- Ven hồ: lá sen, sậy, cầu câu ----------------
def lilypad(flower):
    c = C(16, 12)
    c.ellipse(8, 6, 6, 4, LEAF)
    c.rect(8, 2, 9, 6, WATER)  # khía lá
    c.set(5, 5, LEAF_L), c.set(6, 4, LEAF_L), c.set(10, 8, LEAF_D)
    if flower:
        for x, y, col in ((6, 4, PINK), (7, 3, PINK_L), (8, 4, PINK), (7, 5, PINK), (7, 4, YELLOW), (6, 3, PINK_L), (8, 3, PINK_L)):
            c.set(x, y, col)
    outline(c, LEAF_D)
    return c


def reeds(seed):
    r = random.Random(seed)
    c = C(16, 22)
    for i in range(6):
        x = 2 + i * 2 + r.randrange(0, 2)
        top = r.randrange(2, 10)
        for y in range(top, 22):
            c.set(x + (1 if y < top + 3 and i % 2 else 0), y, LEAF_D if (y + i) % 3 else LEAF)
        if i % 2 == 0:  # bông sậy nâu
            c.rect(x, top - 1, x + 1, top + 3, WD)
            c.set(x, top - 2, WL)
    for x in range(1, 15, 2):
        c.set(x, 21, LEAF_L)
    return c


def dock():
    """Bến câu bằng ván gỗ (32x24): mặt ván + cọc."""
    c = C(32, 24)
    c.rect(0, 2, 31, 15, W)
    for x in range(0, 32, 6):
        c.rect(x, 2, x, 15, WD)
    hline(c, 0, 31, 2, WL), hline(c, 0, 31, 15, WDD)
    for x in (3, 27):
        c.rect(x, 16, x + 2, 23, WD)
        c.rect(x, 16, x, 23, W)
        hline(c, x, x + 2, 21, rgb('#2f4f66'))
    c.set(9, 6, O), c.set(21, 11, O)
    outline(c)
    return c


# ---------------- Rừng: khúc gỗ, nấm, bụi quả, cỏ cao, hoa dại ----------------
def log():
    c = C(32, 16)
    c.rect(3, 4, 27, 13, W)
    hline(c, 3, 27, 4, WL), hline(c, 3, 27, 5, WL), hline(c, 3, 27, 13, WDD)
    for x in (9, 16, 22):
        hline(c, x, x + 3, 8, WD)
    c.ellipse(28, 8.5, 3.5, 5, CREAM_D, WD)
    c.ellipse(28, 8.5, 1.8, 2.6, WL, CREAM_D)
    c.rect(10, 2, 11, 3, LEAF), c.set(12, 3, LEAF_L)  # mầm non
    c.ellipse(5, 13, 3, 2, LEAF_D, LEAF_D)
    outline(c)
    return c


def mushrooms(cap, cap_l):
    c = C(16, 14)
    for cx, cy, r in ((5, 6, 4), (11, 8, 3)):
        c.rect(cx - 1, cy, cx, cy + r + 1, CREAM)
        c.ellipse(cx, cy, r, r * 0.7, cap)
        c.set(cx - 1, cy - 1, cap_l), c.set(cx + 1, cy, WHITE)
    c.set(8, 12, LEAF), c.set(9, 12, LEAF_L)
    outline(c)
    return c


def berrybush(berry):
    c = C(18, 16)
    c.ellipse(9, 9, 8, 6.5, LEAF)
    for x, y in ((5, 6), (9, 4), (13, 7), (7, 10), (12, 11)):
        c.set(x, y, LEAF_L), c.set(x + 1, y + 1, LEAF_D)
    for x, y in ((4, 9), (8, 7), (12, 9), (10, 12), (14, 11), (6, 12)):
        c.rect(x, y, x + 1, y + 1, berry)
        c.set(x, y, WHITE)
    outline(c, LEAF_D)
    return c


def tallgrass(seed):
    r = random.Random(seed)
    c = C(16, 14)
    for i in range(9):
        x = 1 + i * 1.6 + r.random()
        h = r.randrange(5, 13)
        for y in range(14 - h, 14):
            c.set(int(x + (y < 14 - h + 2) * (1 if i % 2 else -1)), y, LEAF_D if i % 3 == 0 else LEAF if i % 3 == 1 else LEAF_L)
    return c


def wildflowers(cols, seed):
    r = random.Random(seed)
    c = C(16, 14)
    for i in range(5):
        x, y = r.randrange(2, 13), r.randrange(4, 12)
        c.rect(x, y + 1, x, 13, LEAF_D)
        col = cols[i % len(cols)]
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            c.set(x + dx, y + dy, col)
        c.set(x, y, YELLOW if col != YELLOW else ORANGE)
    return c


def stones():
    c = C(16, 10)
    for cx, cy, rx, ry in ((5, 6, 4, 3), (11, 7, 3, 2.4)):
        c.ellipse(cx, cy, rx, ry, STONE, STONE_D)
        c.set(cx - 1, cy - 1, STONE_L), c.set(cx - 2, cy - 1, STONE_L)
    return c


def cart():
    c = C(36, 26)
    c.rect(2, 6, 27, 15, W)
    hline(c, 2, 27, 6, WL), hline(c, 2, 27, 11, WD), hline(c, 2, 27, 15, WDD)
    for x, y, col in ((5, 3, rgb('#e2753a')), (9, 2, rgb('#e2753a')), (13, 4, LEAF), (17, 3, rgb('#c85a4a')), (21, 2, HAY), (24, 4, LEAF_L)):
        c.ellipse(x, y + 2, 3, 2.4, col)
    hline(c, 28, 35, 10, WD)  # càng xe
    c.ellipse(9, 19, 5.5, 5.5, WD)
    c.ellipse(9, 19, 3.5, 3.5, W, WD)
    c.set(9, 19, WDD)
    outline(c)
    return c


def flowerpot(col):
    c = C(12, 16)
    c.ellipse(6, 5, 5, 4.2, LEAF)
    for x, y in ((3, 3), (6, 2), (8, 5), (4, 6)):
        c.rect(x, y, x + 1, y + 1, col)
    c.rect(2, 9, 9, 15, rgb('#c46a4a'))
    hline(c, 1, 10, 9, rgb('#e08a5e')), hline(c, 2, 9, 15, rgb('#8a4632'))
    outline(c)
    return c


def stepstone():
    c = C(16, 16)
    for cx, cy in ((5, 5), (11, 11)):
        c.ellipse(cx, cy, 3.6, 2.8, STONE, STONE_D)
        c.set(cx - 1, cy - 1, STONE_L)
    return c


# ---------------- Icon món ăn mới (16x16) ----------------
def bowl(soup, soup_l, bits):
    c = C(16, 16)
    c.ellipse(8, 8, 7, 3, soup)
    for x, y in ((5, 7), (8, 8), (10, 7)):
        c.set(x, y, soup_l)
    for x, y, col in bits:
        c.set(x, y, col)
    for y in range(9, 14):
        w = 7 - max(0, y - 10)
        hline(c, 8 - w, 7 + w, y, WHITE if y == 9 else BLUE_L if y < 12 else BLUE)
    hline(c, 5, 10, 14, BLUE_D)
    c.set(11, 3, WHITE), c.set(12, 2, WHITE), c.set(5, 3, WHITE)
    outline(c)
    return c


def plate(food):
    c = C(16, 16)
    c.ellipse(8, 11, 7.5, 3.5, WHITE, GREY_L)
    food(c)
    outline(c)
    return c


def _eggplant(c):
    for i, (x, y) in enumerate(((3, 8), (6, 7), (9, 8))):
        c.ellipse(x + 2.5, y + 2, 2.6, 1.8, PURPLE, PURPLE_D)
        c.set(x + 2, y + 1, rgb('#c9a0e0'))
    for x in range(4, 13, 2):
        c.set(x, 7, LEAF)  # hành lá
    c.set(7, 6, ORANGE), c.set(10, 6, ORANGE)


def _rolls(c):
    for x in (3, 7, 11):
        c.ellipse(x + 1.5, 9, 2.2, 2.6, rgb('#b6d68a'), LEAF_D)
        c.set(x + 1, 8, rgb('#e2f2c4'))
    c.set(6, 12, RED), c.set(10, 12, RED)


def main():
    os.makedirs(OUT, exist_ok=True)
    sprites = {
        'well': well(), 'lamp': lamp(), 'bench': bench(),
        'planter_warm': planter([RED, ORANGE, YELLOW, PINK], 1), 'planter_cool': planter([BLUE_L, PURPLE, WHITE, PINK_L], 2),
        'fountain0': fountain(0), 'fountain1': fountain(1),
        'stall_red': stall(RED, RED_D, [(rgb('#e2753a'), ORANGE), (LEAF, LEAF_L), (RED, RED_L), (HAY, HAY_L)]),
        'stall_green': stall(GREEN, GREEN_D, [(LEAF, LEAF_L), (PURPLE, PURPLE_D), (YELLOW, CREAM), (rgb('#e2753a'), ORANGE)]),
        'stall_blue': stall(BLUE, BLUE_D, [(BLUE_L, WHITE), (TEAL, TEAL_L), (PINK, PINK_L), (CREAM_D, CREAM)]),
        'mailbox': mailbox(), 'scarecrow': scarecrow(), 'woodpile': woodpile(), 'haybale': haybale(), 'signpost': signpost(),
        'lily0': lilypad(False), 'lily1': lilypad(True), 'reeds0': reeds(3), 'reeds1': reeds(8), 'dock': dock(),
        'log': log(), 'mush_red': mushrooms(RED, RED_L), 'mush_brown': mushrooms(WD, WL),
        'berry_red': berrybush(RED), 'berry_blue': berrybush(BLUE_D),
        'grass0': tallgrass(1), 'grass1': tallgrass(5),
        'wild_yellow': wildflowers([YELLOW, WHITE], 2), 'wild_purple': wildflowers([PURPLE, PINK_L], 4), 'wild_blue': wildflowers([BLUE_L, WHITE], 6),
        'dish_corn': bowl(YELLOW, CREAM, [(6, 7, ORANGE), (9, 8, ORANGE), (11, 8, LEAF)]),
        'dish_eggplant': plate(_eggplant), 'dish_cabbage': plate(_rolls),
        'stones': stones(), 'cart': cart(), 'pot_red': flowerpot(RED), 'pot_yellow': flowerpot(YELLOW), 'stepstone': stepstone(),
    }
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
    sheet.save(os.path.join(OUT, 'props.png'))
    with open(os.path.join(OUT, 'props.json'), 'w') as f:
        json.dump({'frames': frames, 'meta': {'image': 'props.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': '1'}}, f)
    print('saved', len(sprites), 'props', sheet.size)


if __name__ == '__main__':
    main()
