// ============================================================
//  Hiệu ứng & ánh sáng: bóng đổ, cây đung đưa, bướm / cánh hoa / lá / đom đóm,
//  màu trời theo giờ (bình minh, hoàng hôn, đêm), đèn cửa sổ, nước lấp lánh, bụi chân.
// ============================================================
import Phaser from 'phaser';
import { TILE } from './config.js';
import { state, season } from './state.js';

// ---------- Texture hiệu ứng (gọi trong BootScene) ----------
export function makeFxTextures(scene) {
  const canvas = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext(), w, h);
    t.refresh();
  };
  // Bóng mềm hình elip
  canvas('fx_shadow', 32, 12, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(30,40,20,0.55)');
    g.addColorStop(0.6, 'rgba(30,40,20,0.35)');
    g.addColorStop(1, 'rgba(30,40,20,0)');
    ctx.save();
    ctx.scale(1, h / w);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
  });
  // Quầng sáng (đèn, đom đóm)
  canvas('fx_glow', 32, 32, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,230,160,1)');
    g.addColorStop(0.35, 'rgba(255,200,110,0.45)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  // Cọ "đục lỗ" ánh sáng trong lớp bóng tối (trắng ở giữa, mờ dần ra rìa)
  canvas('light_brush', 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  const px = (key, w, h, pts) =>
    canvas(key, w, h, (ctx) => pts.forEach(([x, y, c]) => ((ctx.fillStyle = c), ctx.fillRect(x, y, 1, 1))));
  px('fx_petal', 3, 2, [[0, 0, '#ffc8d6'], [1, 0, '#ffe0e8'], [1, 1, '#f39ab4'], [2, 1, '#ffc8d6']]);
  px('fx_leaf', 3, 3, [[1, 0, '#e8923f'], [0, 1, '#c8642e'], [1, 1, '#f2b24a'], [2, 1, '#e8923f'], [1, 2, '#9a4a2a']]);
  px('fx_spark', 3, 3, [[1, 0, '#ffffff'], [0, 1, '#dff4ff'], [1, 1, '#ffffff'], [2, 1, '#dff4ff'], [1, 2, '#ffffff']]);
  px('fx_eyes', 4, 1, [[0, 0, '#ffffff'], [3, 0, '#ffffff']]); // mắt zombie phát sáng trong đêm
  px('fx_eye', 1, 1, [[0, 0, '#ffffff']]);
  // Vệt chém lưỡi liềm (trắng sáng ở mép ngoài, mờ dần vào trong) — xoay theo hướng vung
  canvas('fx_slash', 48, 48, (ctx, w) => {
    const c = w / 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.lineWidth = 7 - i;
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + i * 0.13})`;
      ctx.arc(c, c, 18 - i * 0.4, -1.25 + i * 0.05, 1.25 - i * 0.05);
      ctx.stroke();
    }
  });
  px('fx_blood', 2, 2, [[0, 0, '#c42a24'], [1, 0, '#8a1414'], [0, 1, '#8a1414'], [1, 1, '#5e0c0e']]);
  px('fx_dust', 2, 2, [[0, 0, '#c9a27a'], [1, 0, '#b48a62'], [0, 1, '#b48a62'], [1, 1, '#9c7452']]);
  // Bướm 2 khung (cánh mở / khép)
  canvas('fx_butterfly', 10, 4, (ctx) => {
    const dot = (x, y, c) => ((ctx.fillStyle = c), ctx.fillRect(x, y, 1, 1));
    [[0, 0], [0, 1], [1, 1], [3, 0], [4, 0], [4, 1], [3, 1]].forEach(([x, y]) => dot(x, y, '#fff6d8'));
    [[2, 1], [2, 2]].forEach(([x, y]) => dot(x, y, '#3d3333'));
    [[0, 2], [4, 2]].forEach(([x, y]) => dot(x, y, '#ffd34d'));
    [[6, 1], [7, 1], [8, 1], [6, 2], [8, 2]].forEach(([x, y]) => dot(x, y, '#fff6d8'));
    [[7, 1], [7, 2]].forEach(([x, y]) => dot(x, y, '#3d3333'));
  });
  scene.textures.get('fx_butterfly').add(0, 0, 0, 0, 5, 4);
  scene.textures.get('fx_butterfly').add(1, 0, 5, 0, 5, 4);
}

// Bảng màu trời theo giờ: [phút, r, g, b] (1 = giữ nguyên màu)
const SKY = [
  [6 * 60, 1.0, 0.9, 0.78], // bình minh vàng nhạt
  [8 * 60, 1.0, 1.0, 1.0],
  [16 * 60, 1.0, 1.0, 1.0],
  [17.5 * 60, 1.04, 0.93, 0.8], // nắng chiều vàng
  [19 * 60, 0.98, 0.72, 0.72], // hoàng hôn cam hồng
  [20.5 * 60, 0.72, 0.66, 0.9], // chạng vạng tím (bóng tối do lớp tối lo, xem darkness)
  [22 * 60, 0.62, 0.68, 0.95], // đêm xanh lạnh
  [26 * 60, 0.6, 0.66, 0.92],
];
function skyAt(t) {
  for (let i = 1; i < SKY.length; i++) {
    if (t <= SKY[i][0]) {
      const [t0, ...a] = SKY[i - 1];
      const [t1, ...b] = SKY[i];
      const k = (t - t0) / (t1 - t0);
      return a.map((v, j) => v + (b[j] - v) * k);
    }
  }
  return SKY[SKY.length - 1].slice(1);
}
export const nightFactor = (t = state.time) => Phaser.Math.Clamp((t - 18.5 * 60) / 120, 0, 1);

export default class WorldFX {
  constructor(scene) {
    this.s = scene;
    this.outdoor = ['farm', 'village', 'forest', 'quarry', 'town', 'cliff', 'beach'].includes(scene.mapId);
    this.follow = []; // bóng đi theo sprite di chuyển
    this.lights = [];
    this.parts = [];
    this.nextDust = 0;
    this.sources = []; // nguồn sáng đục thủng bóng tối: { x, y, r, flicker }
    this.darkness = 0;
    const cam = scene.cameras.main;
    // Màu trời bằng ColorMatrix (WebGL); nếu không có thì UIScene dùng lớp phủ tối như cũ
    this.cm = cam.postFX?.addColorMatrix?.() || null;
    scene.registry.set('skyFx', !!this.cm);
    // Viền tối quanh màn hình — không khí u ám, mắt dồn vào giữa
    if (this.outdoor) cam.postFX?.addVignette?.(0.5, 0.5, ['forest', 'town'].includes(scene.mapId) ? 0.78 : 0.86, 0.32);
  }

  // Nguồn sáng thêm (lửa, thùng phuy cháy...) — chỉ đục bóng tối, quầng sáng tự vẽ riêng
  addSource(x, y, r, flicker = false) {
    this.sources.push({ x, y, r, flicker });
  }

  // ---------- Bóng tối ban đêm: chỉ sáng quanh lửa, đèn, cửa sổ và quanh người chơi ----------
  darknessLevel() {
    const s = this.s;
    if (!this.outdoor) return 0;
    if (s.forceDark != null) return s.forceDark; // đoạn mở đầu: độ tối cố định
    const zone = s.mapId === 'forest' || s.mapId === 'town';
    let d = nightFactor() * (zone ? 0.92 : 0.84);
    // trước bình minh (sau nửa đêm hoặc trước 6h) vẫn tối
    const h = state.time / 60;
    if (h < 6) d = Math.max(d, (zone ? 0.92 : 0.84) * Phaser.Math.Clamp((6 - h) / 1, 0, 1));
    if (state.weather === 'rain') d = Math.max(d, 0.18);
    if (zone && (state.zones?.[s.mapId]?.infection ?? 100) > 0) d = Math.max(d, 0.12); // vùng nhiễm: âm u cả ngày
    return d;
  }

  updateDark(time) {
    const s = this.s;
    const d = (this.darkness = this.darknessLevel());
    if (d <= 0.01) {
      this.darkRT?.setVisible(false);
      return;
    }
    const cam = s.cameras.main;
    const v = cam.worldView;
    if (!this.darkRT) {
      const w = Math.ceil(cam.width / cam.zoom) + 8, h = Math.ceil(cam.height / cam.zoom) + 8;
      this.darkRT = s.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(9350);
      this.brush = s.make.image({ key: 'light_brush', add: false }).setOrigin(0.5);
    }
    const rt = this.darkRT.setVisible(true);
    const ox = Math.floor(v.x) - 4, oy = Math.floor(v.y) - 4;
    rt.setPosition(ox, oy);
    rt.clear();
    rt.fill(0x060a1c, d);
    const hole = (x, y, r) => {
      if (x + r < ox || y + r < oy || x - r > ox + rt.width || y - r > oy + rt.height) return;
      this.brush.setPosition(x - ox, y - oy).setScale((r * 2) / 128);
      rt.erase(this.brush);
    };
    // Người chơi luôn có chút ánh đèn quanh mình
    const p = s.player;
    hole(p.x, p.y - 8, 52 + Math.sin(time / 200) * 1.5);
    for (const l of this.sources) {
      const f = l.flicker ? 1 + Math.sin(time / 90 + l.x) * 0.05 + Math.sin(time / 37 + l.y) * 0.03 : 1;
      hole(l.x, l.y, l.r * f);
    }
  }

  // ---------- Bóng đổ ----------
  shadow(x, y, w, depth = -600) {
    return this.s.add.image(x, y, 'fx_shadow').setDisplaySize(w, Math.max(4, w * 0.36)).setDepth(depth).setAlpha(0.85);
  }

  followShadow(sprite, w, dy = 0) {
    const sh = this.shadow(sprite.x, sprite.y + dy, w);
    this.follow.push({ sprite, sh, dy });
    return sh;
  }

  // ---------- Cây đung đưa ----------
  sway(img, amount = 1) {
    this.s.tweens.add({
      targets: img,
      angle: { from: -0.7 * amount, to: 0.7 * amount },
      duration: Phaser.Math.Between(1800, 2800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 1500),
    });
  }

  // ---------- Đèn cửa sổ (sáng dần khi trời tối) ----------
  light(x, y, size = 40) {
    // Hai lớp: quầng rộng ấm + lõi sáng, để vẫn nổi rõ khi trời tối
    const gs = [];
    for (const [k, tint] of [[1.6, 0xffb060], [0.7, 0xfff0c0]]) {
      const g = this.s.add.image(x, y, 'fx_glow').setDisplaySize(size * k, size * k).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(9400).setAlpha(0);
      this.lights.push(g);
      gs.push(g);
    }
    const src = { x, y, r: size * 1.25, flicker: size >= 80 };
    this.sources.push(src);
    // Gỡ đèn (vd. nhổ đuốc)
    return {
      destroy: () => {
        for (const g of gs) {
          g.destroy();
          const j = this.lights.indexOf(g);
          if (j >= 0) this.lights.splice(j, 1);
        }
        const i = this.sources.indexOf(src);
        if (i >= 0) this.sources.splice(i, 1);
      },
    };
  }

  // ---------- Nước lấp lánh ----------
  sparkleWater(x0, y0, x1, y1) {
    const n = Math.max(2, Math.round(((x1 - x0 + 1) * (y1 - y0 + 1)) / 6));
    for (let i = 0; i < n; i++) {
      const sp = this.s.add.image(0, 0, 'fx_spark').setDepth(-840).setAlpha(0);
      const blink = () => {
        sp.setPosition(Phaser.Math.Between(x0 * TILE + 3, (x1 + 1) * TILE - 3), Phaser.Math.Between(y0 * TILE + 3, (y1 + 1) * TILE - 3));
        this.s.tweens.add({ targets: sp, alpha: { from: 0, to: 0.9 }, duration: 380, yoyo: true, delay: Phaser.Math.Between(300, 3500), onComplete: blink });
      };
      blink();
    }
  }

  sparkleTiles(tiles) {
    const n = Math.max(2, Math.round(tiles.length / 6));
    for (let i = 0; i < n; i++) {
      const sp = this.s.add.image(0, 0, 'fx_spark').setDepth(-840).setAlpha(0);
      const blink = () => {
        const [x, y] = tiles[Phaser.Math.Between(0, tiles.length - 1)];
        sp.setPosition(x * TILE + Phaser.Math.Between(3, 13), y * TILE + Phaser.Math.Between(3, 13));
        this.s.tweens.add({ targets: sp, alpha: { from: 0, to: 0.9 }, duration: 380, yoyo: true, delay: Phaser.Math.Between(300, 3500), onComplete: blink });
      };
      blink();
    }
  }

  // ---------- Bướm, cánh hoa, lá, đom đóm ----------
  spawnAmbient() {
    const sid = season().id;
    const s = this.s;
    const rnd = (a, b) => Phaser.Math.FloatBetween(a, b);
    if (sid !== 'winter') {
      for (let i = 0; i < 6; i++)
        this.parts.push({ kind: 'butterfly', img: s.add.image(0, 0, 'fx_butterfly', 0).setDepth(8700), t: rnd(0, 10), sp: rnd(0.6, 1.2), tint: [0xffffff, 0xffe28a, 0xb8e0ff, 0xffc0d8][i % 4] });
      for (let i = 0; i < 14; i++)
        this.parts.push({ kind: 'firefly', img: s.add.image(0, 0, 'fx_glow').setDisplaySize(12, 12).setTint(0xd8ff80).setBlendMode(Phaser.BlendModes.ADD).setDepth(9450), t: rnd(0, 10), sp: rnd(0.5, 1) });
    }
    if (sid === 'spring' || sid === 'autumn')
      for (let i = 0; i < 16; i++)
        this.parts.push({ kind: 'fall', img: s.add.image(0, 0, sid === 'spring' ? 'fx_petal' : 'fx_leaf').setDepth(9300), t: rnd(0, 10), sp: rnd(0.6, 1.3) });
    // vị trí ban đầu ngẫu nhiên trong khung nhìn
    const v = s.cameras.main.worldView;
    for (const p of this.parts) {
      p.x = rnd(v.x, v.right);
      p.y = rnd(v.y, v.bottom);
      p.tint && p.img.setTint(p.tint);
    }
  }

  update(time, delta) {
    const s = this.s;
    const dt = delta / 1000;
    for (const f of this.follow) {
      if (!f.sprite.active) {
        f.sh.destroy();
        continue;
      }
      f.sh.setPosition(f.sprite.x, f.sprite.y + f.dy).setVisible(f.sprite.visible);
    }
    this.follow = this.follow.filter((f) => f.sprite.active);

    // Màu trời
    const t = state.time;
    const night = nightFactor(t);
    if (this.cm) {
      const [r, g, b] = s.mapId === 'mine' ? [0.78, 0.74, 0.86] : ['home', 'shop', 'npchome', 'ruin'].includes(s.mapId) ? [1, 0.97, 0.92] : skyAt(t);
      this.cm.reset();
      // Tận thế: ngoài trời bạc màu, ngả vàng xám
      const k = this.outdoor ? [0.97, 0.95, 0.86] : [1, 1, 1];
      this.cm.set([r * k[0], 0, 0, 0, 0, 0, g * k[1], 0, 0, 0, 0, 0, b * k[2], 0, 0, 0, 0, 0, 1, 0]);
      if (this.outdoor) this.cm.saturate(-0.28, true);
    }
    for (const l of this.lights) l.setAlpha(Math.min(1, night * 1.2) * (0.92 + Math.sin(time / 300 + l.x) * 0.08));

    this.updateDark(time);

    // Hạt bay
    const v = s.cameras.main.worldView;
    const wrap = (p) => {
      if (p.x < v.x - 20) p.x = v.right + 10;
      if (p.x > v.right + 20) p.x = v.x - 10;
      if (p.y < v.y - 20) p.y = v.bottom + 10;
      if (p.y > v.bottom + 20) p.y = v.y - 10;
    };
    const day = t >= 7 * 60 && t < 18 * 60 && state.weather === 'sun';
    for (const p of this.parts) {
      p.t += dt * p.sp;
      if (p.kind === 'butterfly') {
        p.img.setVisible(day);
        p.x += Math.cos(p.t * 0.7) * 14 * dt;
        p.y += Math.sin(p.t * 1.9) * 10 * dt - 2 * dt;
        p.img.setFrame(Math.floor(time / 120 + p.t * 10) % 2);
      } else if (p.kind === 'firefly') {
        p.img.setVisible(night > 0.4);
        p.x += Math.cos(p.t * 0.9) * 8 * dt;
        p.y += Math.sin(p.t * 1.3) * 6 * dt;
        p.img.setAlpha(night * (0.6 + 0.4 * Math.sin(p.t * 3)));
      } else {
        p.x += (14 + Math.sin(p.t * 2) * 10) * dt * p.sp;
        p.y += 16 * dt * p.sp;
        p.img.setAngle(p.t * 90);
      }
      wrap(p);
      p.img.setPosition(p.x, p.y);
    }

    // Bụi chân khi đi trên đường đất
    const pl = s.player;
    if (pl.body.speed > 10 && time > this.nextDust && s.terrain) {
      this.nextDust = time + 230;
      if (s.terrain.path.has(`${Math.floor(pl.x / TILE)},${Math.floor((pl.body.bottom - 1) / TILE)}`)) {
        const d = s.add.image(pl.x + Phaser.Math.Between(-3, 3), pl.body.bottom, 'fx_dust').setDepth(pl.depth - 1).setAlpha(0.8);
        s.tweens.add({ targets: d, y: d.y - 4, x: d.x + Phaser.Math.Between(-4, 4), alpha: 0, scale: 1.8, duration: 420, onComplete: () => d.destroy() });
      }
    }
  }
}
