"""Cây trồng lấy từ 2 bộ asset người dùng thêm vào:
  - Pixel Crawler (Anokolisa) — Environment/Props/Static/Farm.png
  - Farm RPG FREE 16x16 — Objects/Spring Crops.png (giải nén từ file .rar ở gốc dự án)

Xuất:
  public/assets/crops/plants.png  khung 16x32, mỗi hàng 1 loại cây, 5 cột = giai đoạn 0..4
  public/assets/crops/items.png   khung 16x16, mỗi hàng 1 loại cây: cột 0 = gói hạt, cột 1 = nông sản
Thứ tự hàng = ORDER (config.js dùng cùng thứ tự).
Chạy: python3 tools/make_crops_pack.py [đường dẫn thư mục Farm RPG đã giải nén]
"""
import os
import subprocess
import sys
import tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PC = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Props', 'Static', 'Farm.png')
OUT = os.path.join(ROOT, 'public', 'assets', 'crops')


def farm_rpg_dir():
    if len(sys.argv) > 1:
        return sys.argv[1]
    d = tempfile.mkdtemp()
    subprocess.run(['bsdtar', '-xf', os.path.join(ROOT, 'Farm RPG FREE 16x16 - Tiny Asset Pack.rar'), '-C', d], check=True)
    return os.path.join(d, 'Farm RPG FREE 16x16 - Tiny Asset Pack')


def cell(im, r, c, h=1):
    return im.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16 * h))


def brighten(im, gain=1.3, sat=1.2):
    """Cây trên ruộng sáng & tươi hơn (nền đất sẫm + trời mưa làm cây tối thui).
    Giữ nguyên nét viền tối để hình vẫn sắc."""
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a or r + g + b < 90:
                continue
            m = (r + g + b) / 3
            r, g, b = (m + (c - m) * sat for c in (r, g, b))
            px[x, y] = tuple(min(255, int(c * gain + 10)) for c in (r, g, b)) + (a,)
    return im


def main():
    pc = Image.open(PC).convert('RGBA')
    fr = Image.open(os.path.join(farm_rpg_dir(), 'Objects', 'Spring Crops.png')).convert('RGBA')

    def pc_crop(k):
        """Pixel Crawler: cây thứ k chiếm hàng 2k (trên) và 2k+1 (dưới)."""
        top, bot = 2 * k, 2 * k + 1
        seeds = cell(pc, top, 2)  # hạt rắc trên đất (gốc màu trắng → nhuộm nâu hạt)
        px = seeds.load()
        for y in range(16):
            for x in range(16):
                r, g, b, a = px[x, y]
                if a and r > 200 and g > 200 and b > 200:
                    px[x, y] = (150, 104, 62, a)
                elif a and r + g + b > 300:
                    px[x, y] = (112, 76, 46, a)
        stages = [seeds, cell(pc, bot, 2)] + [cell(pc, top, c, 2) for c in (3, 4, 5)]
        return stages, cell(pc, top, 0), cell(pc, bot, 8)

    def frpg_crop(r, cols):
        return [cell(fr, r, c) for c in cols], cell(fr, r, 7), cell(fr, r, 8)

    ORDER = [
        ('carrot', pc_crop(0)),
        ('cabbage', pc_crop(2)),
        ('strawberry', frpg_crop(1, (0, 1, 2, 4, 5))),
        ('potato', frpg_crop(5, (0, 2, 3, 5, 6))),
        # thêm sẵn để dùng sau
        ('radish', pc_crop(1)),
        ('lettuce', pc_crop(3)),
        ('cauliflower', pc_crop(4)),
        ('broccoli', pc_crop(5)),
        ('garlic', pc_crop(6)),
        ('leek', frpg_crop(3, (0, 1, 3, 4, 5))),
        ('onion', frpg_crop(7, (0, 1, 3, 4, 5))),
    ]
    plants = Image.new('RGBA', (5 * 16, 32 * len(ORDER)), (0, 0, 0, 0))
    items = Image.new('RGBA', (2 * 16, 16 * len(ORDER)), (0, 0, 0, 0))
    for i, (name, (stages, seed, prod)) in enumerate(ORDER):
        stages = [brighten(st) for st in stages]
        for j, st in enumerate(stages):
            plants.alpha_composite(st, (j * 16, i * 32 + 32 - st.height))  # chân cây sát đáy khung
        items.alpha_composite(seed, (0, i * 16))
        items.alpha_composite(prod, (16, i * 16))
        print(f'row {i:2d} {name}')
    os.makedirs(OUT, exist_ok=True)
    plants.save(os.path.join(OUT, 'plants.png'))
    items.save(os.path.join(OUT, 'items.png'))


if __name__ == '__main__':
    main()
