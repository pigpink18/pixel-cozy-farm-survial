"""Bãi phế liệu, đống quặng phế liệu & ổ zombie dựng từ PostApocalypse Asset Pack (TheLazyStone —
miễn phí phi thương mại, thương mại trả >= 2 USD, không phát lại nguyên bộ). Giữ đúng tỉ lệ gốc (ô 16px).

Xuất:
  public/assets/pa/pa.png + pa.json   atlas đồ trang trí bãi phế liệu (xe gỉ, container, thùng phuy, lốp,
                                       đống rác ghép ô, nền đất / nhựa đường...)
  public/assets/cave/ore_copper.png   đống dây đồng (cuộn cáp)       — dùng chung bãi phế liệu & hầm
  public/assets/cave/ore_iron.png     đống thép vụn (tấm tôn + dầm sắt)
  public/assets/cave/ore_gold.png     đống bo mạch (máy lạnh hỏng + bo mạch vàng)
  public/assets/cave/rubble.png       bê tông vỡ (gạch vụn)
  public/assets/quarry/boulder.png    đống sắt vụn lớn (xác xe ép)
  public/assets/quarry/geode.png      hộp khoá quân dụng (thùng đạn)
  public/assets/surv/nest0/1.png      ổ zombie: đống rác thối, túi thịt phập phồng, nhớt xanh phát sáng
Chạy: python3 tools/make_pa_props.py
"""
import glob
import json
import os
import random
from PIL import Image, ImageDraw, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PA = os.path.join(ROOT, 'PostApocalypse_AssetPack_v1.1.2')
OB = os.path.join(PA, 'Objects')
OUT = os.path.join(ROOT, 'public', 'assets')


def im(p):
    return Image.open(os.path.join(PA, p) if not os.path.isabs(p) else p).convert('RGBA')


def ob(p):
    return im(os.path.join(OB, p))


def crop(img):
    return img.crop(img.getbbox())


def recolor(img, fn):
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = fn(r, g, b) + (a,)
    return out


def canvas(w, h):
    return Image.new('RGBA', (w, h))


# ---------------- đống quặng phế liệu (16-24px, chân sát đáy) ----------------
def node_rubble():
    return crop(ob('Gray-brick_Debris.png'))


def node_copper():
    """Cuộn cáp đồng: nắp cống tròn tô màu đồng + đầu dây thò ra."""
    lum = lambda r, g, b: (r * 3 + g * 5 + b * 2) / 10  # noqa: E731
    coil = recolor(ob('Manhole.png'), lambda r, g, b: (min(255, int(lum(r, g, b) * 1.35 + 40)), int(lum(r, g, b) * 0.85 + 10), int(lum(r, g, b) * 0.45)))
    c = canvas(20, 18)
    c.alpha_composite(crop(ob('Cardboard_2.png')), (8, 8))
    c.alpha_composite(coil, (1, 1))
    d = ImageDraw.Draw(c)
    for (x0, y0, x1, y1) in ((15, 5, 19, 2), (16, 8, 19, 9)):
        d.line([(x0, y0), (x1, y1)], fill=(214, 128, 60, 255))
    return crop(c)


def node_iron():
    c = canvas(24, 20)
    c.alpha_composite(crop(ob('Metal-Plates.png')), (0, 2))
    beam = crop(ob('Iron-beam.png'))
    c.alpha_composite(beam, (6, 0))
    c.alpha_composite(crop(ob('Exhaust-pipe.png')).rotate(90, expand=True), (17, 6))
    return crop(c)


def node_gold():
    """Đống đồ điện tử: máy lạnh hỏng + quạt thông gió + bo mạch xanh lấm tấm vàng."""
    c = canvas(20, 20)
    c.alpha_composite(crop(ob('Buildings/HVAC.png')), (2, 7))
    c.alpha_composite(crop(ob('Buildings/Air-vent_2_rusty.png')), (6, 2))
    d = ImageDraw.Draw(c)
    d.rectangle([0, 12, 7, 17], fill=(46, 104, 62, 255), outline=(24, 52, 34, 255))
    for x, y in ((2, 14), (4, 15), (5, 13)):
        d.point((x, y), fill=(250, 210, 80, 255))
    d.rectangle([13, 15, 19, 19], fill=(46, 104, 62, 255), outline=(24, 52, 34, 255))
    d.point((15, 17), fill=(250, 210, 80, 255))
    d.point((17, 16), fill=(250, 210, 80, 255))
    return crop(c)


def node_boulder():
    return crop(ob('Vehicles/Rust/Car_6_Rust_Scrap/Car_6_Rust_Orange_Scrap.png'))


def node_geode():
    c = canvas(14, 12)
    c.alpha_composite(crop(ob('Pickable/Ammo-crate_Green.png')), (0, 4))
    c.alpha_composite(crop(ob('Pickable/Ammo-crate_Red.png')), (4, 0))
    return crop(c)


# ---------------- ổ zombie ----------------
GARB = None


def garbage():
    global GARB
    if GARB is None:
        GARB = im('Tiles/Garbage_TileSet.png')
    return GARB


def nest(fr):
    pile = garbage().crop((80, 0, 128, 48))  # đống rác 3x3 ô
    # nhuộm thâm tím như thịt thối
    pile = recolor(pile, lambda r, g, b: (int(r * 0.72 + 12), int(g * 0.56), int(b * 0.62 + 4)))  # thâm tím, thối rữa
    c = canvas(52, 50)
    d = ImageDraw.Draw(c)
    # vũng nhớt xanh dưới chân
    d.ellipse([2, 37, 50, 49], fill=(52, 92, 30, 200))
    d.ellipse([8, 40, 44, 47], fill=(96, 168, 48, 150 if fr else 110))
    c.alpha_composite(pile, (2, 0))
    # túi thịt phập phồng (khung 1 to hơn)
    rnd = random.Random(5)
    sacs = [(14, 14, 6), (31, 10, 5), (24, 22, 7), (38, 22, 4), (11, 26, 4)]
    for x, y, r in sacs:
        r2 = r + (1 if fr else 0)
        d.ellipse([x - r2, y - r2, x + r2, y + r2], fill=(118, 30, 36, 255), outline=(52, 12, 18, 255))
        d.ellipse([x - r2 + 2, y - r2 + 1, x, y - 1], fill=(176, 64, 64, 255))
        d.point((x - r2 + 2, y - r2 + 2), fill=(236, 150, 140, 255))
        # mạch máu
        for _ in range(2):
            a = rnd.choice([(-1, 1), (1, 1), (1, 0), (-1, 0)])
            d.line([(x + a[0] * r2, y + a[1] * r2 // 2), (x + a[0] * (r2 + 3), y + a[1] * (r2 // 2 + 2))], fill=(90, 20, 26, 255))
    # đốm nhớt xanh phát sáng
    for x, y in ((20, 6), (36, 30), (7, 18), (44, 14), (27, 33)):
        col = (170, 240, 90, 255) if fr else (128, 200, 70, 255)
        d.rectangle([x, y, x + 1, y + 1], fill=col)
    # xương
    d.line([(30, 34), (36, 32)], fill=(222, 214, 190, 255), width=1)
    d.point((29, 34), fill=(222, 214, 190, 255))
    d.point((37, 31), fill=(222, 214, 190, 255))
    return c


# ---------------- atlas trang trí bãi phế liệu ----------------
def tile(img, x, y):
    return img.crop((x * 16, y * 16, x * 16 + 16, y * 16 + 16))


def props():
    P = {}
    rust = 'Vehicles/Rust'
    for col in ('Blue', 'Red', 'Green', 'Orange'):
        P[f'car_{col.lower()}'] = ob(f'{rust}/Car_4_Rust/Car_4_Rust_{col}.png')
        P[f'scrap_{col.lower()}'] = ob(f'{rust}/Car_6_Rust_Scrap/Car_6_Rust_{col}_Scrap.png')
    for col in ('Blue', 'Red', 'Green', 'Yellow'):
        P[f'carv_{col.lower()}'] = ob(f'{rust}/Car_1_Rust/Car_1_Rust_{col}.png')
    P['vending_blue'] = ob('Vending-machine_Blue_Overgrown_Bleak-Yellow.png')
    P['stop_sign'] = ob('Stop-sign_Down_2_Overgrown_Bleak-Yellow.png')
    P['street_light'] = ob('Street-Light_5_Up_Overgrown_Bleak-Yellow.png')
    P['van_blue'] = ob(f'{rust}/Car_3_Rust_Van/Car_3_Rust_Blue_Van.png')
    P['van_green'] = ob(f'{rust}/Car_3_Rust_Van/Car_3_Rust_Light-Green_Van.png')
    P['flip_blue'] = ob(f'{rust}/Car_2_Rust_Upsidedown/Car_2_Rust_Blue_Upsidedown.png')
    P['flip_orange'] = ob(f'{rust}/Car_2_Rust_Upsidedown/Car_2_Rust_Orange_Upsidedown.png')
    P['truck'] = ob(f'{rust}/Car_7_Rust_Truck/Car_7_Rust_Yellow_Truck_.png')
    P['bus'] = ob(f'{rust}/Car_8_Rust_Bus/Car_8_Rust_Yellow_Bus.png')
    P['tractor'] = im(glob.glob(os.path.join(OB, rust, 'Car_5_Rust_Tractor', '*.png'))[0])
    for f in sorted(glob.glob(os.path.join(OB, 'Container', '*.png'))):
        n = os.path.basename(f)[:-4].replace('Container_', 'cont_').replace('Overgrown_', 'og_').lower()
        P[n] = im(f)
    for n in ('Barrel_rust_red_1', 'Barrel_rust_red_2', 'Barrel_rust_blue_1', 'Barrel_rust_blue_2', 'Tire_1', '2-Tires_Grass_Bleak-Yellow',
              'Tire_2_Grass_Bleak-Yellow', 'Pallet_1', 'Pallet_2', 'Refrigerator', 'Washing-machine', 'Shopping-cart', 'Trash-bag_1',
              'Trash-bag_2', 'Cardboard_1', 'Cardboard_2', 'Metal-Plates', 'Gray-brick', 'Gray-brick_Debris', 'Traffic-cone',
              'Garbage-Bin_1', 'Garbage-Bin_3', 'Vending-machine_Red', 'Iron-beam'):
        P[n.lower().replace('-', '_')] = ob(f'{n}.png')
    P['wall_broken'] = ob('Buildings/Destroyed-wall_not-corner.png')
    P['hvac'] = ob('Buildings/HVAC.png')
    P['stump_mush'] = ob('Nature/Flowers_Mashrooms_Other-nature-stuff/Stump_2_Mushrooms.png')
    for i in (1, 2, 3, 4, 5, 6, 7):
        P[f'rock{i}'] = ob(f'Nature/Flowers_Mashrooms_Other-nature-stuff/Rocks/Rock_{i}.png')
    for k in list(P):
        P[k] = crop(P[k])
    # đống rác: ghép ô 16px — 3x3 (góc, cạnh, giữa) + 6 ô giữa đa dạng
    g = garbage()
    for name, (x, y) in {'g_tl': (5, 0), 'g_t': (6, 0), 'g_tr': (7, 0), 'g_l': (5, 1), 'g_c': (6, 1), 'g_r': (7, 1),
                         'g_bl': (5, 2), 'g_b': (6, 2), 'g_br': (7, 2)}.items():
        P[name] = tile(g, x, y)
    for i, (x, y) in enumerate(((1, 1), (2, 1), (3, 1), (1, 2), (2, 2), (3, 2), (2, 0), (1, 3))):
        P[f'g_c{i}'] = tile(g, x, y)
    P['junk_big'] = g.crop((0, 0, 80, 64))
    P['junk_small'] = g.crop((80, 0, 128, 48))
    # nền: đất bạc màu & nhựa đường nứt
    bg = im('Tiles/Background_Bleak-Yellow_TileSet.png')
    for i, (tx, ty) in enumerate(((0, 0), (2, 0), (0, 1), (2, 1), (0, 2), (2, 2), (3, 0), (4, 2))):  # 6 ô đất trơn + 2 ô có sỏi/rác
        P[f'dirt{i}'] = tile(bg, tx, ty)
    for i, (tx, ty) in enumerate(((5, 7), (5, 8), (1, 11))):
        P[f'asphalt{i}'] = tile(bg, tx, ty)
    return P


def pack(P, path):
    items = sorted(P.items(), key=lambda kv: -kv[1].height)
    W = 512
    x = y = 0
    rowh = 0
    pos = {}
    for k, img in items:
        if x + img.width > W:
            x, y, rowh = 0, y + rowh + 1, 0
        pos[k] = (x, y)
        x += img.width + 1
        rowh = max(rowh, img.height)
    H = y + rowh
    sheet = Image.new('RGBA', (W, H))
    frames = {}
    for k, img in items:
        sheet.alpha_composite(img, pos[k])
        frames[k] = {'frame': {'x': pos[k][0], 'y': pos[k][1], 'w': img.width, 'h': img.height}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': img.width, 'h': img.height}, 'sourceSize': {'w': img.width, 'h': img.height}}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sheet.save(path + '.png')
    json.dump({'frames': frames, 'meta': {'image': os.path.basename(path) + '.png', 'size': {'w': W, 'h': H}, 'scale': '1'}}, open(path + '.json', 'w'))
    print('atlas', len(frames), 'frames', W, 'x', H)


def main():
    for rel, fn in (('cave/ore_copper', node_copper), ('cave/ore_iron', node_iron), ('cave/ore_gold', node_gold), ('cave/rubble', node_rubble),
                    ('quarry/boulder', node_boulder), ('quarry/geode', node_geode)):
        img = fn()
        img.save(os.path.join(OUT, rel + '.png'))
        print(rel, img.size)
    for fr in (0, 1):
        nest(fr).save(os.path.join(OUT, 'surv', f'nest_pa{fr}.png'))
    pack(props(), os.path.join(OUT, 'pa', 'pa'))


if __name__ == '__main__':
    main()
