import Phaser from 'phaser';
import {
  HOME_CHEST, TILE, ZOOM, PLAYER_SPEED, COLORS, CROPS, ITEMS, TOOLS, ANIMALS, BUILDINGS, NPCS, RIPE_STAGE, REGROW_STAGE, MAX_HP, MAX_ENERGY, AREA_BY_LEVEL, MINE_W, MINE_H, DAY_START,
} from '../config.js';
import { state, ui, bus, changed, save, toast, sfx, season, selected, addItem, count, useEnergy, hearts, toolLv, waterCap, xp, roomFor, isTouchDevice } from '../state.js';
import { FARM, FARM_W, FARM_H, isReserved, penCfg, penRect, penOffset, PEN_IDS, generateObjects, migrateFarmLayout, migrateHaydayLayout, addWildResources, expandFarmEast, expandFarmSouth } from '../farmLayout.js';
import { BASE, buildBase } from '../maps/base.js';
import { container } from '../maps/zones.js';
import { buildHayday, updateHayday } from '../maps/haydayFarm.js';
import { farmXp, have, take, earnCoins, absMin, unlocked, needLevel } from '../hayday.js';
import { newDay } from '../day.js';
import { growCrops, newCrop, regrowCrop, minutesLeft, timeText } from '../crops.js';
import { talk, boardPanel, shopOpen, BUILD_MIN } from '../shops.js';
import { buildForest, FOREST } from '../maps/forest.js';
import { buildMine, mineAction, MINE_SPAWN } from '../maps/mine.js';
import { buildHome, homeAction, HOME, decoPointer, decoMove } from '../maps/home.js';
import { buildShop, SHOPS, SHOP_IN } from '../maps/shop.js';
import { buildQuarry, QUARRY } from '../maps/quarry.js';
import { buildTown, TOWN } from '../maps/town.js';
import { buildNpcHome } from '../maps/npchome.js';
import { buildRuin } from '../maps/ruin.js';
import { buildPenInside, PEN_IN, animalsIndoors } from '../maps/penin.js';
import { INTRO_MAPS, buildCliff, buildBeach, playCliff, playBeach } from '../maps/introMaps.js';
import { heldWeapon } from '../combat.js';
import Raid, { defensePlaceLabel, makeDefenseObject, fertilize } from '../raid.js';
import { FOOD_MAX, dayNum } from '../survival.js';
import { decorateVillage, decorateFarm, spawnPet } from '../maps/decor.js';
import { SCHEDULE, HOUSES, NPC_HOUSE_IN, HOUSE_OPEN, slotNow } from '../npcs.js';
import { energyCost, bonusChance, maxHp } from '../skills.js';
import { todayFestival, festivalActive } from '../festivals.js';
import WorldFX from '../fx.js';

const key = (x, y) => `${x},${y}`;
const PREFIX = { key: 'Space: ', mouse: 'Click: ', touch: 'Chạm: ' };
const SOLID = ['tree', 'stump', 'rock', 'fence', 'sprinkler'];
// Dời chuồng: vật tự nhiên trong khu mới được dọn giúp (và cho vật liệu)
const PEN_CLEARABLE = { tree: { wood: 3 }, stump: { wood: 2 }, branch: { wood: 1 }, rock: { stone: 1 }, weed: {} };
const DEFENSE = ['trap_spike', 'torch', 'bait']; // đồ phòng thủ đêm: đi xuyên qua được
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
    this.ruinIdx = data.ruin ?? 0;
    this.ruinKind = data.kind || 'home';
    this.mineEff = null;
    this.shopId = data.shop || 'store';
    this.penId = data.pen || 'coop';
    this.movePenId = data.movePen || null;
    this.tour = !!data.tour;
  }

  create() {
    this.sea = season();
    const SIZES = { farm: [FARM_W, FARM_H], village: [VILLAGE.w, VILLAGE.h], forest: [FOREST.w, FOREST.h], mine: [MINE_W, MINE_H], home: [HOME.w, HOME.h], shop: [SHOP_IN.w, SHOP_IN.h], quarry: [QUARRY.w, QUARRY.h], town: [TOWN.w, TOWN.h], base: [BASE.w, BASE.h], npchome: [NPC_HOUSE_IN.w, NPC_HOUSE_IN.h], ruin: [NPC_HOUSE_IN.w, NPC_HOUSE_IN.h], pen: [PEN_IN.w, PEN_IN.h], cliff: [INTRO_MAPS.cliff.w, INTRO_MAPS.cliff.h], beach: [INTRO_MAPS.beach.w, INTRO_MAPS.beach.h] };
    [this.mapW, this.mapH] = SIZES[this.mapId];
    this.worldW = this.mapW * TILE;
    this.worldH = this.mapH * TILE;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    // Xoá tham chiếu của bản đồ trước (scene được tái sử dụng khi đổi bản đồ)
    this.groundLayer = null;
    this.objShadows = new Map();
    this.lakeTiles = new Set();
    this.fx = new WorldFX(this);
    if (['farm', 'village', 'forest', 'town', 'base', 'cliff', 'beach'].includes(this.mapId)) this.grassGround();
    else this.add.rectangle(0, 0, this.worldW, this.worldH, this.sea.ground).setOrigin(0).setDepth(-1000);

    // Ván mới đi vào làng trước (đoạn mở đầu): tạo sẵn cây/đá nông trại để mọi chỗ dùng state.objects không lỗi
    if (!state.objects) {
      generateObjects();
      addWildResources();
      state.farmSize = 7;
      save();
    }
    this.blocked = new Set();
    this.noTill = new Set();
    this.statics = new Map(); // ô → (sel) => action
    this.redirects = new Map(); // ô bấm vào → ô tương tác thật (vd. mặt quầy → trước quầy)
    this.exits = new Map();
    this.interactables = []; // { r: khung hình, tx, ty }: đứng sát hình ở phía nào cũng tương tác được
    this.walls = this.physics.add.staticGroup();
    this.objWalls = new Map();
    this.soilSprites = new Map();
    this.cropSprites = new Map();
    this.objSprites = new Map();
    this.objHives = new Map();
    this.decor = new Map();
    this.waterTiles = new Set(); // ô nước câu được (tầm quăng xa hơn)
    this.terrain = { path: new Set(), plaza: new Set(), water: new Set(), road: new Set(), sand: new Set() }; // vẽ bằng ô tự nối (tools/make_terrain.py)
    this.movers = []; // NPC + vật nuôi + quái
    this.path = null;
    this.combat = null;
    this.caveLight = null;
    this.searching = false;
    this.zoneId = null;
    this.knock = null;

    if (this.mapId === 'farm') this.buildFarm();
    else if (this.mapId === 'village') this.buildVillage();
    else if (this.mapId === 'forest') buildForest(this);
    else if (this.mapId === 'mine') buildMine(this);
    else if (this.mapId === 'home') buildHome(this);
    else if (this.mapId === 'shop') buildShop(this, this.shopId);
    else if (this.mapId === 'quarry') buildQuarry(this);
    else if (this.mapId === 'npchome') buildNpcHome(this, this.houseId);
    else if (this.mapId === 'town') buildTown(this);
    else if (this.mapId === 'base') buildBase(this);
    else if (this.mapId === 'ruin') buildRuin(this, this.ruinIdx, this.ruinKind);
    else if (this.mapId === 'pen') buildPenInside(this, this.penId);
    else if (this.mapId === 'cliff') buildCliff(this);
    else if (this.mapId === 'beach') buildBeach(this);
    this.paintTerrain();
    this.edgeTufts();
    // NPC theo lịch sinh hoạt (chủ tiệm do buildShop tự đặt sau quầy)
    this.place = this.mapId === 'shop' ? `shop:${this.shopId}` : this.mapId === 'npchome' ? `house:${this.houseId}` : this.mapId;
    ui.place = this.place;
    if (this.mapId !== 'shop') this.spawnScheduled();

    const DEFAULT_SPAWN = { farm: FARM.bedSpawn, village: VILLAGE.fromFarm, forest: FOREST.fromFarm, mine: MINE_SPAWN, home: HOME.bedSpawn, shop: SHOP_IN.enter, quarry: QUARRY.fromVillage, town: TOWN.fromVillage, npchome: NPC_HOUSE_IN.enter, ruin: NPC_HOUSE_IN.enter, pen: PEN_IN.enter, cliff: INTRO_MAPS.cliff.spawn, beach: INTRO_MAPS.beach.spawn };
    const sp = this.spawnAt || DEFAULT_SPAWN[this.mapId];
    this.createPlayer(sp.x, sp.y);

    this.cursor = this.add.rectangle(0, 0, TILE, TILE, 0xffffff, 0.15).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.9).setDepth(9000);
    this.marker = this.add.rectangle(0, 0, 6, 6, 0xffd34d).setDepth(9001).setVisible(false);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    if (['home', 'shop', 'npchome', 'ruin', 'pen'].includes(this.mapId)) {
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
      if (ui.transition || ui.modal || !['home', 'shop', 'npchome', 'ruin', 'pen'].includes(this.mapId)) return;
      const exit = [...this.exits.values()][0];
      if (exit) this.changeMap(exit.map, exit.spawn);
    };
    bus.on('leaveRoom', onLeave);
    // Xoay máy làm đổi bề ngang game: dựng lại màn chơi + giao diện cho vừa khung mới
    const onResized = () => {
      if (ui.cine || ui.transition || this.penMove) return;
      const { tx, ty } = this.playerTile();
      this.scene.stop('UI');
      this.scene.restart({ map: this.mapId, spawn: { x: tx, y: ty }, shop: this.shopId, house: this.houseId, back: this.houseBack, pen: this.penId, ruin: this.ruinIdx, kind: this.ruinKind, floor: this.mineFloor, zone: this.mineZone });
    };
    this.game.events.on('gameResized', onResized);
    this.events.once('shutdown', () => this.game.events.off('gameResized', onResized));
    this.events.once('shutdown', () => {
      bus.off('leaveRoom', onLeave);
      bus.off('passout', onPassout);
      bus.off('cropsGrew', onGrow);
      bus.off('buildingDone', onBuilt);
    });

    if (this.scene.isActive('UI')) this.scene.bringToTop('UI');
    else this.scene.launch('UI');
    ui.transition = false;
    // từ biển "Dời chuồng" trong chuồng ra → vào luôn chế độ dời
    if (this.movePenId && this.mapId === 'farm') this.time.delayedCall(450, () => this.startPenMove(this.movePenId));
    // Đoạn mở đầu (ván mới): tham quan làng / sáng hôm sau nhận đồ nghề
    if (this.mapId === 'village' && state.intro === 'tour') this.time.delayedCall(700, () => this.villageTour());
    if (this.mapId === 'cliff') {
      this.player.body.enable = false; // đang diễn: không va chạm, kịch bản tự điều khiển
      this.time.delayedCall(400, () => playCliff(this));
    }
    if (this.mapId === 'beach' && state.intro === 'beach') {
      this.player.body.enable = false;
      this.time.delayedCall(200, () => playBeach(this));
    }
    if (this.mapId === 'farm' && state.intro === 'night' && state.day > 1) this.time.delayedCall(600, () => this.toolsGift());
    if (this.mapId === 'home' && state.intro === 'night' && state.day > 1) this.time.delayedCall(800, () => toast('Có tiếng gõ cửa… Ông Walter đang đợi ngoài sân.'));
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
    const ts = map.addTilesetImage('pc_grass'); // cỏ Pixel Crawler
    const layer = (this.groundLayer = map.createBlankLayer('ground', ts, 0, 0).setDepth(-1000));
    const rnd = seededRandom(this.mapW * 31 + this.mapH);
    for (let x = 0; x < this.mapW; x++)
      for (let y = 0; y < this.mapH; y++) {
        const r = rnd();
        // ô cỏ Pixel Crawler nối liền theo thứ tự 1-2-3 → xếp theo cột, không lật; điểm vài bông hoa
        const t = layer.putTileAt((x % 3) + (r < 0.93 ? 0 : 4), x, y);
        t.tint = this.sea.grassTint;
      }
    if (this.sea.snow) this.add.rectangle(0, 0, this.worldW, this.worldH, 0xffffff, 0.5).setOrigin(0).setDepth(-990);
  }

  // Vùng đất trống (đường đi): mép cỏ bo tròn tự nối khi vẽ (paintTerrain)
  dirtArea(x0, y0, x1, y1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (this.inMap(x, y)) this.terrain.path.add(key(x, y));
  }

  // Sân lát đá cuội (quảng trường)
  plazaArea(x0, y0, x1, y1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (this.inMap(x, y)) this.terrain.plaza.add(key(x, y));
  }

  isDirt(x, y) {
    const k = key(x, y);
    return this.terrain.path.has(k) || this.terrain.plaza.has(k) || this.terrain.road.has(k);
  }

  // Vẽ mọi vùng địa hình đã khai báo: mỗi ô chọn hình theo 8 ô hàng xóm (mép cong, góc bo)
  paintTerrain() {
    const T = this.terrain;
    const pathish = new Set([...T.path, ...T.plaza, ...T.road]); // đường đi lót dưới sân đá → không hở mép cỏ giữa đường & sân
    const paved = new Set([...T.plaza, ...T.road]); // vỉa hè lót dưới đường nhựa
    const layers = [['sand', T.sand, -996], ['path', pathish, -995], ['plaza', paved, -994], ['road', T.road, -993], ['water', T.water, -850]];
    const N8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    for (const [kind, set, depth] of layers) {
      if (!set.size) continue;
      const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: this.mapW, height: this.mapH });
      const layer = map.createBlankLayer(kind, map.addTilesetImage(`ter_${kind}`), 0, 0).setDepth(depth);
      for (const k of set) {
        const [x, y] = k.split(',').map(Number);
        let m = 0;
        N8.forEach(([dx, dy], i) => {
          if (!this.inMap(x + dx, y + dy) || set.has(key(x + dx, y + dy))) m |= 1 << i;
        });
        layer.putTileAt(m, x, y);
      }
      if (kind === 'water' && this.sea.id === 'winter') layer.forEachTile((t) => t.index >= 0 && (t.tint = 0xcfe0f0));
    }
  }

  // Bụi cỏ mọc dọc hai mép đường đất, đung đưa theo gió (gió thổi thành từng đợt từ trái sang phải)
  edgeTufts() {
    this.tufts = [];
    if (!['farm', 'village', 'forest', 'town', 'base'].includes(this.mapId) || this.sea.snow) return;
    const T = this.terrain;
    const paved = (x, y) => T.path.has(key(x, y)) || T.plaza.has(key(x, y)) || T.road.has(key(x, y)) || T.water.has(key(x, y));
    const grassy = (x, y) => {
      const k = key(x, y);
      return this.inMap(x, y) && !paved(x, y) && !this.blocked.has(k) && !this.statics.has(k) && !(this.mapId === 'farm' && (state.objects?.[k] || state.tiles?.[k]));
    };
    const rnd = seededRandom(this.mapId.length * 977 + 13);
    const tint = this.sea.grassTint;
    const put = (px, py) => {
      const img = this.add.image(px, py, 'pc_tufts', Math.floor(rnd() * 6)).setOrigin(0.5, 1).setDepth(-880).setFlipX(rnd() < 0.5);
      if (tint !== 0xffffff) img.setTint(tint);
      img.phase = px * 0.045 + rnd() * 0.6; // lệch pha theo vị trí → đợt gió lan dọc đường
      img.tk = key(Math.floor(px / TILE), Math.floor((py - 1) / TILE));
      this.tufts.push(img);
    };
    for (const k of T.path) {
      const [x, y] = k.split(',').map(Number);
      if (T.road.has(k) || T.plaza.has(k)) continue;
      // mép trái / phải: bụi cỏ đứng ngay trên đường viền cỏ
      for (const dx of [-1, 1]) {
        if (!grassy(x + dx, y)) continue;
        const ex = dx < 0 ? x * TILE + 1 : (x + 1) * TILE - 1;
        if (rnd() < 0.75) put(ex + (rnd() * 4 - 2), y * TILE + 6 + rnd() * 5);
        if (rnd() < 0.45) put(ex + (rnd() * 4 - 2), y * TILE + 13 + rnd() * 3);
      }
      // mép trên / dưới
      for (const dy of [-1, 1]) {
        if (!grassy(x, y + dy)) continue;
        const ey = dy < 0 ? y * TILE + 4 : (y + 1) * TILE + 2;
        if (rnd() < 0.7) put(x * TILE + 3 + rnd() * 10, ey + rnd() * 2);
      }
    }
  }

  // Hình ao tự nhiên: hợp của các elip nằm trong khung (x, y, w, h); lobes = [[cx, cy, rx, ry], ...] thêm thùy phụ
  pondShape({ x, y, w, h }, lobes = []) {
    const out = [];
    const ells = [[x + w / 2, y + h / 2, w / 2, h / 2], ...lobes];
    for (let tx = x; tx < x + w; tx++)
      for (let ty = y; ty < y + h; ty++)
        if (ells.some(([cx, cy, rx, ry]) => ((tx + 0.5 - cx) / rx) ** 2 + ((ty + 0.5 - cy) / ry) ** 2 <= 1.08)) out.push([tx, ty]);
    return out;
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
    const img = this.add.image(px, py + 2, 'pc_trees', this.treeFrame(kind)).setOrigin(0.5, 1).setDepth(py);
    this.fx.shadow(px, py, 24);
    this.fx.sway(img);
    img.wallObj = this.addWall(px - 5, py - 6, 10, 5);
    return img;
  }

  // Ao/hồ: bờ cỏ + vách đất (ô tự nối), gợn nước lăn tăn ở giữa, câu cá được trên mọi ô nước
  addWater(tiles, where = 'pond') {
    const T = this.terrain.water;
    const winter = this.sea.id === 'winter';
    for (const [x, y] of tiles) T.add(key(x, y));
    const inner = [];
    for (const [x, y] of tiles) {
      const k = key(x, y);
      this.statics.set(k, (sel) => this.waterAction(where, x, y, sel));
      this.waterTiles.add(k);
      if (where === 'lake') this.lakeTiles.add(k);
      this.blocked.add(k);
      this.removeDecor(k);
      let full = true;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (!tiles.some(([a, b]) => a === x + dx && b === y + dy)) full = false;
      if (full) inner.push([x, y]);
    }
    // Tường chặn theo từng dải ô liền nhau trên mỗi hàng
    const rows = new Map();
    for (const [x, y] of tiles) rows.set(y, [...(rows.get(y) || []), x]);
    for (const [y, xs] of rows) {
      xs.sort((a, b) => a - b);
      let a = xs[0];
      for (let i = 1; i <= xs.length; i++)
        if (i === xs.length || xs[i] !== xs[i - 1] + 1) {
          this.addWall(a * TILE + 3, y * TILE + 3, (xs[i - 1] - a + 1) * TILE - 6, TILE - 5, false);
          a = xs[i];
        }
    }
    if (winter) return;
    for (const [x, y] of inner)
      if ((x * 7 + y * 3) % 5 === 0) {
        // gợn sóng nhẹ (thay ô nước hoạt hình cũ của Farmer Pack — không hợp nước Pixel Crawler)
        const r = this.add.ellipse(x * TILE + 8, y * TILE + 8, 6, 2).setStrokeStyle(1, 0xdff0ff, 0.5).setDepth(-849);
        this.tweens.add({ targets: r, scaleX: 2.2, scaleY: 1.6, alpha: 0, duration: 1800, repeat: -1, delay: ((x * 13 + y * 7) % 9) * 220 });
      }
    this.fx.sparkleTiles(inner.length ? inner : tiles);
  }

  // Ao chữ nhật cũ (giữ cho các bản đồ chưa chuyển): bo tròn thành hình elip
  drawWater(x0, y0, x1, y1, where = 'pond') {
    this.addWater(this.pondShape({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }), where);
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
        ? this.add.image(tx * TILE, ty * TILE, 'pc_bushes', state.season + (pick < 0.3 ? 4 : 0)).setOrigin(0)
        : this.add.image(tx * TILE, ty * TILE, 'objects', ['flowerWhite', 'flowerRed', 'clover'][Math.floor(pick * 3)]).setOrigin(0);
      img.setDepth(-900);
      this.decor.set(k, img);
    }
  }

  removeDecor(k) {
    if (this.tufts?.some((g) => g.tk === k)) this.tufts = this.tufts.filter((g) => (g.tk === k ? (g.destroy(), false) : true)); // cỏ mép đường
    this.decor.get(k)?.destroy();
    this.decor.delete(k);
    if (this.statics.get(k)?.decor) this.statics.delete(k); // hoa dại / nấm đi kèm
  }

  // =========================================================
  //  Nông trại
  // =========================================================
  buildFarm() {
    if (!state.objects) {
      generateObjects();
      addWildResources();
      state.farmSize = 7;
      save();
    } else if ((state.farmSize || 1) < 5) {
      // Save cũ → bố cục thiết kế tay mới + chỗ cho công trình Hay Day + lối tắt + thêm tài nguyên
      if ((state.farmSize || 1) < 3) migrateFarmLayout();
      migrateHaydayLayout();
      addWildResources();
      state.farmSize = 5;
      save();
    }
    if (state.farmSize < 6) {
      expandFarmEast();
      state.farmSize = 6;
      save();
    }
    if (state.farmSize < 7) {
      expandFarmSouth();
      state.farmSize = 7;
      save();
    }
    const winter = this.sea.id === 'winter';

    // Nhà
    const hx = 3 * TILE, hy = 8 * TILE;
    // Nhà Farm RPG (72x95, cửa có sẵn ở x≈47 → trùng chỗ cửa cũ hx+48)
    this.add.image(hx, hy, 'pc_house').setOrigin(0, 1).setDepth(hy);
    this.fx.shadow(hx + 36, hy - 2, 70);
    for (const [lx, ly, sz] of [[23, 25, 30], [36, 50, 24]]) this.fx.light(hx + lx, hy - ly, sz);
    this.addWall(hx + 5, hy - 56, 62, 54);
    // Cả mặt trước nhà đều là cửa; đi thẳng vào là tự vào (xem doorAssist)
    const enterHome = () => ({ label: 'Vào nhà', door: true, run: () => this.changeMap('home', HOME.enter) });
    for (let x = FARM.door.x - 1; x <= FARM.door.x + 1; x++) this.statics.set(key(x, FARM.door.y), enterHome);

    // Rương bán hàng
    const c = FARM.chest;
    // Thùng bán hàng (màu gỗ) — khác với rương chứa đồ (màu đỏ)
    this.add.image(c.x * TILE + 8, (c.y + 1) * TILE, 'pc_chest').setOrigin(0.5, 1).setDepth((c.y + 1) * TILE).setTint(0xe8c890);
    this.fx.shadow(c.x * TILE + 8, (c.y + 1) * TILE - 1, 16);
    this.addWall(c.x * TILE + 1, c.y * TILE + 4, 14, 12);
    this.statics.set(key(c.x, c.y), () => ({ label: 'Thùng bán hàng — bán nông sản', run: () => this.sellAll() }));
    // Rương chứa đồ có sẵn cạnh nhà
    const [sx, sy] = HOME_CHEST.split(':')[1].split(',').map(Number);
    this.add.image(sx * TILE + 8, (sy + 1) * TILE, 'pc_chest').setOrigin(0.5, 1).setDepth((sy + 1) * TILE);
    this.fx.shadow(sx * TILE + 8, (sy + 1) * TILE - 1, 16);
    this.addWall(sx * TILE + 1, sy * TILE + 4, 14, 12);
    this.statics.set(key(sx, sy), () => ({ label: 'Mở rương chứa đồ', run: () => bus.emit('openStorage', HOME_CHEST) }));

    // Ao nước
    for (const p of [FARM.pond, FARM.pond2, FARM.pond3, FARM.pond4]) this.addWater(this.pondShape(p, p.lobes));
    // Đồng phía nam: trạm nông cụ đổ nát (máy cày gỉ, tường đổ, thùng phuy) — lục được đồ
    {
      const g = FARM.greenhouse;
      for (const [dx, f] of [[0, 'wall_broken'], [7, 'wall_broken']]) this.add.image((g.x + dx) * TILE + 8, (g.y + 1) * TILE, 'pa', f).setOrigin(0.5, 1).setDepth((g.y + 1) * TILE - 1).setFlipX(dx > 0);
      container(this, 'car', g.x + 2, g.y + 1, { tex: 'pa', frame: 'tractor', w: 2 });
      container(this, 'barrel', g.x + 5, g.y + 1, { tex: 'pa', frame: 'barrel_rust_red_1' });
      for (const [dx, dy, f] of [[6, 2, 'tire_1'], [1, 2, 'pallet_1'], [4, -1, '2_tires_grass_bleak_yellow']]) {
        this.add.image((g.x + dx) * TILE + 8, (g.y + dy + 1) * TILE, 'pa', f).setOrigin(0.5, 1).setDepth((g.y + dy + 1) * TILE - 1);
        this.blocked.add(key(g.x + dx, g.y + dy));
        this.addWall((g.x + dx) * TILE + 2, (g.y + dy) * TILE + 4, 12, 10);
      }
    }

    // Đường đất nối nhà – ruộng – chuồng – làng – rừng
    for (const [x0, y0, x1, y1] of FARM.paths) this.dirtArea(x0, y0, x1, y1);
    for (const e of [...FARM.exit, ...FARM.northExit]) this.exits.set(key(e.x, e.y), { map: 'village', spawn: VILLAGE.fromFarm });
    const ns = FARM.northSign;
    this.add.image(ns.x * TILE + 8, (ns.y + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((ns.y + 1) * TILE);
    this.add.text(ns.x * TILE + 8, ns.y * TILE - 4, '↑ Thị trấn', { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '40px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 8 }).setScale(0.25).setOrigin(0.5, 1).setDepth(9000);
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
    // trong bãi rào chuồng không để cây/đá/cỏ (save cũ, hoặc rào vừa được nới rộng)
    for (const id of PEN_IDS) {
      const [x0, y0, x1, y1] = penRect(id);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (PEN_CLEARABLE[state.objects[key(x, y)]?.type]) delete state.objects[key(x, y)];
    }
    for (const id of PEN_IDS) this.buildPen(id);
    for (const id of PEN_IDS) {
      const [x0, y0, x1, y1] = penCfg(id).fence;
      const [g0, g1] = penCfg(id).gate;
      this.fenceRect([x0, y0, x1, y1], [{ x: g0, y: y1 }, { x: g1, y: y1 }]); // rào kín 4 phía, chuồng nằm trong
    }

    // Vật cản, đất, cây trồng
    for (const k of Object.keys(state.objects)) this.renderObject(k);
    growCrops();
    for (const k of Object.keys(state.tiles)) {
      const [x, y] = k.split(',').map(Number);
      this.renderSoil(x, y);
      this.renderCrop(x, y);
    }
    const farmFree = (x, y) => !isReserved(x, y) && !state.tiles[key(x, y)] && !state.objects[key(x, y)] && !this.blocked.has(key(x, y));
    decorateFarm(this, (x, y) => farmFree(x, y) && !this.isDirt(x, y));
    spawnPet(this);
    // Khu đất hoang phía đông: xe & thùng bỏ lại
    container(this, 'car', 70, 7, { frame: 'car_red', w: 3 });
    container(this, 'barrel', 63, 7);
    container(this, 'trashcan', 65, 7);
    new Raid(this); // 3 cổng + đợt zombie ban đêm (src/raid.js)
    this.scatterDecor(farmFree, 1000, 42);
  }

  // ---------- Đồ trang trí thiết kế tay ----------
  // Hàng rào quanh hình chữ nhật; gaps = ô để trống làm cổng; skipTop: bỏ cạnh trên (sát công trình)
  fenceRect([x0, y0, x1, y1], gaps = [], skipTop = false) {
    const isGap = (x, y) => gaps.some((g) => g.x === x && g.y === y);
    const put = (x, y, frame) => {
      const k = key(x, y);
      if (isGap(x, y) || state.tiles[k] || this.blocked.has(k)) return;
      if (state.objects) delete state.objects[k]; // ván mới vào làng trước khi nông trại được tạo
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

  buildPen(id) {
    const cfg = penCfg(id);
    const st = state.buildings[id];
    if (!st) {
      const s = cfg.sign;
      this.add.image(s.x * TILE + 8, (s.y + 1) * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth((s.y + 1) * TILE);
      this.addWall(s.x * TILE + 3, s.y * TILE + 8, 10, 8);
      this.statics.set(key(s.x, s.y), () => ({
        act: false,
        label: `Đất xây ${BUILDINGS[id].name} — nhờ Chú Frank ở Xưởng mộc trong trại xây`,
      }));
      return;
    }
    // Nhà chuồng (tools/make_pens_pc.py) đứng giữa bãi rào, chừa lối 2 bên + sân 2 hàng phía trước
    const [fx0, , fx1, fy1] = cfg.fence;
    const tex = st === 'building' ? `pc_${id}_site` : `pc_${id}`;
    const wTiles = Math.round(this.textures.get(tex).getSourceImage().width / TILE);
    const tx = Math.round((fx0 + fx1 + 1) / 2 - wTiles / 2), tyB = fy1 - 3;
    const img = this.building(tex, undefined, tx, tyB, 2);
    this.penImgs = { ...(this.penImgs || {}), [id]: img };
    const front = [];
    for (let x = tx; x < tx + wTiles; x++) front.push(key(x, tyB));
    if (st === 'building') {
      // Công trường: thanh tiến độ + số phút còn lại nổi trên đầu
      const total = BUILD_MIN;
      const left = () => Math.max(0, (state.buildDone?.[id] ?? absMin()) - absMin());
      const cx = img.x + img.width / 2, cy = img.y - img.height / 2 + 6; // giữa công trường (mép trên bản đồ hay bị HUD che)
      const bw = 56;
      const bg = this.add.rectangle(cx, cy, bw + 4, 9, 0x0d0a0b, 0.7).setDepth(8990).setStrokeStyle(1, 0xffffff, 0.3);
      const bar = this.add.rectangle(cx - bw / 2, cy, 0, 5, 0xf2bd3c).setOrigin(0, 0.5).setDepth(8991);
      const label = this.add.text(cx, cy - 7, '', { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '40px', color: '#fff3d6', stroke: '#0d0a0b', strokeThickness: 8 }).setScale(0.25).setOrigin(0.5, 1).setDepth(8992);
      const upd = () => {
        const l = left();
        bar.width = bw * Phaser.Math.Clamp(1 - l / total, 0, 1);
        label.setText(`Đang xây · còn ${l} phút`);
      };
      upd();
      const ev = this.time.addEvent({ delay: 500, loop: true, callback: upd });
      this.events.once('shutdown', () => ev.remove());
      // búa gõ lách cách cho sinh động
      this.tweens.add({ targets: label, y: label.y - 1, yoyo: true, repeat: -1, duration: 600 });
      for (const k of front) this.statics.set(k, () => ({ act: false, label: `${BUILDINGS[id].name} đang xây — xong sau ${left()} phút (giờ game)` }));
      return;
    }
    // Bấm vào chuồng = đi vào trong (muốn dời chuồng: biển "Dời chuồng" ở trong)
    const back = { x: tx + Math.floor(wTiles / 2), y: tyB + 1 };
    const enter = () => ({ label: `Vào ${BUILDINGS[id].name}`, door: true, run: () => this.changeMap('pen', PEN_IN.enter, { pen: id, back }) });
    for (const k of front) this.statics.set(k, enter);
    this.interactables.push({ img, r: img.getBounds(), tx: back.x, ty: tyB });
    // Máng cỏ: góc trước-phải trong sân
    const t = { x: cfg.fence[2] - 1, y: cfg.fence[3] - 1 };
    const trough = this.add.image(t.x * TILE + 8, (t.y + 1) * TILE, 'objects', 'hay').setOrigin(0.5, 1).setScale(0.6).setDepth((t.y + 1) * TILE);
    this.addWall(t.x * TILE + 2, t.y * TILE + 6, 12, 10);
    const hungry = () => state.animals.filter((a) => ANIMALS[a.type].house === id && !a.fed);
    const refresh = () => trough.setAlpha(hungry().length ? 0.45 : 1);
    refresh();
    this.statics.set(key(t.x, t.y), () => this.penFeedAction(id, refresh));
    // vật nuôi không đi vào chỗ nhà chuồng & máng
    const hTiles = Math.ceil(img.height / TILE);
    const avoid = (x, y) => (x >= tx && x < tx + wTiles && y > tyB - hTiles && y <= tyB) || (x === t.x && y === t.y);
    if (!animalsIndoors()) for (const a of state.animals) if (ANIMALS[a.type].house === id) this.spawnAnimal(a, cfg.pen, avoid);
  }

  // Máng ăn (ngoài sân hoặc trong chuồng): cho cả đàn ăn bằng cỏ khô / thức ăn gia súc
  penFeedAction(id, refresh = () => {}) {
    const hungry = () => state.animals.filter((a) => ANIMALS[a.type].house === id && !a.fed);
    const n = hungry().length;
    if (!state.animals.some((a) => ANIMALS[a.type].house === id)) return { act: false, label: 'Máng cỏ — chưa có vật nuôi (mua ở trại Cô Emily)' };
    if (!n) return { act: false, label: 'Vật nuôi đã được cho ăn hôm nay' };
    return {
      label: `Cho ăn (${n} phần — có ${have('hay')} cỏ khô, ${have('feed')} thức ăn)`,
      run: () => {
        const list = hungry();
        const food = have('hay') + have('feed');
        if (!food) return toast('Cần cỏ khô (trại Cô Emily, nhổ cỏ dại) hoặc thức ăn gia súc (Cối xay)');
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
  }

  // ---------- Đoạn mở đầu: tham quan làng ----------
  villageTour() {
    const STOPS = [
      ['nam', 'Đây là trại của bọn ta — dân còn ít nhưng ai cũng tốt bụng. Đi, ta giới thiệu từng người.'],
      ['lan', 'Chào cháu! Bà bán hạt giống với đồ dùng ở tiệm tạp hoá. Cần gì cứ ghé bà nhé.'],
      ['tu', 'Chú là thợ mộc. Muốn dựng chuồng, nâng cấp đồ nghề hay dựng nhà máy thì cứ tìm chú.'],
      ['mai', 'Cô nuôi gà, nuôi bò ở trại. Khi nào cháu có chuồng thì qua cô mua vật nuôi.'],
      ['ba', 'Anh gác cổng trại. Zombie quanh đây không ít đâu — có đồ dư thì mang qua anh đổi lấy đạn.'],
      ['hoa', 'Chị lo bếp núc cho cả trại. Hái được rau củ, nấm ngon thì qua chị chỉ cách nấu.'],
      ['sau', 'Bác từng làm thợ mỏ. Dưới rừng có hầm quân sự cũ, nhiều sắt vụn lắm — mà nguy hiểm.'],
      ['ti', 'Anh mới tới hả? Mai chơi với em nha!'],
      ['bin', 'Em là Ben! Em biết chỗ có hoa đẹp lắm, mai em chỉ cho.'],
      ['nam', 'Ở rìa phía tây trại có căn nhà cũ bỏ trống. Mái hơi dột nhưng che mưa được, mảnh đất quanh nhà cũng là của cháu. Nghỉ ngơi đi — sáng mai ta qua.'],
    ];
    const cam = this.cameras.main;
    cam.stopFollow();
    let i = 0;
    const step = () => {
      if (i >= STOPS.length) return this.endTour();
      const [id, text] = STOPS[i++];
      const m = this.movers.find((x) => x.kind === 'npc' && x.id === id && x.sprite?.visible !== false);
      if (m) {
        m.hold = this.time.now + 6000; // đứng yên cho khách chào
        cam.pan(m.sprite.x, m.sprite.y - 10, 700, 'Sine.easeInOut');
      }
      this.time.delayedCall(m ? 750 : 100, () =>
        bus.emit('dialog', {
          face: `face_${id}`,
          name: NPCS[id].name,
          text,
          choices: [{ label: i >= STOPS.length ? 'Cảm ơn ông!' : 'Tiếp ▶', onClick: step }],
        })
      );
    };
    step();
  }

  endTour() {
    state.intro = 'night';
    save();
    toast('Về căn nhà ở nông trại phía tây để nghỉ ngơi');
    this.changeMap('farm', { x: FARM.door.x, y: FARM.door.y + 2 });
  }

  // Sáng ngày thứ 2: Ông Walter ghé nông trại trao cuốc, bình tưới, rìu, cuốc chim
  toolsGift() {
    if (state.intro !== 'night') return;
    const p = this.player;
    const nam = this.add.sprite(p.x - 70, p.y + 12, 'npc_nam', 16).setOrigin(0.5, 1).play('npc_nam_right').setDepth(p.y + 12);
    this.fx.followShadow?.(nam, 13, -1);
    this.tweens.add({
      targets: nam, x: p.x - 22, duration: 1400,
      onComplete: () => {
        nam.play('npc_nam_idle_right');
        const lines = [
          'Chào buổi sáng! Ngủ được chứ? Đồ nghề của cháu đây — cuốc, bình tưới, rìu và cuốc chim.',
          'Cuốc để xới đất, gieo hạt rồi tưới nước mỗi ngày. Rìu chặt cây lấy gỗ, cuốc chim đập đá.',
          'Việc đầu tiên: lấy gỗ vá cái mái dột đã. Rồi bắt tay trồng trọt — có rau ăn là sống được!',
        ];
        let i = 0;
        const next = () => {
          if (i === 1) this.giveTools(nam);
          if (i >= lines.length) {
            nam.play('npc_nam_left');
            this.tweens.add({ targets: nam, x: nam.x - 120, alpha: 0, duration: 1800, onComplete: () => nam.destroy() });
            return;
          }
          bus.emit('dialog', { face: 'face_nam', name: 'Ông Walter', text: lines[i++], choices: [{ label: i >= lines.length ? 'Cảm ơn ông!' : 'Tiếp ▶', onClick: next }] });
        };
        next();
      },
    });
  }

  giveTools(from) {
    state.gotTools = true;
    state.intro = 'done';
    state.sel = 'tool:hoe';
    sfx('fanfare', 0.5);
    const cam = this.cameras.main;
    ['tool_hoe', 'tool_can', 'tool_axe', 'tool_pickaxe'].forEach((tex, i) =>
      this.time.delayedCall(i * 160, () => {
        const icon = this.add.image(from.x, from.y - 24, tex).setDepth(9500);
        this.tweens.add({
          targets: icon, y: icon.y - 14, duration: 260, ease: 'Back.easeOut',
          onComplete: () => {
            bus.emit('flyToBag', { x: (icon.x - cam.worldView.x) * cam.zoom, y: (icon.y - cam.worldView.y) * cam.zoom, tex, scale: cam.zoom });
            icon.destroy();
          },
        });
      })
    );
    changed();
  }

  // ---------- Dời chuồng ----------
  // Chạm/kéo để chọn chỗ mới (khung xanh = đặt được, đỏ = vướng), bấm "Đặt ở đây" để chuyển
  startPenMove(id) {
    if (this.mapId !== 'farm' || state.buildings[id] !== 'built') return;
    this.cancelPath?.();
    this.player.setVelocity(0, 0);
    const off = { ...penOffset(id) };
    const g = this.add.graphics().setDepth(9500);
    const img = this.penImgs?.[id];
    const ghost = this.add.image(0, 0, `pc_${id}`).setOrigin(0, 1).setAlpha(0.6).setDepth(9501);
    img?.setAlpha(0.25);
    this.penMove = { id, off, g, ghost, ok: false };
    this.penMoveDraw();
    bus.emit('penMove', true);
    const onOk = () => this.penMoveConfirm();
    const onCancel = () => this.penMoveEnd();
    bus.on('penMoveOk', onOk);
    bus.on('penMoveCancel', onCancel);
    this.penMove.off_ = () => (bus.off('penMoveOk', onOk), bus.off('penMoveCancel', onCancel));
    this.events.once('shutdown', () => this.penMove?.off_?.());
  }

  penMoveAt(wx, wy) {
    const m = this.penMove;
    if (!m) return;
    // tâm khu chuồng theo điểm chạm
    const base = penRect(m.id, { dx: 0, dy: 0 });
    const cx = (base[0] + base[2] + 1) / 2, cy = (base[1] + base[3] + 1) / 2;
    m.off = { dx: Math.round(wx / TILE - cx), dy: Math.round(wy / TILE - cy) };
    this.penMoveDraw();
  }

  penPlaceProblem(id, off) {
    const [x0, y0, x1, y1] = penRect(id, off);
    if (x0 < 1 || y0 < 0 || x1 > FARM_W - 2 || y1 > FARM_H - 2) return 'Ra ngoài nông trại rồi';
    const old = penRect(id);
    const mine = (x, y) => x >= old[0] && x <= old[2] && y >= old[1] && y <= old[3];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const k = key(x, y);
        if (this.terrain.water.has(k)) return 'Không đặt lên ao được';
        if (this.isDirt(x, y)) return 'Không đặt đè lên đường đi';
        if (isReserved(x, y, id)) return 'Vướng nhà, kho hoặc công trình khác';
        if (state.tiles[k]) return 'Có luống đất đã cuốc — lấp đất trước';
        const o = state.objects[k];
        if (o && !PEN_CLEARABLE[o.type]) return 'Có đồ bạn đã đặt ở đây (rào, rương, bẫy...) — cất đi trước';
        if (this.blocked.has(k) && !mine(x, y) && !o) return 'Vướng vật cản';
      }
    return null;
  }

  penMoveDraw() {
    const m = this.penMove;
    const [x0, y0, x1, y1] = penRect(m.id, m.off);
    const why = this.penPlaceProblem(m.id, m.off);
    m.ok = !why;
    const col = m.ok ? 0x6fd48a : 0xe0604a;
    m.g.clear().fillStyle(col, 0.25).fillRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);
    m.g.lineStyle(1, col, 0.9).strokeRect(x0 * TILE + 0.5, y0 * TILE + 0.5, (x1 - x0 + 1) * TILE - 1, (y1 - y0 + 1) * TILE - 1);
    // khung rào
    const f = penCfg(m.id, m.off).fence;
    m.g.lineStyle(1, 0xffffff, 0.7).strokeRect(f[0] * TILE + 8, f[1] * TILE + 8, (f[2] - f[0]) * TILE, (f[3] - f[1]) * TILE);
    const wTiles = Math.round(m.ghost.width / TILE);
    m.ghost.setPosition(Math.round((f[0] + f[2] + 1) / 2 - wTiles / 2) * TILE, f[1] * TILE).setTint(m.ok ? 0xffffff : 0xff9a8a);
    bus.emit('penMoveState', m.ok ? 'Đặt được ở đây — bấm "Đặt ở đây"' : why);
  }

  penMoveConfirm() {
    const m = this.penMove;
    if (!m) return;
    if (!m.ok) return toast(this.penPlaceProblem(m.id, m.off) || 'Không đặt được ở đây');
    state.penPos = { ...(state.penPos || {}), [m.id]: m.off };
    // Chú Frank dọn giúp cây, đá, cỏ trong khu mới → gỗ/đá vào túi
    const [ax0, ay0, ax1, ay1] = penRect(m.id, m.off);
    const got = {};
    for (let y = ay0; y <= ay1; y++)
      for (let x = ax0; x <= ax1; x++) {
        const k = key(x, y), o = state.objects[k];
        if (!o || !PEN_CLEARABLE[o.type]) continue;
        for (const [id, n] of Object.entries(PEN_CLEARABLE[o.type])) got[id] = (got[id] || 0) + n;
        delete state.objects[k];
      }
    for (const [id, n] of Object.entries(got)) if (n) addItem(id, n, true);
    const gotTxt = Object.entries(got).filter(([, n]) => n).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ');
    if (gotTxt) this.time.delayedCall(1800, () => toast(`Chú Frank dọn đất giúp, bạn nhận ${gotTxt}`));
    save();
    sfx('success', 0.5);
    toast(`Đã dời ${BUILDINGS[m.id].name}! Vật nuôi theo về chỗ mới.`);
    this.penMoveEnd(true);
    let { tx, ty } = this.playerTile();
    // đang đứng trong chỗ mới → ra đứng trước cổng rào
    const [x0, y0, x1, y1] = penRect(m.id, m.off);
    if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) ({ x: tx, y: ty } = { x: penCfg(m.id, m.off).gate[0], y: y1 });
    this.changeMap('farm', { x: tx, y: ty });
  }

  penMoveEnd(moved = false) {
    const m = this.penMove;
    if (!m) return;
    m.off_?.();
    m.g.destroy();
    m.ghost.destroy();
    if (!moved) this.penImgs?.[m.id]?.setAlpha(1);
    this.penMove = null;
    bus.emit('penMove', false);
  }

  // ---------- Vật nuôi ----------
  spawnAnimal(a, pen, avoid = () => false) {
    // chọn ô ngẫu nhiên trong bãi, tránh nhà chuồng
    const pick = () => {
      for (let i = 0; i < 30; i++) {
        const x = Phaser.Math.Between(pen.x0, pen.x1), y = Phaser.Math.Between(pen.y0, pen.y1);
        if (!avoid(x, y)) return [x, y];
      }
      return [pen.x0, pen.y1];
    };
    const [tx, ty] = pick();
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
        const [px, py] = pick();
        const nx = px * TILE + 8, ny = (py + 1) * TILE;
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
    this.plazaArea(pl.x0, pl.y0, pl.x1, pl.y1);
    for (const e of V.exit) this.exits.set(key(e.x, e.y), { map: 'farm', spawn: FARM.fromVillage });
    // Cuối đường phía đông: lên Mỏ đá (mở theo uy tín)
    this.dirtArea(50, 13, 51, 14);
    const qOpen = unlocked('quarry');
    for (const y of [13, 14]) {
      if (qOpen) this.exits.set(key(51, y), { map: 'quarry', spawn: QUARRY.fromVillage });
      else {
        this.addWall(50 * TILE, y * TILE, 2 * TILE, TILE);
        for (const x of [49, 50, 51]) this.statics.set(key(x, y), () => ({ act: false, label: `Đường tới Bãi phế liệu — mở ở uy tín cấp ${needLevel('quarry')}` }));
      }
    }
    this.add.image(49 * TILE + 8, 13 * TILE, 'nature', 'sign').setOrigin(0.5, 1).setDepth(13 * TILE);
    this.add
      .text(49 * TILE + 8, 12 * TILE - 4, qOpen ? 'Bãi phế liệu →' : `Bãi phế liệu (uy tín ${needLevel('quarry')})`, { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '36px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 7 })
      .setScale(0.25)
      .setOrigin(0.5, 1)
      .setDepth(9000);
    if (!qOpen) for (const y of [13, 14]) this.add.image(51 * TILE + 8, (y + 1) * TILE, 'pc_nature', 0).setOrigin(0.5, 1).setDepth((y + 1) * TILE).setTint(0xd6c2a8);

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
        return { label: `Vào ${S.title}`, door: true, run: () => this.changeMap('shop', SHOP_IN.enter, { shop: id }) };
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

    // Cổng phía nam: ra Thị trấn bỏ hoang (vùng zombie)
    this.dirtArea(19, 32, 20, 33);
    for (const x of [19, 20]) this.exits.set(key(x, 33), { map: 'town', spawn: TOWN.fromVillage });

    // Quảng trường: đài phun nước ở giữa (decorateVillage), bồn hoa 4 góc
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
      const spots = [[20, 13], [16, 13], [24, 13], [18, 17], [22, 17], [20, 17]];
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
        return { label: `Vào ${Hs.title}`, door: true, run: () => this.changeMap('npchome', NPC_HOUSE_IN.enter, { house: hid, back }) };
      };
      for (let tx = x; tx < x + w; tx++) for (let ty = yB - 1; ty <= yB; ty++) if (!this.statics.has(key(tx, ty))) this.statics.set(key(tx, ty), enter);
    });

    const inRect = (x, y, r) => x >= r.x0 - 1 && x <= r.x1 + 1 && y >= r.y0 - 1 && y <= r.y1 + 1;
    decorateVillage(this);
    this.scatterDecor((x, y) => !this.blocked.has(key(x, y)) && !this.isDirt(x, y), 420, 99);
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
      .text(((pl.x0 + pl.x1) / 2) * TILE + 8, pl.y0 * TILE + 4, f.name, { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '56px', color: '#fdd179', stroke: '#3d3333', strokeThickness: 10 })
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
    const kid = NPCS[id].sheet === 'Child';
    const sprite = this.add.sprite(cfg.x * TILE + 8, (cfg.y + 1) * TILE, `npc_${id}`, 16).setOrigin(0.5, 1).setScale(kid ? 0.8 : 1); // trẻ con nhỏ hơn
    sprite.play(`npc_${id}_idle_down`);
    // Đỉnh đầu thật (NPC không đội mũ / trẻ con thấp hơn) để đặt tên cho sát
    let headTop = 0;
    while (headTop < 31 && ![...Array(32).keys()].some((x) => this.textures.getPixelAlpha(x, headTop, `npc_${id}`, 16))) headTop++;
    this.fx.followShadow(sprite, 13, -1);
    const name = this.add
      .text(0, 0, NPCS[id].name, { fontFamily: 'VT323, AshenGlyphs, monospace', fontSize: '34px', color: '#fee1b8', stroke: '#3d3333', strokeThickness: 7 })
      .setScale(0.25)
      .setOrigin(0.5, 1)
      .setDepth(8900);
    const m = {
      kind: 'npc',
      id,
      nameDy: (32 - headTop) * (kid ? 0.8 : 1) - 3,
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
      } else if (m.bubble) {
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
    this.player = this.physics.add.sprite(tx * TILE + 8, ty * TILE - 5, 'hero', 3 * 8);
    // khung 64x64 (Pixel Crawler): chân ở hàng 47 → đặt gốc để chân nằm như nông dân cũ
    this.player.setOrigin(0.5, 35 / 64);
    this.player.body.setSize(8, 5).setOffset(28, 46);
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
    const view = dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
    p.setFlipX(dir === 'left'); // khung ngang nhìn sang phải
    p.anims.play(`hero2_${moving ? 'walk' : 'idle'}_${view}`, true);
  }

  // Động tác theo hướng nhìn: hoe | can | plant | harvest | axe | pickaxe | attack | fish | hit
  playAction(kind) {
    const k = { hoe: 'crush', pickaxe: 'crush', axe: 'slice', can: 'water', plant: 'collect', harvest: 'collect', attack: 'pierce' }[kind] || kind;
    const dir = this.facingName();
    const view = dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
    const anim = this.anims.get(`hero2_${k}_${view}`);
    if (!anim) return;
    this.actionUntil = this.time.now + Math.min(420, (anim.frames.length / anim.frameRate) * 1000);
    this.player.setVelocity(0, 0);
    this.player.setFlipX(dir === 'left');
    this.player.anims.play(`hero2_${k}_${view}`, true);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    const act = () => {
      if (ui.modal || ui.transition || !this.target) return;
      this.inputMode = 'key';
      // Cầm vũ khí ở vùng có zombie: nút hành động = tấn công (tự ngắm)
      if (this.combat && heldWeapon()) return void this.combat.attack();
      const a = this.actionAt(this.target);
      if (a?.act !== false && a?.run) a.run();
      else if (a?.label) toast(a.label);
      else if (!a) this.whyNoAction(this.target);
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
      if (this.penMove) return p.isDown && !ui.hitTest(p.x, p.y) && this.penMoveAt(p.worldX, p.worldY);
      if (this.swipe && p.isDown) return this.onSwipe(p);
      if (p.wasTouch) return;
      this.inputMode = 'mouse';
      this.hover = this.resolveTarget(p.worldX, p.worldY);
    });
  }

  update(time, delta) {
    this.fx.update(time, delta);
    if (this.tufts?.length) {
      // gió: nghiêng hẳn về một phía rồi bật lại, kèm cơn gió mạnh thỉnh thoảng
      const t = time / 1000, gust = 0.6 + 0.4 * Math.sin(t * 0.37);
      const cam = this.cameras.main.worldView;
      for (const g of this.tufts) {
        if (g.x < cam.x - 20 || g.x > cam.right + 20 || g.y < cam.y - 20 || g.y > cam.bottom + 30) continue;
        g.angle = 3 + 9 * gust * Math.sin(t * 2.1 - g.phase);
      }
    }
    const k = this.keys;
    const p = this.player;
    if (ui.cine) {
      // đoạn phim: kịch bản tự điều khiển nhân vật
      p.setDepth(p.y);
      return;
    }
    const frozen = ui.modal || ui.transition || ui.deco || !!this.penMove;
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
    this.raid?.update(time);
    this.combat?.update(time);
    this.caveLight?.update(time);

    const { tx, ty } = this.playerTile();
    if (!ui.transition && !ui.deco) {
      const exit = this.exits.get(key(tx, ty));
      if (exit) return this.changeMap(exit.map, exit.spawn);
    }

    // Ô mục tiêu (trước mặt hoặc dưới chuột)
    this.target = this.moverAt(tx + this.facing.x, ty + this.facing.y) || { tx: tx + this.facing.x, ty: ty + this.facing.y };
    // Ô trước mặt trống → vật đang đứng sát (thùng, xe, tủ...) ở bất kỳ phía nào
    if (!this.target.mover && !this.statics.has(key(this.target.tx, this.target.ty)) && !(this.mapId === 'farm' && state.objects[key(this.target.tx, this.target.ty)])) {
      const near = this.nearInteractable();
      if (near) this.target = near;
    }
    if (!frozen && (vx || vy) && this.doorAssist(tx, ty, vx, vy, time)) return;
    // Tự đổi dụng cụ khi đi ngang cây / đá (ô trước mặt trước, rồi các ô sát bên)
    if (!frozen) {
      const pk = key(tx, ty) + ':' + this.facing.x + ',' + this.facing.y;
      if (pk !== this.autoToolKey) {
        this.autoToolKey = pk;
        const f = this.facing;
        const around = [[f.x, f.y], [0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
        for (const [dx, dy] of around) if (this.autoTool({ tx: tx + dx, ty: ty + dy }, false)) break;
      }
    }
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

  // Vật tương tác gần nhất mà người chơi đang đứng sát (≤ 8px quanh hình)
  nearInteractable() {
    const b = this.player.body;
    const px = b.center.x, py = b.center.y;
    let best = null, bd = 9;
    for (const it of this.interactables) {
      if (!it.img?.active) continue;
      const r = it.r;
      const dx = Math.max(r.x - px, 0, px - (r.x + r.width)), dy = Math.max(r.y - py, 0, py - (r.y + r.height));
      const d = Math.hypot(dx, dy) - b.halfWidth;
      if (d < bd) (bd = d), (best = it);
    }
    return best ? { tx: best.tx, ty: best.ty } : null;
  }

  // Đi thẳng vào cửa → tự vào (đẩy ~0.2s); trong nhà đi xuống sát khe cửa → tự ra
  doorAssist(tx, ty, vx, vy, time) {
    if (ui.transition || ui.modal) return false;
    if (['home', 'shop', 'npchome', 'ruin', 'pen'].includes(this.mapId) && vy > 0 && Math.abs(vy) >= Math.abs(vx)) {
      for (const dx of [0, -1, 1]) {
        const e = this.exits.get(key(tx + dx, ty + 1));
        if (e) return this.changeMap(e.map, e.spawn), true;
      }
    }
    const f = this.facing, k = key(tx + f.x, ty + f.y);
    const a = this.statics.get(k)?.(selected());
    if (!a?.door || a.act === false) return (this.doorPush = null), false;
    if (this.doorPush?.k !== k) this.doorPush = { k, t0: time };
    else if (time - this.doorPush.t0 > 220) {
      this.doorPush = null;
      a.run();
      return true;
    }
    return false;
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
    // Bấm vào bất kỳ chỗ nào trên hình thùng / xe / tủ → nhắm vào vật đó
    if (!this.statics.has(key(tx, ty))) {
      const it = this.interactables.find((i) => i.img?.active && i.r.contains(wx, wy));
      if (it) return { tx: it.tx, ty: it.ty };
    }
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

  actionAt(target, noFood = false) {
    if (!target) return null;
    // Chiều tối cầm bí ngô / thịt thối: chạm xuống đất = đặt làm mồi nhử (chứ không ăn)
    if (this.mapId === 'farm' && !target.mover && target.tx != null && (state.time >= 16 * 60 || state.time < 5 * 60)) {
      const sel = selected();
      if (sel.kind === 'item' && ITEMS[sel.id]?.bait && !this.statics.has(key(target.tx, target.ty))) {
        const a = this.defenseAction(target.tx, target.ty, sel);
        if (a) return a;
      }
    }
    if (target.mover) return target.mover.action(); // đang cầm đồ ăn mà chạm NPC/vật nuôi → vẫn nói chuyện / tặng quà
    // Cầm đồ ăn: ô trước mặt có việc thật (rương, cửa, thu hoạch...) thì làm việc đó, không có gì mới ăn
    const food = !noFood && this.foodAction();
    if (food) {
      const other = this.actionAt(target, true);
      return other?.run && other.act !== false ? other : food;
    }
    const { tx, ty } = target;
    if (!this.inMap(tx, ty)) return null;
    const sel = selected();
    const st = this.statics.get(key(tx, ty));
    // hoa dại / nấm trên nông trại: cầm cuốc thì cuốc luôn (không bắt hái trước)
    const hoeOver = st?.decor && this.mapId === 'farm' && sel.kind === 'tool' && sel.id === 'hoe';
    if (st && !hoeOver) return st(sel);
    if (this.mapId === 'farm') return this.farmAction(tx, ty, sel);
    if (this.mapId === 'mine') return mineAction(this, tx, ty, sel);
    if (this.mapId === 'home') return homeAction(this, tx, ty, sel);
    return null;
  }

  // Tự chọn dụng cụ phù hợp với thứ ở ô t (dựa vào gợi ý "cần Rìu / cần Cuốc chim" của chính ô đó).
  // explicit = người chơi chạm thẳng vào → được đổi cả khi đang cầm hạt giống / vũ khí.
  autoTool(t, explicit) {
    if (state.autoTool === false || !state.gotTools || t?.tx == null) return;
    const sel = selected();
    if (!explicit && sel.kind === 'item') return; // đang cầm hạt/vũ khí: chỉ đổi khi chạm thẳng
    const label = this.actionAt(t)?.label || '';
    const want = /cần Rìu|cầm Rìu/.test(label) ? 'axe' : /cần Cuốc chim|cầm Cuốc chim/.test(label) ? 'pickaxe' : null;
    if (!want) return false;
    if (sel.kind === 'tool' && sel.id === want) return true;
    state.sel = `tool:${want}`;
    bus.emit('changed');
    return true;
  }

  // Bấm Làm mà không có việc gì: giải thích lý do (chỉ khi bấm, không hiện thường trực)
  whyNoAction(t) {
    if (this.mapId !== 'farm' || t?.tx == null) return;
    const sel = selected();
    if (sel.kind !== 'tool' || sel.id !== 'hoe') return;
    const k = key(t.tx, t.ty);
    if (state.tiles[k] || state.objects[k] || this.blocked.has(k) || this.isDirt(t.tx, t.ty)) return;
    if (isReserved(t.tx, t.ty) || this.noTill.has(k)) toast('Chỗ này chừa cho lối đi / công trình — không cuốc được');
  }

  // Đang cầm món ăn → ăn luôn (không cần đi đâu)
  foodAction() {
    const sel = selected();
    const it = sel.kind === 'item' && ITEMS[sel.id];
    if (it?.heal) return { label: `Dùng ${it.name} (+${it.heal} máu)`, run: () => this.eat(sel.id), self: true };
    if (!it?.eat) return null;
    return { label: `Ăn ${it.name} (+${it.eat.e} no${it.eat.h ? `, +${it.eat.h} máu` : ''})`, run: () => this.eat(sel.id), self: true };
  }

  eat(id) {
    const it = ITEMS[id];
    const food = state.food ?? FOOD_MAX;
    if (it.heal) {
      if (state.hp >= maxHp()) return toast('Bạn đang khoẻ, chưa cần băng bó!');
      addItem(id, -1);
      state.hp = Math.min(maxHp(), state.hp + it.heal);
      sfx('heal', 0.5);
      this.floatText(this.player.x, this.player.y - 20, `+${it.heal}`, '#ff8a7a');
      return changed();
    }
    if (food >= FOOD_MAX - 2 && state.hp >= maxHp()) return toast('Bạn đang no rồi!');
    addItem(id, -1);
    state.food = Math.min(FOOD_MAX, food + it.eat.e);
    state.hp = Math.max(1, Math.min(maxHp(), state.hp + (it.eat.h || 0)));
    sfx(it.eat.h < 0 ? 'hurt' : 'eat', 0.5);
    this.floatText(this.player.x, this.player.y - 20, `+${it.eat.e} no`, '#ffd08a');
    if (it.eat.h < 0) {
      this.floatText(this.player.x, this.player.y - 30, `${it.eat.h} máu`, '#ff6a5a');
      this.cameras.main.shake(150, 0.004);
      toast(it.cook ? `Đau bụng! ${it.name} phải nấu chín mới ăn được (bếp trong nhà)` : `Ngộ độc! ${it.name} không nên ăn — đem bán hoặc đổi thì hơn.`);
    } else toast(`Ngon quá! ${it.name}`);
    changed();
  }

  onPointerDown(pointer) {
    if (ui.modal || ui.transition || ui.hitTest(pointer.x, pointer.y)) return;
    if (ui.deco) return decoPointer(this, pointer.worldX, pointer.worldY);
    if (this.penMove) return this.penMoveAt(pointer.worldX, pointer.worldY);
    this.inputMode = pointer.wasTouch ? 'touch' : 'mouse';
    const w = this.combat && heldWeapon();
    if (w) {
      // Súng: chạm đâu cũng bắn zombie gần nhất. Cận chiến: đánh nếu có zombie trong tầm, không thì đi tới chỗ chạm
      const c = this.player.body.center;
      if (w.gun || this.combat.nearest(w.range + 14, { x: c.x, y: c.y - 6 })) return void this.combat.attack();
    }
    // Đang cầm đồ ăn: chỉ ăn khi chạm vào chính nhân vật; chạm chỗ khác thì vẫn đi lại / làm việc bình thường
    const food = this.foodAction();
    if (food && Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.player.x, this.player.y - 14) < 22) return food.run();
    let target = this.resolveTarget(pointer.worldX, pointer.worldY);
    if (!this.inMap(target.tx, target.ty)) return;
    if (!target.mover) this.autoTool(target, true); // chạm thẳng vào cây/đá → tự cầm đúng dụng cụ
    const a = this.actionAt(target, true);

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
    if (a?.run && a.act !== false && a.label !== 'Lấp đất') { // vuốt hàng loạt không bao giờ lấp mất luống
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
      if (c && sel.kind === 'item' && sel.id === 'fert') return { label: `Bón phân cho ${name}`, run: () => this.fertilize(tx, ty) };
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

    const def = this.defenseAction(tx, ty, sel);
    if (def) return def;
    if (this.blocked.has(k) || isReserved(tx, ty) || this.noTill.has(k)) return null;
    if (tool === 'hoe') {
      if (this.sea.id === 'winter') return { act: false, label: 'Mùa đông đất đóng băng, không cuốc được' };
      return { label: 'Cuốc đất', run: () => this.till(tx, ty) };
    }
    if (item?.place) return { label: `Đặt ${item.name}`, run: () => this.placeItem(tx, ty, sel.id) };
    return null;
  }

  // Đặt bẫy gai / đuốc / mồi nhử (được đặt cả trên đường đi — lối zombie vào)
  defenseAction(tx, ty, sel) {
    const k = key(tx, ty);
    const label = sel.kind === 'item' && defensePlaceLabel(sel.id);
    if (!label || state.objects[k] || state.tiles[k] || this.blocked.has(k) || this.statics.has(k) || this.lakeTiles?.has(k)) return null;
    const { tx: px, ty: py } = this.playerTile();
    if (px === tx && py === ty) return null;
    return {
      label,
      run: () => {
        addItem(sel.id, -1);
        state.objects[k] = makeDefenseObject(sel.id);
        this.removeDecor(k);
        this.renderObject(k);
        sfx('plant', 0.5);
        changed();
      },
    };
  }

  fertilize(tx, ty) {
    const t = state.tiles[key(tx, ty)];
    addItem('fert', -1);
    fertilize(t);
    growCrops();
    this.renderCrop(tx, ty);
    this.cropGrowFx?.(tx, ty);
    sfx('plant', 0.5);
    this.puff(tx, ty, 0x8a6a3a);
    changed();
  }

  objectAction(o, k, tx, ty, sel) {
    const tool = sel.kind === 'tool' ? sel.id : null;
    const need = (t, label, run) => (tool === t ? { label, run } : { act: false, label: `${label.split(' (')[0]} — cần ${TOOLS[t].name}` });
    switch (o.type) {
      case 'tree':
        return need('axe', this.objHives?.get(k) ? 'Chặt cây (có tổ ong)' : 'Chặt cây', () =>
          this.hit(o, k, tx, ty, 'axe', 'chop', () => {
            const h = this.objHives?.get(k);
            this.objHives?.delete(k); // giữ tổ ong lại để diễn cảnh rơi
            this.setObject(k, { type: 'stump', hp: 3, v: 0 }, 'wood', 4);
            if (h) this.dropHive(h, (ty + 1) * TILE);
          }));
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
      case 'trap_spike':
        if ((o.hp || 0) <= 0) return { label: 'Dọn bẫy gai đã gãy', run: () => this.setObject(k, null, 'scrap', 1) };
        return { label: `Nhặt lại bẫy gai (còn ${o.hp} lần đâm)`, run: () => this.setObject(k, null, o.hp >= 3 ? 'trap_spike' : 'scrap', 1) };
      case 'torch':
        return { label: 'Nhổ đuốc lên', run: () => this.setObject(k, null, 'torch', 1) };
      case 'bait': {
        const it = ITEMS[o.item];
        const full = o.hp >= (it?.bait?.hp || 0);
        return { label: full ? `Nhặt lại ${it?.name || 'mồi'}` : `Dọn ${it?.name || 'mồi'} bị gặm dở`, run: () => this.setObject(k, null, full ? o.item : null, 1) };
      }
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
    return { act: false, label: state.hasRod ? 'Chọn cần câu để câu cá, bình tưới để lấy nước' : 'Mặt nước — mua cần câu ở tiệm Bà Martha để câu cá' };
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
      // Dù sang ngày mới có lỗi gì cũng phải tỉnh dậy được — không bao giờ kẹt màn hình đen
      let notes = [];
      try {
        notes = newDay(passedOut);
        save();
        bus.emit('changed');
        bus.emit('newDay', notes);
      } catch (e) {
        console.error('newDay lỗi:', e);
        state.time = DAY_START;
      }
      this.scene.restart({ map: 'home', spawn: HOME.bedSpawn });
    });
  }

  changeMap(map, spawn, extra = {}) {
    if (ui.transition) return;
    ui.transition = true;
    this.cancelPath();
    this.player.setVelocity(0, 0);
    sfx('door', 0.4);
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
    sfx('gameover', 0.6);
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
    this.removeHive(this.objHives?.get(k));
    this.objHives?.delete(k);
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
        img = this.add.image(bx, by + 2, 'pc_trees', this.treeFrame(o.v ? 2 : 0));
        break;
      case 'stump':
        img = this.add.image(bx, by, 'pc_bushes', 8);
        break;
      case 'rock':
        img = this.add.image(bx, by, 'pc_nature', o.v ? 1 : 0).setFlipX(!!o.v);
        break;
      case 'branch':
        img = this.add.image(bx, by, 'pc_nature', o.v ? 3 : 2);
        break;
      case 'weed':
        img = this.add.image(bx, by, 'pc_bushes', state.season + (o.v ? 4 : 0));
        break;
      case 'storage_chest':
        img = this.add.image(bx, by, 'pc_chest');
        break;
      case 'trap_spike':
        img = this.add.image(bx, by, 'surv', (o.hp || 0) > 0 ? 'trap_spike' : 'trap_broken');
        break;
      case 'torch': {
        img = this.add.sprite(bx, by, 'surv', 'torch0');
        let fr = 0;
        const ev = this.time.addEvent({ delay: 180 + Math.random() * 60, loop: true, callback: () => (img.active ? img.setFrame(`torch${(fr = 1 - fr)}`) : ev.remove()) });
        const lt = this.fx.light(bx, by - 22, 46);
        img.once('destroy', () => lt?.destroy());
        break;
      }
      case 'bait': {
        const it = ITEMS[o.item] || ITEMS.rotflesh;
        img = o.item === 'pumpkin' ? this.add.image(bx, by, it.tex, it.frame) : this.add.image(bx, by, 'surv', o.item === 'bait_poison' ? 'bait_poison' : 'bait_meat');
        break;
      }
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
    if (o.type === 'tree') {
      this.fx.sway(img);
      // thỉnh thoảng có tổ ong rừng trên cây (không có vào mùa đông)
      if (this.hasHive(k)) (this.objHives ||= new Map()).set(k, this.addHive(img, x + y));
    }
    if (DEFENSE.includes(o.type)) return; // không chặn đường đi
    this.blocked.add(k);
    this.removeDecor(k);
    if (SOLID.includes(o.type)) this.objWalls.set(k, this.addWall(x * TILE + 3, y * TILE + 5, 10, 10, false));
  }

  // ---------- Tổ ong rừng ----------
  hasHive(k) {
    if (this.sea.id === 'winter') return false;
    let h = 0;
    for (const c of k) h = (h * 31 + c.charCodeAt(0)) % 1000003;
    return h % 7 === 0;
  }

  // Tổ ong treo dưới tán cây, đung đưa; vài con ong bay vòng quanh
  addHive(tree, seed = 0) {
    const side = seed % 2 ? 1 : -1;
    const hx = tree.x + side * 7, hy = tree.y - tree.displayHeight * 0.5;
    const hive = this.add.image(hx, hy, 'icons', 'hive').setOrigin(0.5, 0.05).setDepth(tree.depth + 0.5);
    const sway = this.tweens.add({ targets: hive, angle: { from: -5, to: 5 }, duration: 1500 + (seed % 5) * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const bees = [];
    for (let i = 0; i < 3; i++) {
      const b = this.add.image(hx, hy + 8, 'icons', 'bee').setScale(0.55).setDepth(tree.depth + 0.6);
      const o = { a: i * 2.1 };
      b.orbit = this.tweens.add({
        targets: o, a: o.a + Math.PI * 2, duration: 1300 + i * 380, repeat: -1,
        onUpdate: () => b.active && b.setPosition(hx + Math.cos(o.a) * (8 + i * 2), hy + 9 + Math.sin(o.a * 2) * 3 + Math.sin(o.a) * 2).setFlipX(Math.sin(o.a) > 0),
      });
      bees.push(b);
    }
    return { hive, bees, sway, tree };
  }

  removeHive(h) {
    if (!h) return;
    h.sway?.remove();
    for (const b of h.bees) (b.orbit?.remove(), b.destroy());
    h.hive.destroy();
  }

  // Chặt cây: tổ rơi xoay vòng → nảy bẹp trên đất → ong bay tán loạn → mật ong bật lên rồi bay vào túi
  dropHive(h, groundY, n = 1 + (Math.random() < 0.5 ? 1 : 0) + (bonusChance('foraging') ? 1 : 0)) {
    h.sway?.remove();
    const hive = h.hive;
    for (const b of h.bees) {
      b.orbit?.remove();
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: b, x: b.x + Math.cos(a) * 40, y: b.y - 20 - Math.random() * 30, alpha: 0, duration: 900 + Math.random() * 400, ease: 'Sine.easeOut', onComplete: () => b.destroy() });
    }
    sfx('grass', 0.4);
    hive.setDepth(groundY + 2);
    const gy = groundY - 2;
    this.tweens.add({
      targets: hive, y: gy - 12, angle: hive.angle + 220 * (Math.random() < 0.5 ? 1 : -1), duration: 480, ease: 'Quad.easeIn',
      onComplete: () => {
        hive.setAngle(0).setOrigin(0.5, 1).setY(gy);
        sfx('plant', 0.5);
        this.burst(hive.x, gy, 'fx_dust', 7, 0xd9a441, 12, 6, 460);
        // nảy lên 1 nhịp + bẹp xuống
        this.tweens.add({ targets: hive, scaleX: { from: 1.3, to: 1 }, scaleY: { from: 0.7, to: 1 }, duration: 260, ease: 'Back.easeOut' });
        this.tweens.add({
          targets: hive, y: gy - 6, duration: 160, yoyo: true, ease: 'Quad.easeOut', delay: 60,
          onComplete: () => {
            // mật ong bật lên
            const it = ITEMS.honey;
            const ok = roomFor('honey');
            if (ok) addItem('honey', n);
            for (let i = 0; i < n; i++) {
              const icon = this.add.image(hive.x, gy - 6, it.tex, it.frame).setDepth(9000).setScale(0.6);
              this.tweens.add({
                targets: icon, x: icon.x + (i - (n - 1) / 2) * 10, y: gy - 26 - i * 3, scale: 1, duration: 300, ease: 'Back.easeOut', delay: i * 90,
                onComplete: () => {
                  const cam = this.cameras.main;
                  if (ok) bus.emit('flyToBag', { x: (icon.x - cam.worldView.x) * cam.zoom, y: (icon.y - cam.worldView.y) * cam.zoom, tex: it.tex, frame: it.frame, scale: icon.scale * cam.zoom });
                  icon.destroy();
                },
              });
            }
            sfx('harvest', 0.5);
            toast(ok ? `+${n} ${it.name} từ tổ ong!` : 'Túi đầy — mật ong rơi mất');
            changed();
            this.tweens.add({ targets: hive, alpha: 0, delay: 900, duration: 500, onComplete: () => hive.destroy() });
          },
        });
      },
    });
  }

  // Cây rừng có tổ ong (cây trang trí): cầm Rìu chặt → cây đổ, tổ rơi. Hôm sau cây & tổ mọc lại.
  hiveTree(tree, tx, ty) {
    const pk = `${this.mapId}:hive:${tx},${ty}`;
    if (this.sea.id === 'winter' || state.pickDay?.[pk] === dayNum()) return;
    const h = this.addHive(tree, tx + ty);
    const k = key(tx, ty);
    const act = (sel) => {
      if (sel?.kind !== 'tool' || sel.id !== 'axe') return { act: false, label: 'Tổ ong rừng — cầm Rìu chặt cây để lấy mật' };
      return {
        label: 'Chặt cây lấy tổ ong',
        run: () => {
          if (!useEnergy(energyCost('axe'))) return;
          this.statics.delete(k);
          this.playAction('axe');
          sfx('chop');
          this.puff(tx, ty, 0xb07040);
          xp('foraging', 2);
          state.pickDay = { ...(state.pickDay || {}), [pk]: dayNum() };
          // cây rung 3 nhịp rồi đổ nghiêng, mờ dần → để lại gốc
          this.tweens.killTweensOf(tree);
          this.tweens.add({
            targets: tree, x: tree.x + 2, duration: 60, yoyo: true, repeat: 2,
            onComplete: () => {
              this.dropHive(h, (ty + 1) * TILE);
              const dir = Math.random() < 0.5 ? -1 : 1;
              this.tweens.add({ targets: tree, angle: 80 * dir, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => tree.destroy() });
              this.add.image(tree.x, (ty + 1) * TILE, 'pc_bushes', 8).setOrigin(0.5, 1).setDepth((ty + 1) * TILE - 1);
              tree.wallObj?.destroy();
              this.blocked.delete(k);
              const wood = 2 + (bonusChance('foraging') ? 1 : 0);
              if (roomFor('wood')) addItem('wood', wood);
            },
          });
          changed();
        },
      };
    };
    this.statics.set(k, act);
    this.interactables.push({ img: h.hive, r: new Phaser.Geom.Rectangle(tree.x - 10, tree.y - 30, 20, 30), tx, ty });
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
