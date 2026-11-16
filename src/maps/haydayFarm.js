// Công trình kiểu Hay Day trên nông trại: Kho thóc, Nhà kho, nhà máy, bảng đơn hàng, sạp bán
import { TILE, ITEMS, FACTORIES, STORES } from '../config.js';
import { state, bus } from '../state.js';
import { FARM } from '../farmLayout.js';
import { factoryBuilt, facBuilding, facLeft, factoryPanel, readyCount, ordersPanel, ordersReady, standPanel, standSold, costText, farmLevel, ensureOrders, ensureStand } from '../hayday.js';

const key = (x, y) => `${x},${y}`;

export function buildHayday(s) {
  const H = FARM.hayday;
  ensureOrders();
  ensureStand();
  s.haydayBubbles = [];

  // Công trình: ảnh đặt góc dưới-trái tại ô (x, yB); bấm vào bất kỳ ô nào của công trình
  const place = (tex, x, yB, onTap, rows = 2, frame) => {
    const img = s.building(tex, frame, x, yB, rows);
    const w = Math.ceil(img.width / TILE);
    for (let tx = x; tx < x + w; tx++) for (let ty = yB - rows + 1; ty <= yB; ty++) s.statics.set(key(tx, ty), onTap);
    return img;
  };
  const bubble = (img, check) => {
    const b = s.add.image(img.x + img.width / 2, img.y - img.height - 4, 'fp_goods', 0).setDepth(9000).setVisible(false);
    s.haydayBubbles.push({ b, check, y: b.y });
  };

  // Kho thóc & Nhà kho
  // (vẽ lại kiểu tận thế: bồn thóc tôn gỉ & container sắt — tools/make_survival.py)
  for (const [id, frame] of [['silo', 'grainbin'], ['barn', 'container']]) {
    const p = H[id];
    place('surv', p.x, p.yB, () => ({ label: `Mở ${STORES[id].name}`, run: () => bus.emit('openStorage', id) }), 2, frame);
  }

  // Nhà máy: Chú Tư dựng bằng đồ lục được (chưa xây / đang xây: cắm biển báo)
  for (const [id, f] of Object.entries(FACTORIES)) {
    const p = H.factories[id];
    if (factoryBuilt(id)) {
      const img = place('surv', p.x, p.yB, () => ({ label: `Mở ${f.name}`, run: () => bus.emit('panel', factoryPanel(id)) }), 2, f.frame);
      if (id === 'mill') {
        const fan = s.add.image(img.x + 19.5, img.y - img.height + 12, 'surv', 'f_mill_fan').setDepth(img.depth + 1);
        s.tweens.add({ targets: fan, angle: 360, duration: 6000, repeat: -1 });
      }
      bubble(img, () => {
        const q = state.factories[id].queue[0];
        return readyCount(id) ? { tex: ITEMS[q.out].tex, frame: ITEMS[q.out].frame } : null;
      });
    } else {
      const sx = p.x + Math.floor(s.textures.getFrame('surv', f.frame).width / TILE / 2);
      s.add.image(sx * TILE + 8, (p.yB + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((p.yB + 1) * TILE);
      s.addWall(sx * TILE + 3, p.yB * TILE + 8, 10, 8);
      s.statics.set(key(sx, p.yB), () =>
        facBuilding(id)
          ? { act: false, label: `Chú Tư đang dựng ${f.name} — xong sau ${facLeft(id)} phút` }
          : farmLevel() < f.level
            ? { act: false, label: `Đất xây ${f.name} — mở khoá ở uy tín cấp ${f.level}` }
            : { act: false, label: `Đất xây ${f.name} — mang ${costText(f.cost)} tới Xưởng mộc của Chú Tư trong trại để nhờ xây` }
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
  const stand = place('surv', st.x, st.yB, () => ({ label: 'Mở sạp bán ven đường', run: () => bus.emit('panel', standPanel) }), 2, 'f_stand');
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
