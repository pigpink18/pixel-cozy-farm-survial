// ============================================================
//  Màn tựa của ván mới: "Chạm để bắt đầu" (mở khoá âm thanh trên điện thoại),
//  rồi vào đoạn mở đầu diễn ngay trong game — xem src/maps/introMaps.js (vách đá → bãi biển → làng).
// ============================================================
import Phaser from 'phaser';
import { state, save } from '../state.js';
import { FONT } from '../ui/theme.js';

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('Intro');
  }

  create() {
    this.cameras.main.setBackgroundColor('#06070f');
    const CX = this.scale.width / 2;
    // mưa lất phất trên màn tựa
    for (let i = 0; i < 60; i++) {
      const d = this.add.rectangle(0, 0, 2, 12, 0x8898c8, 0.35).setAngle(12);
      const fall = () => {
        d.setPosition(Math.random() * (this.scale.width + 40), -20);
        this.tweens.add({ targets: d, x: d.x - 60, y: 560, duration: 700 + Math.random() * 400, onComplete: fall });
      };
      this.time.delayedCall(Math.random() * 900, fall);
    }
    const t1 = this.add.text(CX, 200, 'Ashen Acre', { fontFamily: FONT, fontSize: '84px', color: '#c8e07a', stroke: '#0d0a0b', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
    const t2 = this.add.text(CX, 262, 'Vườn Tàn Tro', { fontFamily: FONT, fontSize: '34px', color: '#b8a888' }).setOrigin(0.5).setAlpha(0);
    const t3 = this.add.text(CX, 380, 'Chạm để bắt đầu', { fontFamily: FONT, fontSize: '30px', color: '#fff3d6' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 1400 });
    this.tweens.add({ targets: t3, alpha: { from: 0, to: 1 }, delay: 1200, duration: 700, onComplete: () => this.tweens.add({ targets: t3, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 }) });
    this.input.once('pointerup', () => {
      state.intro = 'cliff';
      state.time = 23 * 60; // nửa đêm mưa
      state.weather = 'rain';
      save();
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World', { map: 'cliff' }));
    });
  }
}
