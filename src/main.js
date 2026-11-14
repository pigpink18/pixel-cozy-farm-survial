import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import WorldScene from './scenes/WorldScene.js';
import UIScene from './scenes/UIScene.js';
import { state, bus, ui } from './state.js';
import { initSkills } from './skills.js';
import { ensureHome } from './furniture.js';
import { ensureSeen } from './collection.js';

initSkills();
ensureSeen();
ensureHome(); // chuyển nội thất của save cũ sang hệ thống trang trí mới

// iPhone/iPad (iOS 16.4+): vẫn phát âm thanh khi gạt công tắc im lặng
if (navigator.audioSession) navigator.audioSession.type = 'playback';

// Chờ font pixel (VT323, có tiếng Việt) tải xong rồi mới dựng game
document.fonts.load('32px VT323').catch(() => {}).finally(startGame);

function startGame() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 960,
    height: 540,
    backgroundColor: '#1d1d27',
    pixelArt: true,
    input: { activePointers: 3 }, // cần điều khiển + nút hành động cùng lúc
    roundPixels: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, WorldScene, UIScene],
  });
  // Chỉ khi dev: truy cập game từ console để debug
  if (import.meta.env.DEV) Object.assign(window, { __g: game, __state: state, __bus: bus, __ui: ui });
}

