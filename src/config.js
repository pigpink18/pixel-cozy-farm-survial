// ============================================================
//  Hằng số & dữ liệu game
// ============================================================
export const TILE = 16;
export const ZOOM = 3;
export const PLAYER_SPEED = 48;
export const MAX_ENERGY = 100;
export const WATER_CAP = 20;

// Thời gian: 6:00 → 2:00 sáng hôm sau. Mỗi TICK_MS (ms thật) trôi 10 phút trong game.
export const DAY_START = 6 * 60;
export const DAY_END = 26 * 60;
export const TICK_MS = 6000;
export const DAYS_PER_SEASON = 14;
export const SHOP_OPEN = 8 * 60;
export const SHOP_CLOSE = 18 * 60;

export const COLORS = {
  watered: 0xa07a68,
  dead: 0x9a7048,
  panel: 0x2b2b3a,
  accent: 0xf4b467,
};

// tree = cột cây theo mùa trong nature.png (hàng 18–20)
export const SEASONS = [
  { id: 'spring', name: 'Xuân', ground: 0x44702d, tree: 1, decor: 0xffffff, grassTint: 0xffffff },
  { id: 'summer', name: 'Hạ', ground: 0x44702d, tree: 1, decor: 0xffffff, grassTint: 0xe8f4d8 },
  { id: 'autumn', name: 'Thu', ground: 0x81944a, tree: 3, decor: 0xffc890, grassTint: 0xffd49a },
  { id: 'winter', name: 'Đông', ground: 0xd5d6db, tree: 2, decor: 0xdfe8f5, grassTint: 0xf2f6ff, snow: true },
];

// ---------- Vật phẩm ----------
// tex/frame: ảnh hiển thị. sell: giá bán ở rương (0 = không bán ở rương)
export const ITEMS = {
  carrot: { name: 'Cà rốt', tex: 'fp_crops', frame: 5, sell: 25 },
  potato: { name: 'Khoai tây', tex: 'items', frame: 1, sell: 60 },
  tomato: { name: 'Cà chua', tex: 'fp_crops', frame: 11, sell: 45 },
  strawberry: { name: 'Dâu tây', tex: 'fp_crops', frame: 17, sell: 70 },
  watermelon: { name: 'Dưa hấu', tex: 'fp_crops', frame: 23, sell: 250 },
  beans: { name: 'Đậu que', tex: 'items', frame: 4, sell: 35 },
  pumpkin: { name: 'Bí ngô', tex: 'items', frame: 0, sell: 220 },
  cabbage: { name: 'Bắp cải', tex: 'fp_crops2', frame: 23, sell: 80 },
  corn: { name: 'Bắp', tex: 'fp_crops2', frame: 29, sell: 50 },
  eggplant: { name: 'Cà tím', tex: 'fp_crops2', frame: 35, sell: 60 },
  egg: { name: 'Trứng gà', tex: 'egg', sell: 40 },
  milk: { name: 'Sữa bò', tex: 'items', frame: 10, sell: 90 },
  truffle: { name: 'Nấm cục', tex: 'truffle', sell: 200 },
  wood: { name: 'Gỗ', tex: 'wood', sell: 0 },
  stone: { name: 'Đá', tex: 'stone', sell: 0 },
  hay: { name: 'Cỏ khô', tex: 'hay', sell: 0 },
  // Sản phẩm chế biến (nhà máy kiểu Hay Day) — icon vẽ bằng tools/make_goods.py
  flour: { name: 'Bột', tex: 'fp_goods', frame: 0, sell: 40, good: true },
  feed: { name: 'Thức ăn gia súc', tex: 'fp_goods', frame: 1, sell: 5, good: true },
  bread: { name: 'Bánh mì', tex: 'fp_goods', frame: 2, sell: 150, good: true },
  pie: { name: 'Bánh bí ngô', tex: 'fp_goods', frame: 3, sell: 520, good: true },
  cookie: { name: 'Bánh quy dâu', tex: 'fp_goods', frame: 4, sell: 230, good: true },
  butter: { name: 'Bơ', tex: 'fp_goods', frame: 5, sell: 230, good: true },
  cheese: { name: 'Phô mai', tex: 'fp_goods', frame: 6, sell: 360, good: true },
  cream: { name: 'Kem dâu', tex: 'fp_goods', frame: 7, sell: 220, good: true },
  juice_carrot: { name: 'Nước ép cà rốt', tex: 'fp_goods', frame: 8, sell: 110, good: true },
  juice_tomato: { name: 'Nước ép cà chua', tex: 'fp_goods', frame: 9, sell: 190, good: true },
  juice_melon: { name: 'Nước ép dưa hấu', tex: 'fp_goods', frame: 10, sell: 330, good: true },
  tea_flower: { name: 'Trà hoa', tex: 'fp_goods', frame: 11, sell: 70, good: true },
  storage_chest: { name: 'Rương chứa đồ', tex: 'objects', frame: 'chestStore', sell: 0, place: true, homePlace: true },
  ore_copper: { name: 'Quặng đồng', tex: 'ore_copper', sell: 5 },
  ore_iron: { name: 'Quặng sắt', tex: 'ore_iron', sell: 10 },
  ore_gold: { name: 'Quặng vàng', tex: 'ore_gold', sell: 25 },
  bar_copper: { name: 'Thỏi đồng', tex: 'barcopper', sell: 60 },
  bar_iron: { name: 'Thỏi sắt', tex: 'bariron', sell: 120 },
  bar_gold: { name: 'Thỏi vàng', tex: 'bargold', sell: 250 },
  gem_green: { name: 'Ngọc lục bảo', tex: 'gemgreen', sell: 120 },
  gem_purple: { name: 'Thạch anh tím', tex: 'gempurple', sell: 100 },
  gem_yellow: { name: 'Hoàng ngọc', tex: 'gemyellow', sell: 180 },
  gem_red: { name: 'Hồng ngọc', tex: 'gemred', sell: 250 },
  geode: { name: 'Hốc đá', tex: 'q_geode', sell: 30 },
  geode_ice: { name: 'Hốc băng', tex: 'q_geode_ice', sell: 60 },
  geode_fire: { name: 'Hốc lửa', tex: 'q_geode_fire', sell: 100 },
  // Cá
  fish_ro: { name: 'Cá rô', tex: 'fish_ro', sell: 30, fish: true },
  shrimp: { name: 'Tôm càng', tex: 'food_shrimp', sell: 45, fish: true },
  fish_chep: { name: 'Cá chép', tex: 'fish_chep', sell: 55, fish: true },
  fish_loc: { name: 'Cá lóc', tex: 'fish_loc', sell: 70, fish: true },
  fish_tre: { name: 'Cá trê', tex: 'fish_tre', sell: 85, fish: true },
  fish_bong: { name: 'Cá bống', tex: 'fish_bong', sell: 40, fish: true },
  fish_gold: { name: 'Cá chép vàng', tex: 'fish_gold', sell: 350, fish: true },
  // Đồ hái lượm
  tealeaf: { name: 'Lá trà', tex: 'food_tealeaf', sell: 20 },
  flower: { name: 'Hoa dại', tex: 'items', frame: 12, sell: 15 },
  herb: { name: 'Lá thuốc', tex: 'items', frame: 11, sell: 20 },
  honey: { name: 'Mật ong rừng', tex: 'food_honey', sell: 45, eat: { e: 20, h: 5 } },
  nut: { name: 'Hạt dẻ', tex: 'food_nut2', sell: 25, eat: { e: 10, h: 0 } },
  // Món ăn (nấu ở bếp trong nhà) — eat: hồi sức lực (e) & máu (h)
  dish_noodle: { name: 'Mì rau củ', tex: 'food_noodle', sell: 110, eat: { e: 45, h: 15 } },
  dish_potato: { name: 'Khoai nắm', tex: 'food_onigiri', sell: 140, eat: { e: 35, h: 10 } },
  dish_fishsalad: { name: 'Gỏi cá', tex: 'food_sushi', sell: 160, eat: { e: 50, h: 25 } },
  dish_grill: { name: 'Cá nướng xiên', tex: 'food_yakitori', sell: 180, eat: { e: 60, h: 35 } },
  dish_cake: { name: 'Bánh trứng sữa', tex: 'food_fortunecookie', sell: 200, eat: { e: 60, h: 20 } },
  dish_tea: { name: 'Trà mật ong', tex: 'food_lifepot', sell: 90, eat: { e: 30, h: 40 } },
  dish_soup: { name: 'Súp bí ngô', tex: 'soup', sell: 420, eat: { e: 80, h: 50 } },
  dish_corn: { name: 'Súp bắp', tex: 'props', frame: 'dish_corn', sell: 190, eat: { e: 55, h: 25 } },
  dish_eggplant: { name: 'Cà tím nướng mỡ hành', tex: 'props', frame: 'dish_eggplant', sell: 170, eat: { e: 50, h: 30 } },
  dish_cabbage: { name: 'Bắp cải cuộn thịt', tex: 'props', frame: 'dish_cabbage', sell: 260, eat: { e: 65, h: 35 } },
  // Nội thất (đặt trong nhà)
  f_plant: { name: 'Chậu cây', tex: 'interior', frame: 26, sell: 0, furn: true },
  f_candles: { name: 'Nến thơm', tex: 'interior', frame: 25, sell: 0, furn: true },
  f_rug: { name: 'Thảm đỏ', tex: 'interior', frame: 30, sell: 0, furn: true, flat: true },
  f_chair: { name: 'Ghế tựa', tex: 'interior', frame: 13, sell: 0, furn: true },
  f_pic: { name: 'Tranh phong cảnh', tex: 'interior', frame: 31, sell: 0, furn: true },
  f_painting: { name: 'Tranh bí ngô', tex: 'twfurn', frame: 11, sell: 0, furn: true },
  f_lamp: { name: 'Đèn ngủ', tex: 'twfurn', frame: 12, sell: 0, furn: true },
  f_stool: { name: 'Ghế đẩu', tex: 'twfurn', frame: 10, sell: 0, furn: true },
  f_shelf: { name: 'Tủ gỗ', tex: 'twfurn', frame: 4, sell: 0, furn: true },
  fence: { name: 'Hàng rào', tex: 'fp_fence', frame: 0, sell: 0, place: true },
  sprinkler: { name: 'Bình phun', tex: 'sprinkler', sell: 0, place: true },
  seed_carrot: { name: 'Hạt cà rốt', tex: 'fp_crops', frame: 0, seed: 'carrot' },
  seed_strawberry: { name: 'Hạt dâu tây', tex: 'fp_crops', frame: 12, seed: 'strawberry' },
  seed_watermelon: { name: 'Hạt dưa hấu', tex: 'fp_crops', frame: 18, seed: 'watermelon' },
  seed_potato: { name: 'Hạt khoai tây', tex: 'items', frame: 6, seed: 'potato' },
  seed_tomato: { name: 'Hạt cà chua', tex: 'fp_crops', frame: 6, seed: 'tomato' },
  seed_beans: { name: 'Hạt đậu que', tex: 'items', frame: 9, seed: 'beans' },
  seed_pumpkin: { name: 'Hạt bí ngô', tex: 'items', frame: 5, seed: 'pumpkin' },
  seed_cabbage: { name: 'Hạt bắp cải', tex: 'fp_crops2', frame: 19, seed: 'cabbage' },
  seed_corn: { name: 'Hạt bắp', tex: 'fp_crops2', frame: 25, seed: 'corn' },
  seed_eggplant: { name: 'Hạt cà tím', tex: 'fp_crops2', frame: 31, seed: 'eggplant' },
  // ---------- Tận thế: vũ khí, đạn, vật liệu lục được, đồ sinh tồn (tools/make_survival.py) ----------
  w_bat: { name: 'Gậy đóng đinh', tex: 'surv', frame: 'w_bat', sell: 40, weapon: true },
  w_machete: { name: 'Dao rựa', tex: 'surv', frame: 'w_machete', sell: 120, weapon: true },
  w_pistol: { name: 'Súng lục', tex: 'surv', frame: 'w_pistol', sell: 300, weapon: true },
  w_shotgun: { name: 'Súng săn', tex: 'surv', frame: 'w_shotgun', sell: 700, weapon: true },
  w_rifle: { name: 'Súng trường', tex: 'surv', frame: 'w_rifle', sell: 1500, weapon: true },
  ammo_pistol: { name: 'Đạn súng lục', tex: 'surv', frame: 'ammo_pistol', sell: 4, loot: true },
  ammo_shell: { name: 'Đạn súng săn', tex: 'surv', frame: 'ammo_shell', sell: 8, loot: true },
  ammo_rifle: { name: 'Đạn súng trường', tex: 'surv', frame: 'ammo_rifle', sell: 12, loot: true },
  scrap: { name: 'Sắt vụn', tex: 'surv', frame: 'scrap', sell: 6, loot: true },
  cloth: { name: 'Vải vụn', tex: 'surv', frame: 'cloth', sell: 5, loot: true },
  parts: { name: 'Linh kiện điện tử', tex: 'surv', frame: 'parts', sell: 30, loot: true },
  fuel: { name: 'Can xăng', tex: 'surv', frame: 'fuel', sell: 35, loot: true },
  battery: { name: 'Pin', tex: 'surv', frame: 'battery', sell: 40, loot: true },
  gunpowder: { name: 'Thuốc súng', tex: 'surv', frame: 'gunpowder', sell: 20, loot: true },
  milchip: { name: 'Chip quân sự', tex: 'surv', frame: 'milchip', sell: 250, loot: true },
  bandage: { name: 'Băng gạc', tex: 'surv', frame: 'bandage', sell: 15, loot: true, heal: 25 },
  medkit: { name: 'Bộ sơ cứu', tex: 'surv', frame: 'medkit', sell: 60, loot: true, heal: 70 },
  canned: { name: 'Đồ hộp', tex: 'surv', frame: 'canned', sell: 20, loot: true, eat: { e: 40, h: 5 } },
  water: { name: 'Chai nước sạch', tex: 'surv', frame: 'water', sell: 10, loot: true, eat: { e: 15, h: 5 } },
};

// Nông sản ăn sống được (đỡ đói) — tận thế phải tận dụng mọi thứ
for (const [id, f] of Object.entries({ carrot: 8, tomato: 10, strawberry: 10, potato: 12, beans: 8, cabbage: 15, corn: 14, eggplant: 10, watermelon: 30, pumpkin: 25, egg: 10, milk: 15 }))
  if (ITEMS[id] && !ITEMS[id].eat) ITEMS[id].eat = { e: f, h: 0, raw: true };

export const TOOLS = {
  hoe: { name: 'Cuốc', tex: 'tool_hoe', energy: 2 },
  can: { name: 'Bình tưới', tex: 'tool_can', energy: 1 },
  axe: { name: 'Rìu', tex: 'tool_axe', energy: 3 },
  pickaxe: { name: 'Cuốc chim', tex: 'tool_pickaxe', energy: 3 },
  sword: { name: 'Kiếm', tex: 'tool_sword', energy: 0, unlock: 'hasSword' },
  rod: { name: 'Cần câu', tex: 'tool_rod', energy: 2, unlock: 'hasRod' },
};
export const ROD_PRICE = 150;
export const BAG_START = 24; // số ô túi đồ ban đầu
export const BAG_BIG = 36; // ba lô lớn
export const BAG_PRICE = 1500;
export const CHEST_SLOTS = 36;
export const HOME_CHEST = 'farm:12,7'; // rương có sẵn cạnh nhà
// Cấp công cụ: 1 thường, 2 đồng, 3 sắt, 4 vàng
export const TOOL_TIERS = [
  null,
  { name: 'thường' },
  { name: 'đồng', bar: 'bar_copper', coins: 300 },
  { name: 'sắt', bar: 'bar_iron', coins: 800 },
  { name: 'vàng', bar: 'bar_gold', coins: 2000 },
];
export const TIER_BARS = 5;
// Số ô cuốc/tưới mỗi lần theo cấp
export const AREA_BY_LEVEL = [0, 1, 3, 5, 9];
export const MAX_HP = 100;
export const TOOL_KEYS = Object.keys(TOOLS);

// ---------- Cây trồng ----------
// row: hàng trong plants.png (5 cột: hạt, mầm, nhỏ, lớn, chín). days: số ngày mỗi giai đoạn
// sheet/frames: cây từ Farmer Pack (crops.png 6 cột: hạt, 4 giai đoạn, nông sản); không có sheet = Tiny Wonder
const FP4 = [1, 1, 2, 3, 4];
// Cây lớn theo thời gian thực kiểu Hay Day (grow = phút trong game; 10 phút game ≈ 6 giây thật).
// Cây rẻ chín nhanh – lời ít; cây quý chín chậm – bán giá cao. Tưới nước: lớn nhanh x1.5.
// regrow = phút để ra trái lại sau mỗi lần thu hoạch.
export const CROPS = {
  carrot: { sheet: 'fp_crops', row: 0, frames: FP4, grow: 30, seasons: ['spring', 'autumn'], seedPrice: 10 },
  beans: { sheet: 'fp_crops2', row: 2, frames: [0, 1, 2, 3, 4], grow: 60, seasons: ['summer'], seedPrice: 15, regrow: 40 },
  tomato: { sheet: 'fp_crops', row: 1, frames: FP4, grow: 90, seasons: ['summer'], seedPrice: 20, regrow: 60 },
  potato: { sheet: 'fp_crops2', row: 0, frames: [0, 1, 2, 3, 4], grow: 120, seasons: ['spring'], seedPrice: 25 },
  strawberry: { sheet: 'fp_crops', row: 2, frames: FP4, grow: 180, seasons: ['spring'], seedPrice: 35, regrow: 120 },
  pumpkin: { sheet: 'fp_crops2', row: 1, frames: [0, 1, 2, 3, 4], grow: 480, seasons: ['autumn'], seedPrice: 80 },
  watermelon: { sheet: 'fp_crops', row: 3, frames: FP4, grow: 600, seasons: ['summer'], seedPrice: 100 },
  cabbage: { sheet: 'fp_crops2', row: 3, frames: [0, 1, 2, 3, 4], grow: 240, seasons: ['spring'], seedPrice: 30 },
  corn: { sheet: 'fp_crops2', row: 4, frames: [0, 1, 2, 3, 4], grow: 300, seasons: ['summer', 'autumn'], seedPrice: 40, regrow: 180 },
  eggplant: { sheet: 'fp_crops2', row: 5, frames: [0, 1, 2, 3, 4], grow: 150, seasons: ['autumn'], seedPrice: 25, regrow: 100 },
};
export const WATER_BOOST = 1.5;
export const RIPE_STAGE = 4;
export const REGROW_STAGE = 3;

// ---------- Vật nuôi & chuồng ----------
export const BUILDINGS = {
  coop: { name: 'Chuồng gà', coins: 400, wood: 20, stone: 10, cap: 4 },
  barn: { name: 'Chuồng bò', coins: 800, wood: 40, stone: 20, cap: 4 },
};
export const ANIMALS = {
  chicken: { name: 'Gà', house: 'coop', price: 200, product: 'egg', tex: 'fp_chicken', frame: 0, facesRight: true },
  cow: { name: 'Bò', house: 'barn', price: 600, product: 'milk', tex: 'fp_cow', frame: 0, facesRight: true },
  pig: { name: 'Heo', house: 'barn', price: 900, product: 'truffle', tex: 'fp_pig', frame: 0, facesRight: true },
};
export const ANIMAL_NAMES = ['Mơ', 'Na', 'Bông', 'Mận', 'Bi', 'Nâu', 'Đốm', 'Mít', 'Sữa', 'Kem', 'Tròn', 'Lu'];
export const HAY_PRICE = 10;

// ---------- Chế tạo ----------
export const RECIPES = [
  { id: 'fence', out: 2, cost: { wood: 1 }, desc: 'Rào chắn trang trí, đặt lên cỏ' },
  { id: 'sprinkler', out: 1, cost: { wood: 5, stone: 5 }, desc: 'Tự tưới 8 ô đất xung quanh mỗi sáng' },
  { id: 'storage_chest', out: 1, cost: { wood: 30 }, desc: 'Cất đồ & nông sản — đặt ở nông trại hoặc trong nhà' },
  { id: 'bar_copper', out: 1, cost: { ore_copper: 5, wood: 2 }, desc: 'Nung quặng — dùng nâng cấp công cụ' },
  { id: 'bar_iron', out: 1, cost: { ore_iron: 5, wood: 2 }, desc: 'Nung quặng — dùng nâng cấp công cụ' },
  { id: 'bar_gold', out: 1, cost: { ore_gold: 5, wood: 2 }, desc: 'Nung quặng — dùng nâng cấp công cụ' },
];

// ============================================================
//  Cơ chế kiểu Hay Day
// ============================================================
// Cấp độ nông trại: XP cần để đạt cấp n (n = chỉ số)
export const FARM_LEVELS = [0, 0, 25, 70, 140, 240, 380, 560, 800, 1100, 1500, 2000, 2600];
// Uy tín với dân làng (= cấp nông trại): bán hàng, giao đơn, thu hoạch → lên cấp → mở khoá thêm.
// Cấp cần để mua / xây (nhà máy: xem FACTORIES[].level)
export const UNLOCK_LEVEL = {
  seed_carrot: 1, seed_potato: 1, seed_beans: 1, seed_strawberry: 1,
  seed_tomato: 2, rod: 2, coop: 2, chicken: 2,
  barn: 3, cow: 3, seed_pumpkin: 3,
  seed_watermelon: 4, bag: 4, seed_cabbage: 2, seed_corn: 3, seed_eggplant: 2,
  pig: 5, quarry: 2, deepcave: 4, home2: 3, home3: 6 };
export const XP_PER_COINS = 20; // bán được 20 xu = +1 uy tín
// Kho chứa: sức chứa theo cấp, chi phí nâng cấp lên cấp kế
export const STORES = {
  silo: { name: 'Kho thóc', desc: 'Chứa nông sản (rau củ, trái cây)', caps: [0, 50, 80, 120, 180, 250], upgrade: [null, { coins: 400, wood: 20 }, { coins: 900, wood: 30, stone: 20 }, { coins: 1800, bar_copper: 3, wood: 40 }, { coins: 3500, bar_iron: 3, stone: 40 }] },
  barn: { name: 'Nhà kho', desc: 'Chứa sản phẩm, đồ chế biến, nguyên liệu', caps: [0, 50, 80, 120, 180, 250], upgrade: [null, { coins: 400, stone: 20 }, { coins: 900, wood: 20, stone: 30 }, { coins: 1800, bar_copper: 3, stone: 40 }, { coins: 3500, bar_iron: 3, wood: 40 }] },
};
// Nhà máy: level = cấp nông trại cần, cost = chi phí xây, slots = số món xếp hàng, recipes: out ← cost trong min phút (giờ game)
export const FACTORIES = {
  mill: {
    name: 'Cối xay', tex: 'gr8_mill', level: 2, cost: { coins: 300, wood: 20 }, slots: 3,
    recipes: [
      { out: 'flour', n: 1, cost: { potato: 2 }, min: 60 },
      { out: 'feed', n: 3, cost: { carrot: 1, potato: 1 }, min: 40 },
    ],
  },
  juicer: {
    name: 'Quầy ép nước', tex: 'gr8_juicer', level: 2, cost: { coins: 350, wood: 15, stone: 10 }, slots: 3,
    recipes: [
      { out: 'juice_carrot', n: 1, cost: { carrot: 3 }, min: 40 },
      { out: 'juice_tomato', n: 1, cost: { tomato: 3 }, min: 60 },
      { out: 'juice_melon', n: 1, cost: { watermelon: 1 }, min: 60 },
      { out: 'tea_flower', n: 1, cost: { tealeaf: 1, flower: 1 }, min: 30 },
    ],
  },
  bakery: {
    name: 'Lò bánh', tex: 'gr8_bakery', level: 3, cost: { coins: 800, wood: 30, stone: 20 }, slots: 3,
    recipes: [
      { out: 'bread', n: 1, cost: { flour: 2, egg: 1 }, min: 120 },
      { out: 'cookie', n: 1, cost: { flour: 1, strawberry: 2 }, min: 90 },
      { out: 'pie', n: 1, cost: { flour: 1, pumpkin: 1, egg: 1 }, min: 180 },
    ],
  },
  dairy: {
    name: 'Xưởng sữa', tex: 'gr8_dairy', level: 4, cost: { coins: 1200, wood: 30, stone: 30 }, slots: 3,
    recipes: [
      { out: 'butter', n: 1, cost: { milk: 2 }, min: 90 },
      { out: 'cheese', n: 1, cost: { milk: 3 }, min: 150 },
      { out: 'cream', n: 1, cost: { milk: 1, strawberry: 1 }, min: 90 },
    ],
  },
};
export const STAND_SLOTS = 4;
export const ORDER_COUNT = 6;

// ---------- Nấu ăn ('@fish' = cá bất kỳ) ----------
export const COOKING = [
  { id: 'dish_noodle', cost: { carrot: 1, beans: 1 } },
  { id: 'dish_potato', cost: { potato: 2 } },
  { id: 'dish_fishsalad', cost: { '@fish': 1, tomato: 1 } },
  { id: 'dish_grill', cost: { '@fish': 2 } },
  { id: 'dish_cake', cost: { egg: 1, milk: 1 } },
  { id: 'dish_tea', cost: { tealeaf: 1, honey: 1 } },
  { id: 'dish_soup', cost: { pumpkin: 1, milk: 1 } },
  { id: 'dish_corn', cost: { corn: 2, milk: 1 } },
  { id: 'dish_eggplant', cost: { eggplant: 2 } },
  { id: 'dish_cabbage', cost: { cabbage: 1, egg: 1 } },
];

// ---------- Câu cá ----------
// where: pond (ao nông trại) / lake (hồ trong rừng). diff 1–3: độ khó mini-game. night: chỉ sau 18h
const ALL = ['spring', 'summer', 'autumn', 'winter'];
export const FISH = {
  fish_ro: { where: ['pond', 'lake'], seasons: ALL, diff: 1, weight: 10, tint: 0xb8c070 },
  shrimp: { where: ['pond', 'lake'], seasons: ['spring', 'summer', 'autumn'], diff: 1, weight: 6, rain: true },
  fish_chep: { where: ['lake'], seasons: ['spring', 'autumn'], diff: 2, weight: 6, tint: 0xf0a040 },
  fish_loc: { where: ['lake'], seasons: ['summer', 'autumn'], diff: 2, weight: 5, tint: 0x7a9a6a },
  fish_tre: { where: ['pond', 'lake'], seasons: ['summer', 'autumn'], diff: 2, weight: 5, night: true, tint: 0x7a6a58 },
  fish_bong: { where: ['pond', 'lake'], seasons: ['winter'], diff: 1, weight: 9, tint: 0xa8bcd0 },
  fish_gold: { where: ['lake'], seasons: ALL, diff: 3, weight: 1, tint: 0xffd34d },
};

// ---------- Hái lượm trong rừng ----------
export const FORAGE = {
  spring: ['tealeaf', 'flower', 'herb'],
  summer: ['honey', 'flower', 'herb'],
  autumn: ['nut', 'herb', 'honey'],
  winter: ['nut', 'tealeaf'],
};

// ---------- Hầm mỏ ----------
export const MONSTERS = {
  slime: { name: 'Slime', hp: 8, dmg: 6, speed: 22, minFloor: 1 },
  bat: { name: 'Dơi xanh', hp: 10, dmg: 8, speed: 34, fly: true, minFloor: 4 },
  mole: { name: 'Chuột chũi', hp: 20, dmg: 11, speed: 27, minFloor: 8 },
  skull: { name: 'Đầu lâu', hp: 30, dmg: 15, speed: 32, fly: true, minFloor: 14 },
};
export const MINE_W = 34;
export const MINE_H = 24;

// ---------- NPC ----------
export const NPCS = {
  lan: {
    birthday: { season: 0, day: 9 },
    gifts: { 2: { seed_carrot: 5, seed_potato: 3 }, 4: { dish_soup: 1, f_painting: 1 } },
    name: 'Bà Lan', sheet: 'OldWoman', role: 'store', loves: ['pumpkin', 'tomato'],
    lines: ['Hạt giống mới về đây cháu ơi!', 'Trồng đúng mùa thì cây mới tốt.', 'Bà thích nhất là bí ngô mùa thu.'],
  },
  tu: {
    birthday: { season: 1, day: 4 },
    gifts: { 2: { wood: 15, sprinkler: 1 }, 4: { bar_iron: 3 } },
    name: 'Chú Tư', sheet: 'OldMan', role: 'carpenter', loves: ['potato', 'egg'],
    lines: ['Cần xây gì thì cứ nói chú.', 'Gỗ tốt thì chuồng mới bền.', 'Hồi trẻ chú cũng làm nông như cháu đó.'],
  },
  mai: {
    birthday: { season: 2, day: 12 },
    gifts: { 2: { hay: 10, milk: 1 }, 4: { dish_cake: 2, gem_yellow: 1 } },
    name: 'Cô Mai', sheet: 'Woman', role: 'ranch', loves: ['carrot', 'milk'],
    lines: ['Con vật cũng cần được yêu thương.', 'Nhớ cho ăn cỏ khô mỗi ngày nha.', 'Vuốt ve tụi nó thường xuyên thì tụi nó vui lắm.'],
  },
  ti: {
    birthday: { season: 3, day: 6 },
    gifts: { 2: { flower: 3, honey: 1 }, 4: { gem_purple: 1, f_lamp: 1 } },
    name: 'Bé Tí', sheet: 'Child', role: null, loves: ['egg', 'beans'],
    lines: ['Anh chị chơi với em hông?', 'Em thích đi bắt chuồn chuồn!', 'Hôm nay trời đẹp ghê!'],
  },
  sau: {
    birthday: { season: 3, day: 12 },
    gifts: { 2: { geode: 3, ore_iron: 5 }, 4: { bar_gold: 2, gem_red: 1 } },
    name: 'Bác Sáu', sheet: 'Miner', role: 'miner', loves: ['gem_red', 'dish_grill'],
    lines: ['Mỏ đá này bác đào mấy chục năm rồi.', 'Hốc đá đem đập ra nhiều khi có ngọc đó.', 'Đá mọc lại mỗi sáng.'],
  },
  ba: {
    birthday: { season: 1, day: 11 },
    gifts: { 2: { fish_chep: 1, dish_grill: 1 }, 4: { fish_gold: 1 } },
    name: 'Anh Ba', sheet: 'Villager', role: 'guard', loves: ['truffle', 'pumpkin'],
    lines: ['Làng mình yên bình ha.', 'Nghe nói nấm cục bán được giá lắm.', 'Có rảnh ghé bảng nhiệm vụ coi nha.'],
  },
  nam: {
    birthday: { season: 2, day: 5 },
    gifts: { 2: { fish_loc: 2, dish_grill: 1 }, 4: { fish_gold: 1, gem_green: 1 } },
    name: 'Ông Năm', sheet: 'Villager', role: 'fisher', loves: ['fish_gold', 'dish_tea'],
    lines: ['Câu cá là phải kiên nhẫn con à.', 'Cá chép vàng hiếm lắm, ông câu cả đời được có ba con.', 'Ban đêm cá trê hay ăn mồi lắm.'],
  },
  hoa: {
    birthday: { season: 0, day: 3 },
    gifts: { 2: { dish_cake: 2, dish_tea: 2 }, 4: { dish_soup: 2, f_lamp: 1 } },
    name: 'Chị Hoa', sheet: 'Woman', role: 'cook', loves: ['strawberry', 'milk'],
    lines: ['Quán chị nấu bằng rau củ của làng mình đó.', 'Ăn no mới có sức làm việc nha em.', 'Em có rau ngon thì đem qua chị nấu thử!'],
  },
  bin: {
    birthday: { season: 1, day: 13 },
    gifts: { 2: { flower: 3, strawberry: 2 }, 4: { gem_yellow: 1, f_plant: 1 } },
    name: 'Bé Bin', sheet: 'Child', role: null, loves: ['strawberry', 'flower'],
    lines: ['Chị Tí... à không, anh Tí chơi đuổi bắt với em nè!', 'Mẹ em nấu ăn ngon nhất làng!', 'Em đếm được 12 con cá trong ao làng đó!'],
  },
};
// ---------- Lễ hội (ở làng, 9:00–16:00) ----------
// accept: món được nộp; prize(itemId) → số xu thưởng
export const FESTIVALS = [
  {
    season: 0, day: 13, name: 'Lễ hội Hoa Xuân', host: 'lan', decor: 'flower',
    desc: 'Thi cắm hoa! Nộp 3 Hoa dại cho Bà Lan để nhận thưởng.',
    accept: { flower: 3 }, prize: () => 300,
  },
  {
    season: 1, day: 11, name: 'Hội thi Câu cá', host: 'ba', decor: 'banner',
    desc: 'Mang con cá đẹp nhất tới cho Anh Ba — cá càng quý thưởng càng to.',
    acceptTag: 'fish', prize: (id, ITEMS) => ITEMS[id].sell * 4,
  },
  {
    season: 2, day: 16, name: 'Hội chợ Nông sản', host: 'tu', decor: 'banner',
    desc: 'Nộp 1 nông sản hoặc món ăn cho Chú Tư chấm điểm.',
    acceptTag: 'produce', prize: (id, ITEMS) => Math.max(100, ITEMS[id].sell * 3),
  },
  {
    season: 3, day: 8, name: 'Lễ hội Đèn lồng', host: 'mai', decor: 'lantern',
    desc: 'Cả làng thả đèn lồng. Gặp Cô Mai để nhận quà mùa đông!',
    gift: { hay: 10, dish_tea: 2 }, prize: () => 200,
  },
];

// ---------- Kỹ năng ----------
export const SKILLS = {
  farming: { name: 'Trồng trọt', perk: 'Thêm nông sản khi thu hoạch; cấp 5: cuốc/tưới tốn ít sức hơn' },
  mining: { name: 'Khai khoáng', perk: 'Thêm quặng/đá khi đập; cấp 5: cuốc chim tốn ít sức hơn' },
  foraging: { name: 'Hái lượm', perk: 'Thêm gỗ & đồ hái lượm; cấp 5: rìu tốn ít sức hơn' },
  fishing: { name: 'Câu cá', perk: 'Vùng xanh trong mini-game rộng hơn' },
  combat: { name: 'Chiến đấu', perk: 'Kiếm gây thêm sát thương, máu tối đa cao hơn' },
};
export const XP_LEVELS = [0, 0, 20, 50, 100, 170, 260, 380, 540, 750, 1000]; // XP cần để đạt cấp n
export const TOOL_SKILL = { hoe: 'farming', can: 'farming', axe: 'foraging', pickaxe: 'mining', rod: 'fishing' };

export const SEASON_LINES = {
  spring: 'Mùa xuân rồi, trồng cà rốt với khoai tây đi!',
  summer: 'Hè nóng quá, nhớ tưới cây đầy đủ nha.',
  autumn: 'Mùa thu là mùa bí ngô đó.',
  winter: 'Mùa đông đất đóng băng, lo chăm vật nuôi thôi.',
};

// ---------- Tilemap Tiny Wonder (9 cột) ----------
export const tileFrame = (col, row) => row * 9 + col;

export function soilFrame(u, d, l, r) {
  if (!u && !d) {
    if (!l && !r) return tileFrame(3, 11);
    if (!l) return tileFrame(0, 11);
    if (!r) return tileFrame(2, 11);
    return tileFrame(1, 11);
  }
  if (!l && !r) {
    if (!u) return tileFrame(4, 11);
    if (!d) return tileFrame(4, 13);
    return tileFrame(4, 12);
  }
  const col = !l ? 5 : !r ? 7 : 6;
  const row = !u ? 11 : !d ? 13 : 12;
  return tileFrame(col, row);
}

export function pondFrame(isTop, isBottom, isLeft, isRight) {
  const col = isLeft ? 2 : isRight ? 4 : 3;
  const row = isTop ? 7 : isBottom ? 9 : 8;
  return tileFrame(col, row);
}

// Đường đất (Ninja floor.png, 22 cột): 9-slice tròn ở cột 0–2, hàng 7–9
export function pathFrame(isTop, isBottom, isLeft, isRight) {
  const col = isLeft ? 0 : isRight ? 2 : 1;
  const row = isTop ? 7 : isBottom ? 9 : 8;
  return row * 22 + col;
}

export const GRASS_DECOR = [tileFrame(0, 0), tileFrame(1, 0), tileFrame(0, 1), tileFrame(0, 2), tileFrame(1, 2)];
export const FLOWER_DECOR = tileFrame(1, 1);

// Vùng cắt trong objects.png (Tiny Wonder)
export const OBJECT_FRAMES = {
  house: [0, 96, 96, 95],
  door: [100, 112, 26, 30],
  chest: [16, 66, 16, 15],
  chestStore: [16, 80, 16, 16],
  flowerWhite: [32, 64, 16, 16],
  flowerRed: [48, 64, 16, 16],
  clover: [48, 80, 16, 16],
  rock: [32, 80, 16, 16],
  hay: [64, 64, 32, 32],
};

// Vùng cắt trong Ninja house.png / nature.png
export const NINJA_FRAMES = {
  element: {
    ladderDown: [128, 176, 16, 16],
    ladderUp: [128, 192, 16, 16],
  },
  house: {
    store: [256, 0, 48, 48],
    market: [304, 0, 48, 48],
    homeOrange: [0, 0, 64, 48],
    homeBeige: [64, 0, 64, 48],
    homeSmall: [304, 304, 48, 48],
    barn: [400, 112, 64, 80],
    carpenter: [400, 224, 64, 80],
    coop: [48, 128, 48, 32],
    board: [496, 240, 32, 16],
    banner0: [352, 320, 16, 32],
    banner1: [368, 320, 16, 32],
    banner2: [384, 320, 16, 32],
    banner3: [400, 320, 16, 32],
    banner4: [416, 320, 16, 32],
    banner5: [432, 320, 16, 32],
  },
  nature: {
    tree0: [0, 288, 48, 48],
    tree1: [48, 288, 48, 48],
    tree2: [96, 288, 48, 48],
    tree3: [144, 288, 48, 48],
    stump: [64, 128, 16, 16],
    branch: [192, 176, 16, 16],
    branch2: [192, 192, 16, 16],
    sign: [80, 128, 16, 16],
    cave: [192, 80, 48, 48],
    bush: [16, 160, 16, 16],
    weed: [0, 160, 16, 16],
    weed2: [16, 160, 16, 16],
  },
};
