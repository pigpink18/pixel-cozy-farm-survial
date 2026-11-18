// Bên trong nhà: phòng theo cấp nhà, giấy dán tường & sàn tuỳ chọn, nội thất tự sắp xếp (chế độ Trang trí)
import { TILE } from '../config.js';
import { state, bus, changed, toast, sfx, save, ui } from '../state.js';
import { kitchenPanel } from '../shops.js';
import { have, take } from '../hayday.js';
import { FURN, ensureHome, homeSize, footprint, canPlace, placeFurn, removePlaced, canStore, addOwned, ownedCount, bedSpawn } from '../furniture.js';

const key = (x, y) => `${x},${y}`;

// Giữ tên cũ cho các chỗ đang dùng (WorldScene)
export const HOME = {
  get w() { return homeSize().w; },
  get h() { return homeSize().h; },
  get door() { return homeSize().door; },
  get enter() { return homeSize().enter; },
  get bedSpawn() { return bedSpawn(); },
};

const furnTex = (f) => f.tex || 'furn';

export function buildHome(s) {
  ensureHome();
  const { w, h, door } = homeSize();
  s.add.rectangle(0, 0, s.worldW, s.worldH, 0x1d1d27).setOrigin(0).setDepth(-1000);
  s.roomObjs = [];
  drawRoom(s);
  // Viền tường + cửa ra
  const edge = 0x3a2416;
  s.add.rectangle(0, 0, TILE, s.worldH, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(s.worldW - TILE, 0, TILE, s.worldH, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(0, s.worldH - TILE, s.worldW, TILE, edge).setOrigin(0).setDepth(-930);
  s.add.rectangle(door.x * TILE, door.y * TILE, TILE, TILE, 0x8a5a34).setOrigin(0).setDepth(-925);
  s.addWall(0, 0, s.worldW, 2 * TILE);
  s.addWall(0, 0, TILE, s.worldH);
  s.addWall(s.worldW - TILE, 0, TILE, s.worldH);
  s.addWall(0, s.worldH - TILE, door.x * TILE, TILE);
  s.addWall((door.x + 1) * TILE, s.worldH - TILE, s.worldW, TILE);
  s.exits.set(key(door.x, door.y), { map: 'farm', spawn: { x: 6, y: 8 } });
  s.baseBlocked = new Set(s.blocked);
  s.furnObjs = [];
  s.furnKeys = [];
  renderFurniture(s);
  if (!state.roofFixed) roofLeak(s);

  // Chế độ trang trí
  const on = (ev, fn) => {
    bus.on(ev, fn);
    s.events.once('shutdown', () => bus.off(ev, fn));
  };
  on('decoStart', () => startDeco(s));
  on('decoEnd', () => endDeco(s));
  on('decoHold', (id) => holdFromStorage(s, id));
  on('decoFlip', () => flipHeld(s));
  on('decoStore', () => storeHeld(s));
  on('homeStyle', () => drawRoom(s));
  on('decoEsc', () => (s.deco?.held ? cancelHeld(s) : endDeco(s)));
  s.events.once('shutdown', () => {
    if (ui.deco) ui.deco = false;
  });
}

// Tường & sàn theo kiểu đang chọn
function drawRoom(s) {
  for (const o of s.roomObjs || []) o.destroy();
  s.roomObjs = [];
  const { w, h } = homeSize();
  const H = state.home;
  // Vẽ liền một mảng (tileSprite) → không hở khe khi camera thu nhỏ lẻ
  s.roomObjs.push(s.add.tileSprite(TILE, 0, (w - 2) * TILE, 2 * TILE, 'furn', `wall_${H.wall}`).setOrigin(0).setDepth(-950));
  s.roomObjs.push(s.add.tileSprite(TILE, 2 * TILE, (w - 2) * TILE, (h - 3) * TILE, 'furn', `floor_${H.floor}`).setOrigin(0).setDepth(-960));
}

// Vẽ lại toàn bộ nội thất + vật cản + ô tương tác
export function renderFurniture(s) {
  for (const o of s.furnObjs) o.destroy();
  for (const k of s.furnKeys) s.statics.delete(k);
  s.furnObjs = [];
  s.furnKeys = [];
  s.furnImgs = [];
  s.blocked = new Set(s.baseBlocked);
  for (const p of state.home.placed) {
    if (p === s.deco?.held?.from) continue; // đang được nhấc lên
    const f = FURN[p.id];
    if (!f) continue;
    const img = furnImage(s, p.id, p.x, p.y, p.flip);
    img.placed = p;
    s.furnObjs.push(img);
    s.furnImgs.push(img);
    if (f.kind !== 'floor') continue;
    s.furnObjs.push(s.fx.shadow(p.x * TILE + f.fw * 8, (p.y + f.fh) * TILE - 1, Math.min(img.width, f.fw * TILE + 4), -905));
    s.furnObjs.push(s.addWall(p.x * TILE + 1, p.y * TILE + 3, f.fw * TILE - 2, f.fh * TILE - 4, false));
    for (const [x, y] of footprint(p.id, p.x, p.y)) {
      s.blocked.add(key(x, y));
      const act = useAction(s, p);
      if (act) {
        s.statics.set(key(x, y), act);
        s.furnKeys.push(key(x, y));
      }
    }
  }
}

// Ảnh 1 món: đáy ảnh nằm ở đáy ô chiếm chỗ, căn giữa theo chiều ngang (đồ treo tường căn giữa ô)
function furnImage(s, id, x, y, flip) {
  const f = FURN[id];
  const img = s.add.image(0, 0, furnTex(f), f.frame).setFlipX(!!flip);
  if (f.kind === 'wall') {
    img.setOrigin(0.5, 0.5).setPosition(x * TILE + f.fw * 8, y * TILE + 8).setDepth(-900);
  } else {
    img.setOrigin(0.5, 1).setPosition(x * TILE + f.fw * 8, (y + f.fh) * TILE);
    img.setDepth(f.kind === 'rug' ? -935 : (y + f.fh) * TILE - 1);
  }
  return img;
}

function useAction(s, p) {
  const f = FURN[p.id];
  if (f.use === 'sleep') return () => ({ label: 'Đi ngủ', run: () => s.confirmSleep() });
  if (f.use === 'cook') return () => ({ label: 'Nấu ăn', run: () => bus.emit('panel', kitchenPanel) });
  if (f.use === 'chest') return () => ({ label: 'Mở rương chứa đồ', run: () => bus.emit('openStorage', `home:${p.uid}`) });
  if (f.use === 'piano')
    return () => ({
      label: 'Chơi đàn',
      run: () => {
        sfx('success', 0.3);
        s.floatText(s.player.x, s.player.y - 22, '♪ ♫ ♪', '#fdd179');
      },
    });
  if (f.use === 'radio')
    return () => ({
      label: state.muted ? 'Bật đài (âm thanh đang tắt)' : 'Nghe đài',
      run: () => {
        bus.emit('radio');
        s.floatText(s.player.x, s.player.y - 22, '♪', '#bfe3ff');
      },
    });
  return () => ({ act: false, label: `${f.name} · bấm "Trang trí" để sắp xếp` });
}

// Bấm vào ô trong nhà (ngoài chế độ trang trí)
export function homeAction(s, tx, ty, sel) {
  if (sel.kind === 'item' && FURN[sel.id]) return { act: false, label: 'Bấm nút "Trang trí" để đặt đồ trong nhà' };
  return null;
}

// =========================================================
//  Chế độ trang trí
// =========================================================
function startDeco(s) {
  if (ui.deco || ui.modal || ui.transition) return;
  ui.deco = true;
  s.cancelPath();
  s.player.setVelocity(0, 0);
  s.deco = { held: null, ghost: null, frame: null, tile: null };
  // Thu nhỏ camera để thấy cả căn phòng phía trên thanh trang trí
  const cam = s.cameras.main;
  s.deco.camZoom = cam.zoom;
  cam.stopFollow();
  cam.removeBounds();
  const W = s.scale.width, H = s.scale.height, barH = 150;
  const z = Math.min(3, (W - 40) / s.worldW, (H - barH - 24) / s.worldH);
  cam.setZoom(z);
  const cyScreen = (H - barH) / 2 + 4;
  cam.centerOn(s.worldW / 2, s.worldH / 2 + (H / 2 - cyScreen) / z);
  s.deco.grid = s.add.graphics().setDepth(9400);
  drawGrid(s);
  s.cursor?.setVisible(false);
  bus.emit('decoMode', true);
  bus.emit('hint', '');
}

function endDeco(s) {
  if (!ui.deco) return;
  if (s.deco.held) cancelHeld(s);
  ui.deco = false;
  s.deco.grid?.destroy();
  s.deco = null;
  const cam = s.cameras.main;
  cam.setZoom(3);
  const vw = s.scale.width / 3;
  cam.setBounds(s.worldW / 2 - vw / 2, -46, vw, s.worldH + 46 + 30).startFollow(s.player, true, 0.15, 0.15);
  // Nếu đồ mới đặt đè lên chỗ nhân vật đứng → đưa ra cửa
  const { tx, ty } = s.playerTile();
  if (s.blocked.has(key(tx, ty))) {
    const sp = bedSpawn();
    s.player.setPosition(sp.x * TILE + 8, sp.y * TILE + 8);
  }
  save();
  changed();
  bus.emit('decoMode', false);
}

// Lưới mờ cho dễ căn chỉnh
function drawGrid(s) {
  const g = s.deco.grid;
  const { w, h } = homeSize();
  g.clear();
  g.lineStyle(1, 0xffffff, 0.08);
  for (let x = 1; x < w; x++) g.lineBetween(x * TILE, 0, x * TILE, (h - 1) * TILE);
  for (let y = 1; y < h; y++) g.lineBetween(TILE, y * TILE, (w - 1) * TILE, y * TILE);
  g.lineStyle(1, 0xfdd179, 0.25).strokeRect(TILE, 2 * TILE, (w - 2) * TILE, (h - 3) * TILE);
}

// Bấm trong chế độ trang trí
export function decoPointer(s, wx, wy) {
  const d = s.deco;
  if (!d) return;
  if (d.held) {
    const t = anchorTile(d.held.id, wx, wy);
    const ok = canPlace(d.held.id, t.x, t.y, d.held.from);
    if (!ok.ok) {
      sfx('cancel', 0.4);
      return toast(ok.why);
    }
    const h = d.held;
    if (h.from) {
      h.from.x = t.x;
      h.from.y = t.y;
      h.from.flip = h.flip;
    } else {
      addOwned(h.id, -1);
      placeFurn(h.id, t.x, t.y, h.flip, h.id === 'storage_chest' ? `c${Date.now().toString(36)}` : null);
    }
    clearHeld(s);
    renderFurniture(s);
    sfx('plant', 0.45);
    s.burst(t.x * TILE + FURN[h.id].fw * 8, (t.y + FURN[h.id].fh) * TILE - 4, 'fx_dust', 6, 0xfff1cf, 10, 8, 380);
    changed();
    return;
  }
  // Nhấc món đang trỏ vào (ưu tiên món nằm trên cùng)
  const hit = [...(s.furnImgs || [])].sort((a, b) => b.depth - a.depth).find((img) => img.getBounds().contains(wx, wy));
  if (!hit) return toast('Chọn một món ở thanh dưới, hoặc bấm vào đồ trong nhà để dời');
  d.held = { id: hit.placed.id, flip: !!hit.placed.flip, from: hit.placed };
  renderFurniture(s);
  makeGhost(s, wx, wy);
  sfx('click', 0.4);
  bus.emit('decoHeld', d.held.id);
}

export function decoMove(s, wx, wy) {
  const d = s.deco;
  if (!d?.held || !d.ghost) return;
  d.last = { wx, wy };
  const id = d.held.id;
  const f = FURN[id];
  const t = anchorTile(id, wx, wy);
  const ok = canPlace(id, t.x, t.y, d.held.from).ok;
  const ref = furnImageGeom(id, t.x, t.y);
  d.ghost.setPosition(ref.x, ref.y).setDepth(9500).setFlipX(d.held.flip);
  d.ghost.setTint(ok ? 0xffffff : 0xff7a6a).setAlpha(ok ? 0.9 : 0.7);
  d.frame.clear().lineStyle(1, ok ? 0x9be27a : 0xff6a5a, 1).fillStyle(ok ? 0x9be27a : 0xff6a5a, 0.18);
  d.frame.fillRect(t.x * TILE, t.y * TILE, f.fw * TILE, f.fh * TILE).strokeRect(t.x * TILE + 0.5, t.y * TILE + 0.5, f.fw * TILE - 1, f.fh * TILE - 1);
}

// Ô neo (góc trên-trái) sao cho con trỏ nằm giữa món đồ
function anchorTile(id, wx, wy) {
  const f = FURN[id];
  return { x: Math.round(wx / TILE - f.fw / 2), y: Math.round(wy / TILE - f.fh / 2) };
}

function furnImageGeom(id, x, y) {
  const f = FURN[id];
  return f.kind === 'wall' ? { x: x * TILE + f.fw * 8, y: y * TILE + 8 } : { x: x * TILE + f.fw * 8, y: (y + f.fh) * TILE };
}

function makeGhost(s, wx, wy) {
  const d = s.deco;
  const f = FURN[d.held.id];
  d.ghost?.destroy();
  d.frame?.destroy();
  d.ghost = s.add.image(0, 0, furnTex(f), f.frame).setOrigin(0.5, f.kind === 'wall' ? 0.5 : 1);
  d.frame = s.add.graphics().setDepth(9450);
  decoMove(s, wx, wy);
}

function clearHeld(s) {
  const d = s.deco;
  d.ghost?.destroy();
  d.frame?.destroy();
  d.ghost = d.frame = null;
  d.held = null;
  bus.emit('decoHeld', null);
}

function cancelHeld(s) {
  clearHeld(s);
  renderFurniture(s);
}

// Chọn món từ kho (thanh dưới)
function holdFromStorage(s, id) {
  const d = s.deco;
  if (!d || !FURN[id]) return;
  if (ownedCount(id) <= 0) return toast('Hết món này trong kho');
  if (d.held) cancelHeld(s);
  d.held = { id, flip: false, from: null };
  // Đặt bóng ở giữa phòng, người chơi kéo/bấm để đặt
  const p = d.last || { wx: s.worldW / 2, wy: s.worldH / 2 };
  makeGhost(s, p.wx, p.wy);
  bus.emit('decoHeld', id);
  toast(`Bấm vào chỗ muốn đặt ${FURN[id].name}`);
}

function flipHeld(s) {
  const d = s.deco;
  if (!d?.held) return toast('Nhấc một món lên trước rồi mới xoay được');
  d.held.flip = !d.held.flip;
  if (d.last) decoMove(s, d.last.wx, d.last.wy);
  else d.ghost?.setFlipX(d.held.flip);
  sfx('click', 0.3);
}

function storeHeld(s) {
  const d = s.deco;
  if (!d?.held) return toast('Nhấc một món lên trước rồi mới cất được');
  const h = d.held;
  if (h.from) {
    const ok = canStore(h.from);
    if (!ok.ok) return toast(ok.why);
    removePlaced(h.from);
    if (FURN[h.id].use === 'chest') delete state.storage[`home:${h.from.uid}`];
    addOwned(h.id, 1);
  }
  clearHeld(s);
  renderFurniture(s);
  sfx('click', 0.4);
  toast(`Đã cất ${FURN[h.id].name} vào kho`);
  changed();
}

// Mái dột (ván mới): vệt nắng lọt qua lỗ thủng, nước nhỏ giọt xuống vũng trên sàn. Có 10 gỗ thì vá được.
function roofLeak(s) {
  const { w } = homeSize();
  const tx = Math.floor(w / 2) + 2, ty = 4;
  const cx = tx * TILE + 8, cy = ty * TILE + 10;
  const objs = [];
  objs.push(s.add.rectangle(cx, cy - 26, 10, 52, 0xfff3c0, 0.07).setDepth(-890)); // vệt sáng
  objs.push(s.add.rectangle(cx, 2 * TILE - 3, 8, 3, 0x0d0a0b).setDepth(-940)); // lỗ thủng trên tường/mái
  const puddle = s.add.ellipse(cx, cy, 16, 6, 0x6a9ac8, 0.55).setDepth(-920);
  objs.push(puddle);
  s.tweens.add({ targets: puddle, scaleX: 1.08, yoyo: true, repeat: -1, duration: 1300 });
  const drip = () => {
    if (!puddle.active) return;
    const d = s.add.rectangle(cx, 2 * TILE, 1, 3, 0x9ac8f0).setDepth(9000);
    s.tweens.add({
      targets: d, y: cy - 2, duration: 520, ease: 'Quad.easeIn',
      onComplete: () => {
        d.destroy();
        const ring = s.add.ellipse(cx, cy, 4, 2).setStrokeStyle(1, 0xcfe8ff, 0.9).setDepth(-915);
        s.tweens.add({ targets: ring, scaleX: 3, scaleY: 2.5, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
      },
    });
  };
  const ev = s.time.addEvent({ delay: 1100, loop: true, callback: drip });
  const k = `${tx},${ty}`;
  s.statics.set(k, () => {
    const n = have('wood');
    if (n < 10) return { act: false, label: `Mái nhà dột — cần 10 gỗ để vá (đang có ${n}). Chặt cây bằng Rìu.` };
    return {
      label: 'Vá mái dột (10 gỗ)',
      run: () => {
        take('wood', 10);
        state.roofFixed = true;
        ev.remove();
        for (const o of objs) s.tweens.add({ targets: o, alpha: 0, duration: 500, onComplete: () => o.destroy() });
        s.statics.delete(k);
        s.cameras.main.shake(120, 0.003);
        sfx('hoe', 0.6);
        toast('Đã vá xong mái nhà — hết dột rồi!');
        changed();
      },
    };
  });
}
