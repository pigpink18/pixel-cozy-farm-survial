"""Dân làng dựng từ cùng thân người Pixel Crawler Body_A với nhân vật chính (tools/make_hero.py):
mỗi người một kiểu tóc / màu tóc / quần áo theo nghề. Xuất đúng bố cục cũ (tools/make_npcs.py):
  public/assets/fp/npc_<id>.png       khung 32x32, 4 cột: hàng 0–3 đi (xuống, lên, trái, phải), 4–7 đứng
  public/assets/fp/npc_<id>_face.png  chân dung 22x22 cho hộp thoại
Chạy: python3 tools/make_npcs_pc.py
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_hero as mh  # noqa: E402

OUT = os.path.join(mh.ROOT, 'public', 'assets', 'fp')


def pal(c, light=None, shade=None, dark=None):
    """Bảng 4 tông từ 1 màu gốc."""
    f = lambda k: tuple(max(0, min(255, int(v * k))) for v in c)  # noqa: E731
    return {mh.SKIN: c, mh.LIGHT: light or f(1.22), mh.SHADE: shade or f(0.72), mh.DARK: dark or f(0.52)}


BOOTS = pal((70, 50, 36))
NPCS = {
    #        tóc                       kiểu     áo                      quần                   nền chân dung
    'nam': (pal((196, 196, 188)), 'short', pal((52, 78, 120)), pal((96, 76, 56)), (120, 160, 200)),     # Ông Walter: tóc bạc, áo khoác ngư dân xanh navy
    'lan': (pal((214, 210, 204)), 'long', pal((128, 76, 140)), pal((112, 66, 124)), (220, 170, 200)),   # Bà Martha: tóc bạc dài, váy tím
    'tu': (pal((104, 64, 40)), 'short', pal((168, 52, 44)), pal((66, 86, 128)), (230, 170, 120)),        # Chú Frank: áo caro đỏ thợ mộc
    'mai': (pal((222, 184, 96)), 'long', pal((96, 140, 72)), pal((110, 82, 58)), (180, 210, 140)),      # Cô Emily: tóc vàng, áo xanh lá chăn nuôi
    'ba': (pal((40, 36, 34)), 'short', pal((92, 102, 62)), pal((50, 52, 46)), (160, 170, 130)),         # Anh Jack: áo lính ô liu
    'hoa': (pal((140, 52, 40)), 'long', pal((232, 228, 216)), pal((44, 42, 48)), (240, 190, 170)),      # Chị Rosa: tóc đỏ, áo bếp trắng
    'sau': (pal((150, 120, 96)), 'bald', pal((216, 120, 40)), pal((60, 56, 52)), (200, 180, 150)),      # Bác George: trọc, áo gi-lê cam thợ mỏ
    'ti': (pal((206, 110, 50)), 'short', pal((230, 196, 70)), pal((66, 86, 128)), (250, 220, 140)),     # Bé Timmy: tóc cam, áo vàng
    'bin': (pal((92, 60, 36)), 'short', pal((70, 120, 190)), pal((72, 66, 60)), (170, 200, 240)),       # Bé Ben: áo xanh dương
}


def frames(folder, pre, view, n_pick):
    im = Image.open(os.path.join(mh.SRC, folder, f'{pre}_{view}-Sheet.png')).convert('RGBA')
    n = im.width // 64
    idx = [round(i * (n - 1) / max(1, n_pick - 1)) for i in range(n_pick)]
    return [mh.dress(im.crop((i * 64, 0, i * 64 + 64, 64)), view).crop((16, 16, 48, 48)) for i in idx]


def main():
    flip = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)  # noqa: E731
    for nid, (hair, style, shirt, pants, bg) in NPCS.items():
        mh.HAIR, mh.SHIRT, mh.PANTS, mh.BOOTS, mh.HAIR_STYLE = hair, shirt, pants, BOOTS, style
        walk = {v: frames('Walk_Base', 'Walk', v, 4) for v in ('Down', 'Up', 'Side')}
        idle = {v: frames('Idle_Base', 'Idle', v, 4) for v in ('Down', 'Up', 'Side')}
        rows = [walk['Down'], walk['Up'], [flip(f) for f in walk['Side']], walk['Side'],
                idle['Down'], idle['Up'], [flip(f) for f in idle['Side']], idle['Side']]
        sheet = Image.new('RGBA', (4 * 32, 8 * 32))
        for r, fs in enumerate(rows):
            for c, f in enumerate(fs[:4]):
                sheet.alpha_composite(f, (c * 32, r * 32))
        sheet.save(os.path.join(OUT, f'npc_{nid}.png'))
        # chân dung 22x22: đầu + vai nhìn thẳng trên nền màu riêng
        face = Image.new('RGBA', (22, 22), bg + (255,))
        head = idle['Down'][0].crop((8, 0, 24, 20))
        face.alpha_composite(head, (3, 3))
        face.save(os.path.join(OUT, f'npc_{nid}_face.png'))
        print('saved', nid)
    mh.HAIR_STYLE = 'short'


if __name__ == '__main__':
    main()
