"""Vẽ bộ ô tự nối (autotile) cho địa hình: đường đất, ao/hồ có bờ, sân lát đá.

Mỗi bộ là 256 ô 16x16 (lưới 16x16). Ô số i = cách vẽ một ô địa hình khi 8 ô hàng xóm
có/không cùng loại theo bit của i:
  bit 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW
Phần ngoài địa hình trong suốt → cỏ nền bên dưới lộ ra. Góc lồi bo tròn, góc lõm khuyết tròn.
Màu lấy theo Farmer Pack (đất #90594e, cỏ #6ea533, nước #5479bd).

Tạo public/assets/terrain/{path,water,plaza}.png
Chạy: python3 tools/make_terrain.py
"""
from PIL import Image, ImageDraw, ImageFilter
from statistics import NormalDist
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/terrain')


def rgb(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


T = (0, 0, 0, 0)
OUTLINE = rgb('#403636')
G_DARK, G_LIGHT = rgb('#4a7840'), rgb('#b6bd56')
D0, D1, D2, D3 = rgb('#90594e'), rgb('#7d4c45'), rgb('#a56b55'), rgb('#b78763')
W0, W1, W2, W3 = rgb('#5479bd'), rgb('#4366a6'), rgb('#7f9fd4'), rgb('#b8cae0')
BANK0, BANK1 = rgb('#754d5a'), rgb('#926465')
S0, S1, S2, S3 = rgb('#b9ad9a'), rgb('#a39683'), rgb('#cfc4b1'), rgb('#857a6b')

N, NE, E, SE, S, SW, W, NW = (1 << i for i in range(8))


def h2(x, y, s=0):
    """Nhiễu băm 0..1 cố định theo toạ độ."""
    n = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xffffffff
    n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffff) / 65535


OFFS = ((0, -1, N), (1, -1, NE), (1, 0, E), (1, 1, SE), (0, 1, S), (-1, 1, SW), (-1, 0, W), (-1, -1, NW))
_ND = NormalDist()


def field(mask, sigma):
    """Làm mờ vùng 3x3 ô (48x48 px) rồi lấy ô giữa: mép cong mềm tự nhiên ở cả góc lồi & lõm."""
    im = Image.new('L', (48, 48), 0)
    d = ImageDraw.Draw(im)
    d.rectangle((16, 16, 31, 31), fill=255)
    for dx, dy, b in OFFS:
        if mask & b:
            x0, y0 = 16 + dx * 16, 16 + dy * 16
            d.rectangle((x0, y0, x0 + 15, y0 + 15), fill=255)
    return im.filter(ImageFilter.GaussianBlur(sigma)).load()


def sheet(paint, sigma):
    im = Image.new('RGBA', (256, 256), T)
    px = im.load()
    for m in range(256):
        f = field(m, sigma)
        ox, oy = (m % 16) * 16, (m // 16) * 16
        for y in range(16):
            for x in range(16):
                v = min(max(f[16 + x, 16 + y] / 255, 1e-4), 1 - 1e-4)
                d = sigma * _ND.inv_cdf(v)  # ~ khoảng cách (px) tính từ mép ô; âm = ra ngoài
                gy = f[16 + x, 17 + y] - f[16 + x, 15 + y]
                gx = f[17 + x, 16 + y] - f[15 + x, 16 + y]
                side = None if max(abs(gx), abs(gy)) < 3 else ('n' if gy > 0 else 's') if abs(gy) >= abs(gx) else ('w' if gx > 0 else 'e')
                c = paint(d, side, x, y, m)
                if c:
                    px[ox + x, oy + y] = c
    return im


# ---------- Đường đất: mép cỏ lởm chởm, viền đất sẫm, lốm đốm sỏi ----------
def paint_path(d, side, x, y, m):
    j = h2(x, y, m & 0x55) * 1.4  # mép không thẳng tuột
    if d < 1.2 + j:
        return None
    if d < 2.2 + j:
        return D1
    n = h2(x * 3 + 1, y * 5 + 2)
    if n < 0.05:
        return D3
    if n < 0.09:
        return OUTLINE if n < 0.065 else D2
    if n > 0.93:
        return D1
    return D0


# ---------- Ao/hồ: bờ cỏ, vách đất phía trên, nước sâu dần ----------
def paint_water(d, side, x, y, m):
    if d < 0.6:
        return None
    if d < 1.6:
        return G_DARK  # mép cỏ sẫm
    if d < 2.6:
        return OUTLINE
    if side == 'n' and d < 6:  # vách bờ đất nhìn từ trên xuống
        return BANK1 if d < 4 else BANK0
    nn = 6 if side == 'n' else 2.6
    if d < nn + 1:
        return W3 if h2(x, y, 9) < 0.35 else W2  # bọt / nước nông ven bờ
    if d < nn + 3:
        return W2 if h2(x, y, 5) < 0.25 else W0
    n = h2(x, y, 4)
    if n > 0.988:
        return W3
    return W1 if n < 0.06 else W0


# ---------- Sân lát đá cuội ----------
def cobble(x, y):
    """Ô đá xếp so le 4x4 (trong 16x16): trả về màu viên đá / mạch vữa."""
    row = y // 4
    xx = (x + (2 if row % 2 else 0)) % 16
    cx, cy = xx % 4, y % 4
    if cy == 3 or cx == 3:
        return S3
    k = h2(xx // 4, row, 7)
    if cx == 0 and cy == 0:
        return S2
    return S1 if k < 0.35 else S0


def paint_plaza(d, side, x, y, m):
    if d < 1:
        return None
    if d < 2:
        return OUTLINE
    if d < 3:
        return S3 if side in ('s', 'e') else S2  # bó vỉa
    return cobble(x, y)


# ---------- Đường nhựa nứt (thị trấn bỏ hoang) ----------
A0, A1, A2, A3 = rgb('#55565c'), rgb('#4a4b50'), rgb('#6a6b70'), rgb('#3a3b40')


def paint_road(d, side, x, y, m):
    if d < 0.6:
        return None
    if d < 1.6:
        return OUTLINE
    if d < 3:
        return S2 if side in ('n', 'w') else S1  # mép vỉa hè
    n = h2(x * 7 + 3, y * 3 + 1, 11)
    if n < 0.05:
        return A3
    if n < 0.11:
        return A2
    if n > 0.97:
        return LEAF_CRACK
    return A0 if (x + y) % 5 else A1


LEAF_CRACK = rgb('#5d7a3a')


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet(paint_path, 3).save(os.path.join(OUT, 'path.png'))
    sheet(paint_water, 6).save(os.path.join(OUT, 'water.png'))
    sheet(paint_plaza, 2).save(os.path.join(OUT, 'plaza.png'))
    sheet(paint_road, 2).save(os.path.join(OUT, 'road.png'))
    print('saved terrain sheets ->', OUT)


if __name__ == '__main__':
    main()
