"""Tự tạo nhạc nền "chill, không u ám" cho Ashen Acre bằng code (không dùng file ngoài).
Phong cách lo-fi: piano điện ấm, guitar gảy, pad êm, bass tròn, trống nhẹ, tiếng sột soạt đĩa than.

Cần numpy (pip install numpy) + macOS afconvert (đổi WAV → M4A).
Chạy: python3 tools/make_music.py [tên bài ...]   → public/assets/audio/music/<tên>.m4a
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'music')
SR = 32000

CHORD = {  # quãng (nửa cung) so với gốc hợp âm
    'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'add9': [0, 4, 7, 14],
    'm9': [0, 3, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14], '6': [0, 4, 7, 9], 'sus2': [0, 2, 7, 12], 'm': [0, 3, 7, 12],
}
SCALE = {'maj': [0, 2, 4, 7, 9], 'min': [0, 3, 5, 7, 10], 'dor': [0, 2, 3, 7, 9]}  # ngũ cung → dễ nghe


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def adsr(n, a=0.005, rel=0.08, dur=None):
    env = np.ones(n)
    na = max(1, int(a * SR))
    env[:na] = np.linspace(0, 1, na)
    nr = min(n, int(rel * SR))
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return env


# ---------------- Nhạc cụ ----------------
def epiano(f, dur, vel=0.5, wob=None):
    t = tt(dur + 0.6)
    fm = f * (1 + 0.0025 * np.sin(2 * np.pi * 0.6 * t)) if wob else f
    ph = 2 * np.pi * np.cumsum(np.full(len(t), 1.0) * fm) / SR
    bell = 0.9 * np.exp(-t * 7) * np.sin(2 * ph)
    s = np.sin(ph + bell) + 0.22 * np.sin(2 * ph) * np.exp(-t * 2.5) + 0.06 * np.sin(3 * ph) * np.exp(-t * 4)
    env = np.exp(-t * 1.1) * adsr(len(t), 0.004, 0.5)
    hold = np.ones(len(t))
    nd = int(dur * SR)
    hold[nd:] = np.exp(-(t[nd:] - dur) * 9)
    return s * env * hold * vel


def pluck(f, dur, vel=0.5):
    t = tt(max(dur, 0.25) + 0.8)
    s = np.zeros(len(t))
    for k in range(1, 9):
        s += np.sin(2 * np.pi * f * k * 1.0007 ** k * t) / k ** 1.25 * np.exp(-t * (1.6 + k * 1.1))
    return s * adsr(len(t), 0.002, 0.2) * vel


def bell(f, dur, vel=0.5):
    t = tt(dur + 1.0)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 7)
    return s * np.exp(-t * 1.6) * adsr(len(t), 0.003, 0.4) * vel


def pad(notes, dur, vel=0.18):
    t = tt(dur + 1.2)
    s = np.zeros(len(t))
    for m in notes:
        for det in (-0.08, 0, 0.08):
            f = hz(m + det)
            for k in range(1, 6):
                s += np.sin(2 * np.pi * f * k * t + k * det * 9) / (k ** 1.6)
    env = np.clip(t / 0.9, 0, 1) * np.where(t > dur, np.exp(-(t - dur) * 3), 1)
    return s * env * vel / (len(notes) * 3)


def bass(f, dur, vel=0.5):
    t = tt(dur + 0.1)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3)
    env = (0.65 + 0.35 * np.exp(-t * 5)) * adsr(len(t), 0.008, 0.09)
    return s * env * vel


def noise(n, rng):
    return rng.standard_normal(n)


def kick(rng, vel=0.8):
    t = tt(0.45)
    f = 48 + 85 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * vel


def snare(rng, vel=0.35):
    t = tt(0.3)
    n = noise(len(t), rng)
    n = n - np.concatenate([[0], n[:-1]]) * 0.6  # bớt trầm
    n = fft_filter(n, hi=2500)  # chổi quét mềm, không xì
    return (n * 0.25 * np.exp(-t * 26) + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)) * vel


def hat(rng, vel=0.12, open_=False):
    t = tt(0.25 if open_ else 0.06)
    n = noise(len(t), rng)
    n = n - np.concatenate([[0], n[:-1]])
    return n * np.exp(-t * (14 if open_ else 70)) * vel


# ---------------- Xử lý ----------------
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones(len(f))
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))


def reverb(x, rng, size=1.8, mix=0.22):
    n = int(size * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 3.2 / size)
    ir = fft_filter(ir, hi=3500)
    ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    ir /= np.sqrt(np.sum(ir ** 2))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - mix) + wet * mix * 1.6


def add(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


# ---------------- Sáng tác ----------------
def song(spec):
    rng = np.random.default_rng(spec['seed'])
    bpm, root = spec['bpm'], spec['key']
    beat = 60 / bpm
    prog = spec['prog']  # [(bậc nửa cung, loại hợp âm), ...] — mỗi hợp âm 1 nhịp (4 phách) × spec.get('per', 1)
    per = spec.get('per', 1)
    bars = spec.get('bars', 24)
    total = bars * 4 * beat + 2.5
    N = int(total * SR)
    keys, bs, dr, lead, padb = (np.zeros(N) for _ in range(5))
    scale = SCALE[spec.get('scale', 'maj')]
    lead_fn = {'epiano': epiano, 'pluck': pluck, 'bell': bell}[spec.get('lead', 'bell')]
    comp_fn = {'epiano': epiano, 'pluck': pluck}[spec.get('comp', 'epiano')]
    drums = spec.get('drums', 'lofi')
    swing = spec.get('swing', 0.12)

    # Motif giai điệu 2 nhịp, lặp lại có biến tấu (dễ nhớ, không lan man)
    def make_motif():
        slots = [0, 1, 1.5, 2.5, 3, 4, 5, 5.5, 6.5]
        pick = sorted(rng.choice(len(slots), size=rng.integers(4, 7), replace=False))
        deg = int(rng.integers(0, 5))
        out = []
        for i in pick:
            deg = int(np.clip(deg + rng.choice([-2, -1, -1, 1, 1, 2, 0]), -2, 7))
            out.append((slots[i], deg))
        return out

    motifs = [make_motif(), make_motif()]

    def deg_midi(d):
        o, i = divmod(d, 5)
        return root + 12 + 12 * o + scale[i] + spec.get('lead_oct', 0) * 12

    sections = spec.get('sections') or (['intro'] * 4 + ['A'] * 8 + ['B'] * 8 + ['outro'] * 4)
    sections = (sections * 4)[:bars]
    for bar in range(bars):
        sec = sections[bar]
        t0 = bar * 4 * beat
        deg, kind = prog[(bar // per) % len(prog)]
        chord = [root + deg + iv for iv in CHORD[kind]]
        # pad nền
        if bar % per == 0:
            padb_sig = pad([n - 12 for n in chord[:3]] + [chord[-1]], per * 4 * beat, 0.16 if sec != 'B' else 0.2)
            add(padb, padb_sig, t0)
        # đệm hợp âm
        if sec != 'outro' or bar < bars - 2:
            pat = spec.get('comp_pat', [(0, 1.5), (2.5, 1.2)])
            for st, ln in pat:
                for k, n in enumerate(chord):
                    v = 0.2 if sec == 'intro' else 0.16
                    add(keys, comp_fn(hz(n), ln * beat, v * (0.9 if k else 1)), t0 + (st + k * 0.012) * beat)
        # bass
        if sec in ('A', 'B') or (sec == 'outro' and bar < bars - 2):
            r = hz(root + deg - 24)
            add(bs, bass(r, 1.6 * beat, 0.55), t0)
            add(bs, bass(r * (1.5 if bar % 2 else 2), 0.8 * beat, 0.4), t0 + 2.5 * beat)
            add(bs, bass(r, 0.9 * beat, 0.45), t0 + 3 * beat)
        # trống
        if drums != 'none' and sec in ('A', 'B'):
            for b in range(4):
                tb = t0 + b * beat
                if drums == 'drive':
                    add(dr, kick(rng, 0.85), tb)
                    if b % 2:
                        add(dr, snare(rng, 0.4), tb)
                    continue
                if b in (0, 2) or (b == 3 and rng.random() < 0.3):
                    add(dr, kick(rng, 0.7 if b == 0 else 0.55), tb + (0.5 * beat if b == 3 else 0))
                if b in (1, 3) and drums == 'lofi':
                    add(dr, snare(rng, 0.3), tb)
        # giai điệu
        if sec in ('A', 'B') and spec.get('melody', True):
            m = motifs[0 if sec == 'A' else 1]
            half = bar % 2
            for st, d in m:
                if (st >= 4) != bool(half):
                    continue
                if sec == 'B' and rng.random() < 0.15:
                    d += 1
                add(lead, lead_fn(hz(deg_midi(d)), 0.9 * beat, spec.get('lead_vel', 0.2)), t0 + (st - 4 * half) * beat + rng.normal(0, 0.006))
    # tiếng đĩa than: sột soạt + nổ lách tách
    # (bỏ tiếng rè đĩa than — người chơi thấy ồn)

    # Ghép: nén kick (sidechain nhẹ) + lọc ấm + vang
    t = np.arange(N) / SR
    duck = np.ones(N)
    if drums != 'none':
        for b in range(bars * 4):
            if sections[b // 4] in ('A', 'B'):
                i = int(b * beat * SR)
                n = min(N - i, int(0.35 * SR))
                duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.28 * np.exp(-np.arange(n) / SR * 9))
    music = (keys * spec.get('keys_gain', 1.0) + padb + lead) * duck + bs * 0.9
    music = reverb(music, rng, spec.get('room', 1.8), spec.get('wet', 0.24))
    dr = fft_filter(dr, hi=2500) * 0.7  # trống mềm, lùi ra sau
    mix = music + dr
    mix = fft_filter(mix, lo=35, hi=min(spec.get('lpf', 5000), 5000))
    # vào/ra mượt để các bài nối tiếp nhau
    fade_in, fade_out = int(1.2 * SR), int(3.0 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5
    # cân theo độ to trung bình (RMS) cho mọi bài bằng nhau, đỉnh tối đa ~0.6, không nén cho to
    rms = np.sqrt(np.mean(mix ** 2)) or 1
    mix = mix * (0.11 / rms)
    mix = np.tanh(mix / 0.6) * 0.6
    return mix


# ---------------- Danh sách bài ----------------
C, D, E, F, G, A = 48, 50, 52, 53, 55, 57
SONGS = {
    # Nông trại ban ngày: sáng sủa, thong thả
    'porch_morning': dict(seed=11, bpm=78, key=F, prog=[(0, 'maj7'), (9, 'm7'), (2, 'm7'), (7, '7')], lead='bell'),
    'dusty_garden': dict(seed=12, bpm=84, key=C, prog=[(5, 'maj9'), (4, 'm7'), (2, 'm7'), (0, 'add9')], lead='pluck', comp='epiano'),
    'slow_harvest': dict(seed=13, bpm=72, key=G - 12 + 12, prog=[(0, 'add9'), (5, 'maj7'), (9, 'm7'), (5, 'maj7')], lead='epiano', drums='soft'),
    # Ban đêm: dịu, mơ màng (không đáng sợ)
    'ember_night': dict(seed=21, bpm=66, key=A - 12, prog=[(0, 'm9'), (8, 'maj7'), (3, 'maj7'), (10, 'add9')], scale='min', lead='bell', drums='soft', per=2, lpf=4800, wet=0.32),
    'starlit_rows': dict(seed=22, bpm=62, key=D, prog=[(0, 'maj9'), (7, 'add9'), (4, 'm7'), (5, 'maj7')], lead='epiano', drums='none', per=2, lpf=4500, wet=0.35),
    # Trại dân làng: ấm áp, có guitar
    'campfire_talk': dict(seed=31, bpm=90, key=G - 12, prog=[(0, '6'), (9, 'm7'), (5, 'maj7'), (7, 'sus2')], lead='pluck', comp='pluck', comp_pat=[(0, 1), (1.5, 0.8), (2.5, 1), (3.5, 0.5)]),
    'old_village': dict(seed=32, bpm=82, key=E - 12, prog=[(0, 'add9'), (5, 'maj7'), (9, 'm7'), (7, '6')], lead='bell', comp='pluck'),
    # Rừng hoang: phiêu lưu, hơi bí ẩn nhưng vẫn chill
    'wild_path': dict(seed=41, bpm=80, key=D, prog=[(0, 'm7'), (5, '7'), (0, 'm9'), (10, 'maj7')], scale='dor', lead='pluck'),
    'sunny_clearing': dict(seed=42, bpm=86, key=A - 12, prog=[(0, 'maj7'), (2, 'm7'), (4, 'm7'), (5, 'maj9')], lead='bell'),
    # Thị trấn bỏ hoang: trống trải, nhẹ nhàng
    'empty_streets': dict(seed=51, bpm=74, key=E - 12, prog=[(0, 'm9'), (5, 'add9'), (3, 'maj7'), (10, '6')], scale='min', lead='epiano', drums='soft', wet=0.3),
    'open_road': dict(seed=52, bpm=88, key=C, prog=[(0, 'add9'), (7, '6'), (9, 'm7'), (5, 'maj9')], lead='pluck'),
    # Hầm: trầm, vang
    'deep_hum': dict(seed=61, bpm=60, key=C - 12, prog=[(0, 'm9'), (5, 'm9'), (8, 'maj7'), (7, 'sus2')], scale='min', lead='bell', drums='none', per=2, lpf=3800, wet=0.4, room=2.6),
    # Đánh nhau: nhanh, có lực nhưng không u ám
    'scrap_fight': dict(seed=71, bpm=118, key=E - 12, prog=[(0, 'm7'), (8, 'maj7'), (10, '6'), (5, 'add9')], scale='min', lead='pluck', drums='drive', swing=0, comp_pat=[(0, 0.5), (0.75, 0.5), (1.5, 0.5), (2.5, 0.5), (3.25, 0.5)], lead_vel=0.24, sections=['A'] * 8 + ['B'] * 8),
    # Lễ hội: vui
    'festival_lights': dict(seed=81, bpm=100, key=F, prog=[(0, '6'), (2, 'm7'), (4, 'm7'), (7, '7')], lead='bell', comp='pluck', comp_pat=[(0, 0.6), (1, 0.6), (2, 0.6), (3, 0.6)], lead_vel=0.24),
    # Đài radio trong nhà
    'radio_sunday': dict(seed=91, bpm=92, key=G - 12, prog=[(0, 'maj7'), (4, 'm7'), (9, 'm7'), (2, '7')], lead='epiano'),
    'radio_rainy': dict(seed=92, bpm=70, key=D, prog=[(0, 'maj9'), (11, 'm7'), (9, 'm7'), (7, 'add9')], lead='bell', drums='soft', wet=0.3),
}


def write_m4a(name, x):
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, name + '.wav')
        pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1), w.setsampwidth(2), w.setframerate(SR), w.writeframes(pcm.tobytes())
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '72000', wav, os.path.join(OUT, name + '.m4a')], check=True)


def main():
    names = sys.argv[1:] or list(SONGS)
    for n in names:
        x = song(SONGS[n])
        write_m4a(n, x)
        print(f'{n}: {len(x) / SR:.0f}s')


if __name__ == '__main__':
    main()
