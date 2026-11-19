import Phaser from 'phaser';
import { ITEMS, NPCS, ANIMALS, SKILLS, XP_LEVELS, FESTIVALS, MAX_ENERGY, TICK_MS, DAY_END, DAYS_PER_SEASON, CHEST_SLOTS, BAG_START } from '../config.js';
import { isTouchDevice } from '../state.js';
import { state, ui, bus, changed, save, toast, sfx, season, clockText, hotbarItems, selected, count, resetGame, waterCap, hearts, addItem, bagSlots, bagHasRoom } from '../state.js';
import { skillLv, skillProgress, maxHp } from '../skills.js';
import { birthdayText } from '../festivals.js';
import { FOOD_MAX, hungerTick, baseLv } from '../survival.js';
import { BOOK, ACHIEVEMENTS, bookDone, achDone, claim, claimable, trackProgress } from '../collection.js';
import { craftRows, furnShopPanel, wallPanel, floorPanel } from '../shops.js';
import { FURN, FURN_CATS, ownedCount, ensureHome } from '../furniture.js';
import AudioDirector from '../audio.js';
import { QUESTS, questNow, questIdx, questProgress, checkQuest } from '../quests.js';
import { growCrops } from '../crops.js';
import Fishing from '../fishing.js';
import { STORES } from '../config.js';
import { absMin } from '../hayday.js';
import { BUILDINGS } from '../config.js';
import { finishFactories } from '../hayday.js';
import { raidTick } from '../raid.js';
import { farmLevel, farmProgress, onHour, storeFor, storeUsed, storeCap, storable, upgradeStore, costText as hdCost } from '../hayday.js';

import { basePanel, craftPanel } from '../survivalPanels.js';
import { text, textLight, box, buttonKey, C, FONT } from '../ui/theme.js';
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
    this.toastText = this.add.text(W / 2, H - SLOT - 82, '', textLight(this.isTouch ? 21 : 19)).setOrigin(0.5, 1).setAlign('center').setAlpha(0).setDepth(400).setWordWrapWidth(W - 120); // luôn nổi trên bảng cửa hàng
    this.keyHelp = this.add.text(W - 8, 54, 'Click: đi / làm việc  ·  WASD + Space\n1–9: chọn đồ  ·  I: túi đồ  ·  Esc: đóng', textLight(12)).setOrigin(1, 0).setAlign('right');
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
    on('sfx', (name, volume, pitch) => this.audio?.sfx(name, volume, pitch));
    on('dialog', this.openDialog);
    on('panel', this.openPanel);
    on('closePanel', () => this.closeModal());
    on('gain', (id, n) => this.showGain(id, n));
    on('levelUp', (lv, list) => {
      sfx('levelup');
      const text = `Dân làng tin tưởng bạn hơn rồi! Uy tín lên cấp ${lv}.` + (list.length ? `\nMở khoá: ${list.join(', ')}` : '');
      if (ui.modal) this.showToast(text, 5000);
      else bus.emit('dialog', { face: 'portrait', name: `Uy tín cấp ${lv}!`, text, choices: [{ label: 'Tuyệt vời!', onClick: null }] });
    });
    on('flyToBag', this.flyToBag);
    // Chữ to giữa màn hình (đợt zombie...)
    on('banner', (text, color = '#ffd27a') => {
      const t = this.add.text(this.W / 2, this.H * 0.3, text, textLight(34, color)).setOrigin(0.5).setDepth(5000).setStroke('#1d1418', 8).setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 250, ease: 'Back.out' });
      this.tweens.add({ targets: t, alpha: 0, y: t.y - 20, delay: 2600, duration: 600, onComplete: () => t.destroy() });
    });
    on('openStorage', (key) => this.openStorage(key));
    // Đài radio trong nhà: đổi giai điệu
    on('radio', () => {
      const name = this.audio?.nextRadio();
      if (state.muted) return this.showToast('Âm thanh đang tắt — bấm nút "Âm: tắt" trên góc để bật');
      if (state.musicOff) return this.showToast('Nhạc đang tắt — vào Cài đặt (góc phải trên) để bật');
      this.showToast(name ? `Đài đang phát: ${name} ♪` : 'Đã tắt đài');
    });
    // Xong nhiệm vụ: không vướng bảng nào thì mở thư ngay (thư ghi phần thưởng), đang mở bảng thì chỉ báo ngắn
    on('questDone', (msg) => (ui.modal || ui.transition ? this.showToast(msg, 3000) : this.time.delayedCall(300, () => (ui.modal ? this.showToast(msg, 3000) : this.showMail()))));
    on('fishStart', (where) => this.fishing.start(where));
    on('action', () => this.fishing.active && this.fishing.press());
    on('decoMode', (on) => (on ? this.openDecoBar() : this.closeDecoBar()));
    // Dời chuồng: thanh hướng dẫn + nút Đặt / Huỷ
    on('penMove', (on) => (on ? this.openPenBar() : this.closePenBar()));
    on('penMoveState', (msg) => this.penBarText?.setText(msg));
    // Đoạn phim mở đầu: khung đen trên/dưới, chữ kể chuyện, nút Bỏ qua
    on('cine', (on) => (on ? this.openCine() : this.closeCine()));
    on('clockNow', () => this.updateClock());
    // Bị zombie cắn: viền màn hình loé đỏ
    on('hurtFlash', () => {
      if (!this.hurtV) {
        const t = this.textures.exists('ui_hurtv') ? null : this.textures.createCanvas('ui_hurtv', 256, 144);
        if (t) {
          const ctx = t.getContext();
          const g = ctx.createRadialGradient(128, 72, 40, 128, 72, 150);
          g.addColorStop(0, 'rgba(160,0,0,0)');
          g.addColorStop(1, 'rgba(170,10,10,0.95)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 256, 144);
          t.refresh();
        }
        this.hurtV = this.add.image(0, 0, 'ui_hurtv').setOrigin(0).setDisplaySize(this.W, this.H).setDepth(140).setAlpha(0);
      }
      this.tweens.killTweensOf(this.hurtV);
      this.hurtV.setAlpha(0.85);
      this.tweens.add({ targets: this.hurtV, alpha: 0, duration: 520, ease: 'Quad.easeIn' });
    });
    on('cineText', (t, ms) => this.cineSay(t, ms));
    on('decoHeld', (id) => {
      this.decoHeldId = id;
      if (this.decoC) this.buildDecoBar();
    });
    on('mapChanged', (id) => {
      this.mapId = id;
      if (this.decoC) this.closeDecoBar();
      this.updateLeaveBtn();
      this.closeModal();
      this.audio?.tick();
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
        this.audio?.tick(true);
      });
    }
    this.audio = new AudioDirector(this);
    this.setupInvDrag();
    this.refresh();
    // Thư chưa đọc khi mở game (vd. thư mở đầu tận thế)
    if (state.mail?.length) this.time.delayedCall(1500, () => !ui.modal && this.showMail());
  }

  // =========================================================
  //  Bảng trạng thái
  // =========================================================
  // Kiểu HUD "gọn nhẹ trong suốt": viên thuốc đen mờ bo tròn, icon to, không khung dày
  pillDraw(g, x, y, w, h, a = 0.48) {
    g.fillStyle(0x0d0a0b, a).fillRoundedRect(x, y, w, h, h / 2);
    g.lineStyle(1.5, 0xffffff, 0.16).strokeRoundedRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, (h - 1.5) / 2);
  }

  hudText(size, color = '#ffffff') {
    return { fontFamily: FONT, fontSize: `${Math.round(size * 1.4)}px`, color, stroke: '#0d0a0b', strokeThickness: 3, padding: { top: 2, bottom: 2 } };
  }

  buildStatus() {
    const X = 8, Y = 8, W = 176, H = 26;
    const g = this.add.graphics();
    // Máu & No: viên thuốc có icon + thanh bo tròn + số
    const bar = (y, icon, color, hi) => {
      this.pillDraw(g, X, y, W, H);
      this.add.image(X + 15, y + H / 2, icon).setScale(1.6);
      const bg = this.add.graphics();
      const t = this.add.text(X + W - 11, y + H / 2, '', this.hudText(13)).setOrigin(1, 0.5);
      return { g: bg, t, x: X + 30, y: y + H / 2 - 4, w: W - 76, color, hi };
    };
    this.hpBar = bar(Y, 'ic_heart', 0xe0443a, 0xff8f80);
    this.foodBar = bar(Y + H + 6, 'ic_food', 0xe8933a, 0xffc27a);
    this.uiRects.push(new Phaser.Geom.Rectangle(X, Y, W, 2 * H + 6));
    // Xu + Uy tín: 2 viên nhỏ, rộng theo chữ
    this.chipG = this.add.graphics();
    this.coinIcon = this.add.image(X + 15, Y + 2 * (H + 6) + H / 2, 'ui_coin').setScale(1.5);
    this.coinText = this.add.text(X + 28, this.coinIcon.y, '', this.hudText(14, '#ffd86b')).setOrigin(0, 0.5);
    this.lvBadge = this.add.text(0, this.coinIcon.y, '', this.hudText(12, '#cfd6e0')).setOrigin(0, 0.5);
    this.chipRect = new Phaser.Geom.Rectangle(X, Y + 2 * (H + 6), W, H);
    this.uiRects.push(this.chipRect);
    // Nhiệm vụ: viên có chấm vàng "!", bấm xem gợi ý
    const QY = Y + 3 * (H + 6) + 2;
    this.questG = this.add.graphics();
    this.add.circle(X + 14, QY + 14, 9, 0xffc93c).setStrokeStyle(1.5, 0x0d0a0b, 0.6);
    this.add.text(X + 14, QY + 14, '!', this.hudText(13, '#3a2a10')).setOrigin(0.5).setStroke('#ffc93c', 0);
    this.questTitle = this.add.text(X + 29, QY + 14, '', this.hudText(13)).setOrigin(0, 0.5);
    this.questSub = this.add.text(0, QY + 14, '', this.hudText(13, '#ffd86b')).setOrigin(0, 0.5);
    this.questY = QY;
    this.questRect = new Phaser.Geom.Rectangle(X, QY, 200, 28);
    this.uiRects.push(this.questRect);
    this.questZone = this.add.zone(X, QY, 200, 28).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => !ui.modal && this.showQuest());

    // Đồng hồ giữa: icon trời · giờ · ngày; dưới là đếm ngược tới đêm
    const MX = this.W / 2, CW = 190;
    this.pillDraw(g, MX - CW / 2, Y, CW, 30);
    this.uiRects.push(new Phaser.Geom.Rectangle(MX - CW / 2, Y, CW, 30));
    this.skyIcon = this.add.image(MX - CW / 2 + 18, Y + 15, 'ic_sun').setScale(1.7);
    this.clockText = this.add.text(MX - CW / 2 + 32, Y + 15, '', this.hudText(17)).setOrigin(0, 0.5);
    this.dateText = this.add.text(0, Y + 15, '', this.hudText(12, '#cfd6e0')).setOrigin(0, 0.5);
    this.nightG = this.add.graphics();
    this.nightIcon = this.add.image(0, Y + 47, 'ic_skull').setScale(1.3);
    this.nightText = this.add.text(MX + 8, Y + 47, '', this.hudText(12, '#cfd6e0')).setOrigin(0.5);
    this.nightPulse = this.tweens.add({ targets: [this.nightIcon, this.nightText], alpha: 0.5, yoyo: true, repeat: -1, duration: 600, paused: true });
  }

  setBar(b, v, low) {
    const k = Phaser.Math.Clamp(v, 0, 1);
    const danger = low && k < 0.3;
    b.g.clear();
    b.g.fillStyle(0xffffff, 0.14).fillRoundedRect(b.x, b.y, b.w, 8, 4);
    if (k > 0) {
      const w = Math.max(8, b.w * k);
      b.g.fillStyle(danger ? 0xff3b30 : b.color, 1).fillRoundedRect(b.x, b.y, w, 8, 4);
      b.g.fillStyle(0xffffff, 0.28).fillRoundedRect(b.x + 2, b.y + 1, w - 4, 2, 1);
    }
  }

  // Vẽ lại các viên rộng theo chữ (xu, nhiệm vụ)
  layoutChips() {
    const X = 8, H = 26, y = this.chipRect.y;
    const g = this.chipG.clear();
    const cw = this.coinText.width + 42;
    this.pillDraw(g, X, y, cw, H);
    this.lvBadge.setX(X + cw + 16);
    const lw = this.lvBadge.width + 30;
    this.pillDraw(g, X + cw + 6, y, lw, H, 0.36);
    this.chipRect.width = cw + 6 + lw;
    // Nhiệm vụ: cắt bớt tên dài cho vừa
    const full = this.questTitle.text;
    let t = full;
    while (this.questTitle.width > 200 && t.length > 4) this.questTitle.setText((t = t.slice(0, -1)) + '…');
    this.questSub.setX(this.questTitle.x + this.questTitle.width + 8);
    const qw = this.questSub.x + this.questSub.width + 12 - X;
    this.pillDraw(this.questG.clear(), X, this.questY, qw, 28);
    this.questRect.width = qw;
    this.questZone.setSize(qw, 28);
    this.questZone.input.hitArea.setSize(qw, 28);
  }

  updateClock() {
    const t = state.time;
    const night = t >= 1200 || t < 360;
    this.clockText.setText(clockText().slice(0, 5));
    this.dateText.setX(this.clockText.x + this.clockText.width + 12);
    this.skyIcon.setTexture(state.weather === 'rain' ? 'ic_rain' : state.weather === 'snow' ? 'ic_snow' : night ? 'ic_moon' : 'ic_sun');
    let msg, col;
    if (night) (msg = 'Đêm · zombie đang tới'), (col = '#ff6b5a');
    else {
      const r = 1200 - t;
      msg = `Trời tối sau ${Math.floor(r / 60)}g${String(r % 60).padStart(2, '0')}`;
      col = r <= 120 ? '#ffae6b' : '#cfd6e0';
    }
    this.nightText.setText(msg).setColor(col);
    const MX = this.W / 2, w = this.nightText.width + 40;
    this.nightText.setX(MX + 10);
    this.nightIcon.setX(MX + 10 - this.nightText.width / 2 - 12).setTint(night ? 0xff8a7a : 0xffffff);
    this.pillDraw(this.nightG.clear(), MX - w / 2 + 2, this.nightIcon.y - 11, w, 22, night ? 0.55 : 0.32);
    const warn = night || 1200 - t <= 120;
    if (warn && this.nightPulse.paused) this.nightPulse.resume();
    if (!warn && !this.nightPulse.paused) {
      this.nightPulse.pause();
      this.nightIcon.setAlpha(1), this.nightText.setAlpha(1);
    }
  }

  // Kéo thả trong túi đồ: bóng món đồ theo ngón tay, thả vào thùng rác thì hỏi bỏ
  setupInvDrag() {
    this.input.on('pointermove', (p) => {
      const h = this.hotDrag;
      if (h && p.isDown && !ui.modal) {
        if (!h.ghost && Phaser.Math.Distance.Between(p.x, p.y, h.sx, h.sy) > 14) {
          if (h.it.tool) {
            this.hotDrag = null;
            return this.showToast('Công cụ không bỏ được');
          }
          h.ghost = this.fitIcon(p.x, p.y, h.it.tex, h.it.frame, 44).setDepth(400).setAlpha(0.9);
          this.showHotTrash(true);
        }
        if (h.ghost) {
          h.ghost.setPosition(p.x, p.y);
          this.hotTrash?.setScale(this.hotTrashRect.contains(p.x, p.y) ? 1.12 : 1);
        }
        return;
      }
      const d = this.invDrag;
      if (!d || ui.modal !== 'inv' || !p.isDown) return;
      if (!d.ghost && Phaser.Math.Distance.Between(p.x, p.y, d.sx, d.sy) > 12) {
        const it = ITEMS[d.id];
        d.ghost = this.fitIcon(p.x, p.y, it.tex, it.frame, 44).setDepth(400).setAlpha(0.9);
      }
      if (d.ghost) {
        d.ghost.setPosition(p.x, p.y);
        this.trashBox?.setTint?.(this.trashRect?.contains(p.x, p.y) ? 0xff9a8a : 0xffffff);
      }
    });
    this.input.on('pointerup', (p) => {
      const h = this.hotDrag;
      this.hotDrag = null;
      if (h?.ghost) {
        h.ghost.destroy();
        const drop = this.hotTrashRect?.contains(p.x, p.y);
        this.showHotTrash(false);
        if (drop) this.askDiscard(h.it.item, true);
        return;
      }
      const d = this.invDrag;
      this.invDrag = null;
      if (!d?.ghost) return;
      d.ghost.destroy();
      this.invDropAt = this.time.now;
      this.trashBox?.setTint?.(0xffffff);
      if (ui.modal === 'inv' && this.trashRect?.contains(p.x, p.y)) this.askDiscard(d.id);
    });
  }

  // Thùng rác tạm hiện phía trên thanh công cụ khi kéo đồ từ thanh công cụ
  showHotTrash(on) {
    this.hotTrash?.destroy();
    this.hotTrash = null;
    this.hotTrashRect = null;
    if (!on) return;
    const x = this.W / 2, y = this.hotbarRect.y - 70;
    const c = (this.hotTrash = this.add.container(x, y).setDepth(390));
    const g = this.add.graphics();
    g.fillStyle(0x7c2a26, 0.85).fillRoundedRect(-90, -30, 180, 60, 16);
    g.lineStyle(2, 0xffffff, 0.5).strokeRoundedRect(-90, -30, 180, 60, 16);
    c.add([g, this.add.image(-58, 0, 'surv', 'trashcan').setScale(2), this.add.text(10, 0, 'Thả vào đây\nđể bỏ', { ...textLight(15), align: 'center', lineSpacing: -4 }).setOrigin(0.5)]);
    this.hotTrashRect = new Phaser.Geom.Rectangle(x - 100, y - 40, 200, 80);
    this.tweens.add({ targets: c, y: y - 4, yoyo: true, repeat: -1, duration: 500 });
  }

  askDiscard(id, fromHotbar = false) {
    const it = ITEMS[id];
    const n = count(id);
    if (!it || !n) return;
    const done = (k) => {
      addItem(id, -k, true);
      if (state.sel === `item:${id}` && !count(id)) state.sel = 'none';
      sfx('cancel', 0.4);
      this.invInfo = `Đã bỏ ${k} ${it.name}`;
      changed();
      if (fromHotbar) this.showToast(`Đã bỏ ${k} ${it.name}`);
      else this.openInventory('inv');
    };
    bus.emit('dialog', {
      face: 'portrait',
      name: 'Bỏ đồ',
      text: `Bỏ ${it.name} đi? Đồ đã bỏ sẽ mất luôn.${it.sell ? `\n(Mẹo: món này bán được ${it.sell} xu/cái ở sạp ven đường)` : ''}`,
      choices: [
        ...(n > 1 ? [{ label: 'Bỏ 1', onClick: () => done(1) }] : []),
        { label: n > 1 ? `Bỏ hết (${n})` : 'Bỏ', onClick: () => done(n) },
        { label: 'Thôi', onClick: () => !fromHotbar && this.openInventory('inv') },
      ],
    });
  }

  showQuest() {
    const q = questNow();
    if (!q) return this.showToast('Đã xong mọi nhiệm vụ hiện có — chờ bản cập nhật sau nhé!');
    const n = NPCS[q.from];
    bus.emit('dialog', {
      face: `face_${q.from}`,
      name: `Nhiệm vụ ${questIdx() + 1}/${QUESTS.length} — ${n?.name || ''} nhờ`,
      text: `${q.title} (${questProgress(q)}/${q.goal})\n${q.hint}`,
      choices: [
        // Nhiệm vụ xây / chế: mở thẳng bảng Căn cứ (chỉ khi đang ở nông trại)
        ...(q.panel ? [{ label: q.panel === 'craft' ? 'Mở Bàn chế tạo' : 'Mở bảng Căn cứ', onClick: () => {
          if (this.mapId !== 'farm') return this.showToast('Về nông trại rồi bấm lại nhé — Bàn chế tạo ở cạnh nhà');
          bus.emit('panel', q.panel === 'craft' ? craftPanel : basePanel);
        } }] : []),
        { label: 'Đã hiểu', onClick: null },
      ],
    });
  }

  buildTopButtons() {
    // 2 nút tròn mờ có icon: Túi đồ (ba lô) + Cài đặt (bánh răng)
    const R = 21, cy = 8 + R, r = this.W - 8;
    const roundBtn = (x, icon, onClick) => {
      const c = this.add.container(x, cy);
      const bg = this.add.circle(0, 0, R, 0x0d0a0b, 0.48).setStrokeStyle(1.5, 0xffffff, 0.16);
      const ic = this.add.image(0, 0, icon).setScale(1.8);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x0d0a0b, 0.68)).on('pointerout', () => bg.setFillStyle(0x0d0a0b, 0.48));
      bg.on('pointerdown', () => c.setScale(0.92)).on('pointerup', () => (c.setScale(1), onClick()));
      c.add([bg, ic]);
      this.uiRects.push(new Phaser.Geom.Rectangle(x - R, cy - R, 2 * R, 2 * R));
      return c;
    };
    this.menuBtn = roundBtn(r - R, 'ic_gear', () => this.toggleMenu());
    this.bagBtn = roundBtn(r - 3 * R - 8, 'ic_bag', () => (this.toggleMenu(false), this.openInventory()));

    // Bảng cài đặt: khung mờ bo tròn, mỗi dòng là một viên bấm được
    const MW = 180, IH = 32;
    const m = (this.menuC = this.add.container(0, 0).setDepth(320).setVisible(false));
    const mg = this.add.graphics();
    m.add(mg);
    const rows = [];
    const item = (onClick) => {
      const i = rows.length;
      const c = this.add.container(0, 0);
      const hg = this.add.graphics();
      const t = this.add.text(0, 0, '', this.hudText(14)).setOrigin(0.5);
      const z = this.add.zone(0, 0, MW, IH).setInteractive({ useHandCursor: true });
      const draw = (a) => hg.clear().fillStyle(0xffffff, a).fillRoundedRect(-MW / 2, -IH / 2, MW, IH, IH / 2);
      draw(0.08);
      z.on('pointerover', () => draw(0.18)).on('pointerout', () => draw(0.08)).on('pointerup', () => onClick());
      c.add([hg, t, z]);
      c.label = t;
      rows.push(c);
      m.add(c);
      return c;
    };
    const soundLabel = () => (state.muted ? 'Âm thanh: tắt' : state.musicOff ? 'Nhạc: tắt' : 'Âm thanh: bật');
    this.touchBtn = item(() => {
      state.touchPref = !this.isTouch;
      this.applyTouchMode(state.touchPref);
      save();
    });
    // Âm: bật → Nhạc: tắt (chỉ còn tiếng) → Âm: tắt
    this.muteBtn = item(() => {
      if (state.muted) state.muted = state.musicOff = false;
      else if (state.musicOff) state.muted = true;
      else state.musicOff = true;
      this.sound.mute = state.muted;
      this.muteBtn.label.setText(soundLabel());
      this.audio?.tick();
      save();
    });
    this.muteBtn.label.setText(soundLabel());
    // Âm lượng chung: Vừa → Nhỏ → To (mặc định Vừa)
    const VOLS = [['Vừa', 0.7], ['Nhỏ', 0.4], ['To', 1]];
    const volIdx = () => Math.max(0, VOLS.findIndex(([n]) => n === (state.volume || 'Vừa')));
    const volBtn = item(() => {
      state.volume = VOLS[(volIdx() + 1) % VOLS.length][0];
      this.sound.volume = VOLS[volIdx()][1];
      volBtn.label.setText(`Âm lượng: ${state.volume}`);
      this.audio?.sfx('click', 0.6);
      save();
    });
    this.sound.volume = VOLS[volIdx()][1];
    volBtn.label.setText(`Âm lượng: ${VOLS[volIdx()][0]}`);
    // Tự đổi dụng cụ khi tới gần cây / đá
    const autoLabel = () => `Tự đổi dụng cụ: ${state.autoTool === false ? 'tắt' : 'bật'}`;
    const autoBtn = item(() => {
      state.autoTool = state.autoTool === false;
      autoBtn.label.setText(autoLabel());
      save();
    });
    autoBtn.label.setText(autoLabel());
    if (this.scale.fullscreen.available)
      item(() => {
        if (this.scale.isFullscreen) return this.scale.stopFullscreen();
        this.scale.startFullscreen();
        screen.orientation?.lock?.('landscape').catch(() => {});
      }).label.setText('Toàn màn hình');
    const pad = 8, mh = rows.length * (IH + 6) - 6 + 2 * pad;
    const mx = r - MW - 2 * pad, my = cy + R + 6;
    mg.fillStyle(0x0d0a0b, 0.62).fillRoundedRect(mx, my, MW + 2 * pad, mh, 16);
    mg.lineStyle(1.5, 0xffffff, 0.16).strokeRoundedRect(mx + 0.75, my + 0.75, MW + 2 * pad - 1.5, mh - 1.5, 16);
    rows.forEach((c, i) => c.setPosition(mx + pad + MW / 2, my + pad + IH / 2 + i * (IH + 6)));
    this.menuRect = new Phaser.Geom.Rectangle(mx, my, MW + 2 * pad, mh);
    // Chạm ra ngoài thì đóng bảng
    this.input.on('pointerdown', (p) => {
      if (this.menuC.visible && !this.menuRect.contains(p.x, p.y) && !(p.x > r - 2 * R && p.y < cy + R)) this.toggleMenu(false);
    });

    // Nút "Ra ngoài": chỉ hiện khi ở trong nhà / cửa hàng (cửa ra có thể bị thanh công cụ che)
    const lw = 150, lx = this.W - 8 - lw, ly = 96;
    this.leaveRect = new Phaser.Geom.Rectangle(lx, ly - 20, lw, 40);
    this.leaveBtn = this.button(lx + lw / 2, ly, 'Ra ngoài ↓', () => bus.emit('leaveRoom'), lw, 0xb5603a, 40);
    // Nút "Trang trí": chỉ trong nhà
    this.decoRectBtn = new Phaser.Geom.Rectangle(lx, ly + 28, lw, 40);
    this.decoBtn = this.button(lx + lw / 2, ly + 48, 'Trang trí ✎', () => bus.emit('decoStart'), lw, 0x5a8f3c, 40);
    this.updateLeaveBtn();
  }

  openCine() {
    if (this.cineC) return;
    this.cineHidden = this.children.list.filter((o) => o.visible && o !== this.toastText && o !== this.night);
    for (const o of this.cineHidden) o.setVisible(false);
    const c = (this.cineC = this.add.container(0, 0).setDepth(150)); // dưới hộp thoại (200) để nút Tiếp không bị che
    const top = this.add.rectangle(0, 0, this.W, 56, 0x000000).setOrigin(0);
    const bot = this.add.rectangle(0, this.H - 64, this.W, 64, 0x000000).setOrigin(0);
    c.add([top, bot]);
    this.tweens.add({ targets: top, y: { from: -56, to: 0 }, duration: 600, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: bot, y: { from: this.H, to: this.H - 64 }, duration: 600, ease: 'Sine.easeOut' });
    this.cineCap = this.add.text(this.W / 2, this.H - 32, '', { fontFamily: FONT, fontSize: '30px', color: '#fff3d6', align: 'center' }).setOrigin(0.5).setAlpha(0);
    // lùi vào trong: góc màn iPhone bo tròn che mất chữ
    const skip = this.add.text(this.W - 56, 28, 'Bỏ qua ▶▶', { fontFamily: FONT, fontSize: '24px', color: '#c8c0b0' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => bus.emit('cineSkip'));
    c.add([this.cineCap, skip]);
    this.cineRect = new Phaser.Geom.Rectangle(this.W - 210, 0, 210, 56);
    this.uiRects.push(this.cineRect);
  }

  cineSay(text, ms = 2600) {
    const t = this.cineCap;
    if (!t) return;
    this.tweens.killTweensOf(t);
    t.setText(text).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 450 });
    if (ms) this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 450 });
  }

  closeCine() {
    this.cineC?.destroy();
    this.cineC = null;
    this.cineCap = null;
    for (const o of this.cineHidden || []) if (o.active) o.setVisible(true);
    this.cineHidden = null;
    this.uiRects = this.uiRects.filter((r) => r !== this.cineRect);
  }

  openPenBar() {
    this.closePenBar();
    const W = this.W, y = this.H - 128;
    const c = (this.penBar = this.add.container(0, 0).setDepth(330));
    const g = this.add.graphics().fillStyle(0x0d0a0b, 0.72).fillRoundedRect(W / 2 - 250, y - 34, 500, 104, 18);
    const t1 = this.add.text(W / 2, y - 18, 'Chạm hoặc kéo tới chỗ muốn đặt chuồng', this.hudText(16)).setOrigin(0.5);
    this.penBarText = this.add.text(W / 2, y + 4, '', this.hudText(15, '#f2bd3c')).setOrigin(0.5);
    const ok = this.button(W / 2 - 80, y + 44, 'Đặt ở đây', () => bus.emit('penMoveOk'), 140, 0x5a8f3c, 36);
    const no = this.button(W / 2 + 80, y + 44, 'Huỷ', () => bus.emit('penMoveCancel'), 140, 0xb5603a, 36);
    c.add([g, t1, this.penBarText, ok, no]);
    this.penBarRect = new Phaser.Geom.Rectangle(W / 2 - 250, y - 34, 500, 104);
    this.uiRects.push(this.penBarRect);
  }

  closePenBar() {
    this.penBar?.destroy();
    this.penBar = null;
    this.penBarText = null;
    this.uiRects = this.uiRects.filter((r) => r !== this.penBarRect);
  }

  toggleMenu(open = !this.menuC?.visible) {
    if (!this.menuC) return;
    this.menuC.setVisible(open);
    this.uiRects = this.uiRects.filter((r) => r !== this.menuRect);
    if (open) this.uiRects.push(this.menuRect);
    this.keyHelp?.setVisible(!open && !this.isTouch && !ui.deco);
  }

  updateLeaveBtn() {
    if (!this.leaveBtn) return;
    const on = ['home', 'shop', 'npchome', 'ruin', 'pen'].includes(this.mapId) && !ui.deco;
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
      bg.on('pointerdown', (p) => {
        this.selectSlot(i);
        // giữ & kéo lên để bỏ đồ (thùng rác hiện ra phía trên thanh công cụ)
        this.hotDrag = { it, sx: p.x, sy: p.y };
      });
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
    trackProgress();
    const s = season();
    this.dateText.setText(`${s.name} · Ngày ${state.day}`);
    this.updateClock();
    this.coinText.setText(`${state.coins}`);
    this.lvBadge.setText(`Uy tín ${farmLevel()}`);
    this.setBar(this.hpBar, state.hp / maxHp(), true);
    this.hpBar.t.setText(`${state.hp}`);
    const food = Math.round(state.food ?? FOOD_MAX);
    this.setBar(this.foodBar, food / FOOD_MAX, true);
    this.foodBar.t.setText(`${food}`);
    checkQuest();
    const q = questNow();
    this.questTitle.setText(q ? q.title : 'Đã xong mọi nhiệm vụ');
    this.questSub.setText(q ? `${questProgress(q)}/${q.goal}` : '');
    this.layoutChips();

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
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: Math.max(duration, msg.length * 45), duration: 500 });
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
        hungerTick();
        if (baseLv('medic') >= 2 && ui.place === 'farm' && state.hp < maxHp()) state.hp += 1;
        const grew = growCrops();
        if (grew.length) bus.emit('cropsGrew', grew);
        // Nhà máy Chú Frank xây xong
        for (const name of finishFactories()) {
          sfx('fanfare', 0.5);
          toast(`Chú Frank đã dựng xong ${name}! Chạm vào để sản xuất.`);
          bus.emit('buildingDone');
          save();
        }
        // Chuồng trại xây xong
        for (const [id, done] of Object.entries(state.buildDone || {})) {
          if (state.buildings[id] !== 'building') delete state.buildDone[id];
          else if (absMin() >= done) {
            state.buildings[id] = 'built';
            delete state.buildDone[id];
            sfx('success', 0.5);
            toast(`${BUILDINGS[id].name} đã xây xong! Ghé trại Cô Emily mua vật nuôi nhé.`);
            bus.emit('buildingDone', id);
            save();
          }
        }
        try {
          raidTick();
        } catch (e) {
          console.error('raidTick lỗi:', e);
        }
        if (state.time % 60 === 0) {
          onHour();
          save();
        }
        // Cập nhật bảng đang mở (đồng hồ nhà máy, đơn hàng chờ)
        if (ui.modal === 'panel' && this.panelDef) this.renderPanel();
        if (state.time === 19 * 60) toast('Trời sập tối — 20:00 zombie sẽ kéo tới nông trại! Sửa cổng, đặt bẫy, mồi, đuốc.');
        if (state.time === 25 * 60) toast('Đã 1 giờ sáng! Về ngủ ngay kẻo ngất xỉu!');
        if (state.time >= DAY_END) {
          this.acc = 0;
          bus.emit('passout');
          break;
        }
        this.updateClock();
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
    if (ui.cine || ['start', 'cliff', 'beach', 'tour'].includes(state.intro)) return; // đang đoạn mở đầu: để thư lại sau
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
    if (this.panelDef !== def) sfx('open', 0.5);
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
    const rowH = def.rowH || 60;
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
      c.add(this.add.text(tx, ry + 28, r.desc || '', { ...text(13, '#cfcfe0'), lineSpacing: -2, wordWrap: { width: w - (tx - x) - 24 - r.buttons.length * 90 } }));
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
    sfx('open', 0.5);
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
    const nClaim = claimable();
    const tabs = [['inv', 'Túi đồ'], ['skills', 'Kỹ năng'], ['social', 'Quan hệ'], ['cal', 'Lịch'], ['book', nClaim ? `Sưu tập (${nClaim})` : 'Sưu tập']];
    tabs.forEach(([id, label], i) => {
      const on = this.menuTab === id;
      c.add(this.button(x + 70 + i * 120, y + 32, label, () => ((this.menuTab = id), sfx('click', 0.25), this.renderInventory()), 114, on ? 0xb07a2f : id === 'book' && nClaim ? 0x3f7a3a : 0x45455a, 38));
    });
    this.coinTag(c, x + w - 20, y + 26);
    const body = { x, y: y + 64, w, h: h - 64 - 56 };
    ({ inv: () => this.tabInventory(c, body), skills: () => this.tabSkills(c, body), social: () => this.tabSocial(c, body), cal: () => this.tabCalendar(c, body), book: () => this.tabBook(c, body) })[this.menuTab]();
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
      const usable = it.seed || it.place || it.home || it.eat || it.weapon || it.heal;
      const on = state.sel === `item:${id}`;
      const bg = box(this, 'ui_slot', cx + 2, cy + 2, cell - 4, cell - 4, 2).setInteractive({ useHandCursor: true });
      if (on) c.add(box(this, 'ui_sel', cx - 1, cy - 1, cell + 2, cell + 2, 3));
      // Giữ & kéo ô đồ vào thùng rác để bỏ
      bg.on('pointerdown', (p) => (this.invDrag = { id, sx: p.x, sy: p.y, ghost: null }));
      bg.on('pointerup', () => {
        if (this.invDrag?.ghost || this.time.now - (this.invDropAt || 0) < 80) return; // vừa kéo thả, không tính là bấm chọn
        if (usable) state.sel = `item:${id}`;
        const use = it.weapon ? 'vũ khí — cầm lên rồi bấm Làm / Space để đánh' : it.heal ? `chữa +${it.heal} máu` : it.eat ? `ăn: +${it.eat.e} no${it.eat.h ? `, +${it.eat.h} máu` : ''}` : it.seed ? 'gieo vào đất đã cuốc' : it.place ? 'đặt trên nông trại' : it.home ? 'đặt trong nhà' : '';
        this.invInfo = `${it.name} × ${count(id)}` + (it.sell ? ` · bán ${it.sell} xu` : '') + (use ? ` · ${use}${usable ? ' (đã chọn)' : ''}` : '');
        changed();
      });
      c.add([bg, this.fitIcon(cx + cell / 2, cy + cell / 2, it.tex, it.frame, 38), this.add.text(cx + cell - 5, cy + cell - 1, count(id), textLight(12)).setOrigin(1, 1)]);
    });
    const iy = gy + gridRows * cell + 6;
    c.add(this.add.text(x + w / 2 - 60, iy, this.invInfo, { ...text(14, '#ffe9a8'), wordWrap: { width: w - 220 }, align: 'center' }).setOrigin(0.5, 0));
    // Thùng rác: kéo đồ không dùng nữa thả vào đây
    const tx = x + w - 166, ty = iy - 6;
    this.trashBox = box(this, 'ui_row', tx, ty, 146, 34, 2);
    c.add([this.trashBox, this.add.image(tx + 18, ty + 17, 'surv', 'trashcan').setScale(1.5), this.add.text(tx + 34, ty + 17, 'Kéo đồ vào\nđây để bỏ', { ...text(12, '#3d3333'), lineSpacing: -3 }).setOrigin(0, 0.5)]);
    this.trashRect = new Phaser.Geom.Rectangle(tx - 10, ty - 10, 166, 54);
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

  tabSocial(c, { x, y, w, h }) {
    const ids = Object.keys(NPCS);
    const perCol = Math.ceil(ids.length / 2);
    const rowH = Math.min(64, Math.floor((h - (state.animals.length ? 30 : 0)) / perCol));
    const cw = (w - 36) / 2;
    ids.forEach((id, i) => {
      const n = NPCS[id];
      const rx = x + 18 + Math.floor(i / perCol) * cw, ry = y + (i % perCol) * rowH;
      const st = (state.npcs[id] = state.npcs[id] || { pts: 0, talked: false, gifted: false, events: [] });
      c.add(box(this, 'ui_row', rx + 2, ry, cw - 4, rowH - 4, 2));
      c.add(this.fitIcon(rx + 28, ry + (rowH - 4) / 2, `face_${id}`, undefined, rowH - 14));
      c.add(this.add.text(rx + 54, ry + 3, `${n.name}  ${hearts(st.pts)}`, text(16)));
      c.add(this.add.text(rx + cw - 12, ry + 4, `${st.talked ? '✓' : '○'} nói  ${st.gifted ? '✓' : '○'} quà`, text(12, st.talked ? '#9be07a' : '#cfcfe0')).setOrigin(1, 0));
      const loves = n.loves.map((l) => ITEMS[l]?.name).filter(Boolean).join(', ');
      c.add(this.add.text(rx + 54, ry + 24, `SN: ${birthdayText(id)} · Thích: ${loves}`, { ...text(12, '#cfcfe0'), wordWrap: { width: cw - 64 } }));
    });
    if (state.animals.length)
      c.add(this.add.text(x + 24, y + perCol * rowH + 4, `Vật nuôi: ${state.animals.map((a) => `${ANIMALS[a.type].name} ${a.name} ${hearts(a.pts)}`).join(' · ')}`, { ...text(13, '#ffe9a8'), wordWrap: { width: w - 48 } }));
  }

  // Sưu tập: lưới món theo nhóm (chưa có = bóng đen) + Thành tựu
  tabBook(c, { x, y, w, h }) {
    const sub = (this.bookSub = this.bookSub || 'book');
    [['book', 'Bộ sưu tập'], ['ach', 'Thành tựu']].forEach(([id, label], i) =>
      c.add(this.button(x + w / 2 - 75 + i * 150, y + 6, label, () => ((this.bookSub = id), this.renderInventory()), 140, sub === id ? 0x46607a : 0x3a3a4a, 30)));
    const top = y + 30;
    if (sub === 'book') {
      const rowH = Math.floor((h - 30) / BOOK.length);
      BOOK.forEach((b, i) => {
        const ry = top + i * rowH;
        const ids = b.items();
        const got = ids.filter((id) => state.seen?.[id]).length;
        c.add(this.add.text(x + 24, ry + rowH / 2, `${b.name}\n${got}/${ids.length}`, text(14, got === ids.length ? '#9be07a' : '#ffe9a8')).setOrigin(0, 0.5));
        const cell = Math.min(34, rowH - 8);
        ids.slice(0, 15).forEach((id, j) => {
          const it = ITEMS[id];
          const cx = x + 140 + j * (cell + 3), cy = ry + rowH / 2;
          c.add(box(this, 'ui_slot', cx - cell / 2, cy - cell / 2, cell, cell, 2));
          const ic = this.fitIcon(cx, cy, it.tex, it.frame, cell - 8);
          if (!state.seen?.[id]) ic.setTint(0x000000).setAlpha(0.45);
          else ic.setInteractive().on('pointerup', () => toast(`${it.name}${it.sell ? ` · bán ${it.sell} xu` : ''}`));
          c.add(ic);
        });
        const k = `book_${b.id}`;
        const done = bookDone(b), claimed = state.claimed?.[k];
        c.add(this.button(x + w - 80, ry + rowH / 2, claimed ? 'Đã nhận' : `+${b.reward} xu`, () => (claim(k, b.reward), this.renderInventory()), 110, done && !claimed ? 0x3f7a3a : 0x3a3a4a, 30, !done || claimed));
      });
    } else {
      const cols = 2, perCol = Math.ceil(ACHIEVEMENTS.length / cols);
      const rowH = Math.floor((h - 34) / perCol), cw = (w - 36) / cols;
      ACHIEVEMENTS.forEach((a, i) => {
        const rx = x + 18 + Math.floor(i / perCol) * cw, ry = top + 4 + (i % perCol) * rowH;
        const v = Math.min(a.goal, a.val()), done = achDone(a), claimed = state.claimed?.[a.id];
        c.add(box(this, 'ui_row', rx + 2, ry, cw - 4, rowH - 4, 2));
        c.add(this.add.text(rx + 12, ry + 3, `${done ? '✓' : '○'} ${a.name}`, text(15, done ? '#ffd34d' : '#ffffff')));
        c.add(this.add.text(rx + 12, ry + 22, a.desc, text(12, '#cfcfe0')));
        c.add(this.add.rectangle(rx + 12, ry + rowH - 14, 170, 7, 0x000000, 0.6).setOrigin(0, 0.5));
        c.add(this.add.rectangle(rx + 12, ry + rowH - 14, 170 * (v / a.goal), 7, done ? 0xffd34d : 0x7ad34f).setOrigin(0, 0.5));
        c.add(this.add.text(rx + 188, ry + rowH - 14, `${v}/${a.goal}`, text(11, '#cfcfe0')).setOrigin(0, 0.5));
        c.add(this.button(rx + cw - 62, ry + (rowH - 4) / 2, claimed ? 'Đã nhận' : `+${a.reward} xu`, () => (claim(a.id, a.reward), this.renderInventory()), 100, done && !claimed ? 0x3f7a3a : 0x3a3a4a, 28, !done || claimed));
      });
    }
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
    this.gains.slice(0, 4).forEach((g, i) => (g.c.setVisible(true), this.tweens.add({ targets: g.c, y: 146 + i * 38, duration: 150 })));
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
      if (!count(id) && state.sel === `item:${id}`) state.sel = 'none';
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
      if (state.sel === `item:${id}`) state.sel = 'none';
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
