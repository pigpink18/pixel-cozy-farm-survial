"""Thu nhỏ công trình từ Gr8FarmPack thành pixel art cho game (kho, nhà máy, sạp).
Dùng: python3 tools/make_buildings.py <thư mục Gr8FarmPack> → public/assets/gr8/*.png
"""
import os, sys
from PIL import Image

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'gr8')
os.makedirs(OUT, exist_ok=True)
# tên file gốc → (tên mới, rộng tối đa, cao tối đa)
TARGETS = {
    'Silo': ('silo', 28, 70), 'Barn2': ('warehouse', 64, 62), 'Windmill': ('mill', 40, 66),
    'Shed': ('bakery', 56, 52), 'Barn1': ('dairy', 52, 54), 'Stall_v3': ('juicer', 36, 48),
    'Stall_v1': ('stand', 40, 52),
}
for src, (name, w, h) in TARGETS.items():
    im = Image.open(os.path.join(SRC, src + '.png')).convert('RGBA')
    im = im.crop(im.getbbox())
    k = min(w / im.width, h / im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    alpha = im.getchannel('A').point(lambda a: 255 if a > 110 else 0)
    rgb = im.convert('RGB').quantize(colors=28, method=Image.Quantize.MEDIANCUT).convert('RGB')
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    out.save(os.path.join(OUT, name + '.png'))
open(os.path.join(OUT, 'NOTE.txt'), 'w').write('Thu nhỏ từ GAME/farm/Gr8FarmPack bằng tools/make_buildings.py\n')
print('ok')
