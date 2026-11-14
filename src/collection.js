// ============================================================
//  Bộ sưu tập (món đã từng có) & Thành tựu (mốc chơi, có thưởng xu)
// ============================================================
import { ITEMS, CROPS, FORAGE } from './config.js';
import { state, bus, toast, sfx } from './state.js';
import { farmLevel } from './hayday.js';

const FORAGE_IDS = [...new Set(Object.values(FORAGE).flat())];

export const BOOK = [
  { id: 'crops', name: 'Nông sản', reward: 600, items: () => Object.keys(CROPS).filter((id) => ITEMS[id]) },
  { id: 'forage', name: 'Hái lượm', reward: 300, items: () => FORAGE_IDS.filter((id) => ITEMS[id]) },
  { id: 'fish', name: 'Cá', reward: 1000, items: () => Object.keys(ITEMS).filter((id) => ITEMS[id].fish) },
  { id: 'minerals', name: 'Khoáng sản', reward: 1200, items: () => Object.keys(ITEMS).filter((id) => /^(ore_|gem_|geode|crystal)/.test(id)) },
  { id: 'dishes', name: 'Món ăn', reward: 1500, items: () => Object.keys(ITEMS).filter((id) => id.startsWith('dish_')) },
  { id: 'goods', name: 'Đồ chế biến', reward: 1000, items: () => Object.keys(ITEMS).filter((id) => ITEMS[id].good) },
];

const st = () => (state.stats = state.stats || { crops: 0, fish: 0, earned: 0 });
const seenCount = () => Object.keys(state.seen || {}).filter((id) => ITEMS[id]).length;
const maxHeartsCount = (h) => Object.values(state.npcs || {}).filter((n) => (n.pts || 0) >= h * 10).length;

export const ACHIEVEMENTS = [
  { id: 'crops50', name: 'Nông dân tập sự', desc: 'Thu hoạch 50 nông sản', goal: 50, val: () => st().crops, reward: 200 },
  { id: 'crops500', name: 'Mùa bội thu', desc: 'Thu hoạch 500 nông sản', goal: 500, val: () => st().crops, reward: 1500 },
  { id: 'fish10', name: 'Cần thủ', desc: 'Câu được 10 con cá', goal: 10, val: () => st().fish, reward: 300 },
  { id: 'fish100', name: 'Ngư ông', desc: 'Câu được 100 con cá', goal: 100, val: () => st().fish, reward: 2000 },
  { id: 'mine10', name: 'Thợ mỏ', desc: 'Xuống tới tầng 10 hầm mỏ', goal: 10, val: () => state.mineDeepest || 0, reward: 500 },
  { id: 'mine30', name: 'Đáy hầm mỏ', desc: 'Xuống tới tầng 30 hầm mỏ', goal: 30, val: () => state.mineDeepest || 0, reward: 2000 },
  { id: 'friend1', name: 'Bạn của làng', desc: 'Thân 4♥ với 1 người', goal: 1, val: () => maxHeartsCount(4), reward: 500 },
  { id: 'friend5', name: 'Được cả làng thương', desc: 'Thân 4♥ với 5 người', goal: 5, val: () => maxHeartsCount(4), reward: 3000 },
  { id: 'rich', name: 'Đại gia', desc: 'Kiếm tổng cộng 10.000 xu', goal: 10000, val: () => st().earned, reward: 1000 },
  { id: 'collect40', name: 'Nhà sưu tầm', desc: 'Sở hữu 40 món khác nhau', goal: 40, val: seenCount, reward: 1000 },
  { id: 'animals6', name: 'Trang trại đông vui', desc: 'Nuôi 6 con vật', goal: 6, val: () => state.animals?.length || 0, reward: 800 },
  { id: 'level8', name: 'Uy tín cả vùng', desc: 'Đạt uy tín cấp 8', goal: 8, val: () => farmLevel(), reward: 2500 },
];

// Gọi trong addItem (n > 0)
export function noteGain(id, n) {
  state.seen = state.seen || {};
  if (!state.seen[id]) state.seen[id] = 1;
  if (CROPS[id]) st().crops += n;
  if (ITEMS[id]?.fish) st().fish += n;
}

export const bookDone = (b) => b.items().every((id) => state.seen?.[id]);
export const achDone = (a) => a.val() >= a.goal;

// Theo dõi xu kiếm được & báo thành tựu mới (gọi khi state thay đổi)
let lastCoins = null;
export function trackProgress() {
  if (lastCoins != null && state.coins > lastCoins) st().earned += state.coins - lastCoins;
  lastCoins = state.coins;
  state.achvSeen = state.achvSeen || {};
  for (const a of ACHIEVEMENTS)
    if (!state.achvSeen[a.id] && achDone(a)) {
      state.achvSeen[a.id] = 1;
      sfx('success', 0.5);
      toast(`Thành tựu mới: ${a.name}! Mở Menu › Sưu tập để nhận ${a.reward} xu`);
    }
  for (const b of BOOK)
    if (!state.achvSeen[`book_${b.id}`] && bookDone(b)) {
      state.achvSeen[`book_${b.id}`] = 1;
      toast(`Hoàn thành bộ sưu tập ${b.name}! Nhận thưởng trong Menu › Sưu tập`);
    }
}

export function claim(key, coins) {
  state.claimed = state.claimed || {};
  if (state.claimed[key]) return;
  state.claimed[key] = 1;
  state.coins += coins;
  lastCoins = state.coins; // thưởng không tính vào "xu kiếm được"
  sfx('coin');
  toast(`Nhận ${coins} xu!`);
  bus.emit('changed');
}

export const claimable = () =>
  ACHIEVEMENTS.filter((a) => achDone(a) && !state.claimed?.[a.id]).length + BOOK.filter((b) => bookDone(b) && !state.claimed?.[`book_${b.id}`]).length;

// Save cũ: coi đồ đang có trong túi là đã sưu tầm
export function ensureSeen() {
  state.seen = state.seen || {};
  for (const id of Object.keys(state.inv || {})) if (ITEMS[id]) state.seen[id] = 1;
}
