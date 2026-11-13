// Hầm mỏ: mỗi tầng sinh ngẫu nhiên đá, quặng, quái vật và một cầu thang ẩn
import Phaser from 'phaser';
import { TILE, MINE_W, MINE_H, MONSTERS, ITEMS, TOOLS } from '../config.js';
import { state, changed, toast, sfx, addItem, selected, useEnergy, toolLv, xp, bagHasRoom } from '../state.js';
import { energyCost, bonusChance } from '../skills.js';
import Combat from '../combat.js';

const key = (x, y) => `${x},${y}`;
export const MINE_SPAWN = { x: 3, y: 4 };

// Chủ đề hang: hầm mỏ trong rừng = đất; Hang sâu (Mỏ đá) = băng → dung nham → pha lê
export const THEMES = {
  earth: { name: 'Hầm mỏ', floor: 0xc09e84, wallTint: 0xa88a72, rock: 0xa89a8c, dark: 0x060302, darkA: 0.93, playerLight: 64 },
  ice: { name: 'Hang băng', floor: 0xbcd6f2, wallTint: 0x9cbce4, rock: 0xc8e4f8, dark: 0x02060e, darkA: 0.9, playerLight: 68 },
  lava: { name: 'Hang dung nham', floor: 0xc88a70, wallTint: 0x9a5a48, rock: 0xc98a78, dark: 0x0a0200, darkA: 0.9, playerLight: 62 },
  crystal: { name: 'Hang pha lê', floor: 0xb4a8e0, wallTint: 0x8a7ac8, rock: 0xb4a4d8, dark: 0x04020c, darkA: 0.92, playerLight: 66 },
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
const rockName = (type) => (type === 'stone' ? 'Đá' : type === 'crystal' ? 'Cụm pha lê' : ITEMS[type].name);
const rockTex = (type) => (type === 'stone' ? 'objects' : type.startsWith('gem') ? 'ore_gem' : type === 'crystal' ? 'q_crystal' : type.startsWith('geode') ? `q_${type}` : type);

// Sinh hình hang tự nhiên (cellular automata), chỉ giữ vùng nối liền với lối vào
function genCave(W, H) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const wall = [];
    const forcedFloor = (x, y) => x >= MINE_SPAWN.x - 1 && x <= MINE_SPAWN.x + 3 && y >= MINE_SPAWN.y && y <= MINE_SPAWN.y + 3;
    const forcedWall = (x, y) => x < 1 || y < 2 || x >= W - 1 || y >= H - 1 || (y === MINE_SPAWN.y - 1 && x >= MINE_SPAWN.x - 1 && x <= MINE_SPAWN.x + 3);
    for (let y = 0; y < H; y++) {
      wall.push([]);
      for (let x = 0; x < W; x++) wall[y].push(forcedWall(x, y) ? true : forcedFloor(x, y) ? false : Math.random() < 0.45);
    }
    const count = (x, y, r) => {
      let n = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || wall[ny][nx]) n++;
      }
      return n;
    };
    for (let it = 0; it < 5; it++) {
      const next = wall.map((row) => row.slice());
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (forcedWall(x, y)) next[y][x] = true;
          else if (forcedFloor(x, y)) next[y][x] = false;
          else next[y][x] = count(x, y, 1) >= 5 || (it < 2 && count(x, y, 2) <= 3);
        }
      for (let y = 0; y < H; y++) wall[y] = next[y];
    }
    // Giữ vùng đi tới được từ lối vào
    const seen = new Set([key(MINE_SPAWN.x, MINE_SPAWN.y)]);
    const q = [[MINE_SPAWN.x, MINE_SPAWN.y]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || wall[ny][nx] || seen.has(key(nx, ny))) continue;
        seen.add(key(nx, ny));
        q.push([nx, ny]);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!wall[y][x] && !seen.has(key(x, y))) wall[y][x] = true;
    if (seen.size >= (W - 2) * (H - 3) * 0.42 || attempt === 11) return wall;
  }
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
      ? { label: 'Lên Mỏ đá', run: () => s.changeMap('quarry', { x: 38, y: 7 }) } // trước cửa Hang sâu (QUARRY.caveFront)
      : { label: 'Lên khỏi hầm mỏ', run: () => s.changeMap('forest', { x: 32, y: 6 }) }
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
    const t = s.add.sprite(x * TILE + 8, y * TILE + 8, 'cave_torch', 0).setDepth(-890).play('cave_torch');
    t.anims.setProgress(Math.random());
    addGlow(s, x * TILE + 8, y * TILE + 8, theme === 'ice' ? 38 : 42, 0xffa040, true);
  }
  // Cột chống gỗ dựng sát vách
  for (const [x, y] of faces.slice(0, Math.floor(faces.length / 9))) {
    if (torches.some(([a, b]) => a === x && b === y) || (x === lad.x && y === lad.y) || isWall(x, y + 1)) continue;
    s.add.image(x * TILE + 8, (y + 2) * TILE - 2, 'cave_beam').setOrigin(0.5, 1).setDepth(-889).setTint(theme === 'ice' ? 0xd8e8ff : 0xffffff);
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
      addGlow(s, x * TILE + 16, y * TILE + 8, 44, 0xff6a30, true);
    } else if (theme !== 'lava' && pud < 3 && r < 0.15 && !isWall(x + 1, y) && !used.has(key(x + 1, y))) {
      pud++;
      used.add(key(x, y)), used.add(key(x + 1, y));
      s.add.image(x * TILE + 16, y * TILE + 8, 'cave_puddle').setDepth(-944).setAlpha(theme === 'ice' ? 0.9 : 0.75).setTint(theme === 'ice' ? 0xcfeaff : 0xffffff);
    } else if ((theme === 'crystal' || theme === 'ice') && glow < 6 && besideWall && r < 0.2 && safe(x, y)) {
      glow++;
      solid(x, y, s.add.image(x * TILE + 8, (y + 1) * TILE, 'q_crystal').setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1).setTint(theme === 'ice' ? 0xd8f0ff : 0xe0b8ff));
      addGlow(s, x * TILE + 8, y * TILE + 6, 40, theme === 'ice' ? 0x8fd3f0 : 0xc08aff, false);
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

  // Quái vật (ở chỗ trống, xa lối vào)
  s.combat = new Combat(s);
  const types = Object.entries(MONSTERS).filter(([, m]) => s.mineEff >= m.minFloor).map(([t]) => t);
  const n = Math.min(3 + Math.floor(s.mineEff / 3), 10);
  let placed = 0;
  for (const [x, y] of rest) {
    if (placed >= n) break;
    if (Math.abs(x - MINE_SPAWN.x) + Math.abs(y - MINE_SPAWN.y) < 8) continue;
    s.combat.spawn(types[Math.floor(Math.random() * types.length)], x, y);
    placed++;
  }

  if (zone === 'deep') state.deepDeepest = Math.max(state.deepDeepest || 0, floor);
  else if (floor > state.mineDeepest) state.mineDeepest = floor;
  if (!state.hasSword) {
    state.hasSword = true;
    state.sel = 'tool:sword';
    toast('Bạn nhặt được một thanh kiếm cũ ở lối vào hầm! (đã thêm vào thanh công cụ)');
  } else toast(zone === 'deep' ? `Hang sâu — tầng ${floor} · ${T.name}` : `Hầm mỏ — tầng ${floor}`);
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
  const img = s.add.image(x * TILE + 8, (y + 1) * TILE, rockTex(o.type), o.type === 'stone' ? 'rock' : undefined).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
  if (o.type === 'stone') img.setTint(THEMES[s.mineTheme].rock);
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
