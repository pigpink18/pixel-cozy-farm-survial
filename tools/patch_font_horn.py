"""Sửa chữ có móc (Ơ ơ Ư ư + mọi dấu: Ớ Ờ Ở Ỡ Ợ, Ứ Ừ...) của font VT323.

VT323 gốc vẽ cái móc là ô 2x2 lơ lửng phía trên-phải thân chữ → nhìn y như dấu sắc (Ơ thành Ó).
Script này bỏ cái móc cũ, vẽ móc mới DÍNH vào cạnh phải đỉnh thân chữ và nhô ra ngoài 1 điểm ảnh,
có đuôi chĩa lên → đọc rõ là ơ / ư.

Nguồn gốc: tools/fonts/VT323-Regular.orig.ttf (bản gốc OFL) → public/fonts/VT323-Regular.ttf
Chạy: python3 tools/patch_font_horn.py
"""
import os
import shutil
import unicodedata

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(ROOT, 'tools', 'fonts', 'VT323-Regular.orig.ttf')
OUT = os.path.join(ROOT, 'public', 'fonts', 'VT323-Regular.ttf')
PX = 40  # 1 điểm ảnh của VT323 = 40 đơn vị


def contours(rec):
    out, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            out.append(cur)
            cur = []
    return out


def bbox(c):
    pts = [p for _, a in c for p in a]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def area(c):
    pts = [a[-1] for op, a in c if a]
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2


def rect(pen, x0, y0, x1, y1, cw):
    pts = [(x0, y0), (x0, y1), (x1, y1), (x1, y0)] if cw else [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


def main():
    if not os.path.exists(ORIG):
        os.makedirs(os.path.dirname(ORIG), exist_ok=True)
        shutil.copy(OUT, ORIG)
    font = TTFont(ORIG)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    glyf = font['glyf']
    targets = [ch for ch in map(chr, range(0x00C0, 0x1EFF)) if ord(ch) in cmap and 'WITH HORN' in unicodedata.name(ch, '')]
    for ch in targets:
        name = cmap[ord(ch)]
        rec = DecomposingRecordingPen(gs)  # chữ ghép (Ơ = O + móc) → tách thành nét
        gs[name].draw(rec)
        cs = contours(rec)
        if not cs:
            continue
        # thân chữ = đường viền lớn nhất (bao ngoài); móc cũ = ô nhỏ ở phía phải trên thân
        body = max(cs, key=lambda c: (bbox(c)[2] - bbox(c)[0]) * (bbox(c)[3] - bbox(c)[1]))
        cw = area(body) < 0
        # thân chữ = gộp mọi mảnh đứng trên chân chữ (chữ u gồm 2 mảnh trái/phải; bỏ dấu chấm dưới, dấu trên)
        base = [bbox(c) for c in cs if -1 <= bbox(c)[1] <= PX]
        bx0, by0 = min(b[0] for b in base), min(b[1] for b in base)
        bx1, by1 = max(b[2] for b in base), max(b[3] for b in base)

        def is_horn(c):
            x0, y0, x1, y1 = bbox(c)
            return y0 > PX and x1 - x0 <= 3 * PX and y1 - y0 <= 3 * PX and x0 >= bx1 - 3 * PX and y0 >= by1 - 2 * PX - 4

        keep = [c for c in cs if not is_horn(c)]
        pen = TTGlyphPen(None)
        for c in keep:
            for op, args in c:
                getattr(pen, op)(*args)
        # móc mới: thanh ngang dính đỉnh-phải thân chữ, nhô ra 2px, đuôi chĩa lên 1px ở đầu móc
        top = by1
        rect(pen, bx1 - PX, top - PX, bx1 + 2 * PX, top, cw)
        rect(pen, bx1 + PX, top, bx1 + 2 * PX, top + PX, cw)
        glyf[name] = pen.glyph()
        adv, lsb = font['hmtx'][name]
        font['hmtx'][name] = (max(adv, bx1 + 2 * PX + PX), lsb)  # nới chữ cho móc khỏi chạm chữ sau
        print('vá', ch, name)
    font.save(OUT)
    print('->', OUT)


if __name__ == '__main__':
    main()
