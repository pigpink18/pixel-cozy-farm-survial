"""Zombie hình người — cùng thân người Pixel Crawler Body_A với nhân vật chính (tools/make_hero.py),
dáng đi lê lết (Walk, chạy dùng Run). Da xám xanh, mắt đỏ,
áo quần rách lộ thịt, vết máu. Xuất đúng bố cục game (32x32, 4 cột):
  hàng 0–3 đi (xuống, lên, trái, phải) · 4–7 đứng · 8–9 ngã (nhìn ngang)
  public/assets/zombie/zom_{walker,runner,brute,soldier}.png
Chạy: python3 tools/make_zombies_human.py
"""
import os
import random
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_hero as mh  # noqa: E402

A = mh.SRC
OUT = os.path.join(mh.ROOT, 'public', 'assets', 'zombie')


def pal(skin, light, shade, dark):
    return {mh.SKIN: skin, mh.LIGHT: light, mh.SHADE: shade, mh.DARK: dark}


ZSKIN = pal((148, 166, 128), (176, 192, 154), (108, 126, 96), (76, 90, 70))
EYES = {(255, 252, 252): (236, 222, 150), (76, 181, 40): (232, 40, 28), (167, 172, 174): (140, 24, 20)}
BLOOD = [(122, 22, 22), (156, 34, 30), (90, 14, 16)]

TYPES = {
    #           tóc/mũ                                   áo                                       quần                                      giày                                  dáng đi
    'walker': (pal((62, 54, 46), (80, 70, 60), (44, 38, 32), (32, 28, 24)), pal((160, 152, 134), (184, 176, 156), (122, 114, 100), (90, 84, 74)), pal((90, 74, 58), (110, 92, 72), (66, 54, 42), (48, 40, 32)), pal((50, 44, 40), (64, 56, 50), (38, 34, 30), (28, 24, 22)), 'Walk'),
    'runner': (pal((98, 64, 40), (124, 84, 54), (70, 46, 30), (50, 32, 22)), pal((140, 62, 56), (166, 82, 72), (104, 44, 40), (76, 32, 30)), pal((58, 66, 92), (74, 84, 112), (42, 48, 70), (30, 34, 52)), pal((50, 44, 40), (64, 56, 50), (38, 34, 30), (28, 24, 22)), 'Run'),
    'brute': (ZSKIN, pal((70, 70, 64), (88, 88, 80), (52, 52, 48), (38, 38, 36)), pal((64, 58, 50), (80, 72, 62), (48, 44, 38), (34, 32, 28)), pal((40, 36, 34), (52, 46, 44), (30, 28, 26), (22, 20, 18)), 'Walk'),
    'soldier': (pal((84, 94, 56), (104, 116, 70), (62, 70, 42), (46, 52, 32)), pal((96, 108, 64), (118, 130, 80), (72, 82, 48), (54, 62, 36)), pal((80, 90, 54), (98, 110, 66), (60, 68, 40), (44, 50, 30)), pal((34, 32, 30), (46, 42, 40), (26, 24, 22), (18, 16, 16)), 'Walk'),
}


def zombify(fr, seed):
    px = fr.load()
    w, h = fr.size
    cloth = []
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if not p[3]:
                continue
            c = p[:3]
            if c in mh.SKINS:  # da còn lại (mặt, tay) → da xác sống
                px[x, y] = ZSKIN[c] + (p[3],)
            elif c in EYES:
                px[x, y] = EYES[c] + (p[3],)
            elif c != mh.OUTLINE:
                cloth.append((x, y))
    rnd = random.Random(seed)
    cloth.sort()
    if cloth:
        for _ in range(4):  # vết rách lộ thịt
            x, y = rnd.choice(cloth)
            px[x, y] = ZSKIN[mh.SHADE] + (255,)
        for _ in range(6):  # vết máu
            x, y = rnd.choice(cloth)
            px[x, y] = rnd.choice(BLOOD) + (255,)
            if (x, y + 1) in cloth:
                px[x, y + 1] = BLOOD[2] + (255,)
    return fr


def frames(folder, pre, view, n_pick, seed):
    name = f'{pre}_{view}-Sheet.png'
    im = Image.open(os.path.join(A, folder, name)).convert('RGBA')
    n = im.width // 64
    idx = [round(i * (n - 1) / max(1, n_pick - 1)) for i in range(n_pick)] if n_pick < n else list(range(n))
    out = []
    for i in idx:
        fr = mh.dress(im.crop((i * 64, 0, i * 64 + 64, 64)), view)
        fr = zombify(fr, seed)
        out.append(fr.crop((16, 16, 48, 48)))  # chân ở hàng 47 → đáy khung 32
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    flip = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)  # noqa: E731
    for z, (hair, shirt, pants, boots, gait) in TYPES.items():
        mh.HAIR, mh.SHIRT, mh.PANTS, mh.BOOTS = hair, shirt, pants, boots
        seed = sum(map(ord, z))
        walk = {v: frames(f'{gait}_Base', gait, v, 4, seed) for v in ('Down', 'Up', 'Side')}
        idle = {v: frames('Idle_Base', 'Idle', v, 4, seed) for v in ('Down', 'Up', 'Side')}
        death = frames('Death_Base', 'Death', 'Side', 8, seed)
        rows = [walk['Down'], walk['Up'], [flip(f) for f in walk['Side']], walk['Side'],
                idle['Down'], idle['Up'], [flip(f) for f in idle['Side']], idle['Side']]
        sheet = Image.new('RGBA', (4 * 32, 10 * 32))
        for r, fs in enumerate(rows):
            for c, f in enumerate(fs[:4]):
                sheet.alpha_composite(f, (c * 32, r * 32))
        for c, f in enumerate(death[:8]):
            sheet.alpha_composite(f, ((c % 4) * 32, (8 + c // 4) * 32))
        sheet.save(os.path.join(OUT, f'zom_{z}.png'))
        print('saved', z)


if __name__ == '__main__':
    main()
