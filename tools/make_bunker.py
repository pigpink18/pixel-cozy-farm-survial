"""Vẽ lại hầm mỏ thành HẦM NGẦM QUÂN SỰ & mỏ đá thành BÃI PHẾ LIỆU (bối cảnh tận thế).

Ghi đè đúng tên file cũ để code không phải đổi đường dẫn:
  public/assets/cave/   floor0..3, wall_top, wall_face, edge_l/r/t (sàn & tường bê tông, tông xám để nhuộm theo khu)
                        torch (đèn huỳnh quang chập chờn), beam (cột thép), stalagmite (đống bê tông vỡ),
                        pebbles (giấy tờ, vỏ đạn), puddle (vũng nước/dầu), crate (hòm quân dụng),
                        lava (bùn hoá chất phát sáng), ore_copper/iron/gold/gem (đống phế liệu & két sắt), rubble
  public/assets/quarry/ geode* (hộp khoá), boulder (đống sắt vụn lớn), crystal (bình hoá chất phát sáng),
                        anvil (bàn phá khoá), cart (xe thu mua phế liệu), door (cửa hầm thép)
Chạy: python3 tools/make_bunker.py
"""
import os
import random

from make_cave import C, rgb, T
from make_props import outline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAVE = os.path.join(ROOT, 'public/assets/cave')
QUARRY = os.path.join(ROOT, 'public/assets/quarry')

O = rgb('#2a2428')
# Bê tông (xám trung tính, nhuộm trong game)
F0, F1, F2, F3 = rgb('#b6b2aa'), rgb('#a6a29a'), rgb('#908c85'), rgb('#cac6be')
W0, W1, W2, W3 = rgb('#6a6660'), rgb('#57534e'), rgb('#44413d'), rgb('#86827b')
MET, MET_L, MET_D = rgb('#8a8f96'), rgb('#c4c9cf'), rgb('#55595f')
RUST, RUST_L = rgb('#9a5a32'), rgb('#c47a44')
OLIVE, OLIVE_L, OLIVE_D = rgb('#6b7a45'), rgb('#94a364'), rgb('#434d2a')
YEL, BLK = rgb('#e8c040'), rgb('#22201e')
COP, COP_L = rgb('#c8703a'), rgb('#f0a060')
GOLD, GOLD_L = rgb('#e8b830'), rgb('#fff0a0')
PCB, PCB_L = rgb('#2f6a3a'), rgb('#4f9a5a')


def save(c, folder, name):
    c.im.save(os.path.join(folder, f'{name}.png'))


# ---------------- Ô sàn & tường ----------------
def floor(seed):
    r = random.Random(seed)
    c = C(16, 16, F1)
    for _ in range(30):
        c.set(r.randrange(16), r.randrange(16), r.choice([F0, F2, F1]))
    # khe nối tấm bê tông
    for i in range(16):
        c.set(i, 15, F2), c.set(15, i, F2)
    for i in range(16):
        c.set(i, 0, F3), c.set(0, i, F3)
    if seed % 4 == 1:  # vết nứt
        x, y = r.randrange(3, 12), r.randrange(3, 12)
        for _ in range(6):
            c.set(x, y, F2)
            x += r.choice([-1, 1])
            y += r.choice([0, 1])
    if seed % 4 == 2:  # vạch sơn cảnh báo đã mờ
        for i in range(16):
            if (i // 3) % 2 == 0:
                c.set(i, 7, rgb('#c8b060')), c.set(i, 8, rgb('#c8b060'))
    if seed % 4 == 3:  # nắp cống
        for x in range(5, 11):
            for y in range(5, 11):
                c.set(x, y, F2 if (x + y) % 2 else W3)
    return c


def wall_top():
    c = C(16, 16, W1)
    r = random.Random(3)
    for _ in range(40):
        c.set(r.randrange(16), r.randrange(16), r.choice([W0, W2, W1]))
    for i in range(16):
        c.set(i, 8, W2)
    return c


def wall_face():
    c = C(16, 16, W0)
    for x in range(16):
        c.set(x, 0, W3), c.set(x, 1, W3)
        c.set(x, 14, W1), c.set(x, 15, W2)
    for x in range(0, 16, 8):  # khe tấm bê tông
        for y in range(2, 14):
            c.set(x, y, W2)
    for x in range(16):  # đường ống chạy dọc tường
        c.set(x, 4, MET_D), c.set(x, 5, MET), c.set(x, 6, MET_D)
    c.set(5, 5, RUST), c.set(12, 5, RUST)
    for x in range(16):  # sọc cảnh báo chân tường
        c.set(x, 12, YEL if (x // 2) % 2 else BLK)
    return c


def edge(side):
    c = C(16, 16)
    for i in range(16):
        if side == 'l':
            c.set(0, i, W3)
        elif side == 'r':
            c.set(15, i, W2)
        else:
            c.set(i, 0, W3)
    return c


# ---------------- Đồ trong hầm ----------------
def lamp():
    """Đèn huỳnh quang gắn tường, 2 khung (sáng / chập chờn)."""
    c = C(32, 16)
    for f in range(2):
        ox = f * 16
        c.rect(ox + 2, 4, ox + 13, 8, MET_D)
        c.rect(ox + 3, 5, ox + 12, 7, rgb('#f4f8e0') if f == 0 else rgb('#b8bca8'))
        c.rect(ox + 7, 2, ox + 8, 3, MET_D)
    return c


def beam():
    c = C(16, 32)
    c.rect(5, 0, 10, 31, MET_D)
    c.rect(6, 0, 9, 31, MET)
    c.rect(6, 0, 6, 31, MET_L)
    for y in (3, 15, 27):
        c.rect(4, y, 11, y + 1, MET_D)
    c.set(8, 10, RUST), c.set(7, 22, RUST), c.set(9, 23, RUST_L)
    return outline(c, O)


def rubble():
    """Đống bê tông vỡ (thay măng đá) — 16x20."""
    c = C(16, 20)
    c.blob(8, 14, 7, 5, W3, O, F2, W1)
    c.blob(5, 11, 3.5, 3, F1, O, F3, None)
    c.blob(11, 12, 3, 2.6, F0, O, F3, None)
    for x, y in ((3, 8), (12, 9)):  # thép lòi ra
        c.set(x, y, RUST), c.set(x, y - 1, RUST), c.set(x + 1, y - 2, RUST_L)
    return c


def stone_chunk():
    """Khối bê tông nhỏ (đá thường) — 16x16."""
    c = C(16, 16)
    c.blob(8, 11, 6.5, 4.5, W3, O, F0, W1)  # khối dưới tối
    c.blob(6, 8, 4, 3.4, F2, O, F3, W3)  # mảnh trên sáng
    c.blob(11, 9, 2.8, 2.4, W3, O, F2, None)
    c.set(5, 7, F3), c.set(6, 7, F3)
    for y in (3, 4, 5):  # thép lòi ra
        c.set(12, y, RUST)
    c.set(13, 3, RUST_L)
    return c


def pebbles():
    c = C(16, 16)
    r = random.Random(4)
    for _ in range(3):  # giấy tờ vương vãi
        x, y = r.randrange(1, 11), r.randrange(1, 12)
        c.rect(x, y, x + 3, y + 2, rgb('#e8e2d0'))
        c.set(x + 1, y + 1, rgb('#9a968a'))
    for _ in range(4):  # vỏ đạn
        x, y = r.randrange(1, 15), r.randrange(1, 15)
        c.set(x, y, GOLD)
    return c


def puddle():
    c = C(32, 16)
    c.blob(16, 8, 14, 5.5, rgb('#3a4048'), rgb('#2a3036'), rgb('#5a6470'), None)
    for x, y in ((9, 7), (20, 9)):
        c.set(x, y, rgb('#8a7aa8')), c.set(x + 1, y, rgb('#6a8aa8'))  # váng dầu
    return c


def crate():
    c = C(16, 16)
    c.rect(1, 3, 14, 14, OLIVE)
    c.rect(1, 3, 14, 4, OLIVE_L)
    c.rect(1, 14, 14, 14, OLIVE_D)
    c.rect(1, 8, 14, 8, OLIVE_D)
    c.rect(6, 10, 9, 12, YEL)
    return outline(c, O)


def sludge():
    """Bùn hoá chất phát sáng (thay dung nham), 2 khung."""
    c = C(32, 16)
    for f in range(2):
        r = random.Random(f + 11)
        for x in range(16):
            for y in range(16):
                c.set(f * 16 + x, y, rgb('#4a8a3a') if (x + y + f) % 5 else rgb('#7ac050'))
        for _ in range(5):
            x, y = r.randrange(1, 15), r.randrange(1, 15)
            c.set(f * 16 + x, y, rgb('#c8f080'))
    return c


# ---------------- Đống phế liệu (thay quặng) ----------------
def heap(col, col_l, bits):
    c = C(16, 16)
    c.blob(8, 11, 7, 4.5, MET_D, O, MET, None)
    for x, y in bits:
        c.set(x, y, col), c.set(x + 1, y, col_l)
    return c


def ore_copper():
    c = heap(COP, COP_L, [])
    for i in range(3):  # cuộn dây đồng
        c.blob(5 + i * 3, 9 + (i % 2), 2.4, 2, COP, O, COP_L, None)
    return c


def ore_iron():
    c = heap(MET, MET_L, [])
    for i in range(4):  # thanh thép cong
        for k in range(6):
            c.set(3 + i * 3 + k // 3, 12 - k, MET_L if k % 2 else MET)
    c.set(6, 8, RUST), c.set(10, 7, RUST)
    return c


def ore_gold():
    c = heap(GOLD, GOLD_L, [])
    c.rect(3, 6, 12, 11, PCB)  # bo mạch
    c.rect(3, 6, 12, 6, PCB_L)
    for x in range(4, 12, 2):
        c.set(x, 8, GOLD), c.set(x, 10, GOLD_L)
    c.rect(7, 7, 9, 9, BLK)
    return outline(c, O)


def ore_gem():
    """Két sắt nhỏ (chứa đá quý)."""
    c = C(16, 16)
    c.rect(2, 3, 13, 14, rgb('#4a4e56'))
    c.rect(2, 3, 13, 4, rgb('#6a707a'))
    c.rect(4, 6, 11, 12, rgb('#3a3e46'))
    c.blob(8, 9, 2, 2, MET_L, MET_D, None, None)
    c.set(12, 8, GOLD), c.set(12, 10, GOLD)
    return outline(c, O)


def lockbox(col, col_l):
    """Hộp khoá quân dụng (thay hốc đá)."""
    c = C(16, 16)
    c.rect(2, 5, 13, 14, col)
    c.rect(2, 5, 13, 6, col_l)
    c.rect(2, 10, 13, 10, O)
    c.rect(6, 8, 9, 12, MET)
    c.rect(7, 10, 8, 11, BLK)
    c.rect(5, 2, 10, 4, MET_D)  # quai
    c.rect(6, 3, 9, 3, T)
    return outline(c, O)


def big_heap():
    """Đống sắt vụn lớn (thay tảng đá lớn) — 32x26."""
    c = C(32, 26)
    c.blob(16, 18, 15, 7.5, MET_D, O, MET, None)
    c.blob(10, 13, 7, 5, MET, O, MET_L, None)
    c.blob(22, 14, 6, 4.5, rgb('#6a5a4a'), O, None, None)
    c.rect(18, 4, 19, 12, RUST)  # ống thép chĩa lên
    c.rect(18, 4, 19, 4, RUST_L)
    c.rect(4, 15, 12, 17, rgb('#9a3a32'))  # cửa xe
    c.rect(5, 15, 11, 15, rgb('#c45a4a'))
    for x, y in ((24, 17), (8, 21), (26, 21)):
        c.blob(x, y, 2.5, 2.2, BLK, O, None, None)  # lốp
    return c


def canister():
    """Bình hoá chất phát sáng (thay cụm pha lê) — 16x18."""
    c = C(16, 18)
    c.rect(4, 4, 11, 16, rgb('#9adf7a'))
    c.rect(4, 4, 5, 16, rgb('#d8ffb8'))
    c.rect(3, 2, 12, 4, MET_D)
    c.rect(3, 16, 12, 17, MET_D)
    c.set(8, 9, rgb('#e8ffd0')), c.set(9, 12, rgb('#e8ffd0'))
    return outline(c, O)


def vise_bench():
    """Bàn phá khoá: bàn thép có ê-tô — 32x22."""
    c = C(32, 22)
    c.rect(1, 8, 30, 11, MET)
    c.rect(1, 8, 30, 8, MET_L)
    for x in (3, 27):
        c.rect(x, 12, x + 1, 21, MET_D)
    c.rect(5, 2, 13, 7, rgb('#3a5a8a'))  # ê-tô
    c.rect(8, 0, 10, 2, MET_D)
    c.rect(18, 5, 26, 7, RUST)  # xà beng
    c.rect(20, 3, 23, 7, rgb('#6a707a'))  # hộp khoá đang phá
    return outline(c, O)


def scrap_cart():
    """Xe đẩy thu mua phế liệu — 32x24."""
    c = C(32, 24)
    c.rect(3, 6, 28, 16, rgb('#3a5a8a'))
    c.rect(3, 6, 28, 7, rgb('#5a7ab0'))
    for x in range(6, 28, 5):
        c.rect(x, 8, x, 16, rgb('#24385a'))
    c.blob(9, 4, 3, 2.5, COP, O, COP_L, None)  # phế liệu chất đầy
    c.blob(16, 4, 3.5, 2.5, MET, O, MET_L, None)
    c.blob(23, 4, 3, 2.5, GOLD, O, GOLD_L, None)
    for x in (8, 23):
        c.blob(x, 19, 3.5, 3.5, BLK, O, None, None)
        c.set(x, 19, MET)
    c.rect(28, 8, 31, 9, MET_D)  # tay đẩy
    return outline(c, O)


def door():
    """Cửa hầm thép quân sự trong khối bê tông — 48x40."""
    c = C(48, 40)
    c.rect(0, 6, 47, 39, W0)  # khối bê tông
    c.rect(0, 6, 47, 9, W3)
    for x in range(0, 48, 12):
        c.rect(x, 10, x, 39, W2)
    c.rect(10, 14, 37, 39, MET_D)  # khung cửa
    c.rect(12, 16, 35, 39, MET)
    c.rect(12, 16, 35, 17, MET_L)
    c.rect(23, 16, 24, 39, MET_D)
    c.blob(18, 28, 3, 3, MET_D, O, MET_L, None)  # tay quay
    c.blob(29, 28, 3, 3, MET_D, O, MET_L, None)
    for x in range(10, 38):  # sọc cảnh báo
        c.set(x, 12, YEL if (x // 3) % 2 else BLK), c.set(x, 13, YEL if (x // 3) % 2 else BLK)
    c.rect(38, 18, 42, 22, rgb('#c03030'))  # đèn báo đỏ
    c.rect(39, 19, 40, 20, rgb('#ff8080'))
    c.rect(2, 0, 9, 6, W1)  # ống thông gió
    c.rect(3, 1, 8, 2, W3)
    return outline(c, O)


def main():
    for i in range(4):
        save(floor(100 + i), CAVE, f'floor{i}')
    save(wall_top(), CAVE, 'wall_top')
    save(wall_face(), CAVE, 'wall_face')
    for sd in 'lrt':
        save(edge(sd), CAVE, f'edge_{sd}')
    save(lamp(), CAVE, 'torch')
    save(beam(), CAVE, 'beam')
    save(rubble(), CAVE, 'stalagmite')
    save(pebbles(), CAVE, 'pebbles')
    save(puddle(), CAVE, 'puddle')
    save(crate(), CAVE, 'crate')
    save(sludge(), CAVE, 'lava')
    save(stone_chunk(), CAVE, 'rubble')
    for name, fn in (('ore_copper', ore_copper), ('ore_iron', ore_iron), ('ore_gold', ore_gold), ('ore_gem', ore_gem)):
        save(fn(), CAVE, name)
    save(lockbox(OLIVE, OLIVE_L), QUARRY, 'geode')
    save(lockbox(rgb('#4a6a9a'), rgb('#7a9aca')), QUARRY, 'geode_ice')
    save(lockbox(rgb('#9a3a32'), rgb('#c45a4a')), QUARRY, 'geode_fire')
    save(big_heap(), QUARRY, 'boulder')
    save(canister(), QUARRY, 'crystal')
    save(vise_bench(), QUARRY, 'anvil')
    save(scrap_cart(), QUARRY, 'cart')
    save(door(), QUARRY, 'door')
    print('bunker art saved')


if __name__ == '__main__':
    main()
