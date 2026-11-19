// ============================================================
//  Tận thế: vũ khí, zombie, lục đồ, cái đói, nâng cấp căn cứ, đổi hàng
// ============================================================
import { ITEMS } from './config.js';
import { state, toast, changed, sfx, addItem, count, has, waterCap } from './state.js';
import { have, canAfford, payCost } from './hayday.js';

// ---------- Vũ khí ----------
// melee: đánh trong tầm range (px) quanh hướng mục tiêu. gun: bắn tự ngắm zombie gần nhất trong tầm.
// rate: ms giữa 2 lần đánh. pellets: số viên (súng săn bắn chùm)
export const WEAPONS = {
  sword: { name: 'Kiếm', melee: true, dmg: 10, range: 22, rate: 380 },
  w_bat: { name: 'Gậy đóng đinh', melee: true, dmg: 9, range: 22, rate: 420 },
  w_machete: { name: 'Dao rựa', melee: true, dmg: 16, range: 24, rate: 360 },
  w_pistol: { name: 'Súng lục', gun: true, dmg: 14, range: 120, rate: 420, ammo: 'ammo_pistol' },
  w_shotgun: { name: 'Súng săn', gun: true, dmg: 10, range: 80, rate: 850, ammo: 'ammo_shell', pellets: 5, cone: 0.45 },
  w_rifle: { name: 'Súng trường', gun: true, dmg: 26, range: 170, rate: 300, ammo: 'ammo_rifle' },
  // Ném: nổ lửa trúng mọi zombie trong bán kính, cháy thêm vài giây. Mỗi lần ném tốn 1 chai
  w_molotov: { name: 'Bom xăng', throw: true, dmg: 28, range: 130, rate: 700, radius: 30 },
};

// ---------- Zombie ----------
// sight: khoảng cách phát hiện (px); ban đêm nhìn xa hơn 40%
export const ZOMBIES = {
  walker: { name: 'Zombie', hp: 24, dmg: 8, speed: 20, sight: 110, xu: [3, 8] },
  runner: { name: 'Zombie chạy', hp: 16, dmg: 6, speed: 44, sight: 130, xu: [3, 8] },
  brute: { name: 'Zombie khổng lồ', hp: 90, dmg: 18, speed: 15, sight: 100, xu: [15, 30] }, // hình đã to sẵn (PostApocalypse)
  soldier: { name: 'Zombie lính', hp: 50, dmg: 13, speed: 26, sight: 140, xu: [8, 16] },
};
// Đồ rơi khi hạ zombie: [id, tỉ lệ, số lượng tối đa]
export const ZOMBIE_DROPS = {
  walker: [['rotflesh', 0.35, 1], ['cloth', 0.25, 2], ['scrap', 0.2, 2], ['canned', 0.08, 1], ['ammo_pistol', 0.1, 3]],
  runner: [['rotflesh', 0.3, 1], ['cloth', 0.3, 2], ['bandage', 0.1, 1], ['ammo_pistol', 0.12, 3]],
  brute: [['rotflesh', 0.9, 3], ['scrap', 0.8, 5], ['parts', 0.4, 2], ['fuel', 0.3, 1], ['ammo_shell', 0.4, 4]],
  soldier: [['rotflesh', 0.3, 1], ['ammo_rifle', 0.5, 5], ['ammo_pistol', 0.5, 6], ['gunpowder', 0.3, 2], ['milchip', 0.06, 1], ['medkit', 0.15, 1]],
};

// ---------- Lục đồ ----------
// Mỗi loại thùng: [id, trọng số, min, max]. Lục xong phải đợi `respawn` ngày mới có đồ lại.
export const CONTAINERS = {
  trashcan: { name: 'Thùng rác', frame: 'trashcan', time: 900, respawn: 2, rolls: 2, loot: [['scrap', 5, 1, 2], ['cloth', 5, 1, 3], ['canned', 2, 1, 1], ['bandage', 1, 1, 1], ['water', 2, 1, 1]] },
  car: { name: 'Xe hơi bỏ hoang', time: 1400, respawn: 3, rolls: 3, loot: [['scrap', 6, 2, 4], ['fuel', 3, 1, 1], ['parts', 3, 1, 2], ['battery', 2, 1, 1], ['ammo_pistol', 2, 3, 6], ['water', 2, 1, 2]] },
  cabinet: { name: 'Tủ đồ', frame: 'cabinet', time: 1100, respawn: 3, rolls: 2, loot: [['cloth', 4, 1, 3], ['bandage', 3, 1, 2], ['medkit', 1, 1, 1], ['canned', 3, 1, 2], ['water', 3, 1, 2], ['parts', 1, 1, 1], ['seed_corn', 1, 2, 4], ['seed_cabbage', 1, 2, 4]] },
  barrel: { name: 'Thùng phuy', frame: 'barrel', time: 900, respawn: 3, rolls: 2, loot: [['fuel', 3, 1, 1], ['scrap', 4, 1, 3], ['gunpowder', 2, 1, 2]] },
  // Ngoài rừng
  backpack: { name: 'Ba lô bỏ lại', frame: 'backpack', time: 800, respawn: 2, rolls: 2, loot: [['cloth', 4, 1, 2], ['water', 4, 1, 2], ['canned', 3, 1, 1], ['bandage', 2, 1, 1], ['ammo_pistol', 2, 2, 5], ['seed_corn', 1, 2, 3], ['herb', 2, 1, 2]] },
  tent: { name: 'Lều cắm trại bỏ hoang', frame: 'tent_green', time: 1300, respawn: 3, rolls: 3, loot: [['cloth', 4, 1, 3], ['canned', 3, 1, 2], ['water', 3, 1, 2], ['bandage', 2, 1, 2], ['fuel', 1, 1, 1], ['battery', 1, 1, 1]] },
  huntbox: { name: 'Hòm đồ thợ săn', frame: 'huntbox', time: 1200, respawn: 3, rolls: 2, loot: [['ammo_shell', 4, 3, 6], ['gunpowder', 3, 1, 2], ['scrap', 2, 1, 3], ['herb', 2, 1, 2], ['w_machete', 0.2, 1, 1]] },
  // Trong nhà ở thị trấn
  fridge: { name: 'Tủ lạnh', frame: 'fridge', time: 900, respawn: 3, rolls: 2, loot: [['canned', 5, 1, 2], ['water', 5, 1, 3], ['egg', 1, 1, 2], ['milk', 1, 1, 1]] },
  wardrobe: { name: 'Tủ quần áo', frame: 'wardrobe', time: 1000, respawn: 3, rolls: 2, loot: [['cloth', 6, 2, 4], ['bandage', 1, 1, 1], ['battery', 1, 1, 1], ['ammo_pistol', 1, 3, 6]] },
  kitchen: { name: 'Tủ bếp', frame: 'kitchen', time: 1000, respawn: 3, rolls: 2, loot: [['canned', 4, 1, 2], ['water', 2, 1, 2], ['fuel', 1, 1, 1], ['scrap', 2, 1, 2], ['seed_cabbage', 1, 2, 3]] },
  medcab: { name: 'Tủ thuốc', frame: 'medcab', time: 900, respawn: 4, rolls: 2, loot: [['bandage', 5, 1, 3], ['medkit', 2, 1, 1], ['herb', 2, 1, 2]] },
  desk: { name: 'Bàn làm việc', frame: 'desk', time: 1000, respawn: 3, rolls: 2, loot: [['battery', 3, 1, 2], ['parts', 3, 1, 2], ['scrap', 2, 1, 3], ['ammo_pistol', 1, 2, 5]] },
  shelf: { name: 'Kệ hàng', frame: 'shelf', time: 1300, respawn: 3, rolls: 3, loot: [['canned', 6, 1, 3], ['water', 5, 1, 3], ['battery', 2, 1, 1], ['bandage', 2, 1, 2], ['seed_corn', 1, 2, 4], ['seed_eggplant', 1, 2, 4]] },
  // Hầm quân sự
  locker: { name: 'Tủ sắt quân đội', frame: 'locker', time: 1300, respawn: 3, rolls: 2, loot: [['ammo_pistol', 4, 4, 8], ['ammo_rifle', 2, 3, 6], ['medkit', 2, 1, 1], ['bandage', 3, 1, 2], ['cloth', 2, 2, 3], ['gunpowder', 2, 1, 2]] },
  milcrate: { name: 'Hòm quân dụng', frame: 'milcrate', time: 1600, respawn: 4, rolls: 3, loot: [['ammo_pistol', 4, 6, 12], ['ammo_shell', 3, 4, 8], ['ammo_rifle', 2, 4, 10], ['gunpowder', 3, 2, 4], ['medkit', 2, 1, 1], ['milchip', 1, 1, 1], ['w_shotgun', 0.3, 1, 1], ['w_rifle', 0.15, 1, 1]] },
};

export function rollLoot(type) {
  const C = CONTAINERS[type];
  const out = {};
  const total = C.loot.reduce((a, l) => a + l[1], 0);
  for (let i = 0; i < C.rolls; i++) {
    if (Math.random() < 0.15) continue; // đôi khi trống
    let r = Math.random() * total;
    const l = C.loot.find((x) => (r -= x[1]) <= 0) || C.loot[0];
    const n = l[2] + Math.floor(Math.random() * (l[3] - l[2] + 1));
    out[l[0]] = (out[l[0]] || 0) + n;
  }
  return out;
}

export const dayNum = () => state.year * 1000 + state.season * 100 + state.day;
export const lootKey = (map, x, y) => `${map}:${x},${y}`;
export function lootReady(k, type) {
  const d = state.looted?.[k];
  return d == null || dayNum() - d >= CONTAINERS[type].respawn;
}

// ---------- Cái đói ----------
export const FOOD_MAX = 100;
// Gọi mỗi 10 phút game: đói dần; đói lả thì mất máu
export function hungerTick() {
  state.food = Math.max(0, (state.food ?? FOOD_MAX) - 0.9);
  if (state.food <= 0) {
    state.hp = Math.max(1, state.hp - 2);
    if (!state.starveWarn || state.time - state.starveWarn > 120) {
      state.starveWarn = state.time;
      toast('Đói lả, đang mất máu! Ăn gì đó ngay!');
    }
  } else if (state.food < 20 && !state.hungryWarn) {
    state.hungryWarn = true;
    toast('Bụng đói cồn cào... nên ăn gì đó.');
  }
  if (state.food >= 20) state.hungryWarn = false;
}

// ---------- Căn cứ (nông trại): công trình nâng cấp ----------
// cost[i] = chi phí lên cấp i+1. Hiệu ứng xem desc.
export const BASE = {
  bench: {
    name: 'Bàn chế tạo', desc: ['Chế được băng gạc, đạn, gậy đóng đinh', 'Chế dao rựa, bộ sơ cứu, súng lục', 'Chế súng săn, súng trường'],
    cost: [{ wood: 20, scrap: 5 }, { wood: 30, scrap: 20, parts: 3 }, { scrap: 40, parts: 6, milchip: 1 }],
  },
  fence: {
    name: 'Hàng rào phòng thủ', desc: ['Chắn 3 cổng nông trại (120 máu/cổng): zombie phải phá cổng mới vào được', 'Rào thép gai: cổng 240 máu, zombie đập vào bị gai đâm', 'Tháp canh ở mỗi cổng tự bắn zombie + giáp tự chế: +30 máu tối đa'],
    cost: [{ wood: 40, scrap: 10 }, { scrap: 35, cloth: 10, parts: 2 }, { scrap: 60, stone: 80, milchip: 2 }],
  },
  medic: {
    name: 'Trạm y tế', desc: ['Ngủ dậy hồi đầy máu', 'Ở nông trại hồi 1 máu mỗi 10 phút', 'Mỗi sáng nhận 1 bộ sơ cứu'],
    cost: [{ cloth: 10, bandage: 3, wood: 10 }, { cloth: 20, parts: 2, scrap: 10 }, { parts: 5, battery: 2, milchip: 1 }],
  },
  water: {
    name: 'Máy lọc nước', desc: ['Mỗi sáng có 2 chai nước sạch', 'Mỗi sáng 4 chai, bình tưới đầy sẵn', 'Tự tưới toàn bộ ruộng mỗi sáng'],
    cost: [{ scrap: 15, cloth: 5 }, { scrap: 25, parts: 3, fuel: 2 }, { scrap: 40, parts: 6, battery: 3 }],
  },
  generator: {
    name: 'Máy phát điện', desc: ['Đèn pha sáng quanh nông trại ban đêm', 'Tủ lạnh: mỗi sáng 2 đồ hộp', 'Radio liên lạc khu quân sự (mở ở bản sau)'],
    cost: [{ scrap: 20, fuel: 3, parts: 2 }, { scrap: 30, battery: 3, parts: 4 }, { parts: 8, battery: 4, milchip: 3 }],
  },
};
export const baseLv = (id) => state.base?.[id] || 0;

// Đếm cả đồ trong túi lẫn đồ đã cất ở Nhà kho / Kho thóc
export function costText(cost) {
  return Object.entries(cost)
    .map(([id, n]) => {
      const h = have(id);
      return `${n} ${ITEMS[id]?.name || id} ${h >= n ? '✓' : `(có ${h})`}`;
    })
    .join(' · ');
}
export const canPay = (cost) => canAfford(cost);
export function pay(cost) {
  payCost(cost);
}

// Công thức ở bàn chế tạo: lv = cấp bàn chế tạo cần
// Món chế ra dùng để làm gì (hiện trong bảng chế tạo)
export const CRAFT_INFO = {
  bandage: 'Băng bó vết thương: +25 máu',
  ammo_pistol: 'Đạn cho súng lục',
  w_bat: 'Vũ khí cận chiến: sát thương 9',
  canned: 'Đồ ăn để lâu: +40 no, +5 máu',
  w_machete: 'Vũ khí cận chiến: sát thương 16, đánh nhanh',
  medkit: 'Bộ sơ cứu: +70 máu',
  w_pistol: 'Súng tự ngắm: sát thương 14, tầm xa',
  ammo_shell: 'Đạn cho súng săn',
  w_shotgun: 'Bắn chùm 5 viên, trúng nhiều zombie',
  ammo_rifle: 'Đạn cho súng trường',
  w_rifle: 'Súng tầm rất xa: sát thương 26',
  trap_spike: 'Đặt ở lối zombie đi: đâm 20, dùng 3 lần',
  torch: 'Cắm quanh trại: soi sáng, zombie lại gần bị chậm. Cháy hết sau 1 đêm',
  fert: 'Bón vào cây đang lớn: lớn nhanh thêm 1/3',
  bait_poison: 'Mồi nhử tẩm độc: zombie ăn vào mất máu',
  w_molotov: 'Ném vào đám zombie: nổ lửa 28 + cháy',
};
export const CRAFTS = [
  { id: 'bandage', n: 2, lv: 1, cost: { cloth: 3 } },
  { id: 'ammo_pistol', n: 8, lv: 1, cost: { scrap: 2, gunpowder: 1 } },
  { id: 'w_bat', n: 1, lv: 1, cost: { wood: 5, scrap: 3 } },
  { id: 'canned', n: 2, lv: 1, cost: { scrap: 1, potato: 2 } },
  { id: 'trap_spike', n: 2, lv: 1, cost: { wood: 4, scrap: 2 } },
  { id: 'torch', n: 2, lv: 1, cost: { wood: 1, cloth: 1 } },
  { id: 'torch', n: 3, lv: 1, cost: { corn: 2, cloth: 1 } },
  { id: 'fert', n: 3, lv: 1, cost: { rotflesh: 2 } },
  { id: 'bait_poison', n: 2, lv: 1, cost: { rotflesh: 1, mush_red: 1 } },
  { id: 'w_molotov', n: 2, lv: 2, cost: { fuel: 1, cloth: 1 } },
  { id: 'w_machete', n: 1, lv: 2, cost: { scrap: 12, wood: 3, cloth: 2 } },
  { id: 'medkit', n: 1, lv: 2, cost: { bandage: 2, herb: 2, cloth: 2 } },
  { id: 'w_pistol', n: 1, lv: 2, cost: { scrap: 25, parts: 4, gunpowder: 2 } },
  { id: 'ammo_shell', n: 6, lv: 2, cost: { scrap: 3, gunpowder: 2 } },
  { id: 'w_shotgun', n: 1, lv: 3, cost: { scrap: 40, parts: 6, wood: 10, milchip: 1 } },
  { id: 'ammo_rifle', n: 8, lv: 3, cost: { scrap: 4, gunpowder: 3 } },
  { id: 'w_rifle', n: 1, lv: 3, cost: { scrap: 60, parts: 10, milchip: 2 } },
];

// Mỗi sáng: hiệu ứng công trình
export function baseMorning() {
  const gifts = [];
  const w = baseLv('water');
  if (w >= 1) {
    addItem('water', w >= 2 ? 4 : 2, true);
    gifts.push(`${w >= 2 ? 4 : 2} chai nước`);
  }
  if (w >= 2) state.water = waterCap(); // bình tưới đầy sẵn
  if (w >= 3) for (const t of Object.values(state.tiles)) t.watered = true;
  if (baseLv('generator') >= 2) {
    addItem('canned', 2, true);
    gifts.push('2 đồ hộp');
  }
  if (baseLv('medic') >= 3) {
    addItem('medkit', 1, true);
    gifts.push('1 bộ sơ cứu');
  }
  if (gifts.length) state.mail = [...(state.mail || []), { from: 'tu', text: `Căn cứ báo cáo sáng nay: ${gifts.join(', ')} đã vào túi.` }];
}

// ---------- Trạm đổi hàng (Anh Jack gác cổng) ----------
// Đổi theo ngày: 5 mối hàng ngẫu nhiên từ danh sách
const TRADES = [
  { give: { canned: 3 }, get: { ammo_pistol: 10 } },
  { give: { carrot: 10 }, get: { cloth: 6 } },
  { give: { potato: 6 }, get: { scrap: 8 } },
  { give: { corn: 6 }, get: { gunpowder: 2 } },
  { give: { cabbage: 4 }, get: { bandage: 3 } },
  { give: { egg: 6 }, get: { battery: 1 } },
  { give: { milk: 3 }, get: { parts: 1 } },
  { give: { fish_ro: 3 }, get: { ammo_shell: 6 } },
  { give: { tomato: 8 }, get: { fuel: 1 } },
  { give: { bread: 2 }, get: { medkit: 1 } },
  { give: { scrap: 20 }, get: { parts: 2 } },
  { give: { fuel: 2 }, get: { ammo_rifle: 6 } },
  { give: { gem_red: 1 }, get: { milchip: 1 } },
  { give: { pumpkin: 2 }, get: { w_machete: 1 } },
  { give: { mush_brown: 5 }, get: { bandage: 2 } },
  { give: { mush_red: 3 }, get: { gunpowder: 2 } },
  { give: { rotflesh: 6 }, get: { ammo_shell: 4 } },
  { give: { pumpkin: 1 }, get: { fuel: 2 } },
];
export function todayTrades() {
  const seed = dayNum();
  const pool = [...TRADES];
  const out = [];
  let x = seed;
  while (out.length < 5 && pool.length) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(pool.splice(x % pool.length, 1)[0]);
  }
  return out;
}
export const SHOP_AMMO = [
  { id: 'ammo_pistol', n: 6, price: 40 },
  { id: 'ammo_shell', n: 4, price: 60 },
  { id: 'bandage', n: 1, price: 30 },
  { id: 'canned', n: 1, price: 35 },
  { id: 'w_bat', n: 1, price: 120 },
];

// ---------- Bắt đầu tận thế (save mới & save cũ đều nhận 1 lần) ----------
export function ensureSurvival() {
  if (state.survivalStart) return;
  state.survivalStart = true;
  state.food = state.food ?? FOOD_MAX;
  for (const [id, n] of Object.entries({ w_bat: 1, canned: 3, bandage: 2, water: 2 })) state.inv[id] = (state.inv[id] || 0) + n;
  state.mail = [...(state.mail || []), {
    from: 'tu',
    text: 'Dịch zombie tới rồi! Làng giờ là trại người sống sót, nông trại cháu nuôi cả trại. Chú để lại gậy, đồ hộp, băng gạc. Dùng Bàn chế tạo cạnh nhà để nâng cấp căn cứ. Phá ổ zombie để giành lại từng vùng!',
  }];
}

// ---------- Vùng bị chiếm ----------
// infection 0–100: hạ zombie / phá ổ để giảm. Về 0 = giải phóng (ban ngày hết zombie, đồ lục nhiều hơn)
export const ZONES = {
  forest: { name: 'Rừng hoang', types: ['walker', 'walker', 'runner'], day: 6, night: 13, nests: 2 },
  town: { name: 'Thị trấn bỏ hoang', types: ['walker', 'walker', 'runner', 'runner', 'brute'], day: 9, night: 16, nests: 2 },
};
export function zoneState(id) {
  state.zones = state.zones || {};
  return (state.zones[id] = state.zones[id] || { infection: 100, nests: {}, kills: 0 });
}
export function reduceInfection(id, n) {
  const z = zoneState(id);
  if (z.infection <= 0) return;
  z.infection = Math.max(0, z.infection - n);
  if (z.infection === 0) {
    sfx('fanfare', 0.6);
    toast(`${ZONES[id].name} đã được GIẢI PHÓNG!`);
  }
  changed();
}
