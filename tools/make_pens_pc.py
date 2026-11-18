"""Chuồng gà & chuồng gia súc cỡ lớn, cùng kiểu với bản gốc (make_survival.py coop_pen/barn_pen)
mà người chơi thích: chuồng gà sàn gỗ trên chân cao, mái tôn, lưới thép, ổ đẻ có rơm, cầu thang;
chuồng gia súc ván đỏ bạc màu, mái tôn vá, cửa đôi chữ X, gác cỏ khô.

  public/assets/pc/coop.png       80x76
  public/assets/pc/barn.png      112x80
  public/assets/pc/coop_site.png  80x76  công trường khi đang xây
  public/assets/pc/barn_site.png 112x80
Chạy: python3 tools/make_pens_pc.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_furniture import C, rgb  # noqa: E402
from make_props import outline, hline  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'pc')

TIN, TIN_L, TIN_D = rgb('#8e8a80'), rgb('#b8b4a8'), rgb('#5e5a52')
PLANK, PLANK_L, PLANK_D = rgb('#8a6a48'), rgb('#ad8a62'), rgb('#5e4630')
MET = rgb('#c4c9cf')
RUST = rgb('#9a5a32')
SAND, SAND_L = rgb('#c9b17e'), rgb('#e2cf9e')
DARK = rgb('#2a2018')
BARN_R, BARN_RL, BARN_RD = rgb('#8a3a2e'), rgb('#a8503e'), rgb('#5e2820')
TRIM = rgb('#d8c8a8')


def tin_roof(c, x0, x1, y0, rows):
    """Mái tôn sóng: mỗi 3 hàng loe ra 1px, sọc dọc tối, hàng sáng xen kẽ."""
    for i in range(rows):
        k = i // 3
        hline(c, x0 - k, x1 + k, y0 + i, TIN_L if i % 3 == 0 else TIN)
    for x in range(x0 - rows // 3, x1 + rows // 3 + 1, 3):
        for y in range(y0 + 1, y0 + rows):
            if c.px[x, y][3] and c.px[x, y] != TIN_L:
                c.set(x, y, TIN_D)


def coop(site=False):
    c = C(80, 76)
    if site:
        return frame_site(c, PLANK)
    # chân cột
    for x in (8, 38, 68):
        c.rect(x, 52, x + 2, 73, PLANK_D)
    hline(c, 2, 77, 74, DARK)
    # thân chuồng ván dọc
    c.rect(6, 17, 72, 52, PLANK)
    for x in range(9, 72, 5):
        c.rect(x, 17, x, 52, PLANK_D)
    hline(c, 6, 72, 52, PLANK_D)
    # mái tôn (đè lên đỉnh thân)
    tin_roof(c, 10, 68, 3, 16)
    c.rect(46, 7, 56, 10, RUST)  # miếng vá gỉ
    c.rect(18, 10, 24, 12, rgb('#7a8a70'))
    # lưới thép (cửa sổ thông gió)
    c.rect(30, 24, 52, 40, rgb('#3a3028'))
    for x in range(30, 53, 3):
        c.rect(x, 24, x, 40, MET)
    for y in range(24, 41, 3):
        hline(c, 30, 52, y, MET)
    hline(c, 29, 53, 23, PLANK_L)
    # cửa gà (tối) + khung sáng
    c.rect(12, 30, 24, 51, TRIM)
    c.rect(14, 32, 22, 51, DARK)
    for x in range(15, 22, 2):
        c.set(x, 50, SAND_L)
    # ổ đẻ nhô ra bên phải + rơm + quả trứng
    c.rect(58, 28, 77, 46, PLANK_D)
    c.rect(60, 30, 75, 38, PLANK)
    for x in range(60, 76, 2):
        c.set(x, 38, SAND_L)
        c.set(x + 1, 37, SAND)
    c.set(66, 36, rgb('#fff6e6'))
    c.set(67, 36, rgb('#fff6e6'))
    c.set(66, 35, rgb('#fff6e6'))
    hline(c, 58, 77, 28, PLANK_L)
    # cầu thang gà lên cửa
    for i in range(11):
        hline(c, 10 + i, 20 + i, 52 + i * 2, PLANK_L if i % 2 else PLANK)
    # biển tên nhỏ
    c.rect(34, 44, 48, 49, PLANK_L)
    hline(c, 36, 46, 46, PLANK_D)
    return outline(c).im


def barn(site=False):
    c = C(112, 80)
    if site:
        return frame_site(c, BARN_R)
    # thân ván đỏ
    c.rect(6, 26, 105, 77, BARN_R)
    for x in range(9, 105, 4):
        c.rect(x, 26, x, 77, BARN_RD)
    # mái tôn hình thang thấp, vá chỗ gỉ
    for i in range(26):
        half = 16 + int(i * 1.55)
        hline(c, max(1, 56 - half), min(110, 55 + half), 2 + i, TIN if i % 4 else TIN_L)
    for x in range(4, 110, 3):
        for y in range(3, 28):
            if c.px[x, y][3] and c.px[x, y] != TIN_L:
                c.set(x, y, TIN_D)
    c.rect(24, 16, 34, 20, RUST)
    c.rect(72, 10, 80, 13, rgb('#5a6a50'))
    # gác cỏ khô
    c.rect(44, 32, 67, 45, DARK)
    c.rect(45, 38, 66, 45, SAND)
    for x in range(45, 67, 2):
        c.set(x, 38, SAND_L)
    hline(c, 43, 68, 31, TRIM)
    # cửa đôi chữ X
    for x0 in (36, 56):
        c.rect(x0, 52, x0 + 19, 77, rgb('#c9b48a'))
        c.rect(x0 + 2, 54, x0 + 17, 77, rgb('#a8906a'))
        for i in range(24):
            c.set(x0 + 2 + int(i * 15 / 23), 54 + i, TRIM)
            c.set(x0 + 17 - int(i * 15 / 23), 54 + i, TRIM)
    c.rect(55, 52, 56, 77, DARK)
    # cửa sổ chữ X hai bên
    for x0 in (14, 84):
        c.rect(x0, 50, x0 + 13, 61, TRIM)
        c.rect(x0 + 2, 52, x0 + 11, 59, DARK)
        for i in range(8):
            c.set(x0 + 2 + int(i * 9 / 7), 52 + i, TRIM)
            c.set(x0 + 11 - int(i * 9 / 7), 52 + i, TRIM)
    # cỏ mọc chân tường
    for x in range(8, 104, 5):
        c.set(x, 77, rgb('#6aa83c'))
        c.set(x + 1, 76, rgb('#6aa83c'))
    return outline(c).im


def frame_site(c, wall):
    """Công trường: khung cột xà dở dang, đống ván dưới đất, thang chéo."""
    w, h = c.w, c.h
    for x in range(6, w - 6, 16):
        c.rect(x, 20, x + 2, h - 3, PLANK)
    c.rect(6, 20, w - 7, 22, PLANK)
    c.rect(6, 40, w - 7, 41, PLANK_D)
    c.rect(6, h - 14, w // 2 - 2, h - 3, wall)
    for x in range(8, w // 2 - 2, 5):
        c.rect(x, h - 14, x, h - 3, PLANK_D if wall == PLANK else BARN_RD)
    c.rect(w // 2 + 8, h - 7, w // 2 + 26, h - 3, PLANK_L)
    for i in range(26):
        c.set(w - 24 + i // 2, h - 4 - i, PLANK_L)
        c.set(w - 23 + i // 2, h - 4 - i, PLANK_L)
    return outline(c).im


def main():
    os.makedirs(OUT, exist_ok=True)
    coop().save(os.path.join(OUT, 'coop.png'))
    barn().save(os.path.join(OUT, 'barn.png'))
    coop(True).save(os.path.join(OUT, 'coop_site.png'))
    barn(True).save(os.path.join(OUT, 'barn_site.png'))
    print('saved pens ->', OUT)


if __name__ == '__main__':
    main()
