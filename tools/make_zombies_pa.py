"""Zombie từ PostApocalypse Asset Pack (TheLazyStone — miễn phí phi thương mại, thương mại trả ≥ 2 USD,
không phát lại nguyên bộ). Phóng 2x (giữ nét pixel) cho vừa nhân vật chính, gói vào khung 64x64, 8 cột:

  hàng 0–3  đi      (xuống, lên, trái, phải)
  hàng 4–7  đứng
  hàng 8–11 vồ cắn
  hàng 12   ngã (sang phải) · hàng 13 ngã (sang trái)
public/assets/zombie/zom_<loại>.png + zom_meta.json (số khung từng động tác, độ cao mắt)

  walker  = Zombie_Axe/No-Axe (cao, lê lết tay không)
  runner  = Zombie_Small (nhỏ, nhanh)
  brute   = Zombie_Big (to béo — khổng lồ)
  soldier = Zombie_Axe (cầm rìu)
Chạy: python3 tools/make_zombies_pa.py
"""
import glob
import json
import os
import re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EN = os.path.join(ROOT, 'PostApocalypse_AssetPack_v1.1.2', 'Enemies')
OUT = os.path.join(ROOT, 'public', 'assets', 'zombie')
F = 64  # khung
SCALE = 2

TYPES = {
    'walker': ('Zombie_Axe/No-Axe', 'Zombie_Axe_No-axe'),
    'runner': ('Zombie_Small', 'Zombie_Small'),
    'brute': ('Zombie_Big', 'Zombie_Big'),
    'soldier': ('Zombie_Axe', 'Zombie_Axe'),
}
DIRS = [('Down', 'down'), ('Up', 'up'), ('Side-left', 'left'), ('Side', 'right')]


def sheet_frames(folder, pre, view, anim):
    pat = os.path.join(EN, folder, f'{pre}_{view}_{anim}-Sheet*.png')
    files = [f for f in glob.glob(pat) if not os.path.basename(f).startswith(f'{pre}_{view}-')]
    if not files:  # tên file viết thường (vd. "walk")
        files = [f for f in glob.glob(os.path.join(EN, folder, f'{pre}_{view}_*-Sheet*.png')) if anim.lower() in f.lower().split(f'{pre}_{view}_'.lower())[-1]]
    f = files[0]
    n = int(re.search(r'Sheet(\d+)', f).group(1))
    im = Image.open(f).convert('RGBA')
    fw = im.width // n
    out = []
    for i in range(n):
        fr = im.crop((i * fw, 0, i * fw + fw, im.height)).resize((fw * SCALE, im.height * SCALE), Image.NEAREST)
        cell = Image.new('RGBA', (F, F))
        cell.alpha_composite(fr, ((F - fr.width) // 2, F - fr.height))  # chân sát đáy, căn giữa
        out.append(cell)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for z, (folder, pre) in TYPES.items():
        rows = []
        counts = {}
        for anim, key in (('Walk', 'walk'), ('Idle', 'idle'), ('First-Attack', 'attack')):
            for view, _ in DIRS:
                fr = sheet_frames(folder, pre, view, anim)
                rows.append(fr)
                counts[key] = min(counts.get(key, 99), len(fr), 8)
        for view in ('Side', 'Side-left'):
            fr = sheet_frames(folder, pre, view, 'First-Death')
            rows.append(fr)
            counts['death'] = min(counts.get('death', 99), len(fr), 8)
        sheet = Image.new('RGBA', (8 * F, len(rows) * F))
        for r, frs in enumerate(rows):
            for c, cell in enumerate(frs[:8]):
                sheet.alpha_composite(cell, (c * F, r * F))
        sheet.save(os.path.join(OUT, f'zom_{z}.png'))
        # độ cao mắt (tính từ chân) để đặt quầng mắt đỏ ban đêm: ~ 1/4 chiều cao từ đỉnh đầu
        bb = rows[4][0].getbbox()
        h = F - bb[1]
        counts['eye'] = round(h - h * 0.24)
        counts['height'] = h
        meta[z] = counts
        print(z, counts)
    json.dump(meta, open(os.path.join(OUT, 'zom_meta.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
