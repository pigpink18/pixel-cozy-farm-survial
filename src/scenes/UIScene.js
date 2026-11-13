import Phaser from 'phaser';
import { ITEMS, NPCS, ANIMALS, SKILLS, XP_LEVELS, FESTIVALS, MAX_ENERGY, TICK_MS, DAY_END, DAYS_PER_SEASON, CHEST_SLOTS, BAG_START } from '../config.js';
import { isTouchDevice } from '../state.js';
import { state, ui, bus, changed, save, toast, sfx, season, clockText, hotbarItems, selected, count, resetGame, waterCap, hearts, addItem, bagSlots, bagHasRoom } from '../state.js';
import { skillLv, skillProgress, maxHp } from '../skills.js';
import { birthdayText } from '../festivals.js';
import { craftRows, furnShopPanel, wallPanel, floorPanel } from '../shops.js';
import { FURN, FURN_CATS, ownedCount, ensureHome } from '../furniture.js';
import Lofi from '../lofi.js';
import { growCrops } from '../crops.js';
import Fishing from '../fishing.js';
import { STORES } from '../config.js';
import { absMin } from '../hayday.js';
import { BUILDINGS } from '../config.js';
import { farmLevel, farmProgress, onHour, storeFor, storeUsed, storeCap, storable, upgradeStore, costText as hdCost } from '../hayday.js';

import { text, textLight, box, buttonKey, C } from '../ui/theme.js';
const WEATHER = { sun: 'Nắng', rain: 'Mưa', snow: 'Tuyết' };

const SLOT = 56;
const GAP = 6;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.W = W;
    this.H = H;
    this.isTouch = state.touchPref ?? isTouchDevice(this.sys.game);
    this.uiRects = [];
    this.acc = 0;
    this.mapId = this.scene.get('World')?.mapId || 'farm';

    // Lớp đêm & thời tiết nằm dưới cùng
    this.night = this.add.rectangle(0, 0, W, H, 0x0b1030, 1).setOrigin(0).setAlpha(0);
    this.weatherG = this.add.graphics();
    this.drops = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 0.8 }));

    this.buildStatus();
    this.buildTopButtons();
    this.hotbar = this.add.container(0, 0);
    this.hotbarSig = '';
    this.buildHotbar();

    this.fishing = new Fishing(this);
    this.input.on('pointerdown', () => this.fishing.active && this.fishing.press());
    this.buildTouchControls();

    this.hintText = this.add.text(W / 2, H - SLOT - 44, '', textLight(this.isTouch ? 19 : 16, C.gold)).setOrigin(0.5);
    this.toastText = this.add.text(W / 2, H - SLOT - 82, '', textLight(this.isTouch ? 21 : 19)).setOrigin(0.5, 1).setAlign('center').setAlpha(0).setDepth(400); // luôn nổi trên bảng cửa hàng
    this.keyHelp = this.add.text(W - 14, 64, 'Click: đi / làm việc  ·  WASD + Space\n1–9: chọn đồ  ·  I: túi đồ  ·  Esc: đóng', textLight(12)).setOrigin(1, 0).setAlign('right');
    this.applyTouchMode();
    // Chạm màn hình thật → bật nút điều khiển (kể cả khi máy tự nhận là máy tính)
    this.input.on('pointerdown', (p) => {
      const touch = p.wasTouch || p.event?.pointerType === 'touch' || p.event?.type?.startsWith('touch');
      if (touch && !this.isTouch && state.touchPref == null) this.applyTouchMode(true);
    });
    // Đổi chế độ giả lập điện thoại / xoay màn hình → nhận diện lại
    const recheck = () => state.touchPref == null && this.applyTouchMode(isTouchDevice(this.sys.game));
    const mq = window.matchMedia?.('(pointer: coarse)');
    mq?.addEventListener?.('change', recheck);
    window.addEventListener('resize', recheck);
    this.events.once('shutdown', () => {
      mq?.removeEventListener?.('change', recheck);
      window.removeEventListener('resize', recheck);
    });

    this.setupKeys();
    this.input.mouse?.disableContextMenu();
    ui.hitTest = (x, y) => !!ui.modal || this.uiRects.some((r) => r.contains(x, y)) || (this.isTouch && this.touchRects?.some((r) => r.contains(x, y))) || this.hotbarRect?.contains(x, y);

    const on = (ev, fn) => bus.on(ev, fn, this);
    on('changed', this.refresh);
    on('toast', this.showToast);
    on('hint', (h) => this.hintText.setText(h));
    on('sfx', (name, volume) => this.cache.audio.exists(`sfx_${name}`) && this.sound.play(`sfx_${name}`, { volume: volume * 0.7 }));
    on('dialog', this.openDialog);
    on('panel', this.openPanel);
    on('closePanel', () => this.closeModal());
    on('gain', (id, n) => this.showGain(id, n));
    on('levelUp', (lv, list) => {
      const text = `Dân làng tin tưởng bạn hơn rồi! Uy tín lên cấp ${lv}.` + (list.length ? `\nMở khoá: ${list.join(', ')}` : '');
      if (ui.modal) this.showToast(text, 5000);
      else bus.emit('dialog', { face: 'portrait', name: `Uy tín cấp ${lv}!`, text, choices: [{ label: 'Tuyệt vời!', onClick: null }] });
    });
    on('flyToBag', this.flyToBag);
    on('openStorage', (key) => this.openStorage(key));
    // Đài radio trong nhà: đổi giai điệu
    on('radio', () => {
      const list = ['spring', 'summer', 'autumn', 'winter', 'village'];
      this.radioIdx = ((this.radioIdx ?? list.indexOf(season().id)) + 1) % list.length;
      this.lofi?.play(list[this.radioIdx]);
      this.showToast(state.muted ? 'Âm thanh đang tắt — bấm "Âm: tắt" để bật' : `Đài đang phát nhạc ${['mùa xuân', 'mùa hạ', 'mùa thu', 'mùa đông', 'làng quê'][this.radioIdx]} ♪`);
    });
    on('fishStart', (where) => this.fishing.start(where));
    on('action', () => this.fishing.active && this.fishing.press());
    on('decoMode', (on) => (on ? this.openDecoBar() : this.closeDecoBar()));
    on('decoHeld', (id) => {
      this.decoHeldId = id;
      if (this.decoC) this.buildDecoBar();
    });
    on('mapChanged', (id) => {
      this.mapId = id;
      if (this.decoC) this.closeDecoBar();
      this.updateLeaveBtn();
      this.closeModal();
      this.playMusic();
    });
    on('newDay', (notes) => {
      const s = season();
      this.showToast([`${s.name} · Ngày ${state.day} · ${WEATHER[state.weather]}`, ...notes].join('\n'), 5000);
      if (state.mail?.length) this.time.delayedCall(1200, () => this.showMail());
    });
    this.events.once('shutdown', () => bus.removeAllListeners());

    this.sound.mute = !!state.muted;
    // Trình duyệt chỉ cho phát âm thanh sau lần chạm/click đầu tiên
    if (this.sound.locked) {
      const tip = this.add.text(W / 2, 140, 'Chạm vào màn hình để bật âm thanh', textLight(17, C.gold)).setOrigin(0.5);
      this.tweens.add({ targets: tip, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
      this.sound.once('unlocked', () => {
        tip.destroy();
        this.playMusic();
      });
    }
    this.setupLofi();
    this.refresh();
  }

  // =========================================================
  //  Bảng trạng thái
  // =========================================================
  buildStatus() {
    box(this, 'ui_frame', 10, 10, 340, 112);
    this.uiRects.push(new Phaser.Geom.Rectangle(10, 10, 340, 112));
    box(this, 'ui_slot', 22, 24, 66, 72, 2);
    this.add.image(55, 60, 'portrait').setScale(1);
    // Cấp độ nông trại (kiểu Hay Day)
    this.lvBadge = this.add.text(55, 100, '', textLight(12, C.gold)).setOrigin(0.5);
    this.add.rectangle(24, 110, 62, 5, 0x734c44).setOrigin(0, 0.5);
    this.lvBar = this.add.rectangle(24, 110, 62, 5, 0xfdd179).setOrigin(0, 0.5);
    this.dateText = this.add.text(98, 18, '', text(16));
    this.clockText = this.add.text(98, 41, '', text(16, '#bfe3ff'));
    // Ô tiền riêng, nổi bật ngay dưới bảng trạng thái
    box(this, 'ui_wood', 10, 126, 168, 44);
    this.uiRects.push(new Phaser.Geom.Rectangle(10, 126, 168, 44));
    this.add.image(36, 148, 'ui_coin').setScale(2.2);
    this.coinText = this.add.text(56, 148, '', textLight(19, C.gold)).setOrigin(0, 0.5);
    const bar = (y, color) => {
      this.add.rectangle(98, y, 234, 14, 0x734c44).setOrigin(0, 0.5).setStrokeStyle(2, 0x3d3333);
      const b = this.add.rectangle(98, y, 234, 14, color).setOrigin(0, 0.5);
      const t = this.add.text(215, y, '', textLight(11)).setOrigin(0.5);
      return [b, t];
    };
    [this.hpBar, this.hpText] = bar(88, 0xb55945);
  }

  buildTopButtons() {
    let x = this.W - 14;
    const add = (label, w, onClick, color) => {
      x -= w;
      const b = this.button(x + w / 2, 32, label, onClick, w, color, 38);
      this.uiRects.push(new Phaser.Geom.Rectangle(x, 13, w, 38));
      x -= 8;
      return b;
    };
    if (this.scale.fullscreen.available)
      add('Toàn màn hình', 140, () => {
        if (this.scale.isFullscreen) return this.scale.stopFullscreen();
        this.scale.startFullscreen();
        screen.orientation?.lock?.('landscape').catch(() => {});
      }, 0x46607a);
    this.muteBtn = add('', 96, () => {
      state.muted = !state.muted;
      this.sound.mute = state.muted;
      this.muteBtn.label.setText(state.muted ? 'Âm: tắt' : 'Âm: bật');
      save();
    }, 0x5b4a7a);
    this.muteBtn.label.setText(state.muted ? 'Âm: tắt' : 'Âm: bật');
    this.bagBtn = add('Túi đồ (I)', 120, () => this.openInventory(), 0x8a6a2f);
    this.touchBtn = add('', 120, () => {
      state.touchPref = !this.isTouch;
      this.applyTouchMode(state.touchPref);
      save();
    }, 0x46607a);
    // Nút "Ra ngoài": chỉ hiện khi ở trong nhà / cửa hàng (cửa ra có thể bị thanh công cụ che)
    const lw = 150, lx = this.W - 14 - lw, ly = 150;
    this.leaveRect = new Phaser.Geom.Rectangle(lx, ly - 20, lw, 40);
    this.leaveBtn = this.button(lx + lw / 2, ly, 'Ra ngoài ↓', () => bus.emit('leaveRoom'), lw, 0xb5603a, 40);
    // Nút "Trang trí": chỉ trong nhà
    this.decoRectBtn = new Phaser.Geom.Rectangle(lx, ly + 28, lw, 40);
    this.decoBtn = this.button(lx + lw / 2, ly + 48, 'Trang trí ✎', () => bus.emit('decoStart'), lw, 0x5a8f3c, 40);
    this.updateLeaveBtn();
  }

  updateLeaveBtn() {
    if (!this.leaveBtn) return;
    const on = ['home', 'shop', 'npchome'].includes(this.mapId) && !ui.deco;
    const home = this.mapId === 'home' && !ui.deco;
    this.leaveBtn.setVisible(on);
    this.decoBtn.setVisible(home);
    this.uiRects = this.uiRects.filter((r) => r !== this.leaveRect && r !== this.decoRectBtn);
    if (on) this.uiRects.push(this.leaveRect);
    if (home) this.uiRects.push(this.decoRectBtn);
  }

  // =========================================================
  //  Chế độ trang trí nhà: ẩn HUD, hiện thanh đồ đạc ở dưới
  // =========================================================
  openDecoBar() {
    ensureHome();
    this.decoCat = this.decoCat || 'all';
    this.decoPage = 0;
    this.decoHidden = this.children.list.filter((o) => o.visible && o !== this.toastText && o !== this.night);
    for (const o of this.decoHidden) o.setVisible(false);
    this.decoBarRect = new Phaser.Geom.Rectangle(0, this.H - 150, this.W, 150);
    this.uiRects.push(this.decoBarRect);
    this.buildDecoBar();
  }

  closeDecoBar() {
    this.decoC?.destroy();
    this.decoC = null;
    for (const o of this.decoHidden || []) if (o.active) o.setVisible(true);
    this.decoHidden = null;
    this.uiRects = this.uiRects.filter((r) => r !== this.decoBarRect);
    this.applyTouchMode(this.isTouch);
    this.updateLeaveBtn();
    this.refresh();
  }

  buildDecoBar() {
    this.decoC?.destroy();
    const W = this.W, H = this.H, y0 = H - 150;
    const c = (this.decoC = this.add.container(0, 0).setDepth(300));
    c.add(box(this, 'ui_frame', 0, y0, W, 150));
    const held = this.decoHeldId;
    c.add(
      this.add
        .text(W / 2, y0 - 8, held ? `Đang cầm: ${FURN[held].name} — bấm chỗ trống để đặt · Xoay · Cất vào kho · Esc: huỷ` : 'Bấm vào đồ trong nhà để nhấc lên & dời chỗ · Chọn món ở dưới để đặt thêm', textLight(15, C.gold))
        .setOrigin(0.5, 1)
    );
    // Hàng nút
    const catName = FURN_CATS.find(([k]) => k === this.decoCat)[1];
    const btns = [
      [`Nhóm: ${catName} ▶`, 170, () => {
        const i = FURN_CATS.findIndex(([k]) => k === this.decoCat);
        this.decoCat = FURN_CATS[(i + 1) % FURN_CATS.length][0];
        this.decoPage = 0;
        this.buildDecoBar();
      }, 0x46607a],
      ['Xoay ⟲', 90, () => bus.emit('decoFlip'), 0x8a6a2f, !held],
      ['Cất vào kho', 120, () => bus.emit('decoStore'), 0x8a6a2f, !held],
      ['Tường', 80, () => this.openPanel(wallPanel), 0x5b4a7a],
      ['Sàn', 70, () => this.openPanel(floorPanel), 0x5b4a7a],
      ['Mua đồ', 100, () => this.openPanel(furnShopPanel(this.decoCat)), 0xb5603a],
      ['Xong ✓', 100, () => bus.emit('decoEnd'), 0x5a8f3c],
    ];
    const total = btns.reduce((a, b) => a + b[1], 0) + (btns.length - 1) * 8;
    let x = (W - total) / 2;
    for (const [label, w, fn, color, disabled] of btns) {
      c.add(this.button(x + w / 2, y0 + 30, label, fn, w, color, 38, !!disabled));
      x += w + 8;
    }
    // Dải đồ trong kho
    const ids = Object.keys(FURN).filter((id) => ownedCount(id) > 0 && (this.decoCat === 'all' || FURN[id].cat === this.decoCat));
    const SZ = 54, GAP = 6, per = Math.floor((W - 120) / (SZ + GAP));
    const pages = Math.max(1, Math.ceil(ids.length / per));
    this.decoPage = Math.min(this.decoPage, pages - 1);
    const show = ids.slice(this.decoPage * per, this.decoPage * per + per);
    const sy = y0 + 100;
    if (!ids.length)
      c.add(this.add.text(W / 2, sy, `Kho chưa có đồ ${this.decoCat === 'all' ? '' : `nhóm "${catName}" `}— bấm "Mua đồ" để sắm thêm`, textLight(16)).setOrigin(0.5));
    let sx = (W - show.length * (SZ + GAP) + GAP) / 2;
    for (const id of show) {
      const f = FURN[id];
      const slot = box(this, 'ui_slot', sx, sy - SZ / 2, SZ, SZ, 2);
      c.add(slot);
      if (id === held) c.add(this.add.rectangle(sx + SZ / 2, sy, SZ - 4, SZ - 4).setStrokeStyle(3, 0xfdd179));
      c.add(this.fitIcon(sx + SZ / 2, sy - 2, f.tex || 'furn', f.frame, 40));
      c.add(this.add.text(sx + SZ - 5, sy + SZ / 2 - 3, `${ownedCount(id)}`, textLight(13)).setOrigin(1, 1));
      const hit = this.add.rectangle(sx + SZ / 2, sy, SZ, SZ, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => bus.emit('decoHold', id));
      hit.on('pointerover', () => this.hintText.setText(f.name));
      c.add(hit);
      sx += SZ + GAP;
    }
    if (pages > 1) {
      c.add(this.button(34, sy, '◀', () => ((this.decoPage = (this.decoPage + pages - 1) % pages), this.buildDecoBar()), 44, 0x46607a, 44));
      c.add(this.button(W - 34, sy, '▶', () => ((this.decoPage = (this.decoPage + 1) % pages), this.buildDecoBar()), 44, 0x46607a, 44));
    }
  }

  // =========================================================
  //  Thanh công cụ
  // =========================================================
  buildHotbar() {
    const items = hotbarItems();
    this.hotbarSig = items.map((i) => i.key + (i.lv || '')).join('|');
    this.hotbar.removeAll(true);
    this.slots = [];
    const totalW = items.length * SLOT + (items.length - 1) * GAP;
    const x0 = (this.W - totalW) / 2;
    const y = this.H - SLOT - 12;
    this.hotbarRect = new Phaser.Geom.Rectangle(x0 - 8, y - 8, totalW + 16, SLOT + 16);
    this.hotbar.add(box(this, 'ui_wood', this.hotbarRect.x - 4, this.hotbarRect.y - 4, this.hotbarRect.width + 8, this.hotbarRect.height + 8));
    items.forEach((it, i) => {
      const x = x0 + i * (SLOT + GAP);
      const bg = box(this, 'ui_slot', x, y, SLOT, SLOT, 2).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.selectSlot(i));
      const sel = box(this, 'ui_sel', x - 3, y - 3, SLOT + 6, SLOT + 6, 3).setVisible(false);
      const icon = this.add.image(x + SLOT / 2, y + SLOT / 2 - 2, it.tex, it.frame).setScale(2.6);
      const num = this.add.text(x + 5, y + 1, this.isTouch ? '' : `${(i + 1) % 10}`, text(11, '#cfcfe0'));
      const cnt = this.add.text(x + SLOT - 4, y + SLOT, '', textLight(13)).setOrigin(1, 1);
      this.hotbar.add([bg, sel, icon, num, cnt]);
      const slot = { it, bg, sel, cnt };
      if (it.tool) {
        slot.lvText = this.add.text(x + SLOT - 4, y + 1, it.lv > 1 ? `Lv${it.lv}` : '', text(11, '#ffd34d')).setOrigin(1, 0);
        this.hotbar.add(slot.lvText);
      }
      if (it.tool === 'can') {
        slot.waterBg = this.add.rectangle(x + 6, y + SLOT - 7, SLOT - 12, 4, 0x000000, 0.6).setOrigin(0, 0.5);
        slot.water = this.add.rectangle(x + 6, y + SLOT - 7, SLOT - 12, 4, 0x6c81a1).setOrigin(0, 0.5);
        this.hotbar.add([slot.waterBg, slot.water]);
      }
      this.slots.push(slot);
    });
  }

  selectSlot(i) {
    const s = this.slots[i];
    if (!s) return;
    state.sel = s.it.key;
    sfx('click', 0.25);
    changed();
  }

  // =========================================================
  //  Cần điều khiển ảo + nút hành động (điện thoại)
  // =========================================================
  // Bật/tắt nút điều khiển cảm ứng (on = undefined: giữ nguyên chế độ hiện tại)
  applyTouchMode(on = this.isTouch) {
    const changedMode = on !== this.isTouch;
    this.isTouch = on;
    this.touchUI?.forEach((o) => o.setVisible(on && !ui.deco));
    this.keyHelp?.setVisible(!on && !ui.deco);
    this.touchBtn?.label.setText(on ? 'Nút ĐK: bật' : 'Nút ĐK: tắt');
    if (!on && this.joy) {
      this.joy.id = null;
      ui.joy = { x: 0, y: 0 };
    }
    if (changedMode && this.slots) {
      this.buildHotbar();
      this.refresh();
    }
  }

  buildTouchControls() {
    const before = this.children.list.length;
    const R = 58;
    const joy = (this.joy = { x: 112, y: this.H - 158, id: null });
    this.add.circle(joy.x, joy.y, R, 0x000000, 0.28).setStrokeStyle(3, 0xffffff, 0.55);
    this.joyThumb = this.add.circle(joy.x, joy.y, 26, 0xffffff, 0.6);
    this.touchRects = [new Phaser.Geom.Rectangle(joy.x - R - 40, joy.y - R - 40, 2 * R + 80, 2 * R + 80)];

    const act = (this.actBtn = { x: this.W - 104, y: this.H - 158, r: 48 });
    this.actCircle = this.add.circle(act.x, act.y, act.r, 0xf4b467, 0.85).setStrokeStyle(3, 0x2b1d14);
    this.actIcon = this.add.image(act.x, act.y - 6, 'tool_hoe').setScale(2.2);
    this.add.text(act.x, act.y + 30, 'Làm', text(13)).setOrigin(0.5);
    this.touchRects.push(new Phaser.Geom.Rectangle(act.x - act.r - 24, act.y - act.r - 24, 2 * act.r + 48, 2 * act.r + 48));
    this.touchUI = this.children.list.slice(before);

    const dist = (p, c) => Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y);
    const move = (p) => {
      let dx = p.x - joy.x, dy = p.y - joy.y;
      const len = Math.hypot(dx, dy);
      if (len > R) (dx *= R / len), (dy *= R / len);
      this.joyThumb.setPosition(joy.x + dx, joy.y + dy);
      ui.joy = len < 12 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
    };
    const release = () => {
      joy.id = null;
      ui.joy = { x: 0, y: 0 };
      this.joyThumb.setPosition(joy.x, joy.y);
    };
    this.input.on('pointerdown', (p) => {
      if (!this.isTouch || (ui.modal && ui.modal !== 'fish')) return;
      if (dist(p, joy) < R + 40 && !ui.modal) {
        joy.id = p.id;
        move(p);
      } else if (dist(p, act) < act.r + 24) {
        this.actCircle.setScale(0.9);
        this.time.delayedCall(120, () => this.actCircle.setScale(1));
        bus.emit('action');
      }
    });
    this.input.on('pointermove', (p) => p.id === joy.id && move(p));
    this.input.on('pointerup', (p) => p.id === joy.id && release());
    this.events.on('update', () => ui.modal && joy.id !== null && release());
  }

  // =========================================================
  //  Cập nhật
  // =========================================================
  refresh() {
    const s = season();
    this.dateText.setText(`${s.name} · Ngày ${state.day}/${DAYS_PER_SEASON} · Năm ${state.year}`);
    this.clockText.setText(`${clockText()} · ${WEATHER[state.weather]}`);
    this.coinText.setText(`${state.coins} xu`);
    this.lvBadge.setText(`Uy tín ${farmLevel()}`);
    this.lvBar.width = 62 * farmProgress();
    this.hpBar.width = 234 * Math.min(1, state.hp / maxHp());
    this.hpText.setText(`Máu ${state.hp}/${maxHp()}`);

    if (this.decoC) this.buildDecoBar();
    selected();
    const cur = hotbarItems().find((i) => i.key === state.sel);
    if (this.actIcon && cur) this.actIcon.setTexture(cur.tex, cur.frame);
    if (hotbarItems().map((i) => i.key + (i.lv || '')).join('|') !== this.hotbarSig) this.buildHotbar();
    for (const sl of this.slots) {
      const on = sl.it.key === state.sel;
      sl.sel.setVisible(on);
      if (sl.it.item) sl.cnt.setText(count(sl.it.item));
      if (sl.water) sl.water.width = (SLOT - 12) * Math.min(1, state.water / waterCap());
      if (sl.lvText) sl.lvText.setText(sl.it.lv > 1 ? `Lv${sl.it.lv}` : '');
    }
    if (ui.modal === 'panel' && this.panelDef) this.renderPanel();
    if (ui.modal === 'inv') this.renderInventory();
    if (ui.modal === 'storage') this.renderStorage();
  }

  showToast(msg, duration = 2000) {
    this.tweens.killTweensOf(this.toastText);
    // Đang mở hộp thoại / bảng: hiện ở phía trên (dưới thanh thông tin) để không đè lên nội dung
    if (ui.modal) this.toastText.setOrigin(0.5, 0).setPosition(this.W / 2, 176);
    else if (ui.deco) this.toastText.setOrigin(0.5, 0).setPosition(this.W / 2, 8); // trang trí: trên cùng, không đè thanh đồ
    else this.toastText.setOrigin(0.5, 1).setPosition(this.W / 2, this.H - SLOT - 82);
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: duration, duration: 500 });
  }

  // =========================================================
  //  Thời gian, đêm, thời tiết
  // =========================================================
  update(time, delta) {
    if (!ui.modal && !ui.transition && !ui.deco) {
      this.acc += delta;
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        state.time += 10;
        const grew = growCrops();
        if (grew.length) bus.emit('cropsGrew', grew);
        // Chuồng trại xây xong
        for (const [id, done] of Object.entries(state.buildDone || {})) {
          if (state.buildings[id] !== 'building') delete state.buildDone[id];
          else if (absMin() >= done) {
            state.buildings[id] = 'built';
            delete state.buildDone[id];
            sfx('success', 0.5);
            toast(`${BUILDINGS[id].name} đã xây xong! Ghé trại Cô Mai mua vật nuôi nhé.`);
            bus.emit('buildingDone', id);
            save();
          }
        }
        if (state.time % 60 === 0) {
          onHour();
          save();
        }
        // Cập nhật bảng đang mở (đồng hồ nhà máy, đơn hàng chờ)
        if (ui.modal === 'panel' && this.panelDef) this.renderPanel();
        if (state.time === 22 * 60) toast('Đã 22 giờ rồi, nên về nhà ngủ thôi.');
        if (state.time === 25 * 60) toast('Đã 1 giờ sáng! Về ngủ ngay kẻo ngất xỉu!');
        if (state.time >= DAY_END) {
          this.acc = 0;
          bus.emit('passout');
          break;
        }
        this.clockText.setText(`${clockText()} · ${WEATHER[state.weather]}`);
      }
    }
    // Trời tối dần từ 17h
    const t = state.time;
    const a = t < 17 * 60 ? 0 : t < 19 * 60 ? ((t - 17 * 60) / 120) * 0.25 : t < 21 * 60 ? 0.25 + ((t - 19 * 60) / 120) * 0.25 : 0.55;
    this.night.setAlpha(this.registry.get('skyFx') ? 0 : a); // có màu trời (WebGL) thì không cần lớp tối
    this.drawWeather(delta);
    this.fishing?.update(delta);
  }

  drawWeather(delta) {
    const g = this.weatherG.clear();
    if (state.weather === 'sun' || ui.transition || ['home', 'mine', 'shop', 'npchome'].includes(this.mapId)) return;
    const snow = state.weather === 'snow';
    const k = delta / 16;
    if (snow) g.fillStyle(0xffffff, 0.85);
    else g.lineStyle(2, 0xbfe3ff, 0.45);
    for (const d of this.drops) {
      if (snow) {
        d.y += 1.2 * d.s * k;
        d.x += Math.sin((d.y + d.s * 100) / 30) * 0.5 * k;
        g.fillRect(d.x, d.y, 3 * d.s, 3 * d.s);
      } else {
        d.y += 12 * d.s * k;
        d.x -= 2.5 * k;
        g.lineBetween(d.x, d.y, d.x - 3, d.y + 10);
      }
      if (d.y > this.H) d.y -= this.H + 10;
      if (d.x < -10) d.x += this.W + 10;
      if (d.x > this.W + 10) d.x -= this.W + 10;
    }
  }

  // =========================================================
  //  Âm thanh
  // =========================================================
  setupLofi() {
    const ctx = this.sound.context;
    if (!ctx) return; // trình duyệt không có Web Audio
    // Lọc bớt âm cao cho mọi hiệu ứng âm thanh → ấm, êm kiểu lofi
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 2600;
    this.sound.masterMuteNode.disconnect();
    this.sound.masterMuteNode.connect(warm).connect(this.sound.masterVolumeNode);
    this.lofi = new Lofi(ctx, this.sound.masterMuteNode);
    this.playMusic();
  }

  playMusic() {
    this.lofi?.play(this.mapId === 'village' ? 'village' : season().id);
  }

  // =========================================================
  //  Phím tắt
  // =========================================================
  setupKeys() {
    const kb = this.input.keyboard;
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'].forEach((n, i) =>
      kb.on(`keydown-${n}`, () => !ui.modal && this.selectSlot(i))
    );
    kb.on('keydown-I', () => (ui.modal === 'inv' ? this.closeModal() : !ui.modal && this.openInventory()));
    kb.on('keydown-ESC', () => (ui.modal ? this.closeModal() : ui.deco && bus.emit('decoEsc')));
    kb.on('keydown-SPACE', () => this.fishing.active && this.fishing.press());
    kb.on('keydown-E', () => this.fishing.active && this.fishing.press());
  }

  // =========================================================
  //  Khung chung
  // =========================================================
  button(x, y, label, onClick, w = 80, color = 0x5a8f3c, h = 40, disabled = false) {
    const b = this.add.container(x, y);
    const bg = box(this, buttonKey(color, disabled), -w / 2, -h / 2, w, h);
    const t = this.add.text(0, -1, label, textLight(14, disabled ? '#d5d6db' : C.paper)).setOrigin(0.5);
    if (!disabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setTint(0xfff0d0)).on('pointerout', () => bg.clearTint()).on('pointerup', () => onClick());
      bg.on('pointerdown', () => (t.y = 1));
    }
    b.add([bg, t]);
    b.label = t;
    return b;
  }

  // Đặt icon vừa khung size×size
  fitIcon(x, y, tex, frame, size = 44) {
    const img = this.add.image(x, y, tex, frame);
    img.setScale(Math.min(size / img.width, size / img.height, 3));
    return img;
  }

  // Mở khung mới: đặt ngay. Đóng: đợi hết frame để cú chạm không lọt xuống bản đồ
  setModal(m) {
    const tok = (this.modalTok = (this.modalTok || 0) + 1);
    if (m) ui.modal = m;
    else this.time.delayedCall(0, () => tok === this.modalTok && (ui.modal = null));
  }

  closeModal() {
    this.dialogC?.destroy();
    this.dialogC = null;
    this.panelC?.destroy();
    this.panelC = null;
    this.panelDef = null;
    if (ui.modal) this.setModal(null);
  }

  modalBg(c) {
    const shade = this.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.45).setOrigin(0).setInteractive();
    c.add(shade);
  }

  // Thư buổi sáng: đọc lần lượt
  showMail() {
    const m = state.mail.shift();
    if (!m) return;
    save();
    const n = NPCS[m.from];
    this.openDialog({
      face: n ? `face_${m.from}` : 'portrait',
      name: `Thư từ ${n ? n.name : 'làng'}`,
      text: m.text,
      choices: [{ label: state.mail.length ? 'Thư tiếp' : 'Đóng', onClick: state.mail.length ? () => this.showMail() : null }],
    });
  }

  // =========================================================
  //  Hộp thoại
  // =========================================================
  openDialog({ face, name, text: msg, choices }) {
    this.closeModal();
    this.setModal('dialog');
    const c = (this.dialogC = this.add.container(0, 0).setDepth(200));
    this.modalBg(c);
    const x = 40, w = this.W - 80, h = 180, y = this.H - h - 20;
    c.add(box(this, 'ui_frame', x, y, w, h));
    c.add(box(this, 'ui_slot', x + 20, y + 20, 104, 104, 2));
    c.add(this.fitIcon(x + 72, y + 72, face, undefined, 96));
    c.add(this.add.text(x + 144, y + 14, name, text(19, '#ffd34d')));
    c.add(this.add.text(x + 144, y + 44, msg, { ...text(17), wordWrap: { width: w - 170 } }));
    let bx = x + w - 16;
    [...choices].reverse().forEach((ch) => {
      const bw = Math.max(110, ch.label.length * 9 + 24);
      bx -= bw;
      c.add(
        this.button(bx + bw / 2, y + h - 30, ch.label, () => {
          sfx(ch.onClick ? 'click' : 'cancel', 0.3);
          this.closeModal();
          if (ch.onClick) this.time.delayedCall(10, ch.onClick);
        }, bw, ch.onClick ? 0x5a8f3c : 0x6b4a4a)
      );
      bx -= 10;
    });
  }

  // =========================================================
  //  Danh sách (cửa hàng, nhiệm vụ, tặng quà)
  // =========================================================
  openPanel(def) {
    this.closeModal();
    this.panelDef = def;
    this.panelPage = 0;
    this.setModal('panel');
    this.renderPanel();
  }

  renderPanel() {
    const def = this.panelDef;
    if (!def) return;
    try {
      this.drawPanel(def);
    } catch (e) {
      // Lỗi dữ liệu (save cũ…) → đóng bảng thay vì để cả màn hình bị khoá
      console.error('Panel lỗi:', def.title, e);
      this.closeModal();
      this.showToast(`Không mở được ${def.title || 'bảng'}, thử lại nhé.`);
    }
  }

  drawPanel(def) {
    const all = def.rows();
    this.panelC?.destroy();
    const rowH = 60;
    const per = Math.floor((this.H - 160) / rowH);
    const pages = Math.max(1, Math.ceil(all.length / per));
    this.panelPage = Math.min(this.panelPage || 0, pages - 1);
    const rows = all.slice(this.panelPage * per, this.panelPage * per + per);
    const w = 720, h = 80 + Math.min(all.length, per) * rowH + 60;
    const x = (this.W - w) / 2, y = Math.max(10, (this.H - h) / 2);
    const c = (this.panelC = this.add.container(0, 0).setDepth(200));
    this.modalBg(c);
    c.add(box(this, 'ui_frame', x, y, w, h));
    if (def.face) c.add(this.fitIcon(x + 40, y + 36, def.face, undefined, 46));
    c.add(this.add.text(x + (def.face ? 74 : 24), y + 22, def.title, text(22, '#ffd34d')));
    this.coinTag(c, x + w - 20, y + 38);
    this.addRows(c, rows, x, y + 72, w, rowH);
    c.add(this.button(x + w / 2, y + h - 32, 'Đóng', () => this.closeModal(), 140, 0x6b4a4a));
    this.addPager(c, x, y + h - 32, w, this.panelPage, pages, (pg) => {
      this.panelPage = pg;
      this.renderPanel();
    });
  }

  // Số tiền có biểu tượng đồng xu (căn phải tại x, giữa theo y)
  coinTag(c, x, y) {
    const t = this.add.text(x, y, `${state.coins} xu`, text(18, '#ffd34d')).setOrigin(1, 0.5);
    c.add([t, this.add.image(x - t.width - 16, y, 'ui_coin').setScale(2)]);
  }

  // Nút chuyển trang ◀ 1/2 ▶
  addPager(c, x, y, w, page, pages, go) {
    if (pages <= 1) return;
    c.add(this.button(x + 70, y, '◀ Trước', () => go(Math.max(0, page - 1)), 110, 0x46607a, 40, page === 0));
    c.add(this.button(x + w - 70, y, 'Sau ▶', () => go(Math.min(pages - 1, page + 1)), 110, 0x46607a, 40, page === pages - 1));
    c.add(this.add.text(x + w / 2 + 120, y, `${page + 1}/${pages}`, text(15, '#cfcfe0')).setOrigin(0.5));
  }

  addRows(c, rows, x, y, w, rowH) {
    rows.forEach((r, i) => {
      const ry = y + i * rowH;
      c.add(box(this, 'ui_row', x + 16, ry, w - 32, rowH - 6, 2));
      const tx = r.icon ? x + 76 : x + 28;
      if (r.icon) c.add(this.fitIcon(x + 44, ry + (rowH - 6) / 2, r.icon.tex, r.icon.frame, 42));
      c.add(this.add.text(tx, ry + 6, r.name, text(17)));
      c.add(this.add.text(tx, ry + 30, r.desc || '', text(13, '#cfcfe0')));
      let bx = x + w - 24;
      [...r.buttons].reverse().forEach((b) => {
        bx -= 84;
        c.add(this.button(bx + 42, ry + (rowH - 6) / 2, b.label, b.onClick, 80, 0x5a8f3c, 38, b.disabled));
        bx -= 6;
      });
    });
  }

  // =========================================================
  //  Túi đồ + chế tạo
  // =========================================================
  openInventory(tab = 'inv') {
    this.closeModal();
    sfx('click', 0.3);
    this.setModal('inv');
    this.menuTab = tab;
    this.invInfo = 'Chạm vào món đồ để xem thông tin (món dùng được sẽ được chọn luôn)';
    this.renderInventory();
  }

  // Menu nhiều tab: Túi đồ · Kỹ năng · Quan hệ · Lịch
  renderInventory() {
    this.panelC?.destroy();
    const w = 760, h = this.H - 20;
    const x = (this.W - w) / 2, y = 10;
    const c = (this.panelC = this.add.container(0, 0).setDepth(200));
    this.modalBg(c);
    c.add(box(this, 'ui_frame', x, y, w, h));
    const tabs = [['inv', 'Túi đồ'], ['skills', 'Kỹ năng'], ['social', 'Quan hệ'], ['cal', 'Lịch']];
    tabs.forEach(([id, label], i) => {
      const on = this.menuTab === id;
      c.add(this.button(x + 84 + i * 130, y + 32, label, () => ((this.menuTab = id), sfx('click', 0.25), this.renderInventory()), 122, on ? 0xb07a2f : 0x45455a, 38));
    });
    this.coinTag(c, x + w - 20, y + 26);
    const body = { x, y: y + 64, w, h: h - 64 - 56 };
    ({ inv: () => this.tabInventory(c, body), skills: () => this.tabSkills(c, body), social: () => this.tabSocial(c, body), cal: () => this.tabCalendar(c, body) })[this.menuTab]();
    c.add(this.button(x + w / 2 - (this.menuTab === 'inv' ? 80 : 0), y + h - 30, 'Đóng', () => this.closeModal(), 140, 0x6b4a4a));
    if (this.menuTab === 'inv')
      c.add(this.button(x + w / 2 + 80, y + h - 30, 'Chơi lại', () => window.confirm('Xoá dữ liệu và chơi lại từ đầu?') && resetGame(), 140, 0x8a3b3b));
  }

  tabInventory(c, { x, y, w, h }) {
    const ids = Object.keys(state.inv).filter((id) => count(id) > 0 && ITEMS[id]);
    c.add(this.add.text(x + w - 20, y - 12, `Túi: ${bagSlots()}/${state.bagSize || BAG_START} ô`, text(14, bagSlots() >= (state.bagSize || BAG_START) ? '#ffb070' : '#cfcfe0')).setOrigin(1, 0.5));
    const cols = 12, cell = 56, gridRows = Math.max(1, Math.min(4, Math.ceil(ids.length / cols)));
    const gx = x + (w - cols * cell) / 2, gy = y;
    if (!ids.length) c.add(this.add.text(x + w / 2, gy + 24, 'Túi trống', text(16, '#cfcfe0')).setOrigin(0.5));
    ids.slice(0, cols * 4).forEach((id, i) => {
      const cx = gx + (i % cols) * cell, cy = gy + Math.floor(i / cols) * cell;
      const it = ITEMS[id];
      const usable = it.seed || it.place || it.home || it.eat;
      const on = state.sel === `item:${id}`;
      const bg = box(this, 'ui_slot', cx + 2, cy + 2, cell - 4, cell - 4, 2).setInteractive({ useHandCursor: true });
      if (on) c.add(box(this, 'ui_sel', cx - 1, cy - 1, cell + 2, cell + 2, 3));
      bg.on('pointerup', () => {
        if (usable) state.sel = `item:${id}`;
        const use = it.eat ? `ăn: +${it.eat.e} sức, +${it.eat.h} máu` : it.seed ? 'gieo vào đất đã cuốc' : it.place ? 'đặt trên nông trại' : it.home ? 'đặt trong nhà' : '';
        this.invInfo = `${it.name} × ${count(id)}` + (it.sell ? ` · bán ${it.sell} xu` : '') + (use ? ` · ${use}${usable ? ' (đã chọn)' : ''}` : '');
        changed();
      });
      c.add([bg, this.fitIcon(cx + cell / 2, cy + cell / 2, it.tex, it.frame, 38), this.add.text(cx + cell - 5, cy + cell - 1, count(id), textLight(12)).setOrigin(1, 1)]);
    });
    const iy = gy + gridRows * cell + 6;
    c.add(this.add.text(x + w / 2, iy, this.invInfo, text(14, '#ffe9a8')).setOrigin(0.5, 0));
    // Chế tạo (phân trang theo chỗ trống còn lại)
    const all = craftRows();
    const top = iy + 30;
    const per = Math.max(1, Math.floor((y + h - top - 36) / 58));
    const pages = Math.ceil(all.length / per);
    this.craftPage = Math.min(this.craftPage || 0, pages - 1);
    c.add(this.add.text(x + 24, top, 'Chế tạo', text(19, '#ffd34d')));
    this.addRows(c, all.slice(this.craftPage * per, this.craftPage * per + per), x, top + 32, w, 58);
    if (pages > 1) {
      c.add(this.button(x + w - 130, top + 12, '◀', () => ((this.craftPage = Math.max(0, this.craftPage - 1)), this.renderInventory()), 50, 0x46607a, 32, this.craftPage === 0));
      c.add(this.add.text(x + w - 88, top + 12, `${this.craftPage + 1}/${pages}`, text(14, '#cfcfe0')).setOrigin(0.5));
      c.add(this.button(x + w - 46, top + 12, '▶', () => ((this.craftPage = Math.min(pages - 1, this.craftPage + 1)), this.renderInventory()), 50, 0x46607a, 32, this.craftPage === pages - 1));
    }
  }

  tabSkills(c, { x, y, w }) {
    const icons = { farming: 'tool_hoe', mining: 'tool_pickaxe', foraging: 'tool_axe', fishing: 'tool_rod', combat: 'tool_sword' };
    Object.entries(SKILLS).forEach(([k, sk], i) => {
      const ry = y + i * 76;
      const lv = skillLv(k);
      c.add(box(this, 'ui_row', x + 18, ry, w - 36, 70, 2));
      c.add(this.fitIcon(x + 50, ry + 35, icons[k], undefined, 40));
      c.add(this.add.text(x + 84, ry + 6, `${sk.name} — cấp ${lv}`, text(18)));
      c.add(this.add.rectangle(x + 84, ry + 40, 320, 12, 0x000000, 0.6).setOrigin(0, 0.5));
      c.add(this.add.rectangle(x + 84, ry + 40, 320 * skillProgress(k), 12, 0x7ad34f).setOrigin(0, 0.5));
      c.add(this.add.text(x + 414, ry + 40, lv >= 10 ? 'TỐI ĐA' : `${state.skills[k] || 0}/${XP_LEVELS[lv + 1]} XP`, text(12, '#cfcfe0')).setOrigin(0, 0.5));
      c.add(this.add.text(x + 84, ry + 50, sk.perk, text(12, '#ffe9a8')));
    });
  }

  tabSocial(c, { x, y, w }) {
    Object.entries(NPCS).forEach(([id, n], i) => {
      const ry = y + i * 70;
      const st = state.npcs[id];
      c.add(box(this, 'ui_row', x + 18, ry, w - 36, 64, 2));
      c.add(this.fitIcon(x + 48, ry + 32, `face_${id}`, undefined, 50));
      c.add(this.add.text(x + 84, ry + 6, `${n.name}  ${hearts(st.pts)}`, text(18)));
      const loves = n.loves.map((l) => ITEMS[l].name).join(', ');
      c.add(this.add.text(x + 84, ry + 34, `Sinh nhật: ${birthdayText(id)} · Thích: ${loves}`, text(13, '#cfcfe0')));
      c.add(this.add.text(x + w - 30, ry + 10, `${st.talked ? '✓' : '○'} Trò chuyện\n${st.gifted ? '✓' : '○'} Tặng quà`, text(13, st.talked ? '#9be07a' : '#cfcfe0')).setOrigin(1, 0).setAlign('right'));
    });
    if (state.animals.length)
      c.add(this.add.text(x + 24, y + 5 * 70 + 6, `Vật nuôi: ${state.animals.map((a) => `${ANIMALS[a.type].name} ${a.name} ${hearts(a.pts)}`).join(' · ')}`, { ...text(13, '#ffe9a8'), wordWrap: { width: w - 48 } }));
  }

  tabCalendar(c, { x, y, w }) {
    const s = season();
    c.add(this.add.text(x + w / 2, y, `Mùa ${s.name} — Năm ${state.year}`, text(20, '#ffd34d')).setOrigin(0.5, 0));
    const cw = 100, ch = 150, gx = x + (w - 7 * cw) / 2, gy = y + 34;
    for (let d = 1; d <= DAYS_PER_SEASON; d++) {
      const i = d - 1;
      const cx = gx + (i % 7) * cw, cy = gy + Math.floor(i / 7) * ch;
      const today = d === state.day;
      c.add(box(this, 'ui_row', cx + 3, cy + 3, cw - 6, ch - 6, 2));
      if (today) c.add(box(this, 'ui_sel', cx + 1, cy + 1, cw - 2, ch - 2, 3));
      c.add(this.add.text(cx + 10, cy + 8, `${d}`, text(18, today ? '#ffd34d' : '#ffffff')));
      const marks = [];
      const f = FESTIVALS.find((x2) => x2.season === state.season && x2.day === d);
      if (f) marks.push(f.name);
      for (const [, n] of Object.entries(NPCS)) if (n.birthday?.season === state.season && n.birthday.day === d) marks.push(`Sinh nhật ${n.name}`);
      if (marks.length) c.add(this.add.text(cx + 10, cy + 38, marks.join('\n'), { ...text(13, f ? '#ffb070' : '#9be0ff'), wordWrap: { width: cw - 18 } }));
    }
  }

  // =========================================================
  //  Thông báo nhận đồ (góc trái, kiểu Stardew)
  // =========================================================
  // Nông sản bay từ ruộng vào nút Túi đồ
  flyToBag({ x, y, tex, frame, scale }) {
    const b = this.bagBtn;
    if (!b) return;
    const icon = this.add.image(x, y, tex, frame).setScale(scale).setDepth(160);
    const mx = (x + b.x) / 2 + 60, my = Math.min(y, b.y) - 40; // đi theo đường cong
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(b.x, b.y));
    const t = { v: 0 };
    this.tweens.add({
      targets: t, v: 1, duration: 620, ease: 'Sine.easeIn',
      onUpdate: () => {
        const p = curve.getPoint(t.v);
        icon.setPosition(p.x, p.y).setScale(scale * (1 - 0.55 * t.v));
      },
      onComplete: () => {
        icon.destroy();
        this.tweens.killTweensOf(b);
        b.setScale(1);
        this.tweens.add({ targets: b, scale: { from: 1.15, to: 1 }, duration: 220, ease: 'Back.easeOut' });
      },
    });
  }

  showGain(id, n) {
    const it = ITEMS[id];
    if (!it) return;
    this.gains = this.gains || [];
    // Chỉ cộng dồn vào bảng còn đang hiện (bảng đang mờ dần / đã xoá thì tạo bảng mới)
    let g = this.gains.find((x) => x.id === id && !x.fading && x.c.active);
    if (g) {
      g.n += n;
      g.label.setText(`+${g.n} ${it.name}`);
      g.until = this.time.now + 2600;
      g.c.setAlpha(1);
      this.tweens.add({ targets: g.c, scale: { from: 1.08, to: 1 }, duration: 160 });
    } else {
      const c = this.add.container(16, 0).setDepth(150);
      c.add(box(this, 'ui_row', 0, 0, 220, 34, 2));
      c.add(this.fitIcon(19, 17, it.tex, it.frame, 24));
      const label = this.add.text(38, 17, `+${n} ${it.name}`, text(14)).setOrigin(0, 0.5);
      c.add(label);
      c.x = -230;
      this.tweens.add({ targets: c, x: 16, duration: 220, ease: 'Back.easeOut' });
      g = { id, n, c, label, until: this.time.now + 2600 };
      this.gains.unshift(g);
    }
    this.layoutGains();
    if (!this.gainTimer)
      this.gainTimer = this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => {
          const now = this.time.now;
          for (const x of this.gains) {
            if (now > x.until && !x.fading) {
              x.fading = true;
              this.tweens.add({ targets: x.c, alpha: 0, x: -230, duration: 300, onComplete: () => x.c.destroy() });
            }
          }
          const before = this.gains.length;
          this.gains = this.gains.filter((x) => !x.fading || x.c.active);
          if (before !== this.gains.length) this.layoutGains();
        },
      });
  }

  layoutGains() {
    this.gains.slice(0, 4).forEach((g, i) => (g.c.setVisible(true), this.tweens.add({ targets: g.c, y: 178 + i * 38, duration: 150 })));
    this.gains.slice(4).forEach((g) => g.c.setVisible(false));
  }

  // =========================================================
  //  Rương chứa đồ: chạm để chuyển đồ giữa rương ⇄ túi
  // =========================================================
  // Đồ chứa: rương ('map:x,y') hoặc Kho thóc / Nhà kho ('silo' | 'barn')
  getStore(key = this.storageKey) {
    return STORES[key] ? state.stores[key].items : state.storage[key];
  }

  openStorage(key) {
    this.closeModal();
    if (!STORES[key] && !state.storage[key]) state.storage[key] = {};
    this.storageKey = key;
    this.setModal('storage');
    sfx('click', 0.3);
    this.renderStorage();
  }

  renderStorage() {
    this.panelC?.destroy();
    const store = this.getStore() || {};
    const isStore = !!STORES[this.storageKey];
    const w = 760, h = this.H - 20, x = (this.W - w) / 2, y = 10;
    const c = (this.panelC = this.add.container(0, 0).setDepth(200));
    this.modalBg(c);
    c.add(box(this, 'ui_frame', x, y, w, h));
    c.add(this.add.text(x + 24, y + 16, isStore ? `${STORES[this.storageKey].name} — cấp ${state.stores[this.storageKey].lv}` : 'Rương chứa đồ', text(22, '#ffd34d')));
    if (!isStore) c.add(this.add.text(x + w - 24, y + 22, 'Chạm vào món đồ để chuyển qua lại', text(13, '#cfcfe0')).setOrigin(1, 0));
    const cols = 12, cell = 54, gx = x + (w - cols * cell) / 2;
    const grid = (top, ids, slots, owner) => {
      for (let i = 0; i < slots; i++) {
        const cx = gx + (i % cols) * cell, cy = top + Math.floor(i / cols) * cell;
        const bg = box(this, 'ui_slot', cx + 2, cy + 2, cell - 4, cell - 4, 2);
        c.add(bg);
        const id = ids[i];
        if (!id) continue;
        const it = ITEMS[id];
        const n = owner === 'chest' ? store[id] : count(id);
        bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.moveItem(id, owner));
        c.add([this.fitIcon(cx + cell / 2, cy + cell / 2, it.tex, it.frame, 34), this.add.text(cx + cell - 5, cy + cell - 1, n, textLight(11)).setOrigin(1, 1)]);
      }
    };
    const chestIds = Object.keys(store).filter((id) => store[id] > 0 && ITEMS[id]);
    const bagIds = Object.keys(state.inv).filter((id) => count(id) > 0 && ITEMS[id]);
    const bagSize = state.bagSize || BAG_START;
    c.add(this.add.text(x + 24, y + 50, isStore ? `Đang chứa ${storeUsed(this.storageKey)}/${storeCap(this.storageKey)} món · ${STORES[this.storageKey].desc}` : `Trong rương (${chestIds.length}/${CHEST_SLOTS} ô)`, text(16, '#ffd34d')));
    grid(y + 76, chestIds, CHEST_SLOTS, 'chest');
    const by = y + 76 + 3 * cell + 12;
    c.add(this.add.text(x + 24, by, `Túi đồ (${bagIds.length}/${bagSize} ô)`, text(16, '#ffd34d')));
    grid(by + 26, bagIds, bagSize, 'bag');
    const fy = y + h - 32;
    c.add(this.button(x + w / 2 - 230, fy, isStore ? 'Cất hết vào kho' : 'Cất hết nông sản', () => this.depositProduce(), 200));
    if (isStore) {
      const up = STORES[this.storageKey].upgrade[state.stores[this.storageKey].lv];
      c.add(this.add.text(x + w - 24, y + 50, up ? `Nâng cấp: ${hdCost(up)}` : 'Cấp tối đa', text(12, '#cfcfe0')).setOrigin(1, 0).setWordWrapWidth(330).setAlign('right'));
      if (up) c.add(this.button(x + w - 90, y + 26, 'Nâng cấp', () => upgradeStore(this.storageKey), 120, 0x46607a, 32));
    }
    c.add(this.button(x + w / 2, fy, 'Lấy hết', () => {
      for (const id of Object.keys(store)) if (bagHasRoom(id)) this.moveItem(id, 'chest', true);
      changed();
    }, 150, 0x46607a));
    c.add(this.button(x + w / 2 + 210, fy, 'Đóng', () => this.closeModal(), 150, 0x6b4a4a));
  }

  // Chuyển cả chồng đồ giữa rương và túi
  moveItem(id, from, quiet = false) {
    const store = this.getStore();
    const sk = this.storageKey;
    if (STORES[sk] && from === 'bag') {
      // Kho thóc / Nhà kho: đúng loại hàng, giới hạn theo tổng số món
      if (!storable(id) || storeFor(id) !== sk) return quiet || toast(storable(id) ? `Món này cất ở ${STORES[storeFor(id)].name}` : 'Món này không cất vào kho được');
      const room = storeCap(sk) - storeUsed(sk);
      const n = Math.min(room, count(id));
      if (n <= 0) return quiet || toast(`${STORES[sk].name} đã đầy — hãy nâng cấp`);
      store[id] = (store[id] || 0) + n;
      addItem(id, -n, true);
      if (!count(id) && state.sel === `item:${id}`) state.sel = 'tool:hoe';
      if (!quiet) (sfx('click', 0.25), changed());
      return;
    }
    if (from === 'chest') {
      if (!bagHasRoom(id)) return quiet || toast('Túi đồ đầy!');
      addItem(id, store[id], true);
      delete store[id];
    } else {
      if (!store[id] && Object.keys(store).length >= CHEST_SLOTS) return quiet || toast('Rương đã đầy!');
      store[id] = (store[id] || 0) + count(id);
      delete state.inv[id];
      if (state.sel === `item:${id}`) state.sel = 'tool:hoe';
    }
    if (!quiet) {
      sfx('click', 0.25);
      changed();
    }
  }

  depositProduce() {
    let n = 0;
    for (const id of Object.keys(state.inv)) {
      const it = ITEMS[id];
      if (count(id) <= 0) continue;
      if (STORES[this.storageKey]) {
        if (storable(id) && storeFor(id) === this.storageKey && storeUsed(this.storageKey) < storeCap(this.storageKey)) (this.moveItem(id, 'bag', true), n++);
        continue;
      }
      if (!it || it.seed || it.place || it.home || it.homePlace || !(it.sell > 0 || ['wood', 'stone', 'hay'].includes(id))) continue;
      const store = this.getStore();
      if (!store[id] && Object.keys(store).length >= CHEST_SLOTS) break;
      this.moveItem(id, 'bag', true);
      n++;
    }
    sfx(n ? 'success' : 'cancel', 0.35);
    toast(n ? `Đã cất ${n} loại đồ vào rương` : 'Không có nông sản nào để cất');
    changed();
  }
}
