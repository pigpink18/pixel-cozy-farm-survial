// ============================================================
//  Luôn nằm ngang: khi điện thoại đang dọc (hoặc bật khoá xoay màn hình),
//  xoay cả khung game 90° bằng CSS và đổi toạ độ chạm cho khớp —
//  người chơi chỉ cần nghiêng máy sang trái là chơi, không cần bật xoay màn hình.
//
//  Kích thước: phủ kín màn hình (dùng chiều cao lớn nhất 100lvh — innerHeight trên iPhone hay bị
//  trừ thanh trạng thái/thanh Safari → hở một khúc), nhưng CHỪA vùng an toàn của Dynamic Island / tai thỏ
//  (env(safe-area-inset-*)). Màn dọc: đảo thì Dynamic Island ở mép trên → chừa phía trên.
// ============================================================
const el = () => document.getElementById('game');
const touch = () => navigator.maxTouchPoints > 0 && !!window.matchMedia?.('(pointer: coarse)').matches;
const standalone = () => navigator.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;
export const isRotated = () => el()?.classList.contains('rot');

// Đo vùng an toàn + chiều cao màn hình lớn nhất bằng một phần tử thăm dò
let probe = null;
function measure() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:100vw;height:100vh;height:100lvh;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box;';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  const px = (v) => parseFloat(v) || 0;
  // App ngoài màn hình chính (iPhone): innerHeight bị trừ sẵn thanh trạng thái dù trang vẫn vẽ được ở đó
  // → lấy thẳng kích thước màn hình thật (screen luôn báo theo chiều dọc: đảo lại khi đang nằm ngang).
  const portrait = window.innerHeight >= window.innerWidth;
  const sLong = Math.max(screen.width, screen.height), sShort = Math.min(screen.width, screen.height);
  const scrW = standalone() ? (portrait ? sShort : sLong) : 0;
  const scrH = standalone() ? (portrait ? sLong : sShort) : 0;
  return {
    W: Math.max(window.innerWidth, document.documentElement.clientWidth, scrW),
    // Phủ kín tới mép dưới màn hình (100lvh). Thanh Safari trên iOS mới là lớp trong suốt đè lên trang,
    // chừa phần đó ra thì lộ một khúc trống → phủ luôn.
    H: Math.max(window.innerHeight, probe.offsetHeight, scrH),
    top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft),
  };
}

function layout() {
  const g = el();
  const m = measure();
  const rot = touch() && m.H > m.W;
  g.classList.toggle('rot', rot);
  if (rot) {
    // khung xoay 90°: chiều dài = chiều cao màn hình trừ vùng Dynamic Island phía trên; phủ tới tận mép dưới
    Object.assign(g.style, { width: `${m.H - m.top}px`, height: `${m.W}px`, left: `${m.W}px`, top: `${m.top}px` });
  } else if (touch()) {
    // điện thoại nằm ngang thật: Dynamic Island ở mép trái/phải → chừa hai bên
    Object.assign(g.style, { position: 'fixed', left: `${m.left}px`, top: '0px', width: `${m.W - m.left - m.right}px`, height: `${m.H}px` });
  } else Object.assign(g.style, { width: '', height: '', left: '', top: '', position: '' });
  return rot;
}

// Bề ngang game theo tỉ lệ khung (cao cố định 540); ?fixed giữ 960 khi chạy thử tự động
export function pickWidth(aspect) {
  if (/[?&]fixed/.test(location.search)) return 960;
  return Math.round(Math.min(1200, Math.max(960, 540 * aspect)));
}

// Kích thước khung game (chưa xoay): dài x ngắn — main.js dùng để chọn bề ngang game cho vừa
export function gameBox() {
  const g = el();
  const a = isRotated() ? g.offsetWidth : g.offsetWidth, b = g.offsetHeight;
  return { w: Math.max(a, b), h: Math.min(a, b) };
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
  // Điểm chạm trên màn hình → toạ độ trong khung đã xoay 90° chiều kim đồng hồ (khung bắt đầu ở top = vùng an toàn)
  const im = game.input;
  const origPtr = im.transformPointer.bind(im);
  im.transformPointer = (pointer, pageX, pageY, wasMove) => {
    if (!isRotated()) return origPtr(pointer, pageX, pageY, wasMove);
    const top = el().offsetTop;
    return origPtr(pointer, pageY - top, window.innerWidth - pageX, wasMove);
  };

  const relayout = () => {
    layout();
    sm.getParentBounds();
    sm.refresh();
    // Xoay máy / đổi kích thước làm tỉ lệ khung khác hẳn → đổi bề ngang game cho phủ kín lại
    const box = gameBox();
    const want = pickWidth(box.w / Math.max(1, box.h));
    if (Math.abs(want - sm.gameSize.width) > 8) {
      sm.setGameSize(want, 540);
      game.events.emit('gameResized', want);
    }
  };
  window.addEventListener('resize', () => setTimeout(relayout, 60));
  window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
  window.visualViewport?.addEventListener('resize', () => setTimeout(relayout, 60));
  relayout();
  if (/[?&]debug/.test(location.search) || localStorage.getItem('ashenDebug')) debugBox(game);
}

// ?debug: in số đo màn hình thật lên góc màn hình (để dò lỗi hở viền trên iPhone)
function debugBox(game) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99;background:rgba(0,0,0,.75);color:#7f7;font:11px monospace;padding:4px 6px;white-space:pre;pointer-events:none;';
  document.body.appendChild(d);
  const r = (e) => { const b = e?.getBoundingClientRect(); return b ? `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}` : '-'; };
  const tick = () => {
    const m = measure();
    const vv = window.visualViewport;
    d.textContent = [
      `inner ${window.innerWidth}x${window.innerHeight}  screen ${screen.width}x${screen.height}`,
      `client ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}  vv ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} off ${Math.round(vv.offsetTop)}` : '-'}`,
      `lvh ${probe?.offsetHeight}  safe t${m.top} r${m.right} b${m.bottom} l${m.left}`,
      `standalone ${standalone()}  rot ${isRotated()}`,
      `#game ${r(el())}  canvas ${r(document.querySelector('canvas'))}`,
      `game ${game.scale.gameSize.width}x${game.scale.gameSize.height}`,
    ].join('\n');
  };
  setInterval(tick, 500);
  tick();
}
