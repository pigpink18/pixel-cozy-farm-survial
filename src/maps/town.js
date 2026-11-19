// ============================================================
//  Thị trấn bỏ hoang (phía nam trại người sống sót): đường nhựa nứt, nhà đổ nát,
//  xe hỏng, thùng rác, tủ đồ — lục đồ & đánh zombie. 3 ổ zombie: phá hết để giải phóng.
// ============================================================
import { TILE } from '../config.js';
import { populateZone, container } from './zones.js';
import { prop, fireBarrel, patches } from './decor.js';
import { state } from '../state.js';
import { ruinKind } from './ruin.js';
import { NPC_HOUSE_IN } from '../npcs.js';

const key = (x, y) => `${x},${y}`;

export const TOWN = {
  w: 76, h: 52, // v2: thêm khu phố phía đông & dãy nhà phía nam
  fromVillage: { x: 27, y: 2 },
  exit: [{ x: 26, y: 0 }, { x: 27, y: 0 }, { x: 28, y: 0 }],
  // Đường nhựa (x0, y0, x1, y1)
  roads: [[26, 0, 28, 43], [0, 18, 75, 20], [6, 8, 72, 9], [4, 30, 72, 31], [44, 9, 45, 43], [10, 9, 11, 43], [64, 9, 65, 43], [4, 42, 72, 43]],
  // Nhà đổ nát: [frame, x trái, hàng dưới]
  houses: [
    ['homeOrange', 14, 6], ['homeBeige', 31, 6], ['homeSmall', 38, 6], ['store', 19, 16], ['market', 32, 16],
    ['homeBeige', 13, 28], ['homeOrange', 31, 28], ['homeSmall', 47, 16], ['homeOrange', 47, 28], ['homeSmall', 2, 16], ['homeBeige', 18, 28],
    // khu phố đông + dãy nhà phía nam (v2)
    ['store', 57, 16], ['homeOrange', 68, 16], ['homeSmall', 57, 28], ['homeBeige', 68, 28], ['homeSmall', 68, 6],
    ['homeOrange', 5, 40], ['market', 14, 40], ['homeBeige', 33, 40], ['homeSmall', 48, 40], ['store', 57, 40], ['homeOrange', 68, 40],
  ],
  cars: [[22, 19, 'car_red'], [36, 18, 'car_blue', true], [7, 19, 'car_white'], [27, 12, 'truck_tan'], [26, 25, 'car_red', true], [16, 30, 'truck_green'], [40, 31, 'car_white', true], [49, 19, 'truck_tan', true], [30, 8, 'car_blue', true], [59, 19, 'car_red'], [70, 30, 'truck_tan', true], [36, 42, 'car_blue']],
  cans: [[18, 10], [35, 10], [5, 21], [24, 21], [40, 21], [22, 32], [37, 32], [50, 10], [61, 21], [71, 21], [39, 44], [55, 44], [61, 11]],
  barrels: [[13, 12], [42, 13], [8, 25], [47, 35], [30, 23], [67, 12], [21, 46], [73, 36]],
  nests: [[6, 12], [48, 24], [61, 36]],
  sealed: [2, 9], // nhà bị chắn kín cửa (không vào được)
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
  // Nhà đổ nát: phần lớn vào được để lục đồ bên trong; vài nhà cửa bị chắn kín
  T.houses.forEach(([frame, x, yB], idx) => {
    const img = s.building('nhouse', frame, x, yB, 2);
    img.setTint(0x9a948a);
    const w = Math.ceil(img.width / TILE);
    const door = x + Math.floor(w / 2);
    if (T.sealed.includes(idx)) {
      prop(s, 'barricade', door - 1, yB, { tex: 'surv', w: 2, solid: false, dy: 2, depth: (yB + 1) * TILE + 1 });
      for (let tx = x; tx < x + w; tx++) for (let ty = yB - 1; ty <= yB; ty++) if (!s.statics.has(key(tx, ty))) s.statics.set(key(tx, ty), () => ({ act: false, label: 'Nhà đổ nát — cửa bị chắn kín' }));
      return;
    }
    const kind = ruinKind(frame);
    const enter = () => ({ label: `Vào ${kind === 'store' ? 'tiệm tạp hoá' : kind === 'market' ? 'chợ' : 'nhà'} bỏ hoang`, door: true, run: () => s.changeMap('ruin', { ...NPC_HOUSE_IN.enter }, { ruin: idx, kind, back: { x: door, y: yB + 1 } }) });
    s.add.rectangle(door * TILE + 8, (yB + 1) * TILE - 6, 10, 12, 0x0a0806).setDepth((yB + 1) * TILE).setAlpha(0.85); // cửa mở toang, tối om
    for (let tx = x; tx < x + w; tx++) for (let ty = yB - 1; ty <= yB; ty++) if (!s.statics.has(key(tx, ty))) s.statics.set(key(tx, ty), tx === door && ty === yB ? enter : () => ({ act: false, label: 'Nhà đổ nát — vào bằng cửa chính' }));
  });
  // Tường đổ, lốp xe, cọc giao thông, máu & xương
  for (const [x, y] of [[3, 3], [22, 3], [46, 3], [2, 36], [24, 36], [52, 36], [36, 26], [14, 23], [60, 3], [72, 25], [70, 36]]) prop(s, 'ruinwall', x, y, { tex: 'surv', w: 2, label: 'Tường đổ nát' });
  for (const [x, y] of [[9, 22], [33, 21], [43, 33], [23, 11]]) prop(s, 'tires', x, y, { tex: 'surv', label: 'Chồng lốp xe' });
  for (const [x, y] of [[25, 17], [29, 21], [12, 17], [43, 17], [25, 29], [29, 32]]) prop(s, 'cone', x, y, { tex: 'surv', solid: false, onPath: true });
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(Math.random() * (T.w - 4)), y = 2 + Math.floor(Math.random() * (T.h - 4));
    s.add.image(x * TILE + 8, y * TILE + 8, 'surv', i % 3 ? `blood${i % 2}` : 'bones').setDepth(-700).setAlpha(0.8);
  }

  // Thùng phuy cháy: ánh lửa le lói trong đêm
  for (const [x, y] of [[24, 16], [31, 22], [13, 21], [42, 11], [8, 32], [47, 21], [61, 32], [41, 45], [70, 22]]) fireBarrel(s, x, y);

  // Đồ để lục
  for (const [x, y, frame, flip] of T.cars) container(s, 'car', x, y, { frame, w: 3, flip });
  for (const [x, y] of T.cans) container(s, 'trashcan', x, y);
  for (const [x, y] of T.barrels) container(s, 'barrel', x, y);
  // Bãi đỗ xe phía nam (hình PostApocalypse): xe gỉ, container, đống rác
  for (const [x, y, f, w] of [[8, 47, 'scrap_red', 3], [18, 48, 'car_orange', 3], [31, 47, 'van_blue', 3], [46, 48, 'scrap_green', 3], [58, 47, 'car_blue', 3]]) container(s, 'car', x, y, { tex: 'pa', frame: f, w });
  for (const [x, y, f] of [[38, 49, 'cont_8_red_horizontal_og_bleak-yellow'], [66, 49, 'cont_4_gray_horizontal_og_dark-green']]) {
    s.add.image((x + 1.5) * TILE, (y + 1) * TILE, 'pa', f).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
    for (let dx = 0; dx < 3; dx++) s.blocked.add(key(x + dx, y));
    s.addWall(x * TILE + 2, y * TILE + 2, 3 * TILE - 4, TILE - 2);
  }
  for (const [x, y, f] of [[24, 46, 'junk_small'], [52, 46, 'junk_small'], [72, 46, 'junk_small']]) {
    s.add.image(x * TILE, (y + 3) * TILE, 'pa', f).setOrigin(0, 1).setDepth(-650);
    for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) s.blocked.add(key(x + dx, y + dy));
    s.addWall(x * TILE + 4, y * TILE + 6, 3 * TILE - 8, 3 * TILE - 10);
  }

  s.borderTrees({ top: [25, 29] });
  s.scatterDecor((x, y) => !s.blocked.has(key(x, y)) && !s.isDirt(x, y), 300, 444);

  const free = (x, y) => !s.blocked.has(key(x, y)) && !s.statics.has(key(x, y)) && s.inMap(x, y);
  populateZone(s, 'town', free, T.nests);
  // Nấm mọc trên bãi cỏ hoang: thị trấn còn nhiễm bệnh → nấm phát quang & nấm độc; sạch rồi → nấm ăn được
  const infected = (state.zones?.town?.infection ?? 100) > 0;
  const grassy = (x, y) => free(x, y) && !s.isDirt(x, y) && !s.decor.has(key(x, y));
  patches(s, grassy, infected ? 34 : 16, 404, infected ? ['mush_glow', 'mush_glow', 'mush_deathcap', 'mush_red', 'mush_oyster'] : ['mush_oyster', 'mush_termite', 'mush_brown']);
}
