// ============================================================
//  Đêm xuống, zombie đánh vào nông trại theo 3 ĐỢT (20:00 · 21:30 · 23:00).
//  - Ở nông trại: zombie thật kéo tới 3 cổng, đập cổng; cổng vỡ → tràn vào, đuổi người / ăn mồi.
//  - Ở chỗ khác hoặc đã đi ngủ: trận đánh được tính tự động (cổng, tháp canh, bẫy, mồi, đuốc vẫn có tác dụng).
//  - Sáng ra: báo cáo thiệt hại + dự báo đêm tới (thư của Anh Ba).
//  Đồ phòng thủ đặt xuống nông trại nằm trong state.objects: trap_spike, torch, bait (o.item = món làm mồi).
// ============================================================
import { TILE, ITEMS, CROPS } from './config.js';
import { state, ui, bus, changed, sfx, toast, addItem } from './state.js';
import { dayNum, baseLv, ZOMBIES } from './survival.js';
import { canAfford, payCost } from './hayday.js';
import Combat from './combat.js';

const key = (x, y) => `${x},${y}`;
export const WAVE_AT = [20 * 60, 21 * 60 + 30, 23 * 60];
export const isNight = (t = state.time) => t >= 19 * 60 || t < 5 * 60;

// Cổng: (x, y) ô trên-trái của chướng ngại 2 ô. vert = chắn đường ngang (2 ô dọc).
// out: phía ngoài cổng; spawn: chỗ zombie xuất hiện ở mép bản đồ
export const GATES = {
  east: { name: 'Cổng đông', x: 86, y: 11, vert: true, out: { x: 1, y: 0 }, spawn: [[91, 11], [91, 12], [90, 10], [90, 13]] },
  north: { name: 'Cổng bắc', x: 16, y: 4, out: { x: 0, y: -1 }, spawn: [[16, 0], [17, 0]] },
  south: { name: 'Cổng nam', x: 19, y: 39, out: { x: 0, y: 1 }, spawn: [[19, 43], [20, 43]] },
};
const GATE_IDS = ['east', 'north', 'south'];
const GATE_WEIGHT = { east: 0.45, north: 0.25, south: 0.3 };
// Sát thương lên cổng mỗi cú đập (trận tự động: mỗi zombie đập ~3 lần)
const GATE_DMG = { walker: 12, runner: 8, brute: 45, soldier: 25 };

export const gateMax = (lv = baseLv('fence')) => (lv <= 0 ? 0 : lv === 1 ? 120 : 240);
export const REPAIR = { 1: { wood: 6, scrap: 2 }, 2: { scrap: 5, wood: 3 }, 3: { scrap: 5, wood: 3 } };
const REPAIR_HP = 60;

// ---------- Trạng thái đêm ----------
export function raidState() {
  const r = (state.raid = state.raid || {});
  r.gates = r.gates || {};
  r.nights = r.nights || 0;
  const lv = baseLv('fence');
  if (r.gateLv !== lv) {
    // Vừa xây / nâng cấp rào: cổng mới tinh
    r.gateLv = lv;
    for (const id of GATE_IDS) r.gates[id] = gateMax(lv);
  }
  if (r.night !== dayNum()) {
    r.night = dayNum();
    r.waves = [];
    r.pending = [];
    r.log = { kills: 0, myKills: 0, broke: [], crops: 0, bait: 0, trap: 0, tower: 0, repelled: 0 };
  }
  if (!r.plan) r.plan = makePlan(r.nights, r.nights === 0 ? 'quiet' : 'normal');
  return r;
}

// Kế hoạch đêm: số zombie mỗi đợt theo số đêm đã qua + "kiểu đêm" (dự báo từ sáng)
const TAGS = {
  quiet: 'Đêm nay có vẻ yên ả, chỉ vài con lang thang.',
  normal: 'Đêm nay zombie thường kéo tới từng đợt.',
  runners: 'Đêm nay nhiều zombie CHẠY NHANH — đặt bẫy gai ở các cổng.',
  brute: 'Đêm nay có ZOMBIE KHỔNG LỒ ở đợt cuối — chuẩn bị súng hoặc bom xăng.',
  horde: 'Đêm nay cả ĐÀN đông bất thường — sửa cổng, đặt mồi, cắm đuốc!',
};
export function makePlan(nights, tag) {
  const mul = tag === 'horde' ? 1.6 : tag === 'quiet' ? 0.5 : 1;
  const n = Math.max(1, Math.round(Math.min(9, 2 + nights * 0.6) * mul));
  const pick = (runP) => (Math.random() < runP ? 'runner' : 'walker');
  const w1 = Array.from({ length: n }, () => pick(tag === 'runners' ? 0.5 : 0.1));
  const w2 = Array.from({ length: n }, () => pick(tag === 'runners' ? 1 : 0.45));
  const w3 = Array.from({ length: Math.max(1, n - 1) }, () => pick(0.3));
  if (tag === 'brute' || (nights >= 4 && tag !== 'quiet')) w3.push('brute');
  if (nights >= 9 && tag !== 'quiet') w3.push('brute');
  if (nights >= 10) w3.push('soldier', 'soldier');
  return { tag, waves: [w1, w2, w3] };
}
function nextTag(nights) {
  if (nights < 2) return nights === 0 ? 'quiet' : 'normal';
  const r = Math.random();
  return r < 0.15 ? 'quiet' : r < 0.45 ? 'normal' : r < 0.65 ? 'runners' : r < 0.85 ? 'brute' : 'horde';
}
export const forecastText = () => TAGS[raidState().plan.tag];

// Gọi mỗi 10 phút game (UIScene): tới giờ thì mở đợt
export function raidTick() {
  if (state.survivalStart !== true) return;
  const r = raidState();
  for (let i = 0; i < 3; i++) {
    if (state.time < WAVE_AT[i] || r.waves[i]) continue;
    r.waves[i] = true;
    const list = r.plan.waves[i] || [];
    sfx('alert', 0.6);
    const title = `ĐỢT ${i + 1}/3 — ${list.length} zombie${i === 2 && list.includes('brute') ? ' + KHỔNG LỒ' : ''}`;
    if (ui.place === 'farm') bus.emit('raidWave', i, list, title);
    else {
      resolveWave(list);
      toast(`${title} đang đánh vào nông trại! (bạn không có mặt — căn cứ tự chống đỡ)`);
    }
    changed();
  }
}

// ---------- Trận tự động ----------
const objectsOf = (type) => Object.entries(state.objects || {}).filter(([, o]) => o.type === type);
function pickGate() {
  let x = Math.random();
  for (const id of GATE_IDS) if ((x -= GATE_WEIGHT[id]) <= 0) return id;
  return 'east';
}
function trample(r) {
  const crops = Object.values(state.tiles || {}).filter((t) => t.crop && !t.crop.dead);
  if (!crops.length) return;
  const t = crops[Math.floor(Math.random() * crops.length)];
  t.crop = null;
  r.log.crops++;
}
export function resolveWave(list) {
  const r = raidState();
  const tower = baseLv('fence') >= 3;
  const torches = objectsOf('torch').length;
  for (const type of list) {
    if (tower && Math.random() < 0.3) { r.log.tower++; r.log.kills++; continue; }
    // Bẫy gai: đâm 20 — đủ hạ zombie thường & chạy
    const trap = objectsOf('trap_spike').find(([, o]) => (o.hp || 0) > 0);
    if (trap && Math.random() < 0.6) {
      trap[1].hp--;
      r.log.trap++;
      if (ZOMBIES[type].hp <= 24) { r.log.kills++; continue; }
    }
    const g = pickGate();
    if ((r.gates[g] || 0) > 0) {
      r.gates[g] = Math.max(0, r.gates[g] - GATE_DMG[type] * 3);
      if (r.gates[g] === 0 && !r.log.broke.includes(g)) r.log.broke.push(g);
      continue; // zombie mắc kẹt ngoài cổng tới sáng
    }
    // Lọt vào trong: đuốc doạ lui, mồi giữ chân, không thì giẫm nát ruộng
    if (Math.random() < Math.min(0.5, torches * 0.1)) { r.log.repelled++; continue; }
    const bait = objectsOf('bait').find(([, o]) => o.hp > 0);
    if (bait) {
      const [k, o] = bait;
      o.hp -= 15;
      if (ITEMS[o.item]?.bait?.poison) r.log.kills++;
      if (o.hp <= 0) { delete state.objects[k]; r.log.bait++; }
      continue;
    }
    if (Math.random() < 0.5) trample(r);
  }
}

// Sáng ra (newDay): đánh nốt các đợt chưa tới (đã ngủ), zombie còn sót phá ruộng, viết báo cáo, lên kế hoạch đêm tới
export function nightReport() {
  if (state.survivalStart !== true) return [];
  const r = raidState();
  for (let i = 0; i < 3; i++) if (!r.waves[i]) { r.waves[i] = true; resolveWave(r.plan.waves[i] || []); }
  for (const _ of r.pending || []) if (Math.random() < 0.6) trample(r);
  r.pending = [];
  // Đuốc cháy hết sau 1 đêm
  let burnt = 0;
  for (const [k] of objectsOf('torch')) { delete state.objects[k]; burnt++; }
  for (const [k, o] of objectsOf('trap_spike')) if ((o.hp || 0) <= 0) delete state.objects[k];
  const L = r.log;
  const lines = [];
  if (L.kills) lines.push(`• Hạ ${L.kills} zombie${L.myKills ? ` (bạn tự tay ${L.myKills})` : ''}${L.tower ? `, tháp canh bắn ${L.tower}` : ''}${L.trap ? `, bẫy gai đâm ${L.trap} lần` : ''}`);
  else if (L.trap) lines.push(`• Bẫy gai đâm ${L.trap} lần`);
  const lv = baseLv('fence');
  if (lv) {
    const st = GATE_IDS.map((id) => `${GATES[id].name} ${r.gates[id]}/${gateMax()}`).join(' · ');
    lines.push(`• ${st}`);
    if (L.broke.length) lines.push(`• ${L.broke.map((id) => GATES[id].name).join(', ')} bị PHÁ! Sửa ngay trước tối nay`);
    else if (GATE_IDS.some((id) => r.gates[id] < gateMax())) lines.push('• Cổng bị đập hỏng một phần — chạm vào cổng để sửa');
  } else lines.push('• Nông trại chưa có rào chắn cổng — zombie đi thẳng vào. Xây Hàng rào ở Bàn chế tạo!');
  if (L.crops) lines.push(`• Zombie giẫm nát ${L.crops} cây trong ruộng`);
  if (L.bait) lines.push(`• ${L.bait} mồi nhử bị ăn hết`);
  if (L.repelled) lines.push(`• Đuốc doạ lui ${L.repelled} con`);
  if (burnt) lines.push(`• ${burnt} cây đuốc đã cháy hết`);
  if (!L.kills && !L.crops && !L.broke.length && lv) lines.push('• Trại yên ổn, không mất gì');
  // Đêm tới
  r.nights++;
  r.plan = makePlan(r.nights, nextTag(r.nights));
  state.stats = state.stats || {};
  state.stats.nights = r.nights;
  const text = `Báo cáo đêm qua:\n${lines.join('\n')}\n\nDự báo: ${TAGS[r.plan.tag]}`;
  state.mail = [...(state.mail || []), { from: 'ba', text }];
  return []; // chi tiết nằm trong thư Anh Ba (mở ngay khi tỉnh dậy)
}

// ---------- Đánh thật ở nông trại ----------
export default class Raid {
  constructor(s) {
    this.s = s;
    this.r = raidState();
    this.gateGfx = {};
    this.walls = s.physics.add.staticGroup();
    this.queue = [];
    this.nextSpawn = 0;
    this.burns = [];
    this.towerNext = 0;
    s.raid = this;
    for (const id of GATE_IDS) this.drawGate(id);
    const onWave = (i, list, title) => this.startWave(i, list, title);
    bus.on('raidWave', onWave);
    // Vừa xây / nâng cấp hàng rào: dựng cổng ngay, không cần rời nông trại
    const onBase = (id) => {
      if (id !== 'fence') return;
      this.r = raidState();
      for (const g of GATE_IDS) {
        this.drawGate(g);
        this.s.puff?.(GATES[g].x, GATES[g].y, 0xc8a070);
      }
      toast('3 cổng nông trại đã có rào chắn! Ban đêm zombie phải phá cổng mới vào được.');
    };
    bus.on('baseUpgraded', onBase);
    s.events.once('shutdown', () => {
      bus.off('raidWave', onWave);
      bus.off('baseUpgraded', onBase);
      // Rời nông trại khi còn zombie: tính là còn sót (sáng ra phá ruộng / quay lại thì còn đó)
      const left = (s.combat?.monsters || []).filter((m) => m.raid && m.sprite.active).map((m) => m.type);
      this.r.pending = [...left, ...this.queue.map((q) => q.type)];
      s.raid = null;
    });
    // Quay lại nông trại giữa đêm: zombie còn sót vẫn ở đó
    if (this.r.pending?.length && isNight()) {
      for (const type of this.r.pending) this.queue.push({ type, gate: pickGate() });
      this.r.pending = [];
    }
  }

  ensureCombat() {
    const s = this.s;
    if (s.combat) return s.combat;
    s.combat = new Combat(s, null);
    this.hookCombat();
    return s.combat;
  }
  hookCombat() {
    if (this.hooked === this.s.combat) return;
    this.hooked = this.s.combat;
    this.s.physics.add.collider(this.s.combat.group, this.walls);
  }

  // ---------- Cổng ----------
  gateRect(id) {
    const g = GATES[id];
    return g.vert ? { x: g.x * TILE + 3, y: g.y * TILE, w: 10, h: 2 * TILE } : { x: g.x * TILE, y: g.y * TILE + 4, w: 2 * TILE, h: 10 };
  }
  drawGate(id) {
    const s = this.s, g = GATES[id], lv = baseLv('fence');
    const old = this.gateGfx[id];
    old?.img?.destroy();
    old?.wall?.destroy();
    old?.bar?.destroy();
    old?.barBg?.destroy();
    old?.tower?.destroy();
    for (let i = 0; i < 2; i++) s.statics.delete(key(g.x + (g.vert ? 0 : i), g.y + (g.vert ? i : 0)));
    const o = (this.gateGfx[id] = {});
    if (!lv) return; // chưa xây hàng rào: không vẽ gì ở cổng (xây ở Bàn chế tạo)
    const hp = this.r.gates[id], max = gateMax();
    const frame = lv >= 2 ? 'barricade' : 'sandbags';
    const cx = g.x * TILE + (g.vert ? 8 : 16), cy = g.y * TILE + (g.vert ? 16 : 8);
    o.img = s.add.image(cx, cy + (g.vert ? 0 : 6), 'surv', frame).setOrigin(0.5, g.vert ? 0.5 : 1).setAngle(g.vert ? 90 : 0).setDepth(cy + 8);
    if (hp <= 0) o.img.setAlpha(0.45).setTint(0x6a5a50).setScale(1, 0.55);
    else if (hp < max * 0.5) o.img.setTint(0xc09a8a);
    if (hp > 0) {
      const R = this.gateRect(id);
      o.wall = s.add.zone(R.x, R.y, R.w, R.h).setOrigin(0);
      s.physics.add.existing(o.wall, true);
      this.walls.add(o.wall);
    }
    o.barBg = s.add.rectangle(cx - 12, cy - 18, 24, 3, 0x000000, 0.6).setOrigin(0, 0.5).setDepth(9200);
    o.bar = s.add.rectangle(cx - 12, cy - 18, 24 * Math.max(0, hp / max), 3, hp > max * 0.5 ? 0x7ac050 : hp > 0 ? 0xe0a040 : 0xd04040).setOrigin(0, 0.5).setDepth(9201);
    const show = hp < max || isNight();
    o.bar.setVisible(show);
    o.barBg.setVisible(show);
    if (lv >= 3) {
      const tx = g.vert ? g.x - 2 : g.x + 3, ty = g.vert ? g.y - 2 : g.y - 1;
      o.tower = s.add.image(tx * TILE + 8, (ty + 1) * TILE, 'surv', 'watchtower').setOrigin(0.5, 1).setDepth((ty + 1) * TILE).setScale(0.8);
      o.towerAt = { x: tx * TILE + 8, y: ty * TILE - 10 };
    }
    for (let i = 0; i < 2; i++) {
      const k = key(g.x + (g.vert ? 0 : i), g.y + (g.vert ? i : 0));
      s.statics.set(k, () => this.gateAction(id));
    }
  }
  gateAction(id) {
    const g = GATES[id], lv = baseLv('fence');
    const hp = this.r.gates[id], max = gateMax();
    if (hp >= max) return { act: false, label: `${g.name} — chắc chắn (${hp}/${max})` };
    const cost = REPAIR[lv];
    const txt = Object.entries(cost).map(([i, n]) => `${n} ${ITEMS[i].name}`).join(', ');
    return {
      label: `${hp <= 0 ? 'Dựng lại' : 'Sửa'} ${g.name} (${hp}/${max}) — ${txt}`,
      run: () => {
        if (!canAfford(cost)) return toast(`Thiếu vật liệu để sửa cổng: cần ${txt}`);
        payCost(cost);
        this.r.gates[id] = Math.min(max, hp + REPAIR_HP);
        sfx('hoe', 0.5);
        this.s.puff(g.x, g.y, 0xc8a070);
        this.drawGate(id);
        toast(`${g.name}: ${this.r.gates[id]}/${max}`);
        changed();
      },
    };
  }
  damageGate(id, n) {
    const r = this.r;
    if ((r.gates[id] || 0) <= 0) return;
    r.gates[id] = Math.max(0, r.gates[id] - n);
    const o = this.gateGfx[id];
    if (o?.img) this.s.tweens.add({ targets: o.img, x: o.img.x + 1, yoyo: true, duration: 50 });
    if (r.gates[id] === 0) {
      if (!r.log.broke.includes(id)) r.log.broke.push(id);
      sfx('boom', 0.5);
      this.s.cameras.main.shake(200, 0.006);
      toast(`${GATES[id].name} BỊ PHÁ! Zombie tràn vào!`);
      this.drawGate(id);
    } else if (o?.bar) {
      const max = gateMax();
      o.bar.setVisible(true).setSize(24 * (r.gates[id] / max), 3).setFillStyle(r.gates[id] > max * 0.5 ? 0x7ac050 : 0xe0a040);
      o.barBg.setVisible(true);
    }
  }

  // ---------- Đợt ----------
  startWave(i, list, title) {
    bus.emit('banner', title, i === 2 ? '#ff7a6a' : '#ffd27a');
    for (const type of list) this.queue.push({ type, gate: pickGate() });
    this.wave = i;
  }
  spawnOne(q) {
    const c = this.ensureCombat();
    const g = GATES[q.gate];
    const [x, y] = g.spawn[Math.floor(Math.random() * g.spawn.length)];
    const m = c.spawnZombie(q.type, x, y);
    m.raid = { gate: q.gate, slot: (Math.random() - 0.5) * 22, next: 0 };
    m.aggro = Infinity;
    return m;
  }
  outside(m, g) {
    const sp = m.sprite;
    if (g.out.x > 0) return sp.x > g.x * TILE + 10;
    if (g.out.y < 0) return sp.y < g.y * TILE + 12;
    return sp.y > (g.y + 1) * TILE - 2;
  }
  front(g, slot) {
    if (g.out.x > 0) return { x: (g.x + 1) * TILE + 7, y: (g.y + 1) * TILE + 6 + slot * 0.6 };
    if (g.out.y < 0) return { x: (g.x + 1) * TILE + slot * 0.6, y: g.y * TILE + 2 };
    return { x: (g.x + 1) * TILE + slot * 0.6, y: (g.y + 1) * TILE + 12 };
  }

  // Combat hỏi: zombie này nên đi đâu? null = đuổi người chơi như thường
  steer(m, time, dPlayer) {
    const s = this.s, sp = m.sprite;
    let slow = 1;
    for (const t of this.torches || []) if (Math.abs(t.x - sp.x) < 40 && Math.abs(t.y - sp.y) < 40) slow = 0.6;
    if (time < (m.slowUntil || 0)) slow *= 0.5;
    const g = GATES[m.raid.gate];
    if ((this.r.gates[m.raid.gate] || 0) > 0 && this.outside(m, g)) {
      const f = this.front(g, m.raid.slot);
      if (Math.hypot(f.x - sp.x, f.y - sp.y) < 7) {
        if (time > m.raid.next) {
          m.raid.next = time + 1000;
          this.damageGate(m.raid.gate, m.cfg.dmg);
          if (baseLv('fence') >= 2) s.combat.hit(m, 2, { x: g.out.x, y: g.out.y });
        }
        return { x: f.x, y: f.y, hold: true, slow };
      }
      return { x: f.x, y: f.y, slow };
    }
    // Đã vào trong: mồi gần nhất (trừ khi người chơi đứng sát)
    if (dPlayer > 40) {
      let best = null, bd = Infinity;
      for (const [k, o] of Object.entries(state.objects)) {
        if (o.type !== 'bait') continue;
        const [bx, by] = k.split(',').map(Number);
        const px = bx * TILE + 8, py = (by + 1) * TILE - 2;
        const d = Math.hypot(px - sp.x, py - sp.y);
        if (d < (ITEMS[o.item]?.bait?.lure || 200) && d < bd) (bd = d), (best = { k, o, x: px, y: py });
      }
      if (best) {
        if (bd < 9) {
          if (time > m.raid.next) {
            m.raid.next = time + 1000;
            this.biteBait(best.k, best.o, m);
          }
          return { x: best.x, y: best.y, hold: true, slow };
        }
        return { x: best.x, y: best.y, slow };
      }
    }
    return slow < 1 ? { x: s.player.body.center.x, y: s.player.body.center.y + 4, slow } : null;
  }
  biteBait(k, o, m) {
    const s = this.s;
    o.hp -= 5;
    sfx('eat', 0.3);
    const b = ITEMS[o.item]?.bait;
    if (b?.poison) s.combat.hit(m, b.poison, { x: 0, y: 0 });
    if (o.hp <= 0) {
      delete state.objects[k];
      this.r.log.bait++;
      s.renderObject(k);
      changed();
    }
  }

  // Bom xăng: đám cháy 3 giây
  burnAt(x, y, radius) {
    this.burns.push({ x, y, r: radius, until: this.s.time.now + 3000, next: 0 });
  }

  update(time) {
    const s = this.s;
    // Thả zombie từ hàng đợi (không quá 16 con cùng lúc)
    if (this.queue.length && time > this.nextSpawn && !ui.modal) {
      const alive = (s.combat?.monsters || []).filter((m) => m.raid).length;
      if (alive < 16) {
        this.spawnOne(this.queue.shift());
        this.nextSpawn = time + 700;
      }
    }
    if (time > (this.torchAt || 0)) {
      this.torchAt = time + 1000;
      this.torches = Object.entries(state.objects).filter(([, o]) => o.type === 'torch').map(([k]) => {
        const [x, y] = k.split(',').map(Number);
        return { x: x * TILE + 8, y: (y + 1) * TILE };
      });
    }
    const c = s.combat;
    if (!c) return;
    this.hookCombat();
    const zs = c.monsters.filter((m) => m.zombie && m.sprite.active);
    // Bẫy gai
    for (const m of zs) {
      if (time < (m.trapNext || 0)) continue;
      const k = key(Math.floor(m.sprite.x / TILE), Math.floor((m.sprite.y - 3) / TILE));
      const o = state.objects[k];
      if (o?.type !== 'trap_spike' || (o.hp || 0) <= 0) continue;
      m.trapNext = time + 1500;
      m.slowUntil = time + 1500;
      o.hp--;
      this.r.log.trap++;
      sfx('chop', 0.4);
      c.hit(m, 20, { x: 0, y: 0 });
      if (o.hp <= 0) s.renderObject(k);
    }
    // Tháp canh bắn zombie gần cổng
    if (baseLv('fence') >= 3 && time > this.towerNext) {
      this.towerNext = time + 1200;
      for (const id of GATE_IDS) {
        const at = this.gateGfx[id]?.towerAt;
        if (!at) continue;
        const m = zs.filter((z) => z.sprite.active).find((z) => Math.hypot(z.sprite.x - at.x, z.sprite.y - at.y) < 110);
        if (!m) continue;
        const g = s.add.graphics().setDepth(9400);
        g.lineStyle(1, 0xfff0b0, 0.9).lineBetween(at.x, at.y, m.sprite.x, m.sprite.y - 10);
        s.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() });
        sfx('shot', 0.25);
        const dead = m.hp <= 7;
        c.hit(m, 7, { x: 0, y: 0 });
        if (dead) this.r.log.tower++;
      }
    }
    // Đám cháy
    this.burns = this.burns.filter((b) => b.until > time);
    for (const b of this.burns) {
      if (time < b.next) continue;
      b.next = time + 500;
      for (const m of c.monsters.filter((z) => z.zombie && z.sprite.active)) if (Math.hypot(m.sprite.x - b.x, m.sprite.y - 4 - b.y) < b.r) c.hit(m, 4, { x: 0, y: 0 });
    }
    // Hết đợt cuối & dọn sạch → thưởng giữ trại
    if (this.wave === 2 && !this.queue.length && !zs.some((m) => m.raid) && this.r.defended !== dayNum()) {
      this.r.defended = dayNum();
      const n = Math.max(1, this.r.nights);
      const gifts = { scrap: 3 + n, parts: 1 };
      for (const [id, k] of Object.entries(gifts)) addItem(id, k, true);
      state.coins += 15 * n;
      sfx('fanfare', 0.6);
      bus.emit('banner', 'GIỮ VỮNG NÔNG TRẠI!', '#9ae07a');
      toast(`Đã đẩy lùi cả 3 đợt! Thưởng: ${3 + n} sắt vụn, 1 linh kiện, ${15 * n} xu`);
      state.stats = state.stats || {};
      state.stats.defended = (state.stats.defended || 0) + 1;
      changed();
    }
  }
}

// Đặt đồ phòng thủ xuống ô (gọi từ WorldScene.farmAction)
export function defensePlaceLabel(id) {
  const it = ITEMS[id];
  if (it?.bait) return `Đặt ${it.name} làm mồi nhử`;
  if (it?.defense === 'trap') return 'Đặt bẫy gai';
  if (it?.defense === 'torch') return 'Cắm đuốc';
  return null;
}
export function makeDefenseObject(id) {
  const it = ITEMS[id];
  if (it.bait) return { type: 'bait', item: id, hp: it.bait.hp };
  if (it.defense === 'trap') return { type: 'trap_spike', hp: 3 };
  return { type: 'torch', hp: 1 };
}
// Bón phân: cây lớn thêm 1/3
export function fertilize(t) {
  const c = t.crop;
  c.grown = Math.min(CROPS[c.type].grow, c.grown + CROPS[c.type].grow / 3);
  return c;
}
