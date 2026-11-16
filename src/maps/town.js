// ============================================================
//  Thị trấn bỏ hoang (phía nam trại người sống sót): đường nhựa nứt, nhà đổ nát,
//  xe hỏng, thùng rác, tủ đồ — lục đồ & đánh zombie. 2 ổ zombie: phá hết để giải phóng.
// ============================================================
import { TILE } from '../config.js';
import { populateZone, container } from './zones.js';
import { prop, fireBarrel } from './decor.js';

const key = (x, y) => `${x},${y}`;

export const TOWN = {
  w: 56, h: 40,
  fromVillage: { x: 27, y: 2 },
  exit: [{ x: 26, y: 0 }, { x: 27, y: 0 }, { x: 28, y: 0 }],
  // Đường nhựa (x0, y0, x1, y1)
  roads: [[26, 0, 28, 39], [0, 18, 55, 20], [6, 8, 50, 9], [4, 30, 52, 31], [44, 9, 45, 30], [10, 9, 11, 30]],
  // Nhà đổ nát: [frame, x trái, hàng dưới]
  houses: [
    ['homeOrange', 14, 6], ['homeBeige', 31, 6], ['homeSmall', 38, 6], ['store', 19, 16], ['market', 32, 16],
    ['homeBeige', 13, 28], ['homeOrange', 31, 28], ['homeSmall', 47, 16], ['homeOrange', 47, 28], ['homeSmall', 2, 16], ['homeBeige', 18, 28],
  ],
  cars: [[22, 19, 'car_red'], [36, 18, 'car_blue', true], [7, 19, 'car_white'], [27, 12, 'car_white'], [26, 25, 'car_red', true], [16, 30, 'car_blue'], [40, 31, 'car_white', true], [49, 19, 'car_red'], [30, 8, 'car_blue', true]],
  cans: [[18, 10], [35, 10], [5, 21], [24, 21], [40, 21], [22, 32], [37, 32], [50, 10]],
  cabinets: [[3, 26], [21, 24], [36, 24], [52, 25], [17, 3], [40, 3], [6, 35], [33, 36]],
  barrels: [[13, 12], [42, 13], [8, 25], [47, 35], [30, 23]],
  nests: [[6, 12], [48, 24]],
};

export function buildTown(s) {
  const T = TOWN;
  for (const [x0, y0, x1, y1] of T.roads) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (s.inMap(x, y)) s.terrain.road.add(key(x, y));
  // Vỉa hè lát gạch quanh đường
  for (const k of [...s.terrain.road]) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nk = key(x + dx, y + dy);
      if (s.inMap(x + dx, y + dy) && !s.terrain.road.has(nk)) s.terrain.plaza.add(nk);
    }
  }
  for (const e of T.exit) s.exits.set(key(e.x, e.y), { map: 'village', spawn: { x: 20, y: 31 } });

  // Nhà đổ nát: tối màu, cửa bị chắn
  for (const [frame, x, yB] of T.houses) {
    const img = s.building('nhouse', frame, x, yB, 2);
    img.setTint(0x9a948a);
    const w = Math.ceil(img.width / TILE);
    prop(s, 'barricade', x + Math.floor(w / 2) - 1, yB, { tex: 'surv', w: 2, solid: false, dy: 2, depth: (yB + 1) * TILE + 1 });
    for (let tx = x; tx < x + w; tx++) for (let ty = yB - 1; ty <= yB; ty++) if (!s.statics.has(key(tx, ty))) s.statics.set(key(tx, ty), () => ({ act: false, label: 'Nhà đổ nát — cửa bị chắn kín' }));
  }
  // Tường đổ, lốp xe, cọc giao thông, máu & xương
  for (const [x, y] of [[3, 3], [22, 3], [46, 3], [2, 36], [24, 36], [50, 36], [36, 26], [14, 23]]) prop(s, 'ruinwall', x, y, { tex: 'surv', w: 2, label: 'Tường đổ nát' });
  for (const [x, y] of [[9, 22], [33, 21], [43, 33], [23, 11]]) prop(s, 'tires', x, y, { tex: 'surv', label: 'Chồng lốp xe' });
  for (const [x, y] of [[25, 17], [29, 21], [12, 17], [43, 17], [25, 29], [29, 32]]) prop(s, 'cone', x, y, { tex: 'surv', solid: false, onPath: true });
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(Math.random() * (T.w - 4)), y = 2 + Math.floor(Math.random() * (T.h - 4));
    s.add.image(x * TILE + 8, y * TILE + 8, 'surv', i % 3 ? `blood${i % 2}` : 'bones').setDepth(-700).setAlpha(0.8);
  }

  // Thùng phuy cháy: ánh lửa le lói trong đêm
  for (const [x, y] of [[24, 16], [31, 22], [13, 21], [42, 11], [8, 32], [47, 21]]) fireBarrel(s, x, y);

  // Đồ để lục
  for (const [x, y, frame, flip] of T.cars) container(s, 'car', x, y, { frame, w: 3, flip });
  for (const [x, y] of T.cans) container(s, 'trashcan', x, y);
  for (const [x, y] of T.cabinets) container(s, 'cabinet', x, y);
  for (const [x, y] of T.barrels) container(s, 'barrel', x, y);

  s.borderTrees({ top: [25, 29] });
  s.scatterDecor((x, y) => !s.blocked.has(key(x, y)) && !s.isDirt(x, y), 300, 444);

  const free = (x, y) => !s.blocked.has(key(x, y)) && !s.statics.has(key(x, y)) && s.inMap(x, y);
  populateZone(s, 'town', free, T.nests);
}
