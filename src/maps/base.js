// ============================================================
//  Căn cứ quân sự bỏ hoang (phía đông Rừng hoang, đi theo quốc lộ):
//  rào kẽm gai, dãy container làm doanh trại, bãi xe quân sự, kho đạn, sân đáp trực thăng.
//  Zombie lính (cầm rìu) nhiều nhất game, 3 ổ zombie — đồ quân dụng xịn nhất.
//  Hình: PostApocalypse Asset Pack (atlas 'pa', tools/make_pa_props.py) + atlas 'surv'.
// ============================================================
import { TILE } from '../config.js';
import { populateZone, container } from './zones.js';
import { fireBarrel } from './decor.js';
import { state, toast } from '../state.js';

const key = (x, y) => `${x},${y}`;

export const BASE = {
  w: 64, h: 44,
  fromForest: { x: 2, y: 22 },
  exit: [{ x: 0, y: 21 }, { x: 0, y: 22 }],
  toForest: { x: 106, y: 34 },
  fence: { x0: 4, y0: 4, x1: 60, y1: 40 }, // rào kẽm gai bao quanh, cổng phía tây (hàng 20–23)
  gate: [20, 23],
  roads: [[0, 21, 59, 22], [30, 5, 31, 39], [8, 30, 56, 31], [8, 12, 56, 13]],
  pad: { x0: 44, y0: 24, x1: 54, y1: 28 }, // sân đáp trực thăng (bê tông)
  nests: [[18, 26], [48, 9], [52, 35]],
};

export function buildBase(s) {
  const B = BASE;
  for (const [x0, y0, x1, y1] of B.roads) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (s.inMap(x, y)) s.terrain.road.add(key(x, y));
  for (let x = B.pad.x0; x <= B.pad.x1; x++) for (let y = B.pad.y0; y <= B.pad.y1; y++) s.terrain.plaza.add(key(x, y));
  for (const e of B.exit) s.exits.set(key(e.x, e.y), { map: 'forest', spawn: B.toForest });
  // Nền đất nện bạc màu bên trong rào (cỏ chỉ còn bên ngoài)
  {
    const F0 = B.fence;
    for (let y = F0.y0; y <= F0.y1; y++)
      for (let x = F0.x0; x <= F0.x1; x++) {
        const hv = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        s.add.image(x * TILE, y * TILE, 'pa', `dirt${hv % 23 < 2 ? 6 + (hv % 23) : hv % 6}`).setOrigin(0).setDepth(-997);
      }
  }

  const pa = (x, y, f, o = {}) => {
    const w = o.w || 1;
    const img = s.add.image((x + w / 2) * TILE, (y + 1) * TILE + (o.dy || 0), 'pa', f).setOrigin(0.5, 1).setDepth(o.depth ?? (y + 1) * TILE - 1);
    if (o.solid !== false) {
      for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < (o.rows || 1); dy++) s.blocked.add(key(x + dx, y - dy));
      s.addWall(x * TILE + 2, (y - (o.rows || 1) + 1) * TILE + 4, w * TILE - 4, (o.rows || 1) * TILE - 6);
    }
    if (o.label) for (let dx = 0; dx < w; dx++) s.statics.set(key(x + dx, y), () => ({ act: false, label: o.label }));
    return img;
  };

  // ---- Rào kẽm gai (cột + lưới), chừa cổng tây bị phá ----
  const F = B.fence;
  const post = (x, y) => s.add.rectangle(x * TILE + 8, (y + 1) * TILE, 2, 18, 0x3c3640).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
  const mesh = (x, y, horiz) => {
    const g = s.add.graphics().setDepth((y + 1) * TILE - 2);
    g.lineStyle(1, 0x5a5464, 0.9);
    if (horiz) {
      for (let i = 0; i < 16; i += 3) g.lineBetween(x * TILE + i, (y + 1) * TILE - 14, x * TILE + i + 3, (y + 1) * TILE - 2).lineBetween(x * TILE + i + 3, (y + 1) * TILE - 14, x * TILE + i, (y + 1) * TILE - 2);
      g.lineStyle(1, 0x2c2830, 1).lineBetween(x * TILE, (y + 1) * TILE - 15, x * TILE + 16, (y + 1) * TILE - 15);
      // kẽm gai trên đỉnh
      g.lineStyle(1, 0x8a8494, 1);
      for (let i = 2; i < 16; i += 5) g.lineBetween(x * TILE + i, (y + 1) * TILE - 17, x * TILE + i + 2, (y + 1) * TILE - 15);
    } else {
      g.lineStyle(1, 0x5a5464, 0.9).lineBetween(x * TILE + 8, y * TILE - 2, x * TILE + 8, (y + 1) * TILE);
    }
  };
  for (let x = F.x0; x <= F.x1; x++)
    for (const y of [F.y0, F.y1]) {
      mesh(x, y, true);
      if (x % 3 === 0) post(x, y);
      s.blocked.add(key(x, y));
    }
  for (let y = F.y0; y <= F.y1; y++)
    for (const x of [F.x0, F.x1]) {
      if (x === F.x0 && y >= B.gate[0] && y <= B.gate[1]) continue;
      mesh(x, y, false);
      if (y % 3 === 0) post(x, y);
      s.blocked.add(key(x, y));
    }
  s.addWall(F.x0 * TILE, F.y0 * TILE + 4, (F.x1 - F.x0 + 1) * TILE, 10);
  s.addWall(F.x0 * TILE, F.y1 * TILE + 4, (F.x1 - F.x0 + 1) * TILE, 10);
  s.addWall(F.x0 * TILE + 4, F.y0 * TILE, 8, (B.gate[0] - F.y0) * TILE);
  s.addWall(F.x0 * TILE + 4, (B.gate[1] + 1) * TILE, 8, (F.y1 - B.gate[1]) * TILE);
  s.addWall(F.x1 * TILE + 4, F.y0 * TILE, 8, (F.y1 - F.y0 + 1) * TILE);
  // cổng sắt bị húc đổ + biển báo
  s.add.image(F.x0 * TILE + 2, (B.gate[0] + 1) * TILE, 'pa', 'iron_beam').setAngle(70).setDepth((B.gate[0] + 1) * TILE);
  s.add.text(F.x0 * TILE - 4, (B.gate[0] - 1) * TILE, 'KHU QUÂN SỰ\nCẤM VÀO', { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '32px', color: '#ff8a6a', stroke: '#2a1a1a', strokeThickness: 7, align: 'center' }).setScale(0.25).setOrigin(0.5, 1).setDepth(9000);

  // ---- Doanh trại: hai dãy container dựng đứng (lục được tủ sắt bên trong) ----
  const vert = ['cont_9_green_vertical', 'cont_10_green_vertical_og_bleak-yellow', 'cont_1_gray_vertical', 'cont_2_gray_vertical_og_dark-green'];
  for (let i = 0; i < 6; i++) container(s, 'locker', 8 + i * 3, 10, { tex: 'pa', frame: vert[i % 4], w: 2, rows: 2 });
  for (let i = 0; i < 6; i++) container(s, 'locker', 8 + i * 3, 37, { tex: 'pa', frame: vert[(i + 2) % 4], w: 2, rows: 2 });
  // ---- Kho đạn: container nằm + hòm quân dụng ----
  for (const [x, y, f] of [[36, 9, 'cont_11_green_horizontal'], [41, 9, 'cont_12_green_horizontal_og_dark-green'], [36, 18, 'cont_3_gray_horizontal']]) pa(x, y, f, { w: 3, rows: 2, label: 'Container quân dụng — khoá chặt' });
  for (const [x, y] of [[40, 16], [43, 16], [46, 9], [48, 16], [12, 16], [15, 18], [22, 34], [25, 34]]) container(s, 'milcrate', x, y, { w: 2 });
  for (const [x, y] of [[34, 15], [50, 18], [10, 26], [26, 26]]) container(s, 'locker', x, y);
  // ---- Bãi xe quân sự ----
  for (const [x, y, f] of [[36, 37, 'truck'], [41, 37, 'truck'], [52, 37, 'van_green']]) container(s, 'car', x, y, { tex: 'pa', frame: f, w: 4, rows: 2 });
  container(s, 'car', 16, 23, { tex: 'surv', frame: 'truck_green', w: 3 });
  container(s, 'car', 54, 14, { tex: 'pa', frame: 'flip_blue', w: 2 });
  // ---- Lều dã chiến (lục được) ----
  for (const [x, y, f] of [[14, 33, 'tent_green'], [18, 33, 'tent_tan'], [48, 33, 'tent_green'], [22, 16, 'tent_tan']]) container(s, 'tent', x, y, { frame: f, w: 3 });
  // ---- Tường gạch chắn đạn quanh kho ----
  for (const [x, y] of [[34, 20], [35, 20], [38, 20], [39, 20], [52, 6], [53, 6]]) {
    s.add.image(x * TILE + 8, (y + 1) * TILE, 'pa', 'gray_brick_debris').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
    s.blocked.add(key(x, y));
    s.addWall(x * TILE + 1, y * TILE + 4, 14, 11);
  }
  // ---- Sân đáp trực thăng: chữ H sơn trắng ----
  const P = B.pad, cx = ((P.x0 + P.x1 + 1) / 2) * TILE, cy = ((P.y0 + P.y1 + 1) / 2) * TILE;
  s.add.circle(cx, cy, 30, 0xd8d0c0, 0).setStrokeStyle(2, 0xd8d0c0, 0.7).setDepth(-600);
  for (const [dx, w, h] of [[-9, 3, 22], [9, 3, 22], [0, 18, 3]]) s.add.rectangle(cx + dx, cy, w, h, 0xd8d0c0, 0.75).setDepth(-600);
  // ---- Đồ lặt vặt: thùng phuy, lốp, pallet, rác ----
  for (const [x, y, f] of [[7, 6, 'barrel_rust_blue_2'], [58, 6, 'barrel_rust_red_1'], [57, 20, 'tire_1'], [27, 7, 'pallet_2'], [33, 25, 'pallet_1'], [6, 33, '2_tires_grass_bleak_yellow'], [58, 27, 'barrel_rust_blue_1'], [20, 29, 'trash_bag_1']])
    pa(x, y, f);
  for (const [x, y] of [[29, 19], [33, 33], [8, 20], [55, 24], [20, 7]]) fireBarrel(s, x, y);
  for (let i = 0; i < 22; i++) {
    const x = 5 + Math.floor(Math.random() * (B.w - 10)), y = 5 + Math.floor(Math.random() * (B.h - 10));
    s.add.image(x * TILE + 8, y * TILE + 8, 'surv', i % 3 ? `blood${i % 2}` : 'bones').setDepth(-700).setAlpha(0.8);
  }

  // Cây rừng bên ngoài rào
  s.borderTrees({ left: [19, 24] });
  const outside = (x, y) => x < F.x0 || x > F.x1 || y < F.y0 || y > F.y1;
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(Math.random() * B.w), y = 1 + Math.floor(Math.random() * (B.h - 1));
    if (!outside(x, y) || s.blocked.has(key(x, y)) || s.isDirt(x, y) || (x < F.x0 && y >= 19 && y <= 24)) continue;
    if ((x * 31 + y * 17) % 4) continue;
    s.tree(x * TILE + 8, (y + 1) * TILE);
    s.blocked.add(key(x, y));
  }
  s.scatterDecor((x, y) => outside(x, y) && !s.blocked.has(key(x, y)) && !s.isDirt(x, y), 260, 913);

  const free = (x, y) => !s.blocked.has(key(x, y)) && !s.statics.has(key(x, y)) && s.inMap(x, y) && !outside(x, y);
  populateZone(s, 'base', free, B.nests);
  if (!state.baseVisited) {
    state.baseVisited = true;
    s.time.delayedCall(4800, () => toast('Căn cứ quân sự: zombie lính rất khoẻ — mang súng, băng gạc và đi ban ngày!'));
  }
}
