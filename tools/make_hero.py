"""Nhân vật chính từ Pixel Crawler (Anokolisa) — Body_A, tự tô quần áo + tóc.

Ghép mọi động tác vào 1 sheet 64x64: public/assets/hero/hero.png
Mỗi hàng = 1 động tác x 1 hướng (tối đa 8 khung). Thứ tự hàng ở ROWS bên dưới
(BootScene.js đọc cùng thứ tự).
Chạy: python3 tools/make_hero.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'Pixel Crawler - Free Pack', 'Entities', 'Characters', 'Body_A', 'Animations')
OUT = os.path.join(ROOT, 'public', 'assets', 'hero', 'hero.png')

# (thư mục, tiền tố file) — hướng: Down, Up, Side
ROWS = [
    ('walk', 'Walk_Base', 'Walk'),
    ('idle', 'Idle_Base', 'Idle'),
    ('crush', 'Crush_Base', 'Crush'),
    ('slice', 'Slice_Base', 'Slice'),
    ('water', 'Watering_Base', 'Watering'),
    ('collect', 'Collect_Base', 'Collect'),
    ('pierce', 'Pierce_Base', 'Pierce'),
    ('fish', 'Fishing_Base', 'Fishing'),
    ('hit', 'Hit_Base', 'Hit'),
    ('death', 'Death_Base', 'Death'),
    ('run', 'Run_Base', 'Run'),
]
DIRS = ['Down', 'Up', 'Side']

# Bảng màu da gốc
OUTLINE = (0, 0, 0)
SKIN = (217, 160, 102)
SHADE = (162, 101, 67)
DARK = (118, 61, 43)
LIGHT = (250, 200, 149)
SKINS = {SKIN, SHADE, DARK, LIGHT}

# Trang phục: áo khoác vải olive, quần jean, tóc nâu
HAIR = {SKIN: (96, 60, 38), LIGHT: (128, 84, 52), SHADE: (66, 40, 28), DARK: (48, 28, 20)}
SHIRT = {SKIN: (112, 132, 78), LIGHT: (140, 160, 96), SHADE: (78, 94, 56), DARK: (58, 70, 42)}
PANTS = {SKIN: (70, 92, 132), LIGHT: (92, 116, 156), SHADE: (50, 64, 98), DARK: (38, 48, 74)}
HAIR_STYLE = 'short'  # short | long | bald (NPC dùng — tools/make_npcs_pc.py)
BOOTS = {SKIN: (84, 58, 40), LIGHT: (104, 74, 50), SHADE: (60, 40, 28), DARK: (44, 30, 22)}


def skin_runs(px, w, y):
    """Đoạn liên tục dài nhất ở hàng y gồm da/viền (dụng cụ ở giữa cũng tính),
    trả về (số px da+viền, tâm). Đoạn quá dài (cán dụng cụ nằm ngang) bị bỏ."""
    best = (0, 0)
    x = 0
    while x < w:
        if px[x, y][3]:
            s = x
            n = 0
            while x < w and px[x, y][3]:
                n += px[x, y][:3] in SKINS or px[x, y][:3] == OUTLINE
                x += 1
            ns = sum(px[i, y][:3] in SKINS for i in range(s, x))
            if ns >= 3 and x - s <= 16 and n > best[0]:
                best = (n, (s + x - 1) / 2)
        x += 1
    return best


SLASH = (231, 231, 231)  # vệt chém trắng to của Slice: bỏ đi


def dress(fr, view, tag=''):
    w, h = fr.size
    px = fr.load()
    slash = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] and px[x, y][:3] == SLASH}
    for x, y in slash:
        px[x, y] = (0, 0, 0, 0)
    if slash:
        # bỏ cả viền đen của vệt chém: px đen không còn chạm px màu nào (4 hướng)
        def colored(x, y):
            return 0 <= x < w and 0 <= y < h and px[x, y][3] and px[x, y][:3] != OUTLINE
        for _ in range(2):
            kill = [(x, y) for y in range(h) for x in range(w)
                    if px[x, y][3] and px[x, y][:3] == OUTLINE
                    and not any(colored(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
            for x, y in kill:
                px[x, y] = (0, 0, 0, 0)
    # đỉnh đầu: hàng đầu tiên có đoạn da rộng >= 8 kéo dài 4 hàng liền
    top = None
    for y in range(h - 5):
        # cho phép 1 hàng bị cán dụng cụ cắt ngang
        if skin_runs(px, w, y)[0] >= 8 and sum(skin_runs(px, w, y + k)[0] >= 8 for k in range(5)) >= 4:
            top = y
            break
    if top is not None:
        # hàng trên đỉnh đầu cũng thuộc đầu (vòm đầu hẹp hơn)
        while top > 0 and skin_runs(px, w, top - 1)[0] >= 5:
            top -= 1
    sk = [y for y in range(h) for x in range(w) if px[x, y][3] and px[x, y][:3] in SKINS]
    if not sk:
        return fr
    bottom = max(sk)
    # người đứng cao ~30px (đỉnh đầu 18 → chân 47). Nếu dò sai (tay/dụng cụ giơ cao,
    # cán che đầu) thì đặt đỉnh đầu theo chân.
    if top is None or bottom - top > 31 or bottom - top < 12:
        print('   fix top', tag, top, '->', bottom - 29)
        top = bottom - 29
    cs = [skin_runs(px, w, top + k) for k in range(1, 9) if 0 <= top + k < h]
    cs = sorted(c for n, c in cs if 8 <= n <= 14)
    cx = cs[len(cs) // 2] if cs else w / 2

    for y in range(max(0, top), h):
        dy = y - top
        for x in range(w):
            p = px[x, y]
            if not p[3] or p[:3] not in SKINS:
                continue
            dx = x - cx
            m = None
            if dy <= 12:  # đầu
                if HAIR_STYLE == 'bald':
                    m = None
                elif view == 'Up':
                    m = HAIR if dy <= (12 if HAIR_STYLE == 'long' else 11) else None
                elif view == 'Down':
                    m = HAIR if dy <= 4 or (dy <= (12 if HAIR_STYLE == 'long' else 8) and abs(dx) >= 4.5) else None
                else:  # nhìn sang phải: tóc phủ trên + nửa sau đầu
                    m = HAIR if dy <= 4 or (dy <= (12 if HAIR_STYLE == 'long' else 10) and dx <= (0 if HAIR_STYLE == 'long' else -1)) else None
            elif HAIR_STYLE == 'long' and dy <= 15 and ((view == 'Up' and abs(dx) <= 4.5) or (view == 'Side' and dx <= -1)):
                m = HAIR  # tóc dài xoã xuống vai / lưng
            elif dy <= 20:
                # thân + tay áo; bàn tay (hàng 19-20 ở xa tâm) giữ màu da
                if dy >= 19 and abs(dx) > 4.5:
                    m = None
                else:
                    m = SHIRT
            elif abs(dx) <= 4.5 or dy >= 22:
                m = BOOTS if y >= bottom - 1 else PANTS
            if m:
                px[x, y] = m[p[:3]] + (p[3],)
    return fr


def main():
    sheet = Image.new('RGBA', (8 * 64, len(ROWS) * 3 * 64), (0, 0, 0, 0))
    r = 0
    for key, folder, pre in ROWS:
        for d in DIRS:
            name = f'{pre}_{"Top" if (pre == "Pierce" and d == "Up") else d}-Sheet.png'
            im = Image.open(os.path.join(SRC, folder, name)).convert('RGBA')
            idx = list(range(im.width // 64))
            if pre == 'Slice':
                idx.remove(3)  # khung bị vệt chém che gần hết người
            n = len(idx)
            for j, i in enumerate(idx):
                fr = dress(im.crop((i * 64, 0, i * 64 + 64, 64)), d, f'{pre}_{d}#{i}')
                sheet.alpha_composite(fr, (j * 64, r * 64))
            print(f'row {r:2d} {key}_{d.lower():5s} {n} frames')
            r += 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sheet.save(OUT)
    print('->', OUT, sheet.size)


if __name__ == '__main__':
    main()
