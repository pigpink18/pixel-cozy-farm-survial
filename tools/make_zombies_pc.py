"""Zombie từ bộ Orc của Pixel Crawler (Anokolisa): da xanh orc → da xám xanh bệnh hoạn, mắt đỏ rực,
quần áo xỉn rách, vết máu. Xuất đúng bố cục cũ của make_zombies.py (32x32, 4 cột):
  hàng 0–3 đi (xuống, lên, trái, phải) · hàng 4–7 đứng yên · hàng 8 ngã (6 khung, dùng cho đoạn mở đầu)
  public/assets/zombie/zom_{walker,runner,brute,soldier}.png
Chạy: python3 tools/make_zombies_pc.py
"""
import os
import random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOBS = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Entities', 'Mobs', 'Orc Crew')
OUT = os.path.join(ROOT, 'public', 'assets', 'zombie')

SKIN = {
    (119, 184, 69): (156, 172, 138), (93, 141, 56): (116, 134, 102), (63, 93, 39): (80, 96, 72), (35, 50, 25): (44, 52, 44),
}
EYES = {(236, 203, 172): (255, 70, 46), (189, 145, 104): (160, 30, 26)}
RAGS = {
    (68, 40, 15): (52, 44, 38), (112, 67, 28): (84, 72, 62), (155, 90, 34): (108, 96, 84), (181, 108, 48): (126, 114, 100),
    (75, 55, 32): (58, 50, 44), (130, 94, 58): (96, 86, 76), (40, 29, 18): (34, 30, 28),
    (138, 198, 224): (150, 138, 122), (92, 142, 165): (112, 98, 86), (59, 83, 94): (74, 64, 58), (113, 111, 97): (96, 84, 72),
}
CAMO = {(68, 40, 15): (52, 58, 34), (112, 67, 28): (80, 90, 50), (155, 90, 34): (104, 112, 64), (181, 108, 48): (122, 130, 76),
        (75, 55, 32): (60, 66, 40), (130, 94, 58): (90, 98, 58), (40, 29, 18): (36, 40, 26)}
OUTLINE = (20, 20, 18)
BONE = {(236, 203, 172): (206, 196, 172), (189, 145, 104): (150, 138, 112)}  # răng, tay, khoá thắt lưng
BLOOD = [(120, 22, 22), (156, 34, 30), (92, 16, 18)]

TYPES = {
    'walker': ('Orc', RAGS),
    'runner': ('Orc - Rogue', RAGS),
    'brute': ('Orc - Warrior', RAGS),
    'soldier': ('Orc', {**RAGS, **CAMO}),
}


def recolor(fr, rags, seed):
    fr = fr.copy()
    px = fr.load()
    body = []
    bb = fr.getbbox() or (0, 0, fr.width, fr.height)
    head_y = bb[1] + (bb[3] - bb[1]) * 0.42  # mắt chỉ nằm ở phần đầu
    for y in range(fr.height):
        for x in range(fr.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            c = (r, g, b)
            if c in SKIN:
                px[x, y] = SKIN[c] + (a,)
                body.append((x, y))
            elif c in EYES:
                px[x, y] = (EYES[c] if y < head_y else BONE[c]) + (a,)
            elif c in rags:
                px[x, y] = rags[c] + (a,)
                body.append((x, y))
    # vết máu cố định theo hạt giống (cùng chỗ ở mọi khung → không nhấp nháy)
    rnd = random.Random(seed)
    if body:
        ys = sorted(set(y for _, y in body))
        mid = ys[len(ys) // 3:]
        for _ in range(5):
            y = rnd.choice(mid)
            xs = [x for x, yy in body if yy == y]
            x = rnd.choice(xs)
            px[x, y] = rnd.choice(BLOOD) + (255,)
            if (x + 1, y) in body:
                px[x + 1, y] = BLOOD[2] + (255,)
    return fr


def frame32(src, i, w, h):
    """Cắt khung i của tấm (w x h mỗi khung) → 32x32, chân sát đáy, căn giữa ngang."""
    fr = src.crop((i * w, 0, i * w + w, h))
    bb = fr.getbbox()
    out = Image.new('RGBA', (32, 32))
    if not bb:
        return out
    fr = fr.crop(bb)
    out.alpha_composite(fr, ((32 - fr.width) // 2, 32 - fr.height))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for z, (folder, rags) in TYPES.items():
        base = os.path.join(MOBS, folder)
        run = Image.open(os.path.join(base, 'Run', 'Run-Sheet.png')).convert('RGBA')
        idle = Image.open(os.path.join(base, 'Idle', 'Idle-Sheet.png')).convert('RGBA')
        death = Image.open(os.path.join(base, 'Death', 'Death-Sheet.png')).convert('RGBA')
        seed = hash(z) & 0xffff
        runF = [recolor(frame32(run, i, 64, 64), rags, seed) for i in (0, 1, 3, 4)]
        idleF = [recolor(frame32(idle, i, 32, 32), rags, seed) for i in range(4)]
        dh = death.height
        deathF = [recolor(frame32(death, i, death.width // (death.width // dh if death.width % dh == 0 else 6), dh), rags, seed)
                  for i in range(min(6, death.width // dh if death.width % dh == 0 else 6))]
        sheet = Image.new('RGBA', (4 * 32, 10 * 32))
        flip = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)  # noqa: E731
        # hình gốc nhìn sang phải: xuống/phải dùng gốc, lên/trái lật
        rows = [runF, [flip(f) for f in runF], [flip(f) for f in runF], runF,
                idleF, [flip(f) for f in idleF], [flip(f) for f in idleF], idleF]
        for r, frames in enumerate(rows):
            for c, f in enumerate(frames):
                sheet.alpha_composite(f, (c * 32, r * 32))
        for c, f in enumerate(deathF):
            sheet.alpha_composite(f, ((c % 4) * 32, (8 + c // 4) * 32))
        sheet.save(os.path.join(OUT, f'zom_{z}.png'))
        print(z, 'death frames', len(deathF))


if __name__ == '__main__':
    main()
