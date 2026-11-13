"""Vẽ hàng rào gỗ kiểu Stardew (cột có nắp + 2 thanh ngang).
Dùng: python3 tools/make_fences.py → public/assets/fp/fences.png
Khung: 0 ngang · 1 dọc · 2 cột đơn/góc · 3 ngang nối phải (đầu trái) · 4 ngang nối trái (đầu phải)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fp', 'fences.png')
O = (70, 48, 40)
HI, LT, MD, DK = (236, 190, 124), (208, 152, 92), (172, 116, 70), (122, 80, 54)


def px(im, x, y, c):
    if 0 <= x < 16 and 0 <= y < 16:
        im.putpixel((x, y), c + (255,))


def post(im):
    for y in range(3, 15):
        for x in range(6, 10):
            px(im, x, y, LT if x == 6 else DK if x == 9 else MD)
        px(im, 5, y, O)
        px(im, 10, y, O)
    for x in range(5, 11):  # nắp cột
        px(im, x, 2, O)
        px(im, x, 15, O)
    for x in range(6, 10):
        px(im, x, 3, HI)
    px(im, 7, 7, DK)  # vân gỗ
    px(im, 8, 11, DK)


def rail(im, y, x0, x1):
    for x in range(x0, x1 + 1):
        px(im, x, y - 1, O)
        px(im, x, y, HI if x % 5 else LT)
        px(im, x, y + 1, MD)
        px(im, x, y + 2, O)


def vrail(im):
    for y in range(0, 16):
        for x in (7, 8):
            px(im, x, y, MD if x == 7 else DK)
        px(im, 6, y, O)
        px(im, 9, y, O)


def tile(kind):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    if kind == 1:
        vrail(im)
    if kind in (0, 3, 4):
        x0 = 6 if kind == 3 else 0
        x1 = 9 if kind == 4 else 15
        rail(im, 5, x0, x1)
        rail(im, 10, x0, x1)
    post(im)
    return im


sheet = Image.new('RGBA', (16 * 5, 16), (0, 0, 0, 0))
for i in range(5):
    sheet.alpha_composite(tile(i), (i * 16, 0))
sheet.save(OUT)
print('ok')
