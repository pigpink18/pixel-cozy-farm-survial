"""Icon vật phẩm 16x16 theo phong cách Pixel Crawler (viền đen dày, đổ bóng 3 tông, màu trầm).

Vẽ bằng "vật liệu": mỗi điểm ảnh mang 1 vật liệu (gỗ, sắt, đỏ...). Khi xuất, mỗi vật liệu tự đổ
bóng: cạnh trên-trái sáng, cạnh dưới-phải tối, giữa tông vừa; rồi bao viền tối 1px.

Xuất atlas Phaser: public/assets/icons/icons.png + icons.json (frame = tên icon).
Chạy: python3 tools/make_icons.py
"""
import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'icons')

OUTLINE = (27, 20, 22, 255)


def h(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


# vật liệu: (sáng, vừa, tối)
MAT = {
    'wood': (h('c8925a'), h('9a6438'), h('6a4026')),
    'dwood': (h('8a5a3a'), h('66402a'), h('46281c')),
    'metal': (h('eef3f5'), h('b8c2c9'), h('7d8a94')),
    'dmetal': (h('8e9aa3'), h('5f6b74'), h('3d464e')),
    'gun': (h('6f767c'), h('4a5056'), h('2e3236')),
    'brass': (h('f2d27a'), h('d0a443'), h('97702a')),
    'red': (h('e0705a'), h('b8453a'), h('7c2a26')),
    'green': (h('9cbf62'), h('6f9440'), h('4a682c')),
    'olive': (h('a3a067'), h('7b7a48'), h('545432')),
    'blue': (h('8cc8ec'), h('4a90c8'), h('2e5e90')),
    'glass': (h('cfeef0'), h('8fcfd6'), h('5a9aa6')),
    'cloth': (h('f3ead8'), h('d8cab0'), h('a8977a')),
    'white': (h('ffffff'), h('e6e6e6'), h('b8b8b8')),
    'stone': (h('b9b4ac'), h('8d877e'), h('625d56')),
    'orange': (h('f5a64a'), h('d9772c'), h('9c4e1c')),
    'yellow': (h('ffe08a'), h('f2bd3c'), h('b98422')),
    'flame': (h('fff2a8'), h('ffb43c'), h('e0602a')),
    'meat': (h('c87a8a'), h('9a4a5a'), h('6a2c3a')),
    'purple': (h('b48ad6'), h('8458b0'), h('583a7c')),
    'black': (h('4a4a52'), h('2e2e34'), h('1e1e22')),
    'chip': (h('6fd48a'), h('3f9a5c'), h('2a6a40')),
    'soil': (h('9a7a52'), h('74583a'), h('503c28')),
    'rust': (h('b8764a'), h('8a5234'), h('5e3624')),
    'copper': (h('f0a070'), h('c8703e'), h('8a4826')),
    'gold': (h('fff0a0'), h('f0c040'), h('b08020')),
    'iron': (h('d0d6dc'), h('9aa4ae'), h('66707a')),
    'gemg': (h('9af0b0'), h('3cc070'), h('1e7a44')),
    'gemp': (h('e0b0ff'), h('a060e0'), h('6a34a0')),
    'gemy': (h('fff2a0'), h('f0c830'), h('b08a18')),
    'gemr': (h('ff9a9a'), h('e04848'), h('962626')),
    'ice': (h('e8f8ff'), h('a8d8f0'), h('6aa0c8')),
    'leaf': (h('a8d870'), h('6aa83c'), h('3e7024')),
    'pink': (h('ffc0d8'), h('f080a8'), h('b04a74')),
    'egg': (h('fffaf0'), h('eadcc4'), h('bca88a')),
    'hay': (h('f0d880'), h('d0b050'), h('987c30')),
    'tomato': (h('ff8a6a'), h('e0402c'), h('9a2418')),
    'melon': (h('8ad070'), h('3e9a3c'), h('246a26')),
    'pumpkin': (h('ffb860'), h('f08a2a'), h('b05a14')),
    'corn': (h('fff090'), h('f2cc40'), h('b8901c')),
    'eggpl': (h('b88ad8'), h('6a3c9a'), h('42245e')),
    'bean': (h('b8e080'), h('78b040'), h('4a7a28')),
    'paper': (h('f6ecd4'), h('e0cca4'), h('b09a70')),
    'mulb': (h('b85a9a'), h('6a2458'), h('3a1430')),
    'blueb': (h('9ab8ff'), h('3a54a8'), h('24346e')),
    'rose': (h('ff8a8a'), h('d83a4a'), h('8a1c2a')),
    'lav': (h('d8b8ff'), h('a070e0'), h('6a3ca8')),
    'tan': (h('e8d4b0'), h('c4a478'), h('8a6a48')),
    'oyster': (h('e8e0d0'), h('b8ac98'), h('807460')),
    'glow': (h('d0ffb0'), h('7ae050'), h('3a9a2c')),
    'soupb': (h('e8c890'), h('c49858'), h('8a6430')),
}


class Icon:
    def __init__(self):
        self.m = [[None] * 16 for _ in range(16)]
        self.fix = {}  # điểm tô cứng (màu cụ thể, không đổ bóng)

    def px(self, x, y, mat):
        if 0 <= x < 16 and 0 <= y < 16:
            self.m[y][x] = mat
            self.fix.pop((x, y), None)

    def dot(self, x, y, color):
        """Điểm nhấn màu cố định (đè lên vật liệu, giữ nguyên khi đổ bóng)."""
        if self.m[y][x] is None:
            self.m[y][x] = 'fix'
        self.fix[(x, y)] = h(color) if isinstance(color, str) else color

    def rect(self, x0, y0, x1, y1, mat):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, mat)

    def line(self, x0, y0, x1, y1, mat, w=1):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            for k in range(w):
                # độ dày: dời theo trục vuông góc chính
                if abs(x1 - x0) >= abs(y1 - y0) if False else True:
                    self.px(x0 + k, y0, mat)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def rows(self, x0, y0, art, legend):
        """Vẽ theo chuỗi: mỗi ký tự = 1 vật liệu theo legend, '.' = bỏ qua."""
        for j, row in enumerate(art):
            for i, ch in enumerate(row):
                if ch in legend:
                    v = legend[ch]
                    if v.startswith('#'):
                        self.dot(x0 + i, y0 + j, v)
                    else:
                        self.px(x0 + i, y0 + j, v)

    def render(self):
        im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        p = im.load()
        m = self.m
        get = lambda x, y: m[y][x] if 0 <= x < 16 and 0 <= y < 16 else None  # noqa: E731
        for y in range(16):
            for x in range(16):
                mat = m[y][x]
                if mat is None:
                    continue
                if (x, y) in self.fix:
                    p[x, y] = self.fix[(x, y)]
                    continue
                hi, mid, lo = MAT[mat]
                tl = get(x - 1, y) != mat or get(x, y - 1) != mat
                br = get(x + 1, y) != mat or get(x, y + 1) != mat
                p[x, y] = lo if br and not tl else hi if tl and not br else mid
        # viền tối 4 hướng
        for y in range(16):
            for x in range(16):
                if m[y][x] is None and any(get(x + a, y + b) is not None for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    p[x, y] = OUTLINE
        return im


def diag(ic, x0, y0, n, mat, w=2):
    """Cán chéo từ (x0,y0) đi lên-phải n bước, dày w (theo đường chéo)."""
    for i in range(n):
        for k in range(w):
            ic.px(x0 + i + k, y0 - i, mat)


ICONS = {}


def icon(fn):
    ICONS[fn.__name__] = fn
    return fn


# ---------------- Công cụ ----------------
@icon
def tool_hoe(ic):
    diag(ic, 2, 14, 10, 'wood')
    # đầu cuốc nằm ngang, lưỡi chúc xuống ở đầu trái (hình chữ ⌐)
    ic.rows(4, 1, [
        '..dmmmmmmmm',
        '.mmmmmmmmmd',
        'mmmd.......',
        'mmd........',
        'md.........',
    ], {'m': 'metal', 'd': 'dmetal'})


@icon
def tool_can(ic):
    ic.rows(1, 3, [
        '...dddd.........',
        '..d....d........',
        '.cccccccc.......',
        '.cccccccc.....ss',
        '.ccccccccc...sss',
        '.cccccccccsss...',
        '.ccccccccss.....',
        '.cccccccc.......',
        '.cccccccc.......',
        '..cccccc........',
    ], {'d': 'dmetal', 'c': 'blue', 's': 'metal'})
    ic.rows(3, 6, ['ww', 'w.'], {'w': '#cfe8f6'})


@icon
def tool_axe(ic):
    diag(ic, 2, 14, 11, 'wood')
    ic.rows(5, 0, [
        '...mmm....',
        '..mmmmm...',
        '.mmmmmmd..',
        'mmmmmmdd..',
        'mmmmmd....',
        '.mmmd.....',
        '..md......',
    ], {'m': 'metal', 'd': 'dmetal'})


@icon
def tool_pickaxe(ic):
    diag(ic, 2, 14, 10, 'wood')
    ic.rows(1, 0, [
        '..mmmm........',
        '.mmmmmmmm.....',
        'mm....mmmmm...',
        'm.......mmmm..',
        '..........mmm.',
        '...........mm.',
        '............mm',
        '............m.',
    ], {'m': 'metal'})


@icon
def tool_sword(ic):
    for i in range(9):
        ic.px(5 + i, 10 - i, 'metal')
        ic.px(6 + i, 10 - i, 'metal')
    ic.px(14, 1, 'metal')
    ic.rows(2, 9, [
        '.y...',
        '..yy.',
        '..yy.',
        '...y.',
    ], {'y': 'brass'})
    diag(ic, 1, 14, 3, 'dwood')
    ic.dot(1, 14, '#d0a443')


@icon
def tool_rod(ic):
    diag(ic, 1, 14, 13, 'wood', 1)
    diag(ic, 2, 14, 4, 'dwood', 1)
    for y in range(2, 11):
        ic.dot(14, y, '#e6e6e6')
    ic.rows(13, 10, ['rr', 'rr'], {'r': 'red'})
    ic.rows(3, 11, ['mm', 'mm'], {'m': 'dmetal'})


# ---------------- Vũ khí ----------------
@icon
def w_bat(ic):
    # gậy gỗ to dần lên trên, đóng đinh
    for i in range(11):
        w = 2 if i < 4 else 3
        for k in range(w):
            ic.px(2 + i + k, 13 - i, 'wood')
            if i >= 4:
                ic.px(2 + i + k, 12 - i, 'wood')
    ic.rows(1, 12, ['dd', 'dd'], {'d': 'black'})
    for x, y in ((9, 1), (12, 2), (14, 5), (10, 5), (13, 8), (7, 4)):
        ic.dot(x, y, '#dfe6ea')


@icon
def w_machete(ic):
    ic.rows(4, 1, [
        '.......mmmm',
        '.....mmmmm.',
        '....mmmmm..',
        '...mmmmm...',
        '..mmmmm....',
        '.mmmmm.....',
        'mmmmd......',
    ], {'m': 'metal', 'd': 'dmetal'})
    diag(ic, 1, 14, 5, 'black')


@icon
def w_pistol(ic):
    ic.rows(1, 4, [
        'gggggggggggg.',
        'gggggggggggg.',
        '.......ggggg.',
        '......kgggg..',
        '......k.ddd..',
        '.......dddd..',
        '.......ddd...',
        '.......ddd...',
    ], {'g': 'gun', 'k': 'black', 'd': 'dwood'})
    ic.dot(2, 4, '#9aa3aa')


@icon
def w_shotgun(ic):
    ic.rows(0, 5, [
        '.mmmmmmmm.......',
        '.mmmmmmmmggg....',
        '......wwwgggwwww',
        '.........kwwwwww',
        '..........k..www',
    ], {'m': 'dmetal', 'g': 'gun', 'w': 'wood', 'k': 'black'})


@icon
def w_rifle(ic):
    ic.rows(0, 4, [
        '.......gg.......',
        'mmmmmmmggggg....',
        '.....ooggggoooo.',
        '.......kk.oooooo',
        '.......kk....ooo',
    ], {'m': 'dmetal', 'g': 'gun', 'o': 'olive', 'k': 'black'})
    ic.rows(7, 3, ['gg'], {'g': 'gun'})


@icon
def molotov(ic):
    ic.rows(4, 1, [
        '..ff..',
        '.ffff.',
        '..cc..',
        '..gg..',
        '..gg..',
        '.gggg.',
        'gggggg',
        'gggggg',
        'gyyygg',
        'gyyyyg',
        'gyyyyg',
        '.gggg.',
    ], {'f': 'flame', 'c': 'cloth', 'g': 'green', 'y': 'orange'})


@icon
def ammo_pistol(ic):
    ic.rows(2, 6, [
        'bbbbbbbbbbbb',
        'bbbbbbbbbbbb',
        'bbbbbbbbbbbb',
        'bbbbbbbbbbbb',
        'bbbbbbbbbbbb',
        'bbbbbbbbbbbb',
        'bbbbbbbbbbbb',
    ], {'b': 'olive'})
    for x in (3, 6, 9, 12):
        ic.rows(x, 3, ['yy', 'yy', 'cc', 'cc'], {'y': 'brass', 'c': 'brass'})
        ic.dot(x, 3, '#f7e4a0')
    ic.rows(5, 9, ['wwwww'], {'w': '#e9dfb8'})


@icon
def ammo_shell(ic):
    for x in (3, 7, 11):
        ic.rows(x, 3, ['rr', 'rr', 'rr', 'rr', 'rr', 'rr', 'rr', 'yy', 'yy'], {'r': 'red', 'y': 'brass'})


@icon
def ammo_rifle(ic):
    for x in (4, 8, 12):
        ic.rows(x - 1, 1, ['.m', 'mm', 'mm', 'yy', 'yy', 'yy', 'yy', 'yy', 'yy', 'yy', 'yy', 'yy', 'yy'], {'m': 'rust', 'y': 'brass'})


# ---------------- Vật liệu & đồ sinh tồn ----------------
@icon
def wood(ic):
    # 3 đầu khúc gỗ xếp chồng: vỏ nâu, lõi sáng có vân
    for x0, y0 in ((1, 8), (8, 8), (4, 2)):
        ic.rows(x0, y0, [
            '.bbbbb.',
            'bcccccb',
            'bccrccb',
            'bcrcrcb',
            'bccrccb',
            'bcccccb',
            '.bbbbb.',
        ], {'b': 'dwood', 'c': 'cloth', 'r': '#b0956a'})


@icon
def stone(ic):
    ic.rows(2, 3, [
        '....sssss...',
        '..sssssssss.',
        '.ssssssssssss',
        'ssssssssssss',
        'ssssssssssss',
        'sssssssssss.',
        '.sssssssss..',
        '...ssssss...',
    ], {'s': 'stone'})
    ic.dot(6, 5, '#d6d1c8')
    ic.dot(9, 7, '#625d56')


@icon
def scrap(ic):
    ic.rows(1, 4, [
        '...rrr.....',
        '..rrrrr..mm',
        '.rrrrrrrmmmm',
        'rrrrmmmmmmm.',
        '.rrmmmmmmm..',
        '..mmmmmmd...',
        '...mmmmdd...',
    ], {'r': 'rust', 'm': 'dmetal', 'd': 'gun'})
    ic.px(12, 9, 'rust')
    ic.px(13, 10, 'rust')


@icon
def cloth(ic):
    ic.rows(2, 3, [
        '.cccccccccc.',
        'cccccccccccc',
        'rrrrrrrrrrrr',
        'cccccccccccc',
        'cccccccccccc',
        'rrrrrrrrrrrr',
        'cccccccccccc',
        '.cccccccccc.',
    ], {'c': 'cloth', 'r': 'red'})


@icon
def parts(ic):
    ic.rows(2, 3, [
        'cccccccccccc',
        'cccccccccccc',
        'cckkkkcccccc',
        'cckkkkccyycc',
        'cckkkkccyycc',
        'cccccccccccc',
        'cccccccccccc',
    ], {'c': 'chip', 'k': 'black', 'y': 'brass'})
    for x in (3, 6, 9, 12):
        ic.dot(x, 11, '#d0a443')
        ic.dot(x, 2, '#d0a443')


@icon
def fuel(ic):
    ic.rows(3, 1, [
        '......mm.',
        '.rrrrrmm.',
        'rrrrrrrr.',
        'rr...rrrr',
        'rr...rrrr',
        'rrrrrrrrr',
        'rrrrrrrrr',
        'rrrrrrrrr',
        'rrrrrrrrr',
        'rrrrrrrrr',
        'rrrrrrrrr',
        '.rrrrrrr.',
    ], {'r': 'red', 'm': 'dmetal'})
    ic.rows(5, 7, ['yyyyy'], {'y': 'yellow'})


@icon
def battery(ic):
    ic.rows(6, 1, ['mmmm'], {'m': 'metal'})
    ic.rows(3, 2, [
        'yyyyyyyyyy',
        'yyyyyyyyyy',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
        'kkkkkkkkkk',
    ], {'y': 'brass', 'k': 'black'})
    ic.rows(7, 7, ['..y..', '.yyy.', '..y..'], {'y': '#f2bd3c'})


@icon
def gunpowder(ic):
    ic.rows(3, 2, [
        '...cc....',
        '..cccc...',
        '...kk....',
        '.ssssss..',
        'ssssssss.',
        'ssssssss.',
        'ssssssssss',
        'ssssssssss',
        'ssssssssss',
        '.ssssssss.',
        '..ssssss..',
    ], {'c': 'cloth', 'k': 'dwood', 's': 'black'})
    ic.dot(6, 9, '#e0602a')
    ic.dot(8, 10, '#e0602a')


@icon
def milchip(ic):
    ic.rows(3, 3, [
        '.y.y.y.y.',
        'gggggggggg',
        'gggggggggg',
        'ggcccccggg',
        'ggcccccggg',
        'ggcccccggg',
        'gggggggggg',
        'gggggggggg',
        '.y.y.y.y.',
    ], {'g': 'olive', 'c': 'chip', 'y': 'brass'})


@icon
def bandage(ic):
    # cuộn băng tròn + đuôi băng
    ic.rows(2, 3, [
        '..wwwwww..',
        '.wwwwwwww.',
        'wwwwwwwwww',
        'wwwwiiwwww',
        'wwwiiiiwww',
        'wwwwiiwwww',
        'wwwwwwwwww',
        '.wwwwwwww.',
        '..wwwwww..',
    ], {'w': 'cloth', 'i': '#a8977a'})
    ic.rows(10, 9, ['wwww', '.wwwww'], {'w': 'cloth'})
    ic.rows(6, 4, ['rr'], {'r': 'red'})


@icon
def medkit(ic):
    ic.rows(5, 2, ['dddddd', 'd....d'], {'d': 'dmetal'})
    ic.rows(1, 4, [
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
        'wwwwwwwwwwwwww',
    ], {'w': 'white'})
    ic.rows(6, 5, ['.rr.', 'rrrr', 'rrrr', '.rr.'], {'r': 'red'})
    ic.rows(6, 5, ['.rr.'], {'r': 'red'})
    ic.rows(5, 6, ['rrrrrr', 'rrrrrr'], {'r': 'red'})
    ic.rows(7, 4, ['rr', 'rr', 'rr', 'rr', 'rr', 'rr'], {'r': 'red'})


@icon
def canned(ic):
    ic.rows(3, 2, [
        '.mmmmmmmm.',
        'mmmmmmmmmm',
        'rrrrrrrrrr',
        'rrrrrrrrrr',
        'rrccccccrr',
        'rrccccccrr',
        'rrccccccrr',
        'rrrrrrrrrr',
        'rrrrrrrrrr',
        'mmmmmmmmmm',
        '.mmmmmmmm.',
    ], {'m': 'metal', 'r': 'red', 'c': 'cloth'})
    ic.rows(7, 7, ['oo'], {'o': 'orange'})


@icon
def water(ic):
    ic.rows(6, 1, ['bbbb', 'bbbb'], {'b': 'blue'})
    ic.rows(4, 3, [
        '.gggggg.',
        'gggggggg',
        'gggggggg',
        'wwwwwwww',
        'wwwwwwww',
        'gggggggg',
        'gggggggg',
        'gggggggg',
        'gggggggg',
        'gggggggg',
        '.gggggg.',
    ], {'g': 'glass', 'w': 'blue'})


@icon
def rotflesh(ic):
    ic.rows(2, 4, [
        '....mmmm....',
        '..mmmmmmmm..',
        '.mmmmmmmmmmm',
        'mmmmmmmmmmmm',
        'mmmmmmmmmmm.',
        '.mmmmmmmmm..',
        '..cc..mmm...',
        '..cc........',
    ], {'m': 'meat', 'c': 'cloth'})
    for x, y in ((5, 6), (9, 7), (7, 9)):
        ic.dot(x, y, '#8fa64a')


@icon
def bait_poison(ic):
    rotflesh(ic)
    for x, y in ((4, 7), (8, 6), (11, 8), (6, 9)):
        ic.dot(x, y, '#b06ad6')
    ic.rows(11, 1, ['g', 'g', 'g'], {'g': 'purple'})


@icon
def fert(ic):
    ic.rows(3, 2, [
        '.cc..cc.',
        '..cccc..',
        '.ssssss.',
        'ssssssss',
        'ssssssss',
        'ssssssss',
        'ssssssss',
        'ssssssss',
        'ssssssss',
        'ssssssss',
        'ssssssss',
        '.ssssss.',
    ], {'c': 'cloth', 's': 'olive'})
    ic.rows(5, 7, ['.g..', 'ggg.', '.gg.'], {'g': 'green'})


@icon
def trap_spike(ic):
    ic.rows(1, 11, ['wwwwwwwwwwwwww', 'wwwwwwwwwwwwww'], {'w': 'dwood'})
    for x in (2, 5, 8, 11):
        ic.rows(x, 4, ['.m.', '.m.', 'mmm', 'mmm', 'mmm', 'mmm', 'mmm'], {'m': 'metal'})


@icon
def torch_i(ic):
    diag(ic, 3, 14, 7, 'wood')
    ic.rows(8, 4, ['cc', 'cc'], {'c': 'cloth'})
    ic.rows(8, 0, [
        '..f..',
        '.fff.',
        'fffff',
        '.fff.',
    ], {'f': 'flame'})
    ic.dot(10, 2, '#fff2a8')


# ---------------- Đồ lục / nhặt được (đợt 2) ----------------
@icon
def ore_copper(ic):  # cuộn dây đồng
    ic.rows(2, 3, [
        '...cccccc...',
        '.cccccccccc.',
        'cccc....cccc',
        'ccc......ccc',
        'ccc......ccc',
        'cccc....cccc',
        '.cccccccccc.',
        '...cccccc...',
    ], {'c': 'copper'})
    ic.rows(11, 9, ['..c', '.c.', 'c..'], {'c': 'copper'})


@icon
def ore_iron(ic):  # thanh thép chữ I gãy
    ic.rows(1, 4, [
        'iiiiiiiiiii...',
        'iiiiiiiiiiii..',
        '...iii....',
        '...iii....',
        '...iii....',
        'iiiiiiiiiiii..',
        'iiiiiiiiiii...',
    ], {'i': 'iron'})
    ic.rows(12, 4, ['d', '.d'], {'d': 'rust'})
    ic.rows(11, 9, ['d.', 'dd'], {'d': 'rust'})


@icon
def ore_gold(ic):  # bo mạch mạ vàng
    ic.rows(2, 3, [
        'gggggggggggg',
        'gggggggggggg',
        'ggkkkgggyygg',
        'ggkkkgggyygg',
        'ggkkkggggggg',
        'gggggggyyyyg',
        'gggggggggggg',
        'gggggggggggg',
    ], {'g': 'green', 'k': 'black', 'y': 'gold'})
    for x in (3, 5, 7, 9, 11, 13):
        ic.dot(x, 11, '#f0c040')


def ingot(ic, mat):
    ic.rows(2, 5, [
        '...mmmmmmmm.',
        '..mmmmmmmmm.',
        '.mmmmmmmmmm.',
        'mmmmmmmmmmm.',
        'mmmmmmmmmmm.',
        'mmmmmmmmmm..',
    ], {'m': mat})


@icon
def bar_copper(ic):
    ingot(ic, 'copper')


@icon
def bar_iron(ic):
    ingot(ic, 'iron')


@icon
def bar_gold(ic):
    ingot(ic, 'gold')


def gem(ic, mat):
    ic.rows(3, 3, [
        '..mmmmmm..',
        '.mmmmmmmm.',
        'mmmmmmmmmm',
        '.mmmmmmmm.',
        '..mmmmmm..',
        '...mmmm...',
        '....mm....',
    ], {'m': mat})
    ic.dot(5, 4, '#ffffff')
    ic.dot(6, 5, '#ffffff')


@icon
def gem_green(ic):
    gem(ic, 'gemg')


@icon
def gem_purple(ic):
    gem(ic, 'gemp')


@icon
def gem_yellow(ic):
    gem(ic, 'gemy')


@icon
def gem_red(ic):
    gem(ic, 'gemr')


def lockbox(ic, body, trim):
    ic.rows(1, 4, [
        'bbbbbbbbbbbbbb',
        'bbbbbbbbbbbbbb',
        'tttttttttttttt',
        'bbbbbbbbbbbbbb',
        'bbbbbbbbbbbbbb',
        'bbbbbbbbbbbbbb',
        'bbbbbbbbbbbbbb',
        'bbbbbbbbbbbbbb',
        'bbbbbbbbbbbbbb',
    ], {'b': body, 't': trim})
    ic.rows(6, 6, ['yyyy', 'yyyy', 'y..y', 'yyyy'], {'y': 'brass'})
    ic.dot(7, 8, '#2e2e34')
    ic.dot(8, 8, '#2e2e34')


@icon
def geode(ic):
    lockbox(ic, 'olive', 'black')


@icon
def geode_ice(ic):
    lockbox(ic, 'ice', 'blue')


@icon
def geode_fire(ic):
    lockbox(ic, 'orange', 'red')


@icon
def herb(ic):
    ic.rows(3, 2, [
        '......ll..',
        '....llll..',
        '...lllll..',
        '..llllll..',
        '.lllllll..',
        '.llllll...',
        '.lllll....',
        '.llll.....',
    ], {'l': 'leaf'})
    diag(ic, 2, 13, 5, 'green', 1)


@icon
def flower(ic):
    diag(ic, 6, 14, 1, 'green', 1)
    ic.rows(7, 8, ['g', 'g', 'g', 'g', 'g', 'g'], {'g': 'green'})
    ic.rows(4, 9, ['ll.', '.ll'], {'l': 'leaf'})
    ic.rows(4, 1, [
        '..pp.pp.',
        '.pppppp.',
        'ppppppppp',
        'pppyyppp',
        'pppyyppp',
        '.pppppp.',
        '..pp.pp.',
    ], {'p': 'pink', 'y': 'yellow'})


@icon
def nut(ic):
    ic.rows(3, 3, [
        '....dd....',
        '...dddd...',
        '..dddddd..',
        '.nnnnnnnn.',
        'nnnnnnnnnn',
        'nnnnnnnnnn',
        'nnnnnnnnnn',
        '.nnnnnnnn.',
        '..nnnnnn..',
        '....nn....',
    ], {'d': 'dwood', 'n': 'wood'})


@icon
def honey(ic):
    ic.rows(5, 1, ['cccccc', 'cccccc'], {'c': 'cloth'})
    ic.rows(3, 3, [
        '..gggggg..',
        '.gggggggg.',
        'gyyyyyyyyg',
        'gyyyyyyyyg',
        'gyyyyyyyyg',
        'gyyyyyyyyg',
        'gyyyyyyyyg',
        'gyyyyyyyyg',
        '.gggggggg.',
        '..gggggg..',
    ], {'g': 'glass', 'y': 'orange'})
    ic.rows(5, 7, ['pppp', 'pppp'], {'p': 'paper'})


def mushroom(ic, cap, spots):
    ic.rows(2, 2, [
        '....cccc....',
        '..cccccccc..',
        '.cccccccccc.',
        'cccccccccccc',
        'cccccccccccc',
    ], {'c': cap})
    ic.rows(5, 7, ['ssssss', '.ssss.', '.ssss.', '.ssss.', 'ssssss'], {'s': 'cloth'})
    for x, y in spots:
        ic.dot(x, y, '#fff6e6')


@icon
def mush_brown(ic):
    mushroom(ic, 'wood', ())


@icon
def mush_red(ic):
    mushroom(ic, 'red', ((5, 3), (9, 4), (12, 5), (4, 5)))


@icon
def egg(ic):
    ic.rows(4, 2, [
        '...ee...',
        '..eeee..',
        '.eeeeee.',
        '.eeeeee.',
        'eeeeeeee',
        'eeeeeeee',
        'eeeeeeee',
        'eeeeeeee',
        '.eeeeee.',
        '..eeee..',
    ], {'e': 'egg'})


@icon
def milk(ic):
    ic.rows(5, 1, ['bbbbbb'], {'b': 'blue'})
    ic.rows(4, 2, [
        '.wwwwww.',
        'wwwwwwww',
        'wwwwwwww',
        'bbbbbbbb',
        'bbbbbbbb',
        'wwwwwwww',
        'wwwwwwww',
        'wwwwwwww',
        'wwwwwwww',
        'wwwwwwww',
        'wwwwwwww',
        '.wwwwww.',
    ], {'w': 'white', 'b': 'blue'})


@icon
def truffle(ic):
    ic.rows(3, 4, [
        '...dddd...',
        '.dddddddd.',
        'dddddddddd',
        'dddddddddd',
        'dddddddddd',
        '.dddddddd.',
        '..dddddd..',
    ], {'d': 'dwood'})
    for x, y in ((5, 6), (8, 7), (10, 5), (6, 9)):
        ic.dot(x, y, '#2a1a12')


@icon
def hay(ic):
    ic.rows(2, 4, [
        '.hhhhhhhhhh.',
        'hhhhhhhhhhhh',
        'hhhhhhhhhhhh',
        'rrrrrrrrrrrr',
        'hhhhhhhhhhhh',
        'hhhhhhhhhhhh',
        'hhhhhhhhhhhh',
        '.hhhhhhhhhh.',
    ], {'h': 'hay', 'r': 'red'})
    for x in (3, 6, 9, 12):
        ic.dot(x, 5, '#987c30')
        ic.dot(x + 1, 9, '#987c30')


# nông sản
@icon
def tomato(ic):
    ic.rows(3, 4, [
        '...tttttt...',
        '.tttttttttt.',
        'tttttttttttt',
        'tttttttttttt',
        'tttttttttttt',
        'tttttttttttt',
        '.tttttttttt.',
        '..tttttttt..',
    ], {'t': 'tomato'})
    ic.rows(6, 2, ['.l..l.', 'llllll', '..ll..'], {'l': 'leaf'})


@icon
def watermelon(ic):
    ic.rows(1, 3, [
        '....mmmmmm....',
        '..mmmmmmmmmm..',
        '.mmmmmmmmmmmm.',
        'mmmmmmmmmmmmmm',
        'mmmmmmmmmmmmmm',
        'mmmmmmmmmmmmmm',
        '.mmmmmmmmmmmm.',
        '..mmmmmmmmmm..',
        '....mmmmmm....',
    ], {'m': 'melon'})
    for y in (4, 5, 6, 7, 8):
        for x in (4, 8, 12):
            ic.dot(x + (y % 2), y, '#246a26')


@icon
def beans(ic):
    for x0 in (3, 7, 11):
        for i in range(10):
            ic.px(x0 + (1 if 3 < i < 7 else 0), 3 + i, 'bean')
            ic.px(x0 + 1 + (1 if 3 < i < 7 else 0), 3 + i, 'bean')


@icon
def pumpkin(ic):
    ic.rows(1, 4, [
        '..pppppppppppp',
        '.pppppppppppppp',
        'pppppppppppppp',
        'pppppppppppppp',
        'pppppppppppppp',
        'pppppppppppppp',
        '.pppppppppppp.',
        '..pppppppppp..',
    ], {'p': 'pumpkin'})
    for x in (5, 8, 11):
        for y in range(5, 11):
            ic.dot(x, y, '#b05a14')
    ic.rows(7, 2, ['ww', 'ww'], {'w': 'dwood'})
    ic.rows(9, 2, ['ll'], {'l': 'leaf'})


@icon
def corn(ic):
    ic.rows(5, 1, [
        '...cc..',
        '..cccc.',
        '..cccc.',
        '..cccc.',
        '..cccc.',
        '..cccc.',
        '..cccc.',
        '.lcccc.',
        'llcccll',
        'llcccll',
        '.lllll.',
        '..lll..',
        '...l...',
    ], {'c': 'corn', 'l': 'leaf'})
    for y in (3, 5, 7):
        ic.dot(8, y, '#b8901c')


@icon
def eggplant(ic):
    ic.rows(3, 1, [
        '....ll....',
        '...llll...',
        '..eeeee...',
        '.eeeeeee..',
        '.eeeeeee..',
        '.eeeeeeee.',
        'eeeeeeeeee',
        'eeeeeeeeee',
        'eeeeeeeeee',
        '.eeeeeeee.',
        '..eeeeee..',
    ], {'l': 'leaf', 'e': 'eggpl'})


def packet(ic, mat, pic):
    ic.rows(2, 1, [
        '.pppppppppp.',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        'pppppppppppp',
        '.pppppppppp.',
    ], {'p': 'paper'})
    ic.rows(3, 2, ['kkkkkkkkkk'], {'k': mat})
    ic.rows(5, 5, pic, {'x': mat, 'l': 'leaf'})
    ic.rows(3, 12, ['kkkkkkkkkk'], {'k': mat})


@icon
def seed_tomato(ic):
    packet(ic, 'tomato', ['..ll..', '.xxxx.', 'xxxxxx', 'xxxxxx', '.xxxx.'])


@icon
def seed_watermelon(ic):
    packet(ic, 'melon', ['.xxxx.', 'xxxxxx', 'xxxxxx', 'xxxxxx', '.xxxx.'])


@icon
def seed_beans(ic):
    packet(ic, 'bean', ['.x..x.', '.x..x.', '..x..x', '..x..x', '.x..x.'])


@icon
def seed_pumpkin(ic):
    packet(ic, 'pumpkin', ['..ll..', 'xxxxxx', 'xxxxxx', 'xxxxxx', '.xxxx.'])


@icon
def seed_corn(ic):
    packet(ic, 'corn', ['..xx..', '..xx..', '..xx..', '.lxxl.', '..ll..'])


@icon
def seed_eggplant(ic):
    packet(ic, 'eggpl', ['..ll..', '.xxx..', '.xxxx.', 'xxxxx.', '.xxx..'])


@icon
def hive(ic):  # tổ ong rừng treo trên cành
    ic.rows(2, 0, ['wwwwwwwwwwww'], {'w': 'dwood'})
    ic.rows(6, 1, ['.d.', 'ddd'], {'d': 'dwood'})
    ic.rows(3, 3, [
        '...hhhh...',
        '..hhhhhh..',
        '.hhhhhhhh.',
        '.hhhhhhhh.',
        'hhhhhhhhhh',
        'hhhhhhhhhh',
        'hhhhhhhhhh',
        '.hhhhhhhh.',
        '.hhhhhhhh.',
        '..hhhhhh..',
        '...hhhh...',
    ], {'h': 'orange'})
    for y in (5, 8, 11):
        for x in range(4, 12):
            ic.dot(x, y, '#9c4e1c')
    ic.rows(7, 9, ['kk', 'kk'], {'k': '#2a1a12'})
    ic.dot(5, 4, '#ffe08a')
    ic.dot(6, 6, '#ffe08a')


@icon
def bee(ic):
    ic.rows(6, 6, ['.ww.', 'ybyb', 'ybyb', '.yy.'], {'w': '#e8f6ff', 'y': '#f2bd3c', 'b': '#2a1a12'})


# ---------------- Hái lượm đợt 3: quả dại, hoa, nấm ----------------
def berries(ic, mat):
    for x0, y0 in ((3, 6), (8, 4), (8, 9), (4, 10)):
        ic.rows(x0, y0, ['.mm.', 'mmmm', 'mmmm', '.mm.'], {'m': mat})
    ic.rows(9, 1, ['.l', 'll', 'l.'], {'l': 'leaf'})


@icon
def mulberry(ic):
    # quả dâu tằm dài, nhiều hạt
    ic.rows(5, 3, [
        '...ll.',
        '..ll..',
        '.mmmm.',
        'mmmmmm',
        'mmmmmm',
        'mmmmmm',
        'mmmmmm',
        '.mmmm.',
        '.mmmm.',
        '..mm..',
    ], {'m': 'mulb', 'l': 'leaf'})
    for x, y in ((6, 6), (8, 7), (7, 9), (9, 10), (6, 11)):
        ic.dot(x, y, '#b85a9a')


@icon
def blueberry(ic):
    berries(ic, 'blueb')
    for x, y in ((4, 7), (9, 5), (9, 10), (5, 11)):
        ic.dot(x, y, '#d8e8ff')


@icon
def rose(ic):
    ic.rows(7, 8, ['g', 'g', 'g', 'g', 'g', 'g', 'g'], {'g': 'green'})
    ic.rows(3, 10, ['ll..', '.lll'], {'l': 'leaf'})
    ic.rows(4, 1, [
        '..rrrr..',
        '.rrrrrr.',
        'rrrRRrrr',
        'rrRrrRrr',
        'rrrRRrrr',
        '.rrrrrr.',
        '..rrrr..',
    ], {'r': 'rose', 'R': '#8a1c2a'})


@icon
def daisy(ic):
    ic.rows(7, 9, ['g', 'g', 'g', 'g', 'g', 'g'], {'g': 'green'})
    ic.rows(8, 11, ['ll.', '.ll'], {'l': 'leaf'})
    ic.rows(3, 1, [
        '...ww....',
        '.w.ww.w..',
        '..wwww...',
        'wwwyywww.',
        'wwwyywww.',
        '..wwww...',
        '.w.ww.w..',
        '...ww....',
    ], {'w': 'white', 'y': 'yellow'})


@icon
def lavender(ic):
    for x0, y0 in ((2, 3), (6, 1), (10, 3)):
        ic.rows(x0, y0, ['.l.', 'lll', '.l.', 'lll', '.l.'], {'l': 'lav'})
        ic.dot(x0 + 1, y0, '#e8d8ff')
        for y in range(y0 + 5, 13):
            ic.px(x0 + 1, y, 'green')
    ic.rows(3, 12, ['.pppppppp.'], {'p': 'purple'})


@icon
def tealeaf(ic):
    ic.rows(2, 3, [
        '.......ll..',
        '.....lllll.',
        '...llllll..',
        '..lllllll..',
        '.llllll....',
        '.lllll.....',
        'llll.......',
    ], {'l': 'leaf'})
    ic.rows(6, 8, ['......ll', '....llll', '..llllll', '.lllll..', 'll......'], {'l': 'green'})
    for i in range(7):
        ic.dot(3 + i, 9 - i, '#3e7024')


def mush(ic, cap, stem='cloth', dots=(), shape='round'):
    if shape == 'round':
        ic.rows(2, 2, ['....cccc....', '..cccccccc..', '.cccccccccc.', 'cccccccccccc', 'cccccccccccc'], {'c': cap})
    elif shape == 'flat':  # nấm sò: mũ loe lệch
        ic.rows(1, 3, ['...ccccccccc..', '.cccccccccccc.', 'cccccccccccccc', '..cccccccccc..'], {'c': cap})
    else:  # nấm mối: mũ nhọn
        ic.rows(4, 1, ['...cc...', '..cccc..', '.cccccc.', 'cccccccc', 'cccccccc'], {'c': cap})
    ic.rows(5, 7, ['ssssss', '.ssss.', '.ssss.', '.ssss.', 'ssssss'], {'s': stem})
    for x, y in dots:
        ic.dot(x, y, '#fff6e6' if cap != 'glow' else '#f0ffe0')


@icon
def mush_termite(ic):
    mush(ic, 'tan', shape='cone')
    ic.dot(7, 2, '#5e4630')


@icon
def mush_oyster(ic):
    mush(ic, 'oyster', shape='flat')


@icon
def mush_deathcap(ic):
    mush(ic, 'white', dots=(), shape='round')
    ic.rows(4, 7, ['ssssssss'], {'s': 'egg'})
    ic.rows(4, 13, ['kkkkkkkk'], {'k': 'olive'})


@icon
def mush_glow(ic):
    mush(ic, 'glow', 'glow', dots=((4, 4), (8, 3), (11, 5), (6, 6)))
    for x, y in ((1, 2), (14, 3), (2, 10), (13, 9)):
        ic.dot(x, y, '#d0ffb0')


def bowl(ic, soup, top):
    ic.rows(1, 7, [
        'bbbbbbbbbbbbbb',
        '.bbbbbbbbbbbb.',
        '..bbbbbbbbbb..',
        '...bbbbbbbb...',
        '....bbbbbb....',
    ], {'b': 'cloth'})
    ic.rows(2, 5, ['ssssssssssss', 'ssssssssssss'], {'s': soup})
    ic.rows(3, 3, top, {'m': 'tan', 'o': 'oyster', 'g': 'leaf'})


@icon
def dish_mushroom(ic):
    bowl(ic, 'soupb', ['.mm..oo..mm.', 'mmmmoooommmg'])
    ic.rows(6, 0, ['.w.', 'w.w'], {'w': '#ffffff'})


@icon
def dish_mushsoup(ic):
    bowl(ic, 'paper', ['..oo...oo...', '.oooo.oooog.'])
    ic.rows(4, 0, ['.w..w.', 'w..w..'], {'w': '#ffffff'})


def main():
    os.makedirs(OUT, exist_ok=True)
    names = list(ICONS)
    cols = 8
    sheet = Image.new('RGBA', (cols * 17, ((len(names) + cols - 1) // cols) * 17))
    frames = {}
    for i, n in enumerate(names):
        ic = Icon()
        ICONS[n](ic)
        im = ic.render()
        x, y = (i % cols) * 17, (i // cols) * 17
        sheet.alpha_composite(im, (x, y))
        frames[n] = {'frame': {'x': x, 'y': y, 'w': 16, 'h': 16}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': 16, 'h': 16}, 'sourceSize': {'w': 16, 'h': 16}}
    sheet.save(os.path.join(OUT, 'icons.png'))
    json.dump({'frames': frames, 'meta': {'image': 'icons.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': 1}},
              open(os.path.join(OUT, 'icons.json'), 'w'), indent=0)
    print(len(names), 'icons ->', OUT)


if __name__ == '__main__':
    main()
