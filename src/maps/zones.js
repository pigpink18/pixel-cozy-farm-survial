// ============================================================
//  Vùng có zombie: thả zombie theo độ nhiễm & giờ, ổ zombie, thùng đồ để lục
// ============================================================
import Phaser from 'phaser';
import { TILE, ITEMS } from '../config.js';
import { state, toast, changed, sfx, addItem, roomFor } from '../state.js';
import Combat from '../combat.js';
import { ZONES, zoneState, CONTAINERS, rollLoot, lootKey, lootReady, dayNum } from '../survival.js';
import { nightFactor } from '../fx.js';

const key = (x, y) => `${x},${y}`;

// isFree(x, y): ô zombie đứng được. nests: [[x, y], ...] vị trí ổ
export function populateZone(s, zoneId, isFree, nests = []) {
  const Z = ZONES[zoneId];
  const z = zoneState(zoneId);
  s.combat = new Combat(s, zoneId);
  s.zoneId = zoneId;
  const night = nightFactor() > 0.3;
  const inf = z.infection / 100;
  let n = Math.round((night ? Z.night : Z.day) * (0.35 + 0.65 * inf));
  if (z.infection <= 0) n = night ? Math.ceil(Z.night * 0.25) : 0; // đã giải phóng: ban ngày yên bình
  const sp = s.spawnAt || { x: 0, y: 0 };
  for (let i = 0, tries = 0; i < n && tries < 600; tries++) {
    const x = 2 + Math.floor(Math.random() * (s.mapW - 4)), y = 2 + Math.floor(Math.random() * (s.mapH - 4));
    if (!isFree(x, y) || Math.hypot(x - sp.x, y - sp.y) < 12) continue;
    s.combat.spawnZombie(Z.types[Math.floor(Math.random() * Z.types.length)], x, y);
    i++;
  }
  nests.forEach(([x, y], i) => {
    const k = `n${i}`;
    if (!z.nests[k] && z.infection > 0) s.combat.spawnNest(x, y, k);
  });
  if (!state.zoneSeen?.[zoneId]) {
    state.zoneSeen = { ...(state.zoneSeen || {}), [zoneId]: true };
    s.time.delayedCall(700, () => toast(`${Z.name} — vùng zombie! Cầm vũ khí, bấm Làm để đánh`));
    s.time.delayedCall(4200, () => toast('Phá hết ổ zombie để giải phóng vùng này'));
  } else if (z.infection > 0) s.time.delayedCall(500, () => toast(`${Z.name} — độ nhiễm ${Math.round(z.infection)}%`));
}

// Thùng / xe / tủ để lục đồ. frame: hình trong atlas 'surv' (xe dùng car_*)
export function container(s, type, tx, ty, o = {}) {
  const C = CONTAINERS[type];
  const frame = o.frame || C.frame;
  const img = s.add.image((tx + (o.w || 1) / 2) * TILE, (ty + 1) * TILE, 'surv', frame).setOrigin(0.5, 1).setDepth(o.depth ?? (ty + 1) * TILE - 1);
  if (o.flip) img.setFlipX(true);
  const w = o.w || 1, rows = o.rows || 1;
  s.fx.shadow(img.x, (ty + 1) * TILE - 1, Math.min(img.width + 2, w * TILE + 6));
  s.addWall(tx * TILE + 2, (ty - rows + 1) * TILE + 4, w * TILE - 4, rows * TILE - 6);
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < rows; dy++) s.blocked.add(key(tx + dx, ty - dy));
  const k = o.key || lootKey(s.mapId, tx, ty);
  const mark = s.add.image(img.x, img.y - img.height - 3, 'fx_spark').setDepth(9000).setTint(0xffe08a);
  s.tweens.add({ targets: mark, y: mark.y - 2, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
  const refresh = () => mark.setVisible(lootReady(k, type));
  refresh();
  const action = () => {
    if (!lootReady(k, type)) {
      const left = C.respawn - (dayNum() - state.looted[k]);
      return { act: false, label: `${C.name} — đã lục rồi (có đồ lại sau ${left} ngày)` };
    }
    return { label: `Lục ${C.name}`, run: () => search(s, type, k, img, refresh) };
  };
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < rows; dy++) s.statics.set(key(tx + dx, ty - dy), action);
  s.interactables?.push({ img, r: img.getBounds(), tx, ty });
  return img;
}

function search(s, type, k, img, refresh) {
  if (s.searching) return;
  const C = CONTAINERS[type];
  s.searching = true;
  sfx('search', 0.5);
  const p = s.player;
  const bg = s.add.rectangle(p.x - 10, p.y - 30, 20, 3, 0x000000, 0.7).setOrigin(0, 0.5).setDepth(9600);
  const bar = s.add.rectangle(p.x - 10, p.y - 30, 0, 3, 0xffd34d).setOrigin(0, 0.5).setDepth(9601);
  s.tweens.add({ targets: img, x: img.x + 0.8, yoyo: true, repeat: Math.floor(C.time / 120), duration: 60 });
  const t0 = s.time.now;
  const hp0 = state.hp;
  const ev = s.time.addEvent({
    delay: 50, loop: true,
    callback: () => {
      const f = (s.time.now - t0) / C.time;
      bg.setPosition(p.x - 10, p.y - 30);
      bar.setPosition(p.x - 10, p.y - 30).width = 20 * Math.min(1, f);
      // Bị đánh hoặc bỏ đi xa → huỷ
      const moved = Phaser.Math.Distance.Between(p.x, p.y, img.x, img.y) > 34;
      if (state.hp < hp0 || moved) return finish(false);
      if (f >= 1) finish(true);
    },
  });
  const finish = (ok) => {
    ev.remove();
    bg.destroy();
    bar.destroy();
    s.searching = false;
    if (!ok) return toast('Bị gián đoạn — chưa lục xong!');
    state.looted = state.looted || {};
    state.looted[k] = dayNum();
    const z = s.zoneId && zoneState(s.zoneId);
    const loot = rollLoot(type);
    if (z && z.infection <= 0) for (const id of Object.keys(loot)) loot[id] = Math.ceil(loot[id] * 1.5); // vùng đã giải phóng: nhiều đồ hơn
    const got = [];
    let dy = 0;
    for (const [id, n] of Object.entries(loot)) {
      if (!ITEMS[id] || !roomFor(id)) continue;
      addItem(id, n);
      got.push(`${n} ${ITEMS[id].name}`);
      s.floatIcon(img.x, img.y - 20 - (dy += 7), ITEMS[id].tex, ITEMS[id].frame);
    }
    sfx(got.length ? 'harvest' : 'cancel', 0.4);
    toast(got.length ? `Tìm được: ${got.join(', ')}` : `${C.name} trống trơn...`);
    refresh();
    changed();
  };
}
