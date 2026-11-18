"""Cây, cỏ dại, gốc cây, đá, cành khô từ Pixel Crawler (Anokolisa).

  public/assets/pc/trees.png   khung 40x80: frame = kiểu*4 + mùa (0 xuân, 1 hạ, 2 thu, 3 đông)
                               kiểu 0 = tán tròn, 1 = thông, 2 = cây cao (cây trên nông trại)
  public/assets/pc/bushes.png  khung 16x16: 0–3 cỏ dại theo mùa, 4–7 cỏ dại nhỏ theo mùa, 8 gốc cây
  public/assets/pc/nature.png  khung 16x16: 0 đá, 1 đá nhỏ, 2 cành khô, 3 cành khô 2
Chạy: python3 tools/make_nature_pc.py
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pc_sprites import fit  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Props', 'Static')
OUT = os.path.join(ROOT, 'public', 'assets', 'pc')


def load(*p):
    return Image.open(os.path.join(ST, *p)).convert('RGBA')


def trees():
    m1 = load('Trees', 'Model_01', 'Size_02.png')
    m2 = load('Trees', 'Model_02', 'Size_03.png')
    m3 = load('Trees', 'Model_03', 'Size_02.png')
    g = lambda im, b: im.crop(b)  # noqa: E731
    green, orange = g(m1, (32, 2, 64, 64)), g(m1, (32, 66, 64, 128))
    lime = g(m1, (96, 2, 128, 64))
    bare, frost = g(m1, (161, 17, 187, 64)), g(m1, (225, 18, 251, 64))
    p_teal, p_mid = g(m2, (4, 4, 41, 80)), g(m2, (52, 4, 89, 80))
    p_green, p_bright = g(m2, (4, 84, 41, 160)), g(m2, (52, 84, 89, 160))
    t_green, t_olive = g(m3, (0, 5, 30, 80)), g(m3, (64, 5, 94, 80))
    t_red = g(m3, (64, 85, 94, 160))
    kinds = [
        [green, lime, orange, frost],
        [p_bright, p_green, p_teal, p_mid],
        [t_green, t_olive, t_red, bare],
    ]
    out = Image.new('RGBA', (4 * 40, 3 * 80))
    for k, row in enumerate(kinds):
        for s, spr in enumerate(row):
            out.alpha_composite(fit(spr, 40, 80), (s * 40, k * 80))
    out.save(os.path.join(OUT, 'trees.png'))


def bushes():
    veg = load('Vegetation.png')
    c = lambda r, col: veg.crop((col * 16, r * 16, col * 16 + 16, r * 16 + 16))  # noqa: E731
    # hàng 11 xanh, 14 xanh ô liu, 17 nâu
    big = [c(11, 6), c(11, 7), c(17, 6), c(14, 6)]
    small = [c(11, 5), c(11, 4), c(17, 5), c(14, 5)]
    out = Image.new('RGBA', (9 * 16, 16))
    for i, t in enumerate(big + small + [c(20, 13)]):
        out.alpha_composite(t, (i * 16, 0))
    out.save(os.path.join(OUT, 'bushes.png'))
    return veg


def nature(veg):
    rocks = load('Rocks.png')
    out = Image.new('RGBA', (4 * 16, 16))
    for i, spr in enumerate([rocks.crop((176, 17, 192, 31)), rocks.crop((161, 19, 175, 30))]):
        out.alpha_composite(fit(spr, 16, 16), (i * 16, 0))
    for i, (r, col) in enumerate(((19, 3), (19, 5))):
        out.alpha_composite(veg.crop((col * 16, r * 16, col * 16 + 16, r * 16 + 16)), ((2 + i) * 16, 0))
    out.save(os.path.join(OUT, 'nature.png'))


def main():
    os.makedirs(OUT, exist_ok=True)
    trees()
    nature(bushes())
    print('saved ->', OUT)


if __name__ == '__main__':
    main()
