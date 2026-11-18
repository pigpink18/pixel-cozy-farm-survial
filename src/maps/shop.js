// Bên trong cửa hàng: quầy bán, chủ tiệm đứng sau quầy, kệ hàng & đồ trang trí theo từng tiệm
import { TILE, ITEMS, NPCS } from '../config.js';
import { talk } from '../shops.js';
import { toast } from '../state.js';

const key = (x, y) => `${x},${y}`;

// Vị trí cửa hàng trong làng: ảnh (frame), ô trái (x), hàng dưới cùng (yB), ô đứng trước cửa (door)
export const SHOPS = {
  store: { npc: 'lan', title: 'Tiệm tạp hoá', frame: 'store', x: 13, yB: 7, door: { x: 14, y: 8 }, floor: 19, rug: 28 },
  carpenter: { npc: 'tu', title: 'Xưởng mộc', frame: 'carpenter', x: 9, yB: 22, door: { x: 11, y: 23 }, floor: 19, rug: 28 },
  ranch: { npc: 'mai', title: 'Trại chăn nuôi', frame: 'barn', x: 22, yB: 22, door: { x: 24, y: 23 }, floor: 19, rug: 28 },
};

export const SHOP_IN = { w: 14, h: 10, door: { x: 7, y: 9 }, enter: { x: 7, y: 8 }, owner: { x: 6, y: 3 } };

// Hàng bày trên kệ & đồ trang trí riêng của từng tiệm
const GOODS = {
  store: ['seed_carrot', 'seed_tomato', 'seed_potato', 'seed_strawberry', 'carrot', 'tomato', 'pumpkin', 'watermelon', 'strawberry'],
  carpenter: ['wood', 'stone', 'wood', 'bar_copper', 'stone', 'wood', 'ore_copper', 'bar_iron', 'wood'],
  ranch: ['egg', 'milk', 'egg', 'hay', 'milk', 'hay', 'egg', 'cheese', 'butter'],
};
const DECOR = {
  store: [['shop_sack', 1, 7], ['shop_sack', 2, 7], ['shop_crate', 12, 7], ['shop_barrel', 11, 7], ['shop_crate', 1, 8]],
  carpenter: [['shop_planks', 1, 7], ['shop_bench', 11, 7], ['shop_crate', 1, 8], ['shop_barrel', 12, 8]],
  ranch: [['shop_barrel', 1, 7], ['shop_barrel', 2, 7], ['hay', 11, 7], ['hay', 12, 7], ['shop_sack', 12, 8]],
};

export function buildShop(s, id) {
  const S = SHOPS[id] || SHOPS.store;
  const H = SHOP_IN;
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x1d1d27).setOrigin(0).setDepth(-1000);
  // Tường (2 hàng trên) + sàn gỗ
  for (let x = 1; x < H.w - 1; x++) {
    s.add.image(x * TILE, 0, 'interior', 7).setOrigin(0).setDepth(-950);
    s.add.image(x * TILE, TILE, 'interior', 17).setOrigin(0).setDepth(-950);
    for (let y = 2; y < H.h - 1; y++) s.add.image(x * TILE, y * TILE, 'interior', S.floor).setOrigin(0).setDepth(-960);
  }
  // Thảm trước cửa
  for (let x = 6; x <= 8; x++) for (let y = 7; y <= 8; y++) s.add.image(x * TILE, y * TILE, 'interior', S.rug).setOrigin(0).setDepth(-940);
  // Viền tường + cửa ra
  const edge = 0x3a2416;
  s.add.rectangle(0, 0, TILE, s.worldH, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(s.worldW - TILE, 0, TILE, s.worldH, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(0, s.worldH - TILE, s.worldW, TILE, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(H.door.x * TILE, H.door.y * TILE, TILE, TILE, 0x8a5a34).setOrigin(0).setDepth(-925);
  s.addWall(0, 0, s.worldW, 2 * TILE);
  s.addWall(0, 0, TILE, s.worldH);
  s.addWall(s.worldW - TILE, 0, TILE, s.worldH);
  s.addWall(0, s.worldH - TILE, H.door.x * TILE, TILE);
  s.addWall((H.door.x + 1) * TILE, s.worldH - TILE, s.worldW, TILE);
  s.exits.set(key(H.door.x, H.door.y), { map: 'village', spawn: S.door });

  // Cửa sổ + biển tên tiệm trên tường
  for (const x of [3, 10]) s.add.image(x * TILE, 2, 'shop_window').setOrigin(0).setDepth(-920);
  s.add
    .text(7 * TILE, 9, S.title, { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '44px', color: '#fdd179', stroke: '#3d3333', strokeThickness: 8 })
    .setScale(0.25)
    .setOrigin(0.5)
    .setDepth(-910);

  // Kệ hàng dọc hai bên tường (ngang tầm quầy), hàng hoá bày trên 3 tầng
  const goods = GOODS[id] || GOODS.store;
  const SHELF_Y = 5; // đáy kệ ở hàng 5 → kệ chiếm hàng 3–4
  [[1, 0], [11, 1]].forEach(([sx, si]) => {
    const shelf = s.add.image(sx * TILE, SHELF_Y * TILE, 'shop_shelf').setOrigin(0, 1).setDepth(SHELF_Y * TILE);
    s.addWall(sx * TILE, (SHELF_Y - 1) * TILE, 32, TILE - 2);
    for (const x of [sx, sx + 1]) s.blocked.add(key(x, SHELF_Y - 1));
    for (let row = 0; row < 3; row++)
      for (let k = 0; k < 2; k++) {
        const it = ITEMS[goods[(si * 3 + row * 2 + k) % goods.length]];
        if (!it) continue;
        const img = s.add.image(shelf.x + 9 + k * 14, shelf.y - 32 + 8 + row * 10, it.tex, it.frame).setOrigin(0.5, 1).setDepth(SHELF_Y * TILE + 1);
        img.setScale(Math.min(0.7, 11 / Math.max(img.width, img.height)));
      }
  });

  // Đồ trang trí
  for (const [tex, x, y, frame] of DECOR[id] || []) {
    const img = s.add.image(x * TILE + 8, (y + 1) * TILE, tex, frame).setOrigin(0.5, 1).setDepth((y + 1) * TILE);
    s.fx.shadow(img.x, img.y - 1, Math.min(img.width, 30));
    const w = Math.ceil(img.width / TILE);
    s.addWall(img.x - img.width / 2 + 2, (y + 1) * TILE - 10, img.width - 4, 9);
    for (let i = 0; i < w; i++) s.blocked.add(key(x + i - Math.floor((w - 1) / 2), y));
  }

  // Quầy bán + chủ tiệm đứng phía sau (chân bị quầy che bớt)
  const cx = 5 * TILE, cy = 3 * TILE + 10;
  s.add.image(cx, cy, 'shop_counter').setOrigin(0).setDepth(cy + 24);
  s.addWall(cx, cy + 4, 48, 16); // quầy chiếm hàng 3–4, hàng 5 trước quầy để đứng mua
  // Phía sau quầy là chỗ của chủ tiệm: người chơi không vào được (tránh bị kẹt)
  s.addWall(4 * TILE, 2 * TILE, 5 * TILE, 2 * TILE);
  const ask = () => ({ label: `Mua bán với ${NPCS[S.npc].name}`, run: () => talk(S.npc) });
  for (let x = 5; x <= 7; x++) {
    s.statics.set(key(x, 4), ask);
    for (const y of [2, 3]) s.redirects.set(key(x, y), { tx: x, ty: 4 });
  }
  const owner = s.spawnNPC(S.npc, { x: H.owner.x, y: H.owner.y, r: 0, from: 0, to: 24 });
  owner.counter = { tx: H.owner.x, ty: 4 };
  s.time.delayedCall(400, () => toast(`${S.title} — chào mừng! Bấm vào quầy để mua bán với ${NPCS[S.npc].name}.`));
}
