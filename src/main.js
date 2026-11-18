import { prepareRotate, setupRotate, gameBox, pickWidth } from './rotate.js';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import WorldScene from './scenes/WorldScene.js';
import UIScene from './scenes/UIScene.js';
import IntroScene from './scenes/IntroScene.js';
import { state, bus, ui } from './state.js';
import { initSkills } from './skills.js';
import { ensureHome } from './furniture.js';
import { ensureSeen } from './collection.js';
import { ensureSurvival } from './survival.js';
import { ensureMainQuest } from './quests.js';

initSkills();
ensureSeen();
ensureSurvival();
ensureMainQuest(); // tách tiến độ nhiệm vụ chính khỏi nhiệm vụ giao hàng (sửa save bị lỗi)
ensureHome(); // chuyển nội thất của save cũ sang hệ thống trang trí mới

// iPhone/iPad (iOS 16.4+): vẫn phát âm thanh khi gạt công tắc im lặng
if (navigator.audioSession) navigator.audioSession.type = 'playback';

// Chờ font pixel (VT323, có tiếng Việt) tải xong rồi mới dựng game
Promise.all([document.fonts.load('32px VT323'), document.fonts.load('32px AshenGlyphs', '♥▶✓')]).catch(() => {}).finally(startGame);

function startGame() {
  prepareRotate();
  // Màn điện thoại dài (19.5:9...) → kéo dài bề ngang game cho phủ kín màn hình, không chừa viền đen
  const box = gameBox(); // khung đã trừ vùng Dynamic Island (xem rotate.js)
  const aspect = box.w / Math.max(1, box.h);
  const GAME_W = pickWidth(aspect);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: 540,
    backgroundColor: '#1d1d27',
    pixelArt: true,
    input: { activePointers: 3 }, // cần điều khiển + nút hành động cùng lúc
    roundPixels: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, IntroScene, WorldScene, UIScene],
  });
  setupRotate(game);
  // Chỉ khi dev: truy cập game từ console để debug
  if (import.meta.env.DEV) Object.assign(window, { __g: game, __state: state, __bus: bus, __ui: ui });
}

