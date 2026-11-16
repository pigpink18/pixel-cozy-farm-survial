// ============================================================
//  Luôn nằm ngang: khi điện thoại đang dọc (hoặc bật khoá xoay màn hình),
//  xoay cả khung game 90° bằng CSS và đổi toạ độ chạm cho khớp —
//  người chơi chỉ cần nghiêng máy sang trái là chơi, không cần bật xoay màn hình.
// ============================================================
const el = () => document.getElementById('game');
const touch = () => navigator.maxTouchPoints > 0 && !!window.matchMedia?.('(pointer: coarse)').matches;
export const isRotated = () => el()?.classList.contains('rot');

function layout() {
  const g = el();
  const W = window.innerWidth, H = window.innerHeight;
  const rot = touch() && H > W;
  g.classList.toggle('rot', rot);
  if (rot) Object.assign(g.style, { width: `${H}px`, height: `${W}px`, left: `${W}px` });
  else Object.assign(g.style, { width: '', height: '', left: '' });
  return rot;
}

// Gọi trước khi tạo game (để Phaser đo đúng khung ngay từ đầu)
export function prepareRotate() {
  layout();
}

export function setupRotate(game) {
  const sm = game.scale;
  // Kích thước khung chứa: dùng kích thước chưa xoay
  const origParent = sm.getParentBounds.bind(sm);
  sm.getParentBounds = function () {
    if (!isRotated()) return origParent();
    const g = el();
    const w = g.offsetWidth, h = g.offsetHeight;
    if (this.parentSize.width !== w || this.parentSize.height !== h) {
      this.parentSize.setSize(w, h);
      return true;
    }
    return false;
  };
  // Căn giữa theo kích thước canvas chưa xoay
  const origCenter = sm.updateCenter.bind(sm);
  sm.updateCenter = function () {
    if (!isRotated()) return origCenter();
    const st = this.canvas.style;
    st.marginLeft = `${Math.floor((this.parentSize.width - this.displaySize.width) / 2)}px`;
    st.marginTop = `${Math.floor((this.parentSize.height - this.displaySize.height) / 2)}px`;
  };
  // Vị trí canvas trong khung chưa xoay
  const origBounds = sm.updateBounds.bind(sm);
  sm.updateBounds = function () {
    if (!isRotated()) return origBounds();
    const c = this.canvas;
    this.canvasBounds.setTo(c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight);
  };
  // Điểm chạm trên màn hình → toạ độ trong khung đã xoay 90° chiều kim đồng hồ
  const im = game.input;
  const origPtr = im.transformPointer.bind(im);
  im.transformPointer = (pointer, pageX, pageY, wasMove) =>
    isRotated() ? origPtr(pointer, pageY, window.innerWidth - pageX, wasMove) : origPtr(pointer, pageX, pageY, wasMove);

  const relayout = () => {
    layout();
    sm.getParentBounds();
    sm.refresh();
  };
  window.addEventListener('resize', () => setTimeout(relayout, 60));
  window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
  relayout();
}
