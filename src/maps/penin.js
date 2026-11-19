// Bên trong chuồng gà / chuồng gia súc: sàn rơm, máng ăn (cho cả đàn ăn), ổ đẻ / thùng sữa (nhặt hết
// sản phẩm 1 lần), biển "Dời chuồng". Ban đêm (19h–6h) vật nuôi vào chuồng ngủ, ban ngày ra sân.
import { TILE, ANIMALS, ITEMS, BUILDINGS } from '../config.js';
import { state, toast, sfx, changed, addItem, roomFor, xp } from '../state.js';
import { farmXp } from '../hayday.js';

const key = (x, y) => `${x},${y}`;

export const PEN_IN = { w: 12, h: 9, door: { x: 6, y: 8 }, enter: { x: 6, y: 7 } };
// vật nuôi ở trong chuồng lúc này?
export const animalsIndoors = () => {
  const h = (state.time || 0) / 60;
  return h >= 19 || h < 6;
};

export function buildPenInside(s, id) {
  const H = PEN_IN;
  const isCoop = id === 'coop';
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x1d1d27).setOrigin(0).setDepth(-1000);
  s.add.tileSprite(TILE, 0, (H.w - 2) * TILE, 2 * TILE, 'furn', 'wall_wood').setOrigin(0).setDepth(-950);
  s.add.tileSprite(TILE, 2 * TILE, (H.w - 2) * TILE, (H.h - 3) * TILE, 'furn', 'floor_wood').setOrigin(0).setDepth(-960).setTint(0xd8c090);
  // rơm rải sàn (vị trí giả ngẫu nhiên cố định) + kiện rơm ở góc
  const rnd = (n) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 40; i++) {
    const x = TILE + 3 + rnd(i) * ((H.w - 2) * TILE - 6), y = 2 * TILE + 3 + rnd(i + 500) * ((H.h - 3) * TILE - 6);
    s.add.rectangle(x, y, 2 + Math.floor(rnd(i + 900) * 3), 1, rnd(i + 70) < 0.5 ? 0xe2cf9e : 0xc9b17e).setDepth(-940).setAngle(rnd(i + 33) * 80 - 40);
  }
  for (const [x, y] of [[1, H.h - 2], [H.w - 2, H.h - 2], [H.w - 2, 4]]) {
    s.add.image(x * TILE + 8, (y + 1) * TILE, 'props', 'haybale').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
    s.addWall(x * TILE + 1, y * TILE + 4, TILE - 2, TILE - 6);
  }
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
  s.exits.set(key(H.door.x, H.door.y), { map: 'farm', spawn: s.houseBack || { x: 22, y: 10 } });

  const mine = () => state.animals.filter((a) => ANIMALS[a.type].house === id);
  const product = ANIMALS[isCoop ? 'chicken' : 'cow'].product;

  // Đồ đạc: chặn ô + chạm được
  const thing = (x, y, w, draw, action) => {
    const objs = draw();
    s.addWall(x * TILE + 1, y * TILE + 3, w * TILE - 2, TILE - 4);
    for (let dx = 0; dx < w; dx++) s.statics.set(key(x + dx, y), action);
    return objs;
  };

  // 1. Máng ăn dài (giữa tường sau)
  thing(4, 2, 4, () => {
    // máng gỗ: thành trước, lòng máng rơm, chân
    const mx = 4 * TILE + 32, my = 3 * TILE - 4;
    s.add.rectangle(mx, my + 1, 62, 11, 0x2a1a12).setDepth(3 * TILE);
    s.add.rectangle(mx, my, 60, 9, 0x8a6a48).setDepth(3 * TILE);
    s.add.rectangle(mx, my - 3, 56, 3, 0xe2cf9e).setDepth(3 * TILE + 1);
    s.add.rectangle(mx, my + 2, 60, 2, 0x5e4630).setDepth(3 * TILE + 1);
    for (const dx of [-26, 26]) s.add.rectangle(mx + dx, my + 6, 3, 3, 0x5e4630).setDepth(3 * TILE);
  }, () => s.penFeedAction(id));

  // 2. Ổ đẻ (chuồng gà) / thùng sữa (chuồng gia súc): nhặt hết sản phẩm
  const ready = () => mine().filter((a) => a.product);
  const shelfX = isCoop ? 1 : 9;
  const eggs = [];
  thing(shelfX, 2, 2, () => {
    // ổ đẻ 2 ngăn có rơm (chuồng gà) / bục gỗ đặt bình sữa (chuồng gia súc)
    const bx = shelfX * TILE + 16, by = 3 * TILE - 5;
    s.add.rectangle(bx, by, 32, 14, 0x2a1a12).setDepth(3 * TILE);
    s.add.rectangle(bx, by, 30, 12, 0x8a6a48).setDepth(3 * TILE);
    if (isCoop) for (const dx of [-7, 7]) {
      s.add.rectangle(bx + dx, by + 1, 12, 7, 0x3a2a1e).setDepth(3 * TILE);
      s.add.rectangle(bx + dx, by + 3, 12, 3, 0xd0b050).setDepth(3 * TILE);
    }
    for (let i = 0; i < 4; i++) {
      const img = s.add.image(shelfX * TILE + 6 + i * 7, 3 * TILE - 7, 'icons', product).setScale(0.55).setDepth(3 * TILE + 1);
      eggs.push(img);
    }
  }, () => {
    const list = ready();
    if (!list.length) return { act: false, label: isCoop ? 'Ổ đẻ — chưa có trứng (gà được ăn hôm nay thì mai đẻ)' : 'Thùng sữa — chưa có gì (cho ăn hôm nay, mai có)' };
    return {
      label: `Nhặt hết ${list.length} ${ITEMS[product].name}`,
      run: () => {
        let n = 0;
        for (const a of ready()) {
          const p = ANIMALS[a.type].product;
          if (!roomFor(p)) break;
          a.product = false;
          addItem(p, 1, true);
          n++;
        }
        if (!n) return;
        xp('farming', n);
        farmXp(n);
        sfx('harvest');
        toast(`+${n} ${ITEMS[product].name}`);
        refreshEggs();
        changed();
      },
    };
  });
  const refreshEggs = () => eggs.forEach((e, i) => e.setVisible(i < ready().length));
  refreshEggs();

  // 3. Biển "Dời chuồng" cạnh cửa ra
  const sx = H.door.x + 2, sy = H.h - 2;
  s.add.image(sx * TILE + 8, (sy + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((sy + 1) * TILE);
  s.addWall(sx * TILE + 3, sy * TILE + 8, 10, 8);
  s.statics.set(key(sx, sy), () => ({
    label: `Dời ${BUILDINGS[id].name} sang chỗ khác`,
    run: () => s.changeMap('farm', s.houseBack || { x: 22, y: 10 }, { movePen: id }),
  }));

  // 4. Vật nuôi: ban đêm ngủ trong chuồng
  const pen = { x0: 2, y0: 4, x1: H.w - 3, y1: H.h - 3 };
  if (animalsIndoors()) for (const a of mine()) s.spawnAnimal(a, pen);
  s.time.delayedCall(350, () =>
    toast(mine().length
      ? animalsIndoors() ? `${BUILDINGS[id].name} — vật nuôi đang ngủ trong chuồng` : `${BUILDINGS[id].name} — ban ngày vật nuôi ra sân, tối (19h) mới vào chuồng`
      : `${BUILDINGS[id].name} — chưa có vật nuôi (mua ở trại Cô Emily)`));
}
