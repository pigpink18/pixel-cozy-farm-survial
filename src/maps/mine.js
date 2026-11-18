// Hầm ngầm quân sự bỏ hoang: mỗi tầng sinh ngẫu nhiên phòng & hành lang, đống đổ nát, phế liệu,
// zombie (càng sâu càng nhiều zombie lính) và một cầu thang ẩn dưới đống đổ nát
import Phaser from 'phaser';
import { TILE, MINE_W, MINE_H, MONSTERS, ITEMS, TOOLS } from '../config.js';
import { state, changed, toast, sfx, addItem, selected, useEnergy, toolLv, xp, bagHasRoom } from '../state.js';
import { energyCost, bonusChance } from '../skills.js';
import Combat from '../combat.js';
import { container } from './zones.js';

const key = (x, y) => `${x},${y}`;
export const MINE_SPAWN = { x: 3, y: 4 };

// Khu trong hầm: lối vào từ rừng = hầm chỉ huy; Tầng sâu (Bãi phế liệu) = kho lạnh → phòng lò hơi → phòng thí nghiệm
export const THEMES = {
  earth: { name: 'Hầm chỉ huy', floor: 0xe0dcd0, wallTint: 0xd8d4c8, rock: 0xd8d0c4, dark: 0x05070a, darkA: 0.9, playerLight: 64, lamp: 0xeef4ff },
  ice: { name: 'Kho lạnh', floor: 0xd4e6f6, wallTint: 0xb8d0ea, rock: 0xd8e8f8, dark: 0x02060e, darkA: 0.9, playerLight: 68, lamp: 0xd8ecff },
  lava: { name: 'Phòng lò hơi', floor: 0xe8bca8, wallTint: 0xc89080, rock: 0xd8a898, dark: 0x0a0200, darkA: 0.9, playerLight: 62, lamp: 0xffb070 },
  crystal: { name: 'Phòng thí nghiệm', floor: 0xcfe6d0, wallTint: 0xa8c8b0, rock: 0xc8dccc, dark: 0x020a04, darkA: 0.92, playerLight: 66, lamp: 0xc8ffd0 },
};
export const themeOf = (zone, floor) => (zone !== 'deep' ? 'earth' : floor <= 10 ? 'ice' : floor <= 20 ? 'lava' : 'crystal');
// Hang sâu khó như hầm mỏ +20 tầng
export const effFloor = (zone, floor) => (zone === 'deep' ? floor + 20 : floor);

function oreFor(floor, theme) {
  const r = Math.random();
  const gems = ['gem_green', 'gem_purple', 'gem_yellow', 'gem_red'];
  if (theme === 'ice') {
    if (r < 0.04) return 'geode_ice';
    if (r < 0.07) return gems[Math.floor(Math.random() * 3)];
    if (r < 0.13) return 'ore_gold';
    if (r < 0.32) return 'ore_iron';
    return null;
  }
  if (theme === 'lava') {
    if (r < 0.05) return 'geode_fire';
    if (r < 0.09) return gems[1 + Math.floor(Math.random() * 3)];
    if (r < 0.26) return 'ore_gold';
    if (r < 0.38) return 'ore_iron';
    return null;
  }
  if (theme === 'crystal') {
    if (r < 0.12) return 'crystal';
    if (r < 0.16) return Math.random() < 0.5 ? 'geode_fire' : 'geode_ice';
    if (r < 0.36) return 'ore_gold';
    return null;
  }
  if (r < 0.015 + floor * 0.001) return gems[Math.floor(Math.random() * (floor >= 15 ? 4 : floor >= 8 ? 3 : 2))];
  if (r < 0.045) return 'geode';
  if (floor >= 20 && r < 0.12) return 'ore_gold';
  if (floor >= 10 && r < 0.2) return 'ore_iron';
  if (r < 0.22) return 'ore_copper';
  return null;
}
const rockName = (type) => (type === 'stone' ? 'Đống bê tông vỡ' : type === 'crystal' ? 'Bình hoá chất' : type.startsWith('gem') ? 'Két sắt nhỏ' : `Đống ${ITEMS[type].name.toLowerCase()}`);
const rockTex = (type) => (type === 'stone' ? 'cave_rubble' : type.startsWith('gem') ? 'ore_gem' : type === 'crystal' ? 'q_crystal' : type.startsWith('geode') ? `q_${type}` : type);

// Sinh mặt bằng hầm: phòng chữ nhật nối nhau bằng hành lang rộng 2 ô (luôn đi tới được hết)
function genCave(W, H) {
  const wall = Array.from({ length: H }, () => Array(W).fill(true));
  const carve = (x0, y0, x1, y1) => {
    for (let y = Math.max(4, y0); y <= Math.min(H - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) wall[y][x] = false;
  };
  const rooms = [{ x0: MINE_SPAWN.x - 1, y0: MINE_SPAWN.y, x1: MINE_SPAWN.x + 4, y1: MINE_SPAWN.y + 4 }];
  for (let tries = 0; rooms.length < 9 && tries < 300; tries++) {
    const w = 4 + Math.floor(Math.random() * 6), h = 3 + Math.floor(Math.random() * 4);
    const x0 = 1 + Math.floor(Math.random() * (W - w - 2)), y0 = 4 + Math.floor(Math.random() * (H - h - 5));
    const r = { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 };
    if (rooms.some((o) => r.x0 <= o.x1 + 2 && r.x1 >= o.x0 - 2 && r.y0 <= o.y1 + 2 && r.y1 >= o.y0 - 2)) continue;
    rooms.push(r);
  }
  const mid = (r) => [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.y0 + r.y1) / 2)];
  for (const r of rooms) carve(r.x0, r.y0, r.x1, r.y1);
  // Nối mỗi phòng với phòng gần nhất đã nối (cây khung) + vài lối vòng
  const linked = [rooms[0]];
  const corridor = (a, b) => {
    const [ax, ay] = mid(a), [bx, by] = mid(b);
    if (Math.random() < 0.5) {
      carve(Math.min(ax, bx), ay, Math.max(ax, bx), ay + 1);
      carve(bx, Math.min(ay, by), bx + 1, Math.max(ay, by));
    } else {
      carve(ax, Math.min(ay, by), ax + 1, Math.max(ay, by));
      carve(Math.min(ax, bx), by, Math.max(ax, bx), by + 1);
    }
  };
  for (const r of rooms.slice(1)) {
    const [rx, ry] = mid(r);
    const near = linked.reduce((best, o) => {
      const [ox, oy] = mid(o);
      const d = Math.abs(ox - rx) + Math.abs(oy - ry);
      return d < best.d ? { o, d } : best;
    }, { o: null, d: 1e9 }).o;
    corridor(r, near);
    linked.push(r);
  }
  for (let i = 0; i < 2; i++) corridor(rooms[1 + Math.floor(Math.random() * (rooms.length - 1))], rooms[1 + Math.floor(Math.random() * (rooms.length - 1))]);
  wall[MINE_SPAWN.y - 1][MINE_SPAWN.x] = true; // vách treo thang lên
  return wall;
}

// Bóng tối trong hang: lớp tối phủ cả bản đồ, khoét lỗ sáng quanh người chơi, đuốc, dung nham, pha lê
function caveLighting(s, T) {
  if (!s.textures.exists('light_brush')) {
    const cv = s.textures.createCanvas('light_brush', 128, 128);
    const g = cv.context.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cv.context.fillStyle = g;
    cv.context.fillRect(0, 0, 128, 128);
    cv.refresh();
  }
  const rt = s.add.renderTexture(0, 0, s.worldW, s.worldH).setOrigin(0).setDepth(9300);
  // Cọ xoá: ảnh tròn mờ dần, đặt đúng tâm nguồn sáng rồi "xoá" lớp tối tại đó
  const brush = s.make.image({ key: 'light_brush', add: false }).setOrigin(0.5);
  const hole = (x, y, r) => {
    brush.setPosition(x, y).setScale((r * 2) / 128);
    rt.erase(brush);
  };
  s.caveLights = [];
  s.caveLight = {
    update(time) {
      rt.clear();
      rt.fill(T.dark, T.darkA);
      hole(s.player.x, s.player.y - 8, T.playerLight);
      for (const l of s.caveLights) {
        const f = l.flicker ? 1 + Math.sin(time / 90 + l.x) * 0.05 + Math.sin(time / 37 + l.y) * 0.03 : 1;
        hole(l.x, l.y, l.r * f);
      }
    },
  };
}

function addGlow(s, x, y, r, tint, flicker) {
  s.caveLights.push({ x, y, r, flicker });
  const g = s.add.image(x, y, 'fx_glow').setDisplaySize(r * 1.4, r * 1.4).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(9310);
  if (flicker) s.tweens.add({ targets: g, alpha: 0.22, duration: 160 + Math.random() * 120, yoyo: true, repeat: -1 });
}

export function buildMine(s) {
  const floor = s.mineFloor;
  const zone = (s.mineZone = s.mineZone || 'forest');
  const theme = (s.mineTheme = themeOf(zone, floor));
  const T = THEMES[theme];
  s.mineEff = effFloor(zone, floor);
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x0d0a0a).setOrigin(0).setDepth(-1000);

  // ---- Hình hang ----
  const W = MINE_W, H = MINE_H;
  const wall = genCave(W, H);
  const isWall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || wall[y][x];
  const faces = [];
  const floors = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!wall[y][x]) {
        s.add.image(x * TILE, y * TILE, `cave_floor${(x * 7 + y * 13 + floor) % 4}`).setOrigin(0).setDepth(-960).setTint(T.floor);
        floors.push([x, y]);
        continue;
      }
      const face = !isWall(x, y + 1);
      s.add.image(x * TILE, y * TILE, face ? 'cave_wall_face' : 'cave_wall_top').setOrigin(0).setDepth(-950).setTint(T.wallTint);
      if (face) faces.push([x, y]);
      // Viền sáng chỗ khối đá giáp sàn
      if (!isWall(x - 1, y)) s.add.image(x * TILE, y * TILE, 'cave_edge_l').setOrigin(0).setDepth(-949).setTint(T.wallTint);
      if (!isWall(x + 1, y)) s.add.image(x * TILE, y * TILE, 'cave_edge_r').setOrigin(0).setDepth(-949).setTint(T.wallTint);
      if (!isWall(x, y - 1) && !face) s.add.image(x * TILE, y * TILE, 'cave_edge_t').setOrigin(0).setDepth(-949).setTint(T.wallTint);
    }
  // Vật cản: gộp các ô vách liền nhau theo hàng cho nhẹ
  for (let y = 0; y < H; y++) {
    let x0 = null;
    for (let x = 0; x <= W; x++) {
      const w = x < W && wall[y][x];
      if (w && x0 === null) x0 = x;
      if (!w && x0 !== null) {
        s.addWall(x0 * TILE, y * TILE, (x - x0) * TILE, TILE);
        x0 = null;
      }
    }
  }
  caveLighting(s, T);

  // Cầu thang lên (gắn trên vách phía trên lối vào)
  const lad = { x: MINE_SPAWN.x, y: MINE_SPAWN.y - 1 };
  s.add.image(lad.x * TILE, lad.y * TILE, 'element', 'ladderUp').setOrigin(0).setDepth(-800);
  s.statics.set(key(lad.x, lad.y), () =>
    zone === 'deep'
      ? { label: 'Lên Bãi phế liệu', run: () => s.changeMap('quarry', { x: 38, y: 7 }) } // trước cửa hầm sâu (QUARRY.caveFront)
      : { label: 'Lên khỏi hầm quân sự', run: () => s.changeMap('forest', { x: 32, y: 6 }) }
  );
  addGlow(s, lad.x * TILE + 8, lad.y * TILE + 14, 46, 0xffe0a0, false); // ánh sáng lọt từ trên xuống

  // ---- Đồ trang trí hầm mỏ ----
  const used = new Set();
  const nearSpawn = (x, y, d = 3) => Math.abs(x - MINE_SPAWN.x - 1) <= d && Math.abs(y - MINE_SPAWN.y - 1) <= d;
  // Chỉ đặt vật cản ở chỗ không bịt lối: quanh ô đó các ô trống phải liền một dải
  const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const safe = (x, y) => {
    const open = RING.map(([dx, dy]) => !isWall(x + dx, y + dy) && !used.has(key(x + dx, y + dy)));
    let runs = 0;
    for (let i = 0; i < 8; i++) if (open[i] && !open[(i + 7) % 8]) runs++;
    const side = [1, 3, 5, 7].filter((i) => open[i]).length;
    return side >= 2 && (runs === 1 || (runs === 0 && open[0]));
  };
  const solid = (x, y, img) => {
    used.add(key(x, y));
    s.blocked.add(key(x, y));
    s.addWall(x * TILE + 2, y * TILE + 5, 12, 10, false);
    return img;
  };
  // Đuốc trên vách (cách nhau ≥ 5 ô)
  const torches = [];
  Phaser.Utils.Array.Shuffle(faces);
  for (const [x, y] of faces) {
    if (torches.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 9)) continue;
    if (x === lad.x && y === lad.y) continue;
    torches.push([x, y]);
    // Đèn huỳnh quang: phần lớn sáng ổn định, vài cái chập chờn
    const t = s.add.sprite(x * TILE + 8, y * TILE + 8, 'cave_torch', 0).setDepth(-890).setTint(T.lamp);
    const flick = Math.random() < 0.35;
    if (flick) s.time.addEvent({ delay: 90, loop: true, callback: () => t.active && t.setFrame(Math.random() < 0.12 ? 1 : 0) });
    addGlow(s, x * TILE + 8, y * TILE + 10, 46, T.lamp, flick);
  }
  // Cột chống gỗ dựng sát vách
  for (const [x, y] of faces.slice(0, Math.floor(faces.length / 9))) {
    if (torches.some(([a, b]) => a === x && b === y) || (x === lad.x && y === lad.y) || isWall(x, y + 1)) continue;
    s.add.image(x * TILE + 8, (y + 2) * TILE - 2, 'cave_beam').setOrigin(0.5, 1).setDepth(-889);
  }
  // Lối vào: đường ray, xe goòng, thùng gỗ
  const ry = MINE_SPAWN.y + 2;
  for (let x = MINE_SPAWN.x - 1; x <= MINE_SPAWN.x + 3; x++) s.add.image(x * TILE + 8, ry * TILE + 8, 'q_rail').setRotation(Math.PI / 2).setDepth(-955).setTint(T.floor);
  if (!isWall(MINE_SPAWN.x + 3, MINE_SPAWN.y)) solid(MINE_SPAWN.x + 3, MINE_SPAWN.y, s.add.image((MINE_SPAWN.x + 3) * TILE + 8, (MINE_SPAWN.y + 1) * TILE, 'cave_crate').setOrigin(0.5, 1).setDepth((MINE_SPAWN.y + 1) * TILE - 1));
  if (floor % 5 === 0 || floor === 1) {
    const cx = MINE_SPAWN.x + 2, cy = MINE_SPAWN.y + 3;
    if (!isWall(cx, cy) && !isWall(cx + 1, cy)) {
      s.add.image(cx * TILE + 16, (cy + 1) * TILE, 'q_cart').setOrigin(0.5, 1).setDepth((cy + 1) * TILE - 1);
      solid(cx, cy), solid(cx + 1, cy);
    }
  }
  // Rải sỏi, măng đá, vũng nước / dung nham / pha lê phát sáng
  Phaser.Utils.Array.Shuffle(floors);
  let stal = 0, pud = 0, glow = 0;
  for (const [x, y] of floors) {
    if (nearSpawn(x, y) || used.has(key(x, y))) continue;
    const besideWall = isWall(x, y - 1) || isWall(x - 1, y) || isWall(x + 1, y);
    const r = Math.random();
    if (r < 0.06) s.add.image(x * TILE + 8, y * TILE + 8, 'cave_pebbles').setDepth(-940).setTint(T.floor).setFlipX(r < 0.03);
    else if (besideWall && stal < 7 && r < 0.12 && safe(x, y)) {
      stal++;
      solid(x, y, s.add.image(x * TILE + 8, (y + 1) * TILE, 'cave_stalagmite').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1).setTint(T.wallTint));
    } else if (theme === 'lava' && pud < 4 && r < 0.16 && !isWall(x + 1, y) && !used.has(key(x + 1, y)) && safe(x, y) && (used.add(key(x, y)), safe(x + 1, y) || (used.delete(key(x, y)), false))) {
      pud++;
      for (const dx of [0, 1]) {
        solid(x + dx, y, s.add.sprite((x + dx) * TILE + 8, y * TILE + 8, 'cave_lava', 0).setDepth(-945).play('cave_lava'));
        s.waterTiles.delete(key(x + dx, y));
      }
      addGlow(s, x * TILE + 16, y * TILE + 8, 44, 0x80ff60, true);
    } else if (theme !== 'lava' && pud < 3 && r < 0.15 && !isWall(x + 1, y) && !used.has(key(x + 1, y))) {
      pud++;
      used.add(key(x, y)), used.add(key(x + 1, y));
      s.add.image(x * TILE + 16, y * TILE + 8, 'cave_puddle').setDepth(-944).setAlpha(theme === 'ice' ? 0.9 : 0.75).setTint(theme === 'ice' ? 0xcfeaff : 0xffffff);
    } else if ((theme === 'crystal' || theme === 'ice') && glow < 6 && besideWall && r < 0.2 && safe(x, y)) {
      glow++;
      solid(x, y, s.add.image(x * TILE + 8, (y + 1) * TILE, 'q_crystal').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1).setTint(theme === 'ice' ? 0xc8e8ff : 0xffffff));
      addGlow(s, x * TILE + 8, y * TILE + 6, 40, theme === 'ice' ? 0x8fd3f0 : 0x90ff70, false);
    }
  }

  // ---- Đá & quặng: dày ở sát vách, thưa ở giữa hang ----
  s.mineObjs = new Map();
  s.mineSprites = new Map();
  s.ladderFound = false;
  const free = floors.filter(([x, y]) => !nearSpawn(x, y, 2) && !used.has(key(x, y)) && !s.blocked.has(key(x, y)));
  Phaser.Utils.Array.Shuffle(free);
  const rocks = [];
  const rest = [];
  for (const [x, y] of free) {
    const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => isWall(x + dx, y + dy)).length;
    if (Math.random() < (walls ? 0.5 : 0.24)) rocks.push([x, y]);
    else rest.push([x, y]);
  }
  for (const [x, y] of rocks) {
    const ore = oreFor(s.mineEff, theme);
    const hard = zone === 'deep' ? 2 : 0; // đá trong Hang sâu cứng hơn
    s.mineObjs.set(key(x, y), { type: ore || 'stone', hp: (ore ? 3 : 2) + hard });
    renderRock(s, x, y);
  }
  s.ladderRock = rocks.length ? key(...rocks[Math.floor(Math.random() * rocks.length)]) : null;

  // Tủ sắt & hòm quân dụng sát tường (mỗi tầng có chỗ lục riêng, có đồ lại sau vài ngày)
  let boxes = 0;
  const nBox = 2 + (floor % 3 === 0 ? 1 : 0);
  for (const [x, y] of rest) {
    if (boxes >= nBox) break;
    if (!isWall(x, y - 1) || nearSpawn(x, y, 3) || used.has(key(x, y)) || s.blocked.has(key(x, y)) || !safe(x, y)) continue;
    const type = boxes % 2 ? 'milcrate' : 'locker';
    const w = type === 'milcrate' ? 2 : 1;
    if (w === 2 && (isWall(x + 1, y) || used.has(key(x + 1, y)) || s.blocked.has(key(x + 1, y)) || !isWall(x + 1, y - 1))) continue;
    for (let dx = 0; dx < w; dx++) used.add(key(x + dx, y));
    container(s, type, x, y, { w, key: `mine:${zone}${floor}:${boxes}` });
    // Dọn đống đổ nát chắn ngay trước hòm
    for (let dx = 0; dx < w; dx++) {
      const fk = key(x + dx, y + 1);
      if (s.mineObjs.has(fk)) {
        s.mineObjs.delete(fk);
        renderRock(s, x + dx, y + 1);
      }
    }
    boxes++;
  }

  // Zombie (ở chỗ trống, xa lối vào): càng sâu càng nhiều lính & con to khoẻ
  s.combat = new Combat(s, null);
  const eff = s.mineEff;
  const pool = ['walker', 'walker', 'runner'];
  if (eff >= 4) pool.push('soldier', 'soldier');
  if (eff >= 10) pool.push('brute', 'soldier');
  if (eff >= 20) pool.push('soldier', 'brute', 'runner');
  const n = Math.min(3 + Math.floor(eff / 3), 11);
  let placed = 0;
  for (const [x, y] of rest) {
    if (placed >= n) break;
    if (Math.abs(x - MINE_SPAWN.x) + Math.abs(y - MINE_SPAWN.y) < 8 || used.has(key(x, y))) continue;
    s.combat.spawnZombie(pool[Math.floor(Math.random() * pool.length)], x, y);
    placed++;
  }

  if (zone === 'deep') state.deepDeepest = Math.max(state.deepDeepest || 0, floor);
  else if (floor > state.mineDeepest) state.mineDeepest = floor;
  if (!state.hasSword) {
    state.hasSword = true;
    state.sel = 'tool:sword';
    toast('Bạn nhặt được một thanh kiếm quân dụng ở lối vào hầm! (đã thêm vào thanh công cụ)');
  } else toast(zone === 'deep' ? `Tầng hầm sâu — tầng ${floor} · ${T.name}` : `Hầm quân sự — tầng ${floor}`);
  changed();
}

function renderRock(s, x, y) {
  const k = key(x, y);
  s.mineSprites.get(k)?.destroy();
  s.mineSprites.delete(k);
  const o = s.mineObjs.get(k);
  if (!o) {
    s.blocked.delete(k);
    s.objWalls.get(k)?.destroy();
    s.objWalls.delete(k);
    return;
  }
  const img = s.add.image(x * TILE + 8, (y + 1) * TILE, rockTex(o.type)).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);

  if (Math.random() < 0.5) img.setFlipX(true);
  s.mineSprites.set(k, img);
  s.blocked.add(k);
  if (!s.objWalls.has(k)) s.objWalls.set(k, s.addWall(x * TILE + 2, y * TILE + 4, 12, 11, false));
}

// Hành động trên ô trong hầm mỏ
export function mineAction(s, tx, ty, sel) {
  const k = key(tx, ty);
  const o = s.mineObjs.get(k);
  if (!o) return sel.id === 'sword' ? { label: 'Vung kiếm', run: () => s.combat.swing() } : null;
  const name = rockName(o.type);
  if (sel.id !== 'pickaxe') return { act: false, label: `${name} — cần Cuốc chim` };
  return {
    label: `Đập ${name}`,
    run: () => {
      if (!useEnergy(energyCost('pickaxe'))) return;
      s.playAction('axe');
      sfx('pick');
      o.hp -= toolLv('pickaxe');
      const spr = s.mineSprites.get(k);
      if (spr) s.tweens.add({ targets: spr, x: spr.x + 1.5, duration: 50, yoyo: true, repeat: 2 });
      s.puff(tx, ty, 0x9a8f86);
      if (o.hp > 0) return changed();
      s.mineObjs.delete(k);
      renderRock(s, tx, ty);
      xp('mining', o.type === 'stone' ? 1 : 3);
      const give = o.type === 'crystal' ? ['gem_green', 'gem_purple', 'gem_yellow', 'gem_red'][Math.floor(Math.random() * 4)] : o.type;
      if (bagHasRoom(give)) addItem(give, bonusChance('mining') ? 2 : 1);
      else toast('Túi đồ đầy — không nhặt được thêm!');
      s.floatIcon(tx * TILE + 8, ty * TILE, ITEMS[give].tex, ITEMS[give].frame);
      // Cầu thang ẩn dưới đá
      if (!s.ladderFound && (k === s.ladderRock || Math.random() < 0.04)) showLadder(s, tx, ty);
      changed();
    },
  };
}

function showLadder(s, tx, ty) {
  s.ladderFound = true;
  s.add.image(tx * TILE, ty * TILE, 'element', 'ladderDown').setOrigin(0).setDepth(-800);
  s.blocked.add(key(tx, ty));
  s.statics.set(key(tx, ty), () => ({
    label: `Xuống tầng ${s.mineFloor + 1}`,
    run: () => {
      sfx('ladder', 0.4);
      s.changeMap('mine', { ...MINE_SPAWN }, { floor: s.mineFloor + 1, zone: s.mineZone });
    },
  }));
  sfx('alert', 0.4);
  toast('Tìm thấy cầu thang xuống tầng dưới!');
}

// Hộp thoại chọn tầng khi vào hầm (thang máy mỗi 5 tầng)
export function mineEntryChoices(s, zone = 'forest') {
  const deepest = zone === 'deep' ? state.deepDeepest || 0 : state.mineDeepest;
  const top = Math.floor(deepest / 5) * 5;
  const floors = [1];
  for (let f = Math.max(5, top - 10); f <= top; f += 5) floors.push(f);
  return floors.slice(-4).map((f) => ({ label: `Tầng ${f}`, onClick: () => s.changeMap('mine', { ...MINE_SPAWN }, { floor: f, zone }) }));
}
