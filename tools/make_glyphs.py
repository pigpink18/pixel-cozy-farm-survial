"""Phông pixel phụ "AshenGlyphs": vẽ các ký tự VT323 không có (♥ ▶ ✓ → ...) theo đúng lưới
pixel của VT323 (1 ô = 40 đơn vị, rộng 400). Trình duyệt tự lấy ký tự từ phông này thay vì
phông hệ thống → trên iPhone không bị biến thành emoji iOS.

Cần fonttools:  pip install fonttools
Chạy:           python3 tools/make_glyphs.py   → public/fonts/AshenGlyphs.ttf
"""
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PX, ADV = 40, 400

G = {
    '♥': ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'],
    '♡': ['.##...##.', '#..#.#..#', '#...#...#', '#.......#', '.#.....#.', '..#...#..', '...#.#...', '....#....'],
    '→': ['....#....', '.....#...', '......#..', '#########', '......#..', '.....#...', '....#....'],
    '←': ['....#....', '...#.....', '..#......', '#########', '..#......', '...#.....', '....#....'],
    '↑': ['...#...', '..###..', '.#.#.#.', '#..#..#', '...#...', '...#...', '...#...', '...#...', '...#...'],
    '↓': ['...#...', '...#...', '...#...', '...#...', '...#...', '#..#..#', '.#.#.#.', '..###..', '...#...'],
    '▶': ['#......', '###....', '#####..', '#######', '#####..', '###....', '#......'],
    '◀': ['......#', '....###', '..#####', '#######', '..#####', '....###', '......#'],
    '✓': ['........#', '.......##', '......##.', '#....##..', '##..##...', '.####....', '..##.....'],
    '○': ['..####..', '.#....#.', '#......#', '#......#', '#......#', '#......#', '.#....#.', '..####..'],
    '♪': ['...#....', '...##...', '...#.#..', '...#..#.', '...#....', '...#....', '.###....', '####....', '.##.....'],
    '♫': ['..######', '..######', '..#....#', '..#....#', '..#....#', '.##...##', '###..###', '.#....#.'],
    '✨': ['....#....', '....#....', '...###...', '#########', '...###...', '....#....', '....#..#.', '......###', '.......#.'],
    '✎': ['.......##', '......###', '.....###.', '....###..', '...###...', '..###....', '.###.....', '##.......', '#........'],
    '⟲': ['.#.####..', '.##....#.', '.###....#', '........#', '#.......#', '#.......#', '.#.....#.', '..#####..'],
}


def draw(rows):
    pen = TTGlyphPen(None)
    h = len(rows)
    bottom = round(7 - h / 2)  # canh giữa quanh giữa chữ hoa (~7 ô)
    left = (ADV // PX - len(rows[0])) * PX // 2
    for r, line in enumerate(rows):
        y0 = (bottom + h - 1 - r) * PX
        x = 0
        while x < len(line):
            if line[x] != '#':
                x += 1
                continue
            s = x
            while x < len(line) and line[x] == '#':
                x += 1
            x0, x1 = left + s * PX, left + x * PX
            pen.moveTo((x0, y0)), pen.lineTo((x0, y0 + PX)), pen.lineTo((x1, y0 + PX)), pen.lineTo((x1, y0)), pen.closePath()
    return pen.glyph()


def main():
    names = ['.notdef'] + [f'uni{ord(c):04X}' for c in G]
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap({ord(c): f'uni{ord(c):04X}' for c in G})
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}
    glyphs.update({f'uni{ord(c):04X}': draw(rows) for c, rows in G.items()})
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics({n: (ADV, glyphs[n].xMin if hasattr(glyphs[n], 'xMin') else 0) for n in names})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({'familyName': 'AshenGlyphs', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=1040, usWinDescent=240)
    fb.setupPost()
    out = os.path.join(ROOT, 'public/fonts/AshenGlyphs.ttf')
    fb.save(out)
    print('ok', out, len(G), 'glyphs')


if __name__ == '__main__':
    main()
