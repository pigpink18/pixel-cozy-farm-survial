// Công trình kiểu Hay Day trên nông trại: Kho thóc, Nhà kho, nhà máy, bảng đơn hàng, sạp bán
import { TILE, ITEMS, FACTORIES, STORES } from '../config.js';
import { state, bus } from '../state.js';
import { FARM } from '../farmLayout.js';
import { factoryBuilt, buildFactory, factoryPanel, readyCount, ordersPanel, ordersReady, standPanel, standSold, costText, farmLevel, ensureOrders, ensureStand } from '../hayday.js';

const key = (x, y) => `${x},${y}`;

export function buildHayday(s) {
  const H = FARM.hayday;
  ensureOrders();
  ensureStand();
  s.haydayBubbles = [];

  // Công trình: ảnh đặt góc dưới-trái tại ô (x, yB); bấm vào bất kỳ ô nào của công trình
  const place = (tex, x, yB, onTap, rows = 2) => {
    const img = s.building(tex, undefined, x, yB, rows);
    const w = Math.ceil(img.width / TILE);
    for (let tx = x; tx < x + w; tx++) for (let ty = yB - rows + 1; ty <= yB; ty++) s.statics.set(key(tx, ty), onTap);
    return img;
  };
  const bubble = (img, check) => {
    const b = s.add.image(img.x + img.width / 2, img.y - img.height - 4, 'fp_goods', 0).setDepth(9000).setVisible(false);
    s.haydayBubbles.push({ b, check, y: b.y });
  };

  // Kho thóc & Nhà kho
  for (const [id, tex] of [['silo', 'gr8_silo'], ['barn', 'gr8_warehouse']]) {
    const p = H[id];
    place(tex, p.x, p.yB, () => ({ label: `Mở ${STORES[id].name}`, run: () => bus.emit('openStorage', id) }));
  }

  // Nhà máy (chưa xây: biển báo + bóng mờ công trình)
  for (const [id, f] of Object.entries(FACTORIES)) {
    const p = H.factories[id];
    if (factoryBuilt(id)) {
      const img = place(f.tex, p.x, p.yB, () => ({ label: `Mở ${f.name}`, run: () => bus.emit('panel', factoryPanel(id)) }));
      bubble(img, () => {
        const q = state.factories[id].queue[0];
        return readyCount(id) ? { tex: ITEMS[q.out].tex, frame: ITEMS[q.out].frame } : null;
      });
    } else {
      // Chưa xây: chỉ cắm biển báo (không vẽ bóng mờ công trình)
      const sx = p.x + Math.floor(s.textures.get(f.tex).getSourceImage().width / TILE / 2);
      s.add.image(sx * TILE + 8, (p.yB + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((p.yB + 1) * TILE);
      s.addWall(sx * TILE + 3, p.yB * TILE + 8, 10, 8);
      s.statics.set(key(sx, p.yB), () =>
        farmLevel() < f.level
          ? { act: false, label: `${f.name} — mở khoá ở uy tín cấp ${f.level}` }
          : { label: `Xây ${f.name}: ${costText(f.cost)}`, run: () => buildFactory(id) }
      );
    }
  }

  // Bảng đơn hàng
  const b = H.board;
  const board = s.add.image(b.x * TILE, (b.y + 1) * TILE, 'nhouse', 'board').setOrigin(0, 1).setDepth((b.y + 1) * TILE);
  s.fx.shadow(board.x + 16, board.y - 1, 30);
  s.addWall(b.x * TILE + 2, b.y * TILE + 4, 28, 12);
  for (const x of [b.x, b.x + 1]) s.statics.set(key(x, b.y), () => ({ label: 'Xem bảng đơn hàng', run: () => bus.emit('panel', ordersPanel) }));
  s.haydayBubbles.push({
    b: s.add.text(board.x + 16, board.y - 22, '!', { fontFamily: 'VT323', fontSize: '44px', color: '#fdd179', stroke: '#3d3333', strokeThickness: 8 }).setScale(0.3).setOrigin(0.5).setDepth(9000).setVisible(false),
    check: () => (ordersReady() ? true : null),
    y: board.y - 22,
  });

  // Sạp bán ven đường
  const st = H.stand;
  const stand = place('gr8_stand', st.x, st.yB, () => ({ label: 'Mở sạp bán ven đường', run: () => bus.emit('panel', standPanel) }));
  s.haydayBubbles.push({
    b: s.add.image(stand.x + stand.width / 2, stand.y - stand.height - 2, 'coin').setScale(1.6).setDepth(9000).setVisible(false),
    check: () => (standSold() ? true : null),
    y: stand.y - stand.height - 2,
  });
}

// Bong bóng báo "có hàng xong / có tiền / có đơn giao được" (gọi mỗi khung hình)
export function updateHayday(s, time) {
  for (const h of s.haydayBubbles || []) {
    let r = null;
    try {
      r = h.check();
    } catch (e) {
      // Dữ liệu hỏng không được làm đứng cả trò chơi
      if (!h.err) console.error('Bong bóng lỗi:', e);
      h.err = true;
    }
    h.b.setVisible(!!r);
    if (r && r.tex) h.b.setTexture(r.tex, r.frame);
    if (r) h.b.y = h.y + Math.sin(time / 260) * 1.5;
  }
}
