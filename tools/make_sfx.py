"""Tự tạo toàn bộ tiếng hiệu ứng + tiếng môi trường cho Ashen Acre bằng code (không dùng file ngoài).
Tiếng mềm, ấm, hợp nhạc chill: không chói, không giật mình.
Độ to cân theo RMS từng loại (VOL) — tiếng bấm nút rất nhỏ, chỉ súng/nổ mới to.

Cần numpy (pip install numpy).
Chạy: python3 tools/make_sfx.py   → public/assets/audio/sfx/<key>_<i>.wav (mono 44.1kHz)
                                     public/assets/audio/amb/<tên>.wav   (mono 22kHz, lặp liền mạch)
Danh sách key & số biến thể phải khớp SFX_DEF trong src/audio.js.
"""
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'sfx')
AMB_OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'amb')
SR = 44100
rng = np.random.default_rng(7)


class Sig(np.ndarray):
    """Mảng âm thanh: cộng 2 đoạn dài ngắn khác nhau thì tự đệm im lặng cho bằng."""

    def __add__(self, o):
        if isinstance(o, np.ndarray) and o.ndim == 1 and len(o) != len(self):
            n = max(len(self), len(o))
            a, b = np.zeros(n), np.zeros(n)
            a[: len(self)], b[: len(o)] = self, o
            return (a + b).view(Sig)
        return np.ndarray.__add__(self, o)

    __radd__ = __add__


def T(d):
    return (np.arange(int(d * SR)) / SR).view(Sig)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, lo=None, hi=None, sr=SR):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / sr)
    g = np.ones(len(f))
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x)).view(Sig)


def bandpass(x, fc, q=4, sr=SR):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / sr)
    g = 1 / (1 + (q * (f / fc - fc / np.maximum(f, 1))) ** 2)
    return np.fft.irfft(X * g, len(x)).view(Sig)


def noise(d):
    return rng.standard_normal(int(d * SR)).view(Sig)


def env(d, a=0.003, decay=10.0):
    t = T(d)
    e = np.exp(-t * decay)
    n = max(1, int(a * SR))
    e[:n] *= np.linspace(0, 1, n)
    return e


def tone(f, d, decay=6.0, harm=(1, 0.3, 0.1), a=0.004):
    t = T(d)
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm))
    return s * env(d, a, decay)


def bell(f, d, decay=5.0):
    t = T(d)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 10)
    return s * env(d, 0.002, decay)


def glide(f0, f1, d, shape=1.0):
    t = T(d)
    f = f0 + (f1 - f0) * (t / d) ** shape
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def seq(parts, gap=0.0):
    """Nối các đoạn [(tín hiệu, lúc bắt đầu)] thành một."""
    n = max(int(at * SR) + len(s) for s, at in parts)
    out = np.zeros(n)
    for s, at in parts:
        i = int(at * SR)
        out[i:i + len(s)] += s
    return out.view(Sig)


def room(x, size=0.4, mix=0.15):
    n = int(size * SR)
    t = np.arange(n) / SR
    ir = filt(rng.standard_normal(n) * np.exp(-t * 7 / size), hi=4000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x) + n]
    out = np.concatenate([x, np.zeros(n)]) * (1 - mix) + wet * mix
    return out


def finish(x, level=0.06):
    """Cân độ to theo RMS (to/nhỏ theo loại tiếng), cắt chói trên 5kHz, giới hạn đỉnh mềm."""
    x = x - np.mean(x)
    fade = min(len(x) // 4, int(0.01 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    x[: int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    # cắt đuôi im lặng
    a = np.abs(x)
    last = np.nonzero(a > a.max() * 0.002)[0]
    x = x[: last[-1] + 1] if len(last) else x
    x = np.asarray(filt(x, hi=5000))
    rms = np.sqrt(np.mean(x ** 2)) or 1
    x = x * (level / rms)
    return np.tanh(x / 0.7) * 0.7  # đỉnh không quá 0.7, không méo khi nhỏ


def save(path, x, sr=SR):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(sr), w.writeframes(pcm.tobytes())


# ---------------- Từng tiếng ----------------
def click(i):  # gõ gỗ nhẹ khi bấm nút
    f = (900, 1050)[i]
    return tone(f, 0.05, 80, (1, 0.15))


def chime(notes, step=0.07, d=0.45, decay=7):
    return seq([(bell(hz(m), d, decay) * (0.9 ** k), k * step) for k, m in enumerate(notes)])


def thud(f=100, d=0.25, decay=18):
    return glide(f * 1.6, f, d, 0.3) * env(d, 0.002, decay)


def soil(d=0.22, hi=1800):
    return filt(noise(d), lo=120, hi=min(hi, 1200)) * env(d, 0.004, 26)


def rustle(d=0.3):
    t = T(d)
    flutter = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * rng.uniform(18, 26) * t + rng.uniform(0, 3)))
    return filt(noise(d), lo=500, hi=3000) * flutter * np.sin(np.pi * t / d) ** 0.9


def bubbles(d, n=6, lo=500, hi=1400):
    parts = []
    for _ in range(n):
        f = rng.uniform(lo, hi)
        dd = rng.uniform(0.03, 0.07)
        parts.append((glide(f, f * 1.6, dd) * env(dd, 0.002, 40) * rng.uniform(0.3, 0.7), rng.uniform(0, d - 0.08)))
    return seq(parts)


def blip(f, d=0.07):  # tiếng nói "lí nhí" kiểu game pixel
    t = T(d)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sin(2 * np.pi * 3 * f * t)
    return bandpass(s, f * 2, 1.5) * np.sin(np.pi * t / d) ** 0.6


def groan_voice(f0, d, vowel=(500, 1000), vib=5.0):
    """Tiếng gầm gừ: âm răng cưa trầm có rung, qua 2 formant 'ô-a'."""
    t = T(d)
    f = f0 * (1 + 0.04 * np.sin(2 * np.pi * vib * t) + 0.02 * rng.standard_normal(len(t)).cumsum() / np.sqrt(len(t)) * 3)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    v = bandpass(saw, vowel[0], 3) + 0.6 * bandpass(saw, vowel[1], 4) + 0.25 * filt(noise(d), lo=300, hi=1500)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8
    return v * shape


def build():
    S = {}
    S['click'] = [click(0), click(1)]
    S['open'] = [chime([72, 79], 0.06, 0.35, 9)]
    S['close'] = [chime([79, 72], 0.06, 0.35, 9) * 0.8]
    S['cancel'] = [filt(chime([64, 60], 0.08, 0.3, 10), hi=2500)]
    S['success'] = [chime([72, 76, 79]), chime([74, 79, 83])]
    S['coin'] = [chime([76, 83], 0.06, 0.35, 10), chime([77, 84], 0.05, 0.35, 10), chime([74, 81], 0.06, 0.35, 10)]
    S['harvest'] = [seq([(soil(0.12, 1200) * 0.6, 0), (chime([76, 79, 84], 0.05, 0.4, 9) * 0.7, 0.03)]),
                    seq([(soil(0.12, 1200) * 0.6, 0), (chime([79, 83, 86], 0.05, 0.4, 9) * 0.7, 0.03)])]
    S['plant'] = [soil(0.2, 1200) + thud(110, 0.2, 25) * 0.5]
    S['grass'] = [rustle(0.28), rustle(0.22)]
    S['hoe'] = [soil(0.25, 2200) + thud(85, 0.25) * 0.8, soil(0.22, 1800) + thud(95, 0.22) * 0.8]
    S['chop'] = [tone(f, 0.25, 22, (1, 0.5, 0.25)) * 0.8 + filt(noise(0.05), lo=800, hi=5000) * env(0.05, 0.001, 80) * 0.5 for f in (310, 270)]
    S['pick'] = [sum(np.sin(2 * np.pi * f * k * T(0.35)) * env(0.35, 0.001, 9 + 4 * j) / (j + 1) for j, k in enumerate((1, 1.53, 2.47))) * 0.6
                 + filt(noise(0.04), lo=2000) * env(0.04, 0.001, 90) * 0.4 + thud(120, 0.1) * 0.3 for f in (1900, 2200)]
    S['water'] = [filt(noise(0.5), lo=300, hi=1500) * np.sin(np.pi * T(0.5) / 0.5) * 0.12 + bubbles(0.5, 7), filt(noise(0.45), lo=300, hi=1500) * np.sin(np.pi * T(0.45) / 0.45) * 0.12 + bubbles(0.45, 6)]
    S['splash'] = [filt(noise(0.5), lo=200, hi=1500) * env(0.5, 0.006, 9) * 0.5 + bubbles(0.5, 9, 300, 900) for _ in range(2)]
    S['talk'] = [blip(f) for f in (330, 380, 300, 420)]
    S['hurt'] = [glide(330, 170, 0.22) * env(0.22, 0.003, 10) * 0.8 + thud(90, 0.18) * 0.6 + filt(noise(0.08), hi=1500) * env(0.08, 0.001, 40) * 0.4,
                 glide(300, 160, 0.24) * env(0.24, 0.003, 10) * 0.8 + thud(80, 0.2) * 0.6]
    S['swing'] = [bandpass(noise(d), 500 + 120 * k, 2) * np.sin(np.pi * T(d) / d) ** 3 for k, d in enumerate((0.18, 0.16, 0.2))]
    S['monster'] = [filt(noise(0.2), lo=100, hi=600) * env(0.2, 0.004, 20) * 0.5 + thud(75 + 10 * k, 0.2) for k in range(3)]
    S['zdie'] = [seq([(groan_voice(95, 0.7, (420, 900)) * 0.8, 0), (thud(70, 0.3, 12), 0.55)]), seq([(groan_voice(85, 0.8, (380, 850)) * 0.8, 0), (thud(65, 0.3, 12), 0.65)])]
    S['boom'] = [filt(noise(1.2), hi=450) * env(1.2, 0.004, 4) + glide(90, 40, 0.8) * env(0.8, 0.003, 5)]
    S['shot'] = [filt(noise(0.25), lo=150, hi=2200) * env(0.25, 0.001, 30) + thud(140, 0.2, 22)]
    S['shotgun'] = [filt(noise(0.45), lo=100, hi=1800) * env(0.45, 0.001, 16) + thud(110, 0.35, 12)]
    S['empty'] = [tone(1300, 0.05, 90, (1, 0.6)) * 0.6 + seq([(tone(900, 0.05, 90) * 0.5, 0.06)])]
    S['groan'] = [groan_voice(f, d, v, vb) for f, d, v, vb in ((105, 1.0, (480, 950), 4.5), (92, 1.2, (420, 880), 3.8), (118, 0.9, (520, 1050), 5.5), (98, 1.1, (450, 820), 4.2))]
    S['alert'] = [chime([76, 72, 76, 72], 0.22, 0.5, 5)]
    S['ladder'] = [seq([(tone(700 + 60 * k, 0.12, 30, (1, 0.6, 0.3)) * 0.5 + thud(120, 0.08) * 0.4, k * 0.16) for k in range(3)])]
    creak = bandpass(2 * ((np.cumsum(420 + 80 * np.sin(2 * np.pi * 3 * T(0.45))) / SR) % 1) - 1, 900, 3) * np.sin(np.pi * T(0.45) / 0.45)
    S['door'] = [seq([(creak * 0.5, 0), (thud(90, 0.25) * 0.9 + soil(0.1, 1500) * 0.4, 0.42)])]
    S['heal'] = [chime([72, 76, 79, 84], 0.07, 0.6, 5)]
    S['eat'] = [seq([(filt(noise(0.07), lo=400, hi=3000) * env(0.07, 0.002, 40), k * 0.11) for k in range(3)])]
    S['bird'] = [seq([(glide(1900, 2600, 0.08) * env(0.08, 0.008, 22) * 0.6, 0), (glide(2100, 2800, 0.07) * env(0.07, 0.008, 22) * 0.5, 0.14)])]
    S['dog'] = [seq([(groan_voice(330, 0.12, (700, 1500), 0) * 0.9 + filt(noise(0.12), lo=500, hi=2500) * env(0.12, 0.002, 25) * 0.4, k * 0.25) for k in range(2)])]
    S['fire'] = []
    for _ in range(2):
        d = 1.2
        x = filt(noise(d), hi=500) * 0.25
        idx = rng.integers(0, int(d * SR) - 200, 26)
        cr = np.zeros(int(d * SR))
        cr[idx] = rng.uniform(0.4, 1, len(idx)) * rng.choice([-1, 1], len(idx))
        S['fire'].append(x + filt(cr, lo=800, hi=3000) * 1.2)
    S['levelup'] = [room(seq([(chime([72, 76, 79, 84], 0.09, 0.6, 5), 0), (sum(bell(hz(m), 1.4, 2.2) for m in (72, 76, 79, 84)) * 0.35, 0.4)]))]
    S['fanfare'] = [room(seq([(chime([67, 72, 76], 0.1, 0.5, 5), 0), (chime([74, 77, 81], 0.1, 0.5, 5), 0.35), (sum(bell(hz(m), 1.6, 2) for m in (72, 76, 79, 84, 88)) * 0.3, 0.75)]))]
    S['secret'] = [room(chime([72, 74, 76, 78, 80, 84], 0.08, 0.7, 4), 0.8, 0.3)]
    S['gameover'] = [room(seq([(chime([76, 72, 69, 67], 0.32, 1.0, 3), 0), (sum(bell(hz(m), 2.2, 1.6) for m in (60, 64, 67)) * 0.3, 1.3)]), 0.8, 0.3)]
    S['animal'] = [groan_voice(150, 0.7, (600, 1200), 3) * np.linspace(1, 0.6, int(0.7 * SR))]
    S['search'] = [seq([(rustle(0.18) * 0.8, 0), (tone(1100, 0.08, 40, (1, 0.5)) * 0.25, 0.2), (rustle(0.2) * 0.7, 0.3), (filt(noise(0.1), lo=300, hi=2000) * env(0.1, 0.002, 30) * 0.5, 0.55)])]
    return S


# Độ to (RMS) từng loại: giao diện rất nhỏ, việc đồng áng vừa, đánh nhau/nổ mới to
VOL = {
    'click': 0.02, 'open': 0.03, 'close': 0.025, 'cancel': 0.03, 'talk': 0.025,
    'coin': 0.035, 'success': 0.045, 'harvest': 0.045, 'plant': 0.045, 'grass': 0.035, 'hoe': 0.05,
    'chop': 0.05, 'pick': 0.045, 'water': 0.04, 'splash': 0.045, 'eat': 0.04, 'search': 0.04, 'door': 0.04,
    'ladder': 0.04, 'heal': 0.045, 'alert': 0.045, 'empty': 0.03, 'animal': 0.04, 'dog': 0.04,
    'bird': 0.02, 'fire': 0.015,
    'swing': 0.04, 'hurt': 0.06, 'monster': 0.05, 'groan': 0.04, 'zdie': 0.055,
    'shot': 0.07, 'shotgun': 0.08, 'boom': 0.09,
    'levelup': 0.05, 'fanfare': 0.05, 'secret': 0.045, 'gameover': 0.05,
}


# ---------------- Tiếng môi trường (lặp liền mạch) ----------------
AMB_SR = 22050


def loop_ok(x, xf):
    """Ghép đuôi vào đầu bằng crossfade → lặp không bị hở/giật."""
    head, tail = x[:xf], x[-xf:]
    w = np.linspace(0, 1, xf)
    y = x[:-xf].copy()
    y[:xf] = head * w + tail * (1 - w)
    return y


def ambient():
    r = np.random.default_rng(3)
    n = 12 * AMB_SR + AMB_SR
    t = np.arange(n) / AMB_SR
    out = {}
    # Gió: tiếng ù êm, lên xuống chậm
    w = r.standard_normal(n)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.5) * np.sin(2 * np.pi * t / 2.9 + 1)
    out['wind'] = filt(w, lo=80, hi=420, sr=AMB_SR) * gust
    # Mưa: rào rào đều + giọt lách tách
    rain = filt(r.standard_normal(n), lo=500, hi=3000, sr=AMB_SR) * 0.5
    drops = np.zeros(n)
    idx = r.integers(0, n, 500)
    drops[idx] = r.uniform(0.3, 1, len(idx))
    out['rain'] = rain + filt(drops, lo=800, hi=3500, sr=AMB_SR) * 1.2
    # Suối: róc rách trầm + bọt nước
    river = filt(r.standard_normal(n), lo=120, hi=800, sr=AMB_SR) * (0.8 + 0.2 * np.sin(2 * np.pi * t / 3.3)) * 0.6
    bub = np.zeros(n)
    for _ in range(140):
        f = r.uniform(400, 1100)
        d = r.uniform(0.02, 0.06)
        tt = np.arange(int(d * AMB_SR)) / AMB_SR
        s = np.sin(2 * np.pi * np.cumsum(f * (1 + tt / d)) / AMB_SR) * np.exp(-tt * 50)
        i = r.integers(0, n - len(s))
        bub[i:i + len(s)] += s * r.uniform(0.1, 0.35)
    out['river'] = river + bub
    for k, x in out.items():
        x = loop_ok(x, AMB_SR)
        out[k] = x / np.max(np.abs(x)) * 0.5
    return out


def main():
    S = build()
    count = 0
    for k, variants in S.items():
        for i, x in enumerate(variants):
            save(os.path.join(SFX_OUT, f'{k}_{i}.wav'), finish(x, VOL.get(k, 0.04)))
            count += 1
    for k, x in ambient().items():
        save(os.path.join(AMB_OUT, f'{k}.wav'), x, AMB_SR)
    print('ok', count, 'sfx +', 3, 'ambient')


if __name__ == '__main__':
    main()
