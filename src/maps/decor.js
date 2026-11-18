// ============================================================
//  Đồ trang trí ngoài trời: giếng, đèn đường, ghế, sạp chợ, đài phun nước,
//  bù nhìn, hộp thư, củi, hoa dại, cỏ cao, nấm, khúc gỗ, lá sen, lau sậy...
//  Hình vẽ bằng tools/make_props.py (atlas 'props').
// ============================================================
import Phaser from 'phaser';
import { TILE } from '../config.js';
import { state, toast, changed, sfx, addItem, roomFor, bus } from '../state.js';
import { basePanel } from '../survivalPanels.js';
import { dayNum } from '../survival.js';
import { ITEMS, FORAGE, SEASONS } from '../config.js';
import { bonusChance } from '../skills.js';
import { xp } from '../state.js';

const key = (x, y) => `${x},${y}`;

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// Đặt 1 món: (tx, ty) = ô dưới-trái của chân đồ; w = số ô ngang; rows = số hàng chặn
// Bỏ qua nếu chỗ đó đã có vật cản / nước / cửa / chỗ tương tác (để không bao giờ chặn lối đi).
export function prop(s, name, tx, ty, o = {}) {
  const w = o.w || 1, rows = o.rows || 1, solid = o.solid !== false;
  const tiles = [];
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < rows; dy++) tiles.push([tx + dx, ty - dy]);
  const bad = ([x, y]) => {
    const k = key(x, y);
    return !s.inMap(x, y) || s.blocked.has(k) || s.terrain.water.has(k) || s.statics.has(k) || s.exits.has(k) ||
      (solid && !o.onPath && s.isDirt(x, y)) || (s.mapId === 'farm' && (state.tiles[k] || state.objects?.[k]));
  };
  if (tiles.some(bad)) return null;
  const tex = o.tex || 'props';
  const img = s.add.image((tx + w / 2) * TILE + (o.dx || 0), (ty + 1) * TILE + (o.dy || 0), tex, name ?? undefined).setOrigin(0.5, 1);
  img.setDepth(o.depth ?? (ty + 1) * TILE - 1);
  for (const [x, y] of tiles) s.removeDecor(key(x, y));
  if (solid) {
    img.shadowObj = s.fx.shadow(img.x, (ty + 1) * TILE - 1, Math.min(img.width + 2, w * TILE + 6));
    img.wallObj = s.addWall(tx * TILE + 2, (ty - rows + 1) * TILE + 4, w * TILE - 4, rows * TILE - 6);
    img.tiles = tiles;
  }
  if (o.label || o.action) for (const [x, y] of tiles) s.statics.set(key(x, y), o.action || (() => ({ act: false, label: o.label })));
  if (o.action) s.interactables?.push({ img, r: img.getBounds(), tx, ty });
  return img;
}

function lamp(s, tx, ty) {
  const img = prop(s, 'lamp', tx, ty, { label: 'Đèn đường' });
  if (img) s.fx.light(img.x, img.y - 33, 46);
  return img;
}

// Thùng phuy đốt lửa sưởi — nguồn sáng ban đêm ở vùng hoang
export function fireBarrel(s, tx, ty) {
  const img = prop(s, 'barrel', tx, ty, { tex: 'surv', label: 'Thùng phuy đốt lửa sưởi' });
  if (!img) return null;
  const fire = s.add.image(img.x, img.y - img.height + 3, 'surv', 'campfire0').setOrigin(0.5, 1).setScale(0.55).setDepth(img.depth + 1);
  let fr = 0;
  s.time.addEvent({ delay: 170, loop: true, callback: () => fire.active && fire.setFrame(`campfire${(fr = 1 - fr)}`) });
  s.fx.light(img.x, img.y - img.height, 80);
  return img;
}

// Đồ nhỏ không chặn đường (đặt vào decor để cuốc đất / đặt đồ tự dọn)
// Hoa dại / nấm mọc trên cỏ: chỉ là đồ trang trí hái được — cầm cuốc thì cuốc đè lên luôn
// (WorldScene.actionAt bỏ qua, removeDecor xoá kèm)
function decorStatic(fn) {
  fn.decor = true;
  return fn;
}

function small(s, name, x, y, flip) {
  const k = key(x, y);
  if (s.decor.has(k)) return;
  const tex = s.textures.get('props').has(name) ? 'props' : 'icons'; // nấm mới vẽ trong atlas icons
  const img = s.add.image(x * TILE + 8, (y + 1) * TILE, tex, name).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 4).setFlipX(!!flip);
  if (tex === 'icons') img.setScale(0.8);
  if (name === 'mush_glow') {
    // nấm phát quang: nhấp nháy xanh + có ánh sáng ban đêm
    s.tweens.add({ targets: img, alpha: { from: 1, to: 0.65 }, yoyo: true, repeat: -1, duration: 900 + (x * 37 % 400) });
    s.fx?.light?.(img.x, img.y - 6, 22);
  }
  s.decor.set(k, img);
  return img;
}

// Nấm hái được: hái xong mọc lại vào ngày hôm sau (cùng chỗ)
function mushroom(s, kind, x, y, flip) {
  const k = key(x, y);
  const pk = `${s.mapId}:${k}`;
  if (s.decor.has(k) || s.statics.has(k) || state.mushPicked?.[pk] === dayNum()) return;
  const img = small(s, kind, x, y, flip);
  if (!img) return;
  const name = ITEMS[kind].name;
  s.statics.set(k, decorStatic(() => ({
    label: `Hái ${name}`,
    run: () => {
      if (!roomFor(kind)) return;
      addItem(kind, 1);
      sfx('grass', 0.5);
      s.floatIcon(x * TILE + 8, y * TILE, ITEMS[kind].tex, ITEMS[kind].frame);
      state.mushPicked = { ...(state.mushPicked || {}), [pk]: dayNum() };
      img.destroy();
      s.decor.delete(k);
      s.statics.delete(k);
      changed();
    },
  })));
}

// Hái lượm theo ngày: bụi cây thuốc & khóm hoa dại — hái xong héo đi, mai mọc lại
const pickedToday = (pk) => state.pickDay?.[pk] === dayNum();
function markPicked(pk) {
  state.pickDay = state.pickDay || {};
  // dọn dấu cũ cho save gọn
  for (const [k, d] of Object.entries(state.pickDay)) if (d !== dayNum()) delete state.pickDay[k];
  state.pickDay[pk] = dayNum();
}
function give(s, x, y, id, n) {
  if (!n || !roomFor(id)) return null;
  addItem(id, n);
  s.floatIcon(x * TILE + 8, y * TILE - 4, ITEMS[id].tex, ITEMS[id].frame);
  return `${n} ${ITEMS[id].name}`;
}

// Khúc gỗ mục trong rừng: cầm rìu chặt lấy gỗ (2–4), hôm sau có khúc khác lăn về chỗ cũ
function rottenLog(s, x, y) {
  const pk = `${s.mapId}:log:${key(x, y)}`;
  if (pickedToday(pk)) return true; // đã chặt hôm nay: chỗ trống, vẫn tính là có
  let img = null;
  img = prop(s, 'log', x, y, {
    w: 2,
    action: (sel) => {
      if (sel?.kind !== 'tool' || sel.id !== 'axe') return { act: false, label: 'Khúc gỗ mục — cầm Rìu để chặt lấy gỗ' };
      return {
        label: 'Chặt khúc gỗ mục lấy gỗ',
        run: () => {
          if (!roomFor('wood')) return;
          s.playAction?.('axe');
          sfx('chop', 0.5);
          const got = give(s, x, y, 'wood', 2 + Math.floor(Math.random() * 2) + (bonusChance('foraging') ? 1 : 0));
          if (!got) return;
          xp('foraging', 1);
          markPicked(pk);
          s.puff?.(x, y, 0x8a5a34);
          s.puff?.(x + 1, y, 0x8a5a34);
          for (const [tx, ty] of img.tiles || []) {
            s.statics.delete(key(tx, ty));
            s.blocked.delete(key(tx, ty));
          }
          s.interactables = (s.interactables || []).filter((o) => o.img !== img);
          img.wallObj?.destroy();
          img.shadowObj?.destroy();
          img.destroy();
          toast(`+${got}`);
          changed();
        },
      };
    },
  });
  return img;
}

// Bụi rậm hái lượm (tools/make_bushes_pc.py → 'pc_bushes2', mỗi loại 2 khung: đầy / đã hái).
// Hái xong bụi xỉn đi, hôm sau ra lại; trái mùa thì bụi trơ.
export const BUSHES = {
  mulberry: { frame: 0, name: 'Bụi dâu tằm', verb: 'Hái dâu tằm', seasons: ['spring', 'summer'], give: ['mulberry', 2, 4], fx: 0x6a2458 },
  blueberry: { frame: 2, name: 'Bụi việt quất', verb: 'Hái việt quất', seasons: ['summer', 'autumn'], give: ['blueberry', 2, 4], fx: 0x3a54a8 },
  herb: { frame: 4, name: 'Bụi lá thuốc', verb: 'Hái lá thuốc', seasons: ['spring', 'summer', 'autumn'], give: ['herb', 1, 2], fx: 0x8ac050 },
  tea: { frame: 6, name: 'Bụi trà', verb: 'Hái lá trà', seasons: ['spring', 'summer', 'autumn'], give: ['tealeaf', 1, 3], fx: 0xa8d860 },
  rose: { frame: 8, name: 'Bụi hoa hồng', verb: 'Hái hoa hồng', seasons: ['spring', 'summer'], give: ['rose', 1, 2], fx: 0xd83a4a },
  daisy: { frame: 10, name: 'Bụi hoa cúc', verb: 'Hái hoa cúc', seasons: ['spring', 'autumn'], give: ['daisy', 1, 3], fx: 0xffffff },
  lavender: { frame: 12, name: 'Bụi oải hương', verb: 'Hái oải hương', seasons: ['summer'], give: ['lavender', 1, 3], fx: 0xa070e0 },
};
const SEASON_VN = { spring: 'xuân', summer: 'hạ', autumn: 'thu', winter: 'đông' };

function forageBush(s, kind, x, y) {
  const B = BUSHES[kind];
  const pk = `${s.mapId}:bush:${key(x, y)}`;
  const sid = SEASONS[state.season].id;
  const inSeason = B.seasons.includes(sid);
  let img = null;
  img = prop(s, B.frame + (inSeason && !pickedToday(pk) ? 0 : 1), x, y, {
    tex: 'pc_bushes2',
    w: 2,
    action: () => {
      if (!inSeason) return { act: false, label: `${B.name} — mùa này chưa có, ra vào mùa ${B.seasons.map((x) => SEASON_VN[x]).join(', ')}` };
      if (pickedToday(pk)) return { act: false, label: `${B.name} — đã hái hôm nay, mai lại có` };
      return {
        label: B.verb,
        run: () => {
          const [id, lo, hi] = B.give;
          const n = lo + Math.floor(Math.random() * (hi - lo + 1)) + (bonusChance('foraging') ? 1 : 0);
          const got = give(s, x, y, id, n);
          if (!got) return;
          markPicked(pk);
          sfx('grass', 0.5);
          xp('foraging', 1);
          // bụi rung + quả/cánh hoa văng ra rồi chuyển sang hình đã hái
          s.tweens.add({ targets: img, scaleX: { from: 1.12, to: 1 }, scaleY: { from: 0.9, to: 1 }, duration: 260, ease: 'Back.easeOut' });
          s.burst?.(img.x, img.y - 12, 'fx_dust', 8, B.fx, 14, 10, 520);
          s.time.delayedCall(120, () => img.active && img.setFrame(B.frame + 1));
          toast(`Hái được ${got}`);
          changed();
        },
      };
    },
  });
  return img;
}

// Khóm hoa dại: hái 1 hoa, khóm héo tới hôm sau
function wildFlower(s, kind, x, y, flip) {
  const k = key(x, y);
  const pk = `${s.mapId}:fl:${k}`;
  if (s.decor.has(k) || s.statics.has(k) || pickedToday(pk)) return;
  const img = small(s, kind, x, y, flip);
  if (!img) return;
  s.statics.set(k, decorStatic(() => ({
    label: 'Hái hoa dại',
    run: () => {
      if (!give(s, x, y, 'flower', 1)) return;
      if (Math.random() < 0.15) give(s, x, y - 1, 'herb', 1);
      sfx('grass', 0.45);
      xp('foraging', 1);
      markPicked(pk);
      img.destroy();
      s.decor.delete(k);
      s.statics.delete(k);
      changed();
    },
  })));
}

// Cụm hoa dại / cỏ cao / nấm... rải theo cụm (không rải đều) cho tự nhiên
export function patches(s, isFree, n, seed, kinds) {
  const r = rng(seed);
  const winter = s.sea.id === 'winter';
  if (winter) return;
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(r() * s.mapW), cy = Math.floor(r() * s.mapH);
    const kind = kinds[Math.floor(r() * kinds.length)];
    const size = 2 + Math.floor(r() * 4);
    for (let j = 0; j < size; j++) {
      const x = cx + Math.round((r() - 0.5) * 4), y = cy + Math.round((r() - 0.5) * 3);
      if (!s.inMap(x, y) || !isFree(x, y)) continue;
      if (kind.startsWith('mush')) mushroom(s, kind, x, y, r() < 0.5);
      else if (kind.startsWith('wild_')) wildFlower(s, kind, x, y, r() < 0.5);
      else small(s, kind, x, y, r() < 0.5);
    }
  }
}

// Ven ao: lá sen trên mặt nước, lau sậy trên bờ
export function waterside(s, seed) {
  const r = rng(seed);
  const W = s.terrain.water;
  const winter = s.sea.id === 'winter';
  for (const k of W) {
    const [x, y] = k.split(',').map(Number);
    let inner = true;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (!W.has(key(x + dx, y + dy))) inner = false;
    if (!winter && inner && r() < 0.13) {
      const lily = s.add.image(x * TILE + 4 + r() * 8, y * TILE + 4 + r() * 8, 'props', r() < 0.3 ? 'lily1' : 'lily0').setDepth(-845).setFlipX(r() < 0.5);
      s.tweens.add({ targets: lily, y: lily.y + 0.8, yoyo: true, repeat: -1, duration: 1600 + r() * 900, ease: 'Sine.easeInOut' });
    }
    // bờ: ô cỏ ngay cạnh nước
    if (winter) continue;
    for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy, nk = key(nx, ny);
      if (W.has(nk) || !s.inMap(nx, ny) || s.blocked.has(nk) || s.isDirt(nx, ny) || s.statics.has(nk) || r() > 0.09) continue;
      const img = small(s, r() < 0.6 ? (r() < 0.5 ? 'reeds0' : 'reeds1') : 'stones', nx, ny, r() < 0.5);
      if (img && dy === -1) img.setDepth((ny + 1) * TILE - 4);
    }
  }
}

// ---------------- Làng ----------------
export function decorateVillage(s) {
  // Lửa trại giữa quảng trường (trại người sống sót)
  const f = prop(s, 'campfire0', 20, 15, { tex: 'surv', onPath: true, label: 'Lửa trại — mọi người quây quần mỗi tối' });
  if (f) {
    let fr = 0;
    s.time.addEvent({ delay: 180, loop: true, callback: () => f.active && f.setFrame(`campfire${(fr = 1 - fr)}`) });
    s.fx.light(f.x, f.y - 8, 90);
    const glow = s.add.image(f.x, f.y - 8, 'fx_glow').setDisplaySize(60, 60).setTint(0xff9a40).setBlendMode(1).setDepth(9300).setAlpha(0.35);
    s.tweens.add({ targets: glow, alpha: 0.2, yoyo: true, repeat: -1, duration: 300 });
  }
  // Lều, tháp canh, bao cát ở cổng
  for (const [x, y, k] of [[22, 20, 'tent_green'], [26, 20, 'tent_tan'], [36, 20, 'tent_green'], [40, 20, 'tent_tan'], [28, 5, 'tent_tan']]) prop(s, k, x, y, { tex: 'surv', w: 3, label: 'Lều của người sống sót' });
  prop(s, 'watchtower', 1, 14, { tex: 'surv', w: 2, label: 'Tháp canh của trại' });
  for (const [x, y] of [[16, 32], [22, 32], [1, 9], [1, 14]]) prop(s, 'sandbags', x, y, { tex: 'surv', w: 2, label: 'Bao cát' });
  prop(s, 'barricade', 23, 31, { tex: 'surv', w: 2, label: 'Cổng nam → Thị trấn bỏ hoang (nguy hiểm!)' });
  prop(s, 'car_red', 44, 4, { tex: 'surv', w: 3, label: 'Xe hỏng' });
  prop(s, 'tires', 48, 11, { tex: 'surv', label: 'Lốp xe' });
  for (const [x, y] of [[16, 15], [23, 15]]) prop(s, 'bench', x, y, { w: 2, onPath: true, label: 'Ghế đá công viên' });
  // Đèn đường quanh quảng trường & dọc phố
  for (const [x, y] of [[14, 13], [26, 12], [14, 17], [26, 17], [11, 8], [24, 8], [37, 8], [8, 13], [30, 15], [38, 15], [18, 29], [22, 29], [35, 23], [3, 13]]) lamp(s, x, y);
  // Phố chợ: 3 sạp, thùng & thùng tô nô xen giữa
  prop(s, 'stall_red', 27, 11, { w: 3, label: 'Sạp rau củ — phiên chợ sáng' });
  prop(s, 'stall_green', 31, 11, { w: 3, label: 'Sạp trái cây' });
  prop(s, 'stall_blue', 35, 11, { w: 3, label: 'Sạp cá & hải sản' });
  prop(s, null, 30, 11, { tex: 'shop_barrel', label: 'Thùng gỗ' });
  prop(s, null, 34, 11, { tex: 'shop_crate', label: 'Thùng hàng' });
  prop(s, 'cart', 38, 12, { w: 2, label: 'Xe đẩy chở rau' });
  // Giếng làng, củi, rơm
  prop(s, 'well', 8, 17, { w: 2, label: 'Giếng làng — nước mát lắm' });
  prop(s, 'woodpile', 14, 21, { w: 2, label: 'Đống củi của Xưởng mộc' });
  prop(s, 'haybale', 26, 21, { label: 'Rơm cho bò' });
  prop(s, 'haybale', 27, 22, { label: 'Rơm cho bò' });
  // Bồn hoa, chậu hoa, ghế ven ao, biển chỉ đường
  for (const [x, y, k] of [[6, 8, 'planter_warm'], [27, 16, 'planter_cool'], [42, 15, 'planter_warm'], [10, 19, 'planter_cool']]) prop(s, k, x, y, { w: 2, label: 'Bồn hoa' });
  for (const [x, y, k] of [[13, 8, 'pot_red'], [22, 8, 'pot_yellow'], [29, 8, 'pot_red'], [36, 8, 'pot_yellow']]) prop(s, k, x, y, { label: 'Chậu hoa' });
  prop(s, 'bench', 47, 24, { w: 2, label: 'Ghế ngắm ao' });
  prop(s, 'signpost', 2, 10, { label: '← Nông trại · Quảng trường →' });
  for (const [x, y] of [[9, 7], [43, 9], [12, 24], [46, 20]]) prop(s, 'mailbox', x, y, { label: 'Hộp thư' });
  waterside(s, 31);
  patches(s, (x, y) => !s.blocked.has(key(x, y)) && !s.isDirt(x, y) && !s.statics.has(key(x, y)), 26, 77, ['wild_yellow', 'wild_purple', 'wild_blue', 'grass0', 'grass1']);
  // Chó mèo của làng
  spawnCritter(s, 'cat', 18, 16, 3);
  spawnCritter(s, 'catorange', 33, 13, 4);
  spawnCritter(s, 'dogyellow', 9, 13, 4);
  spawnCritter(s, 'dog', 38, 26, 3);
}

// ---------------- Nông trại ----------------
export function decorateFarm(s, isFree) {
  prop(s, 'mailbox', 12, 8, { label: 'Hộp thư — chưa có thư mới' });
  // Bàn chế tạo: chỗ mặc định bị vướng (đất cuốc, đồ đặt) thì thử chỗ khác gần nhà — không bao giờ mất bàn
  const bench = { tex: 'pc_workbench', w: 2, action: () => ({ label: 'Bàn chế tạo — chế đồ & nâng cấp căn cứ', run: () => bus.emit('panel', basePanel) }) };
  [[12, 6], [9, 7], [15, 7], [6, 9], [16, 9], [3, 11], [22, 9]].some(([x, y]) => prop(s, null, x, y, bench));
  prop(s, 'woodpile', 1, 9, { w: 2, label: 'Đống củi' });
  // Cổng chắn & tháp canh: vẽ ở src/raid.js theo cấp hàng rào
  // Máy phát điện: đèn pha ban đêm
  if ((state.base?.generator || 0) >= 1) for (const [x, y] of [[8, 9], [10, 18], [20, 12], [30, 12], [45, 12], [24, 8], [34, 8]]) s.fx.light(x * TILE + 8, y * TILE, 70);
  prop(s, 'well', 10, 5, { w: 2, action: (sel) => (sel.id === 'can' ? { label: 'Múc nước giếng vào bình', run: () => s.refill() } : { act: false, label: 'Giếng nước — chọn bình tưới để múc nước' }) });
  prop(s, 'scarecrow', 16, 22, { label: 'Bù nhìn canh ruộng' });
  for (const [x, y] of [[26, 10], [33, 10], [49, 10], [58, 10], [12, 13]]) lamp(s, x, y);
  prop(s, 'signpost', 21, 13, { label: '↓ Rừng · Hầm quân sự   → Trại' });
  prop(s, 'bench', 34, 14, { w: 2, label: 'Ghế ngồi ngắm ao' });
  prop(s, 'haybale', 27, 5, { label: 'Rơm' });
  waterside(s, 17);
  patches(s, isFree, 40, 55, ['wild_yellow', 'wild_purple', 'wild_blue', 'grass0', 'grass1', 'grass0']);
}

// ---------------- Rừng ----------------
// tỉ lệ các loại bụi trong rừng: quả dại 35%, lá 30%, hoa 35%
const BUSH_MIX = ['mulberry', 'blueberry', 'mulberry', 'blueberry', 'herb', 'tea', 'herb', 'rose', 'daisy', 'lavender', 'rose', 'daisy'];

export function decorateForest(s) {
  const free = (x, y) => s.forestFree(x, y) && !s.statics.has(key(x, y));
  const nearPath = (x, y) => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => s.isDirt(x + dx, y + dy));
  const r = rng(909);
  let logs = 0, bushes = 0;
  for (let i = 0; i < 1400 && (logs < 11 || bushes < 34); i++) {
    const x = 2 + Math.floor(r() * (s.mapW - 4)), y = 3 + Math.floor(r() * (s.mapH - 5));
    if (!free(x, y) || nearPath(x, y)) continue;
    if (logs < 11 && r() < 0.4) { if (free(x + 1, y) && !nearPath(x + 1, y) && rottenLog(s, x, y)) logs++; }
    else if (bushes < 34 && free(x + 1, y) && forageBush(s, BUSH_MIX[Math.floor(r() * BUSH_MIX.length)], x, y)) bushes++;
  }
  prop(s, 'signpost', 21, 8, { label: '→ Hầm quân sự   ← Hồ cá' });
  waterside(s, 41);
  // rừng nhiều nấm: ăn được khi nấu (mối, sò), nấm rừng, nấm độc; còn nhiễm bệnh thì mọc nấm phát quang
  const infected = (state.zones?.forest?.infection ?? 100) > 0;
  const mush = ['mush_red', 'mush_brown', 'mush_termite', 'mush_oyster', 'mush_termite', 'mush_deathcap', ...(infected ? ['mush_glow', 'mush_glow'] : [])];
  patches(s, free, 90, 123, [...mush, 'grass0', 'grass1', 'wild_purple', 'wild_yellow', 'stones']);
}

// ---------------- Chó mèo trong làng / nông trại ----------------
// Hình Ninja Adventure (CC0): 2 khung ngồi/chạy, mặt hướng phải
export const CRITTERS = {
  cat: { tex: 'cr_cat', w: 16, h: 16, name: 'Mèo Mướp', sound: 'Meo~' },
  catorange: { tex: 'cr_catorange', w: 22, h: 17, name: 'Mèo Cam', sound: 'Meooo~' },
  dog: { tex: 'cr_dog', w: 16, h: 16, name: 'Chó Vện', sound: 'Gâu gâu!' },
  dogyellow: { tex: 'cr_dogyellow', w: 21, h: 17, name: 'Chó Vàng', sound: 'Gâu!' },
};

export function spawnCritter(s, kind, hx, hy, r = 4, opts = {}) {
  const C = { ...CRITTERS[kind], ...(opts.name ? { name: opts.name } : {}) };
  if (!C || !s.textures.exists(C.tex)) return;
  const sprite = s.add.sprite(hx * TILE + 8, (hy + 1) * TILE, C.tex, 0).setOrigin(0.5, 1);
  s.fx.followShadow(sprite, 10, -1);
  let petDay = null;
  let name = null;
  if (opts.name) {
    name = s.add.text(0, 0, opts.name, { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '30px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 6 }).setScale(0.25).setOrigin(0.5, 1).setDepth(8900);
    const follow = () => name.active && sprite.active && name.setPosition(sprite.x, sprite.y - 15);
    s.events.on('update', follow);
    s.events.once('shutdown', () => s.events.off('update', follow));
  }
  const m = {
    kind: 'critter',
    sprite,
    next: s.time.now + Phaser.Math.Between(500, 3000),
    wander: () => {
      const t = s.moverTile(m);
      const tries = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]];
      const [dx, dy] = tries[Phaser.Math.Between(0, tries.length - 1)];
      const nx = t.x + dx, ny = t.y + dy;
      if (Math.abs(nx - hx) > r || Math.abs(ny - hy) > r || !s.walkable(nx, ny) || (dx === 2 && !s.walkable(t.x + 1, ny)) || (dx === -2 && !s.walkable(t.x - 1, ny))) return 700;
      if (dx) sprite.setFlipX(dx < 0);
      const dur = (Math.abs(dx) + Math.abs(dy)) * 380;
      let f = 0;
      const ev = s.time.addEvent({ delay: 120, loop: true, callback: () => sprite.active && sprite.setFrame((f = 1 - f)) });
      s.tweens.add({ targets: sprite, x: nx * TILE + 8, y: (ny + 1) * TILE, duration: dur, onComplete: () => (ev.remove(), sprite.active && sprite.setFrame(0)) });
      return dur + Phaser.Math.Between(1200, 6000);
    },
    action: () => {
      if (opts.action) return opts.action(m);
      const day = `${state.year}-${state.season}-${state.day}`;
      return {
        label: `Vuốt ve ${C.name}`,
        run: () => {
          s.floatText(sprite.x, sprite.y - 14, '♥', '#ff6b8a');
          s.floatText(sprite.x, sprite.y - 22, C.sound, '#fee1b8');
          m.hold = s.time.now + 2500;
          if (petDay !== day) petDay = day;
        },
      };
    },
  };
  s.movers.push(m);
  return m;
}

// ---------------- Thú cưng của nông trại ----------------
const dayKey = () => `${state.year}-${state.season}-${state.day}`;
export function spawnPet(s) {
  const P = state.pet;
  if (!P || !CRITTERS[P.kind]) return;
  spawnCritter(s, P.kind, 13, 9, 5, {
    name: P.name,
    action: (m) => {
      if (P.petDay === dayKey()) return { act: false, label: `${P.name} ${'♥'.repeat(Math.min(5, Math.floor((P.pts || 0) / 10)))} — hôm nay đã được vuốt ve` };
      return {
        label: `Vuốt ve ${P.name}`,
        run: () => {
          P.petDay = dayKey();
          P.pts = Math.min(50, (P.pts || 0) + 2);
          s.floatText(m.sprite.x, m.sprite.y - 14, '♥', '#ff6b8a');
          s.floatText(m.sprite.x, m.sprite.y - 22, CRITTERS[P.kind].sound, '#fee1b8');
          m.hold = s.time.now + 2500;
          sfx('animal', 0.4);
          // Thú cưng thân thiết đôi khi tha đồ về tặng chủ
          const pool = FORAGE[['spring', 'summer', 'autumn', 'winter'][state.season]] || [];
          if (Math.random() < 0.15 + (P.pts || 0) / 200 && pool.length) {
            const id = pool[Math.floor(Math.random() * pool.length)];
            if (ITEMS[id] && roomFor(id)) {
              addItem(id, 1);
              toast(`${P.name} tha về cho bạn 1 ${ITEMS[id].name}!`);
            }
          } else toast(`${P.name} vui lắm, quẫy đuôi rối rít!`);
          changed();
        },
      };
    },
  });
}
