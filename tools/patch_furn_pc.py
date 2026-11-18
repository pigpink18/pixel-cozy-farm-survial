"""Thay sàn & tường trong nhà (atlas furn) bằng ô Pixel Crawler — Interior_Walls_01.png.
Chạy SAU tools/make_furniture.py: python3 tools/patch_furn_pc.py
"""
import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Structures', 'Buildings', 'Interior', 'Interior_Walls_01.png')
FURN = os.path.join(ROOT, 'public', 'assets', 'furn')

# frame → ô (hàng, cột) 16x16; tường = 2 ô chồng nhau
FLOOR = {'floor_wood': (38, 2), 'floor_wood_dark': (38, 12), 'floor_stone': (38, 7), 'floor_check': (38, 17)}
WALL = {'wall_cream': ((6, 2), (7, 2)), 'wall_wood': ((37, 23), (38, 23)), 'wall_brick': ((6, 8), (7, 8))}


def main():
    src = Image.open(SRC).convert('RGBA')
    sheet = Image.open(os.path.join(FURN, 'furn.png')).convert('RGBA')
    frames = json.load(open(os.path.join(FURN, 'furn.json')))['frames']
    cell = lambda r, c: src.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))  # noqa: E731
    for name, (r, c) in FLOOR.items():
        f = frames[name]['frame']
        sheet.paste(cell(r, c), (f['x'], f['y']))
    for name, ((r0, c0), (r1, c1)) in WALL.items():
        f = frames[name]['frame']
        sheet.paste(cell(r0, c0), (f['x'], f['y']))
        sheet.paste(cell(r1, c1), (f['x'], f['y'] + 16))
    sheet.save(os.path.join(FURN, 'furn.png'))
    print('patched furn.png')


if __name__ == '__main__':
    main()
