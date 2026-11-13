// Chiến đấu trong hầm mỏ: quái vật, vung kiếm, máu người chơi
import Phaser from 'phaser';
import { TILE, MONSTERS, ITEMS } from './config.js';
import { state, ui, changed, sfx, addItem, selected, toolLv, xp } from './state.js';
import { skillLv } from './skills.js';

export default class Combat {
  constructor(scene) {
    this.scene = scene;
    this.monsters = [];
    this.group = scene.physics.add.group();
    scene.physics.add.collider(this.group, scene.walls, null, (m) => !m.getData('fly'));
    this.lastSwing = 0;
    this.invulnUntil = 0;
  }

  spawn(type, tx, ty) {
    const cfg = MONSTERS[type];
    const s = this.scene;
    const sprite = this.group.create(tx * TILE + 8, ty * TILE + 8, `mon_${type}`, 0);
    sprite.setData('fly', !!cfg.fly);
    sprite.body.setSize(10, 10).setOffset(3, 4);
    sprite.setDepth(sprite.y + 8);
    s.fx?.followShadow(sprite, 11, cfg.fly ? 12 : 7);
    const m = {
      kind: 'monster',
      type,
      cfg,
      sprite,
      hp: cfg.hp + Math.floor((this.scene.mineEff || this.scene.mineFloor || 1) / 4) * 2,
      next: 0,
      dir: { x: 0, y: 0 },
      knockUntil: 0,
      action: () =>
        selected().id === 'sword'
          ? { label: `Tấn công ${cfg.name}`, run: () => this.swingAt(m) }
          : { act: false, label: `${cfg.name} — chọn kiếm để đánh` },
    };
    sprite.play(`mon_${type}_down`);
    this.monsters.push(m);
    s.movers.push(m);
    return m;
  }

  update(time) {
    const s = this.scene;
    const p = s.player;
    const pc = p.body.center;
    for (const m of this.monsters) {
      const sp = m.sprite;
      sp.setDepth(sp.y + 8);
      if (ui.modal || ui.transition) {
        sp.setVelocity(0, 0);
        continue;
      }
      if (time < m.knockUntil) continue;
      const dx = pc.x - sp.x, dy = pc.y - sp.y;
      const d = Math.hypot(dx, dy);
      let vx = 0, vy = 0;
      if (d < 100) {
        vx = (dx / d) * m.cfg.speed;
        vy = (dy / d) * m.cfg.speed;
      } else if (time > m.next) {
        m.next = time + Phaser.Math.Between(1000, 2500);
        const a = Math.random() * Math.PI * 2;
        m.dir = Math.random() < 0.4 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) };
      }
      if (!vx && !vy) {
        vx = m.dir.x * m.cfg.speed * 0.5;
        vy = m.dir.y * m.cfg.speed * 0.5;
      }
      // Dơi bay lượn lắc lư
      if (m.cfg.fly) vy += Math.sin(time / 180 + sp.x) * 10;
      sp.setVelocity(vx, vy);
      const dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      sp.anims.play(`mon_${m.type}_${dir}`, true);

      // Chạm vào người chơi
      if (d < 11 && time > this.invulnUntil) this.hurtPlayer(m, dx, dy, d);
    }
  }

  hurtPlayer(m, dx, dy, d) {
    const s = this.scene;
    this.invulnUntil = s.time.now + 900;
    state.hp = Math.max(0, state.hp - m.cfg.dmg);
    sfx('hurt', 0.5);
    s.player.setTint(0xff6060);
    s.time.delayedCall(180, () => s.player.clearTint());
    s.knock = { x: (dx / (d || 1)) * 140, y: (dy / (d || 1)) * 140, until: s.time.now + 140 };
    s.cameras.main.shake(120, 0.004);
    changed();
    if (state.hp <= 0) s.faint();
  }

  // Vung kiếm về hướng đang nhìn
  swing() {
    const s = this.scene;
    const now = s.time.now;
    if (now - this.lastSwing < 380) return;
    this.lastSwing = now;
    s.playAction('harvest'); // vung liềm/kiếm
    sfx('swing', 0.4);
    const c = s.player.body.center;
    const f = s.facing;
    const hx = c.x + f.x * 12, hy = c.y + f.y * 12 - 2;
    this.drawArc(hx, hy, f);
    const dmg = 6 + (toolLv('sword') - 1) * 6 + (skillLv('combat') - 1);
    for (const m of [...this.monsters]) {
      if (Phaser.Math.Distance.Between(hx, hy, m.sprite.x, m.sprite.y) > 20) continue;
      this.hit(m, dmg, f);
    }
  }

  swingAt(m) {
    const s = this.scene;
    const c = s.player.body.center;
    const dx = m.sprite.x - c.x, dy = m.sprite.y - c.y;
    s.facing = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    this.swing();
  }

  drawArc(x, y, f) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(9500);
    const ang = Math.atan2(f.y, f.x);
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath();
    g.arc(x - f.x * 6, y - f.y * 6, 11, ang - 1.1, ang + 1.1);
    g.strokePath();
    g.lineStyle(1.5, 0xbfe3ff, 0.8);
    g.beginPath();
    g.arc(x - f.x * 6, y - f.y * 6, 8, ang - 0.9, ang + 0.9);
    g.strokePath();
    s.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  hit(m, dmg, f) {
    const s = this.scene;
    m.hp -= dmg;
    sfx('monster', 0.45);
    m.sprite.setTintFill(0xffffff);
    s.time.delayedCall(90, () => m.sprite.active && m.sprite.clearTint());
    m.knockUntil = s.time.now + 160;
    m.sprite.setVelocity(f.x * 160, f.y * 160);
    s.floatText(m.sprite.x, m.sprite.y - 10, `-${dmg}`, '#ffe08a');
    if (m.hp <= 0) this.kill(m);
  }

  kill(m) {
    const s = this.scene;
    const { x, y } = m.sprite;
    s.puff(Math.floor(x / TILE), Math.floor(y / TILE), 0xc0f0ff);
    this.monsters.splice(this.monsters.indexOf(m), 1);
    s.movers.splice(s.movers.indexOf(m), 1);
    m.sprite.destroy();
    xp('combat', 2);
    // Rơi đồ
    const floor = s.mineEff || s.mineFloor || 1;
    const r = Math.random();
    if (r < 0.45) {
      const coins = 5 + Math.floor(Math.random() * 6) + floor;
      state.coins += coins;
      s.floatText(x, y - 6, `+${coins} xu`, '#ffd34d');
      sfx('coin', 0.3);
    } else if (r < 0.7) {
      const ore = floor >= 20 ? 'ore_gold' : floor >= 10 ? 'ore_iron' : 'ore_copper';
      addItem(ore, 1);
      s.floatIcon(x, y - 6, ITEMS[ore].tex, ITEMS[ore].frame);
    }
    changed();
  }

  destroy() {
    this.monsters = [];
  }
}
