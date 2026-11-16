// Bảng: Bàn chế tạo (nâng cấp căn cứ + chế đồ) và Trạm đổi hàng của Anh Ba
import { ITEMS } from './config.js';
import { state, bus, changed, toast, sfx, addItem, count, roomFor } from './state.js';
import { BASE, baseLv, CRAFTS, costText, canPay, pay, todayTrades, SHOP_AMMO } from './survival.js';

const icon = (id) => ({ tex: ITEMS[id].tex, frame: ITEMS[id].frame });
const BASE_ICON = { bench: 'scrap', fence: 'w_bat', medic: 'medkit', water: 'water', generator: 'battery' };

export const basePanel = {
  title: 'Căn cứ — nâng cấp công trình',
  rowH: 76,
  rows() {
    const rows = [{
      icon: icon('w_machete'), name: 'Chế tạo vũ khí & đồ dùng', desc: `Bàn chế tạo cấp ${baseLv('bench')}`,
      buttons: [{ label: 'Mở', onClick: () => bus.emit('panel', craftPanel) }],
    }];
    for (const [id, B] of Object.entries(BASE)) {
      const lv = baseLv(id);
      const max = lv >= B.cost.length;
      const next = B.cost[lv];
      rows.push({
        icon: icon(BASE_ICON[id]),
        name: `${B.name} — cấp ${lv}/${B.cost.length}`,
        desc: max ? `Đã tối đa. ${B.desc[lv - 1]}` : `Lên cấp ${lv + 1}: ${B.desc[lv]}\nCần: ${costText(next)}`,
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
    if (lv < 1) return [{ name: 'Chưa có bàn chế tạo', desc: 'Xây "Bàn chế tạo" cấp 1 trong bảng Căn cứ (cần 20 gỗ, 5 sắt vụn)', buttons: [] }];
    return CRAFTS.map((r) => {
      const locked = r.lv > lv;
      return {
        icon: icon(r.id),
        name: `${ITEMS[r.id].name}${r.n > 1 ? ` × ${r.n}` : ''}`,
        desc: locked ? `Cần bàn chế tạo cấp ${r.lv}` : costText(r.cost),
        buttons: locked ? [] : [{
          label: 'Chế', disabled: !canPay(r.cost),
          onClick: () => {
            if (!canPay(r.cost)) return toast('Chưa đủ vật liệu');
            if (!roomFor(r.id)) return;
            pay(r.cost);
            addItem(r.id, r.n);
            sfx('success', 0.4);
            changed();
          },
        }],
      };
    });
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
