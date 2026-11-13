// ============================================================
//  Nhạc nền đồng quê vui tươi tạo bằng Web Audio (không cần file nhạc)
//  Hợp âm TRƯỞNG + giai điệu kalimba leng keng + bass nảy + trống nhẹ & tiếng lắc.
//  Mỗi mùa / khu vực một giọng và tốc độ riêng.
// ============================================================

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const PENTA = [0, 2, 4, 7, 9]; // ngũ cung trưởng — nghe tươi sáng, không bao giờ "lệch"

// bpm, key = nốt gốc giai điệu (MIDI), chords = [bass, ...nốt hợp âm]
const STYLES = {
  // Xuân: Đô trưởng  C – G – Am – F
  spring: { bpm: 100, key: 72, chords: [[48, 60, 64, 67, 72], [43, 59, 62, 67, 71], [45, 60, 64, 69, 72], [41, 60, 65, 69, 72]] },
  // Hạ: Rê trưởng  D – A – Bm – G (nhanh, rộn ràng)
  summer: { bpm: 108, key: 74, chords: [[50, 62, 66, 69, 74], [45, 61, 64, 69, 73], [47, 62, 66, 71, 74], [43, 62, 67, 71, 74]] },
  // Thu: Fa trưởng  F – C – Dm – Bb (ấm áp)
  autumn: { bpm: 94, key: 72, chords: [[41, 60, 65, 69, 72], [48, 60, 64, 67, 72], [50, 62, 65, 69, 74], [46, 62, 65, 70, 74]] },
  // Đông: Son trưởng  G – Em – C – D (nhẹ nhàng)
  winter: { bpm: 86, key: 74, chords: [[43, 59, 62, 67, 71], [40, 59, 64, 67, 71], [48, 60, 64, 67, 72], [50, 62, 66, 69, 74]] },
  // Làng: La trưởng  A – E – F#m – D (vui nhộn)
  village: { bpm: 104, key: 73, chords: [[45, 61, 64, 69, 73], [40, 59, 64, 68, 71], [42, 61, 66, 69, 73], [50, 62, 66, 69, 74]] },
};

export default class Lofi {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.style = 'spring';
    this.pending = null;
    this.playing = false;
    this.melodyIdx = 5;

    // Chuỗi tổng: lọc nhẹ phần chói → âm lượng → đích
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 5200;
    this.filter.Q.value = 0.5;
    this.filter.connect(this.out);
    this.out.connect(destination);

    // Rung nhẹ cao độ cho ấm
    this.wobble = ctx.createOscillator();
    this.wobble.frequency.value = 5;
    this.wobbleDepth = ctx.createGain();
    this.wobbleDepth.gain.value = 3; // cent
    this.wobble.connect(this.wobbleDepth);
    this.wobble.start();

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // ---------- Điều khiển ----------
  play(style, volume = 0.85) {
    if (STYLES[style]) {
      if (this.playing) this.pending = style;
      else this.style = style;
    }
    this.out.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.8);
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.bar = 0;
    this.next = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  stop() {
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    clearInterval(this.timer);
    this.playing = false;
  }

  // ---------- Lập lịch (nhìn trước 1.5 giây) ----------
  schedule() {
    while (this.next < this.ctx.currentTime + 1.5) {
      const st = STYLES[this.style];
      const six = 60 / st.bpm / 4; // một nốt móc kép
      const s = this.step % 16;
      if (s === 0) {
        if (this.pending) {
          this.style = this.pending;
          this.pending = null;
        }
        this.chord = STYLES[this.style].chords[this.bar % 4];
        this.bar++;
      }
      const swing = s % 2 ? six * 0.12 : 0;
      this.playStep(s, this.next + swing, six);
      this.next += six;
      this.step++;
    }
  }

  playStep(s, t, six) {
    const [bass, ...notes] = this.chord;
    const r = Math.random;
    // Trống nhẹ: kick 1 & 3, vỗ tay 2 & 4, tiếng lắc đều
    if (s === 0 || s === 8 || (s === 7 && r() < 0.3)) this.kick(t);
    if (s === 4 || s === 12) this.clap(t);
    this.shaker(t, s % 4 === 2 ? 0.05 : 0.025);
    // Hợp âm gảy kiểu đàn: đầu nhịp + nhịp lửng
    if (s === 0) this.keys(notes, t, six * 6, 1);
    if (s === 6 || s === 10) this.keys(notes.slice(1), t, six * 3, 0.55);
    // Bass nảy: gốc – quãng 5 – gốc (quãng 8) – quãng 5
    const bassLine = { 0: 0, 4: 7, 8: 12, 12: 7 };
    if (bassLine[s] !== undefined) this.bass(bass - 12 + bassLine[s], t, six * 3);
    // Giai điệu kalimba theo ngũ cung trưởng, đi từng bước cho mượt
    if (s % 2 === 0 && r() < 0.55) {
      this.melodyIdx = Math.max(0, Math.min(9, this.melodyIdx + [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)]));
      const key = STYLES[this.style].key;
      const n = key - 12 + Math.floor(this.melodyIdx / 5) * 12 + PENTA[this.melodyIdx % 5];
      this.pluck(n, t, 0.9);
    }
  }

  // ---------- Nhạc cụ ----------
  voice(type, freq, t, peak, decay, attack = 0.005) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    this.wobbleDepth.connect(o.detune);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    o.connect(g).connect(this.filter);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    o.onended = () => {
      this.wobbleDepth.disconnect(o.detune);
      g.disconnect();
    };
  }

  // Đàn gảy (hợp âm): tam giác + bồi âm quãng 8
  keys(notes, t, dur, vel) {
    notes.forEach((n, i) => {
      const tt = t + i * 0.012;
      this.voice('triangle', midi(n), tt, 0.045 * vel, Math.min(dur, 0.9));
      this.voice('sine', midi(n + 12), tt, 0.012 * vel, Math.min(dur, 0.5));
    });
  }

  // Kalimba: tiếng leng keng tắt nhanh
  pluck(n, t, vel) {
    this.voice('sine', midi(n), t, 0.09 * vel, 0.45, 0.002);
    this.voice('sine', midi(n) * 3.01, t, 0.018 * vel, 0.12, 0.002);
  }

  bass(n, t, dur) {
    this.voice('triangle', midi(n), t, 0.15, Math.max(0.2, dur), 0.01);
    this.voice('sine', midi(n), t, 0.1, Math.max(0.2, dur), 0.01);
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(this.filter);
    o.start(t);
    o.stop(t + 0.3);
  }

  noiseHit(t, type, freq, gain, decay) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(f).connect(g).connect(this.filter);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }

  clap(t) {
    this.noiseHit(t, 'bandpass', 1800, 0.14, 0.12);
    this.noiseHit(t + 0.012, 'bandpass', 2200, 0.08, 0.1);
  }

  shaker(t, gain) {
    this.noiseHit(t, 'highpass', 7000, gain * (0.8 + Math.random() * 0.4), 0.04);
  }
}
