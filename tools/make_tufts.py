"""Bụi cỏ nhỏ mọc dọc mép đường đất (cùng bảng màu cỏ Pixel Crawler).
Xuất public/assets/pc/tufts.png: 6 khung 16x14, gốc cỏ ở đáy khung (đặt origin 0.5, 1 rồi đung đưa).
Chạy: python3 tools/make_tufts.py
"""
import os
import random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'pc', 'tufts.png')
W, H = 16, 14
DARK, SHADE, MID, LIGHT, TIP = (28, 79, 7), (34, 104, 5), (51, 121, 3), (68, 143, 17), (104, 170, 40)


def blade(im, x, h, lean, rnd):
    """Một lá cỏ: gốc tối, ngọn sáng, hơi nghiêng."""
    px = im.load()
    fx = float(x)
    for i in range(h):
        y = H - 1 - i
        t = i / max(1, h - 1)
        c = DARK if t < 0.2 else SHADE if t < 0.45 else LIGHT if t < 0.8 else TIP
        xi = int(round(fx))
        if 0 <= xi < W:
            px[xi, y] = c + (255,)
            if i < h * 0.35 and 0 <= xi + 1 < W and px[xi + 1, y][3] == 0:
                px[xi + 1, y] = (DARK if i < 2 else MID) + (255,)  # gốc dày hơn
        fx += lean * (0.15 + t * 0.5)


def tuft(seed, n):
    rnd = random.Random(seed)
    im = Image.new('RGBA', (W, H))
    cx = W // 2
    for _ in range(n):
        x = cx + rnd.randint(-4, 4)
        h = rnd.randint(5, 11) if abs(x - cx) < 3 else rnd.randint(4, 7)
        lean = (x - cx) * 0.35 + rnd.uniform(-0.5, 0.5)
        blade(im, x, h, lean, rnd)
    return im


def main():
    sheet = Image.new('RGBA', (W * 6, H))
    for i, (seed, n) in enumerate([(1, 7), (2, 9), (3, 5), (4, 8), (5, 6), (6, 10)]):
        sheet.alpha_composite(tuft(seed * 31, n), (i * W, 0))
    sheet.save(OUT)
    print('saved', OUT)


if __name__ == '__main__':
    main()
