// Bảng: Bàn chế tạo (nâng cấp căn cứ + chế đồ) và Trạm đổi hàng của Anh Ba
import { ITEMS } from './config.js';
import { state, bus, changed, toast, sfx, addItem, count, roomFor } from './state.js';
import { BASE, baseLv, CRAFTS, CRAFT_INFO, costText, canPay, pay, todayTrades, SHOP_AMMO } from './survival.js';

const icon = (id) => ({ tex: ITEMS[id].tex, frame: ITEMS[id].frame });
const BASE_ICON = { bench: 'workbench', fence: 'sandbags', medic: 'medkit', water: 'water', generator: 'battery' };
const baseIcon = (id) => (ITEMS[BASE_ICON[id]] ? icon(BASE_ICON[id]) : { tex: 'surv', frame: BASE_ICON[id] });

export const basePanel = {
  title: 'Căn cứ — nâng cấp công trình',
  rowH: 76,
  rows() {
    const lvB = baseLv('bench');
    const rows = [lvB
      ? { icon: icon('w_machete'), name: 'Chế tạo vũ khí & đồ dùng', desc: `Bàn chế tạo cấp ${lvB} — chế băng gạc, đạn, vũ khí...`, buttons: [{ label: 'Mở', onClick: () => bus.emit('panel', craftPanel) }] }
      : { icon: icon('w_machete'), name: 'Chế tạo vũ khí & đồ dùng', desc: 'Xây "Bàn chế tạo" cấp 1 ngay bên dưới để bắt đầu chế đồ', buttons: [] }];
    for (const [id, B] of Object.entries(BASE)) {
      const lv = baseLv(id);
      const max = lv >= B.cost.length;
      const next = B.cost[lv];
      rows.push({
        icon: baseIcon(id),
        name: `${B.name} — cấp ${lv}/${B.cost.length}`,
        desc: max ? `Đã tối đa. ${B.desc[lv - 1]}` : `Lên cấp ${lv + 1}: ${B.desc[lv]}\nCần ${costText(next)}`,
        buttons: max ? [] : [{
          label: 'Xây', disabled: !canPay(next),
          onClick: () => {
            if (!canPay(next)) return toast('Chưa đủ vật liệu');
            pay(next);
            state.base = { ...(state.base || {}), [id]: lv + 1 };
            sfx('fanfare', 0.5);
            toast(`${B.name} lên cấp ${lv + 1}!`);
            changed();
            bus.emit('baseUpgraded', id);
          },
        }],
      });
    }
    return rows;
  },
};

export const craftPanel = {
  title: 'Bàn chế tạo',
  rowH: 64,
  rows() {
    const lv = baseLv('bench');
    if (lv < 1) return [{ name: 'Chưa có bàn chế tạo', desc: 'Xây "Bàn chế tạo" cấp 1 trong bảng Căn cứ (cần 20 gỗ, 5 sắt vụn)', buttons: [{ label: 'Căn cứ', onClick: () => bus.emit('panel', basePanel) }] }];
    // Món chế được: món đủ đồ lên trước
    const open = CRAFTS.filter((r) => r.lv <= lv).sort((a, b) => canPay(b.cost) - canPay(a.cost));
    const rows = open.map((r) => ({
      icon: icon(r.id),
      name: `${ITEMS[r.id].name}${r.n > 1 ? ` × ${r.n}` : ''} — ${CRAFT_INFO[r.id] || ''}`,
      desc: `Cần ${costText(r.cost)}`,
      buttons: [{
        label: 'Chế', disabled: !canPay(r.cost),
        onClick: () => {
          if (!canPay(r.cost)) return toast('Chưa đủ vật liệu');
          if (!roomFor(r.id)) return;
          pay(r.cost);
          addItem(r.id, r.n);
          sfx('success', 0.4);
          toast(`Đã chế ${r.n > 1 ? `${r.n} ` : ''}${ITEMS[r.id].name}!`);
          changed();
        },
      }],
    }));
    // Món của cấp kế tiếp: gộp thành 1 dòng gợi ý
    const next = CRAFTS.filter((r) => r.lv === lv + 1);
    if (next.length)
      rows.push({
        icon: { tex: 'surv', frame: 'workbench' },
        name: `Nâng Bàn chế tạo lên cấp ${lv + 1} để mở thêm`,
        desc: next.map((r) => ITEMS[r.id].name).join(', '),
        buttons: [{ label: 'Căn cứ', onClick: () => bus.emit('panel', basePanel) }],
      });
    return rows;
  },
};

export const tradePanel = {
  title: 'Trạm đổi hàng — Anh Ba',
  rowH: 64,
  face: 'face_ba',
  rows() {
    const rows = todayTrades().map((t) => {
      const [gid, gn] = Object.entries(t.give)[0];
      const [rid, rn] = Object.entries(t.get)[0];
      const ok = count(gid) >= gn;
      return {
        icon: icon(rid),
        name: `Đổi ${gn} ${ITEMS[gid].name} → ${rn} ${ITEMS[rid].name}`,
        desc: `Đang có ${count(gid)} ${ITEMS[gid].name} · mối hàng đổi mỗi ngày`,
        buttons: [{
          label: 'Đổi', disabled: !ok,
          onClick: () => {
            if (count(gid) < gn) return toast(`Thiếu ${ITEMS[gid].name}`);
            if (!roomFor(rid)) return;
            addItem(gid, -gn);
            addItem(rid, rn);
            state.stats = state.stats || {};
            state.stats.trades = (state.stats.trades || 0) + 1;
            sfx('coin', 0.5);
            changed();
          },
        }],
      };
    });
    for (const s of SHOP_AMMO)
      rows.push({
        icon: icon(s.id),
        name: `Mua ${s.n} ${ITEMS[s.id].name} — ${s.price} xu`,
        desc: 'Hàng của đội tuần tra',
        buttons: [{
          label: 'Mua', disabled: state.coins < s.price,
          onClick: () => {
            if (state.coins < s.price) return toast('Không đủ xu');
            if (!roomFor(s.id)) return;
            state.coins -= s.price;
            addItem(s.id, s.n);
            sfx('coin', 0.5);
            changed();
          },
        }],
      });
    return rows;
  },
};
