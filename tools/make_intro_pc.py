"""Hình cho đoạn mở đầu (IntroScene) — cắt từ Pixel Crawler (Anokolisa):
nền cỏ / cát / nước biển (khối ô nối liền), đá tảng lớn làm vách đá, cây chết, bụi cây.

  public/assets/intro/{grass,sand,sea,rock_a,rock_b,rock_c,rock_d,deadtree,bush}.png
Chạy: python3 tools/make_intro_pc.py
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pc_sprites import components  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PC = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment')
OUT = os.path.join(ROOT, 'public', 'assets', 'intro')


def load(*p):
    return Image.open(os.path.join(PC, *p)).convert('RGBA')


def block(im, r, c, rows, cols):
    return im.crop((c * 16, r * 16, (c + cols) * 16, (r + rows) * 16))


def main():
    os.makedirs(OUT, exist_ok=True)
    floors = load('Tilesets', 'Floors_Tiles.png')
    water = load('Tilesets', 'Water_tiles.png')
    rocks = load('Props', 'Static', 'Rocks.png')
    veg = load('Props', 'Static', 'Vegetation.png')
    # cỏ: 3 ô hàng 10 nối liền theo chiều ngang (lặp dọc vẫn khớp)
    block(floors, 10, 1, 1, 3).save(os.path.join(OUT, 'grass.png'))
    block(floors, 22, 5, 2, 3).save(os.path.join(OUT, 'sand.png'))
    block(water, 6, 1, 2, 3).save(os.path.join(OUT, 'sea.png'))
    for name, box in {'rock_a': (2, 19, 30, 62), 'rock_b': (98, 19, 126, 62), 'rock_c': (35, 19, 61, 46), 'rock_d': (131, 19, 157, 46)}.items():
        rocks.crop(box).save(os.path.join(OUT, f'{name}.png'))
    # cây chết lớn: cụm lớn nhất trong vùng cành khô
    region = veg.crop((150, 270, 240, 340))
    big = max(components(region, 60, 1), key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    region.crop(big).save(os.path.join(OUT, 'deadtree.png'))
    veg.crop((2, 5, 31, 32)).save(os.path.join(OUT, 'bush.png'))
    print('saved ->', OUT)


if __name__ == '__main__':
    main()
