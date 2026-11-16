"""Tạo tiếng súng & tiếng zombie (tổng hợp bằng code, không dùng file ngoài).
Chạy: python3 tools/make_sfx_zombie.py → public/assets/audio/sfx/{shot,shotgun,groan,search}.wav
"""
import math, os, random, struct, wave
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/audio/sfx')
SR = 22050
def save(name, samples):
    with wave.open(os.path.join(OUT, name + '.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s)) * 30000)) for s in samples))
def shot(dur, thump, seed):
    r = random.Random(seed); out = []; lp = 0
    for i in range(int(SR * dur)):
        t = i / SR
        n = r.uniform(-1, 1); lp += (n - lp) * 0.35
        env = math.exp(-t * 28)
        out.append((lp * 0.9 + math.sin(2 * math.pi * thump * t * (1 - t * 2)) * 0.8 * math.exp(-t * 18)) * env)
    return out
def groan():
    r = random.Random(3); out = []; lp = 0
    for i in range(int(SR * 0.9)):
        t = i / SR
        f = 85 + 18 * math.sin(t * 7) - t * 25
        saw = ((t * f) % 1) * 2 - 1
        lp += (saw - lp) * 0.12
        env = min(1, t * 8) * math.exp(-t * 2.2)
        out.append((lp + r.uniform(-0.15, 0.15)) * env * 0.9)
    return out
def search():
    r = random.Random(4); out = []
    for i in range(int(SR * 0.35)):
        t = i / SR
        env = (math.sin(t * 60) > 0.2) * math.exp(-t * 3)
        out.append(r.uniform(-1, 1) * 0.35 * env)
    return out
save('shot', shot(0.35, 110, 1)); save('shotgun', shot(0.55, 70, 2)); save('groan', groan()); save('search', search())
print('ok')
