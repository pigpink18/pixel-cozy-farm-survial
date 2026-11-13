"""Chuyển màu ảnh sang đúng bảng màu của Farmer Pack (30 màu) để mọi asset đồng bộ.
Dùng: python3 tools/palettize.py <thư mục hoặc file PNG> ...   (ghi đè tại chỗ)
Bảng màu lấy từ public/assets/fp/*.png. Màu được so khớp theo không gian CIELAB.
"""
import glob, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = os.path.join(ROOT, 'public', 'assets', 'fp')


def lab(c):
    def lin(u):
        u /= 255
        return ((u + 0.055) / 1.055) ** 2.4 if u > 0.04045 else u / 12.92
    r, g, b = (lin(x) for x in c)
    X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    Y = r * 0.2126 + g * 0.7152 + b * 0.0722
    Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return (116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z)))


palette = set()
for f in glob.glob(os.path.join(FP, '*.png')):
    for r, g, b, a in Image.open(f).convert('RGBA').getdata():
        if a:
            palette.add((r, g, b))
PAL = [(c, lab(c)) for c in palette]
cache = {}


def nearest(c):
    if c not in cache:
        l = lab(c)
        cache[c] = min(PAL, key=lambda p: sum((p[1][i] - l[i]) ** 2 for i in range(3)))[0]
    return cache[c]


def convert(path):
    im = Image.open(path)
    if im.mode == 'P' or im.mode != 'RGBA':
        im = im.convert('RGBA')
    px = im.load()
    for x in range(im.width):
        for y in range(im.height):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = nearest((r, g, b)) + (a,)
    im.save(path)


files = []
for arg in sys.argv[1:]:
    files += glob.glob(os.path.join(arg, '**', '*.png'), recursive=True) if os.path.isdir(arg) else [arg]
for f in files:
    convert(f)
print(f'Đã chuyển màu {len(files)} ảnh theo bảng {len(PAL)} màu')
