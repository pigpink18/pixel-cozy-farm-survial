// ============================================================
//  Nội thất & trang trí nhà
//  state.home = { lv, wall, floor, styles: { wall: [], floor: [] }, owned: { id: n }, placed: [{ uid, id, x, y, flip }] }
//  - kind 'floor' : đồ đặt trên sàn (chắn đường đi)
//  - kind 'rug'   : thảm (nằm dưới, đi qua được, đồ khác đặt lên được)
//  - kind 'wall'  : đồ treo tường (chỉ đặt trên 2 hàng tường)
//  Ảnh đặt theo góc dưới-trái của ô chiếm chỗ (fw × fh ô); đồ cao hơn sẽ trùm lên ô phía trên
// ============================================================
import { state, count, addItem } from './state.js';

// cat: nhóm hiển thị trong cửa hàng & thanh trang trí
export const FURN = {
  // --- có sẵn trong nhà (dời được) ---
  bed_basic: { name: 'Giường gỗ', frame: 'bed_basic', fw: 1, fh: 2, kind: 'floor', price: 300, use: 'sleep', cat: 'bed' },
  table_basic: { name: 'Bàn ăn đỏ', frame: 'table_basic', fw: 2, fh: 1, kind: 'floor', price: 250, cat: 'table' },
  stove: { name: 'Bếp lò', frame: 'stove', fw: 2, fh: 1, kind: 'floor', price: 500, use: 'cook', cat: 'kitchen' },
  storage_chest: { name: 'Rương chứa đồ', tex: 'objects', frame: 'chestStore', fw: 1, fh: 1, kind: 'floor', use: 'chest', cat: 'storage', bag: true },
  // --- giường ---
  bed_blue: { name: 'Giường chăn xanh', frame: 'bed_blue', fw: 1, fh: 2, kind: 'floor', price: 450, use: 'sleep', cat: 'bed' },
  bed_pink: { name: 'Giường chăn hồng', frame: 'bed_pink', fw: 1, fh: 2, kind: 'floor', price: 450, use: 'sleep', cat: 'bed' },
  bed_green: { name: 'Giường chăn lá', frame: 'bed_green', fw: 1, fh: 2, kind: 'floor', price: 450, use: 'sleep', cat: 'bed' },
  bed_double: { name: 'Giường đôi đỏ', frame: 'bed_double', fw: 2, fh: 2, kind: 'floor', price: 900, use: 'sleep', cat: 'bed', lv: 2 },
  bed_double_purple: { name: 'Giường đôi tím', frame: 'bed_double_purple', fw: 2, fh: 2, kind: 'floor', price: 950, use: 'sleep', cat: 'bed', lv: 2 },
  // --- ghế ---
  sofa_red: { name: 'Sofa đỏ', frame: 'sofa_red', fw: 2, fh: 1, kind: 'floor', price: 600, cat: 'seat' },
  sofa_blue: { name: 'Sofa xanh', frame: 'sofa_blue', fw: 2, fh: 1, kind: 'floor', price: 600, cat: 'seat' },
  sofa_green: { name: 'Sofa lá', frame: 'sofa_green', fw: 2, fh: 1, kind: 'floor', price: 600, cat: 'seat' },
  armchair_red: { name: 'Ghế bành đỏ', frame: 'armchair_red', fw: 1, fh: 1, kind: 'floor', price: 280, cat: 'seat' },
  armchair_teal: { name: 'Ghế bành ngọc', frame: 'armchair_teal', fw: 1, fh: 1, kind: 'floor', price: 280, cat: 'seat' },
  chair_wood: { name: 'Ghế gỗ đệm đỏ', frame: 'chair_wood', fw: 1, fh: 1, kind: 'floor', price: 90, cat: 'seat' },
  chair_blue: { name: 'Ghế gỗ đệm xanh', frame: 'chair_blue', fw: 1, fh: 1, kind: 'floor', price: 90, cat: 'seat' },
  stool_round: { name: 'Ghế đẩu tròn', frame: 'stool_round', fw: 1, fh: 1, kind: 'floor', price: 50, cat: 'seat' },
  f_chair: { name: 'Ghế tựa', tex: 'interior', frame: 13, fw: 1, fh: 1, kind: 'floor', price: 60, cat: 'seat' },
  f_stool: { name: 'Ghế đẩu', tex: 'twfurn', frame: 10, fw: 1, fh: 1, kind: 'floor', price: 50, cat: 'seat' },
  // --- bàn ---
  table_round: { name: 'Bàn tròn', frame: 'table_round', fw: 2, fh: 1, kind: 'floor', price: 220, cat: 'table' },
  table_long: { name: 'Bàn dài khăn caro', frame: 'table_long', fw: 2, fh: 1, kind: 'floor', price: 300, cat: 'table' },
  coffee_table: { name: 'Bàn trà', frame: 'coffee_table', fw: 2, fh: 1, kind: 'floor', price: 180, cat: 'table' },
  desk: { name: 'Bàn làm việc', frame: 'desk', fw: 2, fh: 1, kind: 'floor', price: 350, cat: 'table' },
  // --- tủ kệ ---
  bookshelf: { name: 'Kệ sách', frame: 'bookshelf', fw: 1, fh: 1, kind: 'floor', price: 320, cat: 'storage' },
  wardrobe: { name: 'Tủ quần áo', frame: 'wardrobe', fw: 2, fh: 1, kind: 'floor', price: 480, cat: 'storage' },
  dresser: { name: 'Tủ ngăn kéo', frame: 'dresser', fw: 2, fh: 1, kind: 'floor', price: 380, cat: 'storage' },
  cabinet: { name: 'Tủ nhỏ', frame: 'cabinet', fw: 1, fh: 1, kind: 'floor', price: 160, cat: 'storage' },
  f_shelf: { name: 'Tủ gỗ', tex: 'twfurn', frame: 4, fw: 1, fh: 1, kind: 'floor', price: 150, cat: 'storage' },
  // --- bếp ---
  fridge: { name: 'Tủ lạnh', frame: 'fridge', fw: 1, fh: 1, kind: 'floor', price: 700, cat: 'kitchen', lv: 2 },
  kitchen_counter: { name: 'Kệ bếp', frame: 'kitchen_counter', fw: 1, fh: 1, kind: 'floor', price: 200, cat: 'kitchen' },
  sink: { name: 'Bồn rửa', frame: 'sink', fw: 1, fh: 1, kind: 'floor', price: 240, cat: 'kitchen' },
  // --- đồ lớn ---
  fireplace: { name: 'Lò sưởi', frame: 'fireplace', fw: 2, fh: 1, kind: 'floor', price: 1200, cat: 'fun', lv: 3, light: true },
  piano: { name: 'Đàn piano', frame: 'piano', fw: 2, fh: 1, kind: 'floor', price: 2000, cat: 'fun', lv: 4, use: 'piano' },
  aquarium: { name: 'Bể cá', frame: 'aquarium', fw: 2, fh: 1, kind: 'floor', price: 1500, cat: 'fun', lv: 3 },
  bathtub: { name: 'Bồn tắm', frame: 'bathtub', fw: 2, fh: 1, kind: 'floor', price: 900, cat: 'fun', lv: 2 },
  radio: { name: 'Đài radio', frame: 'radio', fw: 1, fh: 1, kind: 'floor', price: 400, cat: 'fun', use: 'radio' },
  toy_box: { name: 'Hộp đồ chơi', frame: 'toy_box', fw: 1, fh: 1, kind: 'floor', price: 150, cat: 'fun' },
  // --- đèn & cây ---
  floor_lamp: { name: 'Đèn cây', frame: 'floor_lamp', fw: 1, fh: 1, kind: 'floor', price: 200, cat: 'plant', light: true },
  table_lamp: { name: 'Tủ đầu giường có đèn', frame: 'table_lamp', fw: 1, fh: 1, kind: 'floor', price: 180, cat: 'plant', light: true },
  f_lamp: { name: 'Đèn ngủ', tex: 'twfurn', frame: 12, fw: 1, fh: 1, kind: 'floor', price: 90, cat: 'plant', light: true },
  f_candles: { name: 'Nến thơm', tex: 'interior', frame: 25, fw: 1, fh: 1, kind: 'floor', price: 40, cat: 'plant', light: true },
  plant_big: { name: 'Cây cảnh lớn', frame: 'plant_big', fw: 1, fh: 1, kind: 'floor', price: 180, cat: 'plant' },
  cactus: { name: 'Xương rồng', frame: 'cactus', fw: 1, fh: 1, kind: 'floor', price: 80, cat: 'plant' },
  vase_pink: { name: 'Bình hoa hồng', frame: 'vase_pink', fw: 1, fh: 1, kind: 'floor', price: 70, cat: 'plant' },
  vase_yellow: { name: 'Bình hoa cúc', frame: 'vase_yellow', fw: 1, fh: 1, kind: 'floor', price: 70, cat: 'plant' },
  f_plant: { name: 'Chậu cây', tex: 'interior', frame: 26, fw: 1, fh: 1, kind: 'floor', price: 80, cat: 'plant' },
  // --- treo tường ---
  painting_mountain: { name: 'Tranh núi', frame: 'painting_mountain', fw: 1, fh: 1, kind: 'wall', price: 150, cat: 'wall' },
  painting_sun: { name: 'Tranh đồng lúa', frame: 'painting_sun', fw: 1, fh: 1, kind: 'wall', price: 150, cat: 'wall' },
  painting_flower: { name: 'Tranh hoa', frame: 'painting_flower', fw: 1, fh: 1, kind: 'wall', price: 150, cat: 'wall' },
  painting_farm: { name: 'Tranh nông trại', frame: 'painting_farm', fw: 1, fh: 1, kind: 'wall', price: 200, cat: 'wall' },
  f_pic: { name: 'Tranh phong cảnh', tex: 'interior', frame: 31, fw: 1, fh: 1, kind: 'wall', price: 100, cat: 'wall' },
  f_painting: { name: 'Tranh bí ngô', tex: 'twfurn', frame: 11, fw: 1, fh: 1, kind: 'wall', price: 120, cat: 'wall' },
  clock: { name: 'Đồng hồ treo', frame: 'clock', fw: 1, fh: 1, kind: 'wall', price: 160, cat: 'wall' },
  window_red: { name: 'Cửa sổ rèm đỏ', frame: 'window_red', fw: 1, fh: 1, kind: 'wall', price: 180, cat: 'wall' },
  window_blue: { name: 'Cửa sổ rèm xanh', frame: 'window_blue', fw: 1, fh: 1, kind: 'wall', price: 180, cat: 'wall' },
  wall_shelf: { name: 'Kệ treo tường', frame: 'wall_shelf', fw: 2, fh: 1, kind: 'wall', price: 220, cat: 'wall' },
  mirror: { name: 'Gương tròn', frame: 'mirror', fw: 1, fh: 1, kind: 'wall', price: 140, cat: 'wall' },
  calendar: { name: 'Lịch treo', frame: 'calendar', fw: 1, fh: 1, kind: 'wall', price: 60, cat: 'wall' },
  garland: { name: 'Dây cờ trang trí', frame: 'garland', fw: 2, fh: 1, kind: 'wall', price: 120, cat: 'wall' },
  hanging_plant: { name: 'Chậu cây treo', frame: 'hanging_plant', fw: 1, fh: 1, kind: 'wall', price: 110, cat: 'wall' },
  // --- thảm ---
  rug_red: { name: 'Thảm đỏ vuông', frame: 'rug_red', fw: 2, fh: 2, kind: 'rug', price: 220, cat: 'rug' },
  rug_blue: { name: 'Thảm sọc xanh', frame: 'rug_blue', fw: 3, fh: 2, kind: 'rug', price: 300, cat: 'rug' },
  rug_green: { name: 'Thảm tròn lá', frame: 'rug_green', fw: 3, fh: 2, kind: 'rug', price: 300, cat: 'rug' },
  rug_check: { name: 'Thảm caro vàng', frame: 'rug_check', fw: 2, fh: 2, kind: 'rug', price: 220, cat: 'rug' },
  rug_pink: { name: 'Thảm tròn hồng', frame: 'rug_pink', fw: 2, fh: 2, kind: 'rug', price: 220, cat: 'rug' },
  rug_long: { name: 'Thảm dài tím', frame: 'rug_long', fw: 3, fh: 1, kind: 'rug', price: 160, cat: 'rug' },
  f_rug: { name: 'Thảm nhỏ', tex: 'interior', frame: 30, fw: 1, fh: 1, kind: 'rug', price: 60, cat: 'rug' },
};

export const FURN_CATS = [
  ['all', 'Tất cả'], ['bed', 'Giường'], ['seat', 'Ghế'], ['table', 'Bàn'], ['storage', 'Tủ kệ'],
  ['kitchen', 'Bếp'], ['fun', 'Giải trí'], ['plant', 'Đèn & cây'], ['wall', 'Treo tường'], ['rug', 'Thảm'],
];

export const WALLS = {
  cream: { name: 'Sọc kem', price: 0 }, green: { name: 'Lá xanh', price: 300 }, blue: { name: 'Caro xanh', price: 300 },
  pink: { name: 'Chấm hồng', price: 300 }, wood: { name: 'Ốp gỗ', price: 450 }, brick: { name: 'Gạch đỏ', price: 450 },
  purple: { name: 'Hoa tím', price: 400 }, mint: { name: 'Bạc hà', price: 350 },
};
export const FLOORS = {
  wood: { name: 'Gỗ sáng', price: 0 }, wood_dark: { name: 'Gỗ sẫm', price: 400 }, check: { name: 'Caro đen trắng', price: 500 },
  tile_blue: { name: 'Gạch men xanh', price: 450 }, stone: { name: 'Đá lát', price: 450 }, carpet: { name: 'Thảm trải sàn', price: 350 },
  pink: { name: 'Gạch hồng', price: 400 }, grass: { name: 'Cỏ (vui nhộn)', price: 600 },
};

// Cấp nhà: kích thước phòng & chi phí nâng cấp (ở Xưởng mộc)
export const HOME_LEVELS = [
  null,
  { w: 14, h: 10, name: 'Nhà gỗ nhỏ' },
  { w: 20, h: 12, name: 'Nhà gỗ rộng', coins: 3000, cost: { wood: 120, stone: 60 }, trust: 3 },
  { w: 26, h: 14, name: 'Nhà lớn', coins: 9000, cost: { wood: 250, stone: 150, bar_iron: 10 }, trust: 6 },
];

export const homeLv = () => Math.min(HOME_LEVELS.length - 1, state.home?.lv || 1);
export function homeSize() {
  const L = HOME_LEVELS[homeLv()];
  return { w: L.w, h: L.h, door: { x: Math.floor(L.w / 2), y: L.h - 1 }, enter: { x: Math.floor(L.w / 2), y: L.h - 2 } };
}

let uidN = 0;
const newUid = () => `u${Date.now().toString(36)}${(uidN++).toString(36)}`;

// Chuyển save cũ (state.furniture: { 'x,y': id }, nội thất nằm trong túi đồ) sang state.home
export function ensureHome() {
  if (state.home?.placed) return state.home;
  const placed = [
    { uid: 'bed', id: 'bed_basic', x: 2, y: 3 },
    { uid: 'stove', id: 'stove', x: 11, y: 2 },
    { uid: 'table', id: 'table_basic', x: 6, y: 3 },
  ];
  const owned = {};
  for (const [k, id] of Object.entries(state.furniture || {})) {
    const [x, y] = k.split(',').map(Number);
    if (id === 'storage_chest') placed.push({ uid: k, id, x, y }); // giữ khoá rương `home:x,y`
    else if (FURN[id]) {
      const f = FURN[id];
      // Đồ treo tường cũ từng đặt dưới sàn → đưa vào kho cho người chơi tự treo lại
      if (f.kind === 'wall') owned[id] = (owned[id] || 0) + 1;
      else placed.push({ uid: newUid(), id, x, y });
    }
  }
  // Nội thất cũ đang nằm trong túi → chuyển sang kho nội thất
  for (const id of Object.keys(FURN)) {
    if (FURN[id].bag || !state.inv?.[id]) continue;
    owned[id] = (owned[id] || 0) + state.inv[id];
    delete state.inv[id];
  }
  state.home = { lv: 1, wall: 'cream', floor: 'wood', styles: { wall: ['cream'], floor: ['wood'] }, owned, placed };
  // Bỏ những món chồng lên nhau / ra ngoài phòng (save cũ)
  const keep = [];
  for (const p of placed) {
    state.home.placed = keep;
    if (canPlace(p.id, p.x, p.y).ok) keep.push(p);
    else if (FURN[p.id].bag) addItem(p.id, 1);
    else owned[p.id] = (owned[p.id] || 0) + 1;
  }
  state.home.placed = keep;
  delete state.furniture;
  return state.home;
}

// Số món có trong kho (rương dùng túi đồ)
export const ownedCount = (id) => (FURN[id].bag ? count(id) : state.home.owned[id] || 0);
export function addOwned(id, n = 1) {
  if (FURN[id].bag) return addItem(id, n);
  const o = state.home.owned;
  o[id] = (o[id] || 0) + n;
  if (o[id] <= 0) delete o[id];
}

// Các ô mà một món chiếm
export function footprint(id, x, y) {
  const f = FURN[id];
  const out = [];
  for (let dx = 0; dx < f.fw; dx++) for (let dy = 0; dy < f.fh; dy++) out.push([x + dx, y + dy]);
  return out;
}

const layerOf = (id) => FURN[id].kind; // floor | rug | wall

// Món đã đặt chiếm ô (x,y) trên lớp cho trước
export function placedAt(x, y, layer) {
  return state.home.placed.find((p) => FURN[p.id] && (!layer || layerOf(p.id) === layer) && footprint(p.id, p.x, p.y).some(([a, b]) => a === x && b === y));
}

// Kiểm tra đặt được không (bỏ qua món `ignore` đang được nhấc lên)
export function canPlace(id, x, y, ignore = null) {
  const f = FURN[id];
  if (!f) return { ok: false, why: 'Không rõ món đồ' };
  const { w, h, enter } = homeSize();
  const cells = footprint(id, x, y);
  for (const [cx, cy] of cells) {
    if (cx < 1 || cx > w - 2) return { ok: false, why: 'Ra ngoài phòng rồi' };
    if (f.kind === 'wall') {
      if (cy < 0 || cy > 1) return { ok: false, why: 'Đồ này chỉ treo được trên tường' };
    } else {
      if (cy < 2 || cy > h - 2) return { ok: false, why: cy < 2 ? 'Đồ này đặt trên sàn, không treo tường được' : 'Ra ngoài phòng rồi' };
      if (f.kind === 'floor' && cx === enter.x && cy === enter.y) return { ok: false, why: 'Chừa lối vào cửa nhé' };
    }
    const other = state.home.placed.find((p) => p !== ignore && FURN[p.id] && layerOf(p.id) === f.kind && footprint(p.id, p.x, p.y).some(([a, b]) => a === cx && b === cy));
    if (other) return { ok: false, why: `Vướng ${FURN[other.id].name}` };
  }
  // Không được chắn lối tới giường / bếp / rương
  if (f.kind === 'floor') {
    const blockedSet = new Set();
    for (const p of state.home.placed) if (p !== ignore && FURN[p.id]?.kind === 'floor') for (const [a, b] of footprint(p.id, p.x, p.y)) blockedSet.add(`${a},${b}`);
    for (const [a, b] of cells) blockedSet.add(`${a},${b}`);
    const reach = reachable(blockedSet);
    const needs = state.home.placed.filter((p) => p !== ignore && FURN[p.id]?.use).concat(f.use ? [{ id, x, y }] : []);
    for (const p of needs) {
      const ok = footprint(p.id, p.x, p.y).some(([a, b]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].some(([nx, ny]) => reach.has(`${nx},${ny}`)));
      if (!ok) return { ok: false, why: `Sẽ chắn lối tới ${FURN[p.id].name}` };
    }
  }
  return { ok: true };
}

// Các ô sàn đi tới được từ cửa
function reachable(blockedSet) {
  const { w, h, enter } = homeSize();
  const seen = new Set([`${enter.x},${enter.y}`]);
  const q = [[enter.x, enter.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = `${nx},${ny}`;
      if (nx < 1 || nx > w - 2 || ny < 2 || ny > h - 2 || seen.has(k) || blockedSet.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

export function placeFurn(id, x, y, flip = false, uid = null) {
  const p = { uid: uid || newUid(), id, x, y, flip: !!flip };
  state.home.placed.push(p);
  return p;
}

export function removePlaced(p) {
  state.home.placed = state.home.placed.filter((q) => q !== p);
}

// Cất vào kho được không (giữ lại ít nhất 1 giường & 1 bếp, rương phải rỗng)
export function canStore(p) {
  const f = FURN[p.id];
  if (f.use === 'sleep' || f.use === 'cook') {
    const same = state.home.placed.filter((q) => q !== p && FURN[q.id]?.use === f.use).length;
    if (!same) return { ok: false, why: f.use === 'sleep' ? 'Nhà cần ít nhất 1 cái giường' : 'Nhà cần ít nhất 1 cái bếp' };
  }
  if (f.use === 'chest' && Object.keys(state.storage[`home:${p.uid}`] || {}).length) return { ok: false, why: 'Lấy hết đồ trong rương ra trước đã' };
  return { ok: true };
}

// Chỗ thức dậy: ô trống cạnh giường
export function bedSpawn() {
  ensureHome();
  const bed = state.home.placed.find((p) => FURN[p.id]?.use === 'sleep');
  const { enter } = homeSize();
  if (!bed) return enter;
  const f = FURN[bed.id];
  const solid = new Set();
  for (const p of state.home.placed) if (FURN[p.id]?.kind === 'floor') for (const [a, b] of footprint(p.id, p.x, p.y)) solid.add(`${a},${b}`);
  const cand = [];
  for (let dy = 0; dy < f.fh; dy++) cand.push([bed.x + f.fw, bed.y + dy], [bed.x - 1, bed.y + dy]);
  for (let dx = 0; dx < f.fw; dx++) cand.push([bed.x + dx, bed.y + f.fh]);
  const reach = reachable(solid);
  const c = cand.find(([x, y]) => reach.has(`${x},${y}`));
  return c ? { x: c[0], y: c[1] } : enter;
}
