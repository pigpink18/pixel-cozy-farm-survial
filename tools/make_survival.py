"""Vẽ đồ tận thế: icon vũ khí / đạn / vật liệu lục được + đồ vật (lều, lửa trại, chướng ngại,
xe hỏng, thùng quân dụng, bàn chế tạo...). Cùng bảng màu với make_props.py.

Tạo atlas: public/assets/surv/surv.png + surv.json (Phaser JSON Hash)
Chạy: python3 tools/make_survival.py
"""
import json
import os
import random

from PIL import Image

from make_furniture import (C, O, WL, W, WD, WDD, GOLD, CREAM, CREAM_D, WHITE, GREY_L, GREY, GREY_D, RED, RED_D, RED_L,
                            BLUE, BLUE_D, BLUE_L, GREEN, GREEN_D, GREEN_L, ORANGE, YELLOW, BLACK, T, rgb)
from make_props import outline, hline, STONE, STONE_L, STONE_D, LEAF, LEAF_D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/surv')

MET, MET_L, MET_D = rgb('#8a8f96'), rgb('#c4c9cf'), rgb('#55595f')
OLIVE, OLIVE_L, OLIVE_D = rgb('#6b7a45'), rgb('#94a364'), rgb('#434d2a')
RUST, RUST_L = rgb('#9a5a32'), rgb('#c47a44')
CANVAS, CANVAS_L, CANVAS_D = rgb('#9c8a5a'), rgb('#c2b07a'), rgb('#6e603c')
SAND, SAND_L, SAND_D = rgb('#c9b17e'), rgb('#e2cf9e'), rgb('#9a8456')
BLOOD = rgb('#7a1c1c')
FIRE, FIRE_L = rgb('#f08a4b'), rgb('#ffd27a')


def icon():
    return C(16, 16)


# ---------------- Vũ khí ----------------
def bat():
    c = icon()
    for i in range(11):
        c.rect(3 + i, 12 - i, 4 + i, 13 - i, WL if i > 4 else W)
    c.rect(2, 12, 4, 14, WDD)
    for x, y in ((10, 4), (12, 3), (11, 6), (13, 5)):  # đinh
        c.set(x, y - 1, MET_L)
    return outline(c)


def machete():
    c = icon()
    for i in range(9):
        c.rect(5 + i, 9 - i, 6 + i, 10 - i, MET_L if i % 3 else WHITE)
        c.set(5 + i, 11 - i, MET)
    c.rect(2, 11, 5, 13, WDD)
    c.rect(3, 12, 4, 12, WD)
    return outline(c)


def pistol():
    c = icon()
    c.rect(3, 5, 13, 8, MET_D)
    hline(c, 3, 13, 5, MET)
    c.rect(4, 8, 7, 13, BLACK)
    c.rect(5, 9, 6, 12, MET_D)
    c.set(8, 9, MET), c.set(9, 9, MET)
    return outline(c)


def shotgun():
    c = icon()
    for i in range(13):
        y = 10 - i // 2
        c.set(1 + i, y, MET_D), c.set(1 + i, y + 1, MET)
    c.rect(1, 10, 5, 13, W), c.rect(1, 13, 3, 14, WD)
    c.rect(7, 7, 9, 9, WD)
    return outline(c)


def rifle():
    c = icon()
    for i in range(14):
        y = 10 - i // 2
        c.set(1 + i, y, BLACK), c.set(1 + i, y + 1, MET_D)
    c.rect(2, 10, 5, 13, OLIVE_D)
    c.rect(7, 9, 8, 13, BLACK)  # băng đạn
    c.rect(6, 5, 9, 6, MET)  # ống ngắm
    return outline(c)


# ---------------- Đạn ----------------
def ammo(col, tip, tall):
    c = icon()
    c.rect(2, 7, 13, 14, OLIVE)
    hline(c, 2, 13, 7, OLIVE_L), hline(c, 2, 13, 14, OLIVE_D)
    for x in (4, 7, 10):
        c.rect(x, 7 - tall, x + 1, 6, col)
        c.set(x, 7 - tall, tip), c.set(x + 1, 7 - tall, tip)
    c.rect(5, 10, 10, 11, GOLD)
    return outline(c)


# ---------------- Vật liệu ----------------
def scrap():
    c = icon()
    c.rect(2, 8, 9, 12, MET), hline(c, 2, 9, 8, MET_L)
    c.rect(7, 4, 13, 9, RUST), hline(c, 7, 13, 4, RUST_L)
    c.rect(4, 11, 13, 13, MET_D)
    c.set(10, 6, MET_D), c.set(5, 10, MET_D)
    return outline(c)


def cloth():
    c = icon()
    c.rect(2, 6, 13, 12, rgb('#c97a7a'))
    for y in (7, 9, 11):
        hline(c, 2, 13, y, rgb('#e8a8a8'))
    c.rect(3, 4, 11, 6, rgb('#7a8fb0'))
    hline(c, 3, 11, 4, rgb('#a8bcd8'))
    return outline(c)


def parts():
    c = icon()
    c.rect(2, 4, 13, 12, rgb('#3f7a4a'))
    for x, y in ((4, 6), (8, 6), (11, 9), (5, 10)):
        c.rect(x, y, x + 1, y + 1, GOLD)
    hline(c, 4, 11, 8, rgb('#9ad0a0'))
    c.rect(7, 9, 9, 11, BLACK)
    for x in (3, 6, 9, 12):
        c.set(x, 13, MET_L)
    return outline(c)


def fuel():
    c = icon()
    c.rect(3, 4, 12, 14, RED)
    c.rect(3, 4, 4, 14, RED_L), c.rect(11, 4, 12, 14, RED_D)
    c.rect(9, 1, 11, 3, BLACK)
    c.rect(5, 2, 8, 3, RED_D)
    c.rect(6, 8, 9, 10, YELLOW)
    return outline(c)


def medkit():
    c = icon()
    c.rect(2, 5, 13, 14, WHITE)
    hline(c, 2, 13, 14, GREY_L)
    c.rect(6, 3, 9, 5, GREY)
    c.rect(7, 7, 8, 12, RED), c.rect(5, 9, 10, 10, RED)
    return outline(c)


def bandage():
    c = icon()
    c.ellipse(8, 9, 5.5, 4.5, CREAM)
    c.ellipse(8, 9, 2.4, 2, CREAM_D)
    hline(c, 9, 14, 12, CREAM)
    c.set(6, 7, WHITE)
    return outline(c)


def canned():
    c = icon()
    c.rect(4, 4, 11, 14, MET)
    c.rect(4, 7, 11, 11, rgb('#c8503c'))
    hline(c, 4, 11, 4, MET_L), hline(c, 4, 11, 14, MET_D)
    c.rect(6, 8, 9, 10, CREAM)
    return outline(c)


def water():
    c = icon()
    c.rect(5, 4, 10, 14, rgb('#9fd3e8'))
    c.rect(5, 8, 10, 10, BLUE)
    c.rect(6, 1, 9, 3, BLUE_D)
    c.rect(6, 5, 6, 13, WHITE)
    return outline(c)


def battery():
    c = icon()
    c.rect(3, 4, 12, 13, BLACK)
    c.rect(3, 4, 12, 6, rgb('#d9a21f'))
    c.rect(5, 2, 6, 3, MET), c.rect(9, 2, 10, 3, MET)
    c.rect(6, 8, 9, 9, WHITE), c.rect(7, 7, 8, 10, WHITE)
    return outline(c)


def milchip():
    c = icon()
    c.rect(3, 3, 12, 12, OLIVE_D)
    c.rect(5, 5, 10, 10, BLACK)
    c.rect(6, 6, 9, 9, rgb('#4fd06a'))
    for i in range(3, 13, 3):
        c.set(i, 1, GOLD), c.set(i, 2, GOLD), c.set(i, 13, GOLD), c.set(i, 14, GOLD)
    return outline(c)


def gunpowder():
    c = icon()
    c.ellipse(8, 10, 5, 4.5, rgb('#5a5050'))
    c.rect(6, 3, 10, 6, CANVAS)
    hline(c, 6, 10, 6, CANVAS_D)
    for x, y in ((6, 9), (9, 11), (8, 8)):
        c.set(x, y, GREY)
    return outline(c)


def seedbag():
    c = icon()
    c.rect(4, 4, 11, 14, CANVAS)
    hline(c, 4, 11, 4, CANVAS_L), hline(c, 4, 11, 14, CANVAS_D)
    c.rect(6, 8, 9, 11, LEAF)
    return outline(c)


# ---------------- Đồ vật lớn ----------------
def tent(col, col_l, col_d):
    c = C(48, 36)
    for y in range(4, 34):
        half = int((y - 3) * 0.8)
        for x in range(24 - half, 24 + half + 1):
            c.set(x, y, col_l if x < 24 else col)
    for y in range(14, 34):  # cửa lều
        half = int((y - 13) * 0.35)
        for x in range(24 - half, 24 + half + 1):
            c.set(x, y, col_d if abs(x - 24) < half else BLACK)
    hline(c, 0, 47, 34, col_d)
    c.rect(23, 1, 24, 4, WD)
    return outline(c)


def campfire(fr):
    c = C(20, 22)
    for i, (x, y) in enumerate(((2, 17), (10, 16), (4, 19), (11, 19))):
        c.rect(x, y, x + 7, y + 1, W if i % 2 else WD)
    for x in range(1, 19, 3):
        c.ellipse(x + 1, 20, 1.6, 1.4, STONE, STONE_D)
    r = random.Random(fr)
    for y in range(3, 17):
        w = max(0, int((y - 2) * 0.45)) - r.randrange(0, 2)
        for x in range(10 - w, 10 + w + 1):
            c.set(x + (1 if fr and y < 8 else 0), y, FIRE_L if abs(x - 10) < w - 1 and y > 9 else FIRE)
    c.set(9 - fr, 1, FIRE), c.set(12, 3 + fr, FIRE_L)
    return c


def barricade():
    c = C(32, 26)
    for i, (y, tilt) in enumerate(((6, 2), (12, -2), (18, 1))):
        for x in range(1, 31):
            yy = y + (x - 16) * tilt // 15
            c.rect(x, yy, x, yy + 3, WL if i % 2 else W)
            c.set(x, yy + 3, WD)
    for x in (5, 26):
        c.rect(x, 2, x + 1, 25, WDD)
    for x, y in ((6, 7), (25, 13), (6, 19)):
        c.set(x, y, MET_L)
    return outline(c)


def sandbags():
    c = C(32, 18)
    for row, y in enumerate((10, 4)):
        for i in range(4 - row):
            x = 1 + i * 8 + row * 4
            c.ellipse(x + 4, y + 3, 4.4, 3.2, SAND, SAND_D)
            hline(c, x + 2, x + 5, y + 1, SAND_L)
    return outline(c)


def car(col, col_l, col_d):
    c = C(52, 34)
    c.rect(2, 14, 49, 27, col)
    hline(c, 2, 49, 14, col_l), hline(c, 2, 49, 27, col_d)
    c.rect(12, 5, 38, 14, col)
    hline(c, 12, 38, 5, col_l)
    c.rect(15, 7, 23, 13, rgb('#3a4a58'))  # kính vỡ
    c.rect(26, 7, 35, 13, rgb('#3a4a58'))
    for x, y in ((17, 9), (19, 11), (30, 8), (33, 11)):
        c.set(x, y, rgb('#9fb8c8'))
    for x in (11, 40):  # bánh xe
        c.ellipse(x, 28, 5, 4.4, BLACK, BLACK)
        c.ellipse(x, 28, 2, 1.8, MET_D, MET_D)
    for i in range(14):  # gỉ sét
        c.set(4 + i * 3 % 44, 16 + (i * 7) % 10, RUST)
    c.rect(3, 18, 6, 20, YELLOW)  # đèn
    hline(c, 2, 49, 21, col_d)
    return outline(c)


def trashcan():
    c = C(16, 22)
    c.rect(2, 6, 13, 20, MET)
    for x in (4, 7, 10):
        c.rect(x, 7, x, 19, MET_D)
    c.rect(1, 3, 14, 6, MET_L)
    hline(c, 1, 14, 6, MET_D)
    c.rect(6, 1, 9, 2, MET_D)
    c.set(3, 12, RUST), c.set(11, 16, RUST)
    return outline(c)


def milcrate():
    c = C(32, 22)
    c.rect(1, 4, 30, 20, OLIVE)
    hline(c, 1, 30, 4, OLIVE_L), hline(c, 1, 30, 20, OLIVE_D)
    hline(c, 1, 30, 9, OLIVE_D)
    for x in (4, 27):
        c.rect(x, 10, x, 19, OLIVE_D)
    c.rect(12, 12, 19, 16, YELLOW)
    c.rect(14, 13, 17, 15, BLACK)
    c.rect(13, 6, 18, 7, MET)
    return outline(c)


def barrel():
    c = C(16, 22)
    c.rect(2, 3, 13, 20, RUST)
    c.rect(2, 3, 4, 20, RUST_L)
    for y in (6, 13, 19):
        hline(c, 2, 13, y, rgb('#5a3420'))
    c.ellipse(8, 3, 6, 2, rgb('#5a3420'))
    c.rect(6, 9, 9, 11, YELLOW), c.set(7, 10, BLACK)
    return outline(c)


def cabinet():
    c = C(18, 30)
    c.rect(1, 2, 16, 28, rgb('#8a7a6a'))
    hline(c, 1, 16, 2, rgb('#b0a090'))
    for y in (10, 18):
        hline(c, 1, 16, y, rgb('#5a4e44'))
    for y in (6, 14, 23):
        c.rect(7, y, 10, y, MET_L)
    c.set(3, 25, RUST), c.set(13, 7, RUST)
    return outline(c)


def ruinwall():
    c = C(32, 32)
    top = [12, 10, 9, 11, 14, 8, 6, 9, 13, 16, 15, 18]
    for x in range(1, 31):
        t = top[x * len(top) // 32]
        for y in range(t, 30):
            row = (y - 4) // 4
            k = ((x + (row % 2) * 4) % 8 == 0) or y % 4 == 3
            c.set(x, y, STONE_D if k else STONE)
        c.set(x, t, STONE_L)
    for x, y in ((4, 28), (9, 29), (20, 28), (26, 29)):
        c.ellipse(x, y, 2.4, 1.6, STONE, STONE_D)
    c.rect(18, 20, 20, 22, LEAF_D)  # rêu
    return outline(c)


def tires():
    c = C(18, 18)
    for y in (12, 7, 2):
        c.ellipse(9, y + 3, 7.5, 3, BLACK, BLACK)
        c.ellipse(9, y + 3, 3, 1.2, rgb('#55595f'), rgb('#55595f'))
    return outline(c)


def workbench():
    c = C(36, 28)
    c.rect(1, 10, 34, 14, W)
    hline(c, 1, 34, 10, WL), hline(c, 1, 34, 14, WD)
    for x in (3, 31):
        c.rect(x, 15, x + 1, 27, WD)
    hline(c, 3, 32, 22, WD)
    c.rect(4, 5, 9, 9, MET)  # ê tô
    c.rect(5, 3, 8, 4, MET_D)
    c.rect(14, 7, 22, 9, RED)  # hộp đồ nghề
    hline(c, 14, 22, 7, RED_L)
    c.rect(26, 6, 27, 9, WDD), c.rect(25, 5, 29, 6, MET)  # búa
    c.rect(11, 16, 16, 21, MET_D)
    return outline(c)


def watchtower():
    c = C(36, 60)
    for x in (5, 29):
        c.rect(x, 18, x + 2, 59, WD)
    for y in (30, 44):
        hline(c, 5, 31, y, W)
    for i in range(24):  # thanh chéo
        c.set(7 + i, 31 + i * 13 // 24, WDD)
    c.rect(2, 12, 33, 19, W)
    hline(c, 2, 33, 12, WL), hline(c, 2, 33, 19, WDD)
    for x in range(4, 33, 4):
        c.rect(x, 13, x, 18, WD)
    for y in range(0, 10):  # mái
        hline(c, 2 + (9 - y) // 1 // 3, 33 - (9 - y) // 3, y + 2, CANVAS if y % 2 else CANVAS_L)
    c.rect(4, 10, 5, 12, WD), c.rect(30, 10, 31, 12, WD)
    return outline(c)


def cone():
    c = C(12, 14)
    for y in range(1, 11):
        w = y // 2
        hline(c, 6 - w, 6 + w, y, ORANGE if y not in (4, 5, 8) else WHITE)
    c.rect(0, 11, 11, 13, ORANGE)
    return outline(c)


def blood(seed):
    r = random.Random(seed)
    c = C(16, 12)
    for _ in range(9):
        x, y, rr = r.randrange(3, 13), r.randrange(3, 9), r.uniform(1, 2.6)
        c.ellipse(x, y, rr, rr * 0.7, BLOOD, BLOOD)
    for _ in range(5):
        c.set(r.randrange(0, 16), r.randrange(0, 12), BLOOD)
    return c


def bones():
    c = C(16, 10)
    hline(c, 3, 12, 6, CREAM)
    for x in (2, 13):
        c.set(x, 5, CREAM), c.set(x, 7, CREAM)
    c.ellipse(5, 4, 2.4, 2, CREAM, CREAM_D)
    c.set(4, 4, BLACK), c.set(6, 4, BLACK)
    return outline(c, CREAM_D)


def nest(fr):
    """Ổ zombie: đống xác & thịt thối, phát sáng xanh lét (2 khung)."""
    c = C(40, 26)
    c.ellipse(20, 16, 19, 9, rgb('#3d4a2a'), rgb('#2a321c'))
    r = random.Random(5)
    for _ in range(26):
        x, y = r.randrange(6, 34), r.randrange(10, 22)
        c.ellipse(x, y, r.uniform(1.2, 3), r.uniform(1, 2.2), r.choice([rgb('#5a6a38'), rgb('#7a2a2a'), rgb('#4a5a30')]), rgb('#2a321c'))
    for i in range(6):
        x, y = 10 + i * 4, 9 + (i * 5 + fr * 3) % 8
        c.set(x, y, rgb('#a8f070')), c.set(x, y - 1 - fr, rgb('#d8ffb0'))
    return c


# ---------------- Kho trên nông trại (thay kho kiểu Hay Day) ----------------
def container():
    """Nhà kho: container sắt gỉ, cửa có thanh khoá, số sơn đã tróc."""
    c = C(62, 42)
    G, GL, GD = rgb('#4f6a5a'), rgb('#6f8a78'), rgb('#33463b')
    c.rect(1, 2, 60, 9, GL)  # nóc
    hline(c, 1, 60, 2, rgb('#8fa898'))
    c.rect(1, 10, 60, 39, G)  # mặt bên
    for x in range(3, 47, 3):  # sóng tôn
        c.rect(x, 11, x, 38, GD)
    hline(c, 1, 60, 10, GD), hline(c, 1, 60, 39, GD)
    # cửa bên phải
    c.rect(47, 10, 60, 39, rgb('#466052'))
    c.rect(53, 10, 53, 39, GD)
    for x in (49, 51, 56, 58):
        c.rect(x, 12, x, 37, rgb('#7d9688'))
    for y in (18, 31):
        c.rect(48, y, 59, y, MET_D)
    c.rect(52, 22, 54, 25, YELLOW)  # ổ khoá
    c.set(53, 24, BLACK)
    # chữ số sơn trắng đã tróc
    c.rect(9, 15, 26, 22, CREAM_D)  # biển ghi chú đã bạc màu
    c.rect(10, 16, 25, 21, CREAM)
    for y in (17, 19):
        hline(c, 12, 23 - (y % 3), y, GREY_D)
    c.rect(32, 14, 41, 23, rgb('#3a5246'))  # vệt sơn đè
    # gỉ sét chảy
    rnd = random.Random(7)
    for _ in range(26):
        x, y = rnd.randint(2, 58), rnd.randint(11, 37)
        c.set(x, y, RUST)
        if rnd.random() < 0.5:
            c.set(x, y + 1, RUST_L)
    for x in range(2, 60, 7):
        c.rect(x, 36, x + 2, 38, RUST)
    hline(c, 1, 60, 40, rgb('#2a2a2a'))
    return outline(c)


def grainbin():
    """Kho thóc: bồn tôn tròn mái chóp, thang sắt, bao tải lúa chất cạnh."""
    c = C(44, 56)
    T1, T2, T3 = rgb('#a8a49a'), rgb('#cfcbc0'), rgb('#77736a')
    # thân trụ
    c.rect(4, 18, 31, 52, T1)
    c.rect(4, 18, 9, 52, T2)
    c.rect(26, 18, 31, 52, T3)
    for y in range(21, 52, 4):
        hline(c, 4, 31, y, T3)
    # mái chóp
    for i in range(12):
        hline(c, 17 - i - 1, 18 + i, 6 + i, T2 if i % 3 else T1)
        c.set(17 - i - 1, 6 + i, T2), c.set(18 + i, 6 + i, T3)
    c.rect(15, 3, 20, 6, T3)
    hline(c, 3, 32, 18, T3)
    # thang
    for x in (29, 33):
        c.rect(x, 14, x, 52, MET_D)
    for y in range(17, 52, 4):
        hline(c, 29, 33, y, MET_D)
    # cửa xả & gỉ
    c.rect(12, 42, 19, 50, rgb('#5a564e'))
    c.rect(13, 43, 18, 49, rgb('#3e3b35'))
    rnd = random.Random(3)
    for _ in range(20):
        x, y = rnd.randint(5, 30), rnd.randint(19, 50)
        c.set(x, y, RUST)
    # bao tải lúa
    for x, y in ((31, 47), (38, 47), (34, 41)):
        c.ellipse(x + 3, y + 3, 4.2, 3.6, SAND, SAND_D)
        hline(c, x + 1, x + 5, y + 1, SAND_L)
        c.set(x + 3, y, SAND_D)
    hline(c, 2, 42, 53, rgb('#3a3a32'))
    return outline(c)


# ---------------- Nhà máy trên nông trại (Chú Tư xây bằng đồ lục được) ----------------
TIN, TIN_L, TIN_D = rgb('#8e8a80'), rgb('#b8b4a8'), rgb('#5e5a52')
BRICK, BRICK_L, BRICK_D = rgb('#a0583a'), rgb('#c47a52'), rgb('#6e3a26')
PLANK, PLANK_L, PLANK_D = rgb('#8a6a48'), rgb('#ad8a62'), rgb('#5e4630')


def tin_roof(c, x0, x1, y0, y1):
    c.rect(x0, y0, x1, y1, TIN)
    for x in range(x0, x1 + 1, 3):
        c.rect(x, y0, x, y1, TIN_D)
    hline(c, x0, x1, y0, TIN_L)
    hline(c, x0, x1, y1, TIN_D)
    rnd = random.Random(x0 * 7 + y0)
    for _ in range((x1 - x0) // 3):
        c.set(rnd.randint(x0, x1), rnd.randint(y0, y1), RUST)


def mill():
    """Cối xay gió sắt gỉ: tháp giàn, lán tôn nhỏ dưới chân (cánh quạt vẽ riêng để quay)."""
    c = C(40, 68)
    # tháp giàn
    for y in range(14, 58):
        k = (y - 14) / 44
        xl, xr = int(17 - 9 * k), int(22 + 9 * k)
        c.set(xl, y, MET_D), c.set(xr, y, MET_D)
        if y % 8 == 0:
            hline(c, xl, xr, y, MET)
        if y % 8 < 4:
            c.set(int(xl + (xr - xl) * ((y % 8) / 8)), y, MET)
    c.rect(16, 9, 23, 15, TIN_D)  # hộp số
    c.rect(17, 10, 22, 14, TIN)
    c.rect(24, 10, 33, 12, MET_D)  # đuôi
    c.rect(30, 6, 35, 15, RUST)
    c.rect(31, 7, 34, 14, RUST_L)
    # lán tôn dưới chân
    c.rect(4, 52, 35, 65, PLANK)
    for x in range(6, 35, 4):
        c.rect(x, 52, x, 65, PLANK_D)
    tin_roof(c, 2, 37, 47, 52)
    c.rect(16, 56, 23, 65, PLANK_D)  # cửa
    c.rect(17, 57, 22, 65, rgb('#3a2c20'))
    c.ellipse(8, 62, 3.5, 3, SAND, SAND_D)  # bao bột
    return outline(c)


def mill_fan():
    c = C(30, 30)
    import math
    for i in range(6):
        if i == 4:
            continue  # gãy 1 cánh
        a = i * math.pi / 3
        for r in range(3, 14):
            x, y = 15 + math.cos(a) * r, 15 + math.sin(a) * r
            for w in range(-1, 2):
                c.set(int(x - math.sin(a) * w), int(y + math.cos(a) * w), MET_L if r < 9 else (RUST if r % 4 == 0 else MET))
    c.ellipse(15, 15, 2.5, 2.5, MET_D, MET_D)
    return outline(c)


def bakery():
    """Lò bánh: lò gạch đất nung hình vòm, ống khói, mái tôn che, đống củi."""
    c = C(56, 52)
    tin_roof(c, 2, 53, 6, 12)  # mái che trên cột
    for x in (4, 50):
        c.rect(x, 12, x + 1, 49, PLANK_D)
    # lò vòm
    c.ellipse(24, 38, 17, 14, BRICK, BRICK_D)
    c.rect(7, 38, 41, 49, BRICK)
    for y in range(28, 49, 4):
        for x in range(8 + (y // 4 % 2) * 3, 41, 6):
            c.set(x, y, BRICK_D)
    c.rect(9, 30, 18, 33, BRICK_L)
    c.ellipse(24, 42, 6, 5.5, BLACK, BLACK)  # miệng lò
    c.rect(19, 42, 29, 49, BLACK)
    c.rect(20, 45, 28, 48, FIRE)
    c.rect(22, 46, 26, 47, FIRE_L)
    c.rect(34, 0, 39, 26, BRICK_D)  # ống khói
    c.rect(35, 1, 38, 25, BRICK)
    # củi
    for i, y in enumerate((44, 47)):
        for x in range(44, 54, 3):
            c.ellipse(x + 1, y, 1.6, 1.4, WD, WDD)
    hline(c, 2, 53, 50, rgb('#3a3028'))
    return outline(c)


def dairy():
    """Xưởng sữa: lán gỗ chắp vá tấm tôn, bình sữa nhôm trước cửa."""
    c = C(54, 54)
    c.rect(4, 20, 49, 50, PLANK)
    for x in range(6, 49, 5):
        c.rect(x, 20, x, 50, PLANK_D)
    hline(c, 4, 49, 30, PLANK_L)
    c.rect(30, 26, 42, 36, TIN)  # miếng tôn vá
    for x in range(31, 42, 3):
        c.rect(x, 26, x, 36, TIN_D)
    c.rect(8, 33, 14, 39, RUST)  # miếng vá gỉ
    # mái tôn dốc
    for i in range(14):
        hline(c, 2 + i // 3, 51 - i // 3, 6 + i, TIN if i % 3 else TIN_L)
    for x in range(4, 51, 3):
        c.rect(x, 7, x, 19, TIN_D)
    c.rect(11, 9, 18, 12, RUST)
    # cửa đôi + cửa sổ
    c.rect(18, 34, 31, 50, PLANK_D)
    c.rect(24, 34, 25, 50, rgb('#3a2c20'))
    c.rect(36, 39, 44, 45, rgb('#3a4a58'))
    c.rect(36, 42, 44, 42, PLANK_D)
    # bình sữa
    for x in (6, 12):
        c.rect(x, 44, x + 4, 51, MET_L)
        c.rect(x + 1, 42, x + 3, 43, MET)
        c.rect(x, 47, x + 4, 47, MET)
    hline(c, 2, 51, 52, rgb('#3a3028'))
    return outline(c)


def juicer():
    """Máy ép nước tự chế: khung sắt trục vít trên thùng phuy, sọt trái cây."""
    c = C(36, 46)
    c.rect(6, 22, 25, 43, RUST)  # thùng phuy
    c.rect(6, 22, 9, 43, RUST_L)
    for y in (27, 35, 42):
        hline(c, 6, 25, y, rgb('#5a3420'))
    c.ellipse(15, 22, 10, 2.5, rgb('#5a3420'))
    # khung ép
    for x in (5, 26):
        c.rect(x, 4, x + 1, 22, MET_D)
    c.rect(4, 3, 28, 6, MET)
    hline(c, 4, 28, 3, MET_L)
    c.rect(15, 6, 16, 16, MET_L)  # trục vít
    for y in range(7, 16, 2):
        hline(c, 14, 17, y, MET_D)
    c.rect(9, 0, 22, 2, WD)  # tay quay
    c.rect(11, 16, 20, 19, WD)  # mâm ép
    c.rect(26, 30, 29, 33, MET)  # vòi
    c.set(28, 34, rgb('#e86a3a')), c.set(28, 36, rgb('#e86a3a'))
    # sọt trái cây
    c.rect(27, 38, 35, 44, WD)
    hline(c, 27, 35, 41, WDD)
    for x, col in ((28, RED_L), (30, ORANGE), (32, RED), (34, YELLOW)):
        c.set(x, 37, col), c.set(x + 1, 37, col), c.set(x, 36, col)
    hline(c, 2, 35, 45, rgb('#3a3028'))
    return outline(c)


def stall():
    """Sạp bán ven đường: khung gỗ, bạt sọc bạc màu bị rách, thùng hàng."""
    c = C(40, 50)
    for x in (3, 35):
        c.rect(x, 12, x + 1, 46, PLANK_D)
    # bạt sọc
    for x in range(1, 39):
        col = rgb('#b85a4a') if (x // 5) % 2 else CREAM_D
        for y in range(4, 14 + (x % 5 == 2)):
            c.set(x, y, col)
    for x in range(1, 39, 5):
        c.rect(x, 14, x + 2, 15, rgb('#b85a4a') if (x // 5) % 2 else CREAM_D)
    c.rect(22, 6, 25, 11, T)  # lỗ rách
    c.set(21, 8, T), c.set(26, 9, T)
    hline(c, 1, 38, 4, rgb('#d8cdb4'))
    # quầy
    c.rect(2, 30, 37, 45, PLANK)
    hline(c, 2, 37, 30, PLANK_L)
    for x in range(4, 37, 6):
        c.rect(x, 31, x, 45, PLANK_D)
    # hàng trên quầy
    c.rect(5, 25, 13, 29, WD)
    for x, col in ((6, ORANGE), (8, RED), (10, GREEN), (12, YELLOW)):
        c.set(x, 24, col), c.set(x + 1, 24, col)
    c.rect(17, 24, 22, 29, MET)  # đồ hộp
    hline(c, 17, 22, 26, RED)
    c.rect(26, 22, 33, 29, CANVAS)  # bao
    hline(c, 2, 37, 47, rgb('#3a3028'))
    c.rect(28, 37, 34, 42, CREAM)  # bảng giá
    hline(c, 29, 33, 39, GREY_D)
    return outline(c)


def main():
    os.makedirs(OUT, exist_ok=True)
    sprites = {
        'w_bat': bat(), 'w_machete': machete(), 'w_pistol': pistol(), 'w_shotgun': shotgun(), 'w_rifle': rifle(),
        'ammo_pistol': ammo(GOLD, RUST_L, 3), 'ammo_shell': ammo(RED, GOLD, 4), 'ammo_rifle': ammo(MET_L, GOLD, 5),
        'scrap': scrap(), 'cloth': cloth(), 'parts': parts(), 'fuel': fuel(), 'medkit': medkit(), 'bandage': bandage(),
        'canned': canned(), 'water': water(), 'battery': battery(), 'milchip': milchip(), 'gunpowder': gunpowder(), 'seedbag': seedbag(),
        'tent_green': tent(OLIVE, OLIVE_L, OLIVE_D), 'tent_tan': tent(CANVAS, CANVAS_L, CANVAS_D),
        'campfire0': campfire(0), 'campfire1': campfire(1),
        'barricade': barricade(), 'sandbags': sandbags(),
        'car_red': car(rgb('#9a3a32'), rgb('#c45a4a'), rgb('#6a2420')), 'car_blue': car(rgb('#3a5a8a'), rgb('#5a7ab0'), rgb('#24385a')),
        'car_white': car(rgb('#c8c4bc'), rgb('#e8e4dc'), rgb('#8a8680')),
        'trashcan': trashcan(), 'milcrate': milcrate(), 'barrel': barrel(), 'cabinet': cabinet(), 'ruinwall': ruinwall(),
        'tires': tires(), 'workbench': workbench(), 'watchtower': watchtower(), 'cone': cone(),
        'blood0': blood(1), 'blood1': blood(2), 'bones': bones(), 'nest0': nest(0), 'nest1': nest(1),
        'container': container(), 'grainbin': grainbin(),
        'f_mill': mill(), 'f_mill_fan': mill_fan(), 'f_bakery': bakery(), 'f_dairy': dairy(), 'f_juicer': juicer(), 'f_stand': stall(),
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
    sheet.save(os.path.join(OUT, 'surv.png'))
    with open(os.path.join(OUT, 'surv.json'), 'w') as f:
        json.dump({'frames': frames, 'meta': {'image': 'surv.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': '1'}}, f)
    print('saved', len(sprites), 'survival sprites', sheet.size)


if __name__ == '__main__':
    main()
