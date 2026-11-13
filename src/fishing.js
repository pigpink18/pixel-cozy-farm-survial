// Câu cá: chờ cá cắn → chạm đúng lúc → mini-game canh nhịp (chạm khi kim ở vùng xanh)
import Phaser from 'phaser';
import { FISH, ITEMS } from './config.js';
import { state, ui, bus, changed, toast, sfx, addItem, season, xp, bagHasRoom } from './state.js';
import { skillLv } from './skills.js';

export function pickFish(where) {
  const sid = season().id;
  const night = state.time >= 18 * 60;
  const pool = Object.entries(FISH).filter(([, f]) => f.where.includes(where) && f.seasons.includes(sid) && (!f.night || night));
  const weight = (f) => f.weight * (f.rain && state.weather === 'rain' ? 2 : 1);
  let r = Math.random() * pool.reduce((a, [, f]) => a + weight(f), 0);
  for (const [id, f] of pool) if ((r -= weight(f)) <= 0) return id;
  return pool[0]?.[0] || 'fish_ro';
}

import { textLight as txt, box } from './ui/theme.js';

export default class Fishing {
  constructor(scene) {
    this.s = scene;
    this.phase = null;
  }

  get active() {
    return !!this.phase;
  }

  start(where) {
    const s = this.s;
    this.where = where;
    this.fish = pickFish(where);
    this.diff = FISH[this.fish].diff;
    this.phase = 'wait';
    this.startedAt = s.time.now;
    ui.modal = 'fish';
    this.c = s.add.container(0, 0).setDepth(300);
    this.label = s.add.text(s.W / 2, s.H / 2 - 120, 'Đang chờ cá cắn câu…', txt(22, '#bfe3ff')).setOrigin(0.5);
    this.sub = s.add.text(s.W / 2, s.H / 2 - 90, 'Chạm khi thấy dấu  !', txt(15, '#cfcfe0')).setOrigin(0.5);
    this.c.add([this.label, this.sub]);
    this.timer = s.time.delayedCall(Phaser.Math.Between(1500, 4500), () => this.bite());
  }

  bite() {
    const s = this.s;
    this.phase = 'bite';
    sfx('alert', 0.5);
    bus.emit('fishBite');
    this.label.setText('!').setFontSize(64).setColor('#ffd34d');
    this.sub.setText('Chạm ngay!');
    s.tweens.add({ targets: this.label, scale: 1.25, yoyo: true, repeat: 3, duration: 120 });
    this.timer = s.time.delayedCall(1100, () => this.end(null, 'Cá chạy mất rồi…'));
  }

  startGame() {
    const s = this.s;
    this.timer?.remove();
    this.phase = 'game';
    this.pos = 0;
    this.dir = 1;
    this.speed = 0.65 + this.diff * 0.3;
    this.zoneW = 0.3 - this.diff * 0.06 + (skillLv('fishing') - 1) * 0.012;
    this.zoneX = Phaser.Math.FloatBetween(0.1, 0.9 - this.zoneW);
    this.hits = 0;
    this.need = this.diff;
    this.lives = 3;
    this.label.setText('Cá cắn câu!').setFontSize(24).setColor('#ffffff');
    const bw = 400, bx = s.W / 2 - bw / 2, by = s.H / 2 - 40;
    this.bar = { x: bx, y: by, w: bw };
    const g = (this.g = s.add.graphics());
    this.c.add(g);
    this.drawGame();
  }

  drawGame() {
    const { x, y, w } = this.bar;
    const g = this.g.clear();
    if (!this.frame) this.c.addAt((this.frame = box(this.s, 'ui_frame', x - 24, y - 28, w + 48, 92)), 0);
    g.fillStyle(0x40527a, 1).fillRect(x, y, w, 26);
    g.fillStyle(0x81944a, 1).fillRect(x + this.zoneX * w, y, this.zoneW * w, 26);
    g.fillStyle(0xffffff, 1).fillRect(x + this.pos * w - 3, y - 6, 6, 38);
    // tiến độ & mạng
    for (let i = 0; i < this.need; i++) g.fillStyle(i < this.hits ? 0xffd34d : 0x555566, 1).fillCircle(x + 10 + i * 22, y + 44, 7);
    for (let i = 0; i < 3; i++) g.fillStyle(i < this.lives ? 0xff6b8a : 0x555566, 1).fillCircle(x + w - 10 - i * 22, y + 44, 7);
    this.sub.setText(`Chạm khi kim trắng nằm trong vùng xanh (${this.hits}/${this.need})`);
  }

  update(delta) {
    if (this.phase !== 'game') return;
    this.pos += this.dir * this.speed * (delta / 1000);
    if (this.pos > 1) (this.pos = 1), (this.dir = -1);
    if (this.pos < 0) (this.pos = 0), (this.dir = 1);
    this.drawGame();
  }

  press() {
    if (!this.phase || this.s.time.now - this.startedAt < 200) return;
    if (this.phase === 'wait') return this.end(null, 'Kéo hụt — cá chưa cắn câu.');
    if (this.phase === 'bite') return this.startGame();
    if (this.phase !== 'game') return;
    const inZone = this.pos >= this.zoneX && this.pos <= this.zoneX + this.zoneW;
    if (inZone) {
      this.hits++;
      sfx('click', 0.4);
      if (this.hits >= this.need) return this.end(this.fish);
      this.zoneX = Phaser.Math.FloatBetween(0.05, 0.95 - this.zoneW);
    } else {
      this.lives--;
      sfx('cancel', 0.4);
      this.s.cameras.main.shake(100, 0.004);
      if (this.lives <= 0) return this.end(null, 'Cá vùng vẫy thoát mất!');
    }
  }

  end(item, msg) {
    this.timer?.remove();
    this.c?.destroy();
    this.frame = null;
    this.phase = null;
    this.s.time.delayedCall(0, () => ui.modal === 'fish' && (ui.modal = null));
    if (item && !bagHasRoom(item)) {
      msg = 'Túi đồ đầy — đành thả cá đi!';
      item = null;
    }
    if (item) {
      addItem(item);
      xp('fishing', this.diff * 2 + 1);
      sfx('success', 0.5);
      toast(`Câu được ${ITEMS[item].name}!${item === 'fish_gold' ? ' Hiếm lắm đó!' : ''}`);
      changed();
    } else if (msg) toast(msg);
    bus.emit('fishEnd', item);
  }
}
