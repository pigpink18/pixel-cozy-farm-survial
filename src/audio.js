// ============================================================
//  Đạo diễn âm thanh: nhạc nền theo nơi / giờ / thời tiết / lúc đánh nhau,
//  tiếng môi trường (gió, mưa, suối, chim, lửa trại) và tiếng hiệu ứng có biến thể.
//  Nhạc & tiếng lấy từ bộ Ninja Adventure (CC0) — xem tools/make_audio.py
// ============================================================
import Phaser from 'phaser';
import { state, season } from './state.js';
import { festivalActive } from './festivals.js';

const BASE = 'assets/audio/';
const MUSIC_VOL = 0.42;

// Danh sách nhạc cho từng bối cảnh (phát lần lượt, nối tiếp nhau)
const PLAYLISTS = {
  farm: ['peaceful', 'chill', 'calm_village'],
  night: ['dream', 'melancholia', 'lament'],
  camp: ['lost_village', 'village'],
  forest: ['dark_forest'],
  forest_free: ['clearing'],
  town: ['ruins', 'tension'],
  town_free: ['road'],
  cave: ['cave', 'dungeon'],
  fight: ['fight'],
  fest: ['good_time'],
};
export const RADIO = [
  ['sunny', 'Ngày nắng'],
  ['good_time', 'Vui vẻ'],
  ['adventure', 'Phiêu lưu'],
  ['boat', 'Thuyền trôi'],
];

// Tiếng hiệu ứng: số biến thể, âm lượng, khoảng cao độ ngẫu nhiên
export const SFX_DEF = {
  click: { n: 2, v: 0.6, r: [0.97, 1.05] },
  open: { n: 1, v: 0.5 },
  close: { n: 1, v: 0.45 },
  cancel: { n: 1, v: 0.6 },
  success: { n: 2, v: 0.7 },
  coin: { n: 3, v: 0.6, r: [0.95, 1.08] },
  harvest: { n: 2, v: 0.7, r: [0.95, 1.08] },
  plant: { n: 1, v: 0.7, r: [0.9, 1.15] },
  grass: { n: 2, v: 0.7, r: [0.9, 1.15] },
  hoe: { n: 2, v: 0.8, r: [0.9, 1.1] },
  chop: { n: 2, v: 0.8, r: [0.9, 1.1] },
  pick: { n: 2, v: 0.8, r: [0.9, 1.12] },
  water: { n: 2, v: 0.7, r: [0.95, 1.1] },
  splash: { n: 2, v: 0.7, r: [0.9, 1.1] },
  talk: { n: 4, v: 0.5, r: [0.95, 1.1] },
  hurt: { n: 2, v: 0.9 },
  swing: { n: 3, v: 0.6, r: [0.9, 1.15] },
  monster: { n: 3, v: 0.7, r: [0.9, 1.1] },
  zdie: { n: 2, v: 0.8, r: [0.6, 0.75] },
  boom: { n: 1, v: 0.9, r: [0.85, 0.95] },
  shot: { n: 1, v: 0.75, r: [1.35, 1.5] },
  shotgun: { n: 1, v: 0.9, r: [0.9, 1.0] },
  rifle: { n: 1, v: 0.85, r: [1.1, 1.2], file: 'shot' },
  empty: { n: 1, v: 0.7, r: [0.6, 0.65] },
  groan: { n: 4, v: 0.7, r: [0.36, 0.48] }, // giọng người nói chậm lại → tiếng gầm gừ
  alert: { n: 1, v: 0.6 },
  ladder: { n: 1, v: 0.6 },
  door: { n: 1, v: 0.5, r: [0.8, 0.9] },
  heal: { n: 1, v: 0.7 },
  eat: { n: 1, v: 0.7, r: [0.9, 1.1] },
  bird: { n: 1, v: 0.18, r: [0.85, 1.3] },
  dog: { n: 1, v: 0.5, r: [0.9, 1.1] },
  fire: { n: 2, v: 0.2, r: [0.8, 1.2] },
  levelup: { n: 1, v: 0.7, jingle: true },
  fanfare: { n: 1, v: 0.7, jingle: true },
  secret: { n: 1, v: 0.7, jingle: true },
  gameover: { n: 1, v: 0.7, jingle: true },
  animal: { n: 1, v: 0.6, r: [0.95, 1.05] },
  search: { n: 1, v: 0.7, r: [0.9, 1.1] },
};
const AMB = ['wind', 'rain', 'river'];
const OUTDOOR = new Set(['farm', 'village', 'forest', 'town', 'quarry']);
const INDOOR = new Set(['home', 'shop', 'npchome']);

export function loadSfx(load) {
  for (const [k, d] of Object.entries(SFX_DEF)) {
    if (d.file) continue;
    for (let i = 0; i < d.n; i++) load.audio(`sfx_${k}_${i}`, `${BASE}sfx/${k}_${i}.wav`);
  }
}

export const musicOn = () => !state.muted && !state.musicOff;

export default class AudioDirector {
  constructor(ui) {
    this.ui = ui;
    this.sound = ui.sound;
    this.cur = null; // { list, idx, snd, key }
    this.listId = null;
    this.radio = -1; // đài trong nhà: -1 = tắt
    this.amb = {};
    this.ambVol = {};
    this.lastPlay = {};
    this.nextBird = 0;
    this.nextFire = 0;
    this.duckUntil = 0;
    this.started = false;
    ui.time.addEvent({ delay: 400, loop: true, callback: () => this.tick() });
    ui.events.once('shutdown', () => this.stopAll());
  }

  // Đổi âm lượng mượt; an toàn cả khi tiếng đã bị huỷ giữa chừng
  fade(snd, to, ms, done) {
    if (!snd) return;
    if (snd._fade) snd._fade.remove();
    const o = { v: snd.volume };
    snd._fade = this.ui.tweens.add({
      targets: o, v: to, duration: ms,
      onUpdate: () => snd.manager && !snd.pendingRemove && (snd.volume = o.v),
      onComplete: () => {
        snd._fade = null;
        if (done && snd.manager) done();
      },
    });
  }
  fadeOut(snd, ms) {
    this.fade(snd, 0, ms, () => snd.destroy());
  }

  get world() {
    return this.ui.scene.get('World');
  }

  // ---------- Tiếng hiệu ứng ----------
  sfx(name, volume = 0.5) {
    const d = SFX_DEF[name];
    if (!d || state.muted) return;
    const now = this.ui.time.now;
    if (now - (this.lastPlay[name] || 0) < 45) return; // tránh chồng cùng một tiếng
    this.lastPlay[name] = now;
    const key = `sfx_${d.file || name}_${Math.floor(Math.random() * d.n)}`;
    if (!this.ui.cache.audio.exists(key)) return;
    const rate = d.r ? Phaser.Math.FloatBetween(d.r[0], d.r[1]) : 1;
    this.sound.play(key, { volume: Math.min(1, volume * 2 * d.v), rate });
    if (d.jingle) this.duck(name === 'gameover' ? 3500 : 2200);
  }

  // Nhạc nhỏ lại khi có đoạn nhạc thưởng (lên cấp, giải phóng vùng...)
  duck(ms) {
    this.duckUntil = this.ui.time.now + ms;
    this.applyMusicVol(0.5);
  }

  // ---------- Đài trong nhà ----------
  nextRadio() {
    this.radio = this.radio + 1 >= RADIO.length ? -1 : this.radio + 1;
    this.tick(true);
    return this.radio < 0 ? null : RADIO[this.radio][1];
  }

  // ---------- Chọn nhạc ----------
  pickList() {
    const w = this.world;
    const map = w?.mapId || 'farm';
    if (map === 'home' && this.radio >= 0) return `radio${this.radio}`;
    if (map !== 'home') this.radio = -1;
    const c = w?.combat;
    if (c && w.time && c.chaseAt && w.time.now - c.chaseAt < 5000) return 'fight';
    const h = (state.time || 0) / 60;
    const night = h >= 19.5 || h < 5;
    if (map === 'mine' || map === 'quarry') return 'cave';
    if (map === 'forest' || map === 'town') return (state.zones?.[map]?.infection ?? 100) <= 0 ? `${map}_free` : map;
    if (map === 'village' || map === 'shop' || map === 'npchome') {
      if (festivalActive()) return 'fest';
      return night && map === 'village' ? 'night' : 'camp';
    }
    return night ? 'night' : 'farm';
  }

  listTracks(id) {
    if (id.startsWith('radio')) return [RADIO[+id.slice(5)][0]];
    return PLAYLISTS[id] || PLAYLISTS.farm;
  }

  targetVol() {
    const map = this.world?.mapId;
    let v = MUSIC_VOL;
    if (INDOOR.has(map) && this.radio < 0) v *= 0.7;
    if (this.listId === 'fight') v *= 1.1;
    if (this.ui.time.now < this.duckUntil) v *= 0.3;
    return musicOn() ? v : 0;
  }

  applyMusicVol(fadeMs = 600) {
    this.fade(this.cur?.snd, this.targetVol(), fadeMs);
  }

  // Tải nhạc khi cần (không bắt người chơi chờ lúc mở game)
  ensure(key, url, cb) {
    if (this.ui.cache.audio.exists(key)) return cb();
    const load = this.ui.load;
    load.once(`filecomplete-audio-${key}`, cb);
    if (!this.loading?.has(key)) {
      (this.loading ||= new Set()).add(key);
      load.audio(key, url);
      if (!load.isLoading()) load.start();
    }
  }

  switchTo(listId) {
    this.listId = listId;
    const tracks = this.listTracks(listId);
    // Bắt đầu ở bài ngẫu nhiên cho đỡ nhàm
    const idx = Math.floor(Math.random() * tracks.length);
    this.playTrack(listId, idx, listId === 'fight' ? 500 : 1800);
  }

  playTrack(listId, idx, fade) {
    const tracks = this.listTracks(listId);
    const name = tracks[idx % tracks.length];
    const key = `mus_${name}`;
    this.ensure(key, `${BASE}music/${name}.m4a`, () => {
      if (this.listId !== listId) return; // đã đổi bối cảnh trong lúc tải
      if (this.cur?.key === key && this.cur.snd?.isPlaying) return;
      const old = this.cur?.snd;
      if (old) this.fadeOut(old, fade);
      const snd = this.sound.add(key, { volume: 0 });
      snd.once('complete', () => {
        if (this.cur?.snd !== snd) return;
        snd._fade?.remove();
        snd.destroy();
        this.cur = null;
        // nghỉ một chút rồi sang bài kế
        this.ui.time.delayedCall(listId === 'fight' ? 0 : 2500, () => this.listId === listId && !this.cur && this.playTrack(listId, idx + 1, 1500));
      });
      snd.play();
      this.cur = { listId, idx, key, snd };
      this.fade(snd, this.targetVol(), fade);
    });
  }

  // ---------- Tiếng môi trường ----------
  ambTargets() {
    const w = this.world;
    const map = w?.mapId;
    const out = OUTDOOR.has(map);
    const h = (state.time || 0) / 60;
    const night = h >= 19.5 || h < 5;
    const rain = state.weather === 'rain' && map !== 'mine' && map !== 'quarry';
    const zone = map === 'forest' || map === 'town';
    const t = { wind: 0, rain: 0, river: 0 };
    if (out) t.wind = zone ? 0.32 : night ? 0.2 : state.weather === 'snow' ? 0.25 : 0.08;
    if (rain) t.rain = out ? 0.45 : INDOOR.has(map) ? 0.15 : 0;
    if (out && w?.waterTiles?.size && w.player) {
      const px = w.player.x / 16, py = w.player.y / 16;
      let best = 99;
      for (const k of w.waterTiles) {
        const i = k.indexOf(',');
        const d = Math.hypot(+k.slice(0, i) - px, +k.slice(i + 1) - py);
        if (d < best) best = d;
      }
      t.river = 0.35 * Phaser.Math.Clamp(1 - (best - 1) / 7, 0, 1);
    }
    return t;
  }

  tickAmbient() {
    const t = this.ambTargets();
    for (const k of AMB) {
      const want = state.muted ? 0 : t[k];
      if (want > 0 && !this.amb[k] && !this.amb[`_${k}`]) {
        this.amb[`_${k}`] = true;
        this.ensure(`amb_${k}`, `${BASE}amb/${k}.wav`, () => {
          const snd = this.sound.add(`amb_${k}`, { loop: true, volume: 0 });
          snd.play();
          this.amb[k] = snd;
        });
      }
      const snd = this.amb[k];
      if (snd && !snd._fade && Math.abs(snd.volume - want) > 0.01) this.fade(snd, want, 900);
    }
    // Chim hót ban ngày, lửa trại tí tách
    const w = this.world;
    const map = w?.mapId;
    const now = this.ui.time.now;
    const h = (state.time || 0) / 60;
    const calm = map === 'farm' || map === 'village' || (map === 'forest' && (state.zones?.forest?.infection ?? 100) <= 0);
    if (calm && h >= 5.5 && h < 18 && state.weather === 'sun' && now > this.nextBird && season().id !== 'winter') {
      this.nextBird = now + Phaser.Math.Between(3500, 9000);
      const n = Phaser.Math.Between(1, 3);
      for (let i = 0; i < n; i++) this.ui.time.delayedCall(i * Phaser.Math.Between(110, 170), () => this.sfx('bird', 0.5));
    }
    if (map === 'village' && w?.player && now > this.nextFire) {
      this.nextFire = now + Phaser.Math.Between(500, 1300);
      const d = Phaser.Math.Distance.Between(w.player.x, w.player.y, 20 * 16 + 8, 15 * 16 + 8);
      if (d < 110) this.sfx('fire', 0.5 * (1 - d / 110) + 0.05);
    }
  }

  // ---------- Vòng lặp ----------
  tick(force = false) {
    if (this.sound.locked) return;
    this.started = true;
    const id = this.pickList();
    // Đánh nhau xong: chờ một chút mới đổi lại nhạc để khỏi giật cục
    if (force || id !== this.listId) {
      if (musicOn()) this.switchTo(id);
      else this.listId = null;
    } else if (!this.cur && musicOn() && this.listId) this.playTrack(this.listId, 0, 1500);
    if (!musicOn() && this.cur) {
      const old = this.cur.snd;
      this.cur = null;
      this.listId = null;
      this.fadeOut(old, 500);
    }
    if (this.cur && !this.cur.snd._fade) {
      const v = this.targetVol();
      if (Math.abs(this.cur.snd.volume - v) > 0.01) this.applyMusicVol(800);
    }
    this.tickAmbient();
  }

  stopAll() {
    this.cur?.snd?.destroy();
    for (const k of AMB) this.amb[k]?.destroy();
  }
}
