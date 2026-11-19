// ============================================================
//  Bãi phế liệu (phía đông trại): bê tông vỡ & đống phế liệu (đồng, thép, bo mạch) mọc lại mỗi ngày,
//  đống sắt vụn lớn, hộp khoá quân dụng, bàn phá khoá, xe thu mua phế liệu, cửa xuống tầng hầm sâu
// ============================================================
import { TILE, ITEMS } from '../config.js';
import { state, bus, changed, toast, sfx, addItem, count, xp, toolLv, bagHasRoom, useEnergy } from '../state.js';
import { energyCost, bonusChance } from '../skills.js';
import { unlocked, needLevel, earnCoins } from '../hayday.js';
import { mineEntryChoices, MINE_SPAWN } from './mine.js';

const key = (x, y) => `${x},${y}`;

export const QUARRY = {
  w: 64, // v2: mở rộng sang đông & xuống nam
  h: 40,
  fromVillage: { x: 2, y: 14 },
  exit: [{ x: 0, y: 14 }, { x: 0, y: 15 }],
  toVillage: { x: 49, y: 13 },
  cave: { x: 37, y: 5 }, // ô dưới-trái ảnh hang
  caveFront: { x: 38, y: 7 },
  anvil: { x: 7, y: 6 },
  cart: { x: 11, y: 6 },
  // Lối đi (không mọc đá): đường ray từ cổng vào tới hang
  paths: [[1, 14, 38, 15], [37, 6, 38, 15], [6, 7, 13, 13]],
  // Mỏm đá cao (vách hẻm núi)
  plateaus: [[17, 3, 22, 7], [26, 18, 32, 22], [6, 20, 11, 24], [40, 20, 43, 25], [48, 7, 53, 11], [50, 27, 56, 31], [16, 30, 23, 34], [34, 31, 38, 35]],
};

// Yêu cầu cuốc chim & độ cứng
const NODES = {
  stone: { name: 'Bê tông vỡ', hp: 2, lv: 1 },
  ore_copper: { name: 'Đống dây đồng', hp: 3, lv: 1 },
  ore_iron: { name: 'Đống thép vụn', hp: 5, lv: 2 },
  ore_gold: { name: 'Đống bo mạch', hp: 7, lv: 3 },
  geode: { name: 'Hộp khoá quân dụng', hp: 3, lv: 1 },
  boulder: { name: 'Đống sắt vụn lớn', hp: 10, lv: 2 },
};
const TIER = ['', 'thường', 'đồng', 'sắt', 'vàng'];

// Mở hốc đá: [vật phẩm, số lượng tối thiểu, tối đa, tỉ lệ]
export const GEODE_LOOT = {
  geode: [['ore_copper', 3, 6, 30], ['ore_iron', 2, 4, 22], ['gem_purple', 1, 1, 15], ['gem_green', 1, 1, 12], ['stone', 5, 8, 11], ['ore_gold', 1, 2, 10]],
  geode_ice: [['ore_iron', 3, 5, 25], ['gem_green', 1, 1, 22], ['ore_gold', 2, 3, 20], ['gem_yellow', 1, 1, 18], ['gem_purple', 1, 2, 15]],
  geode_fire: [['ore_gold', 3, 5, 35], ['gem_red', 1, 1, 25], ['gem_yellow', 1, 1, 20], ['bar_gold', 1, 1, 10], ['gem_green', 1, 2, 10]],
};
export const GEODE_PRICE = 25;

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const inRect = (x, y, [x0, y0, x1, y1], pad = 0) => x >= x0 - pad && x <= x1 + pad && y >= y0 - pad && y <= y1 + pad;

export function buildQuarry(s) {
  const Q = QUARRY;
  // ---- Hình từ PostApocalypse Asset Pack (tools/make_pa_props.py, atlas 'pa') ----
  const r = rng(99);
  const h2 = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const T = TILE;
  const pa = (px, py, f, ox = 0.5, d = py) => s.add.image(px, py, 'pa', f).setOrigin(ox, 1).setDepth(d);
  // Nền đất bạc màu + đường nhựa nứt
  for (let y = 0; y < Q.h; y++)
    for (let x = 0; x < Q.w; x++) {
      const onPath = Q.paths.some((p) => inRect(x, y, p));
      const hv = h2(x, y) % 23;
      const f = onPath ? `asphalt${hv % 3}` : `dirt${hv < 2 ? 6 + hv : hv % 6}`;
      s.add.image(x * T, y * T, 'pa', f).setOrigin(0).setDepth(-999);
    }
  for (let i = 0; i < 16; i++) s.add.ellipse(r() * s.worldW, r() * s.worldH, 20 + r() * 26, 8 + r() * 8, 0x2a2622, 0.3).setDepth(-988); // vệt dầu
  for (let x = 1; x <= 36; x++) s.add.image(x * T + 8, 15 * T, 'q_rail').setRotation(Math.PI / 2).setDepth(-980).setTint(0xb0aaa0);
  for (let y = 8; y <= 15; y++) s.add.image(38 * T, y * T + 8, 'q_rail').setDepth(-980).setTint(0xb0aaa0);

  // Gò rác (ghép ô: góc / cạnh / giữa) — dùng làm tường bao & mỏm cao
  const mound = (x0, y0, x1, y1, wall = true) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const v = y === y0 ? 't' : y === y1 ? 'b' : '';
        const hz = x === x0 ? 'l' : x === x1 ? 'r' : '';
        const f = v || hz ? `g_${v}${hz}` : `g_c${h2(x, y) % 8}`;
        s.add.image(x * T, y * T, 'pa', f).setOrigin(0).setDepth(-960);
        s.blocked.add(key(x, y));
      }
    if (wall) s.addWall(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T - 4);
  };
  // Phía bắc: hàng container dựng đứng chồng sát nhau
  const vert = ['cont_1_gray_vertical', 'cont_5_red_vertical', 'cont_9_green_vertical', 'cont_2_gray_vertical_og_bleak-yellow', 'cont_6_red_vertical_og_bleak-yellow', 'cont_10_green_vertical_og_bleak-yellow'];
  for (let px = -6, i = 0; px < s.worldW; px += 28, i++) pa(px + 14, 3 * T + 2, vert[h2(i, 7) % vert.length], 0.5, 3 * T - 2);
  s.addWall(0, 0, s.worldW, 3 * T - 4);
  for (let x = 0; x < Q.w; x++) for (let y = 0; y < 3; y++) s.blocked.add(key(x, y));
  // Tây / đông / nam: gò rác bao quanh (chừa lối ra làng)
  mound(0, 3, 1, Q.exit[0].y - 1, false);
  mound(0, Q.exit[1].y + 1, 1, Q.h - 1, false);
  mound(Q.w - 2, 3, Q.w - 1, Q.h - 1, false);
  mound(2, Q.h - 2, Q.w - 3, Q.h - 1, false);
  s.addWall(0, 3 * T, 2 * T, (Q.exit[0].y - 3) * T);
  s.addWall(0, (Q.exit[1].y + 1) * T, 2 * T, s.worldH);
  s.addWall(s.worldW - 2 * T, 0, 2 * T, s.worldH);
  s.addWall(0, s.worldH - 2 * T, s.worldW, 2 * T);
  for (const e of Q.exit) s.exits.set(key(e.x, e.y), { map: 'village', spawn: Q.toVillage });

  // Mỏm cao: gò rác + xe nát / container chất lên trên
  const heap = [['scrap_orange', 'cont_3_gray_horizontal'], ['flip_blue', 'cont_8_red_horizontal_og_bleak-yellow'], ['scrap_green', 'tire_1'], ['flip_orange', 'barrel_rust_red_1'], ['scrap_blue', 'cont_12_green_horizontal_og_bleak-yellow'], ['flip_orange', 'cont_4_gray_horizontal_og_bleak-yellow'], ['scrap_red', 'washing_machine'], ['carv_yellow', 'refrigerator']];
  Q.plateaus.forEach(([x0, y0, x1, y1], i) => {
    mound(x0, y0, x1, y1);
    const cx = ((x0 + x1 + 1) / 2) * T, by = (y1 + 1) * T - 6;
    pa(cx - 6, by - 10, heap[i][1], 0.5, by - 12);
    pa(cx + 4, by, heap[i][0], 0.5, by);
  });

  // Xe gỉ sét nằm rải rác (chắn đường đi)
  for (const [x, y, f, w] of [[15, 10, 'scrap_red', 3], [30, 9, 'van_blue', 3], [22, 24, 'bus', 4], [36, 25, 'car_orange', 3], [3, 26, 'truck', 4], [57, 18, 'truck', 4], [44, 37, 'bus', 4], [8, 36, 'van_green', 3], [58, 35, 'scrap_blue', 3]]) {
    const img = pa(x * T + (w * T) / 2, (y + 1) * T + 2, f);
    s.addWall(x * T + 2, y * T + 2, w * T - 4, 12);
    for (let dx = 0; dx < w; dx++) s.blocked.add(key(x + dx, y));
    if (img.height > 30) for (let dx = 0; dx < w; dx++) s.blocked.add(key(x + dx, y - 1));
  }
  // Đồ lặt vặt: thùng phuy, lốp, pallet, tủ lạnh, máy giặt, túi rác
  const small = ['barrel_rust_red_1', 'barrel_rust_blue_2', 'tire_1', '2_tires_grass_bleak_yellow', 'pallet_1', 'refrigerator', 'washing_machine', 'trash_bag_1', 'barrel_rust_red_2', 'pallet_2', 'tire_2_grass_bleak_yellow', 'shopping_cart'];
  for (const [x, y] of [[4, 9], [25, 12], [34, 20], [14, 26], [3, 5], [24, 4], [33, 12], [43, 5], [10, 17], [28, 26], [41, 15], [19, 18], [46, 14], [55, 5], [60, 24], [47, 25], [30, 36], [12, 30], [40, 28], [58, 12]]) {
    if (s.blocked.has(key(x, y)) || Q.paths.some((p) => inRect(x, y, p))) continue;
    pa(x * T + 8, (y + 1) * T, small[h2(x, y) % small.length]);
    s.addWall(x * T + 2, y * T + 4, 12, 10);
    s.blocked.add(key(x, y));
  }
  // Rác vụn trên đất (không chắn)
  for (let i = 0; i < 70; i++) {
    const x = 2 + Math.floor(r() * (Q.w - 4)), y = 4 + Math.floor(r() * (Q.h - 7));
    if (s.blocked.has(key(x, y))) continue;
    const f = ['cardboard_1', 'cardboard_2', 'iron_beam', 'gray_brick', 'rock1', 'rock3', 'rock5', 'trash_bag_2'][Math.floor(r() * 8)];
    s.add.image(x * T + r() * 12 + 2, y * T + r() * 12 + 4, 'pa', f).setDepth(-970);
  }

  // Cửa xuống tầng hầm sâu
  const c = Q.cave;
  const cave = s.add.image(c.x * TILE, (c.y + 1) * TILE, 'q_door').setOrigin(0, 1).setDepth((c.y + 1) * TILE);
  s.addWall(cave.x + 2, cave.y - 34, 44, 32);
  s.fx.light(cave.x + 40, cave.y - 18, 22);
  s.add.text(cave.x + 24, cave.y - 50, 'Hầm sâu', { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '40px', color: '#fdd179', stroke: '#3d3333', strokeThickness: 8 }).setScale(0.25).setOrigin(0.5).setDepth(9000);
  for (let x = c.x; x < c.x + 3; x++) s.statics.set(key(x, c.y), () => caveAction(s));

  // Bàn đập hốc đá
  const a = Q.anvil;
  s.add.image(a.x * TILE, (a.y + 1) * TILE, 'q_anvil').setOrigin(0, 1).setDepth((a.y + 1) * TILE);
  s.fx.shadow(a.x * TILE + 16, (a.y + 1) * TILE - 1, 30);
  s.addWall(a.x * TILE + 2, a.y * TILE + 4, 28, 11);
  for (const x of [a.x, a.x + 1]) {
    s.blocked.add(key(x, a.y));
    s.statics.set(key(x, a.y), () => ({ label: 'Bàn phá khoá', run: () => bus.emit('panel', geodePanel) }));
  }
  sign(s, a.x + 2, a.y - 1, 'Phá hộp khoá');

  // Xe goòng: bán khoáng sản
  const ct = Q.cart;
  s.add.image(ct.x * TILE, (ct.y + 1) * TILE, 'q_cart').setOrigin(0, 1).setDepth((ct.y + 1) * TILE);
  s.fx.shadow(ct.x * TILE + 16, (ct.y + 1) * TILE - 1, 30);
  s.addWall(ct.x * TILE + 2, ct.y * TILE + 4, 28, 11);
  for (const x of [ct.x, ct.x + 1]) {
    s.blocked.add(key(x, ct.y));
    s.statics.set(key(x, ct.y), () => ({ label: 'Xe thu mua phế liệu', run: () => bus.emit('panel', mineralPanel) }));
  }

  // Đá & quặng (mọc lại mỗi ngày)
  s.quarrySprites = new Map();
  spawnNodes(s);
  for (const k of Object.keys(state.quarry.nodes)) renderNode(s, k);
  if (!state.quarryVisited) {
    state.quarryVisited = true;
    toast('Bãi phế liệu! Bê tông & phế liệu có lại mỗi sáng. Hộp khoá mang tới bàn phá khoá để mở.');
  }
}

function sign(s, x, y, text) {
  s.add.image(x * TILE + 8, (y + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((y + 1) * TILE);
  s.add.text(x * TILE + 8, y * TILE - 2, text, { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '32px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 7 }).setScale(0.25).setOrigin(0.5, 1).setDepth(9000);
}

// Ô trống để mọc đá
function freeTile(s, x, y) {
  const Q = QUARRY;
  if (x < 2 || x > Q.w - 3 || y < 4 || y > Q.h - 3) return false;
  if (Q.paths.some((p) => inRect(x, y, p))) return false;
  if (Q.plateaus.some((p) => inRect(x, y, p, 1))) return false;
  if (inRect(x, y, [Q.cave.x - 1, Q.cave.y - 3, Q.cave.x + 3, Q.cave.y + 2])) return false;
  if (inRect(x, y, [Q.anvil.x - 1, Q.anvil.y - 2, Q.cart.x + 2, Q.cart.y + 1])) return false;
  return !s.blocked.has(key(x, y));
}

function spawnNodes(s) {
  const dayKey = `${state.year}-${state.season}-${state.day}`;
  state.quarry = state.quarry || { day: null, nodes: {} };
  if (state.quarry.day === dayKey) return;
  state.quarry.day = dayKey;
  const nodes = (state.quarry.nodes = {});
  const taken = new Set();
  const can = (x, y) => freeTile(s, x, y) && !taken.has(key(x, y));
  for (let i = 0, tries = 0; i < 115 && tries < 3000; tries++) {
    const x = 2 + Math.floor(Math.random() * (QUARRY.w - 4)), y = 4 + Math.floor(Math.random() * (QUARRY.h - 6));
    const r = Math.random();
    if (r < 0.07 && [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => can(x + dx, y + dy))) {
      nodes[key(x, y)] = { type: 'boulder', hp: NODES.boulder.hp };
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) taken.add(key(x + dx, y + dy));
      i++;
      continue;
    }
    if (!can(x, y)) continue;
    // Đá thường đứng sát nhau thành cụm cho đẹp
    const type = r < 0.5 ? 'stone' : r < 0.72 ? 'ore_copper' : r < 0.84 ? 'ore_iron' : r < 0.9 ? 'ore_gold' : 'geode';
    nodes[key(x, y)] = { type, hp: NODES[type].hp };
    taken.add(key(x, y));
    i++;
  }
  changed();
}

const cells = (k, o) => {
  const [x, y] = k.split(',').map(Number);
  return o.type === 'boulder' ? [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]] : [[x, y]];
};

function renderNode(s, k) {
  s.quarrySprites.get(k)?.forEach((o) => o.destroy());
  s.quarrySprites.delete(k);
  const o = state.quarry.nodes[k];
  const [x, y] = k.split(',').map(Number);
  if (!o) return;
  const objs = [];
  let img;
  if (o.type === 'boulder') img = s.add.image(x * TILE + 16, (y + 2) * TILE, 'q_boulder').setOrigin(0.5, 1).setDepth((y + 2) * TILE - 1);
  else if (o.type === 'stone') img = s.add.image(x * TILE + 8, (y + 1) * TILE, 'cave_rubble').setOrigin(0.5, 1);
  else if (o.type === 'geode') img = s.add.image(x * TILE + 8, (y + 1) * TILE - 1, 'q_geode').setOrigin(0.5, 1);
  else img = s.add.image(x * TILE + 8, (y + 1) * TILE, o.type).setOrigin(0.5, 1);
  if (o.type !== 'boulder') img.setDepth((y + 1) * TILE - 1);
  if ((x + y) % 2) img.setFlipX(true);
  objs.push(img);
  const w = o.type === 'boulder' ? 2 : 1;
  objs.push(s.addWall(x * TILE + 2, y * TILE + (w === 2 ? 6 : 4), w * TILE - 4, w * TILE - (w === 2 ? 8 : 5), false));
  s.quarrySprites.set(k, objs);
  for (const [cx, cy] of cells(k, o)) {
    s.blocked.add(key(cx, cy));
    s.statics.set(key(cx, cy), (sel) => nodeAction(s, k, sel));
  }
}

function clearNode(s, k, o) {
  for (const [cx, cy] of cells(k, o)) {
    s.blocked.delete(key(cx, cy));
    s.statics.delete(key(cx, cy));
  }
  delete state.quarry.nodes[k];
  renderNode(s, k);
}

function nodeAction(s, k, sel) {
  const o = state.quarry.nodes[k];
  if (!o) return null;
  const n = NODES[o.type];
  if (sel.id !== 'pickaxe') return { act: false, label: `${n.name} — cần Cuốc chim` };
  if (toolLv('pickaxe') < n.lv) return { act: false, label: `${n.name} — cần Cuốc chim ${TIER[n.lv]} (nâng cấp ở Xưởng mộc)` };
  return {
    label: `Đập ${n.name}`,
    run: () => {
      if (!useEnergy(energyCost('pickaxe'))) return;
      s.playAction('axe');
      sfx('pick');
      o.hp -= toolLv('pickaxe');
      const [x, y] = k.split(',').map(Number);
      const spr = s.quarrySprites.get(k)?.[0];
      if (spr) s.tweens.add({ targets: spr, x: spr.x + 1.5, duration: 50, yoyo: true, repeat: 2 });
      s.puff(x + (o.type === 'boulder' ? 0.5 : 0), y + (o.type === 'boulder' ? 0.5 : 0), 0xc4b9ad);
      if (o.hp > 0) return changed();
      clearNode(s, k, o);
      const drops = [];
      if (o.type === 'boulder') {
        drops.push(['stone', 6 + Math.floor(Math.random() * 5)]);
        if (Math.random() < 0.35) drops.push(['geode', 1]);
        if (Math.random() < 0.3) drops.push(['ore_iron', 1 + Math.floor(Math.random() * 2)]);
        xp('mining', 6);
      } else {
        const id = o.type;
        drops.push([id, id === 'stone' ? 1 + (Math.random() < 0.4 ? 1 : 0) : 1]);
        if (id !== 'geode' && bonusChance('mining')) drops[0][1]++;
        xp('mining', id === 'stone' ? 1 : id === 'geode' ? 2 : 3);
      }
      for (const [id, q] of drops) {
        if (!bagHasRoom(id)) {
          toast('Túi đồ đầy — không nhặt được thêm!');
          break;
        }
        addItem(id, q);
        s.floatIcon(x * TILE + 8, y * TILE, ITEMS[id].tex, ITEMS[id].frame);
      }
      changed();
    },
  };
}

function caveAction(s) {
  if (!unlocked('deepcave')) return { act: false, label: `Hầm sâu — mở ở uy tín cấp ${needLevel('deepcave')}` };
  return {
    label: 'Xuống tầng hầm sâu',
    run: () =>
      bus.emit('dialog', {
        face: 'portrait',
        name: 'Tầng hầm sâu',
        text: state.deepDeepest
          ? `Tầng sâu nhất đã tới: ${state.deepDeepest}. Tầng 1–10 kho lạnh, 11–20 phòng lò hơi, từ 21 phòng thí nghiệm. Thang máy dừng mỗi 5 tầng:`
          : 'Hơi lạnh phả ra từ cửa thép... Tầng hầm sâu của căn cứ có phế liệu quý, hộp khoá và nhiều zombie lính hơn hầm trong rừng. Mang theo vũ khí và đồ ăn nhé!',
        choices: [...mineEntryChoices(s, 'deep'), { label: 'Thôi', onClick: null }],
      }),
  };
}

// ---------- Bàn đập hốc đá ----------
function crack(id) {
  if (!count(id)) return toast(`Hết ${ITEMS[id].name}`);
  if (state.coins < GEODE_PRICE) return toast('Không đủ xu!');
  const table = GEODE_LOOT[id];
  let r = Math.random() * table.reduce((a, t) => a + t[3], 0);
  const [out, lo, hi] = table.find((t) => (r -= t[3]) < 0) || table[0];
  const n = lo + Math.floor(Math.random() * (hi - lo + 1));
  if (!bagHasRoom(out)) return toast('Túi đồ đầy!');
  state.coins -= GEODE_PRICE;
  addItem(id, -1);
  addItem(out, n);
  xp('mining', 2);
  sfx(out.startsWith('gem') || out === 'bar_gold' ? 'success' : 'pick', 0.5);
  toast(`Cạch! ${ITEMS[id].name} mở ra: ${n} ${ITEMS[out].name}${out.startsWith('gem') ? '!' : ''}`);
  changed();
}

export const geodePanel = {
  title: 'Bàn phá khoá',
  rows() {
    return Object.keys(GEODE_LOOT).map((id) => ({
      icon: { tex: ITEMS[id].tex },
      name: `${ITEMS[id].name} — đang có ${count(id)}`,
      desc: `${GEODE_PRICE} xu/lần · ra: ${GEODE_LOOT[id].slice(0, 3).map(([o]) => ITEMS[o].name).join(', ')}…`,
      buttons: [
        { label: 'Đập 1', disabled: !count(id) || state.coins < GEODE_PRICE, onClick: () => crack(id) },
        {
          label: 'Đập hết',
          disabled: count(id) < 2 || state.coins < GEODE_PRICE * 2,
          onClick: () => {
            for (let i = count(id); i > 0 && state.coins >= GEODE_PRICE; i--) crack(id);
          },
        },
      ],
    }));
  },
};

// ---------- Xe goòng: bán khoáng sản ----------
const MINERALS = () => Object.keys(ITEMS).filter((id) => /^(ore_|gem_|bar_|geode)/.test(id) || id === 'stone');
export const mineralPanel = {
  title: 'Xe thu mua phế liệu',
  rows() {
    const ids = MINERALS().filter((id) => count(id) > 0);
    if (!ids.length) return [{ name: 'Chưa có phế liệu nào trong túi', desc: 'Đập bê tông, đống phế liệu và hộp khoá rồi quay lại bán nhé', buttons: [] }];
    return ids.map((id) => ({
      icon: { tex: ITEMS[id].tex, frame: ITEMS[id].frame },
      name: `${ITEMS[id].name} × ${count(id)}`,
      desc: `${ITEMS[id].sell} xu/cái · bán hết được ${ITEMS[id].sell * count(id)} xu (+uy tín)`,
      buttons: [
        { label: 'Bán 1', onClick: () => (addItem(id, -1), earnCoins(ITEMS[id].sell), sfx('coin', 0.4), changed()) },
        {
          label: 'Bán hết',
          onClick: () => {
            const n = count(id);
            addItem(id, -n);
            earnCoins(ITEMS[id].sell * n);
            sfx('coin');
            toast(`Đã bán ${n} ${ITEMS[id].name} được ${ITEMS[id].sell * n} xu`);
            changed();
          },
        },
      ],
    }));
  },
};

export { MINE_SPAWN };
