// Nhà của NPC trong làng: tường/sàn & nội thất riêng từng nhà, chủ nhà có mặt theo lịch sinh hoạt
import { TILE } from '../config.js';
import { toast } from '../state.js';
import { FURN } from '../furniture.js';
import { HOUSES, NPC_HOUSE_IN, slotNow } from '../npcs.js';

const key = (x, y) => `${x},${y}`;

export function buildNpcHome(s, id) {
  const Hs = HOUSES[id] || HOUSES.lan;
  const H = NPC_HOUSE_IN;
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x1d1d27).setOrigin(0).setDepth(-1000);
  s.add.tileSprite(TILE, 0, (H.w - 2) * TILE, 2 * TILE, 'furn', `wall_${Hs.wall}`).setOrigin(0).setDepth(-950);
  s.add.tileSprite(TILE, 2 * TILE, (H.w - 2) * TILE, (H.h - 3) * TILE, 'furn', `floor_${Hs.floor}`).setOrigin(0).setDepth(-960);
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
  s.exits.set(key(H.door.x, H.door.y), { map: 'village', spawn: s.houseBack || { x: 20, y: 14 } });

  // Nội thất
  for (const [fid, x, y, flip] of Hs.furn) {
    const f = FURN[fid];
    if (!f) continue;
    const img = s.add.image(x * TILE + f.fw * 8, 0, f.tex || 'furn', f.frame).setFlipX(!!flip);
    if (f.kind === 'wall') img.setPosition(x * TILE + f.fw * 8, y * TILE + 8).setDepth(-900);
    else {
      img.setOrigin(0.5, 1).setPosition(x * TILE + f.fw * 8, (y + f.fh) * TILE).setDepth(f.kind === 'rug' ? -935 : (y + f.fh) * TILE - 1);
      if (f.kind === 'floor') {
        s.fx.shadow(x * TILE + f.fw * 8, (y + f.fh) * TILE - 1, Math.min(img.width, f.fw * TILE + 4), -905);
        s.addWall(x * TILE + 1, y * TILE + 3, f.fw * TILE - 2, f.fh * TILE - 4, false);
        for (let dx = 0; dx < f.fw; dx++) for (let dy = 0; dy < f.fh; dy++) {
          s.blocked.add(key(x + dx, y + dy));
          s.statics.set(key(x + dx, y + dy), () => ({ act: false, label: `${f.name} của ${Hs.title.replace('Nhà ', '')}` }));
        }
      }
    }
  }
  const home = Hs.owners.filter((o) => slotNow(o)?.map === `house:${id}`);
  s.time.delayedCall(400, () => toast(home.length ? `${Hs.title} — vào chơi nhé!` : `${Hs.title} — chủ nhà đi vắng rồi.`));
}
