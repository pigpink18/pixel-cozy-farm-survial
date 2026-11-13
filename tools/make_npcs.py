"""Tạo sprite NPC cùng kích thước & tỉ lệ với nhân vật chính (Farmer Pack 32x32).

Lấy 8 hàng đầu của farmer.png (đi bộ + đứng yên × 4 hướng), rồi cho từng NPC:
  - đổi màu áo / quần / giày / mũ
  - bỏ mũ rơm và vẽ tóc (tuỳ chọn), tóc dài cho nữ, búi tóc cho bà
  - trẻ con: rút ngắn thân 3px
Kết quả: public/assets/fp/npc_<id>.png (128 x 256, khung 32x32)

Chạy: python3 tools/make_npcs.py
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/assets/fp/farmer.png')
OUT = os.path.join(ROOT, 'public/assets/fp')
F = 32

# Màu gốc của Farmer Pack
O = (64, 54, 54, 255)        # viền
SHIRT = (200, 103, 82, 255)  # áo (và dây mũ)
SHIRT_D = (144, 89, 78, 255) # bóng áo / giày
SKIN = (251, 192, 143, 255)
SKIN_D = (247, 160, 107, 255)
BLUE = (84, 121, 189, 255)   # quần yếm
BLUE_L = (163, 181, 210, 255)
BLUE_D = (21, 37, 61, 255)
HAT = (236, 172, 83, 255)
HAT_D = (183, 135, 99, 255)
T = (0, 0, 0, 0)

HAT_TOP, HAT_BOTTOM = 3, 10  # hàng chứa mũ (tính từ đỉnh khung, khi không nhún)


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


NPCS = {
    # Bà Lan — bà bán tạp hoá: tóc bạc búi, áo tím, váy đỏ mận
    'lan': dict(hat=None, hair=('#d8d4cc', '#a8a39a'), bun=True, long=False,
                shirt=('#8e6aa0', '#62487a'), pants=('#a8505c', '#d9878a', '#5e2b38'), boots='#5a3e3a'),
    # Chú Tư — thợ mộc: mũ nồi nâu, áo xanh lá, quần yếm nâu
    'tu': dict(hat=('#8a6248', '#5f4232', '#3d3333'), hair=None, bun=False, long=False,
               shirt=('#6f9a4f', '#4a6b3a'), pants=('#94694a', '#c49a6c', '#4f3527'), boots='#3d2a26'),
    # Cô Mai — chủ trại: mũ rơm ruy băng hồng, tóc dài nâu, áo kem, quần yếm xanh lá
    'mai': dict(hat=(None, None, '#e0708a'), hair=('#8a4a32', '#5e2f22'), bun=False, long=True,
                shirt=('#f2dfb0', '#cfb27e'), pants=('#5f9a5a', '#a2cf8e', '#2f5a36'), boots='#6b3f2e'),
    # Bé Tí — cậu bé: tóc đen, áo đỏ tươi, quần xanh đậm, thấp hơn
    'ti': dict(hat=None, hair=('#3a3036', '#241c22'), bun=False, long=False, child=True,
               shirt=('#e25a4a', '#a8392f'), pants=('#3f5f9e', '#7f9bd0', '#1d2c52'), boots='#4a3030'),
    # Bác Sáu — thợ mỏ: mũ bảo hộ vàng viền trắng, áo cam, quần yếm nâu
    'sau': dict(hat=('#ffcf1f', '#d68a12', '#f4f4f4'), hair=None, bun=False, long=False,
                shirt=('#d9783a', '#a8552a'), pants=('#6b5340', '#9c8166', '#3a2c22'), boots='#2e241c'),
    # Anh Ba — dân làng: tóc đen, áo xanh ngọc, quần nâu
    'ba': dict(hat=None, hair=('#2f2a2e', '#1c181b'), bun=False, long=False,
               shirt=('#4f9a9a', '#356b6e'), pants=('#8a6a50', '#b8977a', '#4a3527'), boots='#3d2a26'),
}


def frame(img, col, row):
    return img.crop((col * F, row * F, col * F + F, row * F + F)).convert('RGBA')


def top_row(fr):
    for y in range(F):
        if any(fr.getpixel((x, y))[3] for x in range(F)):
            return y
    return HAT_TOP


def recolor(fr, cfg, dy):
    px = fr.load()
    sh, shd = map(rgb, cfg['shirt'])
    pb, pl, pd = map(rgb, cfg['pants'])
    boots = rgb(cfg['boots'])
    hat = cfg.get('hat')
    for y in range(F):
        for x in range(F):
            c = px[x, y]
            head = y <= HAT_BOTTOM + dy
            feet = y >= 28 + dy
            if head and hat:
                hy, hd, band = hat
                if c == HAT and hy: px[x, y] = rgb(hy)
                elif c == HAT_D and hd: px[x, y] = rgb(hd)
                elif c == SHIRT and band: px[x, y] = rgb(band)
                continue
            if head:
                continue
            if c == SHIRT: px[x, y] = sh
            elif c == SHIRT_D: px[x, y] = boots if feet else shd
            elif c == BLUE: px[x, y] = pb
            elif c == BLUE_L: px[x, y] = pl
            elif c == BLUE_D: px[x, y] = pd


def head_cols(fr, dy):
    """Cột trái/phải của đầu, lấy theo vùng mặt (hàng 11–13)."""
    xs = []
    for y in range(HAT_BOTTOM + 1 + dy, HAT_BOTTOM + 4 + dy):
        for x in range(F):
            if fr.getpixel((x, y)) in (SKIN, SKIN_D):
                xs.append(x)
    if not xs:
        return 11, 20
    return min(xs) - 1, max(xs) + 1


def draw_hair(fr, cfg, view, dy):
    px = fr.load()
    hl, hd = map(rgb, cfg['hair'])
    x0, x1 = head_cols(fr, dy)
    if view in ('left', 'right'):  # nhìn ngang: đầu rộng ~10px
        cx = (x0 + x1) / 2
        x0, x1 = int(cx - 4.5), int(cx + 5.5)
    else:
        x0, x1 = max(x0, 10), min(x1, 21)
    top = HAT_TOP + 2 + dy  # tóc thấp hơn đỉnh mũ 2px
    # Xoá mũ
    for y in range(0, HAT_BOTTOM + 1 + dy):
        for x in range(F):
            px[x, y] = T
    # Viền vành mũ ở hàng mặt đầu tiên → tóc / da
    fy = HAT_BOTTOM + 1 + dy
    for x in range(F):
        c = px[x, fy]
        if c == HAT_D:
            px[x, fy] = hd
    mask = set()
    bottom = HAT_BOTTOM + dy
    for y in range(top, bottom + 1):
        k = max(0, 2 - (y - top))  # bo tròn đỉnh đầu
        for x in range(x0 + k, x1 - k + 1):
            mask.add((x, y))
    # Gáy (nhìn sau) và phía sau đầu (nhìn ngang) phủ tóc tới hàng mặt
    extra = []
    if view == 'up':
        for y in range(fy, fy + 2):
            for x in range(x0, x1 + 1):
                extra.append((x, y))
    elif view == 'left':
        for y in range(fy, fy + 2):
            for x in range(x1 - 3, x1 + 1):
                extra.append((x, y))
    elif view == 'right':
        for y in range(fy, fy + 2):
            for x in range(x0, x0 + 4):
                extra.append((x, y))
    if cfg.get('long'):
        side = {'down': [(x0, x0 + 1), (x1 - 1, x1)], 'up': [(x0, x1)], 'left': [(x1 - 3, x1)], 'right': [(x0, x0 + 3)]}[view]
        for a, b in side:
            for y in range(fy, fy + 5):
                for x in range(a, b + 1):
                    extra.append((x, y))
    for p in extra:
        mask.add(p)
    if cfg.get('bun'):
        bx = {'down': (x0 + x1) // 2, 'up': (x0 + x1) // 2, 'left': x1 - 1, 'right': x0 + 1}[view]
        for y in range(top - 3, top + 1):
            for x in range(bx - 2, bx + 2):
                if not ((y == top - 3) and x in (bx - 2, bx + 1)):
                    mask.add((x, y))
    # Tô tóc (sáng ở trên-trái, tối ở dưới-phải) + viền
    for (x, y) in mask:
        if 0 <= x < F and 0 <= y < F:
            px[x, y] = hl if (y - top) + (x - x0) * 0.3 < 4 else hd
    for (x, y) in mask:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in mask and 0 <= nx < F and 0 <= ny < F and px[nx, ny][3] == 0:
                px[nx, ny] = O
    # Mái tóc trước trán khi nhìn thẳng
    if view == 'down':
        for x in range(x0 + 1, x1):
            if (x, bottom) in mask:
                px[x, bottom] = hd


def long_hair_under_hat(fr, cfg, view, dy):
    """Giữ mũ, thêm tóc dài xoã xuống vai (ngay dưới vành mũ)."""
    px = fr.load()
    hl, hd = map(rgb, cfg['hair'])
    x0, x1 = head_cols(fr, dy)
    fy = HAT_BOTTOM + 1 + dy
    if view == 'down':
        cols = [x0, x0 + 1, x1 - 1, x1]
    elif view == 'up':
        cols = list(range(x0, x1 + 1))
    elif view == 'left':
        cols = list(range(x1 - 3, x1 + 1))
    else:
        cols = list(range(x0, x0 + 4))
    mask = {(x, y) for x in cols for y in range(fy, fy + 5)}
    for (x, y) in mask:
        px[x, y] = hl if y < fy + 2 else hd
    for (x, y) in mask:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1)):
            if (nx, ny) not in mask and 0 <= nx < F and 0 <= ny < F and px[nx, ny][3] == 0:
                px[nx, ny] = O


def shorten(fr, rows):
    """Bỏ vài hàng (thân/chân) để nhân vật thấp hơn, giữ chân chạm đáy khung."""
    out = Image.new('RGBA', (F, F), T)
    keep = [y for y in range(F) if y not in rows]
    for i, y in enumerate(reversed(keep)):
        out.paste(fr.crop((0, y, F, y + 1)), (0, F - 1 - i))
    return out


def main():
    src = Image.open(SRC).convert('RGBA')
    views = ['down', 'up', 'left', 'right']
    for npc, cfg in NPCS.items():
        sheet = Image.new('RGBA', (F * 4, F * 8), T)
        for row in range(8):
            view = views[row % 4]
            for col in range(4):
                fr = frame(src, col, row)
                dy = top_row(fr) - HAT_TOP
                recolor(fr, cfg, dy)
                if cfg.get('hair') and cfg.get('hat'):
                    long_hair_under_hat(fr, cfg, view, dy)
                elif cfg.get('hair'):
                    draw_hair(fr, cfg, view, dy)
                if cfg.get('child'):
                    fr = shorten(fr, {19 + dy, 20 + dy, 25 + dy})
                sheet.paste(fr, (col * F, row * F))
        path = os.path.join(OUT, f'npc_{npc}.png')
        sheet.save(path)
        # Chân dung cho hộp thoại: phần đầu + vai của khung đứng nhìn thẳng
        idle = sheet.crop((0, 4 * F, F, 5 * F))
        top = top_row(idle)
        idle.crop((5, max(0, top - 1), 27, max(0, top - 1) + 22)).save(os.path.join(OUT, f'npc_{npc}_face.png'))
        print('saved', path)


if __name__ == '__main__':
    main()
