import Phaser from 'phaser';
import { OBJECT_FRAMES, NINJA_FRAMES, NPCS, ANIMALS, MONSTERS, FISH } from '../config.js';
import { makeUiTextures, FONT } from '../ui/theme.js';
import { makeFxTextures } from '../fx.js';
import { loadSfx } from '../audio.js';

const TW = 'assets/tiny-wonder/';
const NJ = 'assets/ninja/';
const FP = 'assets/fp/'; // Farmer Pack — Pyong Hoo

// Pixel art nhỏ vẽ bằng code cho những món bộ asset không có
const PIXEL_ART = {
  egg: {
    colors: { O: '#3a2a20', W: '#fff6e6', S: '#e8d5b8', H: '#ffffff' },
    art: ['', '', '', '......OOOO', '.....OWWWWO', '....OWHWWWWO', '....OWHWWWWO', '...OWWWWWWWWO', '...OWWWWWWWSO', '...OWWWWWWWSO', '...OSWWWWWSSO', '....OSSWWSSO', '.....OOSSOO', '.......OO'],
  },
  fence: {
    colors: { O: '#3a2414', L: '#c98b4f', M: '#a0632f', D: '#7a4a24' },
    art: ['', '', '......OOOO', '.....OLLMDO', 'OOOOOOLLMDOOOOOO', 'LLLLLOLLMDOLLLLL', 'MMMMMOLLMDOMMMMM', 'OOOOOOLLMDOOOOOO', '.....OLLMDO', 'OOOOOOLLMDOOOOOO', 'LLLLLOLLMDOLLLLL', 'MMMMMOLLMDOMMMMM', 'OOOOOOLLMDOOOOOO', '.....OLLMDO', '.....OMMDDO', '......OOOO'],
  },
  sword: {
    colors: { O: '#2b2b3a', W: '#eef3fa', G: '#9aa3b5', Y: '#d9a441', B: '#7a4a24' },
    art: ['', '............OO', '...........OWO', '..........OWGO', '.........OWGO', '........OWGO', '.......OWGO', '..O...OWGO', '..OYOOWGO', '...OYYGO', '....OYYO', '...OBOOYO', '..OBO..OO', '.OBO', '.OO'],
  },
  soup: {
    colors: { O: '#3a2414', W: '#f4efe6', S: '#d8cfc0', P: '#f08a2a', Y: '#ffc060', G: '#6aa236' },
    art: ['', '', '', '', '', '......G..', '..OOOOOOOOOOOO', '.OPPYPPPPYPPPPO', '.OWPPPPYPPPPPWO', '.OWWWWWWWWWWWWO', '..OWWWWWWWWWWO', '...OSWWWWWWSO', '....OOSSSSOO', '.....OOOOOO'],
  },
  // Hàng rào trang trí (màu Farmer Pack): ngang, dọc, cột
  fence_h: {
    colors: { O: '#3d3333', L: '#de9f47', M: '#a57855', D: '#734c44' },
    art: ['', '', '', '', 'OOOOOOOOOOOOOOOO', 'LLLLLLLLLLLLLLLL', 'MMMMMMMMMMMMMMMM', 'OOOOOOOOOOOOOOOO', '', 'OOOOOOOOOOOOOOOO', 'LLLLLLLLLLLLLLLL', 'MMMMMMMMMMMMMMMM', 'OOOOOOOOOOOOOOOO'],
  },
  fence_v: {
    colors: { O: '#3d3333', L: '#de9f47', M: '#a57855', D: '#734c44' },
    art: Array.from({ length: 16 }, () => '......OLMMO'),
  },
  fence_post: {
    colors: { O: '#3d3333', L: '#de9f47', M: '#a57855', D: '#734c44' },
    art: ['', '', '.....OOOOO', '.....OLLMO', '.....OLMMO', '.....OLMMO', '.....OLMMO', '.....OLMMO', '.....OLMMO', '.....OLMMO', '.....OLMMO', '.....OLMDO', '.....OMMDO', '.....ODDDO', '.....OOOOO'],
  },
  sprinkler: {
    colors: { O: '#2b2b3a', G: '#9aa3b5', W: '#dfe7f0', B: '#5fc4e8', Y: '#d9a441' },
    art: ['', '..B.........B', '...B..BB...B', '.......B', '......OOOO', '.....OWYYWO', '.....OGWWGO', '......OGGO', '......OGGO', '....OOOGGOOO', '...OGGGGGGGGO', '...OGWWWWWWGO', '...OGGGGGGGGO', '....OOOOOOOO'],
  },
};

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 40, 'Nông Trại Tận Thế', { fontFamily: FONT, fontSize: '56px', color: '#c8e07a' }).setOrigin(0.5);
    const bar = this.add.rectangle(width / 2 - 150, height / 2 + 10, 0, 12, 0xf4b467).setOrigin(0, 0.5);
    this.load.on('progress', (p) => (bar.width = 300 * p));

    const sheet = (k, f, w = 16, h = 16) => this.load.spritesheet(k, f, { frameWidth: w, frameHeight: h });
    sheet('tiles', TW + 'tilemap.png');
    sheet('plants', TW + 'plants.png');
    sheet('items', TW + 'items.png');
    // Farmer Pack (Pyong Hoo): nông dân 32x32, ô nền & cây trồng 16x16, vật nuôi
    sheet('fp_farmer', FP + 'farmer.png', 32, 32);
    sheet('fp_tiles', FP + 'tiles.png');
    sheet('fp_crops', FP + 'crops.png');
    sheet('fp_chicken', FP + 'chicken.png');
    sheet('fp_pig', FP + 'pig.png', 24, 24);
    sheet('fp_cow', FP + 'cow.png', 32, 32);
    sheet('fp_trees', FP + 'trees.png', 32, 44); // vẽ bằng tools/make_trees.py: cột = mùa, hàng = kiểu cây
    sheet('fp_bushes', FP + 'bushes.png');
    sheet('fp_soil', FP + 'soil.png');
    sheet('fp_goods', FP + 'goods.png'); // tools/make_goods.py
    this.load.image('coin', NJ + 'items/coin.png');
    sheet('fp_fence', FP + 'fences.png'); // tools/make_fences.py: 0 ngang, 1 dọc, 2 cột, 3 đầu trái, 4 đầu phải
    sheet('fp_crops2', FP + 'crops2.png'); // tools/make_crops.py: khoai tây, bí ngô, đậu que // vẽ bằng tools/make_soil.py: 0–2 đất khô, 3–5 đất ướt
    sheet('floor', NJ + 'floor.png');
    this.load.image('objects', TW + 'objects.png');
    this.load.image('portrait', FP + 'portrait.png');
    this.load.image('nhouse', NJ + 'house.png');
    this.load.image('nature', NJ + 'nature.png');
    this.load.image('element', NJ + 'element.png');
    sheet('relief', NJ + 'relief.png');
    sheet('water', NJ + 'water.png');
    for (const id of Object.keys(MONSTERS)) sheet(`mon_${id}`, `${NJ}monsters/${id}.png`);
    for (const f of ['fish', 'shrimp', 'tealeaf', 'honey', 'nut2', 'noodle', 'onigiri', 'sushi', 'sushi2', 'yakitori', 'fortunecookie', 'meat', 'beaf', 'calamari', 'octopus'])
      this.load.image(`food_${f}`, `${NJ}food/${f}.png`);
    this.load.image('tool_rod', `${NJ}items/rod.png`);
    this.load.image('food_lifepot', `${NJ}food/lifepot.png`);
    sheet('interior', 'assets/interior/interior.png');
    sheet('twfurn', TW + 'furniture.png');
    for (const q of ['geode', 'geode_ice', 'geode_fire', 'boulder', 'anvil', 'cart', 'crystal', 'rail', 'door']) this.load.image(`q_${q}`, `assets/quarry/${q}.png`); // tools/make_quarry.py
    for (const c of ['floor0', 'floor1', 'floor2', 'floor3', 'wall_top', 'wall_face', 'edge_l', 'edge_r', 'edge_t', 'beam', 'stalagmite', 'pebbles', 'puddle', 'crate', 'rubble']) this.load.image(`cave_${c}`, `assets/cave/${c}.png`); // tools/make_bunker.py
    for (const o of ['ore_copper', 'ore_iron', 'ore_gold', 'ore_gem']) this.load.image(o, `assets/cave/${o}.png`); // đống phế liệu & két sắt
    this.load.spritesheet('cave_torch', 'assets/cave/torch.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('cave_lava', 'assets/cave/lava.png', { frameWidth: 16, frameHeight: 16 });
    for (const t of ['path', 'water', 'plaza', 'road']) this.load.image(`ter_${t}`, `assets/terrain/${t}.png`); // tools/make_terrain.py
    for (const [k, w, h] of [['cat', 16, 16], ['catorange', 22, 17], ['dog', 16, 16], ['dogyellow', 21, 17]]) sheet(`cr_${k}`, `${NJ}critters/${k}.png`, w, h); // Ninja Adventure (CC0)
    this.load.atlas('surv', 'assets/surv/surv.png', 'assets/surv/surv.json'); // tools/make_survival.py
    for (const z of ['walker', 'runner', 'brute', 'soldier']) sheet(`zom_${z}`, `assets/zombie/zom_${z}.png`, 32, 32); // tools/make_zombies.py
    this.load.atlas('props', 'assets/props/props.png', 'assets/props/props.json'); // tools/make_props.py
    this.load.atlas('furn', 'assets/furn/furn.png', 'assets/furn/furn.json'); // nội thất trang trí (tools/make_furniture.py)
    for (const g of ['barcopper', 'bariron', 'bargold', 'gemgreen', 'gempurple', 'gemyellow', 'gemred']) this.load.image(g, `${NJ}items/${g}.png`);

    for (const p of ['counter', 'shelf', 'crate', 'barrel', 'sack', 'window', 'planks', 'bench']) this.load.image(`shop_${p}`, `${FP}shop_${p}.png`);
    // NPC cùng cỡ & phong cách với nhân vật chính (tạo bằng tools/make_npcs.py)
    for (const id of Object.keys(NPCS)) {
      sheet(`npc_${id}`, `${FP}npc_${id}.png`, 32, 32);
      this.load.image(`face_${id}`, `${FP}npc_${id}_face.png`);
    }
    for (const id of Object.keys(ANIMALS)) {
      sheet(`animal_${id}`, `${NJ}animals/${id}.png`);
      this.load.image(`aface_${id}`, `${NJ}animals/${id}_face.png`);
    }
    for (const [k, f] of [['tool_hoe', 'hoe'], ['tool_can', 'wateringcan'], ['tool_axe', 'axe'], ['tool_pickaxe', 'pickaxe'], ['wood', 'wood'], ['stone', 'stone'], ['hay', 'hay'], ['truffle', 'truffle']])
      this.load.image(k, `${NJ}items/${f}.png`);
    loadSfx(this.load);
  }

  create() {
    const addFrames = (texKey, frames) => {
      const tex = this.textures.get(texKey);
      for (const [name, [x, y, w, h]] of Object.entries(frames)) tex.add(name, 0, x, y, w, h);
    };
    addFrames('objects', OBJECT_FRAMES);
    addFrames('nhouse', NINJA_FRAMES.house);
    addFrames('nature', NINJA_FRAMES.nature);
    addFrames('element', NINJA_FRAMES.element);
    makeUiTextures(this);
    makeFxTextures(this);
    this.makeFish();

    this.drawPixels('egg', PIXEL_ART.egg);
    this.drawPixels('fence', PIXEL_ART.fence);
    this.drawPixels('sprinkler', PIXEL_ART.sprinkler);
    this.drawPixels('tool_sword', PIXEL_ART.sword);
    this.drawPixels('soup', PIXEL_ART.soup);
    for (const k of ['fence_h', 'fence_v', 'fence_post']) this.drawPixels(k, PIXEL_ART[k]);

    // Hoạt ảnh người chơi
    // Nông dân (Farmer Pack): hàng 0–3 đi (trước/sau/trái/phải), 4–7 đứng, rồi cuốc/tưới/gieo/thu hoạch × (trước/sau/ngang)
    const row = (r, rate, repeat) => ({ frames: this.anims.generateFrameNumbers('fp_farmer', { start: r * 4, end: r * 4 + 3 }), frameRate: rate, repeat });
    // Hầm mỏ: lửa đuốc & dung nham
    this.anims.create({ key: 'cave_torch', frames: this.anims.generateFrameNumbers('cave_torch', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'cave_lava', frames: this.anims.generateFrameNumbers('cave_lava', { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
    ['down', 'up', 'left', 'right'].forEach((dir, i) => {
      this.anims.create({ key: `hero_walk_${dir}`, ...row(i, 8, -1) });
      this.anims.create({ key: `hero_idle_${dir}`, ...row(4 + i, 3, -1) });
    });
    ['hoe', 'can', 'plant', 'harvest'].forEach((act, i) =>
      ['front', 'back', 'side'].forEach((v, j) => this.anims.create({ key: `hero_${act}_${v}`, ...row(8 + i * 3 + j, 11, 0) }))
    );
    this.anims.create({ key: 'fp_water_anim', frames: this.anims.generateFrameNumbers('fp_tiles', { start: 22, end: 25 }), frameRate: 2, repeat: -1 });

    // NPC: cột = hướng (xuống, lên, trái, phải), hàng = khung đi bộ
    // NPC: hàng 0–3 đi bộ (xuống/lên/trái/phải), hàng 4–7 đứng yên — giống nhân vật chính
    for (const id of Object.keys(NPCS)) {
      const nrow = (r, rate) => ({ frames: this.anims.generateFrameNumbers(`npc_${id}`, { start: r * 4, end: r * 4 + 3 }), frameRate: rate, repeat: -1 });
      ['down', 'up', 'left', 'right'].forEach((dir, i) => {
        this.anims.create({ key: `npc_${id}_${dir}`, ...nrow(i, 8) });
        this.anims.create({ key: `npc_${id}_idle_${dir}`, ...nrow(4 + i, 3) });
      });
    }
    for (const id of ['chicken', 'pig', 'cow'])
      this.anims.create({ key: `animal_${id}_walk`, frames: this.anims.generateFrameNumbers(`fp_${id}`, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });

    // Zombie: cùng bố cục với NPC (hàng 0–3 đi, 4–7 đứng)
    for (const z of ['walker', 'runner', 'brute', 'soldier']) {
      const zr = (r, rate) => ({ frames: this.anims.generateFrameNumbers(`zom_${z}`, { start: r * 4, end: r * 4 + 3 }), frameRate: rate, repeat: -1 });
      ['down', 'up', 'left', 'right'].forEach((dir, i) => {
        this.anims.create({ key: `zom_${z}_${dir}`, ...zr(i, 6) });
        this.anims.create({ key: `zom_${z}_idle_${dir}`, ...zr(4 + i, 2) });
      });
    }
    // Quái: cột = hướng, hàng = khung hình
    for (const id of Object.keys(MONSTERS))
      ['down', 'up', 'left', 'right'].forEach((dir, col) =>
        this.anims.create({ key: `mon_${id}_${dir}`, frames: [0, 1, 2, 3].map((r) => ({ key: `mon_${id}`, frame: r * 4 + col })), frameRate: 7, repeat: -1 })
      );

    this.scene.start('World', { map: 'farm' });
  }

  // Cá các loại = ảnh cá Ninja nhuộm màu
  makeFish() {
    const src = this.textures.get('food_fish').getSourceImage();
    for (const [id, f] of Object.entries(FISH)) {
      if (!f.tint) continue;
      const tex = this.textures.createCanvas(id, 16, 16);
      const ctx = tex.getContext();
      ctx.drawImage(src, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `#${f.tint.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 16, 16);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(src, 0, 0);
      tex.refresh();
    }
  }

  drawPixels(key, { colors, art }) {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, 16, 16);
    const ctx = tex.getContext();
    art.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (!colors[ch]) return;
        ctx.fillStyle = colors[ch];
        ctx.fillRect(x, y, 1, 1);
      })
    );
    tex.refresh();
  }
}
