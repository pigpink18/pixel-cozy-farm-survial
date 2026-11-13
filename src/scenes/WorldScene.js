import Phaser from 'phaser';
import {
  HOME_CHEST, TILE, ZOOM, PLAYER_SPEED, COLORS, CROPS, ITEMS, TOOLS, ANIMALS, BUILDINGS, NPCS, RIPE_STAGE, REGROW_STAGE, MAX_HP, MAX_ENERGY, AREA_BY_LEVEL, MINE_W, MINE_H,
} from '../config.js';
import { state, ui, bus, changed, save, toast, sfx, season, selected, addItem, count, useEnergy, hearts, toolLv, waterCap, xp, roomFor, isTouchDevice } from '../state.js';
import { FARM, FARM_W, FARM_H, isReserved, generateObjects, migrateFarmLayout, migrateHaydayLayout, addWildResources } from '../farmLayout.js';
import { buildHayday, updateHayday } from '../maps/haydayFarm.js';
import { farmXp, have, take, earnCoins, absMin, unlocked, needLevel } from '../hayday.js';
import { newDay } from '../day.js';
import { growCrops, newCrop, regrowCrop, minutesLeft, timeText } from '../crops.js';
import { talk, boardPanel, shopOpen } from '../shops.js';
import { buildForest, FOREST } from '../maps/forest.js';
import { buildMine, mineAction, MINE_SPAWN } from '../maps/mine.js';
import { buildHome, homeAction, HOME, decoPointer, decoMove } from '../maps/home.js';
import { buildShop, SHOPS, SHOP_IN } from '../maps/shop.js';
import { buildQuarry, QUARRY } from '../maps/quarry.js';
import { buildNpcHome } from '../maps/npchome.js';
import { SCHEDULE, HOUSES, NPC_HOUSE_IN, HOUSE_OPEN, slotNow } from '../npcs.js';
import { energyCost, bonusChance, maxHp } from '../skills.js';
import { todayFestival, festivalActive } from '../festivals.js';
import WorldFX from '../fx.js';

const key = (x, y) => `${x},${y}`;
const PREFIX = { key: 'Space: ', mouse: 'Click: ', touch: 'Chạm: ' };
const SOLID = ['tree', 'stump', 'rock', 'fence', 'sprinkler'];
const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

function seededRandom(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// Vị trí cố định trong làng
const VILLAGE = {
  w: 52, h: 34,
  exit: [{ x: 0, y: 11 }, { x: 0, y: 12 }],
  fromFarm: { x: 2, y: 11 },
  plaza: { x0: 15, y0: 12, x1: 25, y1: 17 },
  // Đường đất (x0, y0, x1, y1)
  roads: [
    [0, 11, 15, 12], // lối vào từ nông trại
    [12, 9, 36, 10], // phố chợ trước các cửa hàng
    [15, 12, 25, 17], // quảng trường
    [26, 13, 49, 14], // đường phía đông
    [19, 18, 20, 31], // đường phía nam
    [6, 30, 40, 31], // ngõ phía nam
    [4, 6, 5, 10], // ngõ nhà phía tây
    [41, 8, 42, 12], // ngõ nhà phía đông bắc
    [48, 15, 49, 19], [44, 18, 47, 19], // ngõ nhà phía đông
    [32, 21, 33, 29], // ngõ nhà giữa
    [10, 23, 18, 23], // lối vào Xưởng mộc (dãy dưới, bên trái)
    [21, 23, 25, 23], // lối vào Trại chăn nuôi (dãy dưới, bên phải)
    [6, 21, 7, 29], // ngõ nhà tây nam
    [15, 30, 16, 30], [25, 29, 25, 29], [39, 29, 39, 29],
  ],
  houses: [
    ['homeOrange', 3, 5], ['homeBeige', 31, 20], ['homeSmall', 5, 20], ['homeOrange', 40, 7],
    ['homeBeige', 44, 17], ['homeSmall', 38, 28], ['homeOrange', 14, 29], ['homeSmall', 24, 28],
  ],
  flowerBeds: [[15, 12, 16, 12], [24, 12, 25, 12], [15, 17, 16, 17], [24, 17, 25, 17], [16, 8, 18, 8], [23, 8, 24, 8], [29, 8, 30, 8]],
  trees: [[9, 15], [12, 15], [28, 16], [36, 17], [47, 10], [50, 24], [29, 26], [10, 26], [44, 30], [12, 4], [37, 4], [21, 5], [26, 5], [15, 25]],
  groves: [[44, 2, 50, 5], [1, 15, 4, 19], [46, 26, 50, 31]],
  board: { x: 10, y: 9 },
  npcs: {
    lan: { x: 14, y: 8, r: 0, from: 8, to: 18 },
    tu: { x: 20, y: 8, r: 0, from: 8, to: 18 },
    mai: { x: 26, y: 8, r: 0, from: 8, to: 18 },
    ti: { x: 18, y: 13, r: 5, from: 7, to: 19 },
    ba: { x: 23, y: 12, r: 7, from: 7, to: 21 },
  },
};

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  init(data) {
    this.mapId = data.map || 'farm';
    this.spawnAt = data.spawn || null;
    this.mineFloor = data.floor || 1;
    this.mineZone = data.zone || 'forest';
    this.houseId = data.house || 'lan';
    this.houseBack = data.back || null;
    this.mineEff = null;
    this.shopId = data.shop || 'store';
  }

  create() {
    this.sea = season();
    const SIZES = { farm: [FARM_W, FARM_H], village: [VILLAGE.w, VILLAGE.h], forest: [FOREST.w, FOREST.h], mine: [MINE_W, MINE_H], home: [HOME.w, HOME.h], shop: [SHOP_IN.w, SHOP_IN.h], quarry: [QUARRY.w, QUARRY.h], npchome: [NPC_HOUSE_IN.w, NPC_HOUSE_IN.h] };
    [this.mapW, this.mapH] = SIZES[this.mapId];
    this.worldW = this.mapW * TILE;
    this.worldH = this.mapH * TILE;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    // Xoá tham chiếu của bản đồ trước (scene được tái sử dụng khi đổi bản đồ)
    this.groundLayer = null;
    this.objShadows = new Map();
    this.lakeTiles = new Set();
    this.fx = new WorldFX(this);
    if (['farm', 'village', 'forest'].includes(this.mapId)) this.grassGround();
    else this.add.rectangle(0, 0, this.worldW, this.worldH, this.sea.ground).setOrigin(0).setDepth(-1000);

    this.blocked = new Set();
    this.noTill = new Set();
    this.statics = new Map(); // ô → (sel) => action
    this.redirects = new Map(); // ô bấm vào → ô tương tác thật (vd. mặt quầy → trước quầy)
    this.exits = new Map();
    this.walls = this.physics.add.staticGroup();
    this.objWalls = new Map();
    this.soilSprites = new Map();
    this.cropSprites = new Map();
    this.objSprites = new Map();
    this.decor = new Map();
    this.waterTiles = new Set(); // ô nước câu được (tầm quăng xa hơn)
    this.movers = []; // NPC + vật nuôi + quái
    this.path = null;
    this.combat = null;
    this.caveLight = null;
    this.knock = null;

    if (this.mapId === 'farm') this.buildFarm();
    else if (this.mapId === 'village') this.buildVillage();
    else if (this.mapId === 'forest') buildForest(this);
    else if (this.mapId === 'mine') buildMine(this);
    else if (this.mapId === 'home') buildHome(this);
    else if (this.mapId === 'shop') buildShop(this, this.shopId);
    else if (this.mapId === 'quarry') buildQuarry(this);
    else if (this.mapId === 'npchome') buildNpcHome(this, this.houseId);
    // NPC theo lịch sinh hoạt (chủ tiệm do buildShop tự đặt sau quầy)
    this.place = this.mapId === 'shop' ? `shop:${this.shopId}` : this.mapId === 'npchome' ? `house:${this.houseId}` : this.mapId;
    ui.place = this.place;
    if (this.mapId !== 'shop') this.spawnScheduled();

    const DEFAULT_SPAWN = { farm: FARM.bedSpawn, village: VILLAGE.fromFarm, forest: FOREST.fromFarm, mine: MINE_SPAWN, home: HOME.bedSpawn, shop: SHOP_IN.enter, quarry: QUARRY.fromVillage, npchome: NPC_HOUSE_IN.enter };
    const sp = this.spawnAt || DEFAULT_SPAWN[this.mapId];
    this.createPlayer(sp.x, sp.y);

    this.cursor = this.add.rectangle(0, 0, TILE, TILE, 0xffffff, 0.15).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.9).setDepth(9000);
    this.marker = this.add.rectangle(0, 0, 6, 6, 0xffd34d).setDepth(9001).setVisible(false);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    if (['home', 'shop', 'npchome'].includes(this.mapId)) {
      // Phòng nhỏ: giữ giữa theo chiều ngang, cuộn dọc theo nhân vật để không bị thanh thông tin (trên) và thanh công cụ (dưới) che
      const vw = this.scale.width / ZOOM;
      cam.setBounds(this.worldW / 2 - vw / 2, -46, vw, this.worldH + 46 + 30).startFollow(this.player, true, 0.15, 0.15);
    } else if (this.worldW * ZOOM <= this.scale.width && this.worldH * ZOOM <= this.scale.height) cam.centerOn(this.worldW / 2, this.worldH / 2 + 12);
    else cam.setBounds(0, 0, this.worldW, this.worldH).startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(350, 0, 0, 0);
    if (this.fx.outdoor) this.fx.spawnAmbient();
    this.fx.followShadow(this.player, 13, 15);

    this.setupInput();

    const onPassout = () => this.sleep(true);
    bus.on('passout', onPassout);
    // Cây lớn theo đồng hồ: vẽ lại ô nào vừa lên giai đoạn mới
    const onGrow = (keys) => {
      if (this.mapId !== 'farm') return;
      for (const k of keys) {
        const [x, y] = k.split(',').map(Number);
        this.renderCrop(x, y);
        this.cropGrowFx(x, y);
      }
    };
    bus.on('cropsGrew', onGrow);
    // Chuồng xây xong khi đang đứng ở nông trại → vẽ lại nông trại tại chỗ
    const onBuilt = () => {
      if (this.mapId !== 'farm') return;
      const { tx, ty } = this.playerTile();
      this.changeMap('farm', { x: tx, y: ty });
    };
    bus.on('buildingDone', onBuilt);
    // Nút "Ra ngoài" (trong nhà / cửa hàng): đi thẳng ra cửa
    const onLeave = () => {
      if (ui.transition || ui.modal || !['home', 'shop', 'npchome'].includes(this.mapId)) return;
      const exit = [...this.exits.values()][0];
      if (exit) this.changeMap(exit.map, exit.spawn);
    };
    bus.on('leaveRoom', onLeave);
    this.events.once('shutdown', () => {
      bus.off('leaveRoom', onLeave);
      bus.off('passout', onPassout);
      bus.off('cropsGrew', onGrow);
      bus.off('buildingDone', onBuilt);
    });

    if (this.scene.isActive('UI')) this.scene.bringToTop('UI');
    else this.scene.launch('UI');
    ui.transition = false;
    this.lastHint = null;
    bus.emit('mapChanged', this.mapId);
  }

  // =========================================================
  //  Dựng bản đồ chung
  // =========================================================
  addWall(x, y, w, h, block = true) {
    const z = this.add.zone(x, y, w, h).setOrigin(0);
    this.physics.add.existing(z, true);
    this.walls.add(z);
    if (block)
      for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 1) / TILE); tx++)
        for (let ty = Math.floor(y / TILE); ty <= Math.floor((y + h - 1) / TILE); ty++) this.blocked.add(key(tx, ty));
    return z;
  }

  // Ảnh công trình đặt theo ô: góc dưới-trái ở (tx, tyBottom+1)
  building(tex, frame, tx, tyBottom, wallRows = 2) {
    const img = this.add.image(tx * TILE, (tyBottom + 1) * TILE, tex, frame).setOrigin(0, 1);
    img.setDepth(img.y);
    this.fx.shadow(img.x + img.width / 2, img.y - 1, img.width * 1.05);
    this.addWall(img.x + 2, img.y - wallRows * TILE, img.width - 4, wallRows * TILE - 2);
    return img;
  }

  // Mặt cỏ Farmer Pack (tilemap) — các biến thể cỏ có hoa, lật ngẫu nhiên cho tự nhiên
  grassGround() {
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: this.mapW, height: this.mapH });
    const ts = map.addTilesetImage('fp_tiles');
    const layer = (this.groundLayer = map.createBlankLayer('ground', ts, 0, 0).setDepth(-1000));
    const rnd = seededRandom(this.mapW * 31 + this.mapH);
    for (let x = 0; x < this.mapW; x++)
      for (let y = 0; y < this.mapH; y++) {
        const r = rnd();
        const t = layer.putTileAt(r < 0.72 ? 27 + Math.floor(rnd() * 4) : Math.floor(rnd() * 4), x, y); // phần lớn cỏ trơn, điểm vài khóm hoa
        t.flipX = rnd() < 0.5;
        t.tint = this.sea.grassTint;
      }
    if (this.sea.snow) this.add.rectangle(0, 0, this.worldW, this.worldH, 0xffffff, 0.5).setOrigin(0).setDepth(-990);
  }

  // Viền cỏ quanh một vùng đất/nước (ô cỏ có mép tối hướng về phía vùng đó)
  grassEdges(x0, y0, x1, y1) {
    const L = this.groundLayer;
    if (!L) return;
    const put = (idx, x, y) => {
      if (!this.inMap(x, y)) return;
      const cur = L.getTileAt(x, y)?.index;
      if (cur >= 16 && cur <= 21) return; // không đè lên đất của vùng khác
      const t = L.putTileAt(idx, x, y);
      t.tint = this.sea.grassTint;
    };
    for (let x = x0; x <= x1; x++) {
      put(6 + (x % 2), x, y0 - 1); // mép dưới của ô cỏ phía trên
      put(4 + (x % 2), x, y1 + 1); // mép trên của ô cỏ phía dưới
    }
    for (let y = y0; y <= y1; y++) {
      put(10 + (y % 2), x0 - 1, y); // mép phải của ô cỏ bên trái
      put(8 + (y % 2), x1 + 1, y); // mép trái của ô cỏ bên phải
    }
  }

  // Vùng đất trống (đường đi, quảng trường)
  dirtArea(x0, y0, x1, y1) {
    const L = this.groundLayer;
    const rnd = seededRandom(x0 * 97 + y0 * 13 + x1);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        if (!this.inMap(x, y)) continue;
        const t = L.putTileAt(16 + Math.floor(rnd() * 4), x, y);
        t.flipX = rnd() < 0.5;
      }
    this.grassEdges(x0, y0, x1, y1);
  }

  // Khung cây theo mùa: kind 0 = tán tròn, 1 = thông, 2 = cây ăn quả
  treeFrame(kind) {
    return kind * 4 + state.season;
  }

  tree(px, py, kind) {
    if (kind === undefined) {
      const h = (Math.floor(px) * 7 + Math.floor(py) * 13) % 10;
      kind = h < 6 ? 0 : h < 9 ? 1 : 2;
    }
    const img = this.add.image(px, py + 2, 'fp_trees', this.treeFrame(kind)).setOrigin(0.5, 1).setDepth(py);
    this.fx.shadow(px, py, 24);
    this.fx.sway(img);
    this.addWall(px - 5, py - 6, 10, 5);
    return img;
  }

  // Ao/hồ: nước Farmer Pack (lăn tăn) + viền cỏ
  drawWater(x0, y0, x1, y1) {
    const winter = this.sea.id === 'winter';
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const w = this.add.sprite(x * TILE, y * TILE, 'fp_tiles', 26).setOrigin(0).setDepth(-850);
        if (winter) w.setTint(0xcfe0f0);
        else if ((x * 7 + y * 3) % 3 === 0) w.play({ key: 'fp_water_anim', startFrame: (x + y) % 4 });
      }
    if (!winter) this.fx.sparkleWater(x0, y0, x1, y1);
    this.grassEdges(x0, y0, x1, y1);
  }

  // gaps: { top, bottom, left, right } = [ô bắt đầu, ô kết thúc] để chừa lối đi
  borderTrees(gaps = {}) {
    const inGap = (side, px) => gaps[side] && px >= (gaps[side][0] - 1) * TILE && px <= (gaps[side][1] + 2) * TILE;
    for (let x = 16; x < this.worldW; x += 40) if (!inGap('top', x)) this.tree(x, 34);
    for (let x = 36; x < this.worldW; x += 40) if (!inGap('bottom', x)) this.tree(x, this.worldH + 8);
    for (let y = 80; y < this.worldH; y += 44) {
      if (!inGap('left', y)) this.tree(10, y);
      if (!inGap('right', y)) this.tree(this.worldW - 10, y);
    }
  }

  nineSlice(texture, frameFn, x0, y0, x1, y1, depth, tint) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const img = this.add.image(x * TILE, y * TILE, texture, frameFn(y === y0, y === y1, x === x0, x === x1)).setOrigin(0).setDepth(depth);
        if (tint) img.setTint(tint);
      }
  }

  scatterDecor(isFree, n, seed) {
    const rnd = seededRandom(seed);
    const winter = this.sea.id === 'winter';
    for (let i = 0; i < n; i++) {
      const tx = Math.floor(rnd() * this.mapW), ty = Math.floor(rnd() * this.mapH);
      const k = key(tx, ty);
      const r = rnd(), pick = rnd();
      if (!isFree(tx, ty) || this.decor.has(k)) continue;
      if (winter && r > 0.4) continue;
      if (r < 0.8) continue; // mặt cỏ đã có hoa văn, chỉ rải thêm ít bụi & hoa
      const img = r < 0.9
        ? this.add.image(tx * TILE, ty * TILE, 'fp_bushes', state.season + (pick < 0.3 ? 4 : 0)).setScale(0.75).setOrigin(-0.15, -0.3)
        : this.add.image(tx * TILE, ty * TILE, 'objects', ['flowerWhite', 'flowerRed', 'clover'][Math.floor(pick * 3)]).setOrigin(0);
      img.setDepth(-900);
      this.decor.set(k, img);
    }
  }

  removeDecor(k) {
    this.decor.get(k)?.destroy();
    this.decor.delete(k);
  }

  // =========================================================
  //  Nông trại
  // =========================================================
  buildFarm() {
    if (!state.objects) {
      generateObjects();
      addWildResources();
      state.farmSize = 5;
      save();
    } else if ((state.farmSize || 1) < 5) {
      // Save cũ → bố cục thiết kế tay mới + chỗ cho công trình Hay Day + lối tắt + thêm tài nguyên
      if ((state.farmSize || 1) < 3) migrateFarmLayout();
      migrateHaydayLayout();
      addWildResources();
      state.farmSize = 5;
      save();
    }
    const winter = this.sea.id === 'winter';

    // Nhà
    const hx = 3 * TILE, hy = 8 * TILE;
    this.add.image(hx, hy, 'objects', 'house').setOrigin(0, 1).setDepth(hy);
    this.fx.shadow(hx + 48, hy - 2, 92);
    for (const [lx, ly, sz] of [[25, 27, 34], [71, 27, 34], [48, 62, 26]]) this.fx.light(hx + lx, hy - ly, sz);
    this.add.image(hx + 48, hy - 3, 'objects', 'door').setOrigin(0.5, 1).setDepth(hy + 0.5);
    this.addWall(hx + 10, hy - 56, 76, 54);
    this.statics.set(key(FARM.door.x, FARM.door.y), () => ({ label: 'Vào nhà', run: () => this.changeMap('home', HOME.enter) }));

    // Rương bán hàng
    const c = FARM.chest;
    // Thùng bán hàng (màu gỗ) — khác với rương chứa đồ (màu đỏ)
    this.add.image(c.x * TILE + 8, (c.y + 1) * TILE, 'objects', 'chest').setOrigin(0.5, 1).setDepth((c.y + 1) * TILE).setTint(0xe0b070);
    this.fx.shadow(c.x * TILE + 8, (c.y + 1) * TILE - 1, 16);
    this.addWall(c.x * TILE + 1, c.y * TILE + 4, 14, 12);
    this.statics.set(key(c.x, c.y), () => ({ label: 'Thùng bán hàng — bán nông sản', run: () => this.sellAll() }));
    // Rương chứa đồ có sẵn cạnh nhà
    const [sx, sy] = HOME_CHEST.split(':')[1].split(',').map(Number);
    this.add.image(sx * TILE + 8, (sy + 1) * TILE, 'objects', 'chestStore').setOrigin(0.5, 1).setDepth((sy + 1) * TILE);
    this.fx.shadow(sx * TILE + 8, (sy + 1) * TILE - 1, 16);
    this.addWall(sx * TILE + 1, sy * TILE + 4, 14, 12);
    this.statics.set(key(sx, sy), () => ({ label: 'Mở rương chứa đồ', run: () => bus.emit('openStorage', HOME_CHEST) }));

    // Ao nước
    for (const p of [FARM.pond, FARM.pond2]) {
      this.drawWater(p.x, p.y, p.x + p.w - 1, p.y + p.h - 1);
      this.addWall(p.x * TILE + 6, p.y * TILE + 6, p.w * TILE - 12, p.h * TILE - 10);
      for (let x = p.x; x < p.x + p.w; x++)
        for (let y = p.y; y < p.y + p.h; y++) {
          this.statics.set(key(x, y), (sel) => this.waterAction('pond', x, y, sel));
          this.waterTiles.add(key(x, y));
        }
    }

    // Đường đất nối nhà – ruộng – chuồng – làng – rừng
    for (const [x0, y0, x1, y1] of FARM.paths) this.dirtArea(x0, y0, x1, y1);
    for (const e of [...FARM.exit, ...FARM.northExit]) this.exits.set(key(e.x, e.y), { map: 'village', spawn: VILLAGE.fromFarm });
    const ns = FARM.northSign;
    this.add.image(ns.x * TILE + 8, (ns.y + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((ns.y + 1) * TILE);
    this.add.text(ns.x * TILE + 8, ns.y * TILE - 4, '↑ Thị trấn', { fontFamily: 'VT323', fontSize: '40px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 8 }).setScale(0.25).setOrigin(0.5, 1).setDepth(9000);
    for (const e of FARM.southExit) this.exits.set(key(e.x, e.y), { map: 'forest', spawn: FOREST.fromFarm });

    // Ruộng có rào, cổng bên phải
    const f = FARM.field;
    this.fenceRect([f.x0, f.y0, f.x1, f.y1], f.gate);
    // Bồn hoa trước nhà
    FARM.flowerBeds.forEach((r, i) => this.flowerBed(r, i));
    // Dải rừng dày ở mép bản đồ
    FARM.forestBands.forEach((r, i) => this.forestBand(r, 300 + i));

    this.borderTrees({ right: [9, 14], bottom: [18, 21], top: [15, 18] });

    // Kho, nhà máy, bảng đơn hàng, sạp bán (kiểu Hay Day)
    buildHayday(this);

    // Chuồng trại (có rào bao quanh bãi thả)
    this.buildPen('coop', 'coop', FARM.coop.x, FARM.coop.y + 1, 2);
    this.buildPen('barn', 'barn', FARM.barn.x, FARM.barn.y + 4, 3);
    for (const id of ['coop', 'barn']) {
      const [x0, y0, x1, y1] = FARM[id].fence;
      const [g0, g1] = FARM[id].gate;
      this.fenceRect([x0, y0, x1, y1], [{ x: g0, y: y1 }, { x: g1, y: y1 }], true);
    }

    // Vật cản, đất, cây trồng
    for (const k of Object.keys(state.objects)) this.renderObject(k);
    growCrops();
    for (const k of Object.keys(state.tiles)) {
      const [x, y] = k.split(',').map(Number);
      this.renderSoil(x, y);
      this.renderCrop(x, y);
    }
    this.scatterDecor((x, y) => !isReserved(x, y) && !state.tiles[key(x, y)] && !state.objects[key(x, y)] && !this.blocked.has(key(x, y)), 700, 42);
  }

  // ---------- Đồ trang trí thiết kế tay ----------
  // Hàng rào quanh hình chữ nhật; gaps = ô để trống làm cổng; skipTop: bỏ cạnh trên (sát công trình)
  fenceRect([x0, y0, x1, y1], gaps = [], skipTop = false) {
    const isGap = (x, y) => gaps.some((g) => g.x === x && g.y === y);
    const put = (x, y, frame) => {
      const k = key(x, y);
      if (isGap(x, y) || state.tiles[k] || this.blocked.has(k)) return;
      delete state.objects[k];
      this.add.image(x * TILE + 8, (y + 1) * TILE, 'fp_fence', frame).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 2);
      this.fx.shadow(x * TILE + 8, (y + 1) * TILE - 1, frame === 1 ? 8 : 16);
      this.addWall(x * TILE + 3, y * TILE + 4, 10, 10);
      this.removeDecor(k);
    };
    // Hàng ngang: cột đầu (3/4) ở góc và hai bên cổng để thanh rào nối liền
    const row = (y) => {
      for (let x = x0; x <= x1; x++) {
        const left = x === x0 || isGap(x - 1, y);
        const right = x === x1 || isGap(x + 1, y);
        put(x, y, left && right ? 2 : left ? 3 : right ? 4 : 0);
      }
    };
    if (!skipTop) row(y0);
    row(y1);
    for (let y = y0 + 1; y < y1; y++) {
      put(x0, y, isGap(x0, y + 1) || isGap(x0, y - 1) ? 2 : 1);
      put(x1, y, isGap(x1, y + 1) || isGap(x1, y - 1) ? 2 : 1);
    }
  }

  flowerBed([x0, y0, x1, y1], seed = 0) {
    const kinds = ['flowerRed', 'flowerWhite', 'flowerRed', 'clover'];
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const k = key(x, y);
        delete state.objects[k];
        this.removeDecor(k);
        this.add.image(x * TILE + 8, (y + 1) * TILE, 'objects', kinds[(x + y + seed) % kinds.length]).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 3);
      }
  }

  // Rừng dày: cây so le trong một vùng chữ nhật
  forestBand([x0, y0, x1, y1], seed) {
    const r = seededRandom(seed);
    for (let y = y0 + 1; y <= y1 + 1; y += 2)
      for (let x = x0 + ((y >> 1) % 2) * 1.5; x <= x1; x += 2.6 + r() * 0.8) {
        const px = Math.round(x * TILE + 8), py = y * TILE;
        if (this.blocked.has(key(Math.floor(px / TILE), y - 1))) continue;
        this.tree(px, py);
      }
  }

  buildPen(id, frame, tx, tyBottom, wallRows) {
    const cfg = FARM[id];
    const st = state.buildings[id];
    if (!st) {
      const s = cfg.sign;
      this.add.image(s.x * TILE + 8, (s.y + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((s.y + 1) * TILE);
      this.addWall(s.x * TILE + 3, s.y * TILE + 8, 10, 8);
      this.statics.set(key(s.x, s.y), () => ({
        act: false,
        label: `Đất xây ${BUILDINGS[id].name} — đặt xây ở Xưởng mộc của Chú Tư trong làng`,
      }));
      return;
    }
    const img = this.building('nhouse', frame, tx, tyBottom, wallRows);
    if (st === 'building') {
      // Đang xây: biển báo công trường thay vì ảnh mờ
      const s = cfg.sign;
      this.add.image(s.x * TILE + 8, (s.y + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((s.y + 1) * TILE + 1);
      const left = () => Math.max(1, (state.buildDone?.[id] ?? absMin()) - absMin());
      for (let x = tx; x < tx + Math.ceil(img.width / TILE); x++)
        this.statics.set(key(x, tyBottom), () => ({ act: false, label: `${BUILDINGS[id].name} đang xây — xong sau ${left()} phút` }));
      return;
    }
    // Máng cỏ
    const t = cfg.trough;
    const trough = this.add.image(t.x * TILE + 8, (t.y + 1) * TILE, 'objects', 'hay').setOrigin(0.5, 1).setScale(0.6).setDepth((t.y + 1) * TILE);
    this.addWall(t.x * TILE + 2, t.y * TILE + 6, 12, 10);
    const hungry = () => state.animals.filter((a) => ANIMALS[a.type].house === id && !a.fed);
    const refresh = () => trough.setAlpha(hungry().length ? 0.45 : 1);
    refresh();
    this.statics.set(key(t.x, t.y), () => {
      const n = hungry().length;
      if (!state.animals.some((a) => ANIMALS[a.type].house === id)) return { act: false, label: 'Máng cỏ — chưa có vật nuôi (mua ở trại Cô Mai)' };
      if (!n) return { act: false, label: 'Vật nuôi đã được cho ăn hôm nay' };
      return {
        label: `Cho ăn (${n} phần — có ${have('hay')} cỏ khô, ${have('feed')} thức ăn)`,
        run: () => {
          const list = hungry();
          const food = have('hay') + have('feed');
          if (!food) return toast('Cần cỏ khô (trại Cô Mai, nhổ cỏ dại) hoặc thức ăn gia súc (Cối xay)');
          const k = Math.min(list.length, food);
          list.slice(0, k).forEach((a) => (a.fed = true));
          const fromHay = Math.min(k, have('hay'));
          take('hay', fromHay);
          take('feed', k - fromHay);
          sfx('grass');
          toast(`Đã cho ${k} con ăn` + (k < list.length ? ` — còn ${list.length - k} con đói` : ''));
          refresh();
          changed();
        },
      };
    });
    // Vật nuôi
    for (const a of state.animals) if (ANIMALS[a.type].house === id) this.spawnAnimal(a, cfg.pen);
  }

  // ---------- Vật nuôi ----------
  spawnAnimal(a, pen) {
    const tx = Phaser.Math.Between(pen.x0, pen.x1), ty = Phaser.Math.Between(pen.y0, pen.y1);
    const acfg = ANIMALS[a.type];
    const sprite = this.add.sprite(tx * TILE + 8, (ty + 1) * TILE, acfg.tex, acfg.frame).setOrigin(0.5, 1);
    sprite.play(`animal_${a.type}_walk`);
    this.fx.followShadow(sprite, { chicken: 10, pig: 16, cow: 24 }[a.type] || 14, -1);
    sprite.anims.pause();
    const bubble = this.add.image(0, 0, ITEMS[ANIMALS[a.type].product].tex, ITEMS[ANIMALS[a.type].product].frame).setScale(0.7).setDepth(8800);
    const m = {
      kind: 'animal',
      data: a,
      sprite,
      bubble,
      next: this.time.now + Phaser.Math.Between(500, 3000),
      wander: () => {
        const nx = Phaser.Math.Between(pen.x0, pen.x1) * TILE + 8, ny = (Phaser.Math.Between(pen.y0, pen.y1) + 1) * TILE;
        const d = Phaser.Math.Distance.Between(sprite.x, sprite.y, nx, ny);
        sprite.setFlipX(acfg.facesRight ? nx < sprite.x : nx > sprite.x);
        sprite.anims.resume();
        this.tweens.add({ targets: sprite, x: nx, y: ny, duration: (d / 12) * 1000, onComplete: () => sprite.anims.pause() });
        return (d / 12) * 1000 + Phaser.Math.Between(1500, 5000);
      },
      action: () => {
        const cfg = ANIMALS[a.type];
        if (a.product)
          return {
            label: `Lấy ${ITEMS[cfg.product].name}`,
            run: () => {
              if (!roomFor(cfg.product)) return;
              a.product = false;
              addItem(cfg.product);
              xp('farming', 1);
              farmXp(1);
              this.floatIcon(sprite.x, sprite.y - 16, ITEMS[cfg.product].tex, ITEMS[cfg.product].frame);
              sfx('harvest');
              toast(`+1 ${ITEMS[cfg.product].name}`);
              changed();
            },
          };
        if (!a.petted)
          return {
            label: `Vuốt ve ${cfg.name} ${a.name}`,
            run: () => {
              a.petted = true;
              this.floatText(sprite.x, sprite.y - 18, '♥', '#ff6b8a');
              sfx('animal', 0.4);
              toast(`${cfg.name} ${a.name} ${hearts(a.pts)}${a.fed ? '' : ' — đang đói!'}`);
              changed();
            },
          };
        return { act: false, label: `${cfg.name} ${a.name} ${hearts(a.pts)}${a.fed ? ' · đã ăn' : ' · đói'}` };
      },
    };
    this.movers.push(m);
  }

  // =========================================================
  //  Làng
  // =========================================================
  buildVillage() {
    const V = VILLAGE;
    const pl = V.plaza;
    // Đường làng thiết kế tay: lối vào, phố chợ, quảng trường, đường đông, đường nam, ngõ tới từng nhà
    for (const [x0, y0, x1, y1] of V.roads) this.dirtArea(x0, y0, x1, y1);
    for (const e of V.exit) this.exits.set(key(e.x, e.y), { map: 'farm', spawn: FARM.fromVillage });
    // Cuối đường phía đông: lên Mỏ đá (mở theo uy tín)
    this.dirtArea(50, 13, 51, 14);
    const qOpen = unlocked('quarry');
    for (const y of [13, 14]) {
      if (qOpen) this.exits.set(key(51, y), { map: 'quarry', spawn: QUARRY.fromVillage });
      else {
        this.addWall(50 * TILE, y * TILE, 2 * TILE, TILE);
        for (const x of [49, 50, 51]) this.statics.set(key(x, y), () => ({ act: false, label: `Đường lên Mỏ đá — mở ở uy tín cấp ${needLevel('quarry')}` }));
      }
    }
    this.add.image(49 * TILE + 8, 13 * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth(13 * TILE);
    this.add
      .text(49 * TILE + 8, 12 * TILE - 4, qOpen ? 'Mỏ đá →' : `Mỏ đá (uy tín ${needLevel('quarry')})`, { fontFamily: 'VT323', fontSize: '36px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 7 })
      .setScale(0.25)
      .setOrigin(0.5, 1)
      .setDepth(9000);
    if (!qOpen) for (const y of [13, 14]) this.add.image(51 * TILE + 8, (y + 1) * TILE, 'objects', 'rock').setOrigin(0.5, 1).setDepth((y + 1) * TILE).setTint(0xd6c2a8);

    this.borderTrees({ left: [9, 14], right: [12, 15] });

    // Cửa hàng: bấm vào nhà để bước vào trong (chủ tiệm đứng sau quầy)
    const festToday = todayFestival();
    for (const [id, S] of Object.entries(SHOPS)) {
      const img = this.building('nhouse', S.frame, S.x, S.yB, 2);
      this.fx.light(img.x + img.width / 2, img.y - 12, 54);
      const w = Math.ceil(img.width / TILE);
      const enter = () => {
        if (festToday) return { act: false, label: `${S.title} — hôm nay nghỉ, cả làng đi lễ hội` };
        if (!shopOpen()) return { act: false, label: `${S.title} — mở cửa 8:00–18:00` };
        return { label: `Vào ${S.title}`, run: () => this.changeMap('shop', SHOP_IN.enter, { shop: id }) };
      };
      for (let x = S.x; x < S.x + w; x++) for (let y = S.yB - 1; y <= S.yB; y++) this.statics.set(key(x, y), enter);
      this.statics.set(key(S.door.x, S.door.y - 1), enter);
    }
    this.building('nhouse', 'market', 31, 7, 2);

    // Nhà dân
    for (const [frame, x, yB] of V.houses) {
      const h = this.building('nhouse', frame, x, yB, 2);
      this.fx.light(h.x + h.width / 2, h.y - 12, 40);
    }
    // Sân nhà có rào (nhà phía tây)
    this.fenceRect([2, 2, 7, 7], [{ x: 4, y: 7 }, { x: 5, y: 7 }], true);

    // Ao làng
    this.drawWater(40, 22, 45, 25);
    this.addWall(40 * TILE + 6, 22 * TILE + 6, 6 * TILE - 12, 4 * TILE - 10);
    for (let x = 40; x <= 45; x++)
      for (let y = 22; y <= 25; y++) {
        this.statics.set(key(x, y), (sel) => this.waterAction('pond', x, y, sel));
        this.waterTiles.add(key(x, y));
      }

    // Quảng trường: cây cổ thụ ở giữa, bồn hoa 4 góc
    this.tree(20 * TILE + 8, 15 * TILE);
    V.flowerBeds.forEach((r, i) => this.flowerBed(r, i));
    // Hàng cây ven đường & các cụm cây
    V.trees.forEach(([x, y]) => this.tree(x * TILE + 8, (y + 1) * TILE));
    V.groves.forEach((r, i) => this.forestBand(r, 500 + i));

    // Bảng nhiệm vụ
    const b = V.board;
    this.add.image(b.x * TILE, (b.y + 1) * TILE, 'nhouse', 'board').setOrigin(0, 1).setDepth((b.y + 1) * TILE);
    this.addWall(b.x * TILE + 2, b.y * TILE + 4, 28, 12);
    for (const x of [b.x, b.x + 1])
      this.statics.set(key(x, b.y), () => ({ label: 'Xem bảng nhiệm vụ', run: () => bus.emit('panel', boardPanel) }));

    // Lễ hội: trang trí quanh quảng trường
    const fest = todayFestival();
    if (fest) this.festivalDecor(fest, pl);

    // NPC: do spawnScheduled() đặt theo lịch sinh hoạt (lễ hội thì tụ tập quảng trường)
    this.festSpots = fest ? (() => {
      const spots = [[19, 11], [16, 13], [23, 13], [17, 15], [22, 15], [20, 16]];
      const others = Object.keys(SCHEDULE).filter((id) => id !== fest.host);
      return Object.fromEntries(Object.keys(SCHEDULE).map((id) => {
        const [x, y] = fest.host === id ? spots[0] : spots[1 + others.indexOf(id)];
        return [id, { x, y, r: 0 }];
      }));
    })() : null;

    // Nhà dân: nhà có chủ thì vào chơi được
    V.houses.forEach(([frame, x, yB], idx) => {
      const hid = Object.keys(HOUSES).find((k) => HOUSES[k].house === idx);
      const w = Math.ceil((this.textures.getFrame('nhouse', frame)?.width || 48) / TILE);
      const back = { x: x + Math.floor(w / 2), y: yB + 1 };
      const enter = () => {
        if (!hid) return { act: false, label: 'Nhà dân — cửa đóng' };
        const Hs = HOUSES[hid];
        const h = state.time / 60;
        if (h < HOUSE_OPEN[0] || h >= HOUSE_OPEN[1]) return { act: false, label: `${Hs.title} — mọi người đã ngủ (mở ${HOUSE_OPEN[0]}:00–${HOUSE_OPEN[1]}:00)` };
        return { label: `Vào ${Hs.title}`, run: () => this.changeMap('npchome', NPC_HOUSE_IN.enter, { house: hid, back }) };
      };
      for (let tx = x; tx < x + w; tx++) for (let ty = yB - 1; ty <= yB; ty++) if (!this.statics.has(key(tx, ty))) this.statics.set(key(tx, ty), enter);
    });

    const inRect = (x, y, r) => x >= r.x0 - 1 && x <= r.x1 + 1 && y >= r.y0 - 1 && y <= r.y1 + 1;
    const dirt = (x, y) => (this.groundLayer.getTileAt(x, y)?.index ?? 0) >= 16 && this.groundLayer.getTileAt(x, y).index <= 21;
    this.scatterDecor((x, y) => !this.blocked.has(key(x, y)) && !dirt(x, y), 420, 99);
  }

  festivalDecor(f, pl) {
    const spots = [];
    for (let x = pl.x0; x <= pl.x1; x += 3) spots.push([x, pl.y0 - 1], [x, pl.y1 + 1]);
    spots.forEach(([x, y], i) => {
      if (this.blocked.has(key(x, y))) return;
      let img;
      if (f.decor === 'flower') img = this.add.image(x * TILE + 8, (y + 1) * TILE, 'objects', i % 2 ? 'flowerRed' : 'flowerWhite');
      else {
        img = this.add.image(x * TILE + 8, (y + 1) * TILE, 'nhouse', `banner${i % 6}`);
        if (f.decor === 'lantern') {
          img.setTint(0xffc070);
          const glow = this.add.circle(x * TILE + 8, y * TILE - 6, 7, 0xffd070, 0.35).setDepth(9500);
          this.tweens.add({ targets: glow, alpha: 0.12, yoyo: true, repeat: -1, duration: 900 + i * 37 });
        }
      }
      img.setOrigin(0.5, 1).setDepth((y + 1) * TILE);
    });
    this.add
      .text(((pl.x0 + pl.x1) / 2) * TILE + 8, pl.y0 * TILE + 4, f.name, { fontFamily: 'VT323', fontSize: '56px', color: '#fdd179', stroke: '#3d3333', strokeThickness: 10 })
      .setScale(0.25)
      .setOrigin(0.5, 0)
      .setDepth(-800);
  }

  // Đặt NPC có lịch ghé bản đồ này (mỗi NPC 1 sprite, hiện/ẩn theo giờ)
  spawnScheduled() {
    for (const [id, sched] of Object.entries(SCHEDULE)) {
      if (!NPCS[id] || !this.textures.exists(`npc_${id}`)) continue;
      const slots = sched.filter((s) => s[2] === this.place && s[3] != null).map(([from, to, , x, y, r]) => ({ from, to, x, y, r: r || 0 }));
      const fest = this.mapId === 'village' ? this.festSpots?.[id] : null;
      if (!slots.length && !fest) continue;
      const first = slots[0] || fest;
      this.spawnNPC(id, { x: first.x, y: first.y, slots, fest });
    }
  }

  spawnNPC(id, cfg) {
    const sheet = id;
    // Các khung giờ NPC có mặt ở bản đồ này: [{ from, to, x, y, r }]
    const slots = cfg.slots || [{ from: cfg.from ?? 0, to: cfg.to ?? 24, x: cfg.x, y: cfg.y, r: cfg.r || 0 }];
    // Khung 32x32 giống nhân vật chính: chân ở hàng 31 → gốc dưới khung đặt tại đáy ô
    const sprite = this.add.sprite(cfg.x * TILE + 8, (cfg.y + 1) * TILE, `npc_${id}`, 16).setOrigin(0.5, 1);
    sprite.play(`npc_${id}_idle_down`);
    // Đỉnh đầu thật (NPC không đội mũ / trẻ con thấp hơn) để đặt tên cho sát
    let headTop = 0;
    while (headTop < 31 && ![...Array(32).keys()].some((x) => this.textures.getPixelAlpha(x, headTop, `npc_${id}`, 16))) headTop++;
    this.fx.followShadow(sprite, 13, -1);
    const name = this.add
      .text(0, 0, NPCS[id].name, { fontFamily: 'VT323', fontSize: '34px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 7 })
      .setScale(0.25)
      .setOrigin(0.5, 1)
      .setDepth(8900);
    const m = {
      kind: 'npc',
      id,
      nameDy: 32 - headTop - 3,
      sprite,
      name,
      home: cfg,
      cur: undefined,
      next: this.time.now + Phaser.Math.Between(500, 2500),
      // Chỗ cần đứng lúc này (null = không ở bản đồ này)
      target: () => {
        if (festivalActive()) return this.mapId === 'village' ? cfg.fest || null : null;
        const h = state.time / 60;
        return slots.find((sl) => h >= sl.from && h < sl.to) || null;
      },
      wander: () => {
        const c = m.cur;
        if (!c || !c.r) return 4000;
        const [dx, dy] = Object.values(DIRS)[Phaser.Math.Between(0, 3)];
        const t = this.moverTile(m);
        const nx = t.x + dx, ny = t.y + dy;
        if (Math.abs(nx - c.x) > c.r || Math.abs(ny - c.y) > c.r || !this.walkable(nx, ny)) return 600;
        const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === dx && DIRS[k][1] === dy);
        sprite.play(`npc_${sheet}_${dir}`, true);
        this.tweens.add({
          targets: sprite,
          x: nx * TILE + 8,
          y: (ny + 1) * TILE,
          duration: 520,
          onComplete: () => sprite.play(`npc_${sheet}_idle_${dir}`, true),
        });
        return 520 + Phaser.Math.Between(800, 3500);
      },
      action: () => ({ label: `Nói chuyện với ${NPCS[id].name}`, run: () => this.talkTo(m) }),
    };
    this.movers.push(m);
    return m;
  }

  talkTo(m) {
    // Quay mặt về phía người chơi
    const dx = this.player.x - m.sprite.x, dy = this.player.body.center.y - (m.sprite.y - 8);
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    m.sprite.play(`npc_${m.id}_idle_${dir}`, true);
    m.hold = this.time.now + 6000;
    talk(m.id);
  }

  moverTile(m) {
    return { x: Math.floor(m.sprite.x / TILE), y: Math.floor((m.sprite.y - 1) / TILE) };
  }

  updateMovers(time) {
    for (const m of this.movers) {
      if (m.kind === 'monster') continue;
      if (m.kind === 'npc') {
        // Đổi khung giờ (hoặc lễ hội): đi tới chỗ mới / rời khỏi bản đồ
        const want = m.target();
        if (want !== m.cur) {
          m.cur = want;
          this.tweens.killTweensOf(m.sprite);
          if (want) {
            m.sprite.setPosition(want.x * TILE + 8, (want.y + 1) * TILE).setAlpha(0);
            this.tweens.add({ targets: m.sprite, alpha: 1, duration: 400 });
            m.sprite.play(`npc_${m.id}_idle_down`, true);
          }
        }
        const vis = !!want;
        m.sprite.setVisible(vis);
        m.name.setVisible(vis).setPosition(m.sprite.x, m.sprite.y - m.nameDy);
        if (!vis) continue;
      } else {
        m.bubble.setVisible(m.data.product).setPosition(m.sprite.x, m.sprite.y - 20 + Math.sin(time / 250) * 1.5);
      }
      m.sprite.setDepth(m.sprite.y);
      if (time > m.next && !(m.hold > time) && !ui.modal) m.next = time + m.wander();
    }
  }

  // =========================================================
  //  Người chơi & điều khiển
  // =========================================================
  createPlayer(tx, ty) {
    this.player = this.physics.add.sprite(tx * TILE + 8, ty * TILE - 5, 'fp_farmer', 16);
    this.player.body.setSize(8, 5).setOffset(12, 27); // chân nông dân (khung 32x32 Farmer Pack)
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);
    this.facing = { x: 0, y: 1 };
    this.actionUntil = 0;
    this.setPose(false);
  }

  facingName() {
    const f = this.facing;
    return f.x < 0 ? 'left' : f.x > 0 ? 'right' : f.y < 0 ? 'up' : 'down';
  }

  // Tư thế nhân vật theo hướng nhìn: đi bộ / đứng / vung kiếm
  setPose(moving) {
    const dir = this.facingName();
    const p = this.player;
    if (this.time.now < this.actionUntil) return; // đang làm động tác
    p.setFlipX(false);
    p.anims.play(`hero_${moving ? 'walk' : 'idle'}_${dir}`, true);
  }

  // Động tác theo hướng nhìn: hoe | can | plant | harvest (rìu/cuốc chim dùng động tác cuốc)
  playAction(kind) {
    const k = { axe: 'hoe', pickaxe: 'hoe' }[kind] || kind;
    const dir = this.facingName();
    const view = dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
    this.actionUntil = this.time.now + 360;
    this.player.setVelocity(0, 0);
    this.player.setFlipX(dir === 'right'); // tư thế ngang trong Farmer Pack nhìn sang trái
    this.player.anims.play(`hero_${k}_${view}`, true);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    const act = () => {
      if (ui.modal || ui.transition || !this.target) return;
      this.inputMode = 'key';
      const a = this.actionAt(this.target);
      if (a?.act !== false && a?.run) a.run();
      else if (a?.label) toast(a.label);
    };
    this.input.keyboard.on('keydown-SPACE', act);
    this.input.keyboard.on('keydown-E', act);
    // Nút "Làm" trên điện thoại
    const touchAct = () => {
      act();
      this.inputMode = 'touch';
    };
    bus.on('action', touchAct);
    this.events.once('shutdown', () => bus.off('action', touchAct));

    this.inputMode = isTouchDevice(this.sys.game) ? 'touch' : 'key';
    this.hover = null;
    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointerup', () => (this.swipe = null));
    this.input.on('pointermove', (p) => {
      if (ui.deco) return decoMove(this, p.worldX, p.worldY);
      if (this.swipe && p.isDown) return this.onSwipe(p);
      if (p.wasTouch) return;
      this.inputMode = 'mouse';
      this.hover = this.resolveTarget(p.worldX, p.worldY);
    });
  }

  update(time, delta) {
    this.fx.update(time, delta);
    const k = this.keys;
    const p = this.player;
    const frozen = ui.modal || ui.transition || ui.deco;
    let vx = 0, vy = 0;
    if (!frozen) {
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
    }
    if (!vx && !vy && !frozen && Math.hypot(ui.joy.x, ui.joy.y) > 0.25) {
      // Cần điều khiển ảo
      vx = ui.joy.x;
      vy = ui.joy.y;
      this.cancelPath();
      this.inputMode = 'touch';
    } else if (vx || vy) {
      this.cancelPath();
      this.inputMode = 'key';
    } else if (this.path && !frozen) {
      const dir = this.followPath(time);
      if (dir) ({ x: vx, y: vy } = dir);
    }
    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(PLAYER_SPEED);
    if (this.knock && time < this.knock.until) p.setVelocity(this.knock.x, this.knock.y);
    else p.setVelocity(v.x, v.y);
    if (vx || vy) {
      this.facing = Math.abs(vx) >= Math.abs(vy) ? { x: Math.sign(vx), y: 0 } : { x: 0, y: Math.sign(vy) };
      this.setPose(true);
    } else this.setPose(false);
    p.setDepth(p.body.bottom);

    this.updateMovers(time);
    if (this.mapId === 'farm') updateHayday(this, time);
    this.combat?.update(time);
    this.caveLight?.update(time);

    const { tx, ty } = this.playerTile();
    if (!ui.transition && !ui.deco) {
      const exit = this.exits.get(key(tx, ty));
      if (exit) return this.changeMap(exit.map, exit.spawn);
    }

    // Ô mục tiêu (trước mặt hoặc dưới chuột)
    this.target = this.moverAt(tx + this.facing.x, ty + this.facing.y) || { tx: tx + this.facing.x, ty: ty + this.facing.y };
    const shown = this.inputMode === 'mouse' && this.hover ? this.hover : this.target;
    const st = shown.mover ? this.moverTile(shown.mover) : { x: shown.tx, y: shown.ty };
    this.cursor.setVisible(false); // không hiện ô trắng chọn ô

    const a = frozen ? null : this.actionAt(shown);
    const hint = a ? (a.act !== false ? PREFIX[this.inputMode] : '') + a.label : '';
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      bus.emit('hint', hint);
    }
  }

  playerTile() {
    return { tx: Math.floor(this.player.body.center.x / TILE), ty: Math.floor(this.player.body.center.y / TILE) };
  }

  inMap(x, y) {
    return x >= 0 && y >= 0 && x < this.mapW && y < this.mapH;
  }

  walkable(x, y) {
    return this.inMap(x, y) && !this.blocked.has(key(x, y));
  }

  moverAt(tx, ty) {
    const m = this.movers.find((m) => m.sprite.visible && this.moverTile(m).x === tx && this.moverTile(m).y === ty);
    return m ? { mover: m, tx, ty } : null;
  }

  // Điểm bấm → mục tiêu (ưu tiên NPC/vật nuôi, rồi tán cây, rồi ô)
  resolveTarget(wx, wy) {
    for (const m of this.movers) {
      if (!m.sprite.visible) continue;
      const b = m.sprite.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 3, 3);
      if (!b.contains(wx, wy)) continue;
      if (m.counter) return { ...m.counter }; // chủ tiệm sau quầy → bấm vào quầy
      return { mover: m, tx: this.moverTile(m).x, ty: this.moverTile(m).y };
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const redir = this.redirects.get(key(tx, ty));
    if (redir) return { ...redir };
    if (this.mapId === 'farm' && !this.statics.has(key(tx, ty)) && !state.objects[key(tx, ty)] && !state.tiles[key(tx, ty)]) {
      // Bấm vào tán cây → nhắm vào gốc
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = 1; dy <= 2; dy++) {
          const o = state.objects[key(tx + dx, ty + dy)];
          if (o?.type === 'tree') return { tx: tx + dx, ty: ty + dy };
        }
    }
    return { tx, ty };
  }

  actionAt(target) {
    if (!target) return null;
    const food = this.foodAction();
    if (food) return food;
    if (target.mover) return target.mover.action();
    const { tx, ty } = target;
    if (!this.inMap(tx, ty)) return null;
    const sel = selected();
    const st = this.statics.get(key(tx, ty));
    if (st) return st(sel);
    if (this.mapId === 'farm') return this.farmAction(tx, ty, sel);
    if (this.mapId === 'mine') return mineAction(this, tx, ty, sel);
    if (this.mapId === 'home') return homeAction(this, tx, ty, sel);
    return null;
  }

  // Đang cầm món ăn → ăn luôn (không cần đi đâu)
  foodAction() {
    const sel = selected();
    const it = sel.kind === 'item' && ITEMS[sel.id];
    if (!it?.eat) return null;
    return { label: `Ăn ${it.name} (+${it.eat.h} máu)`, run: () => this.eat(sel.id), self: true };
  }

  eat(id) {
    const it = ITEMS[id];
    if (state.hp >= maxHp()) return toast('Bạn đang no và khoẻ rồi!');
    addItem(id, -1);
    state.hp = Math.min(maxHp(), state.hp + it.eat.h);
    sfx('harvest', 0.35);
    this.floatText(this.player.x, this.player.y - 20, `+${it.eat.h}`, '#ff8a7a');
    toast(`Ngon quá! ${it.name}`);
    changed();
  }

  onPointerDown(pointer) {
    if (ui.modal || ui.transition || ui.hitTest(pointer.x, pointer.y)) return;
    if (ui.deco) return decoPointer(this, pointer.worldX, pointer.worldY);
    this.inputMode = pointer.wasTouch ? 'touch' : 'mouse';
    const food = this.foodAction();
    if (food) return food.run();
    let target = this.resolveTarget(pointer.worldX, pointer.worldY);
    if (!this.inMap(target.tx, target.ty)) return;
    const a = this.actionAt(target);

    // Kiểu Hay Day: chạm vào luống trong tầm 4 ô → làm ngay, rồi vuốt để làm hàng loạt
    if (this.isSwipeTile(target) && a?.run && a.act !== false && this.inSwipeReach(target)) {
      this.cancelPath();
      this.faceTo(target.tx, target.ty);
      a.run();
      this.swipe = { last: key(target.tx, target.ty), sel: state.sel };
      return;
    }

    if (a && a.act !== false && a.run) {
      if (target.mover) {
        // Giữ NPC / vật nuôi đứng yên chờ người chơi tới
        const m = target.mover;
        m.hold = this.time.now + 8000;
        this.tweens.killTweensOf(m.sprite);
        m.sprite.anims.pause();
        const t = this.moverTile(m);
        target = { mover: m, tx: t.x, ty: t.y };
      }
      if (this.isAdjacent(target)) {
        this.cancelPath();
        this.faceTo(target.tx, target.ty);
        return a.run();
      }
      const goals = this.reachTiles(target).filter(([x, y]) => this.walkable(x, y));
      return this.goTo(goals, target.tx, target.ty, () => {
        // Đến nơi: tính lại hành động (NPC có thể đã di chuyển)
        if (!this.isAdjacent(target)) return;
        this.faceTo(target.tx, target.ty);
        const again = this.actionAt(target);
        if (again?.run && again.act !== false) again.run();
        else if (again?.label) toast(again.label);
      });
    }
    if (a?.label) toast(a.label);
    const goals = this.walkable(target.tx, target.ty) ? [[target.tx, target.ty]] : this.neighbors8(target.tx, target.ty).filter(([x, y]) => this.walkable(x, y));
    this.goTo(goals, target.tx, target.ty, null);
  }

  // Tầm với: 1 ô thường, 3 ô khi quăng câu xuống nước
  reach(target) {
    return !target.mover && this.waterTiles.has(key(target.tx, target.ty)) ? 3 : 1;
  }

  reachTiles(target) {
    const r = this.reach(target);
    const out = [];
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (dx || dy) out.push([target.tx + dx, target.ty + dy]);
    // Ưu tiên ô gần mục tiêu nhất
    return out.sort((a, b) => Math.max(Math.abs(a[0] - target.tx), Math.abs(a[1] - target.ty)) - Math.max(Math.abs(b[0] - target.tx), Math.abs(b[1] - target.ty)));
  }

  // Ô ruộng (đã cuốc) hoặc cỏ khi đang cầm cuốc
  isSwipeTile(t) {
    if (this.mapId !== 'farm' || t.mover) return false;
    const k = key(t.tx, t.ty);
    return !!state.tiles[k] || (selected().id === 'hoe' && !state.objects[k] && !this.statics.has(k));
  }

  inSwipeReach(t) {
    const { tx, ty } = this.playerTile();
    return Math.max(Math.abs(t.tx - tx), Math.abs(t.ty - ty)) <= 4;
  }

  onSwipe(pointer) {
    const target = this.resolveTarget(pointer.worldX, pointer.worldY);
    const k = key(target.tx, target.ty);
    if (k === this.swipe.last || state.sel !== this.swipe.sel) return;
    this.swipe.last = k;
    if (!this.isSwipeTile(target) || !this.inSwipeReach(target)) return;
    const a = this.actionAt(target);
    if (a?.run && a.act !== false) {
      this.faceTo(target.tx, target.ty);
      a.run();
    }
  }

  isAdjacent(target) {
    if (target.mover) {
      const s = target.mover.sprite;
      const t = this.moverTile(target.mover);
      const { tx, ty } = this.playerTile();
      return Math.max(Math.abs(t.x - tx), Math.abs(t.y - ty)) <= 1 || Phaser.Math.Distance.Between(this.player.x, this.player.body.center.y, s.x, s.y - 6) < 30;
    }
    const { tx, ty } = this.playerTile();
    return Math.max(Math.abs(target.tx - tx), Math.abs(target.ty - ty)) <= this.reach(target);
  }

  // ---------- Tìm đường ----------
  goTo(goals, mx, my, onArrive) {
    const path = this.findPath(goals);
    if (!path) return toast('Không đi tới đó được.');
    this.path = path;
    this.onArrive = onArrive;
    this.stepStart = this.time.now;
    this.marker.setPosition(mx * TILE + 8, my * TILE + 8).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.marker);
    this.tweens.add({ targets: this.marker, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
    if (!path.length) this.arrive();
  }

  cancelPath() {
    this.path = null;
    this.onArrive = null;
    this.tweens.killTweensOf(this.marker);
    this.marker.setVisible(false);
  }

  arrive() {
    const cb = this.onArrive;
    this.cancelPath();
    cb?.();
  }

  followPath(time) {
    while (this.path?.length) {
      const n = this.path[0];
      const c = this.player.body.center;
      const dx = n.x * TILE + 8 - c.x, dy = n.y * TILE + 8 - c.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        if (time - this.stepStart > 1200) {
          this.cancelPath();
          return null;
        }
        return { x: dx / d, y: dy / d };
      }
      this.path.shift();
      this.stepStart = time;
    }
    this.arrive();
    return null;
  }

  findPath(goals) {
    if (!goals.length) return null;
    const goalSet = new Set(goals.map(([x, y]) => key(x, y)));
    const { tx: sx, ty: sy } = this.playerTile();
    if (goalSet.has(key(sx, sy))) return [];
    const prev = new Map([[key(sx, sy), null]]);
    const queue = [[sx, sy]];
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y] = queue[qi];
      for (const [nx, ny] of this.neighbors8(x, y)) {
        const k = key(nx, ny);
        if (prev.has(k) || !this.walkable(nx, ny)) continue;
        if (nx !== x && ny !== y && (!this.walkable(nx, y) || !this.walkable(x, ny))) continue;
        prev.set(k, [x, y]);
        if (goalSet.has(k)) {
          const path = [];
          for (let cur = [nx, ny]; cur && key(...cur) !== key(sx, sy); cur = prev.get(key(...cur))) path.unshift({ x: cur[0], y: cur[1] });
          return path;
        }
        queue.push([nx, ny]);
      }
    }
    return null;
  }

  neighbors8(x, y) {
    const out = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) out.push([x + dx, y + dy]);
    return out;
  }

  faceTo(tx, ty) {
    const { tx: px, ty: py } = this.playerTile();
    const dx = tx - px, dy = ty - py;
    if (!dx && !dy) return;
    this.facing = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
    this.setPose(false);
  }

  // =========================================================
  //  Hành động trên nông trại
  // =========================================================
  farmAction(tx, ty, sel) {
    const k = key(tx, ty);
    const o = state.objects[k];
    if (o) return this.objectAction(o, k, tx, ty, sel);
    const t = state.tiles[k];
    const tool = sel.kind === 'tool' ? sel.id : null;
    const item = sel.kind === 'item' ? ITEMS[sel.id] : null;

    if (t) {
      const c = t.crop;
      const name = c && ITEMS[c.type].name;
      if (c?.dead) return { label: `Dọn ${name} héo`, run: () => this.clearCrop(tx, ty) };
      if (c && c.stage >= RIPE_STAGE) return { label: `Thu hoạch ${name}`, run: () => this.harvest(tx, ty) };
      if (tool === 'can') {
        if (t.watered) return { act: false, label: 'Ô đất này đã được tưới' };
        if (state.water <= 0) return { act: false, label: 'Bình hết nước — ra ao để lấy nước' };
        return { label: `Tưới nước (${state.water}/${waterCap()})`, run: () => this.water(tx, ty) };
      }
      if (item?.seed && !c) {
        if (!CROPS[item.seed].seasons.includes(this.sea.id)) return { act: false, label: `${ITEMS[item.seed].name} không trồng được vào mùa ${this.sea.name}` };
        return { label: `Gieo ${item.name}`, run: () => this.plant(tx, ty, item.seed) };
      }
      if (tool === 'hoe' && !c) return { label: 'Lấp đất', run: () => this.untill(tx, ty) };
      if (c) {
        const left = timeText(minutesLeft(c, t.watered));
        return { act: false, label: `${name} — chín sau ${left}${t.watered ? '' : ' · tưới để lớn nhanh hơn'}` };
      }
      return { act: false, label: 'Đất đã cuốc — chọn hạt giống để gieo' };
    }

    if (this.blocked.has(k) || isReserved(tx, ty) || this.noTill.has(k)) return null;
    if (tool === 'hoe') {
      if (this.sea.id === 'winter') return { act: false, label: 'Mùa đông đất đóng băng, không cuốc được' };
      return { label: 'Cuốc đất', run: () => this.till(tx, ty) };
    }
    if (item?.place) return { label: `Đặt ${item.name}`, run: () => this.placeItem(tx, ty, sel.id) };
    return null;
  }

  objectAction(o, k, tx, ty, sel) {
    const tool = sel.kind === 'tool' ? sel.id : null;
    const need = (t, label, run) => (tool === t ? { label, run } : { act: false, label: `${label.split(' (')[0]} — cần ${TOOLS[t].name}` });
    switch (o.type) {
      case 'tree':
        return need('axe', 'Chặt cây', () => this.hit(o, k, tx, ty, 'axe', 'chop', () => this.setObject(k, { type: 'stump', hp: 3, v: 0 }, 'wood', 4)));
      case 'stump':
        return need('axe', 'Chặt gốc cây', () => this.hit(o, k, tx, ty, 'axe', 'chop', () => this.setObject(k, null, 'wood', 2)));
      case 'branch':
        return need('axe', 'Chặt cành cây', () => this.hit(o, k, tx, ty, 'axe', 'chop', () => this.setObject(k, null, 'wood', 1)));
      case 'rock':
        return need('pickaxe', 'Đập đá', () => this.hit(o, k, tx, ty, 'pickaxe', 'pick', () => this.setObject(k, null, 'stone', 1 + Math.floor(Math.random() * 2))));
      case 'weed':
        return {
          label: 'Nhổ cỏ dại',
          run: () => {
            sfx('grass');
            this.puff(tx, ty, 0x6aa236);
            this.setObject(k, null, Math.random() < 0.5 ? 'hay' : null, 1);
          },
        };
      case 'fence':
        return need('axe', 'Gỡ hàng rào', () => this.setObject(k, null, 'fence', 1));
      case 'sprinkler':
        return need('pickaxe', 'Gỡ bình phun', () => this.setObject(k, null, 'sprinkler', 1));
      case 'storage_chest': {
        const sk = `farm:${k}`;
        const empty = !Object.keys(state.storage[sk] || {}).length;
        if (tool === 'axe' && empty) return { label: 'Gỡ rương (rỗng)', run: () => (delete state.storage[sk], this.setObject(k, null, 'storage_chest', 1)) };
        return { label: 'Mở rương chứa đồ', run: () => bus.emit('openStorage', sk) };
      }
    }
    return null;
  }

  hit(o, k, tx, ty, toolId, sound, onBreak) {
    if (!useEnergy(energyCost(toolId))) return;
    this.playAction('axe');
    sfx(sound);
    o.hp -= toolLv(toolId);
    const spr = this.objSprites.get(k);
    if (spr) this.tweens.add({ targets: spr, x: spr.x + 1.5, duration: 50, yoyo: true, repeat: 2 });
    this.puff(tx, ty, toolId === 'axe' ? 0xb07040 : 0x9aa3b5);
    if (o.hp <= 0) {
      onBreak();
      xp(toolId === 'pickaxe' ? 'mining' : 'foraging', 1);
    }
    changed();
  }

  // Các ô bị ảnh hưởng khi cuốc/tưới (công cụ cấp cao làm nhiều ô một lúc)
  toolArea(tx, ty, id) {
    const lv = toolLv(id);
    if (lv >= 4) {
      const out = [];
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.push([tx + dx, ty + dy]);
      return out;
    }
    const f = this.facing;
    return Array.from({ length: AREA_BY_LEVEL[lv] }, (_, i) => [tx + f.x * i, ty + f.y * i]);
  }

  // Thay/xoá vật cản, nhận vật phẩm
  setObject(k, obj, give, n) {
    if (give === 'wood' && bonusChance('foraging')) n++;
    if (give === 'stone' && bonusChance('mining')) n++;
    if (obj) state.objects[k] = obj;
    else delete state.objects[k];
    this.renderObject(k);
    this.refreshFences(k);
    if (give) {
      if (!roomFor(give)) give = null; // túi đầy: vật phẩm rơi mất
    }
    if (give) {
      addItem(give, n);
      const [x, y] = k.split(',').map(Number);
      this.floatIcon(x * TILE + 8, y * TILE, ITEMS[give].tex, ITEMS[give].frame);
      toast(`+${n} ${ITEMS[give].name}`);
    }
    changed();
  }

  till(tx, ty) {
    if (!useEnergy(energyCost('hoe'))) return;
    this.playAction('hoe');
    for (const [x, y] of this.toolArea(tx, ty, 'hoe')) {
      const k = key(x, y);
      if (state.tiles[k] || state.objects[k] || this.blocked.has(k) || isReserved(x, y) || !this.inMap(x, y)) continue;
      state.tiles[k] = { watered: state.weather === 'rain', crop: null };
      this.removeDecor(k);
      this.refreshSoilAround(x, y);
      this.puff(x, y, 0xc98b4f);
    }
    sfx('hoe');
    changed();
  }

  untill(tx, ty) {
    delete state.tiles[key(tx, ty)];
    this.refreshSoilAround(tx, ty);
    this.puff(tx, ty, 0x6aa236);
    sfx('grass');
    changed();
  }

  water(tx, ty) {
    if (!useEnergy(energyCost('can'))) return;
    this.playAction('can');
    growCrops(); // tính phần đã lớn khi đất còn khô, từ giờ mới lớn nhanh
    for (const [x, y] of this.toolArea(tx, ty, 'can')) {
      const t = state.tiles[key(x, y)];
      if (!t || t.watered || state.water <= 0) continue;
      state.water--;
      t.watered = true;
      this.renderSoil(x, y);
      this.puff(x, y, 0x5fc4e8);
    }
    sfx('water', 0.35);
    changed();
  }

  // Ao / hồ: lấy nước hoặc câu cá
  waterAction(where, tx, ty, sel) {
    if (sel.id === 'can') return { label: 'Lấy nước vào bình', run: () => this.refill() };
    if (sel.id === 'rod') {
      if (this.sea.id === 'winter' && where === 'pond') return { label: 'Câu cá (ao đóng băng mỏng)', run: () => this.startFishing(where, tx, ty) };
      return { label: 'Câu cá', run: () => this.startFishing(where, tx, ty) };
    }
    return { act: false, label: state.hasRod ? 'Chọn cần câu để câu cá, bình tưới để lấy nước' : 'Mặt nước — mua cần câu ở tiệm Bà Lan để câu cá' };
  }

  startFishing(where, tx, ty) {
    if (!useEnergy(energyCost('rod'))) return;
    this.cancelPath();
    this.faceTo(tx, ty);
    const bx = tx * TILE + 8, by = ty * TILE + 9;
    const line = this.add.graphics().setDepth(8400);
    const bob = this.add.circle(bx, by, 2.5, 0xff5050).setStrokeStyle(1, 0xffffff).setDepth(8401);
    const tw = this.tweens.add({ targets: bob, y: by + 1.2, yoyo: true, repeat: -1, duration: 500 });
    const drawLine = () => line.clear().lineStyle(1, 0xffffff, 0.7).lineBetween(this.player.x + this.facing.x * 6, this.player.y + 2, bob.x, bob.y);
    drawLine();
    sfx('splash', 0.4);
    const onBite = () => this.tweens.add({ targets: bob, y: by + 3, yoyo: true, repeat: 3, duration: 80 });
    const onEnd = (item) => {
      bus.off('fishBite', onBite);
      tw.stop();
      line.destroy();
      bob.destroy();
      if (item) this.floatIcon(this.player.x, this.player.y - 20, ITEMS[item].tex, ITEMS[item].frame);
    };
    bus.once('fishEnd', onEnd);
    bus.on('fishBite', onBite);
    this.events.once('shutdown', () => {
      bus.off('fishEnd', onEnd);
      bus.off('fishBite', onBite);
    });
    bus.emit('fishStart', where);
  }

  refill() {
    state.water = waterCap();
    sfx('water');
    toast('Bình tưới đã đầy nước!');
    changed();
  }

  plant(tx, ty, type) {
    this.playAction('plant');
    addItem(`seed_${type}`, -1);
    state.tiles[key(tx, ty)].crop = newCrop(type);
    this.renderCrop(tx, ty);
    sfx('plant', 0.4);
    changed();
  }

  harvest(tx, ty) {
    const t = state.tiles[key(tx, ty)];
    const c = t.crop;
    if (!roomFor(c.type)) return;
    this.playAction('harvest');
    const extra = bonusChance('farming', 0.04) ? 1 : 0;
    addItem(c.type, 1 + extra);
    xp('farming', 2);
    farmXp(1);
    if (extra) this.floatText(tx * TILE + 8, ty * TILE - 6, '+1', '#ffd34d');
    this.harvestFx(tx, ty, c.type);
    if (CROPS[c.type].regrow) regrowCrop(c);
    else t.crop = null;
    this.renderCrop(tx, ty);
    sfx('harvest', 0.4);
    toast(`+1 ${ITEMS[c.type].name}`);
    changed();
  }

  clearCrop(tx, ty) {
    state.tiles[key(tx, ty)].crop = null;
    this.renderCrop(tx, ty);
    this.puff(tx, ty, COLORS.dead);
    sfx('grass');
    changed();
  }

  placeItem(tx, ty, id) {
    const k = key(tx, ty);
    const { tx: px, ty: py } = this.playerTile();
    if (px === tx && py === ty) return toast('Hãy đứng sang ô bên cạnh để đặt.');
    addItem(id, -1);
    state.objects[k] = { type: id, hp: 1, v: 0 };
    if (id === 'storage_chest') state.storage[`farm:${k}`] = state.storage[`farm:${k}`] || {};
    this.removeDecor(k);
    this.renderObject(k);
    this.refreshFences(k);
    sfx('plant');
    changed();
  }

  sellAll() {
    let total = 0, n = 0;
    for (const [id, c] of Object.entries(state.inv)) {
      const price = ITEMS[id]?.sell;
      if (!price || !c) continue;
      total += price * c;
      n += c;
      delete state.inv[id];
    }
    if (!total) return toast('Chưa có nông sản nào để bán.');
    earnCoins(total); // bán càng nhiều, dân làng càng tin tưởng (uy tín)
    sfx('coin');
    toast(`Đã bán ${n} món, được ${total} xu!`);
    changed();
  }

  // =========================================================
  //  Ngủ / chuyển bản đồ
  // =========================================================
  confirmSleep() {
    bus.emit('dialog', {
      face: 'portrait',
      name: 'Bạn',
      text: state.time < 18 * 60 ? 'Trời còn sớm. Đi ngủ luôn và sang ngày mới?' : 'Đi ngủ và kết thúc ngày hôm nay?',
      choices: [{ label: 'Đi ngủ', onClick: () => this.sleep(false) }, { label: 'Chưa', onClick: null }],
    });
  }

  sleep(passedOut) {
    if (ui.transition) return;
    ui.transition = true;
    this.cancelPath();
    const cam = this.cameras.main;
    cam.fadeOut(passedOut ? 1200 : 700, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      const notes = newDay(passedOut);
      save();
      bus.emit('changed');
      bus.emit('newDay', notes);
      this.scene.restart({ map: 'home', spawn: HOME.bedSpawn });
    });
  }

  changeMap(map, spawn, extra = {}) {
    if (ui.transition) return;
    ui.transition = true;
    this.cancelPath();
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ map, spawn, ...extra }));
  }

  // Hết máu: ngất, mất ít tiền, tỉnh dậy ở nhà
  faint() {
    if (ui.transition) return;
    ui.transition = true;
    this.cancelPath();
    const lost = Math.min(Math.floor(state.coins * 0.1), 300);
    state.coins -= lost;
    state.hp = Math.round(maxHp() / 2);
    state.energy = Math.max(state.energy, 20);
    changed();
    const cam = this.cameras.main;
    cam.fadeOut(1000, 80, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      toast(`Bạn bị ngất! Ai đó đã đưa bạn về nhà. Mất ${lost} xu tiền thuốc.`);
      this.scene.restart({ map: 'home', spawn: HOME.bedSpawn });
    });
  }

  // =========================================================
  //  Vẽ
  // =========================================================
  refreshSoilAround(tx, ty) {
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => this.renderSoil(tx + dx, ty + dy));
  }

  renderSoil(tx, ty) {
    const k = key(tx, ty);
    const t = state.tiles[k];
    let s = this.soilSprites.get(k);
    if (!t) {
      s?.destroy();
      this.soilSprites.delete(k);
      return;
    }
    // Ụ đất riêng từng ô (3 biến thể để không lặp), đất ướt sẫm màu
    const frame = (t.watered ? 3 : 0) + ((tx * 7 + ty * 13) % 3);
    if (!s) {
      s = this.add.image(tx * TILE, ty * TILE, 'fp_soil', frame).setOrigin(0).setDepth(-700);
      this.soilSprites.set(k, s);
      this.removeDecor(k);
    }
    s.setFrame(frame);
    if (this.sea.id === 'winter' && !t.watered) s.setTint(0xe0e6f0);
    else s.clearTint();
  }

  renderCrop(tx, ty) {
    const k = key(tx, ty);
    const c = state.tiles[k]?.crop;
    let s = this.cropSprites.get(k);
    if (!c) {
      s?.base.destroy();
      s?.top?.destroy();
      s?.shadow?.destroy();
      s?.twinkle?.destroy();
      this.cropSprites.delete(k);
      return;
    }
    const cfg = CROPS[c.type];
    if (!s) {
      const base = this.add.image(tx * TILE + 8, ty * TILE + 14, 'plants', 0).setOrigin(0.5, 1).setDepth(ty * TILE + 13);
      const shadow = this.fx.shadow(tx * TILE + 8, ty * TILE + 13, 10, -650);
      this.tweens.add({ targets: base, angle: { from: -2, to: 2 }, duration: 1400 + ((tx * 31 + ty * 17) % 7) * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      s = { base, top: null, shadow };
      this.cropSprites.set(k, s);
    }
    if (cfg.sheet) s.base.setTexture(cfg.sheet, cfg.row * 6 + cfg.frames[c.stage]);
    else s.base.setFrame(cfg.row * 5 + c.stage);
    if (cfg.topRow != null && c.stage >= 3) {
      if (!s.top) s.top = this.add.image(tx * TILE + 8, ty * TILE - 1, 'plants', 0).setOrigin(0.5, 1).setDepth(ty * TILE + 13);
      s.top.setFrame(cfg.topRow * 5 + c.stage);
    } else {
      s.top?.destroy();
      s.top = null;
    }
    for (const img of [s.base, s.top]) if (img) c.dead ? img.setTint(COLORS.dead) : img.clearTint();
    // Cây chín: lấp lánh để dễ nhận ra (kiểu Hay Day)
    const ripe = c.stage >= RIPE_STAGE && !c.dead;
    if (ripe && !s.twinkle) {
      const tw = this.add.image(tx * TILE + 8, ty * TILE + 2, 'fx_spark').setDepth(ty * TILE + 14).setAlpha(0).setTint(0xfff3a0);
      this.tweens.add({
        targets: tw, alpha: { from: 0, to: 1 }, scale: { from: 0.4, to: 1.3 }, duration: 380, yoyo: true,
        repeat: -1, repeatDelay: 1100 + ((tx * 37 + ty * 53) % 9) * 160,
        onRepeat: () => tw.setPosition(tx * TILE + 3 + Math.random() * 10, ty * TILE - 2 + Math.random() * 10),
      });
      s.twinkle = tw;
    } else if (!ripe && s.twinkle) {
      s.twinkle.destroy();
      s.twinkle = null;
    }
  }

  // Hạt bay tung toé (kết cấu nhỏ, màu tuỳ chọn)
  burst(x, y, tex, n, tint, spread = 12, up = 14, life = 520) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, tex).setDepth(8800).setTint(tint);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * spread * (0.4 + Math.random() * 0.6),
        y: y + Math.sin(a) * spread * 0.6 - up * Math.random(),
        alpha: 0,
        scale: { from: 1.2, to: 0.3 },
        duration: life * (0.7 + Math.random() * 0.5),
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // Cây lên giai đoạn mới: nảy lên + lá xanh; chín: bật mạnh + sao vàng
  cropGrowFx(tx, ty) {
    const sp = this.cropSprites.get(key(tx, ty));
    const c = state.tiles[key(tx, ty)]?.crop;
    if (!sp || !c) return;
    const ripe = c.stage >= RIPE_STAGE;
    sp.base.setScale(1);
    this.tweens.add({ targets: sp.base, scaleX: { from: ripe ? 1.3 : 1.15, to: 1 }, scaleY: { from: ripe ? 0.6 : 0.8, to: 1 }, duration: ripe ? 520 : 380, ease: 'Back.easeOut' });
    const cx = tx * TILE + 8, cy = ty * TILE + 8;
    if (ripe) {
      this.burst(cx, cy, 'fx_spark', 8, 0xfff07a, 14, 10, 700);
      if (this.inView(cx, cy)) sfx('pick', 0.15);
    } else this.burst(cx, cy + 4, 'fx_dust', 4, 0x8fd16a, 8, 6, 420);
  }

  inView(x, y) {
    return this.cameras.main.worldView.contains(x, y);
  }

  // Thu hoạch: cây bật lên, đất & lá văng, nông sản nhảy lên rồi bay vào túi đồ
  harvestFx(tx, ty, type) {
    const it = ITEMS[type];
    const cx = tx * TILE + 8, cy = ty * TILE + 8;
    const sp = this.cropSprites.get(key(tx, ty));
    if (sp) {
      const ghost = this.add.image(sp.base.x, sp.base.y, sp.base.texture.key, sp.base.frame.name).setOrigin(0.5, 1).setDepth(sp.base.depth + 1);
      this.tweens.add({ targets: ghost, y: ghost.y - 8, scaleY: 1.35, scaleX: 0.75, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
    }
    this.burst(cx, cy + 5, 'fx_dust', 7, 0xffffff, 12, 6, 450);
    this.burst(cx, cy, 'fx_dust', 5, 0x7cc95a, 14, 12, 600);
    this.burst(cx, cy - 2, 'fx_spark', 5, 0xfff07a, 16, 14, 650);
    const icon = this.add.image(cx, cy, it.tex, it.frame).setDepth(8900).setScale(0.6);
    this.tweens.add({
      targets: icon, y: cy - 16, scale: 1.4, duration: 260, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: icon, y: cy - 12, scale: 1.2, duration: 140,
          onComplete: () => {
            const cam = this.cameras.main;
            bus.emit('flyToBag', { x: (icon.x - cam.worldView.x) * cam.zoom, y: (icon.y - cam.worldView.y) * cam.zoom, tex: it.tex, frame: it.frame, scale: icon.scale * cam.zoom });
            icon.destroy();
          },
        });
      },
    });
  }

  // Vẽ lại hàng rào xung quanh để các đoạn rào nối với nhau
  refreshFences(k) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k2 = key(x + dx, y + dy);
      if (state.objects[k2]?.type === 'fence') this.renderObject(k2);
    }
  }

  renderObject(k) {
    this.objSprites.get(k)?.destroy();
    this.objSprites.delete(k);
    this.objShadows?.get(k)?.destroy();
    this.objShadows?.delete(k);
    this.objWalls.get(k)?.destroy();
    this.objWalls.delete(k);
    this.blocked.delete(k);
    const o = state.objects[k];
    if (!o) return;
    const [x, y] = k.split(',').map(Number);
    const bx = x * TILE + 8, by = (y + 1) * TILE;
    let img;
    switch (o.type) {
      case 'tree':
        img = this.add.image(bx, by + 2, 'fp_trees', this.treeFrame(o.v ? 2 : 0));
        break;
      case 'stump':
        img = this.add.image(bx, by, 'fp_bushes', 8);
        break;
      case 'rock':
        img = this.add.image(bx, by, 'objects', 'rock').setFlipX(!!o.v);
        break;
      case 'branch':
        img = this.add.image(bx, by, 'nature', o.v ? 'branch2' : 'branch');
        break;
      case 'weed':
        img = this.add.image(bx, by, 'fp_bushes', state.season).setScale(o.v ? 0.7 : 0.85);
        break;
      case 'storage_chest':
        img = this.add.image(bx, by, 'objects', 'chestStore');
        break;
      case 'fence': {
        const f = (x2, y2) => state.objects[key(x2, y2)]?.type === 'fence';
        const l = f(x - 1, y), r = f(x + 1, y), u = f(x, y - 1), d = f(x, y + 1);
        const frame = l || r ? (l && r ? 0 : r ? 3 : 4) : u || d ? 1 : 2;
        img = this.add.image(bx, by, 'fp_fence', frame);
        break;
      }
      default:
        img = this.add.image(bx, by, o.type);
    }
    img.setOrigin(0.5, 1).setDepth(by - 1);
    this.objSprites.set(k, img);
    const shw = { tree: 24, stump: 14, rock: 14, fence: 14, sprinkler: 10 }[o.type];
    if (shw) {
      this.objShadows = this.objShadows || new Map();
      this.objShadows.set(k, this.fx.shadow(bx, by - 1, shw));
    }
    if (o.type === 'tree') this.fx.sway(img);
    this.blocked.add(k);
    this.removeDecor(k);
    if (SOLID.includes(o.type)) this.objWalls.set(k, this.addWall(x * TILE + 3, y * TILE + 5, 10, 10, false));
  }

  // ---------- Hiệu ứng ----------
  puff(tx, ty, color) {
    for (let i = 0; i < 6; i++) {
      const d = this.add.rectangle(tx * TILE + 8, ty * TILE + 10, 2, 2, color).setDepth(8000);
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(-8, 8),
        y: d.y - Phaser.Math.Between(3, 10),
        alpha: 0,
        duration: 350,
        onComplete: () => d.destroy(),
      });
    }
  }

  floatIcon(x, y, tex, frame) {
    const icon = this.add.image(x, y, tex, frame).setDepth(8500);
    this.tweens.add({ targets: icon, y: y - 16, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => icon.destroy() });
  }

  floatText(x, y, text, color) {
    const t = this.add.text(x, y, text, { fontFamily: 'Arial', fontSize: '40px', color }).setScale(0.25).setOrigin(0.5).setDepth(8600);
    this.tweens.add({ targets: t, y: y - 12, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}
