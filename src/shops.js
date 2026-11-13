// Cửa hàng, chế tạo, NPC, nhiệm vụ — tạo dữ liệu cho UIScene hiển thị
import { timeText } from './crops.js';
import { ITEMS, CROPS, BUILDINGS, ANIMALS, ANIMAL_NAMES, RECIPES, NPCS, SEASON_LINES, HAY_PRICE, SHOP_OPEN, SHOP_CLOSE, TOOLS, TOOL_TIERS, TIER_BARS, ROD_PRICE, FISH, FORAGE, COOKING, BAG_BIG, BAG_PRICE } from './config.js';
import { state, bus, changed, toast, sfx, has, count, addItem, season, hearts, itemName, ui } from './state.js';
import { makeQuest } from './day.js';
import { unlocked, needLevel, absMin, farmLevel } from './hayday.js';
import { FURN, FURN_CATS, WALLS, FLOORS, HOME_LEVELS, homeLv, ensureHome, addOwned, ownedCount } from './furniture.js';
export const BUILD_MIN = 60; // xây chuồng mất 60 phút trong game (~36 giây)
import { festivalChoice, specialLine, isBirthday, heartEvent } from './festivals.js';
import { LINES, PLACE_LINES, requestToday, tier, greeting } from './npcs.js';
import { mineralPanel, geodePanel } from './maps/quarry.js';
import { earnCoins } from './hayday.js';

const icon = (id) => ({ tex: ITEMS[id].tex, frame: ITEMS[id].frame });

// Trả tiền + nguyên liệu: cost = { itemId: số lượng }
function pay(coins, cost = {}) {
  if (state.coins < coins) return toast('Không đủ xu!'), false;
  for (const [id, n] of Object.entries(cost))
    if (!has(id, n)) return toast(`Cần ${n} ${itemName(id)} (đang có ${count(id)})`), false;
  state.coins -= coins;
  for (const [id, n] of Object.entries(cost)) addItem(id, -n);
  return true;
}
const costText = (cost) => Object.entries(cost).map(([id, n]) => `${n} ${itemName(id)}`).join(' + ');
// Khoá theo uy tín: nút xám ghi cấp cần, mô tả ghi rõ lý do
const locked = (id) => (unlocked(id) ? null : `Cần uy tín cấp ${needLevel(id)}`);
const lockBtn = (id) => ({ label: `Cấp ${needLevel(id)}`, disabled: true, onClick: () => {} });
// Thiếu gì để mua / xây (null = đủ)
function missing(coins, cost = {}) {
  const lack = [];
  if (state.coins < coins) lack.push(`${coins - state.coins} xu`);
  for (const [id, n] of Object.entries(cost)) if (!has(id, n)) lack.push(`${n - count(id)} ${itemName(id)}`);
  return lack.length ? `Còn thiếu ${lack.join(', ')}` : null;
}

function buy(id, n, price) {
  if (!pay(price * n)) return;
  addItem(id, n);
  sfx('coin');
  toast(`Đã mua ${n} ${ITEMS[id].name} (-${price * n} xu)`);
  changed();
}

const openPanel = (panel) => bus.emit('panel', panel);
export const shopOpen = () => state.time >= SHOP_OPEN && state.time < SHOP_CLOSE;

// ---------- Tiệm tạp hoá ----------
export const storePanel = {
  title: 'Tiệm tạp hoá của Bà Lan',
  face: 'face_lan',
  rows() {
    const sid = season().id;
    const rows = Object.entries(CROPS)
      .filter(([, c]) => c.seasons.includes(sid))
      .map(([id, c]) => {
        const lock = locked(`seed_${id}`);
        return {
          icon: icon(`seed_${id}`),
          name: ITEMS[`seed_${id}`].name,
          desc: lock || `${c.seedPrice} xu · chín sau ${timeText(c.grow)} · bán ${ITEMS[id].sell} xu${c.regrow ? ` · ra trái lại sau ${timeText(c.regrow)}` : ''}`,
          buttons: lock
            ? [lockBtn(`seed_${id}`)]
            : [
                { label: 'Mua 1', disabled: state.coins < c.seedPrice, onClick: () => buy(`seed_${id}`, 1, c.seedPrice) },
                { label: 'Mua 5', disabled: state.coins < c.seedPrice * 5, onClick: () => buy(`seed_${id}`, 5, c.seedPrice) },
              ],
        };
      });
    if (!rows.length) rows.push({ name: 'Mùa đông không có hạt giống', desc: 'Quay lại vào mùa xuân nhé!', buttons: [] });
    if ((state.bagSize || 24) < BAG_BIG)
      rows.unshift({
        icon: { tex: 'items', frame: 10 },
        name: `Ba lô lớn (${BAG_BIG} ô) — ${BAG_PRICE} xu`,
        desc: locked('bag') || `Túi đồ hiện có ${state.bagSize || 24} ô — mang được nhiều loại đồ hơn`,
        buttons: locked('bag') ? [lockBtn('bag')] : [{ label: 'Mua', disabled: state.coins < BAG_PRICE, onClick: () => {
          if (!pay(BAG_PRICE)) return;
          state.bagSize = BAG_BIG;
          sfx('success');
          toast(`Túi đồ đã mở rộng lên ${BAG_BIG} ô!`);
          changed();
        } }],
      });
    if (!state.hasRod)
      rows.unshift({
        icon: { tex: 'tool_rod' },
        name: `Cần câu — ${ROD_PRICE} xu`,
        desc: locked('rod') || 'Câu cá ở ao nông trại và hồ trong rừng (phía nam)',
        buttons: locked('rod') ? [lockBtn('rod')] : [
          {
            label: 'Mua',
            disabled: state.coins < ROD_PRICE,
            onClick: () => {
              if (!pay(ROD_PRICE)) return;
              state.hasRod = true;
              state.sel = 'tool:rod';
              sfx('success');
              toast('Đã mua cần câu! Chọn nó rồi chạm vào mặt nước để câu.');
              changed();
            },
          },
        ],
      });
    return rows;
  },
};

// ---------- Xưởng mộc ----------
export const carpenterPanel = {
  title: 'Xưởng mộc của Chú Tư',
  face: 'face_tu',
  rows() {
    const rows = Object.entries(BUILDINGS).map(([id, b]) => {
      const st = state.buildings[id];
      const lock = locked(id);
      const lack = missing(b.coins, { wood: b.wood, stone: b.stone });
      const price = `${b.coins} xu + ${b.wood} gỗ + ${b.stone} đá · chứa ${b.cap} con`;
      return {
        icon: { tex: 'nhouse', frame: id },
        name: `${b.name} — ${price}`,
        desc: st === 'built' ? 'Đã xây xong' : st === 'building' ? `Đang xây — xong sau ${BUILD_MIN} phút` : lock || lack || 'Đủ vật liệu — bấm Xây!',
        buttons: st
          ? []
          : lock
            ? [lockBtn(id)]
            : [
                {
                  label: 'Xây',
                  disabled: !!lack,
                  onClick: () => {
                    if (!pay(b.coins, { wood: b.wood, stone: b.stone })) return;
                    state.buildings[id] = 'building';
                    state.buildDone = { ...(state.buildDone || {}), [id]: absMin() + BUILD_MIN };
                    sfx('success');
                    toast(`Chú Tư đang xây ${b.name} — xong sau ${BUILD_MIN} phút!`);
                    changed();
                  },
                },
              ],
      };
    });
    // Nâng cấp nhà
    ensureHome();
    const nextHome = HOME_LEVELS[homeLv() + 1];
    rows.unshift(
      nextHome
        ? (() => {
            const lock = farmLevel() < nextHome.trust ? `Cần uy tín cấp ${nextHome.trust}` : null;
            const lack = missing(nextHome.coins, nextHome.cost);
            return {
              icon: { tex: 'furn', frame: 'bed_double' },
              name: `Nâng cấp nhà → ${nextHome.name} (${nextHome.w}×${nextHome.h} ô)`,
              desc: lock || lack || `${nextHome.coins} xu + ${costText(nextHome.cost)} · phòng rộng hơn để bày nhiều đồ`,
              buttons: lock
                ? [{ label: `Cấp ${nextHome.trust}`, disabled: true, onClick: () => {} }]
                : [
                    {
                      label: 'Nâng cấp',
                      disabled: !!lack,
                      onClick: () => {
                        if (!pay(nextHome.coins, nextHome.cost)) return;
                        state.home.lv = homeLv() + 1;
                        sfx('success');
                        toast(`Chú Tư đã mở rộng nhà thành ${nextHome.name}! Về nhà xem thử nhé.`);
                        changed();
                      },
                    },
                  ],
            };
          })()
        : { icon: { tex: 'furn', frame: 'bed_double' }, name: `Nhà: ${HOME_LEVELS[homeLv()].name}`, desc: 'Nhà đã rộng nhất rồi!', buttons: [] },
      {
        icon: { tex: 'furn', frame: 'sofa_red' },
        name: 'Nội thất trang trí',
        desc: `${Object.values(FURN).filter((f) => f.price).length} món: giường, sofa, tủ, đèn, tranh, thảm… cùng giấy dán tường & sàn nhà`,
        buttons: [{ label: 'Xem', onClick: () => openPanel(furnShopPanel('all')) }],
      }
    );
    // Nâng cấp công cụ
    for (const [id, t] of Object.entries(TOOLS)) {
      if (t.unlock && !state[t.unlock]) continue;
      const lv = state.toolLv[id] || 1;
      const next = TOOL_TIERS[lv + 1];
      const effect = { hoe: 'cuốc nhiều ô hơn', can: 'tưới nhiều ô + bình to hơn', axe: 'chặt mạnh hơn', pickaxe: 'đập đá mạnh hơn', sword: 'sát thương cao hơn' }[id];
      rows.push({
        icon: { tex: t.tex },
        name: `${t.name} ${TOOL_TIERS[lv].name} (cấp ${lv})`,
        desc: next ? `→ ${next.name}: ${TIER_BARS} ${ITEMS[next.bar].name} + ${next.coins} xu · ${effect}` : 'Đã đạt cấp cao nhất',
        buttons: next
          ? [
              {
                label: 'Nâng cấp',
                disabled: !has(next.bar, TIER_BARS) || state.coins < next.coins,
                onClick: () => {
                  if (!pay(next.coins, { [next.bar]: TIER_BARS })) return;
                  state.toolLv[id] = lv + 1;
                  sfx('success');
                  toast(`${t.name} đã lên cấp ${next.name}!`);
                  changed();
                },
              },
            ]
          : [],
      });
    }
    rows.push(
      { icon: icon('wood'), name: 'Gỗ', desc: '5 xu / cái', buttons: [{ label: 'Mua 10', onClick: () => buy('wood', 10, 5) }] },
      { icon: icon('stone'), name: 'Đá', desc: '8 xu / cái', buttons: [{ label: 'Mua 10', onClick: () => buy('stone', 10, 8) }] }
    );
    return rows;
  },
};

// ---------- Trại chăn nuôi ----------
export const ranchPanel = {
  title: 'Trại chăn nuôi của Cô Mai',
  face: 'face_mai',
  rows() {
    const rows = Object.entries(ANIMALS).map(([id, a]) => {
      const built = state.buildings[a.house] === 'built';
      const n = state.animals.filter((x) => ANIMALS[x.type].house === a.house).length;
      const full = n >= BUILDINGS[a.house].cap;
      const lock = locked(id);
      return {
        icon: { tex: a.tex, frame: a.frame },
        name: `${a.name} — ${a.price} xu`,
        desc: lock || (!built ? `Cần ${BUILDINGS[a.house].name} trước (xây ở Xưởng mộc của Chú Tư)` : full ? `${BUILDINGS[a.house].name} đã đầy (${n}/${BUILDINGS[a.house].cap})` : state.coins < a.price ? `Còn thiếu ${a.price - state.coins} xu` : `Cho ${ITEMS[a.product].name} mỗi ngày nếu được cho ăn · đang có ${n}/${BUILDINGS[a.house].cap}`),
        buttons: lock ? [lockBtn(id)] : [
          {
            label: 'Mua',
            disabled: !built || full || state.coins < a.price,
            onClick: () => {
              if (!pay(a.price)) return;
              const name = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
              state.animals.push({ id: state.nextId++, type: id, name, pts: 5, fed: false, petted: false, product: false });
              sfx('success');
              toast(`Đã mua ${a.name} tên "${name}". Về nông trại xem nhé!`);
              changed();
            },
          },
        ],
      };
    });
    rows.push({
      icon: icon('hay'),
      name: `Cỏ khô — ${HAY_PRICE} xu`,
      desc: `Thức ăn cho vật nuôi (đang có ${count('hay')})`,
      buttons: [
        { label: 'Mua 1', onClick: () => buy('hay', 1, HAY_PRICE) },
        { label: 'Mua 10', onClick: () => buy('hay', 10, HAY_PRICE) },
      ],
    });
    return rows;
  },
};

// ---------- Bếp ----------
export const kitchenPanel = {
  title: 'Bếp — nấu ăn',
  rows() {
    return COOKING.map((r) => {
      const it = ITEMS[r.id];
      const ok = Object.entries(r.cost).every(([id, n]) => has(id, n));
      return {
        icon: icon(r.id),
        name: `${it.name}${count(r.id) ? ` (có ${count(r.id)})` : ''}`,
        desc: `${costText(r.cost)} → +${it.eat.h} máu · bán ${it.sell} xu`,
        buttons: [
          {
            label: 'Nấu',
            disabled: !ok,
            onClick: () => {
              if (!pay(0, r.cost)) return;
              addItem(r.id);
              sfx('success', 0.4);
              toast(`Đã nấu ${it.name}! Chọn trên thanh công cụ để ăn.`);
              bus.emit('xp', 'cooking', 2);
              changed();
            },
          },
        ],
      };
    });
  },
};

// ---------- Chế tạo ----------
export function craftRows() {
  return RECIPES.map((r) => ({
    icon: icon(r.id),
    name: `${ITEMS[r.id].name}${r.out > 1 ? ` ×${r.out}` : ''}`,
    desc: `${costText(r.cost)} · ${r.desc}`,
    buttons: [
      {
        label: 'Làm',
        disabled: Object.entries(r.cost).some(([id, n]) => !has(id, n)),
        onClick: () => {
          if (!pay(0, r.cost)) return;
          addItem(r.id, r.out);
          sfx('success');
          toast(ITEMS[r.id].place ? `Đã làm ${ITEMS[r.id].name}! Chọn nó trên thanh công cụ để đặt.` : `+${r.out} ${ITEMS[r.id].name}`);
          changed();
        },
      },
    ],
  }));
}

// ---------- Bảng nhiệm vụ ----------
export const boardPanel = {
  title: 'Bảng nhiệm vụ',
  rows() {
    const q = state.quest;
    if (q) {
      return [
        {
          icon: icon(q.item),
          name: `${NPCS[q.npc].name} cần ${q.qty} ${ITEMS[q.item].name}`,
          desc: `Thưởng ${q.reward} xu · còn ${q.daysLeft} ngày · đang có ${count(q.item)} — gặp ${NPCS[q.npc].name} để giao`,
          buttons: [],
        },
      ];
    }
    if (!state.questOffer) state.questOffer = makeQuest();
    const o = state.questOffer;
    return [
      {
        icon: icon(o.item),
        name: `${NPCS[o.npc].name} cần ${o.qty} ${ITEMS[o.item].name}`,
        desc: `Thưởng ${o.reward} xu + tình cảm · hạn ${o.daysLeft} ngày`,
        buttons: [
          {
            label: 'Nhận',
            onClick: () => {
              state.quest = state.questOffer;
              state.questOffer = null;
              sfx('click');
              toast('Đã nhận nhiệm vụ!');
              changed();
            },
          },
        ],
      },
    ];
  },
};

// ---------- Tặng quà ----------
function giftPanel(npcId) {
  return {
    title: `Tặng quà cho ${NPCS[npcId].name}`,
    face: `face_${npcId}`,
    rows() {
      const items = Object.keys(state.inv).filter((id) => ITEMS[id]?.sell > 0 && count(id) > 0);
      if (!items.length) return [{ name: 'Bạn chưa có món gì để tặng', desc: 'Nông sản và sản phẩm vật nuôi đều tặng được', buttons: [] }];
      return items.map((id) => ({
        icon: icon(id),
        name: `${ITEMS[id].name} (${count(id)})`,
        desc: NPCS[npcId].loves.includes(id) ? 'Món yêu thích!' : '',
        buttons: [{ label: 'Tặng', disabled: state.npcs[npcId].gifted, onClick: () => giveGift(npcId, id) }],
      }));
    },
  };
}

function giveGift(npcId, id) {
  const n = state.npcs[npcId];
  if (n.gifted) return toast('Hôm nay đã tặng quà rồi.');
  addItem(id, -1);
  n.gifted = true;
  const love = NPCS[npcId].loves.includes(id);
  const bday = isBirthday(npcId);
  n.pts = Math.min(50, n.pts + (love ? 8 : 4) * (bday ? 3 : 1));
  sfx(love ? 'success' : 'click');
  bus.emit('closePanel');
  talk(npcId, (bday ? 'Quà sinh nhật hả? ' : '') + (love ? `Ôi, ${ITEMS[id].name}! Đúng món mình thích luôn. Cảm ơn nhiều nha!` : 'Cảm ơn bạn nhé!'), false);
  changed();
}

// ---------- Trò chuyện với NPC ----------
export function talk(npcId, text, greet = true) {
  const npc = NPCS[npcId];
  const st = (state.npcs[npcId] = state.npcs[npcId] || { pts: 0, talked: false, gifted: false, events: [] });
  const first = greet && !st.talked;
  if (first) {
    st.talked = true;
    st.pts = Math.min(50, st.pts + 2);
  }
  const q = state.quest;
  const req = requestToday(npcId, greet);
  if (!text && greet) text = heartEvent(npcId);
  if (!text) text = specialLine(npcId);
  if (!text) {
    if (q && q.npc === npcId) text = `Cháu mang giúp ${q.qty} ${ITEMS[q.item].name} được không? (đang có ${count(q.item)})`;
    else if (req) text = `${first ? greeting() + ' ' : ''}Nhờ bạn chút: mang giúp ${req.qty} ${ITEMS[req.item].name} được không? Mình gửi ${req.reward} xu. (đang có ${count(req.item)})`;
    else {
      // Thoại theo mức thân thiết + nơi đang đứng + mùa
      const place = (ui.place || '').split(':')[0];
      const pool = [...(LINES[npcId]?.[tier(st.pts)] || npc.lines), ...(PLACE_LINES[place] || [])];
      text = Math.random() < 0.2 ? SEASON_LINES[season().id] : pool[Math.floor(Math.random() * pool.length)];
      if (first) text = `${greeting()} ${text}`;
    }
  }

  const choices = [];
  const fest = festivalChoice(npcId);
  if (fest) choices.push(fest);
  const open = shopOpen();
  const shop = { store: storePanel, carpenter: carpenterPanel, ranch: ranchPanel }[npc.role];
  if (shop) {
    const label = { store: 'Mua hạt giống', carpenter: 'Xây dựng', ranch: 'Mua vật nuôi' }[npc.role];
    choices.push({ label, onClick: () => (open ? openPanel(shop) : toast('Cửa hàng mở từ 8:00 đến 18:00')) });
  }
  if (npc.role === 'miner') {
    choices.push({ label: 'Bán khoáng sản', onClick: () => openPanel(mineralPanel) });
    choices.push({ label: 'Đập hốc đá', onClick: () => openPanel(geodePanel) });
  }
  if (req && has(req.item, req.qty)) {
    choices.push({
      label: `Giao ${req.qty} ${ITEMS[req.item].name}`,
      onClick: () => {
        addItem(req.item, -req.qty);
        earnCoins(req.reward);
        st.pts = Math.min(50, st.pts + 8);
        req.done = true;
        sfx('success');
        talk(npcId, `Cảm ơn nhiều nha! Đây là ${req.reward} xu. Có bạn đúng là may thiệt!`, false);
        changed();
      },
    });
  }
  if (q && q.npc === npcId && has(q.item, q.qty)) {
    choices.push({
      label: `Giao ${q.qty} ${ITEMS[q.item].name}`,
      onClick: () => {
        addItem(q.item, -q.qty);
        state.coins += q.reward;
        st.pts = Math.min(50, st.pts + 6);
        state.quest = null;
        sfx('success');
        talk(npcId, `Tuyệt quá! Đây là ${q.reward} xu, cảm ơn cháu nhiều!`, false);
        changed();
      },
    });
  }
  if (!st.gifted) choices.push({ label: 'Tặng quà', onClick: () => openPanel(giftPanel(npcId)) });
  choices.push({ label: 'Tạm biệt', onClick: null });

  sfx('talk', 0.35);
  bus.emit('dialog', { face: `face_${npcId}`, name: `${npc.name}  ${hearts(st.pts)}`, text, choices });
  changed();
}

// ---------- Nội thất ----------
const KIND_TEXT = { floor: 'đặt sàn', rug: 'thảm', wall: 'treo tường' };
export function furnShopPanel(cat = 'all') {
  const catName = FURN_CATS.find(([c]) => c === cat)?.[1] || 'Tất cả';
  return {
    title: `Nội thất · ${catName}`,
    face: 'face_tu',
    rows() {
      ensureHome();
      const rows = [];
      // Đổi nhóm
      const i = FURN_CATS.findIndex(([c]) => c === cat);
      const nextCat = FURN_CATS[(i + 1) % FURN_CATS.length];
      rows.push({
        icon: { tex: 'furn', frame: 'wall_cream' },
        name: 'Giấy dán tường & sàn nhà',
        desc: `Nhóm đang xem: ${catName}`,
        buttons: [
          { label: 'Tường', onClick: () => openPanel(wallPanel) },
          { label: 'Sàn', onClick: () => openPanel(floorPanel) },
          { label: `${nextCat[1]} ▶`, onClick: () => openPanel(furnShopPanel(nextCat[0])) },
        ],
      });
      const lv = farmLevel();
      for (const [id, f] of Object.entries(FURN)) {
        if (!f.price || (cat !== 'all' && f.cat !== cat)) continue;
        const lock = f.lv && lv < f.lv ? `Cần uy tín cấp ${f.lv}` : null;
        rows.push({
          icon: { tex: f.tex || 'furn', frame: f.frame },
          name: `${f.name} — ${f.price} xu`,
          desc: lock || `${KIND_TEXT[f.kind]} · ${f.fw}×${f.fh} ô · trong kho: ${ownedCount(id)}`,
          buttons: lock
            ? [{ label: `Cấp ${f.lv}`, disabled: true, onClick: () => {} }]
            : [
                {
                  label: 'Mua',
                  disabled: state.coins < f.price,
                  onClick: () => {
                    if (!pay(f.price)) return;
                    addOwned(id, 1);
                    sfx('coin');
                    toast(`Đã mua ${f.name}! Về nhà bấm "Trang trí" để đặt.`);
                    changed();
                  },
                },
              ],
        });
      }
      return rows;
    },
  };
}

function stylePanel(kind) {
  const table = kind === 'wall' ? WALLS : FLOORS;
  return {
    title: kind === 'wall' ? 'Giấy dán tường' : 'Sàn nhà',
    face: 'face_tu',
    rows() {
      const H = ensureHome();
      return Object.entries(table).map(([id, t]) => {
        const have = H.styles[kind].includes(id);
        const cur = H[kind] === id;
        const apply = () => {
          H[kind] = id;
          bus.emit('homeStyle');
          sfx('plant', 0.4);
          changed();
        };
        return {
          icon: { tex: 'furn', frame: `${kind}_${id}` },
          name: `${t.name}${cur ? ' (đang dùng)' : ''}`,
          desc: have ? 'Đã có — đổi miễn phí bất cứ lúc nào' : `${t.price} xu`,
          buttons: have
            ? [{ label: 'Dùng', disabled: cur, onClick: apply }]
            : [
                {
                  label: 'Mua',
                  disabled: state.coins < t.price,
                  onClick: () => {
                    if (!pay(t.price)) return;
                    H.styles[kind].push(id);
                    sfx('coin');
                    toast(`Đã mua ${t.name}!`);
                    apply();
                  },
                },
              ],
        };
      });
    },
  };
}
export const wallPanel = stylePanel('wall');
export const floorPanel = stylePanel('floor');
