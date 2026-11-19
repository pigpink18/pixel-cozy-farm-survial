// Khu rừng phía nam nông trại: hồ nước, cây cối, lối vào hầm mỏ
import { TILE, FORAGE, ITEMS } from '../config.js';
import { state, bus, changed, sfx, addItem, xp, season, roomFor } from '../state.js';
import { bonusChance } from '../skills.js';
import { mineEntryChoices } from './mine.js';
import { decorateForest } from './decor.js';
import { populateZone, container } from './zones.js';

const key = (x, y) => `${x},${y}`;

export const FOREST = {
  w: 110, // v2: mở rộng sang đông (quốc lộ bỏ hoang → căn cứ quân sự) & xuống nam (đầm lầy)
  h: 70,
  fromFarm: { x: 19, y: 2 },
  exit: [{ x: 19, y: 0 }, { x: 20, y: 0 }],
  lake: { x: 5, y: 12, w: 12, h: 8, lobes: [[8, 17.5, 3.5, 2.5], [13.5, 14, 3.5, 2.5]] },
  lake2: { x: 34, y: 24, w: 12, h: 8, lobes: [[37.5, 26, 3.5, 2.5], [42.5, 29.5, 3.5, 2.5]] },
  lake3: { x: 8, y: 40, w: 12, h: 7 },
  lake4: { x: 50, y: 57, w: 14, h: 7, lobes: [[53, 61.5, 3.5, 2.5], [60.5, 58.5, 3.5, 2.5]] },
  // Quốc lộ bỏ hoang (dọc mép đông) + trạm xăng; lối sang căn cứ quân sự ở mép đông
  highway: { x0: 95, y0: 0, x1: 98, y1: 69 },
  station: { x0: 100, y0: 18, x1: 107, y1: 26 },
  toBase: [{ x: 109, y: 34 }, { x: 109, y: 35 }],
  fromBase: { x: 106, y: 34 },
  // Khu mới (mở rộng): trạm kiểm lâm bỏ hoang & xe quân sự lật — chừa chỗ không mọc cây
  ranger: { x0: 63, y0: 12, x1: 75, y1: 20 },
  wreck: { x0: 64, y0: 38, x1: 74, y1: 44 },
  cave: { x: 31, y: 4 }, // ô dưới-trái của ảnh hang
  caveFront: { x: 32, y: 6 },
  pathV: { x0: 19, y0: 0, x1: 20, y1: 7 },
  pathH: { x0: 19, y0: 6, x1: 34, y1: 7 },
  // Lối mòn rẽ nhánh (thiết kế tay)
  trails: [
    [10, 6, 18, 7], // nhánh tây
    [10, 8, 11, 10], // xuống hồ 1
    [33, 8, 34, 22], // nhánh nam xuống hồ 2
    [26, 15, 32, 16], // lối tắt giữa rừng
    [35, 6, 62, 7], // đường mòn sang phía đông
    [61, 8, 62, 46], // xuống phía nam, qua trạm kiểm lâm
    [63, 15, 66, 16], // vào trạm kiểm lâm
    [21, 45, 60, 46], // đường mòn phía nam
    [21, 32, 22, 44], // lên giữa rừng
    [63, 41, 65, 42], // tới xe quân sự
    [63, 6, 94, 7], // đường mòn ra quốc lộ
    [40, 47, 41, 62], // xuống đầm lầy phía nam
    [42, 65, 94, 66], // đường mòn đầm lầy → quốc lộ
    [99, 34, 109, 35], // lối sang căn cứ quân sự
    [99, 21, 100, 22], // vào trạm xăng
  ],
  // Bãi hoa ở các khoảng trống
  meadows: [[3, 21, 6, 22], [17, 13, 19, 14], [47, 20, 49, 22], [24, 30, 27, 31], [37, 9, 39, 10], [55, 26, 57, 28], [44, 49, 46, 50], [72, 26, 74, 27], [5, 34, 7, 35], [30, 58, 33, 59], [70, 56, 72, 58], [84, 30, 86, 31], [12, 60, 15, 61], [102, 48, 104, 49]],
};

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function buildForest(s) {
  const F = FOREST;
  const winter = s.sea.id === 'winter';

  // Đường mòn
  s.dirtArea(F.pathV.x0, F.pathV.y0, F.pathV.x1, F.pathV.y1);
  s.dirtArea(F.pathH.x0, F.pathH.y0, F.pathH.x1, F.pathH.y1);
  for (const [x0, y0, x1, y1] of F.trails) s.dirtArea(x0, y0, x1, y1);
  F.meadows.forEach((r, i) => s.flowerBed(r, i));
  // Đá trang trí quanh bờ hồ
  for (const [x, y] of [[4, 13], [17, 15], [6, 20], [15, 20], [33, 25], [46, 27], [40, 32], [35, 31]])
    s.add.image(x * TILE + 8, (y + 1) * TILE, 'pc_nature', 0).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
  for (const e of F.exit) s.exits.set(key(e.x, e.y), { map: 'farm', spawn: { x: 19, y: 57 } });

  // Hai hồ nước
  const L = F.lake;
  s.lakeTiles = new Set();
  for (const lk of [F.lake, F.lake2, F.lake3, F.lake4]) s.addWater(s.pondShape(lk, lk.lobes), 'lake');

  // Cửa hầm ngầm quân sự
  const c = F.cave;
  const cave = s.add.image(c.x * TILE, (c.y + 1) * TILE, 'q_door').setOrigin(0, 1).setDepth((c.y + 1) * TILE);
  s.fx.shadow(cave.x + 24, cave.y - 1, 50);
  s.addWall(cave.x + 2, cave.y - 34, 44, 32);
  s.fx.light(cave.x + 40, cave.y - 18, 22); // đèn báo đỏ
  for (let x = c.x; x < c.x + 3; x++)
    s.statics.set(key(x, c.y), () => ({
      label: 'Vào hầm quân sự',
      run: () =>
        bus.emit('dialog', {
          face: 'portrait',
          name: 'Hầm ngầm quân sự',
          text: state.mineDeepest
            ? `Tầng sâu nhất đã tới: ${state.mineDeepest}. Thang máy dừng mỗi 5 tầng. Chọn tầng muốn xuống:`
            : 'Cửa hầm thép của quân đội đã bị phá khoá... Bên dưới tối om, có tiếng gầm gừ vọng lên. Nghe nói trong đó còn nhiều phế liệu quý và hòm quân dụng. Xuống chứ?',
          choices: [...mineEntryChoices(s), { label: 'Thôi', onClick: null }],
        }),
    }));

  s.borderTrees({ top: [18, 21], right: [33, 36] });
  buildHighway(s);

  // Cây rậm rạp
  const r = rng(1234);
  const near = (x, y, rect, pad = 2) => x >= rect.x0 - pad && x <= rect.x1 + pad && y >= rect.y0 - pad && y <= rect.y1 + pad;
  const lakeRect = { x0: L.x, y0: L.y, x1: L.x + L.w - 1, y1: L.y + L.h - 1 };
  const L2 = F.lake2;
  const lake2Rect = { x0: L2.x, y0: L2.y, x1: L2.x + L2.w - 1, y1: L2.y + L2.h - 1 };
  const caveRect = { x0: c.x - 1, y0: c.y - 3, x1: c.x + 4, y1: c.y + 3 };
  const L3 = F.lake3;
  const lake3Rect = { x0: L3.x, y0: L3.y, x1: L3.x + L3.w - 1, y1: L3.y + L3.h - 1 };
  const placed = [];
  const hiveSpots = [];
  const L4 = F.lake4;
  const lake4Rect = { x0: L4.x, y0: L4.y, x1: L4.x + L4.w - 1, y1: L4.y + L4.h - 1 };
  for (let i = 0; i < 6000 && placed.length < 380; i++) {
    const x = 2 + Math.floor(r() * (F.w - 4)), y = 3 + Math.floor(r() * (F.h - 5));
    if (near(x, y, F.pathV) || near(x, y, F.pathH) || near(x, y, lakeRect, 1) || near(x, y, lake2Rect, 1) || near(x, y, caveRect, 0) || near(x, y, lake3Rect, 1) || near(x, y, F.ranger, 0) || near(x, y, F.wreck, 0) || near(x, y, lake4Rect, 1) || near(x, y, F.highway, 1) || near(x, y, F.station, 1)) continue;
    if (F.trails.some(([x0, y0, x1, y1]) => near(x, y, { x0, y0, x1, y1 }, 1)) || F.meadows.some(([x0, y0, x1, y1]) => near(x, y, { x0, y0, x1, y1 }, 1))) continue;
    // Khoảng trống quanh hồ & bãi hoa để rừng có nhịp thưa – dày
    if (near(x, y, lakeRect, 3) && r() < 0.6) continue;
    if (placed.some(([px, py]) => Math.abs(px - x) < 3 && Math.abs(py - y) < 2)) continue;
    placed.push([x, y]);
    const t = s.tree(x * TILE + 8, (y + 1) * TILE);
    // ~1/22 cây có tổ ong rừng, ưu tiên cây gần lối đi cho dễ thấy
    if ((x * 7 + y * 13) % 22 === 0) hiveSpots.push([t, x, y]);
  }
  for (const [t, x, y] of hiveSpots.slice(0, 14)) s.hiveTree(t, x, y);
  const onDirt = (x, y) => s.isDirt(x, y);
  s.forestFree = (x, y) => !s.blocked.has(key(x, y)) && !onDirt(x, y) && !s.lakeTiles.has(key(x, y)) && !s.decor.has(key(x, y));
  decorateForest(s);
  // Đồ bỏ lại của người chạy nạn + zombie lang thang
  container(s, 'car', 23, 5, { frame: 'car_white', w: 3 });
  // Đồ hợp với rừng: ba lô người chạy nạn bỏ lại, lều cắm trại, hòm đồ thợ săn; quanh cửa hầm có đồ quân đội
  const free = (x, y, w = 1) => [...Array(w)].every((_, i) => s.forestFree(x + i, y) && !s.statics.has(key(x + i, y)));
  const placeAt = (type, spots, o = {}) => { const p = spots.find(([x, y]) => free(x, y, o.w || 1)); if (p) container(s, type, p[0], p[1], o); };
  placeAt('backpack', [[13, 5], [12, 8], [15, 9]]);
  placeAt('backpack', [[45, 22], [44, 20], [47, 24]]);
  placeAt('backpack', [[25, 33], [22, 30], [28, 34]]);
  placeAt('tent', [[27, 13], [24, 12], [28, 18]], { w: 3 });
  placeAt('tent', [[6, 26], [8, 28], [4, 30]], { w: 3 });
  placeAt('huntbox', [[49, 35], [47, 33], [51, 31]]);
  placeAt('huntbox', [[40, 12], [42, 15]]);
  placeAt('milcrate', [[36, 6], [36, 8], [37, 9]], { w: 2 });
  placeAt('barrel', [[29, 6], [28, 3]]);
  // Trạm kiểm lâm bỏ hoang (khu mới phía đông)
  placeAt('tent', [[64, 14], [64, 18]], { w: 3, frame: 'tent_tan' });
  placeAt('tent', [[70, 14], [70, 13]], { w: 3 });
  placeAt('huntbox', [[68, 18], [67, 19]]);
  placeAt('huntbox', [[73, 18], [74, 19]]);
  placeAt('backpack', [[66, 19], [65, 20]]);
  placeAt('car', [[71, 20], [70, 20]], { frame: 'car_white', w: 3 });
  const fire = s.add.image(68 * TILE + 8, 17 * TILE, 'surv', 'campfire0').setOrigin(0.5, 1).setDepth(17 * TILE - 1).setTint(0x605850);
  s.statics.set(key(68, 16), () => ({ act: false, label: 'Đống lửa trại đã tắt từ lâu' }));
  void fire;
  // Xe quân sự lật bên đường mòn phía nam
  placeAt('milcrate', [[66, 40], [66, 39]], { w: 2 });
  placeAt('milcrate', [[71, 42], [71, 41]], { w: 2 });
  placeAt('car', [[68, 43], [67, 43]], { frame: 'truck_green', w: 3 });
  placeAt('barrel', [[73, 40], [73, 39]]);
  placeAt('backpack', [[52, 47], [50, 44], [55, 47]]);
  placeAt('backpack', [[12, 37], [14, 38], [16, 36]]);
  placeAt('huntbox', [[30, 48], [27, 47]]);
  // Đầm lầy phía nam (khu mới): lều người chạy nạn, ba lô, hòm thợ săn
  placeAt('tent', [[24, 60], [26, 62], [22, 58]], { w: 3 });
  placeAt('backpack', [[46, 63], [44, 60], [48, 64]]);
  placeAt('backpack', [[70, 60], [72, 62], [68, 63]]);
  placeAt('huntbox', [[80, 55], [82, 58], [78, 52]]);
  placeAt('tent', [[86, 60], [84, 62]], { w: 3, frame: 'tent_tan' });
  placeAt('backpack', [[10, 64], [8, 62]]);
  placeAt('milcrate', [[90, 40], [88, 42]], { w: 2 });
  s.scatterDecor((x, y) => s.forestFree(x, y), 1100, 777);
  spawnForage(s);
  const okNest = ([x, y]) => s.forestFree(x, y) && s.forestFree(x + 1, y);
  const nests = [[[50, 30], [48, 33], [10, 33], [44, 14]], [[72, 31], [70, 33], [56, 40], [40, 49]], [[76, 60], [66, 52], [88, 48], [30, 63]]].map((l) => l.find(okNest)).filter(Boolean);
  populateZone(s, 'forest', (x, y) => s.forestFree(x, y) && !s.statics.has(key(x, y)), nests);
}

// Đồ hái lượm: mọc mới mỗi ngày (tạo khi ghé rừng lần đầu trong ngày)
function spawnForage(s) {
  const dayKey = `${state.year}-${state.season}-${state.day}`;
  if (state.forageDay !== dayKey) {
    state.forageDay = dayKey;
    state.forage = {};
    const all = FORAGE[season().id];
    const kinds = all.filter((id) => id !== 'herb' && id !== 'flower').length ? all.filter((id) => id !== 'herb' && id !== 'flower') : all; // lá thuốc & hoa: hái ở bụi cây / khóm hoa
    for (let i = 0, tries = 0; i < 26 && tries < 1200; tries++) {
      const x = 2 + Math.floor(Math.random() * (FOREST.w - 4)), y = 3 + Math.floor(Math.random() * (FOREST.h - 5));
      const k = key(x, y);
      if (!s.forestFree(x, y) || state.forage[k]) continue;
      state.forage[k] = kinds[Math.floor(Math.random() * kinds.length)];
      i++;
    }
    changed();
  }
  for (const [k, id] of Object.entries(state.forage)) {
    const [x, y] = k.split(',').map(Number);
    const it = ITEMS[id];
    const img = s.add.image(x * TILE + 8, y * TILE + 9, it.tex, it.frame).setDepth(y * TILE + 8);
    img.setScale(Math.min(1, 14 / img.width));
    s.tweens.add({ targets: img, y: img.y - 1.5, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400 });
    s.removeDecor(k);
    s.statics.set(k, () => ({
      label: `Nhặt ${it.name}`,
      run: () => {
        if (!roomFor(id)) return;
        delete state.forage[k];
        s.statics.delete(k);
        img.destroy();
        addItem(id, bonusChance('foraging') ? 2 : 1);
        xp('foraging', 1);
        sfx('harvest', 0.35);
        s.floatIcon(x * TILE + 8, y * TILE, it.tex, it.frame);
        changed();
      },
    }));
  }
}

// Quốc lộ bỏ hoang dọc mép đông: xe gỉ nằm la liệt (lục được), trạm xăng đổ nát, biển báo, đèn đường.
// Lối sang Căn cứ quân sự ở mép đông (hàng 34–35).
function buildHighway(s) {
  const F = FOREST, H = F.highway, St = F.station;
  for (let x = H.x0; x <= H.x1; x++) for (let y = H.y0; y <= H.y1; y++) s.terrain.road.add(key(x, y));
  for (let x = St.x0; x <= St.x1; x++) for (let y = St.y0; y <= St.y1; y++) s.terrain.road.add(key(x, y));
  const pa = (x, y, f, solid = true, w = 1) => {
    const img = s.add.image((x + w / 2) * TILE, (y + 1) * TILE, 'pa', f).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
    if (solid) {
      for (let dx = 0; dx < w; dx++) s.blocked.add(key(x + dx, y));
      s.addWall(x * TILE + 2, y * TILE + 4, w * TILE - 4, 10);
    }
    return img;
  };
  // Xe dọc quốc lộ (một làn bị chặn hẳn, phải lách qua)
  const cars = [[95, 9, 'carv_red'], [97, 14, 'carv_blue'], [96, 27, 'flip_orange'], [95, 41, 'carv_green'], [97, 47, 'carv_yellow'], [95, 56, 'flip_blue'], [97, 63, 'carv_red']];
  for (const [x, y, f] of cars) container(s, 'car', x, y, { tex: 'pa', frame: f, w: 2 });
  container(s, 'car', 96, 20, { tex: 'pa', frame: 'flip_blue', w: 2 });
  // Trạm xăng: mái che (container nằm), máy bán nước, thùng phuy, xe bán tải
  pa(101, 19, 'cont_3_gray_horizontal', true, 3);
  pa(105, 19, 'cont_7_red_horizontal', true, 3);
  container(s, 'shelf', 104, 23, { tex: 'pa', frame: 'vending_blue' });
  container(s, 'barrel', 107, 23, { tex: 'pa', frame: 'barrel_rust_red_1' });
  container(s, 'car', 101, 25, { tex: 'pa', frame: 'van_blue', w: 3 });
  container(s, 'trashcan', 100, 23, { tex: 'pa', frame: 'garbage_bin_1' });
  pa(106, 26, 'tire_1');
  // Biển báo, đèn đường hỏng
  for (const y of [4, 30, 44, 60]) pa(99, y, 'street_light', false);
  pa(100, 32, 'stop_sign', false);
  s.add.text(104 * TILE, 33 * TILE - 2, 'Căn cứ quân sự →', { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '36px', color: '#ffb08a', stroke: '#3d3333', strokeThickness: 8 }).setScale(0.25).setOrigin(0.5, 1).setDepth(9000);
  // Lối sang căn cứ
  for (const e of F.toBase) s.exits.set(key(e.x, e.y), { map: 'base', spawn: BASE_SPAWN });
}
const BASE_SPAWN = { x: 2, y: 22 };
