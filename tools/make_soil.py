"""Vẽ ô đất cuốc kiểu Stardew: mỗi ô là một ụ đất riêng, rãnh tối giữa các ô.
Dùng: python3 tools/make_soil.py → public/assets/fp/soil.png
Khung 0–2: đất khô (3 biến thể) · 3–5: đất đã tưới (ẩm, sẫm màu)
"""
import os, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fp', 'soil.png')

DRY = {'groove': (96, 64, 50), 'shadow': (128, 86, 62), 'base': (156, 108, 74), 'light': (180, 130, 90), 'hi': (200, 154, 110), 'clod': (116, 78, 58)}
WET = {'groove': (66, 44, 38), 'shadow': (88, 60, 48), 'base': (112, 76, 56), 'light': (134, 94, 68), 'hi': (152, 110, 80), 'clod': (78, 52, 42)}


def tile(p, seed):
    rnd = random.Random(seed)
    im = Image.new('RGBA', (16, 16), p['groove'] + (255,))
    for x in range(1, 15):
        for y in range(1, 15):
            # bo góc ụ đất
            if (x in (1, 14) and y in (1, 14)):
                continue
            c = p['base']
            if y <= 2 or x <= 1:
                c = p['light']
            if y == 1 and 2 < x < 13:
                c = p['hi']
            if y >= 13 or x >= 14:
                c = p['shadow']
            im.putpixel((x, y), c + (255,))
    # cục đất & vân
    for _ in range(5):
        x, y = rnd.randint(3, 11), rnd.randint(4, 11)
        im.putpixel((x, y), p['clod'] + (255,))
        im.putpixel((x + 1, y), p['shadow'] + (255,))
        im.putpixel((x, y - 1), p['light'] + (255,))
    return im


sheet = Image.new('RGBA', (16 * 6, 16), (0, 0, 0, 0))
for i in range(3):
    sheet.alpha_composite(tile(DRY, 10 + i), (i * 16, 0))
    sheet.alpha_composite(tile(WET, 10 + i), ((i + 3) * 16, 0))
sheet.save(OUT)
print('ok')
