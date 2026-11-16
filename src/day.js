// Chuyển sang ngày mới: cây lớn, vật nuôi, thời tiết, mùa, nhiệm vụ
import { CROPS, ANIMALS, BUILDINGS, ITEMS, NPCS, SEASONS, DAYS_PER_SEASON, DAY_START, MAX_ENERGY, MAX_HP, RIPE_STAGE, FISH, FORAGE } from './config.js';
import { state } from './state.js';
import { spawnDebris } from './farmLayout.js';
import { growCrops } from './crops.js';
import { morningNews } from './festivals.js';
import { maxHp } from './skills.js';
import { baseLv, baseMorning, FOOD_MAX } from './survival.js';

const key = (x, y) => `${x},${y}`;

export function newDay(passedOut) {
  const notes = [];

  // 1. Cây lớn tới lúc đi ngủ (đất ướt lớn nhanh hơn), rồi đất khô lại. Cây tiếp tục lớn qua đêm.
  growCrops();
  for (const t of Object.values(state.tiles)) t.watered = false;

  // 2. Vật nuôi: được cho ăn hôm qua → có sản phẩm
  for (const a of state.animals) {
    if (a.fed) a.product = true;
    a.pts = Math.max(0, Math.min(50, a.pts + (a.petted ? 3 : -2) + (a.fed ? 0 : -3)));
    a.fed = false;
    a.petted = false;
  }

  // 3. Công trình xây xong
  for (const [id, b] of Object.entries(state.buildings)) {
    if (b === 'building') {
      state.buildings[id] = 'built';
      notes.push(`${BUILDINGS[id].name} đã xây xong!`);
    }
  }

  // 4. NPC: reset trò chuyện / quà trong ngày
  for (const n of Object.values(state.npcs)) {
    n.talked = false;
    n.gifted = false;
  }

  // 5. Lịch & mùa
  state.day++;
  if (state.day > DAYS_PER_SEASON) {
    state.day = 1;
    state.season = (state.season + 1) % 4;
    if (state.season === 0) state.year++;
    const sid = SEASONS[state.season].id;
    let wilted = 0;
    for (const t of Object.values(state.tiles)) {
      if (t.crop && !t.crop.dead && !CROPS[t.crop.type].seasons.includes(sid)) {
        t.crop.dead = true;
        wilted++;
      }
    }
    notes.push(`Bắt đầu mùa ${SEASONS[state.season].name}!` + (wilted ? ` ${wilted} cây trái mùa đã héo.` : ''));
  }
  const winter = SEASONS[state.season].id === 'winter';

  // 6. Thời tiết
  const roll = Math.random();
  state.weather = winter ? (roll < 0.35 ? 'snow' : 'sun') : roll < 0.2 ? 'rain' : 'sun';
  if (state.weather === 'rain') for (const t of Object.values(state.tiles)) t.watered = true;

  // 7. Bình phun tự tưới 8 ô xung quanh
  for (const [k, o] of Object.entries(state.objects || {})) {
    if (o.type !== 'sprinkler') continue;
    const [x, y] = k.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const t = state.tiles[key(x + dx, y + dy)];
        if (t) t.watered = true;
      }
  }

  // 8. Cỏ dại / cành / đá mọc thêm
  spawnDebris(7 + Math.floor(Math.random() * 4), winter);

  // 9. Nhiệm vụ
  if (state.quest) {
    state.quest.daysLeft--;
    if (state.quest.daysLeft <= 0) {
      notes.push(`Nhiệm vụ của ${NPCS[state.quest.npc].name} đã hết hạn.`);
      state.quest = null;
    }
  }
  if (!state.quest && !state.questOffer) state.questOffer = makeQuest();

  // 10. Sức lực & thời gian
  if (passedOut) {
    const lost = Math.min(Math.floor(state.coins * 0.1), 500);
    state.coins -= lost;
    state.energy = Math.round(MAX_ENERGY / 2);
    notes.unshift(`Bạn ngất xỉu vì thức quá khuya! Mất ${lost} xu tiền thuốc.`);
  } else {
    state.energy = MAX_ENERGY;
  }
  // Tận thế: ngủ chỉ hồi một phần máu (Trạm y tế cấp 1 → hồi đầy), qua đêm bụng đói thêm
  const rest = baseLv('medic') >= 1 ? maxHp() : Math.min(maxHp(), (state.hp || 0) + 40);
  state.hp = passedOut ? Math.round(maxHp() * 0.5) : Math.max(rest, Math.round(maxHp() * 0.5));
  state.food = Math.max(0, (state.food ?? FOOD_MAX) - 20);
  baseMorning();
  if (state.food < 30) notes.push('Bụng đói meo — ăn sáng đi nhé!');
  state.time = DAY_START;
  notes.push(...morningNews());
  return notes;
}

// Tạo yêu cầu giao hàng phù hợp với mùa & những gì người chơi có thể làm
export function makeQuest() {
  const sid = SEASONS[state.season].id;
  const pool = Object.keys(CROPS).filter((c) => CROPS[c].seasons.includes(sid));
  pool.push('wood', 'stone');
  for (const a of state.animals) pool.push(ANIMALS[a.type].product);
  pool.push(...FORAGE[sid]);
  if (state.hasRod) pool.push(...Object.keys(FISH).filter((f) => FISH[f].seasons.includes(sid) && f !== 'fish_gold' && !FISH[f].night));
  const item = pool[Math.floor(Math.random() * pool.length)];
  const qty = item === 'wood' || item === 'stone' ? 10 + Math.floor(Math.random() * 10) : FISH[item] ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4);
  const unit = ITEMS[item].sell || 8;
  const npcIds = Object.keys(NPCS);
  return {
    npc: npcIds[Math.floor(Math.random() * npcIds.length)],
    item,
    qty,
    reward: Math.round((unit * qty * 1.6) / 5) * 5 + 20,
    daysLeft: 3,
  };
}

