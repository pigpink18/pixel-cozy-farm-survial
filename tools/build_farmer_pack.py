"""Đóng gói Farmer Pack v1.0 (Pyong Hoo) thành sprite sheet cho game.
Dùng: python3 tools/build_farmer_pack.py <thư mục Farmer-Pack-v1.0>
Kết quả: public/assets/fp/*.png
"""
import os, sys
from PIL import Image

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fp')
os.makedirs(OUT, exist_ok=True)
load = lambda p: Image.open(os.path.join(SRC, p)).convert('RGBA')


def stack(rows, fw, fh, name):
    sheet = Image.new('RGBA', (fw * 4, fh * len(rows)), (0, 0, 0, 0))
    for r, p in enumerate(rows):
        sheet.alpha_composite(load(p), (0, r * fh))
    sheet.save(os.path.join(OUT, name))


# Nông dân 32x32: mỗi hàng 4 khung
FARMER_ROWS = ['walk-front', 'walk-back', 'walk-left', 'walk-right', 'idle-front', 'idle-back', 'idle-left', 'idle-right',
               'hoe-front', 'hoe-back', 'hoe-side', 'watering-front', 'watering-back', 'watering-side',
               'planting-front', 'planting-back', 'planting-side', 'harvest-front', 'harvest-back', 'harvest-side']
stack([f'farmer/{r}.png' for r in FARMER_ROWS], 32, 32, 'farmer.png')

# Vật nuôi: hàng = walk/idle/eat × side/front/back
ANIMAL_ROWS = ['walk-side', 'walk-front', 'walk-back', 'idle-side', 'idle-front', 'idle-back', 'eat-side', 'eat-front', 'eat-back']
for a, size in [('chicken', 16), ('duck', 16), ('pig', 24), ('sheep', 24), ('cow', 32), ('horse', 32)]:
    stack([f'animals/{a}/{r}.png' for r in ANIMAL_ROWS], size, size, f'{a}.png')

# Ô nền 16x16 (8 cột)
TILES = ['grass/grass-1', 'grass/grass-2', 'grass/grass-3', 'grass/layer-3',
         'grass/top-1', 'grass/top-2', 'grass/bottom-1', 'grass/bottom-2', 'grass/left-1', 'grass/left-2', 'grass/right-1', 'grass/right-2',
         'grass/top-left-corner', 'grass/top-right-corner', 'grass/bottom-left-corner', 'grass/bottom-right-corner',
         'dirt/dirt-1', 'dirt/dirt-2', 'dirt/dirt-3', 'dirt/dirt-4', 'dirt/farmland', 'dirt/watered-farmland',
         'water/water-1', 'water/water-2', 'water/water-3', 'water/water-4', 'water/water-5']
tiles = Image.new('RGBA', (16 * 8, 16 * ((len(TILES) + 4 + 7) // 8)), (0, 0, 0, 0))
for i, t in enumerate(TILES):
    tiles.alpha_composite(load(f'tiles/{t}.png'), ((i % 8) * 16, (i // 8) * 16))
# Thêm 4 ô cỏ trơn (ô 27–30): bỏ hoa đỏ/trắng, giữ khóm cỏ — để mặt đất bớt rối
base = load('tiles/grass/grass-1.png').getpixel((0, 0))
for i, t in enumerate(TILES[:4]):
    im = load(f'tiles/{t}.png')
    px = im.load()
    for x in range(16):
        for y in range(16):
            r, g, b, a = px[x, y]
            if a and (r > g + 30 or (r > 200 and g > 200 and b > 200)):
                px[x, y] = base
    n = len(TILES) + i
    tiles.alpha_composite(im, ((n % 8) * 16, (n // 8) * 16))
tiles.save(os.path.join(OUT, 'tiles.png'))

# Cây trồng: 6 cột (hạt, 4 giai đoạn, nông sản) × 4 hàng
CROPS = ['carrot', 'tomato', 'strawberry', 'watermelon']
crops = Image.new('RGBA', (16 * 6, 16 * 4), (0, 0, 0, 0))
for r, c in enumerate(CROPS):
    for i, n in enumerate(['seed', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'harvest']):
        crops.alpha_composite(load(f'crops/{c}/{n}.png'), (i * 16, r * 16))
crops.save(os.path.join(OUT, 'crops.png'))

# Chân dung: đầu nông dân phóng to
idle = load('farmer/idle-front.png').crop((0, 0, 32, 32))
bb = idle.getbbox()
head = idle.crop((bb[0] - 1, bb[1], bb[2] + 1, bb[1] + 18))
face = head.resize((head.width * 3, head.height * 3), Image.NEAREST)
portrait = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
portrait.alpha_composite(face, ((64 - face.width) // 2, max(0, 64 - face.height)))
portrait.save(os.path.join(OUT, 'portrait.png'))

open(os.path.join(OUT, 'LICENSE-Farmer-Pack.txt'), 'w').write(open(os.path.join(SRC, 'LICENSE.txt')).read())
print('ok', 'farmer bbox', bb)
