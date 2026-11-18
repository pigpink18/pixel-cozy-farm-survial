import Phaser from 'phaser';
import { noteGain } from './collection.js';
import { MAX_ENERGY, MAX_HP, WATER_CAP, DAY_START, SEASONS, ITEMS, TOOLS, TOOL_KEYS, NPCS, BAG_START, HOME_CHEST } from './config.js';

const SAVE_KEY = 'nong-trai-save-v2';
const OLD_KEY = 'nong-trai-save-v1';

// Kênh sự kiện dùng chung giữa các scene
export const bus = new Phaser.Events.EventEmitter();

// Trạng thái giao diện (không lưu)
export const ui = { modal: null, transition: false, joy: { x: 0, y: 0 }, hitTest: () => false };

// ?nointro trên địa chỉ trang: bỏ qua đoạn mở đầu (dùng khi thử nghiệm)
const SKIP_INTRO = typeof location !== 'undefined' && /[?&]nointro/.test(location.search);

function newState() {
  const tiles = {};
  for (let x = 6; x <= 11; x++) for (let y = 16; y <= 18; y++) tiles[`${x},${y}`] = { watered: false, crop: null }; // luống trong ruộng
  return {
    version: 2,
    year: 1,
    season: 0,
    day: 1,
    time: DAY_START,
    coins: 100,
    energy: MAX_ENERGY,
    hp: MAX_HP,
    water: WATER_CAP,
    toolLv: { hoe: 1, can: 1, axe: 1, pickaxe: 1, sword: 1, rod: 1 },
    hasSword: false,
    hasRod: false,
    forage: {},
    furniture: {},
    bagSize: BAG_START,
    // Kiểu Hay Day
    farmXp: 0,
    stores: { silo: { lv: 1, items: {} }, barn: { lv: 1, items: {} } },
    factories: {}, // id → { queue: [{ out, n, done }] }
    orders: [],
    stand: [],
    storage: { [HOME_CHEST]: {} }, // rương chứa đồ: 'map:x,y' → { itemId: số lượng }
    skills: { farming: 0, mining: 0, foraging: 0, fishing: 0, combat: 0 },
    festivalsDone: {},
    mail: [],
    forageDay: null,
    mineDeepest: 0,
    sel: 'tool:hoe',
    // Ván mới: đoạn mở đầu → tham quan làng → đêm đầu ở nhà dột → sáng hôm sau Ông Năm trao đồ nghề
    intro: SKIP_INTRO ? 'done' : 'start', // start | tour | night | done
    gotTools: SKIP_INTRO,
    roofFixed: SKIP_INTRO,
    questV: 2, // v2: thêm 3 nhiệm vụ mở đầu ở đầu chuỗi
    mainQuest: SKIP_INTRO ? 3 : 0,
    inv: { seed_carrot: 6, seed_strawberry: 2, seed_potato: 2 },
    tiles,
    objects: null, // tạo lần đầu bởi farmLayout
    farmSize: 2, // 2 = nông trại mở rộng 64×44
    buildings: { coop: null, barn: null }, // null | 'building' | 'built'
    animals: [],
    npcs: Object.fromEntries(Object.keys(NPCS).map((id) => [id, { pts: 0, talked: false, gifted: false, events: [] }])),
    quest: null,
    weather: 'sun',
    muted: false,
    nextId: 1,
  };
}

// Chuyển dữ liệu từ bản cũ (v1) sang
function migrateV1(old) {
  const s = newState();
  s.coins = old.coins ?? s.coins;
  s.tiles = old.tiles ?? s.tiles;
  s.day = Math.min(old.day ?? 1, 14);
  for (const [k, n] of Object.entries(old.seeds || {})) if (n) s.inv[`seed_${k}`] = (s.inv[`seed_${k}`] || 0) + n;
  for (const [k, n] of Object.entries(old.produce || {})) if (n) s.inv[k] = n;
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const base = newState();
      // Save cũ (trước khi có đoạn mở đầu): coi như đã xong, đủ đồ nghề, nhiệm vụ chính dời lên 3 bước
      if (s.questV === undefined) {
        s.questV = 2;
        const q = typeof s.mainQuest === 'number' ? s.mainQuest : typeof s.quest === 'number' ? s.quest : 0;
        s.mainQuest = q + 3;
        if (typeof s.quest === 'number') s.quest = null;
        s.intro = 'done';
        s.gotTools = true;
        s.roofFixed = true;
      }
      return {
        ...base,
        ...s,
        npcs: { ...base.npcs, ...s.npcs },
        buildings: { ...base.buildings, ...s.buildings },
        toolLv: { ...base.toolLv, ...s.toolLv },
        skills: { ...base.skills, ...s.skills },
        storage: { ...base.storage, ...s.storage },
        stores: { ...base.stores, ...s.stores },
      };
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) return migrateV1(JSON.parse(old));
  } catch (e) {
    console.warn('Không đọc được dữ liệu lưu', e);
  }
  return null;
}

// Đổi mã vật phẩm cũ (bộ Sprout Lands đã gỡ) sang vật phẩm hiện có
const RENAMED = {
  wheat: 'strawberry', beet: 'carrot', seed_wheat: 'seed_strawberry', seed_beet: 'seed_carrot',
  sf_plant: 'f_plant', sf_plant2: 'f_plant', sf_lamp: 'f_lamp', sf_lamp2: 'f_lamp', sf_chair: 'f_chair', sf_armchair: 'f_chair',
  sf_dresser: 'f_shelf', sf_clock: 'f_candles', sf_rug: 'f_rug', sf_rug2: 'f_rug', sf_pic: 'f_pic', sf_pic2: 'f_painting',
};
function migrateIds(s) {
  for (const [from, to] of Object.entries(RENAMED)) {
    if (s.inv[from]) (s.inv[to] = (s.inv[to] || 0) + s.inv[from]), delete s.inv[from];
    for (const k of Object.keys(s.furniture || {})) if (s.furniture[k] === from) s.furniture[k] = to;
    if (s.sel === `item:${from}`) s.sel = 'tool:hoe';
  }
  for (const t of Object.values(s.tiles || {})) if (t.crop && RENAMED[t.crop.type]) t.crop.type = RENAMED[t.crop.type];
  return s;
}

export const state = migrateIds(load() || newState());

export function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function changed() {
  save();
  bus.emit('changed');
}

export function toast(msg) {
  bus.emit('toast', msg);
}

export function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(OLD_KEY);
  window.location.reload();
}

// ---------- Tiện ích ----------
export const season = () => SEASONS[state.season];

// '@fish' = tổng mọi loại cá
const fishIds = () => Object.keys(ITEMS).filter((k) => ITEMS[k].fish);
export const count = (id) => (id === '@fish' ? fishIds().reduce((a, k) => a + (state.inv[k] || 0), 0) : state.inv[id] || 0);
export const has = (id, n = 1) => count(id) >= n;
export const itemName = (id) => (id === '@fish' ? 'Cá (loại nào cũng được)' : ITEMS[id].name);

// Túi đồ có giới hạn số ô (mỗi loại đồ 1 ô)
export const bagSlots = () => Object.keys(state.inv).filter((k) => state.inv[k] > 0).length;
export const bagHasRoom = (id) => (state.inv[id] || 0) > 0 || bagSlots() < (state.bagSize || BAG_START);
// Kiểm tra & báo khi túi đầy
export function roomFor(id) {
  if (bagHasRoom(id)) return true;
  toast('Túi đồ đầy! Cất bớt vào rương chứa đồ cạnh nhà.');
  bus.emit('sfx', 'cancel', 0.4);
  return false;
}

export function addItem(id, n = 1, silent = false) {
  if (id === '@fish') {
    // Lấy cá rẻ nhất trước
    let need = -n;
    for (const k of fishIds().sort((a, b) => ITEMS[a].sell - ITEMS[b].sell)) {
      const take = Math.min(need, state.inv[k] || 0);
      if (take) addItem(k, -take);
      need -= take;
    }
    return;
  }
  // Nội thất (quà NPC…) → vào kho nội thất, không chiếm túi đồ
  if (ITEMS[id]?.furn && state.home?.owned && n > 0) {
    state.home.owned[id] = (state.home.owned[id] || 0) + n;
    noteGain(id, n);
    if (!silent) bus.emit('gain', id, n);
    return;
  }
  state.inv[id] = (state.inv[id] || 0) + n;
  if (state.inv[id] <= 0) delete state.inv[id];
  if (n > 0) noteGain(id, n);
  if (n > 0 && !silent) bus.emit('gain', id, n);
}

// Đã bỏ thể lực: làm việc không giới hạn (giữ hàm để code cũ vẫn gọi được)
export function useEnergy() {
  return true;
}

export function clockText(t = state.time) {
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  const label = h < 12 ? 'sáng' : h < 18 ? 'chiều' : 'tối';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${label}`;
}

export function hearts(pts, max = 50) {
  const n = Math.round((pts / max) * 5);
  return '♥'.repeat(n) + '♡'.repeat(5 - n);
}

// Thanh công cụ: 4 dụng cụ + hạt giống + vật đặt được (có trong túi)
export function hotbarItems() {
  const list = TOOL_KEYS.filter((id) => !TOOLS[id].unlock || state[TOOLS[id].unlock]).map((id) => ({
    key: `tool:${id}`,
    tex: TOOLS[id].tex,
    frame: TOOLS[id].frame,
    name: TOOLS[id].name,
    tool: id,
    lv: state.toolLv[id] || 1,
  }));
  for (const [id, it] of Object.entries(ITEMS)) {
    if ((it.seed || it.place || it.home || (it.eat && !it.eat.raw) || it.weapon || it.heal || it.defense || it.bait || id === 'fert') && count(id) > 0) list.push({ key: `item:${id}`, tex: it.tex, frame: it.frame, name: it.name, item: id, n: count(id) });
  }
  // Tối đa 12 ô; món đang chọn luôn có mặt
  const out = list.slice(0, 12);
  const cur = list.find((i) => i.key === state.sel);
  if (cur && !out.includes(cur)) out[out.length - 1] = cur;
  return out;
}

export function selected() {
  const [kind, id] = state.sel.split(':');
  if ((kind === 'item' && !has(id)) || (kind === 'tool' && TOOLS[id]?.unlock && !state[TOOLS[id].unlock]) || kind === 'none') {
    // chọn món đầu tiên trên thanh công cụ (ván mới chưa có đồ nghề thì có thể chưa có gì)
    const first = hotbarItems()[0];
    state.sel = first?.key || 'none';
    if (!first) return { kind: 'none', id: null };
    const [k2, id2] = state.sel.split(':');
    return { kind: k2, id: id2 };
  }
  return { kind, id };
}

export function sfx(name, volume = 0.5, pitch = 1) {
  bus.emit('sfx', name, volume, pitch);
}

export const toolLv = (id) => state.toolLv[id] || 1;
export const waterCap = () => WATER_CAP * toolLv('can');

// Kinh nghiệm kỹ năng (được mở rộng ở hệ thống kỹ năng)
export function xp(skill, n = 1) {
  bus.emit('xp', skill, n);
}

// Máy cảm ứng: điện thoại, iPad (iPadOS tự nhận là Mac), máy bật "trang web cho máy tính"
export function isTouchDevice(game) {
  if (!game.device.os.desktop) return true;
  return navigator.maxTouchPoints > 0 && !!window.matchMedia?.('(pointer: coarse)').matches;
}
