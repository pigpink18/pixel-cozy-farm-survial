// ============================================================
//  Bên trong nhà đổ nát ở Thị trấn: tủ lạnh, tủ bếp, tủ quần áo, tủ thuốc, kệ hàng...
//  để lục đồ. Đôi khi có zombie mắc kẹt trong nhà.
// ============================================================
import { TILE } from '../config.js';
import { toast } from '../state.js';
import { FURN } from '../furniture.js';
import { NPC_HOUSE_IN } from '../npcs.js';
import Combat from '../combat.js';
import { container } from './zones.js';
import { zoneState } from '../survival.js';

const key = (x, y) => `${x},${y}`;

// Kiểu nhà theo hình bên ngoài. loot: [loại thùng, x, hàng dưới, rộng, số hàng]; deco: đồ nội thất cũ (không lục được)
const LAYOUTS = {
  home: {
    title: 'Nhà dân bỏ hoang', wall: 'cream', floor: 'wood',
    loot: [['fridge', 1, 3, 1, 2], ['kitchen', 2, 3, 2, 1], ['wardrobe', 8, 3, 2, 2], ['medcab', 10, 2, 1, 1]],
    deco: [['bed_basic', 1, 5], ['table_round', 5, 5], ['chair_wood', 7, 5], ['armchair_red', 9, 6]],
  },
  store: {
    title: 'Tiệm tạp hoá bị cướp phá', wall: 'brick', floor: 'tile_blue',
    loot: [['shelf', 1, 3, 2, 2], ['shelf', 4, 3, 2, 2], ['shelf', 8, 3, 2, 2], ['shelf', 1, 6, 2, 2], ['desk', 8, 6, 2, 1], ['fridge', 10, 3, 1, 2]],
    deco: [],
  },
  market: {
    title: 'Chợ bỏ hoang', wall: 'wood', floor: 'stone',
    loot: [['shelf', 1, 3, 2, 2], ['fridge', 4, 3, 1, 2], ['shelf', 7, 3, 2, 2], ['kitchen', 9, 6, 2, 1], ['desk', 2, 6, 2, 1]],
    deco: [['table_round', 5, 6]],
  },
};
export const ruinKind = (frame) => (frame === 'store' ? 'store' : frame === 'market' ? 'market' : 'home');

export function buildRuin(s, idx, kind) {
  const L = LAYOUTS[kind] || LAYOUTS.home;
  const H = NPC_HOUSE_IN;
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x141418).setOrigin(0).setDepth(-1000);
  s.add.tileSprite(TILE, 0, (H.w - 2) * TILE, 2 * TILE, 'furn', `wall_${L.wall}`).setOrigin(0).setDepth(-950).setTint(0x8a8478);
  s.add.tileSprite(TILE, 2 * TILE, (H.w - 2) * TILE, (H.h - 3) * TILE, 'furn', `floor_${L.floor}`).setOrigin(0).setDepth(-960).setTint(0x8c867c);
  const edge = 0x2a2420;
  s.add.rectangle(0, 0, TILE, s.worldH, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(s.worldW - TILE, 0, TILE, s.worldH, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(0, s.worldH - TILE, s.worldW, TILE, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(H.door.x * TILE, H.door.y * TILE, TILE, TILE, 0x5a3a24).setOrigin(0).setDepth(-925);
  s.addWall(0, 0, s.worldW, 2 * TILE);
  s.addWall(0, 0, TILE, s.worldH);
  s.addWall(s.worldW - TILE, 0, TILE, s.worldH);
  s.addWall(0, s.worldH - TILE, H.door.x * TILE, TILE);
  s.addWall((H.door.x + 1) * TILE, s.worldH - TILE, s.worldW, TILE);
  s.exits.set(key(H.door.x, H.door.y), { map: 'town', spawn: s.houseBack || { x: 27, y: 20 } });

  // Vết nứt, giấy tờ, máu
  let seed = idx * 97 + 13;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 9; i++) {
    const x = 1 + Math.floor(rnd() * (H.w - 2)), y = 2 + Math.floor(rnd() * (H.h - 3));
    s.add.image(x * TILE + 8, y * TILE + 8, i % 3 ? 'cave_pebbles' : 'surv', i % 3 ? undefined : `blood${i % 2}`).setDepth(-920).setAlpha(0.8);
  }
  // Nội thất cũ đã hỏng (bạc màu, không lục được)
  for (const [fid, x, y] of L.deco) {
    const f = FURN[fid];
    if (!f) continue;
    s.add.image(x * TILE + f.fw * 8, (y + f.fh) * TILE, f.tex || 'furn', f.frame).setOrigin(0.5, 1).setDepth((y + f.fh) * TILE - 1).setTint(0x8a8680);
    s.addWall(x * TILE + 1, y * TILE + 3, f.fw * TILE - 2, f.fh * TILE - 4, false);
    for (let dx = 0; dx < f.fw; dx++) for (let dy = 0; dy < f.fh; dy++) {
      s.blocked.add(key(x + dx, y + dy));
      s.statics.set(key(x + dx, y + dy), () => ({ act: false, label: `${f.name} cũ đã hỏng` }));
    }
  }
  // Chỗ lục đồ
  for (const [type, x, yB, w, rows] of L.loot) container(s, type, x, yB, { w, rows, key: `ruin${idx}:${x},${yB}` });

  // Ánh sáng lờ mờ lọt qua cửa sổ vỡ
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x05060c, 0.32).setOrigin(0).setDepth(9300);
  for (const x of [3, 8]) {
    const g = s.add.image(x * TILE + 8, 2 * TILE + 10, 'fx_glow').setDisplaySize(70, 50).setTint(0xfff0c8).setBlendMode(1).setAlpha(0.35).setDepth(9310);
    s.tweens.add({ targets: g, alpha: 0.25, yoyo: true, repeat: -1, duration: 2200 });
  }

  // Zombie mắc kẹt trong nhà (thị trấn chưa giải phóng)
  s.combat = new Combat(s, 'town');
  s.zoneId = 'town';
  const z = zoneState('town');
  if (z.infection > 0 && Math.random() < 0.5) {
    const spots = [[2, 5], [10, 5], [9, 4], [2, 6], [10, 6]].filter(([x, y]) => !s.blocked.has(key(x, y)));
    const [x, y] = spots[Math.floor(Math.random() * spots.length)];
    s.combat.spawnZombie(Math.random() < 0.75 ? 'walker' : 'runner', x, y);
  }
  s.time.delayedCall(400, () => toast(`${L.title} — lục tủ, kệ để tìm đồ`));
}
