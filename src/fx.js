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
  const px = (key, w, h, pts) =>
    canvas(key, w, h, (ctx) => pts.forEach(([x, y, c]) => ((ctx.fillStyle = c), ctx.fillRect(x, y, 1, 1))));
  px('fx_petal', 3, 2, [[0, 0, '#ffc8d6'], [1, 0, '#ffe0e8'], [1, 1, '#f39ab4'], [2, 1, '#ffc8d6']]);
  px('fx_leaf', 3, 3, [[1, 0, '#e8923f'], [0, 1, '#c8642e'], [1, 1, '#f2b24a'], [2, 1, '#e8923f'], [1, 2, '#9a4a2a']]);
  px('fx_spark', 3, 3, [[1, 0, '#ffffff'], [0, 1, '#dff4ff'], [1, 1, '#ffffff'], [2, 1, '#dff4ff'], [1, 2, '#ffffff']]);
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
  [20.5 * 60, 0.55, 0.55, 0.82], // chạng vạng tím
  [22 * 60, 0.4, 0.44, 0.7], // đêm xanh
  [26 * 60, 0.36, 0.4, 0.66],
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
    this.outdoor = ['farm', 'village', 'forest', 'quarry'].includes(scene.mapId);
    this.follow = []; // bóng đi theo sprite di chuyển
    this.lights = [];
    this.parts = [];
    this.nextDust = 0;
    const cam = scene.cameras.main;
    // Màu trời bằng ColorMatrix (WebGL); nếu không có thì UIScene dùng lớp phủ tối như cũ
    this.cm = cam.postFX?.addColorMatrix?.() || null;
    scene.registry.set('skyFx', !!this.cm);
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
    for (const [k, tint] of [[1.6, 0xffb060], [0.7, 0xfff0c0]]) {
      const g = this.s.add.image(x, y, 'fx_glow').setDisplaySize(size * k, size * k).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(9400).setAlpha(0);
      this.lights.push(g);
    }
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
      const [r, g, b] = s.mapId === 'mine' ? [0.78, 0.74, 0.86] : ['home', 'shop', 'npchome'].includes(s.mapId) ? [1, 0.97, 0.92] : skyAt(t);
      this.cm.reset();
      this.cm.set([r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0]);
    }
    for (const l of this.lights) l.setAlpha(Math.min(1, night * 1.2) * (0.92 + Math.sin(time / 300 + l.x) * 0.08));

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
    if (pl.body.speed > 10 && time > this.nextDust && s.groundLayer) {
      this.nextDust = time + 230;
      const idx = s.groundLayer.getTileAtWorldXY(pl.x, pl.body.bottom)?.index ?? 0;
      if (idx >= 16 && idx <= 21) {
        const d = s.add.image(pl.x + Phaser.Math.Between(-3, 3), pl.body.bottom, 'fx_dust').setDepth(pl.depth - 1).setAlpha(0.8);
        s.tweens.add({ targets: d, y: d.y - 4, x: d.x + Phaser.Math.Between(-4, 4), alpha: 0, scale: 1.8, duration: 420, onComplete: () => d.destroy() });
      }
    }
  }
}
