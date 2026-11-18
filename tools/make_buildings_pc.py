"""Nhà, rương, bàn chế tạo từ 2 bộ asset người dùng thêm vào.

  public/assets/pc/house.png      nhà nông trại (Farm RPG — Objects/House.png, mẫu có cửa)
  public/assets/pc/chest.png      rương gỗ (Farm RPG — Objects/chest.png, nắp đóng)
  public/assets/pc/workbench.png  bàn chế tạo gỗ có dụng cụ (Pixel Crawler — Stations/Workbench)
Chạy: python3 tools/make_buildings_pc.py
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_crops_pack import farm_rpg_dir  # noqa: E402
from pc_sprites import fit  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'pc')
PC = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Environment', 'Structures', 'Stations')


def main():
    sys.argv = sys.argv[:1]
    fr = os.path.join(farm_rpg_dir(), 'Objects')
    os.makedirs(OUT, exist_ok=True)
    Image.open(os.path.join(fr, 'House.png')).convert('RGBA').crop((148, 3, 220, 98)).save(os.path.join(OUT, 'house.png'))
    fit(Image.open(os.path.join(fr, 'chest.png')).convert('RGBA').crop((8, 3, 23, 16)), 16, 16).save(os.path.join(OUT, 'chest.png'))
    Image.open(os.path.join(PC, 'Workbench', 'Workbench.png')).convert('RGBA').crop((48, 72, 96, 112)).save(os.path.join(OUT, 'workbench.png'))
    print('saved ->', OUT)


if __name__ == '__main__':
    main()
