// ============================================================
//  Cơ chế kiểu Hay Day: cấp độ nông trại, Kho thóc & Nhà kho, nhà máy chế biến,
//  bảng đơn hàng, sạp bán ven đường.
//  Đồ dùng chung từ: túi đồ + Kho thóc + Nhà kho (giống Hay Day lấy thẳng từ kho).
// ============================================================
import { ITEMS, CROPS, FARM_LEVELS, UNLOCK_LEVEL, XP_PER_COINS, BUILDINGS, STORES, FACTORIES, STAND_SLOTS, ORDER_COUNT, DAYS_PER_SEASON, ANIMALS, FORAGE, SEASONS } from './config.js';
import { state, bus, changed, toast, sfx, addItem, count, bagHasRoom } from './state.js';

// ---------- Thời gian tuyệt đối (phút game) ----------
export const absMin = () => (((state.year - 1) * 4 + state.season) * DAYS_PER_SEASON + (state.day - 1)) * 1440 + state.time;

// ---------- Cấp độ nông trại ----------
export function farmLevel() {
  let lv = 1;
  for (let i = 2; i < FARM_LEVELS.length; i++) if ((state.farmXp || 0) >= FARM_LEVELS[i]) lv = i;
  return lv;
}
export function farmProgress() {
  const lv = farmLevel();
  if (lv >= FARM_LEVELS.length - 1) return 1;
  return ((state.farmXp || 0) - FARM_LEVELS[lv]) / (FARM_LEVELS[lv + 1] - FARM_LEVELS[lv]);
}
// Tên những thứ mở khoá ở đúng cấp lv
export function unlocksAt(lv) {
  const name = (id) => ITEMS[id]?.name || BUILDINGS[id]?.name || ANIMALS[id]?.name || { bag: 'Ba lô lớn', rod: 'Cần câu', quarry: 'Bãi phế liệu (cuối đường phía đông trại)', deepcave: 'Tầng hầm sâu ở Bãi phế liệu', home2: 'Nâng cấp nhà gỗ rộng (Xưởng mộc)', home3: 'Nâng cấp nhà lớn (Xưởng mộc)' }[id] || id;
  return [
    ...Object.entries(UNLOCK_LEVEL).filter(([, l]) => l === lv).map(([id]) => name(id)),
    ...Object.values(FACTORIES).filter((f) => f.level === lv).map((f) => f.name),
  ];
}
// Đã đủ uy tín để mua / xây chưa
export const unlocked = (id) => farmLevel() >= (UNLOCK_LEVEL[id] || 1);
export const needLevel = (id) => UNLOCK_LEVEL[id] || 1;

export function farmXp(n) {
  const before = farmLevel();
  state.farmXp = (state.farmXp || 0) + n;
  const lv = farmLevel();
  if (lv > before) {
    sfx('success', 0.55);
    const list = [];
    for (let l = before + 1; l <= lv; l++) list.push(...unlocksAt(l));
    bus.emit('levelUp', lv, list);
  }
}
// Bán hàng → dân làng tin tưởng hơn
export function earnCoins(n) {
  state.coins += n;
  state.saleCarry = (state.saleCarry || 0) + n;
  const xp = Math.floor(state.saleCarry / XP_PER_COINS);
  if (xp > 0) {
    state.saleCarry -= xp * XP_PER_COINS;
    farmXp(xp);
  }
}

// ---------- Kho thóc / Nhà kho ----------
const FORAGE_ALL = new Set(Object.values(FORAGE).flat());
export const storable = (id) => {
  const it = ITEMS[id];
  return it && !it.seed && !it.place && !it.home && !it.homePlace && id !== 'storage_chest';
};
export const storeFor = (id) => (CROPS[id] || FORAGE_ALL.has(id) ? 'silo' : 'barn');
export const storeItems = (k) => state.stores[k].items;
export const storeUsed = (k) => Object.values(storeItems(k)).reduce((a, n) => a + n, 0);
export const storeCap = (k) => STORES[k].caps[state.stores[k].lv];
export const have = (id) => count(id) + (state.stores.silo.items[id] || 0) + (state.stores.barn.items[id] || 0);

export function take(id, n) {
  let need = n;
  const fromBag = Math.min(need, count(id));
  if (fromBag) addItem(id, -fromBag, true);
  need -= fromBag;
  for (const k of ['silo', 'barn']) {
    const items = storeItems(k);
    const t = Math.min(need, items[id] || 0);
    if (t) {
      items[id] -= t;
      if (items[id] <= 0) delete items[id];
      need -= t;
    }
  }
}

export const canAfford = (cost) => Object.entries(cost).every(([id, n]) => (id === 'coins' ? state.coins >= n : have(id) >= n));
export function payCost(cost) {
  if (!canAfford(cost)) return false;
  for (const [id, n] of Object.entries(cost)) id === 'coins' ? (state.coins -= n) : take(id, n);
  return true;
}
export const costText = (cost) =>
  Object.entries(cost)
    .map(([id, n]) => (id === 'coins' ? `${n} xu` : `${n} ${ITEMS[id].name} (có ${have(id)})`))
    .join(' + ');

// Cất sản phẩm vào đúng kho; kho đầy thì bỏ vào túi
export function putProduct(id, n) {
  const k = storeFor(id);
  if (storeUsed(k) + n <= storeCap(k)) {
    storeItems(k)[id] = (storeItems(k)[id] || 0) + n;
    bus.emit('gain', id, n);
    return true;
  }
  if (bagHasRoom(id)) {
    addItem(id, n);
    return true;
  }
  return false;
}

export function upgradeStore(k) {
  const lv = state.stores[k].lv;
  const cost = STORES[k].upgrade[lv];
  if (!cost) return toast('Kho đã ở cấp cao nhất');
  if (!payCost(cost)) return toast(`Chưa đủ: ${costText(cost)}`);
  state.stores[k].lv = lv + 1;
  farmXp(10);
  sfx('success');
  toast(`${STORES[k].name} lên cấp ${lv + 1}: chứa ${storeCap(k)} món!`);
  changed();
}

// ---------- Nhà máy ----------
export const factoryBuilt = (id) => !!state.factories[id];

// Nhờ Chú Tư xây: mang đồ lục được tới, chú dựng xong sau FAC_BUILD_MIN phút (giờ game)
export const FAC_BUILD_MIN = 180;
export const facBuilding = (id) => state.facBuild?.[id] != null;
export const facLeft = (id) => Math.max(1, (state.facBuild?.[id] ?? absMin()) - absMin());
export const facLack = (id) => {
  const f = FACTORIES[id];
  const miss = Object.entries(f.cost).filter(([k, n]) => have(k) < n);
  return miss.length ? `Còn thiếu: ${miss.map(([k, n]) => `${n - have(k)} ${ITEMS[k].name}`).join(', ')}` : null;
};
export function buildFactory(id) {
  const f = FACTORIES[id];
  if (farmLevel() < f.level) return toast(`Cần uy tín cấp ${f.level} để xây ${f.name}`);
  if (factoryBuilt(id) || facBuilding(id)) return;
  const lack = facLack(id);
  if (lack) return toast(lack);
  if (!payCost(f.cost)) return;
  state.facBuild = { ...(state.facBuild || {}), [id]: absMin() + FAC_BUILD_MIN };
  sfx('fanfare', 0.5);
  toast(`Chú Tư nhận đồ rồi! ${f.name} sẽ dựng xong sau ${FAC_BUILD_MIN / 60} tiếng.`);
  changed();
}
// Gọi mỗi nhịp đồng hồ & sang ngày mới: công trình nào tới giờ thì hoàn thành
export function finishFactories(force = false) {
  const done = [];
  for (const [id, t] of Object.entries(state.facBuild || {})) {
    if (!force && absMin() < t) continue;
    delete state.facBuild[id];
    state.factories[id] = { queue: [] };
    farmXp(10);
    done.push(FACTORIES[id].name);
  }
  return done;
}

export const readyCount = (id) => (state.factories[id]?.queue || []).filter((q) => q.done <= absMin()).length;

function startRecipe(id, r) {
  const fac = state.factories[id];
  if (fac.queue.length >= FACTORIES[id].slots) return toast('Hàng chờ đã đầy — thu sản phẩm trước');
  if (!payCost(r.cost)) return toast('Chưa đủ nguyên liệu');
  const last = fac.queue.length ? fac.queue[fac.queue.length - 1].done : 0;
  fac.queue.push({ out: r.out, n: r.n, done: Math.max(absMin(), last) + r.min });
  sfx('click', 0.4);
  changed();
}

export function collectFactory(id) {
  const fac = state.factories[id];
  const now = absMin();
  let got = 0;
  while (fac.queue.length && fac.queue[0].done <= now) {
    const q = fac.queue[0];
    if (!putProduct(q.out, q.n)) {
      toast(`${STORES[storeFor(q.out)].name} và túi đồ đều đầy!`);
      break;
    }
    fac.queue.shift();
    got++;
    farmXp(2);
  }
  if (got) sfx('harvest', 0.4);
  changed();
}

const minutesLeft = (done) => Math.max(0, done - absMin());
const timeText = (m) => (m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60 ? `${m % 60} phút` : ''}` : `${m} phút`);

export function factoryPanel(id) {
  const f = FACTORIES[id];
  return {
    title: f.name,
    rows() {
      const fac = state.factories[id];
      const rows = [];
      const ready = readyCount(id);
      fac.queue.forEach((q, i) => {
        const left = minutesLeft(q.done);
        rows.push({
          icon: { tex: ITEMS[q.out].tex, frame: ITEMS[q.out].frame },
          name: `${ITEMS[q.out].name} ×${q.n}${left ? '' : ' — Xong!'}`,
          desc: left ? (i === 0 || minutesLeft(fac.queue[i - 1].done) === 0 ? `Đang làm · còn ${timeText(left)}` : `Chờ · xong sau ${timeText(left)}`) : 'Chạm "Thu" để cất vào kho',
          buttons: !left && i === 0 ? [{ label: `Thu ${ready}`, onClick: () => collectFactory(id) }] : [],
        });
      });
      for (const r of f.recipes) {
        rows.push({
          icon: { tex: ITEMS[r.out].tex, frame: ITEMS[r.out].frame },
          name: `${ITEMS[r.out].name}${r.n > 1 ? ` ×${r.n}` : ''} · bán ${ITEMS[r.out].sell} xu`,
          desc: `${costText(r.cost)} · ${timeText(r.min)}`,
          buttons: [{ label: 'Làm', disabled: fac.queue.length >= f.slots || !canAfford(r.cost), onClick: () => startRecipe(id, r) }],
        });
      }
      return rows;
    },
  };
}

// ---------- Bảng đơn hàng ----------
function orderPool() {
  const sid = SEASONS[state.season].id;
  const pool = Object.keys(CROPS).filter((c) => CROPS[c].seasons.includes(sid));
  pool.push(...FORAGE[sid]);
  for (const a of state.animals) pool.push(ANIMALS[a.type].product);
  for (const id of Object.keys(state.factories)) for (const r of FACTORIES[id].recipes) pool.push(r.out);
  return [...new Set(pool)];
}

function makeOrder() {
  const pool = orderPool();
  const kinds = Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(3, 1 + farmLevel() / 2)));
  const items = {};
  while (Object.keys(items).length < kinds) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    items[id] = ITEMS[id].good ? 1 + Math.floor(Math.random() * 2) : CROPS[id] ? 2 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3);
  }
  const value = Object.entries(items).reduce((a, [id, n]) => a + ITEMS[id].sell * n, 0);
  return { items, coins: Math.round((value * 1.3) / 5) * 5 + 10, xp: Math.round(value / 15) + 3, wait: 0 };
}

// Đơn hợp lệ: đang chờ đơn mới, hoặc mọi món đều tồn tại với số lượng > 0
const validOrder = (o) =>
  o && typeof o === 'object' && (o.items ? Object.keys(o.items).length > 0 && Object.entries(o.items).every(([id, n]) => ITEMS[id] && n > 0) && Number.isFinite(o.coins) : Number.isFinite(o.wait));

export function ensureOrders() {
  state.orders = (Array.isArray(state.orders) ? state.orders : []).filter(validOrder).slice(0, ORDER_COUNT);
  while (state.orders.length < ORDER_COUNT) state.orders.push(makeOrder());
  const now = absMin();
  state.orders = state.orders.map((o) => (o.wait && o.wait <= now && !o.items ? makeOrder() : o));
}

export const ordersReady = () => (state.orders || []).filter((o) => o?.items && Object.entries(o.items).every(([id, n]) => have(id) >= n)).length;

function deliver(i) {
  const o = state.orders[i];
  if (!Object.entries(o.items).every(([id, n]) => have(id) >= n)) return toast('Chưa đủ hàng');
  for (const [id, n] of Object.entries(o.items)) take(id, n);
  state.coins += o.coins;
  farmXp(o.xp);
  sfx('coin');
  toast(`Xe tải đã chở đơn hàng! +${o.coins} xu, +${o.xp} XP`);
  state.orders[i] = { wait: absMin() + 20 };
  changed();
}

function discard(i) {
  state.orders[i] = { wait: absMin() + 60 };
  sfx('cancel', 0.4);
  changed();
}

export const ordersPanel = {
  title: 'Bảng đơn hàng',
  rows() {
    ensureOrders();
    return state.orders.map((o, i) => {
      if (!o.items)
        return { name: 'Đơn hàng mới đang tới…', desc: `Còn ${timeText(minutesLeft(o.wait))}`, buttons: [] };
      const ok = Object.entries(o.items).every(([id, n]) => have(id) >= n);
      const first = Object.keys(o.items)[0];
      return {
        icon: { tex: ITEMS[first].tex, frame: ITEMS[first].frame },
        name: `${o.coins} xu · ${o.xp} XP`,
        desc: Object.entries(o.items).map(([id, n]) => `${ITEMS[id].name} ${Math.min(have(id), n)}/${n}`).join(' · '),
        buttons: [
          { label: 'Giao', disabled: !ok, onClick: () => deliver(i) },
          { label: 'Bỏ', onClick: () => discard(i) },
        ],
      };
    });
  },
};

// ---------- Sạp bán ven đường ----------
export function ensureStand() {
  state.stand = state.stand || [];
  while (state.stand.length < STAND_SLOTS) state.stand.push(null);
}

function pickPanel(slot) {
  return {
    title: 'Chọn hàng để bày bán',
    rows() {
      const ids = Object.keys(ITEMS).filter((id) => storable(id) && ITEMS[id].sell > 0 && have(id) > 0);
      if (!ids.length) return [{ name: 'Chưa có hàng để bán', desc: 'Thu hoạch hoặc chế biến trước nhé', buttons: [] }];
      return ids.map((id) => ({
        icon: { tex: ITEMS[id].tex, frame: ITEMS[id].frame },
        name: `${ITEMS[id].name} (có ${have(id)})`,
        desc: `Giá gốc ${ITEMS[id].sell} xu/cái`,
        buttons: [
          {
            label: 'Bày',
            onClick: () => {
              const n = Math.min(10, have(id));
              take(id, n);
              state.stand[slot] = { id, n, price: Math.round((ITEMS[id].sell * n * 1.2) / 5) * 5, sold: false };
              sfx('click', 0.4);
              bus.emit('panel', standPanel);
              changed();
            },
          },
        ],
      }));
    },
  };
}

export const standSold = () => (Array.isArray(state.stand) ? state.stand : []).filter((s) => s?.sold).length;

export const standPanel = {
  title: 'Sạp bán ven đường',
  rows() {
    ensureStand();
    return state.stand.map((s, i) => {
      if (!s) return { name: `Ô ${i + 1}: trống`, desc: 'Bày hàng (tối đa 10 món) — khách ghé mua dần từ 7h đến 20h', buttons: [{ label: 'Bày bán', onClick: () => bus.emit('panel', pickPanel(i)) }] };
      const it = ITEMS[s.id];
      if (s.sold)
        return {
          icon: { tex: it.tex, frame: it.frame },
          name: `Đã bán ${s.n} ${it.name}!`,
          desc: `Khách đã trả ${s.price} xu`,
          buttons: [{ label: 'Nhận tiền', onClick: () => (earnCoins(s.price), (state.stand[i] = null), sfx('coin'), changed()) }],
        };
      const base = it.sell * s.n;
      return {
        icon: { tex: it.tex, frame: it.frame },
        name: `${s.n} ${it.name} · ${s.price} xu`,
        desc: `Giá gốc ${base} xu — giá càng cao càng lâu có người mua`,
        buttons: [
          { label: '−', onClick: () => ((s.price = Math.max(5, Math.round((s.price * 0.9) / 5) * 5)), changed()) },
          { label: '+', onClick: () => ((s.price = Math.round((s.price * 1.1) / 5) * 5 + 5), changed()) },
          {
            label: 'Thu hồi',
            onClick: () => {
              if (!putProduct(s.id, s.n)) return toast('Kho và túi đều đầy');
              state.stand[i] = null;
              changed();
            },
          },
        ],
      };
    });
  },
};

// Mỗi giờ game: khách ghé sạp
export function onHour() {
  ensureStand();
  if (state.time < 7 * 60 || state.time > 20 * 60) return;
  let sold = 0;
  for (const s of state.stand) {
    if (!s || s.sold) continue;
    const ratio = (ITEMS[s.id].sell * s.n * 1.2) / s.price; // giá rẻ → dễ bán
    if (Math.random() < 0.22 * Math.min(2.5, ratio * ratio)) {
      s.sold = true;
      sold++;
    }
  }
  if (sold) toast(`Có khách vừa mua hàng ở sạp ven đường!`);
}
