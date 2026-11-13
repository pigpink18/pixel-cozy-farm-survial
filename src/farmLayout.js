// ============================================================
//  Bố cục nông trại — THIẾT KẾ TAY (chỉnh toạ độ ở đây để đổi bản đồ)
//
//   [rừng]   Nhà · rương   Chuồng gà(rào)   Chuồng bò(rào)        [rừng]
//   bồn hoa ║ bồn hoa
//   ════════╩══════════ đường chính (hàng 11–12) ═══════════════ → Làng
//   ┌── Ruộng (rào) ──┐ ║        ~ ao ~
//   │  luống đất      │ ║                          [khu hoang dã:
//   └─────────────────┘ ║            ~ ao 2 ~        cây, đá, cỏ dại]
//   [rừng]              ║ → Rừng                     [rừng]
// ============================================================
import { state } from './state.js';

export const FARM_W = 64;
export const FARM_H = 44;

export const FARM = {
  door: { x: 6, y: 7 },
  bedSpawn: { x: 6, y: 8 },
  chest: { x: 10, y: 7 },
  pond: { x: 28, y: 15, w: 6, h: 4 },
  pond2: { x: 46, y: 28, w: 7, h: 5 },
  coop: { x: 20, y: 3, door: { x: 21, y: 4 }, trough: { x: 24, y: 4 }, pen: { x0: 19, y0: 6, x1: 25, y1: 8 }, sign: { x: 21, y: 4 }, fence: [18, 5, 26, 9], gate: [21, 22] },
  barn: { x: 31, y: 1, door: { x: 32, y: 5 }, trough: { x: 36, y: 5 }, pen: { x0: 29, y0: 7, x1: 37, y1: 9 }, sign: { x: 32, y: 5 }, fence: [28, 6, 38, 10], gate: [32, 33] },
  exit: [{ x: 63, y: 11 }, { x: 63, y: 12 }],
  // Đường đất (x0, y0, x1, y1)
  paths: [
    [4, 11, 63, 12], // đường chính → làng
    [5, 8, 7, 10], // từ cửa nhà xuống đường chính
    [9, 8, 11, 10], // lối tới rương
    [21, 10, 22, 10], // cổng chuồng gà
    [16, 0, 17, 10], // lối tắt lên thị trấn
    [19, 13, 20, 43], // đường xuống rừng
  ],
  path: { x0: 34, y0: 11, x1: 63, y1: 12 },
  fromVillage: { x: 16, y: 2 },
  // Lối tắt lên thị trấn ngay cạnh nhà (phía bắc)
  northExit: [{ x: 16, y: 0 }, { x: 17, y: 0 }],
  northSign: { x: 15, y: 2 },
  southPath: { x0: 19, y0: 13, x1: 20, y1: 43 },
  southExit: [{ x: 19, y: 43 }, { x: 20, y: 43 }],
  fromForest: { x: 19, y: 41 },
  // Công trình kiểu Hay Day (x = ô trái, yB = hàng dưới cùng của ảnh)
  hayday: {
    silo: { x: 41, yB: 9 },
    barn: { x: 44, yB: 9 },
    board: { x: 14, y: 8 },
    stand: { x: 52, yB: 16 },
    factories: { mill: { x: 23, yB: 17 }, bakery: { x: 36, yB: 17 }, dairy: { x: 41, yB: 17 }, juicer: { x: 46, yB: 16 } },
  },
  // Ruộng có rào (viền là hàng rào, cổng ở cạnh phải)
  field: { x0: 4, y0: 14, x1: 17, y1: 23, gate: [{ x: 17, y: 18 }, { x: 17, y: 19 }] },
  // Bồn hoa trước nhà
  flowerBeds: [[3, 8, 4, 9], [8, 8, 8, 9]],
  // Dải rừng dày ở mép (cây trang trí, không chặt được)
  forestBands: [
    [56, 2, 62, 9],
    [57, 14, 62, 41],
    [22, 39, 55, 42],
    [1, 25, 3, 41],
    [40, 2, 54, 4],
  ],
};

// Vùng không sinh vật cản / không cuốc được
const RESERVED = [
  [2, 1, 13, 10], // nhà, rương, bồn hoa
  [14, 0, 17, 5], // lối tắt lên thị trấn
  [27, 14, 34, 19], // ao
  [18, 2, 26, 10], // chuồng gà + rào
  [28, 0, 39, 10], // chuồng bò + rào
  [4, 10, 63, 13], // đường chính
  [18, 13, 21, 43], // đường xuống rừng
  [45, 27, 53, 33], // ao thứ hai
  [4, 14, 17, 14], [4, 23, 17, 23], [4, 14, 4, 23], [17, 14, 17, 23], // rào ruộng
  [40, 4, 48, 10], // Kho thóc + Nhà kho
  [13, 6, 17, 10], // bảng đơn hàng
  [22, 13, 27, 18], // cối xay
  [35, 13, 50, 18], // lò bánh, xưởng sữa, quầy ép
  [51, 13, 55, 17], // sạp bán ven đường
];
// Bản đồ v4: dọn chỗ cho công trình Hay Day
export function migrateHaydayLayout() {
  for (const k of Object.keys(state.objects || {})) {
    const [x, y] = k.split(',').map(Number);
    if (isReserved(x, y)) delete state.objects[k];
  }
}
// Không sinh rác (nhưng vẫn cuốc được)
const NO_SPAWN = [
  [5, 15, 16, 22], // trong ruộng
];

const inRect = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const key = (x, y) => `${x},${y}`;

export const isReserved = (x, y) => RESERVED.some((r) => inRect(x, y, r));
export const inFarm = (x, y) => x >= 1 && y >= 2 && x <= FARM_W - 2 && y <= FARM_H - 2;
export const inForestBand = (x, y) => FARM.forestBands.some((r) => inRect(x, y, r));
// Khu hoang dã: chỉ ở đây mới mọc cây chặt được
export const inWild = (x, y) => (y >= 25 || (x >= 36 && y >= 14)) && !inForestBand(x, y);

export function isFarmFree(x, y) {
  const k = key(x, y);
  return inFarm(x, y) && !isReserved(x, y) && !inForestBand(x, y) && !NO_SPAWN.some((r) => inRect(x, y, r)) && !state.tiles[k] && !state.objects?.[k];
}

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function nearObject(x, y, types) {
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const o = state.objects[key(x + dx, y + dy)];
      if (o && (!types || types.includes(o.type))) return true;
    }
  return false;
}

export function makeObject(type) {
  const hp = { tree: 6, stump: 3, rock: 2, branch: 1, weed: 1 }[type] ?? 1;
  return { type, hp, v: Math.floor(Math.random() * 2) };
}

// Sinh vật cản. region: chỉ sinh trong vùng này. Cây & gốc cây chỉ mọc ở khu hoang dã.
export function generateObjects(region = null, seed = 7, scale = 2.7, types = ['tree', 'stump', 'rock', 'branch', 'weed']) {
  if (!region || !state.objects) state.objects = {};
  const r = rng(seed);
  const place = (type, n0, spacing) => {
    if (!types.includes(type)) return;
    const n = Math.round(n0 * scale);
    for (let i = 0, tries = 0; i < n && tries < 6000; tries++) {
      const x = 1 + Math.floor(r() * (FARM_W - 2)), y = 3 + Math.floor(r() * (FARM_H - 4));
      if (region && !region(x, y)) continue;
      if ((type === 'tree' || type === 'stump') && !inWild(x, y)) continue;
      if (!isFarmFree(x, y) || (spacing && nearObject(x, y))) continue;
      state.objects[key(x, y)] = { ...makeObject(type), v: Math.floor(r() * 2) };
      i++;
    }
  };
  place('tree', 14, true);
  place('stump', 4, true);
  place('rock', 20);
  place('branch', 16);
  place('weed', 28);
}

// Bản đồ thiết kế lại (v3): dọn cây khỏi khu sân nhà / ruộng / đường, trồng lại ở khu hoang dã
export function migrateFarmLayout() {
  for (const [k, o] of Object.entries(state.objects)) {
    const [x, y] = k.split(',').map(Number);
    const badTree = (o.type === 'tree' || o.type === 'stump') && !inWild(x, y);
    if (badTree || isReserved(x, y) || inForestBand(x, y) || NO_SPAWN.some((r) => inRect(x, y, r))) delete state.objects[k];
  }
  generateObjects(inWild, 33, 1, ['tree', 'stump']);
}

// Thêm cây, củi, đá ở khu hoang dã (kiểu Stardew: nhiều tài nguyên để khai thác)
export function addWildResources(seed = 51) {
  generateObjects(inWild, seed, 1, ['tree', 'stump']);
  generateObjects(inWild, seed + 1, 1.2, ['rock', 'branch']);
  generateObjects((x, y) => inWild(x, y) && Math.random() < 0.5, seed + 2, 0.6, ['tree']);
}

// Mỗi sáng: cây mọc lại ở khu hoang dã, thêm cỏ dại / cành củi / đá
export function spawnDebris(n, winter) {
  const objs = Object.values(state.objects);
  const trees = objs.filter((o) => o.type === 'tree').length;
  for (let i = 0, tries = 0; trees + i < 90 && i < 3 && tries < 300; tries++) {
    const x = 1 + Math.floor(Math.random() * (FARM_W - 2)), y = 3 + Math.floor(Math.random() * (FARM_H - 4));
    if (!inWild(x, y) || !isFarmFree(x, y) || nearObject(x, y, ['tree', 'stump'])) continue;
    state.objects[key(x, y)] = makeObject(Math.random() < 0.8 ? 'tree' : 'stump');
    i++;
  }
  const debris = objs.filter((o) => ['rock', 'branch', 'weed'].includes(o.type)).length;
  if (debris > 280) return;
  for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
    const x = 1 + Math.floor(Math.random() * (FARM_W - 2)), y = 3 + Math.floor(Math.random() * (FARM_H - 4));
    if (!isFarmFree(x, y)) continue;
    const roll = Math.random();
    const type = roll < 0.3 ? (winter ? 'branch' : 'weed') : roll < 0.65 ? 'branch' : 'rock';
    state.objects[key(x, y)] = makeObject(type);
    i++;
  }
}
