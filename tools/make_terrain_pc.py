"""Địa hình dùng hoa văn Pixel Crawler (Anokolisa) — giữ bộ ô tự nối của make_terrain.py
(mép cong theo 8 hàng xóm) nhưng phần bên trong lấy mẫu từ ô gốc của bộ asset.

  public/assets/terrain/path.png   đất nâu (Floors_Tiles)
  public/assets/terrain/plaza.png  đá lát (Floors_Tiles)
  public/assets/terrain/water.png  nước + bờ đất (Water_tiles)
  public/assets/pc/grass.png       8 ô cỏ nền (4 trơn + 4 có hoa nhỏ) cho grassGround()
(đường nhựa road.png giữ bản vẽ code vì bộ asset không có)
Chạy: python3 tools/make_terrain_pc.py
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_terrain as mt  # noqa: E402

ROOT = mt.ROOT
TS = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Tilesets')
VEG = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Props', 'Static', 'Vegetation.png')

floors = Image.open(os.path.join(TS, 'Floors_Tiles.png')).convert('RGBA')
waters = Image.open(os.path.join(TS, 'Water_tiles.png')).convert('RGBA')


def block(im, r, c, rows=2, cols=3):
    """Khối ô liền nhau (hoa văn nối tiếp) → hàm lấy màu theo toạ độ trong ô 16x16."""
    b = im.crop((c * 16, r * 16, (c + cols) * 16, (r + rows) * 16)).load()
    return b


DIRT = block(floors, 10, 11)
STONE = block(floors, 10, 6)
WATER = block(waters, 6, 1)
GRASS = block(floors, 10, 1)
SAND = block(floors, 22, 5)


def tex(b, x, y, m, cols=3, rows=2):
    """Chọn 1 trong các ô của khối theo mặt nạ để đỡ lặp lại."""
    k = (m * 2654435761 >> 7) % (cols * rows)
    return b[(k % cols) * 16 + x, (k // cols) * 16 + y]


def shade(c, f):
    return (int(c[0] * f), int(c[1] * f), int(c[2] * f), 255)


def paint_path(d, side, x, y, m):
    j = mt.h2(x, y, m & 0x55) * 1.4
    if d < 1.2 + j:
        return None
    c = tex(DIRT, x, y, 0)
    if d < 2.2 + j:
        return shade(c, 0.72)  # mép đất sẫm
    return c


def paint_plaza(d, side, x, y, m):
    if d < 1:
        return None
    if d < 2:
        return (52, 44, 40, 255)
    c = tex(STONE, x, y, 0)
    if d < 3:
        return shade(c, 0.8 if side in ('s', 'e') else 1.08)
    return c


BANK_TOP, BANK_DARK = (150, 96, 60, 255), (112, 68, 44, 255)
FOAM = (196, 228, 240, 255)


def paint_water(d, side, x, y, m):
    if d < 0.6:
        return None
    if d < 1.6:
        return shade(tex(GRASS, x, y, 0), 0.7)
    if d < 2.6:
        return (40, 30, 26, 255)
    if side == 'n' and d < 6:
        return BANK_TOP if d < 4 else BANK_DARK
    nn = 6 if side == 'n' else 2.6
    c = tex(WATER, x, y, 0)
    if d < nn + 1:
        return FOAM if mt.h2(x, y, 9) < 0.3 else shade(c, 1.15)
    return c


def paint_sand(d, side, x, y, m):
    j = mt.h2(x, y, m & 0x33) * 1.2
    if d < 0.8 + j:
        return None
    c = tex(SAND, x, y, 0)
    if d < 1.8 + j:
        return shade(c, 0.86)  # mép cát lẫn vào cỏ
    return c


def grass_sheet():
    veg = Image.open(VEG).convert('RGBA')
    flowers = [veg.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)) for r, c in ((23, 4), (24, 6), (25, 4), (26, 6))]
    out = Image.new('RGBA', (8 * 16, 16))
    tiles = [GRASS_IM.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)) for r, c in ((10, 1), (10, 2), (10, 3), (10, 2))]
    for i, t in enumerate(tiles):
        out.alpha_composite(t, (i * 16, 0))
        out.alpha_composite(t, ((i + 4) * 16, 0))
        out.alpha_composite(flowers[i], ((i + 4) * 16, 0))
    os.makedirs(os.path.join(ROOT, 'public', 'assets', 'pc'), exist_ok=True)
    out.save(os.path.join(ROOT, 'public', 'assets', 'pc', 'grass.png'))


GRASS_IM = floors


def main():
    out = mt.OUT
    mt.sheet(paint_path, 3).save(os.path.join(out, 'path.png'))
    mt.sheet(paint_water, 6).save(os.path.join(out, 'water.png'))
    mt.sheet(paint_plaza, 2).save(os.path.join(out, 'plaza.png'))
    mt.sheet(paint_sand, 3).save(os.path.join(out, 'sand.png'))
    grass_sheet()
    print('saved Pixel Crawler terrain ->', out)


if __name__ == '__main__':
    main()
