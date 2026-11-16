// Chiến đấu: quái hầm mỏ + zombie + ổ zombie. Vũ khí cận chiến & súng tự ngắm.
import Phaser from 'phaser';
import { TILE, MONSTERS, ITEMS } from './config.js';
import { state, ui, changed, sfx, addItem, selected, toolLv, xp, toast, count } from './state.js';
import { skillLv } from './skills.js';
import { WEAPONS, ZOMBIES, ZOMBIE_DROPS, reduceInfection, zoneState } from './survival.js';
import { nightFactor } from './fx.js';

// Vũ khí đang cầm (kiếm là công cụ, còn lại là vật phẩm)
export function heldWeapon() {
  const sel = selected();
  if (sel.kind === 'tool' && sel.id === 'sword') return { id: 'sword', ...WEAPONS.sword };
  if (sel.kind === 'item' && WEAPONS[sel.id]) return { id: sel.id, ...WEAPONS[sel.id] };
  return null;
}

export default class Combat {
  constructor(scene, zone = null) {
    this.scene = scene;
    this.zone = zone;
    this.monsters = [];
    this.group = scene.physics.add.group();
    scene.physics.add.collider(this.group, scene.walls, null, (m) => !m.getData('fly'));
    this.lastSwing = 0;
    this.invulnUntil = 0;
    this.nextGroan = 0;
  }

  // ---------- Quái hầm mỏ ----------
  spawn(type, tx, ty) {
    const cfg = MONSTERS[type];
    const s = this.scene;
    const sprite = this.group.create(tx * TILE + 8, ty * TILE + 8, `mon_${type}`, 0);
    sprite.setData('fly', !!cfg.fly);
    sprite.body.setSize(10, 10).setOffset(3, 4);
    sprite.setDepth(sprite.y + 8);
    s.fx?.followShadow(sprite, 11, cfg.fly ? 12 : 7);
    const m = {
      kind: 'monster', type, cfg, sprite,
      hp: cfg.hp + Math.floor((this.scene.mineEff || this.scene.mineFloor || 1) / 4) * 2,
      next: 0, dir: { x: 0, y: 0 }, knockUntil: 0,
      action: () => this.attackAction(m),
    };
    sprite.play(`mon_${type}_down`);
    this.monsters.push(m);
    s.movers.push(m);
    return m;
  }

  // ---------- Zombie ----------
  spawnZombie(type, tx, ty) {
    const cfg = ZOMBIES[type];
    const s = this.scene;
    const sprite = this.group.create(tx * TILE + 8, (ty + 1) * TILE, `zom_${type}`, 16).setOrigin(0.5, 1);
    const sc = cfg.scale || 1;
    sprite.setScale(sc);
    sprite.body.setSize(10, 8).setOffset(11, 23);
    s.fx?.followShadow(sprite, 13 * sc, -1);
    const m = {
      kind: 'monster', zombie: true, type, cfg, sprite,
      hp: cfg.hp, maxHp: cfg.hp, next: 0, dir: { x: 0, y: 0 }, knockUntil: 0, aggro: 0,
      action: () => this.attackAction(m),
    };
    sprite.play(`zom_${type}_idle_down`);
    // Mắt phát sáng trong bóng tối (nằm trên lớp tối)
    m.eyes = s.add.image(0, 0, 'fx_eyes').setDepth(9420).setBlendMode(Phaser.BlendModes.ADD).setTint(type === 'soldier' ? 0xfff0a0 : 0xffb090).setAlpha(0).setScale(sc);
    m.eyeGlow = s.add.image(0, 0, 'fx_glow').setDisplaySize(16 * sc, 9 * sc).setDepth(9419).setBlendMode(Phaser.BlendModes.ADD).setTint(type === 'soldier' ? 0xffc030 : 0xff2a10).setAlpha(0);
    m.face = 'down';
    this.monsters.push(m);
    s.movers.push(m);
    return m;
  }

  // Ổ zombie: đứng yên, thỉnh thoảng đẻ zombie khi người chơi lại gần. Phá ổ → giảm mạnh độ nhiễm.
  spawnNest(tx, ty, key) {
    const s = this.scene;
    const sprite = this.group.create(tx * TILE + 8, (ty + 1) * TILE, 'surv', 'nest0').setOrigin(0.5, 1);
    sprite.body.setSize(34, 14).setOffset(3, 10).setImmovable(true);
    let fr = 0;
    s.time.addEvent({ delay: 400, loop: true, callback: () => sprite.active && sprite.setFrame(`nest${(fr = 1 - fr)}`) });
    const m = {
      kind: 'monster', nest: true, key, cfg: { name: 'Ổ zombie', dmg: 0 }, sprite,
      hp: 160, maxHp: 160, next: s.time.now + 6000, knockUntil: 0,
      action: () => this.attackAction(m),
    };
    this.monsters.push(m);
    s.movers.push(m);
    this.hpBar(m);
    return m;
  }

  attackAction(m) {
    const w = heldWeapon();
    const name = m.cfg.name;
    if (!w) return { act: false, label: `${name} — chọn vũ khí (gậy, dao, súng) để đánh` };
    if (w.gun && count(w.ammo) <= 0) return { act: false, label: `${w.name} hết đạn! Lục thùng đồ hoặc đổi ở trại` };
    return { label: `${w.gun ? 'Bắn' : 'Đánh'} ${name}`, run: () => this.attack(m), self: true };
  }

  hpBar(m) {
    const s = this.scene;
    m.bar = s.add.rectangle(0, 0, 16, 2, 0xd04040).setOrigin(0, 0.5).setDepth(9200).setVisible(false);
    m.barBg = s.add.rectangle(0, 0, 16, 2, 0x000000, 0.6).setOrigin(0, 0.5).setDepth(9199).setVisible(false);
  }

  update(time) {
    const s = this.scene;
    const p = s.player;
    const pc = p.body.center;
    const night = nightFactor();
    for (const m of [...this.monsters]) {
      const sp = m.sprite;
      if (!sp.active) continue;
      sp.setDepth(m.zombie || m.nest ? sp.y : sp.y + 8);
      if (m.bar) {
        const show = m.hp < m.maxHp;
        const h = (m.cfg.scale || 1) * (m.nest ? 22 : 30);
        m.barBg.setVisible(show).setPosition(sp.x - 8, sp.y - h);
        m.bar.setVisible(show).setPosition(sp.x - 8, sp.y - h).setSize(16 * Math.max(0, m.hp / m.maxHp), 2);
      }
      if (m.eyes) this.placeEyes(m, time);
      if (m.nest) {
        // Đẻ zombie khi người chơi trong tầm 160px
        if (time > m.next && !ui.modal) {
          m.next = time + 14000;
          const d = Phaser.Math.Distance.Between(pc.x, pc.y, sp.x, sp.y);
          if (d < 170 && this.monsters.filter((x) => x.zombie).length < 24) {
            const t = { x: Math.floor(sp.x / TILE), y: Math.floor(sp.y / TILE) };
            this.spawnZombie(Math.random() < 0.7 ? 'walker' : 'runner', t.x, t.y + 1);
            sfx('groan', 0.35);
          }
        }
        continue;
      }
      if (ui.modal || ui.transition) {
        sp.setVelocity(0, 0);
        continue;
      }
      if (time < m.knockUntil) continue;
      const dx = pc.x - sp.x, dy = pc.y - (m.zombie ? sp.y - 4 : sp.y);
      const d = Math.hypot(dx, dy);
      let vx = 0, vy = 0;
      const sight = m.zombie ? m.cfg.sight * (1 + night * 0.4) : 100;
      const speed = m.zombie ? m.cfg.speed * (1 + night * 0.25) : m.cfg.speed;
      if (d < sight || time < m.aggro) {
        if (m.zombie && d < 220) this.chaseAt = time; // nhạc đánh nhau
        vx = (dx / d) * speed;
        vy = (dy / d) * speed;
        if (m.zombie && time > this.nextGroan && d < 120) {
          this.nextGroan = time + Phaser.Math.Between(2500, 5000);
          sfx('groan', 0.25);
        }
      } else if (time > m.next) {
        m.next = time + Phaser.Math.Between(1000, 2500);
        const a = Math.random() * Math.PI * 2;
        m.dir = Math.random() < 0.4 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) };
      }
      if (!vx && !vy) {
        vx = m.dir.x * speed * 0.4;
        vy = m.dir.y * speed * 0.4;
      }
      if (m.cfg.fly) vy += Math.sin(time / 180 + sp.x) * 10;
      sp.setVelocity(vx, vy);
      const dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      if (m.zombie) {
        m.face = dir;
        const moving = Math.abs(vx) + Math.abs(vy) > 2;
        sp.anims.play(`zom_${m.type}_${moving ? '' : 'idle_'}${dir}`, true);
        sp.anims.timeScale = speed / 30;
      } else sp.anims.play(`mon_${m.type}_${dir}`, true);

      const reach = m.zombie ? 12 * (m.cfg.scale || 1) : 11;
      if (d < reach && time > this.invulnUntil) this.hurtPlayer(m, dx, dy, d);
    }
  }

  placeEyes(m, time) {
    const sp = m.sprite, sc = m.cfg.scale || 1;
    const dark = this.scene.mapId === 'mine' ? 0.9 : this.scene.fx?.darkness || 0;
    const a = m.face === 'up' ? 0 : Phaser.Math.Clamp((dark - 0.2) * 2.2, 0, 1) * (0.85 + Math.sin(time / 260 + sp.x) * 0.15);
    const side = m.face === 'left' ? -1 : m.face === 'right' ? 1 : 0;
    const x = sp.x + side * 2 * sc, y = sp.y - 20 * sc;
    m.eyes.setTexture(side ? 'fx_eye' : 'fx_eyes').setPosition(Math.round(x), Math.round(y)).setAlpha(a);
    m.eyeGlow.setPosition(x, y).setAlpha(a * 0.9);
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

  // Mục tiêu gần nhất trong tầm (ưu tiên zombie đang ở hướng nhìn)
  nearest(range, from) {
    let best = null, bd = range;
    for (const m of this.monsters) {
      if (!m.sprite.active) continue;
      const tx = m.sprite.x, ty = m.zombie || m.nest ? m.sprite.y - 6 : m.sprite.y;
      const d = Phaser.Math.Distance.Between(from.x, from.y, tx, ty);
      if (d < bd) (bd = d), (best = m);
    }
    return best;
  }

  aimPoint(m) {
    return { x: m.sprite.x, y: m.zombie ? m.sprite.y - 10 * (m.cfg.scale || 1) : m.nest ? m.sprite.y - 8 : m.sprite.y };
  }

  // Nút tấn công: tự ngắm zombie gần nhất. Trả về true nếu đã xử lý.
  attack(target = null) {
    const w = heldWeapon();
    if (!w) return false;
    const s = this.scene;
    const now = s.time.now;
    if (now - this.lastSwing < w.rate) return true;
    const c = s.player.body.center;
    const from = { x: c.x, y: c.y - 6 };
    const m = target && target.sprite?.active ? target : this.nearest(w.gun ? w.range : w.range + 14, from);
    if (m) {
      const p = this.aimPoint(m);
      const dx = p.x - from.x, dy = p.y - from.y;
      s.facing = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
      s.setPose?.(false);
    }
    if (w.gun) {
      if (count(w.ammo) <= 0) {
        toast(`${w.name} hết đạn!`);
        sfx('empty', 0.5);
        this.lastSwing = now;
        return true;
      }
      if (!m) {
        toast('Không có mục tiêu trong tầm bắn');
        this.lastSwing = now;
        return true;
      }
      this.lastSwing = now;
      addItem(w.ammo, -1, true);
      this.shoot(w, from, m);
      return true;
    }
    // Cận chiến
    this.lastSwing = now;
    s.playAction('harvest');
    sfx('swing', 0.4);
    const f = s.facing;
    const hx = c.x + f.x * 12, hy = c.y + f.y * 12 - 4;
    this.drawArc(hx, hy, f);
    const bonus = w.id === 'sword' ? (toolLv('sword') - 1) * 6 : 0;
    const dmg = w.dmg + bonus + (skillLv('combat') - 1);
    for (const t of [...this.monsters]) {
      const p = this.aimPoint(t);
      if (Phaser.Math.Distance.Between(hx, hy, p.x, p.y) > w.range + (t.nest ? 12 : 0)) continue;
      this.hit(t, dmg, f);
    }
    return true;
  }

  shoot(w, from, m) {
    const s = this.scene;
    const p = this.aimPoint(m);
    const ang = Math.atan2(p.y - from.y, p.x - from.x);
    const dmg = w.dmg + (skillLv('combat') - 1);
    sfx(w.pellets ? 'shotgun' : w.id === 'w_rifle' ? 'rifle' : 'shot', 0.5);
    s.cameras.main.shake(70, w.pellets ? 0.006 : 0.003);
    const flash = s.add.image(from.x + Math.cos(ang) * 10, from.y + Math.sin(ang) * 10, 'fx_glow').setDisplaySize(14, 14).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setDepth(9500);
    s.tweens.add({ targets: flash, alpha: 0, duration: 90, onComplete: () => flash.destroy() });
    const tracer = (a, len) => {
      const g = s.add.graphics().setDepth(9400);
      g.lineStyle(1, 0xfff0b0, 0.9);
      g.lineBetween(from.x + Math.cos(a) * 8, from.y + Math.sin(a) * 8, from.x + Math.cos(a) * len, from.y + Math.sin(a) * len);
      s.tweens.add({ targets: g, alpha: 0, duration: 110, onComplete: () => g.destroy() });
    };
    const f = { x: Math.cos(ang), y: Math.sin(ang) };
    if (w.pellets) {
      // Bắn chùm: trúng mọi mục tiêu trong hình nón
      for (let i = 0; i < w.pellets; i++) tracer(ang + (i / (w.pellets - 1) - 0.5) * w.cone, w.range);
      for (const t of [...this.monsters]) {
        const q = this.aimPoint(t);
        const d = Phaser.Math.Distance.Between(from.x, from.y, q.x, q.y);
        const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(q.y - from.y, q.x - from.x) - ang));
        if (d <= w.range && da <= w.cone / 2 + 0.15) this.hit(t, Math.round(dmg * Math.max(1, Math.ceil(w.pellets * (1 - d / w.range)))), f);
      }
    } else {
      tracer(ang, Phaser.Math.Distance.Between(from.x, from.y, p.x, p.y));
      this.hit(m, dmg, f);
    }
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

  // Giữ tương thích hầm mỏ cũ
  swing() {
    this.attack();
  }

  hit(m, dmg, f) {
    const s = this.scene;
    if (!m.sprite.active) return;
    m.hp -= dmg;
    sfx('monster', 0.4);
    m.sprite.setTintFill(0xffffff);
    s.time.delayedCall(90, () => m.sprite.active && m.sprite.clearTint());
    if (!m.nest) {
      m.knockUntil = s.time.now + 160;
      m.aggro = s.time.now + 8000;
      m.sprite.setVelocity(f.x * 160, f.y * 160);
    }
    if (m.zombie && !m.bar) this.hpBar(m);
    const p = this.aimPoint(m);
    s.floatText(p.x, p.y - 6, `-${dmg}`, '#ffe08a');
    if (m.zombie || m.nest) this.splat(m.sprite.x, m.sprite.y, false);
    if (m.hp <= 0) this.kill(m);
  }

  splat(x, y, big) {
    const s = this.scene;
    const b = s.add.image(x + Phaser.Math.Between(-4, 4), y - 2, 'surv', `blood${Phaser.Math.Between(0, 1)}`).setDepth(-700).setAlpha(big ? 0.9 : 0.6).setScale(big ? 1 : 0.6);
    s.tweens.add({ targets: b, alpha: 0, delay: 15000, duration: 3000, onComplete: () => b.destroy() });
  }

  kill(m) {
    const s = this.scene;
    const { x, y } = m.sprite;
    this.monsters.splice(this.monsters.indexOf(m), 1);
    const i = s.movers.indexOf(m);
    if (i >= 0) s.movers.splice(i, 1);
    m.bar?.destroy();
    m.barBg?.destroy();
    m.eyes?.destroy();
    m.eyeGlow?.destroy();
    m.sprite.destroy();
    xp('combat', m.zombie ? 3 : m.nest ? 15 : 2);
    if (m.nest) {
      s.puff(Math.floor(x / TILE), Math.floor(y / TILE) - 1, 0x8ad060);
      this.splat(x, y, true);
      if (this.zone) {
        zoneState(this.zone).nests[m.key] = true;
        reduceInfection(this.zone, 30);
      }
      sfx('boom', 0.6);
      toast('Đã phá huỷ ổ zombie!');
      for (const [id, n] of [['scrap', 4], ['parts', 1]]) addItem(id, n);
      changed();
      return;
    }
    if (m.zombie) {
      sfx('zdie', 0.5);
      this.splat(x, y, true);
      const z = this.zone && zoneState(this.zone);
      if (z) z.kills = (z.kills || 0) + 1;
      if (this.zone) reduceInfection(this.zone, m.type === 'brute' ? 5 : 1.5);
      state.stats = state.stats || {};
      state.stats.zombies = (state.stats.zombies || 0) + 1;
      const [a, b] = m.cfg.xu;
      const coins = a + Math.floor(Math.random() * (b - a + 1));
      state.coins += coins;
      s.floatText(x, y - 20, `+${coins} xu`, '#ffd34d');
      let dy = 28;
      for (const [id, p, n] of ZOMBIE_DROPS[m.type] || []) {
        if (Math.random() > p) continue;
        const k = 1 + Math.floor(Math.random() * n);
        addItem(id, k);
        s.floatIcon(x, y - (dy += 6), ITEMS[id].tex, ITEMS[id].frame);
      }
      changed();
      return;
    }
    // Quái hầm mỏ
    s.puff(Math.floor(x / TILE), Math.floor(y / TILE), 0xc0f0ff);
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
