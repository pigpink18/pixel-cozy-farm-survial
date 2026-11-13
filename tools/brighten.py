"""Làm màu tươi sáng hơn (cỏ xanh lá ngả vàng, nước xanh trong, gỗ ấm), giữ nguyên màu viền tối.
Dùng: python3 tools/brighten.py <thư mục hoặc file PNG> ...   (ghi đè tại chỗ)
Thứ tự đầy đủ: build_farmer_pack.py → palettize.py → brighten.py
"""
import colorsys, glob, os, sys
from PIL import Image

LIFT = 0.12      # nâng độ sáng chung
SAT = 1.15       # tăng độ tươi chung
GREEN_SHIFT = 0.03  # xanh lá ngả vàng (kiểu Stardew)
GREEN_SAT = 1.08
GREEN_LIGHT = 1.08
BLUE_SAT = 1.35  # nước trong hơn
BLUE_LIGHT = 1.25


def adjust(c):
    r, g, b = (x / 255 for x in c)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.24:  # màu viền: chỉ sáng nhẹ để hình vẫn sắc nét
        return tuple(min(255, round(v * 1.05)) for v in c)
    l2 = l + (1 - l) * LIFT
    s2 = min(1, s * SAT)
    if 0.18 < h < 0.45:
        h -= GREEN_SHIFT
        s2 = min(1, s2 * GREEN_SAT)
        l2 = min(0.8, l2 * GREEN_LIGHT)
    if 0.5 < h < 0.72:
        s2 = min(1, s2 * BLUE_SAT)
        l2 = min(0.8, l2 * BLUE_LIGHT)
    r, g, b = colorsys.hls_to_rgb(h % 1, l2, s2)
    return (round(r * 255), round(g * 255), round(b * 255))


cache = {}
files = []
for arg in sys.argv[1:]:
    files += glob.glob(os.path.join(arg, '**', '*.png'), recursive=True) if os.path.isdir(arg) else [arg]
for f in files:
    im = Image.open(f).convert('RGBA')
    px = im.load()
    for x in range(im.width):
        for y in range(im.height):
            r, g, b, a = px[x, y]
            if a:
                c = (r, g, b)
                if c not in cache:
                    cache[c] = adjust(c)
                px[x, y] = cache[c] + (a,)
    im.save(f)
print(f'Đã làm tươi màu {len(files)} ảnh')
