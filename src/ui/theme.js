// ============================================================
//  Giao diện kiểu Stardew: khung gỗ + nền giấy, nút gỗ, ô đồ chìm
//  Vẽ pixel art 16x16 bằng code rồi phóng to x3 bằng NineSlice cho nét.
// ============================================================

export const FONT = 'VT323, AshenGlyphs, monospace'; // AshenGlyphs: ký tự pixel VT323 không có (♥ ▶ ✓ →...)
export const UI_SCALE = 3;

// Bảng màu (lấy từ Farmer Pack)
export const C = {
  outline: '#3d3333',
  woodLight: '#de9f47',
  wood: '#a57855',
  woodDark: '#734c44',
  paper: '#fee1b8',
  paperDark: '#f2b888',
  gold: '#fdd179',
  grey: '#87857c',
  greyLight: '#bcad9f',
  ink: '#3d3333',
  muted: '#7a5859',
  title: '#a8562e',
  blue: '#40527a',
  green: '#44702d',
  red: '#b55945',
};

// Chữ trên nền giấy (tối) và chữ nổi trên bản đồ (sáng, có viền)
const LIGHT_TO_INK = {
  '#ffffff': C.ink, '#ffd34d': C.title, '#cfcfe0': C.muted, '#bfe3ff': C.blue, '#ffe9a8': C.ink,
  '#9be07a': C.green, '#ffb070': C.red, '#9be0ff': C.blue, '#aaaaaa': C.grey, '#e8e8e8': C.muted,
};
export const text = (size, color = '#ffffff') => ({
  fontFamily: FONT,
  fontSize: `${Math.round(size * 1.4)}px`,
  color: LIGHT_TO_INK[color] || color,
  padding: { top: 2, bottom: 2 },
});
export const textLight = (size, color = C.paper) => ({
  fontFamily: FONT,
  fontSize: `${Math.round(size * 1.4)}px`,
  color,
  stroke: C.outline,
  strokeThickness: 5,
  padding: { top: 2, bottom: 2 },
});

// ---------- Vẽ texture ----------
function paint(scene, key, size, colorAt) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++) {
      const c = colorAt(x, y, size - 1);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  tex.refresh();
}

const corner = (x, y, m) => (x === 0 || x === m) && (y === 0 || y === m); // bo góc 1px

export function makeUiTextures(scene) {
  // Khung gỗ + nền giấy (viền 4px)
  paint(scene, 'ui_frame', 16, (x, y, m) => {
    if (corner(x, y, m)) return null;
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return C.outline;
    if (d === 1) return x === 1 || y === 1 ? C.woodLight : C.wood;
    if (d === 2) return C.wood;
    if (d === 3) return C.woodDark;
    return C.paper;
  });
  // Khung gỗ đặc (thanh công cụ, bảng trạng thái)
  paint(scene, 'ui_wood', 16, (x, y, m) => {
    if (corner(x, y, m)) return null;
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return C.outline;
    if (d === 1) return x === 1 || y === 1 ? C.woodLight : C.woodDark;
    return (y % 5 === 0 && d > 2) ? C.woodDark : C.wood; // vân gỗ
  });
  // Ô đồ chìm
  paint(scene, 'ui_slot', 16, (x, y, m) => {
    if (x === 0 || y === 0) return C.woodDark;
    if (x === m || y === m) return C.paper;
    if (x === 1 || y === 1) return C.wood;
    return C.paperDark;
  });
  // Viền chọn vàng
  paint(scene, 'ui_sel', 16, (x, y, m) => {
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return C.woodLight;
    if (d === 1) return C.gold;
    return null;
  });
  // Nút gỗ
  const btn = (key, face, light, shadow) =>
    paint(scene, key, 16, (x, y, m) => {
      if (corner(x, y, m)) return null;
      const d = Math.min(x, y, m - x, m - y);
      if (d === 0) return C.outline;
      if (y === 1) return light;
      if (y >= m - 2) return shadow;
      return face;
    });
  btn('ui_btn', C.woodLight, C.gold, C.wood);
  btn('ui_btn_off', C.greyLight, C.paper, C.grey);
  btn('ui_btn_red', '#d4806a', '#f2b888', '#a8562e');
  btn('ui_btn_blue', '#6c81a1', '#96a9c1', '#40527a');
  // Đồng xu tròn 12x12 (viền tối, mặt vàng, vệt sáng, ký hiệu ở giữa)
  if (!scene.textures.exists('ui_coin')) {
    const m = [
      '....oooo....',
      '..oo####oo..',
      '.o#wwyyyy#o.',
      '.o#wyyyyyy#o',
      'o#wyyddyyy#o',
      'o#yyydyyyy#o',
      'o#yyydyyyy#o',
      'o#yyddddyy#o',
      '.o#yyyyyy#o.',
      '.o##yyyy##o.',
      '..oo####oo..',
      '....oooo....',
    ];
    const col = { o: C.outline, '#': '#c98a2e', y: C.gold, w: '#fff4c8', d: '#c98a2e' };
    paint(scene, 'ui_coin', 12, (x, y) => col[m[y][x]] || null);
  }
  makeHudTextures(scene);
  // Dòng trong danh sách (giấy đậm hơn)
  paint(scene, 'ui_row', 16, (x, y, m) => {
    if (corner(x, y, m)) return null;
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return C.wood;
    return C.paperDark;
  });
}

// NineSlice phóng to x3 (giữ pixel nét)
export function box(scene, key, x, y, w, h, border = 4) {
  const s = UI_SCALE;
  return scene.add.nineslice(x, y, key, undefined, Math.max(w / s, border * 2 + 1), Math.max(h / s, border * 2 + 1), border, border, border, border).setOrigin(0).setScale(s);
}

// Màu cũ của nút → loại nút mới
export function buttonKey(color, disabled) {
  if (disabled) return 'ui_btn_off';
  if ([0x6b4a4a, 0x8a3b3b].includes(color)) return 'ui_btn_red';
  if ([0x46607a, 0x5b4a7a].includes(color)) return 'ui_btn_blue';
  if (color === 0x45455a) return 'ui_btn_off';
  if (color === 0x2e2729) return 'hud_btn';
  return 'ui_btn';
}

// ============================================================
//  HUD "tro tàn": tấm sắt cháy xém có đinh tán, giấy ghim, icon pixel
// ============================================================
export const ASH = { ink: '#141012', plate: '#2e2729', plateD: '#231d1f', edge: '#4a3f40', hi: '#7a6d68', rivet: '#9a8f86', rust: '#7a4128', ember: '#f08a4b', emberL: '#ffd27a', paper: '#d8c79f', paperD: '#a8956b', blood: '#c0392b' };

// Hình tự viền: fill(x,y) → màu | null; ô trống sát ô có màu → viền tối
function iconTex(scene, key, size, fill, line = ASH.ink) {
  if (scene.textures.exists(key)) return;
  const g = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) g[y * size + x] = fill(x, y) || null;
  paint(scene, key, size, (x, y) => {
    const c = g[y * size + x];
    if (c) return c;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < size && ny < size && g[ny * size + nx];
    });
    return near ? line : null;
  });
}

function makeHudTextures(scene) {
  const rnd = (x, y) => ((x * 73856093) ^ (y * 19349663)) % 7;
  // Tấm sắt: viền đen, mép sáng trên-trái, gỉ sét mép dưới, 4 đinh tán ở góc
  paint(scene, 'hud_plate', 16, (x, y, m) => {
    if (corner(x, y, m)) return null;
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return ASH.ink;
    if ((x === 2 || x === m - 2) && (y === 2 || y === m - 2)) return ASH.rivet;
    if (d === 1) return x === 1 || y === 1 ? ASH.hi : ASH.plateD;
    if (d === 2 && y >= m - 2 && rnd(x, y) < 3) return ASH.rust;
    if (d === 2) return ASH.edge;
    return rnd(x, y) === 0 ? ASH.plateD : ASH.plate;
  });
  // Nút sắt (bấm được): như tấm sắt nhưng mép dưới dày hơn
  paint(scene, 'hud_btn', 16, (x, y, m) => {
    if (corner(x, y, m)) return null;
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return ASH.ink;
    if (y >= m - 2) return ASH.plateD;
    if (y === 1) return ASH.hi;
    if ((x === 2 || x === m - 2) && y === 3) return ASH.rivet;
    return ASH.edge;
  });
  // Giấy nhàu (ghi chú nhiệm vụ): mép ố vàng
  paint(scene, 'hud_note', 16, (x, y, m) => {
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return ASH.ink;
    if (d === 1) return ASH.paperD;
    if (d === 2 && rnd(x, y) < 2) return '#c4b288';
    return ASH.paper;
  });
  // Ô chân dung: nền tối, viền than hồng
  paint(scene, 'hud_well', 16, (x, y, m) => {
    const d = Math.min(x, y, m - x, m - y);
    if (d === 0) return ASH.ink;
    if (d === 1) return y > m / 2 ? ASH.ember : ASH.rust;
    return '#1d1719';
  });

  const inC = (x, y, cx, cy, r) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
  // Tim (máu)
  iconTex(scene, 'ic_heart', 12, (x, y) => {
    const u = (x + 0.5 - 6) / 5.2, v = -(y + 0.5 - 5.2) / 4.8;
    if ((u * u + v * v - 1) ** 3 - u * u * v ** 3 > 0) return null;
    return (x === 3 && y >= 3 && y <= 4) || (x === 4 && y === 3) ? '#ff9f8a' : ASH.blood;
  });
  // Đùi gà (no)
  iconTex(scene, 'ic_food', 12, (x, y) => {
    if (inC(x, y, 7, 4.5, 3.6)) return (x <= 6 && y <= 3) ? '#e09a5a' : '#b5653a';
    if (x + y >= 10 && x + y <= 11 && x >= 2 && x <= 5) return '#efe6c8';
    if ((x === 1 || x === 2) && (y === 9 || y === 10) && !(x === 2 && y === 9)) return '#efe6c8';
    return null;
  });
  // Mặt trời / trăng / mưa / tuyết
  iconTex(scene, 'ic_sun', 12, (x, y) => {
    if (inC(x, y, 6, 6, 2.8)) return x + y < 10 ? ASH.emberL : '#f0b040';
    const r = [[6, 0], [6, 11], [0, 6], [11, 6], [2, 2], [9, 2], [2, 9], [9, 9]];
    return r.some(([a, b]) => a === x && b === y) ? '#f0b040' : null;
  });
  iconTex(scene, 'ic_moon', 12, (x, y) => (inC(x, y, 6, 6, 4.5) && !inC(x, y, 8.2, 4.6, 3.8) ? '#e8e2c0' : null));
  iconTex(scene, 'ic_rain', 12, (x, y) => {
    if (inC(x, y, 4, 5, 2.3) || inC(x, y, 7, 3.8, 2.7) || inC(x, y, 9, 5.5, 1.8) || (y >= 5 && y <= 6 && x >= 3 && x <= 9)) return y < 4 ? '#e3e6ea' : '#a9afb6';
    return [[3, 9], [6, 10], [9, 9], [4, 11]].some(([a, b]) => a === x && b === y) ? '#6fa8dc' : null;
  });
  iconTex(scene, 'ic_snow', 12, (x, y) => {
    const dx = x - 5.5, dy = y - 5.5;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 5) return null;
    return Math.abs(dx) < 1 || Math.abs(dy) < 1 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.6 ? '#eef6ff' : null;
  });
  // Đầu lâu (cảnh báo đêm)
  iconTex(scene, 'ic_skull', 12, (x, y) => {
    const head = inC(x, y, 6, 4.8, 4.2) || (y >= 7 && y <= 10 && x >= 3 && x <= 8);
    if (!head) return null;
    if ((x === 3 || x === 4 || x === 7 || x === 8) && (y === 4 || y === 5)) return ASH.ink;
    if ((x === 5 || x === 6) && y === 7) return ASH.ink;
    if ((x === 4 || x === 7) && y === 10) return ASH.ink;
    return '#e8e2c0';
  });
  // Đinh ghim
  iconTex(scene, 'ic_pin', 8, (x, y) => (inC(x, y, 4, 3, 2.4) ? (x < 4 && y < 3 ? '#ff8a7a' : ASH.blood) : x === 4 && y >= 5 && y <= 7 ? '#c4c9cf' : null));
  // Ba lô (túi đồ)
  iconTex(scene, 'ic_bag', 16, (x, y) => {
    if (y >= 1 && y <= 3 && (x === 6 || x === 9 || ((x === 7 || x === 8) && y === 1))) return '#434d2a';
    if (x < 3 || x > 12 || y < 4 || y > 14) return null;
    if ((x === 7 || x === 8) && y === 8) return '#fdd179';
    if (y <= 7) return y === 4 ? '#b8c47e' : '#94a364';
    if (x >= 5 && x <= 10 && y >= 10 && y <= 13) return y === 10 ? '#55613a' : '#434d2a';
    return x === 12 ? '#55613a' : '#6b7a45';
  });
  // Bánh răng (cài đặt)
  iconTex(scene, 'ic_gear', 16, (x, y) => {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (r < 2.3) return null;
    if (r <= 5 || (r <= 7 && Math.cos(8 * a) > 0.1)) return dx + dy > 2 ? '#6f747a' : '#b8bdc3';
    return null;
  });
}
