// Khu rừng phía nam nông trại: hồ nước, cây cối, lối vào hầm mỏ
import { TILE, FORAGE, ITEMS } from '../config.js';
import { state, bus, changed, sfx, addItem, xp, season, roomFor } from '../state.js';
import { bonusChance } from '../skills.js';
import { mineEntryChoices } from './mine.js';
import { decorateForest } from './decor.js';

const key = (x, y) => `${x},${y}`;

export const FOREST = {
  w: 56,
  h: 40,
  fromFarm: { x: 19, y: 2 },
  exit: [{ x: 19, y: 0 }, { x: 20, y: 0 }],
  lake: { x: 5, y: 12, w: 12, h: 8, lobes: [[8, 17.5, 3.5, 2.5], [13.5, 14, 3.5, 2.5]] },
  lake2: { x: 34, y: 24, w: 12, h: 8, lobes: [[37.5, 26, 3.5, 2.5], [42.5, 29.5, 3.5, 2.5]] },
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
  ],
  // Bãi hoa ở các khoảng trống
  meadows: [[3, 21, 6, 22], [17, 13, 19, 14], [47, 20, 49, 22], [24, 30, 27, 31], [37, 9, 39, 10]],
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
    s.add.image(x * TILE + 8, (y + 1) * TILE, 'objects', 'rock').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
  for (const e of F.exit) s.exits.set(key(e.x, e.y), { map: 'farm', spawn: { x: 19, y: 41 } });

  // Hai hồ nước
  const L = F.lake;
  s.lakeTiles = new Set();
  for (const lk of [F.lake, F.lake2]) s.addWater(s.pondShape(lk, lk.lobes), 'lake');

  // Hang mỏ
  const c = F.cave;
  const cave = s.add.image(c.x * TILE, (c.y + 1) * TILE, 'nature', 'cave').setOrigin(0, 1).setDepth((c.y + 1) * TILE);
  s.addWall(cave.x + 2, cave.y - 34, 44, 32);
  for (let x = c.x; x < c.x + 3; x++)
    s.statics.set(key(x, c.y), () => ({
      label: 'Vào hầm mỏ',
      run: () =>
        bus.emit('dialog', {
          face: 'portrait',
          name: 'Hầm mỏ',
          text: state.mineDeepest
            ? `Tầng sâu nhất đã tới: ${state.mineDeepest}. Thang máy dừng mỗi 5 tầng. Chọn tầng muốn xuống:`
            : 'Một cái hang tối om... Nghe nói bên dưới có quặng quý và quái vật. Vào thử chứ?',
          choices: [...mineEntryChoices(s), { label: 'Thôi', onClick: null }],
        }),
    }));

  s.borderTrees({ top: [18, 21] });

  // Cây rậm rạp
  const r = rng(1234);
  const near = (x, y, rect, pad = 2) => x >= rect.x0 - pad && x <= rect.x1 + pad && y >= rect.y0 - pad && y <= rect.y1 + pad;
  const lakeRect = { x0: L.x, y0: L.y, x1: L.x + L.w - 1, y1: L.y + L.h - 1 };
  const L2 = F.lake2;
  const lake2Rect = { x0: L2.x, y0: L2.y, x1: L2.x + L2.w - 1, y1: L2.y + L2.h - 1 };
  const caveRect = { x0: c.x - 1, y0: c.y - 3, x1: c.x + 4, y1: c.y + 3 };
  const placed = [];
  for (let i = 0; i < 1200 && placed.length < 110; i++) {
    const x = 2 + Math.floor(r() * (F.w - 4)), y = 3 + Math.floor(r() * (F.h - 5));
    if (near(x, y, F.pathV) || near(x, y, F.pathH) || near(x, y, lakeRect, 1) || near(x, y, lake2Rect, 1) || near(x, y, caveRect, 0)) continue;
    if (F.trails.some(([x0, y0, x1, y1]) => near(x, y, { x0, y0, x1, y1 }, 1)) || F.meadows.some(([x0, y0, x1, y1]) => near(x, y, { x0, y0, x1, y1 }, 1))) continue;
    // Khoảng trống quanh hồ & bãi hoa để rừng có nhịp thưa – dày
    if (near(x, y, lakeRect, 3) && r() < 0.6) continue;
    if (placed.some(([px, py]) => Math.abs(px - x) < 3 && Math.abs(py - y) < 2)) continue;
    placed.push([x, y]);
    s.tree(x * TILE + 8, (y + 1) * TILE);
  }
  const onDirt = (x, y) => s.isDirt(x, y);
  s.forestFree = (x, y) => !s.blocked.has(key(x, y)) && !onDirt(x, y) && !s.lakeTiles.has(key(x, y)) && !s.decor.has(key(x, y));
  decorateForest(s);
  s.scatterDecor((x, y) => s.forestFree(x, y), 650, 777);
  spawnForage(s);
}

// Đồ hái lượm: mọc mới mỗi ngày (tạo khi ghé rừng lần đầu trong ngày)
function spawnForage(s) {
  const dayKey = `${state.year}-${state.season}-${state.day}`;
  if (state.forageDay !== dayKey) {
    state.forageDay = dayKey;
    state.forage = {};
    const kinds = FORAGE[season().id];
    for (let i = 0, tries = 0; i < 16 && tries < 500; tries++) {
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
