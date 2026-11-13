// ============================================================
//  Cây lớn theo thời gian kiểu Hay Day
//  Mỗi cây lưu: grown (số phút đã lớn), last (mốc thời gian lần tính trước).
//  Cây vẫn lớn khi người chơi ở bản đồ khác hoặc đang ngủ.
// ============================================================
import { CROPS, RIPE_STAGE, REGROW_STAGE, WATER_BOOST } from './config.js';
import { state } from './state.js';
import { absMin } from './hayday.js';

export const newCrop = (type) => ({ type, stage: 0, grown: 0, last: absMin() });

// Save cũ (lớn theo ngày) → đổi sang phút
function migrate(c) {
  if (c.last != null) return;
  c.grown = Math.min(1, (c.stage || 0) / RIPE_STAGE) * CROPS[c.type].grow;
  c.last = absMin();
  delete c.growth;
}

const stageOf = (c) => {
  const st = Math.min(RIPE_STAGE, Math.floor((c.grown / CROPS[c.type].grow) * RIPE_STAGE));
  return c.regrown ? Math.max(REGROW_STAGE, st) : st;
};

// Cập nhật toàn bộ cây; trả về danh sách ô có cây đổi giai đoạn
export function growCrops() {
  const now = absMin();
  const changedKeys = [];
  for (const [k, t] of Object.entries(state.tiles)) {
    const c = t.crop;
    if (!c || !CROPS[c.type]) continue;
    migrate(c);
    const dt = Math.max(0, now - c.last);
    c.last = now;
    if (c.dead || c.stage >= RIPE_STAGE) continue;
    c.grown = Math.min(CROPS[c.type].grow, c.grown + dt * (t.watered ? WATER_BOOST : 1));
    const st = stageOf(c);
    if (st !== c.stage) {
      c.stage = st;
      changedKeys.push(k);
    }
  }
  return changedKeys;
}

// Sau khi thu hoạch cây ra trái nhiều lần
export function regrowCrop(c) {
  const cfg = CROPS[c.type];
  c.grown = Math.max(0, cfg.grow - cfg.regrow);
  c.last = absMin();
  c.regrown = true;
  c.stage = stageOf(c);
}

// Số phút còn lại đến khi chín (theo tốc độ hiện tại)
export function minutesLeft(c, watered) {
  return Math.ceil((CROPS[c.type].grow - c.grown) / (watered ? WATER_BOOST : 1));
}

export const timeText = (m) => (m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`);
