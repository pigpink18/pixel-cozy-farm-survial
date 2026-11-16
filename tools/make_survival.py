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
