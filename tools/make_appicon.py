"""Icon ứng dụng pixel (iPhone "Thêm vào MH chính" + favicon): bầu trời tro tàn,
trăng, đường chân trời cháy đỏ, nông dân. Vẽ 64x64 rồi phóng to nearest (giữ nét pixel).
Chạy: python3 tools/make_appicon.py → public/icon-180.png, icon-512.png, favicon.png
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 64
SKY = ['#141012', '#1d1418', '#26181f', '#321b24', '#43202a', '#5a2629', '#7a3426', '#a04a28']


def hexc(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def main():
    im = Image.new('RGBA', (N, N))
    px = im.load()
    for y in range(N):  # dải trời: tối ở trên, đỏ than ở chân trời
        band = min(len(SKY) - 1, max(0, (y - 6) // 6))
        for x in range(N):
            px[x, y] = hexc(SKY[band])
    for x, y in ((6, 6), (20, 4), (33, 9), (57, 14), (12, 18), (45, 3)):  # sao / tro bay
        px[x, y] = hexc('#8a7f78')
    for y in range(N):  # trăng lưỡi liềm
        for x in range(N):
            if (x - 50) ** 2 + (y - 12) ** 2 <= 36 and (x - 53) ** 2 + (y - 10) ** 2 > 25:
                px[x, y] = hexc('#e8e2c0')
    for x in range(N):  # đồi đen + hàng rào gãy ở chân trời
        h = 50 + (2 if (x // 9) % 2 else 0)
        for y in range(h, N):
            px[x, y] = hexc('#141012' if y > h else '#2a1c1e')
        if x % 7 == 0 and x not in (28, 35):
            for y in range(h - 5, h):
                px[x, y] = hexc('#2a1c1e')
    face = Image.open(os.path.join(ROOT, 'public/assets/fp/portrait.png')).convert('RGBA').crop((5, 10, 59, 64))
    im.alpha_composite(face, (5, 10))
    for size, name in ((180, 'icon-180.png'), (512, 'icon-512.png'), (64, 'favicon.png')):
        im.resize((size, size), Image.NEAREST).convert('RGB').save(os.path.join(ROOT, 'public', name))
    print('ok')


if __name__ == '__main__':
    main()
