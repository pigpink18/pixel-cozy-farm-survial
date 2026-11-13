// Lễ hội theo mùa, sinh nhật NPC, sự kiện tình cảm, thư buổi sáng
import { FESTIVALS, NPCS, ITEMS, CROPS, SEASONS, DAYS_PER_SEASON } from './config.js';
import { state, bus, changed, toast, sfx, addItem, count, has, season } from './state.js';

export const FEST_START = 9 * 60;
export const FEST_END = 16 * 60;

export const todayFestival = () => FESTIVALS.find((f) => f.season === state.season && f.day === state.day) || null;
export function festivalActive() {
  const f = todayFestival();
  return f && state.time >= FEST_START && state.time < FEST_END ? f : null;
}
const festKey = (f) => `${state.year}-${f.season}-${f.day}`;
export const festivalDone = (f) => !!state.festivalsDone[festKey(f)];

export const isBirthday = (id) => {
  const b = NPCS[id].birthday;
  return b && b.season === state.season && b.day === state.day;
};
export const birthdayText = (id) => {
  const b = NPCS[id].birthday;
  return b ? `${SEASONS[b.season].name} ${b.day}` : '?';
};

// Nút "Tham gia lễ hội" trong hội thoại với người chủ trì
export function festivalChoice(npcId) {
  const f = festivalActive();
  if (!f || f.host !== npcId || festivalDone(f)) return null;
  return { label: `Tham gia: ${f.name}`, onClick: () => joinFestival(f) };
}

function finish(f, coins, msg) {
  state.festivalsDone[festKey(f)] = true;
  state.coins += coins;
  for (const id of Object.keys(NPCS)) state.npcs[id].pts = Math.min(50, state.npcs[id].pts + 3);
  sfx('success');
  bus.emit('dialog', { face: `face_${f.host}`, name: NPCS[f.host].name, text: `${msg} Thưởng ${coins} xu! Cả làng đều quý bạn hơn.`, choices: [{ label: 'Cảm ơn!', onClick: null }] });
  changed();
}

function joinFestival(f) {
  if (f.gift) {
    for (const [id, n] of Object.entries(f.gift)) addItem(id, n);
    return finish(f, f.prize(), `Chúc mừng ${f.name}! Đây là quà của làng: ${Object.entries(f.gift).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ')}.`);
  }
  if (f.accept) {
    const ok = Object.entries(f.accept).every(([id, n]) => has(id, n));
    if (!ok) return toast(`Cần ${Object.entries(f.accept).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ')}`);
    for (const [id, n] of Object.entries(f.accept)) addItem(id, -n);
    return finish(f, f.prize(), 'Bó hoa đẹp quá!');
  }
  // Nộp 1 món tuỳ chọn (cá / nông sản)
  const eligible = Object.keys(state.inv).filter((id) => {
    const it = ITEMS[id];
    if (!it || !count(id)) return false;
    return f.acceptTag === 'fish' ? it.fish : CROPS[id] || id.startsWith('dish_') || ['egg', 'milk', 'truffle'].includes(id);
  });
  bus.emit('panel', {
    title: f.name,
    face: `face_${f.host}`,
    rows: () =>
      eligible.length
        ? eligible.map((id) => ({
            icon: { tex: ITEMS[id].tex, frame: ITEMS[id].frame },
            name: `${ITEMS[id].name} (${count(id)})`,
            desc: `Dự kiến thưởng ${f.prize(id, ITEMS)} xu`,
            buttons: [
              {
                label: 'Nộp',
                onClick: () => {
                  addItem(id, -1);
                  bus.emit('closePanel');
                  setTimeout(() => finish(f, f.prize(id, ITEMS), `${ITEMS[id].name} tuyệt vời!`), 50);
                },
              },
            ],
          }))
        : [{ name: 'Bạn chưa có món nào phù hợp', desc: f.desc, buttons: [] }],
  });
}

// Lời thoại đặc biệt trong ngày lễ / sinh nhật
export function specialLine(npcId) {
  if (isBirthday(npcId)) return 'Hôm nay là sinh nhật của mình đó! Hì hì.';
  const f = festivalActive();
  if (f) return f.host === npcId ? f.desc : `${f.name} vui quá! Bạn đã gặp ${NPCS[f.host].name} chưa?`;
  return null;
}

// Sự kiện tình cảm: đạt 2♥ / 4♥ lần đầu → NPC tặng quà
export function heartEvent(npcId) {
  const st = state.npcs[npcId];
  st.events = st.events || [];
  for (const h of [2, 4]) {
    if (st.pts >= h * 10 && !st.events.includes(h)) {
      st.events.push(h);
      const gifts = NPCS[npcId].gifts?.[h] || {};
      for (const [id, n] of Object.entries(gifts)) addItem(id, n);
      const list = Object.entries(gifts).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ');
      return h === 2
        ? `Mình thấy bạn chăm chỉ lắm. Cái này tặng bạn nè: ${list}.`
        : `Bạn là người bạn thân thiết nhất của mình ở làng này. Nhận món quà đặc biệt này nhé: ${list}!`;
    }
  }
  return null;
}

// Thư & ghi chú buổi sáng (gọi trong newDay, sau khi đã sang ngày mới)
export function morningNews() {
  const notes = [];
  const f = todayFestival();
  if (f) notes.push(`Hôm nay có ${f.name} ở làng (9:00–16:00)!`);
  for (const id of Object.keys(NPCS)) if (isBirthday(id)) notes.push(`Hôm nay là sinh nhật ${NPCS[id].name} — tặng quà được gấp 3 tình cảm!`);
  // Thư báo lễ hội ngày mai
  const tomorrow = FESTIVALS.find((x) => x.season === state.season && x.day === state.day + 1);
  if (tomorrow)
    state.mail.push({ from: tomorrow.host, text: `Ngày mai làng mình tổ chức ${tomorrow.name}. ${tomorrow.desc} Nhớ ghé nha!` });
  if (state.day === 1)
    state.mail.push({ from: 'lan', text: `Mùa ${season().name} tới rồi! Tiệm của bà có hạt giống mới, ghé xem nhé. (Mỗi mùa ${DAYS_PER_SEASON} ngày)` });
  return notes;
}
