// ============================================================
//  Giao diện kiểu Stardew: khung gỗ + nền giấy, nút gỗ, ô đồ chìm
//  Vẽ pixel art 16x16 bằng code rồi phóng to x3 bằng NineSlice cho nét.
// ============================================================

export const FONT = 'VT323, monospace';
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
  return 'ui_btn';
}
