import Phaser from 'phaser';
import { OBJECT_FRAMES, NINJA_FRAMES, NPCS, ANIMALS, MONSTERS, FISH } from '../config.js';
import { makeUiTextures, FONT } from '../ui/theme.js';
import { state } from '../state.js';
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
    this.add.text(width / 2, height / 2 - 62, 'Ashen Acre', { fontFamily: FONT, fontSize: '60px', color: '#c8e07a' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 22, 'Vườn Tàn Tro', { fontFamily: FONT, fontSize: '26px', color: '#b8a888' }).setOrigin(0.5);
    const bar = this.add.rectangle(width / 2 - 150, height / 2 + 10, 0, 12, 0xf4b467).setOrigin(0, 0.5);
    this.load.on('progress', (p) => (bar.width = 300 * p));

    const sheet = (k, f, w = 16, h = 16) => this.load.spritesheet(k, f, { frameWidth: w, frameHeight: h });
    sheet('tiles', TW + 'tilemap.png');
    sheet('plants', TW + 'plants.png');
    sheet('items', TW + 'items.png');
    // Farmer Pack (Pyong Hoo): nông dân 32x32, ô nền & cây trồng 16x16, vật nuôi
    sheet('fp_farmer', FP + 'farmer.png', 32, 32);
    // Nhân vật chính: Pixel Crawler Body_A (Anokolisa) đã tô quần áo — tools/make_hero.py
    sheet('hero', 'assets/hero/hero.png', 64, 64);
    // Cây trồng từ Pixel Crawler + Farm RPG — tools/make_crops_pack.py
    sheet('crop_plants', 'assets/crops/plants.png', 16, 32);
    sheet('crop_items', 'assets/crops/items.png');
    sheet('pc_grass', 'assets/pc/grass.png'); // tools/make_terrain_pc.py: 0–3 cỏ trơn, 4–7 cỏ có hoa
    // tools/make_nature_pc.py: cây theo mùa (kiểu*4+mùa), cỏ dại/gốc cây, đá/cành khô
    sheet('pc_trees', 'assets/pc/trees.png', 40, 80);
    sheet('pc_bushes', 'assets/pc/bushes.png');
    sheet('pc_tufts', 'assets/pc/tufts.png', 16, 14); // cỏ mép đường — tools/make_tufts.py
    sheet('pc_nature', 'assets/pc/nature.png');
    sheet('pc_bushes2', 'assets/pc/bushes2.png', 32, 32); // bụi hái lượm — tools/make_bushes_pc.py
    for (const k of ['grass', 'sand', 'sea', 'rock_a', 'rock_b', 'rock_c', 'rock_d', 'deadtree', 'bush']) this.load.image(`intro_${k}`, `assets/intro/${k}.png`); // tools/make_intro_pc.py
    for (const k of ['house', 'chest', 'workbench']) this.load.image(`pc_${k}`, `assets/pc/${k}.png`); // tools/make_buildings_pc.py
    for (const k of ['coop', 'barn', 'coop_site', 'barn_site']) this.load.image(`pc_${k}`, `assets/pc/${k}.png`); // tools/make_pens_pc.py
    this.load.atlas('icons', 'assets/icons/icons.png', 'assets/icons/icons.json'); // icon vật phẩm kiểu Pixel Crawler — tools/make_icons.py
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
    for (const t of ['path', 'water', 'plaza', 'road', 'sand']) this.load.image(`ter_${t}`, `assets/terrain/${t}.png`); // tools/make_terrain.py
    for (const [k, w, h] of [['cat', 16, 16], ['catorange', 22, 17], ['dog', 16, 16], ['dogyellow', 21, 17]]) sheet(`cr_${k}`, `${NJ}critters/${k}.png`, w, h); // Ninja Adventure (CC0)
    this.load.atlas('surv', 'assets/surv/surv.png', 'assets/surv/surv.json'); // tools/make_survival.py
    this.load.atlas('pa', 'assets/pa/pa.png', 'assets/pa/pa.json'); // tools/make_pa_props.py (bãi phế liệu)
    for (const f of [0, 1]) this.load.image(`nest_pa${f}`, `assets/surv/nest_pa${f}.png`); // ổ zombie
    for (const z of ['walker', 'runner', 'brute', 'soldier']) sheet(`zom_${z}`, `assets/zombie/zom_${z}.png`, 64, 64); // tools/make_zombies_pa.py
    this.load.json('zom_meta', 'assets/zombie/zom_meta.json');
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
    this.iconTextures();
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
    // Nhân vật chính (hero.png): mỗi động tác 3 hàng (xuống, lên, ngang-nhìn-phải), 8 cột
    const HERO_ROWS = ['walk', 'idle', 'crush', 'slice', 'water', 'collect', 'pierce', 'fish', 'hit', 'death', 'run'];
    const HERO_N = { walk: 6, idle: 4, hit: 4, run: 6, slice: 7 };
    const VIEWS = ['front', 'back', 'side'];
    HERO_ROWS.forEach((a, i) =>
      VIEWS.forEach((v, j) => {
        const r = (i * 3 + j) * 8, n = HERO_N[a] || 8;
        const loop = a === 'walk' || a === 'idle' || a === 'run';
        this.anims.create({
          key: `hero2_${a}_${v}`,
          frames: this.anims.generateFrameNumbers('hero', { start: r, end: r + n - 1 }),
          frameRate: a === 'idle' ? 5 : a === 'walk' ? 10 : a === 'run' ? 12 : 20,
          repeat: loop ? -1 : 0,
        });
      })
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

    // Zombie (PostApocalypse pack, tools/make_zombies_pa.py): khung 64x64, 8 cột — đi / đứng / vồ / ngã
    const ZM = this.cache.json.get('zom_meta') || {};
    for (const z of ['walker', 'runner', 'brute', 'soldier']) {
      const m = ZM[z] || { walk: 6, idle: 6, attack: 4, death: 6 };
      const row = (r, n, rate, repeat) => ({ frames: this.anims.generateFrameNumbers(`zom_${z}`, { start: r * 8, end: r * 8 + n - 1 }), frameRate: rate, repeat });
      ['down', 'up', 'left', 'right'].forEach((dir, i) => {
        this.anims.create({ key: `zom_${z}_${dir}`, ...row(i, m.walk, z === 'runner' ? 12 : 8, -1) });
        this.anims.create({ key: `zom_${z}_idle_${dir}`, ...row(4 + i, m.idle, 6, -1) });
        this.anims.create({ key: `zom_${z}_attack_${dir}`, ...row(8 + i, m.attack, 14, 0) });
      });
      this.anims.create({ key: `zom_${z}_die`, ...row(12, m.death, 10, 0) });
      this.anims.create({ key: `zom_${z}_die_left`, ...row(13, m.death, 10, 0) });
    }
    // Quái: cột = hướng, hàng = khung hình
    for (const id of Object.keys(MONSTERS))
      ['down', 'up', 'left', 'right'].forEach((dir, col) =>
        this.anims.create({ key: `mon_${id}_${dir}`, frames: [0, 1, 2, 3].map((r) => ({ key: `mon_${id}`, frame: r * 4 + col })), frameRate: 7, repeat: -1 })
      );

    // Ván mới: chiếu đoạn mở đầu; đang dở phần tham quan làng thì quay lại làng
    if (['start', 'cliff', 'beach'].includes(state.intro)) this.scene.start('Intro'); // đang dở đoạn phim → xem lại từ màn tựa
    else if (state.intro === 'tour') this.scene.start('World', { map: 'village', tour: true });
    else this.scene.start('World', { map: 'farm' });
  }

  // Công cụ, gỗ, đá: thay ảnh cũ bằng icon mới (cùng tên texture → mọi chỗ đang dùng tự đổi theo)
  iconTextures() {
    const src = this.textures.get('icons');
    for (const k of ['tool_hoe', 'tool_can', 'tool_axe', 'tool_pickaxe', 'tool_sword', 'tool_rod', 'wood', 'stone']) {
      const f = src.get(k);
      if (!f || f.name === '__BASE') continue;
      if (this.textures.exists(k)) this.textures.remove(k);
      const tex = this.textures.createCanvas(k, 16, 16);
      tex.getContext().drawImage(src.getSourceImage(), f.cutX, f.cutY, 16, 16, 0, 0, 16, 16);
      tex.refresh();
    }
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
