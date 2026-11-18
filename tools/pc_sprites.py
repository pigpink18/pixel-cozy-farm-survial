"""Tiện ích: tách sprite rời trong 1 tấm Pixel Crawler (thành phần liền nhau theo alpha)."""
from PIL import Image


def components(im, min_area=40, gap=1):
    """Trả về list bbox (x0,y0,x1,y1) các cụm điểm ảnh liền nhau (cho phép hở `gap` px)."""
    w, h = im.size
    a = im.getchannel('A').load()
    seen = bytearray(w * h)
    out = []
    for y in range(h):
        for x in range(w):
            if not a[x, y] or seen[y * w + x]:
                continue
            st = [(x, y)]
            seen[y * w + x] = 1
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while st:
                cx, cy = st.pop()
                n += 1
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for dy in range(-gap, gap + 1):
                    for dx in range(-gap, gap + 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and a[nx, ny] and not seen[ny * w + nx]:
                            seen[ny * w + nx] = 1
                            st.append((nx, ny))
            if n >= min_area:
                out.append((x0, y0, x1 + 1, y1 + 1))
    out.sort(key=lambda b: (b[1] // 32, b[0]))
    return out


def fit(sprite, w, h):
    """Đặt sprite vào khung w x h: căn giữa ngang, sát đáy."""
    f = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    f.alpha_composite(sprite, ((w - sprite.width) // 2, h - sprite.height))
    return f
