// ============================================================
//  Đoạn mở đầu diễn NGAY TRONG GAME (bản đồ thật, cận cảnh như lúc chơi):
//   'cliff' — nửa đêm mưa trên vách đá ven biển: đánh bầy zombie khổng lồ, bị dồn ra mép vực, nhảy xuống biển
//   'beach' — bình minh: trôi dạt vào bãi cát, Ông Năm (trưởng làng) tìm thấy, hỏi chuyện → vào làng tham quan
//  UIScene bật chế độ phim (khung đen trên/dưới, chữ kể chuyện, nút Bỏ qua) qua bus 'cine'.
// ============================================================
import Phaser from 'phaser';
import { TILE } from '../config.js';
import { state, bus, save, ui, changed } from '../state.js';

const key = (x, y) => `${x},${y}`;
export const INTRO_MAPS = { cliff: { w: 30, h: 14, spawn: { x: 16, y: 7 } }, beach: { w: 30, h: 16, spawn: { x: 14, y: 8 } } };

const say = (text, ms = 2600) => bus.emit('cineText', text, ms);
const snd = (name, v = 0.5) => bus.emit('sfx', name, v);

// Mưa rơi trong khung máy quay (toạ độ thế giới, bám theo camera)
function rain(s, n = 90) {
  const cam = s.cameras.main;
  for (let i = 0; i < n; i++) {
    const d = s.add.rectangle(0, 0, 1, 5, 0xb8c8ff, 0.5).setAngle(12).setDepth(9300);
    const fall = () => {
      if (!d.active) return;
      const v = cam.worldView;
      d.setPosition(v.x + Math.random() * (v.width + 40), v.y - 8);
      s.tweens.add({ targets: d, x: d.x - 16, y: v.y + v.height + 8, duration: 380 + Math.random() * 240, onComplete: fall });
    };
    s.time.delayedCall(Math.random() * 700, fall);
  }
}

// ---------------- Vách đá ven biển ----------------
export function buildCliff(s) {
  const { w, h } = INTRO_MAPS.cliff;
  s.forceDark = 0.5; // nửa đêm: tối vừa đủ, sáng quanh lửa & nhân vật
  // biển bên phải (ô nước có bờ tự nối), vách đá ở mép
  const sea = [];
  for (let x = 23; x < w; x++) for (let y = -1; y <= h; y++) sea.push([x, y]);
  s.addWater(sea.filter(([x, y]) => y >= 0 && y < h), 'sea');
  for (let y = -1, k = 0; y <= h; y++, k++) {
    const big = s.add.image(21 * TILE + 8 + (k % 2) * 6, (y + 1) * TILE + 10, k % 3 ? 'intro_rock_b' : 'intro_rock_a').setOrigin(0.5, 1).setDepth((y + 1) * TILE + 10);
    s.fx.shadow(big.x, big.y - 2, 22);
    if (k % 2) s.add.image(23 * TILE + 2, (y + 1) * TILE + 6, 'intro_rock_d').setOrigin(0.5, 1).setDepth((y + 1) * TILE + 6);
    s.addWall(20 * TILE + 8, y * TILE, TILE * 2, TILE);
  }
  // con đường đất xuyên rừng, bãi đất lầy
  s.dirtArea(0, 6, 19, 8);
  s.dirtArea(12, 5, 19, 9);
  // rừng thưa hai bên đường + cây chết
  for (const [x, y, k] of [[2, 2, 1], [6, 1, 0], [10, 2, 1], [14, 1, 0], [18, 2, 2], [3, 12, 0], [8, 13, 1], [13, 12, 0], [18, 13, 1], [1, 5, 1]]) s.tree(x * TILE + 8, (y + 1) * TILE, k);
  for (const [x, y] of [[9, 4], [16, 11], [4, 10]]) s.add.image(x * TILE + 8, (y + 1) * TILE, 'intro_deadtree').setOrigin(0.5, 1).setDepth((y + 1) * TILE).setTint(0xb0b0c0);
  for (const [x, y] of [[5, 4], [11, 11], [15, 3], [7, 10]]) s.add.image(x * TILE + 8, (y + 1) * TILE, 'intro_bush').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 2).setScale(0.8);
  for (const [x, y, f] of [[6, 7, 'blood0'], [11, 8, 'blood1'], [17, 6, 'blood0']]) s.add.image(x * TILE, y * TILE, 'surv', f).setDepth(-700).setAlpha(0.8);
  // xe cháy rực bên đường: nguồn sáng chính
  const car = s.add.image(8 * TILE, 10 * TILE, 'surv', 'car_red').setOrigin(0.5, 1).setDepth(10 * TILE);
  s.fx.shadow(car.x, car.y - 2, 44);
  const fire = s.add.sprite(car.x + 2, car.y - 14, 'surv', 'campfire0').setOrigin(0.5, 1).setDepth(car.depth + 1).setScale(1.3);
  s.time.addEvent({ delay: 130, loop: true, callback: () => fire.setFrame(fire.frame.name === 'campfire0' ? 'campfire1' : 'campfire0') });
  s.fx.light(car.x, car.y - 22, 90);
  s.fx.addSource(car.x, car.y - 16, 70, true);
  s.addWall(car.x - 22, car.y - 14, 44, 12);
  // thùng phuy cháy cạnh vách
  const bar = s.add.image(19 * TILE + 8, 4 * TILE, 'surv', 'barrel').setOrigin(0.5, 1).setDepth(4 * TILE);
  const f2 = s.add.sprite(bar.x, bar.y - 14, 'surv', 'campfire0').setOrigin(0.5, 1).setScale(0.6).setDepth(bar.depth + 1);
  s.time.addEvent({ delay: 160, loop: true, callback: () => f2.setFrame(f2.frame.name === 'campfire0' ? 'campfire1' : 'campfire0') });
  s.fx.light(bar.x, bar.y - 18, 50);
  s.fx.addSource(bar.x, bar.y - 12, 44, true);
  rain(s);
}

// ---------------- Bãi biển ----------------
export function buildBeach(s) {
  const { w, h } = INTRO_MAPS.beach;
  s.forceDark = 0;
  for (let x = 0; x < w; x++) for (let y = 4; y <= 12; y++) s.terrain.sand.add(key(x, y));
  for (let x = 0; x < w; x++) for (let y = 13; y <= 13; y++) if (x % 7 > 1) s.terrain.sand.add(key(x, y));
  const sea = [];
  for (let x = 0; x < w; x++) for (let y = 0; y <= 4 + (x % 5 === 0 ? 1 : 0); y++) sea.push([x, y]);
  s.addWater(sea, 'sea');
  // sóng vỗ bờ
  for (let i = 0; i < 14; i++) {
    const f = s.add.ellipse(i * 36 + 10, 5 * TILE + 6, 30, 4, 0xffffff, 0.8).setDepth(-840);
    s.tweens.add({ targets: f, y: f.y + 6, scaleX: 1.3, alpha: 0.15, yoyo: true, repeat: -1, duration: 1500 + (i % 4) * 160, ease: 'Sine.easeInOut' });
  }
  // cây xanh, bụi, đá ven bờ
  for (const [x, y, k] of [[1, 14, 0], [4, 15, 1], [8, 14, 0], [20, 15, 0], [24, 14, 1], [28, 15, 0], [0, 10, 0], [29, 9, 1]]) s.tree(x * TILE + 8, (y + 1) * TILE, k);
  for (const [x, y] of [[11, 14], [16, 15], [26, 12]]) s.add.image(x * TILE + 8, (y + 1) * TILE, 'intro_bush').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 2);
  for (const [x, y, k] of [[4, 7, 'intro_rock_c'], [23, 8, 'intro_rock_d'], [25, 7, 'intro_rock_b'], [6, 11, 'intro_rock_d']]) {
    const r = s.add.image(x * TILE + 8, (y + 1) * TILE, k).setOrigin(0.5, 1).setDepth((y + 1) * TILE).setScale(k === 'intro_rock_b' ? 0.8 : 1);
    s.fx.shadow(r.x, r.y - 1, 18);
    s.addWall(r.x - 8, r.y - 8, 16, 7);
  }
  for (const [x, y] of [[9, 6], [18, 6], [21, 10], [13, 11]]) s.add.rectangle(x * TILE, y * TILE + 8, 7, 2, 0x3a6a3a).setDepth(-930); // rong biển
  for (let i = 0; i < 18; i++) s.add.rectangle(((i * 97) % (w * TILE)), 7 * TILE + ((i * 53) % (5 * TILE)), 2, 1, 0xd8b890).setDepth(-930); // vỏ sò
}

// ---------------- Kịch bản ----------------
function cineStart(s) {
  ui.cine = true;
  bus.emit('cine', true);
  const onSkip = () => finishIntro(s);
  bus.on('cineSkip', onSkip);
  s.events.once('shutdown', () => bus.off('cineSkip', onSkip));
}

export function finishIntro(s) {
  if (s.introDone) return;
  s.introDone = true;
  state.intro = 'tour';
  state.time = 9 * 60;
  state.weather = 'sun';
  changed();
  bus.emit('clockNow');
  ui.cine = false;
  bus.emit('cine', false);
  s.changeMap('village', null, { tour: true });
}

export function playCliff(s) {
  cineStart(s);
  const p = s.player;
  s.facing = { x: -1, y: 0 };
  p.setFlipX(true).play('hero2_idle_side');
  s.cameras.main.setZoom(3.3);
  const zs = [];
  const zombie = (type, tx, ty, sc = 1) => {
    const z = s.add.sprite(tx * TILE + 8, (ty + 1) * TILE, `zom_${type}`, 16).setOrigin(0.5, 1).setScale(sc).play(`zom_${type}_right`);
    s.fx.followShadow(z, 13 * sc, -1);
    const eyes = s.add.image(z.x, z.y, 'fx_glow').setDisplaySize(9 * sc, 5 * sc).setTint(0xff2a10).setBlendMode(Phaser.BlendModes.ADD).setDepth(9420);
    z.eyes = eyes;
    zs.push(z);
    return z;
  };
  const walk = (z, tx, ms) => s.tweens.add({ targets: z, x: tx * TILE + 8, duration: ms, onUpdate: () => z.setDepth(z.y) });
  s.events.on('update', () => zs.forEach((z) => z.eyes.setPosition(z.x + 1 * z.scale, z.y - 25 * z.scale).setDepth(9420)));
  const at = (ms, fn) => s.time.delayedCall(ms, () => !s.introDone && fn());

  say('Năm thứ ba sau đại dịch…', 2600);
  const z1 = zombie('walker', -2, 7);
  const z2 = zombie('runner', -3, 6);
  const z3 = zombie('walker', -2, 8);
  snd('groan', 0.5);
  at(1600, () => {
    walk(z1, 13, 3600);
    walk(z2, 11, 4000);
    walk(z3, 12, 3800);
  });
  at(2800, () => say('Bầy xác sống lần theo mùi người, kéo tới từ khắp khu rừng…', 2800));
  // đâm con đi đầu
  at(5300, () => {
    s.playAction('attack');
    snd('swing', 0.5);
    at(220, () => {
      snd('monster', 0.6);
      z1.setTintFill(0xffffff);
      s.time.delayedCall(90, () => z1.clearTint());
      s.tweens.killTweensOf(z1);
      s.tweens.add({ targets: z1, x: z1.x - 24, duration: 260, ease: 'Quad.easeOut' });
      s.burst(z1.x, z1.y - 14, 'fx_dust', 8, 0x9a1c1c, 12, 8, 520);
      s.cameras.main.shake(140, 0.005);
    });
  });
  // con khổng lồ xuất hiện, dồn ra mép vực
  at(6600, () => {
    const giant = zombie('brute', -3, 7, 2.2);
    giant.anims.timeScale = 0.6;
    snd('groan', 0.8);
    s.cameras.main.shake(300, 0.004);
    say('Rồi một con khổng lồ xuất hiện…', 2400);
    walk(giant, 14, 5200);
    for (const z of [z1, z2, z3]) walk(z, (z.x / TILE | 0) + 4, 3800);
    for (const [t, x, y] of [['soldier', -2, 5], ['walker', -3, 9], ['runner', -4, 6]]) walk(zombie(t, x, y), 12 + (y % 3), 5600);
  });
  at(8400, () => {
    p.play('hero2_walk_side'); // lùi dần, mặt vẫn hướng về bầy zombie
    s.tweens.add({ targets: p, x: 20 * TILE - 2, duration: 2200, onComplete: () => p.play('hero2_idle_side') });
    say('Lùi… lùi mãi… sau lưng chỉ còn vực thẳm và biển đen.', 3000);
  });
  at(11200, () => {
    snd('groan', 0.9);
    snd('boom', 0.4);
    s.cameras.main.flash(400, 230, 240, 255);
    s.cameras.main.shake(600, 0.012);
    say('Không còn đường lui…', 2000);
  });
  // quay người, nhảy
  at(13200, () => {
    s.facing = { x: 1, y: 0 };
    p.setFlipX(false).play('hero2_run_side');
    say('Nhảy!', 1400);
    const x0 = p.x, y0 = p.y;
    const o = { t: 0 };
    s.tweens.add({
      targets: o, t: 1, duration: 950, ease: 'Sine.easeIn', delay: 200,
      onStart: () => p.play('hero2_idle_side'),
      onUpdate: () => p.setPosition(x0 + 64 * o.t, y0 - 26 * Math.sin(Math.PI * o.t * 0.85) + 30 * o.t * o.t).setAngle(160 * o.t).setDepth(9000),
      onComplete: () => {
        p.setVisible(false);
        snd('splash', 0.8);
        s.burst(p.x, p.y, 'fx_dust', 18, 0xdff0ff, 20, 22, 800);
        const ring = s.add.ellipse(p.x, p.y + 2, 8, 3).setStrokeStyle(1, 0xdff0ff).setDepth(9000);
        s.tweens.add({ targets: ring, scaleX: 5, scaleY: 3, alpha: 0, duration: 1300 });
        at(1500, () => {
          s.cameras.main.fadeOut(900, 0, 0, 0);
          s.cameras.main.once('camerafadeoutcomplete', () => {
            if (s.introDone) return;
            state.intro = 'beach';
            state.time = 7 * 60 + 30; // bình minh đã lên hẳn, bãi biển sáng
            state.weather = 'sun';
            save();
            s.scene.restart({ map: 'beach', spawn: { x: 9, y: 2 } });
          });
        });
      },
    });
  });
}

export function playBeach(s) {
  cineStart(s);
  const p = s.player;
  const cam = s.cameras.main;
  cam.setZoom(3.3);
  // nằm bất tỉnh trên tấm ván, trôi từ ngoài khơi vào bờ
  p.setFrame(29 * 8 + 7).setFlipX(false);
  p.anims.stop();
  const plank = s.add.rectangle(p.x, p.y + 6, 34, 6, 0x7a5232).setStrokeStyle(1, 0x2a1a12).setDepth(p.depth - 1);
  const at = (ms, fn) => s.time.delayedCall(ms, () => !s.introDone && fn());
  say('Sóng cuốn đi suốt một đêm dài…', 2800);
  s.tweens.add({ targets: [p, plank], y: '+=2', yoyo: true, repeat: 3, duration: 700, ease: 'Sine.easeInOut' });
  at(2600, () => {
    const tx = 14 * TILE + 8, ty = 7 * TILE + 8;
    s.tweens.add({ targets: p, x: tx, y: ty, duration: 4200, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: plank, x: tx - 22, y: ty + 4, angle: -14, duration: 4200, ease: 'Sine.easeInOut' });
    say('…và dạt vào một vùng đất lạ.', 3000);
  });
  at(7600, () => {
    snd('bird', 0.5);
    const nam = s.add.sprite(4 * TILE, 9 * TILE, 'npc_nam', 16).setOrigin(0.5, 1).play('npc_nam_right');
    s.fx.followShadow(nam, 13, -1);
    cam.stopFollow();
    cam.pan(11 * TILE, 8 * TILE, 1400, 'Sine.easeInOut');
    s.tweens.add({
      targets: nam, x: p.x - 18, y: p.y + 10, duration: 2600, onUpdate: () => nam.setDepth(nam.y),
      onComplete: () => {
        nam.play('npc_nam_idle_right');
        const lines = [
          ['nam', 'Ơ kìa… có người dạt vào bờ! Này cháu! Tỉnh lại đi!'],
          ['me', '(Ho sặc sụa nước biển, từ từ mở mắt…)', () => (p.setAngle(0), p.play('hero2_idle_front'))],
          ['nam', 'Hú hồn, còn sống! Cháu là ai? Sao lại trôi tới tận đây?'],
          ['me', 'Cháu… bị cả bầy zombie khổng lồ dồn ra mép vực. Không còn đường nên nhảy xuống biển…'],
          ['nam', 'Trời đất… sống sót được là ông trời thương rồi. Ta là Năm — người già nhất, cũng là trưởng làng ở trại này.'],
          ['nam', 'Ở đây bọn ta còn ít người, sống nhờ ruộng vườn với đồ lục được. Đi, ta dẫn cháu đi chào mọi người.'],
        ];
        let i = 0;
        const next = () => {
          if (i >= lines.length) return finishIntro(s);
          const [who, text, fx] = lines[i++];
          fx?.();
          bus.emit('dialog', {
            face: who === 'nam' ? 'face_nam' : 'portrait',
            name: who === 'nam' ? 'Ông Năm' : 'Bạn',
            text,
            choices: [{ label: i >= lines.length ? 'Đi thôi' : 'Tiếp ▶', onClick: next }],
          });
        };
        next();
      },
    });
  });
}
