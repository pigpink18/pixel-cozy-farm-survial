"""Tạo sprite zombie cùng khung 32x32 với nhân vật chính (dựa trên make_npcs.py).

Mỗi loại: đổi màu da xanh xám, quần áo rách (lỗ thủng + vết máu), tóc rối.
Kết quả: public/assets/zombie/zom_<id>.png (128 x 256, 8 hàng: đi bộ ×4 hướng, đứng ×4 hướng)

Chạy: python3 tools/make_zombies.py
"""
import os
import random

from PIL import Image

from make_npcs import (SRC, F, T, O, SKIN, SKIN_D, frame, top_row, recolor, draw_hair, long_hair_under_hat, rgb)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/zombie')

BLOOD, BLOOD_D = rgb('#8a1f1f'), rgb('#5a1414')

ZOMBIES = {
    # Zombie thường: da xanh xám, áo xanh bạc rách, quần nâu
    'walker': dict(skin=('#8fae7e', '#6d8f62'), hat=None, hair=('#3a3a32', '#25251f'), bun=False, long=False,
                   shirt=('#6f86a0', '#4d6078'), pants=('#6b5340', '#8f7458', '#3a2c22'), boots='#2e241c', tear=0.10, seed=1),
    # Zombie chạy nhanh: da tái nhợt, áo đỏ, quần jean
    'runner': dict(skin=('#b9c4a4', '#98a588'), hat=None, hair=('#6a4a32', '#4a3022'), bun=False, long=True,
                   shirt=('#a8433a', '#7a2f28'), pants=('#3f5f9e', '#7f9bd0', '#1d2c52'), boots='#2a2428', tear=0.14, seed=2),
    # Zombie to khoẻ: công nhân đội nón bảo hộ, áo cam (game phóng to 1.35 lần)
    'brute': dict(skin=('#7d9a6a', '#5e7a50'), hat=('#d9a21f', '#a8781a', '#e8e8e8'), hair=None, bun=False, long=False,
                  shirt=('#c8682e', '#93481f'), pants=('#4a4a52', '#6a6a74', '#26262c'), boots='#1f1d22', tear=0.08, seed=3),
    # Zombie lính: mũ sắt, áo rằn ri (khu quân sự)
    'soldier': dict(skin=('#86a07a', '#66805c'), hat=('#5d6b3a', '#3f4a26', '#2f3820'), hair=None, bun=False, long=False,
                    shirt=('#6b7a45', '#4a5530'), pants=('#5a6640', '#7a8758', '#323a22'), boots='#1f1d22', tear=0.07, seed=4, camo=True),
}


def zombify(fr, cfg, dy, r):
    px = fr.load()
    sk, skd = map(rgb, cfg['skin'])
    cloth = []
    for y in range(F):
        for x in range(F):
            c = px[x, y]
            if c == SKIN:
                px[x, y] = sk
            elif c == SKIN_D:
                px[x, y] = skd
            elif c[3] and c not in (O, sk, skd) and y > 12 + dy:
                cloth.append((x, y))
    # Rằn ri cho lính
    if cfg.get('camo'):
        for (x, y) in cloth:
            if (x * 3 + y * 5) % 7 == 0 and y < 26 + dy:
                px[x, y] = rgb('#3d4526')
    # Lỗ rách lộ da + vết máu
    for (x, y) in cloth:
        k = r.random()
        if k < cfg['tear'] * 0.5:
            px[x, y] = skd
        elif k < cfg['tear']:
            px[x, y] = BLOOD if r.random() < 0.6 else BLOOD_D
    # Mắt đỏ: điểm tối trên vùng mặt
    for y in range(9 + dy, 15 + dy):
        for x in range(F):
            if 0 <= y < F and px[x, y] == O and 0 < x < F - 1 and px[x - 1, y] in (sk, skd) and px[x + 1, y] in (sk, skd):
                px[x, y] = rgb('#d02a2a')


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(SRC).convert('RGBA')
    views = ['down', 'up', 'left', 'right']
    for zid, cfg in ZOMBIES.items():
        r = random.Random(cfg['seed'])
        sheet = Image.new('RGBA', (F * 4, F * 8), T)
        for row in range(8):
            view = views[row % 4]
            for col in range(4):
                fr = frame(src, col, row)
                dy = top_row(fr) - 3
                recolor(fr, cfg, dy)
                if cfg.get('hair') and cfg.get('hat'):
                    long_hair_under_hat(fr, cfg, view, dy)
                elif cfg.get('hair'):
                    draw_hair(fr, cfg, view, dy)
                zombify(fr, cfg, dy, r)
                sheet.paste(fr, (col * F, row * F))
        sheet.save(os.path.join(OUT, f'zom_{zid}.png'))
        print('saved zombie', zid)


if __name__ == '__main__':
    main()
