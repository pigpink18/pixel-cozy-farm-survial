// ============================================================
//  NPC sống động: lịch sinh hoạt theo giờ, nhà riêng, thoại theo mức thân thiết, nhờ việc mỗi ngày
// ============================================================
import { ITEMS, NPCS } from './config.js';
import { state } from './state.js';

// Lịch: [giờ bắt đầu, giờ kết thúc, nơi, x, y, bán kính đi lại]
// nơi: 'village' | 'forest' | 'quarry' | 'farm' | 'shop:<id>' | 'house:<id>'
export const SCHEDULE = {
  lan: [[6, 8, 'house:lan', 7, 6, 1], [8, 18, 'shop:store'], [18, 20, 'village', 17, 15, 3], [20, 22, 'house:lan', 7, 6, 1]],
  tu: [[6, 8, 'house:tu', 3, 6, 1], [8, 18, 'shop:carpenter'], [18, 20, 'quarry', 20, 14, 3], [20, 22, 'house:tu', 3, 6, 1]],
  mai: [[6, 8, 'farm', 17, 8, 1], [8, 18, 'shop:ranch'], [18, 20, 'village', 24, 15, 3], [20, 22, 'house:mai', 8, 5, 1]],
  ti: [[6, 9, 'house:ti', 3, 6, 1], [9, 12, 'village', 18, 13, 5], [12, 16, 'forest', 11, 9, 1], [16, 19, 'village', 33, 25, 3], [19, 22, 'house:ti', 3, 6, 1]],
  ba: [[6, 10, 'forest', 34, 23, 0], [10, 17, 'village', 40, 13, 6], [17, 21, 'village', 23, 12, 5], [21, 22, 'house:ti', 8, 6, 1]],
  sau: [[6, 7, 'house:sau', 2, 6, 1], [7, 17, 'quarry', 13, 9, 2], [17, 21, 'village', 27, 14, 4], [21, 22, 'house:sau', 2, 6, 1]],
  nam: [[5, 7, 'house:nam', 3, 6, 1], [7, 12, 'forest', 9, 11, 1], [12, 17, 'village', 43, 21, 1], [17, 20, 'village', 46, 25, 2], [20, 22, 'house:nam', 3, 6, 1]],
  hoa: [[6, 8, 'house:hoa', 8, 5, 1], [8, 11, 'village', 28, 12, 1], [11, 14, 'village', 20, 13, 4], [14, 18, 'village', 32, 12, 1], [18, 22, 'house:hoa', 8, 5, 1]],
  bin: [[7, 9, 'house:hoa', 4, 6, 1], [9, 12, 'village', 22, 14, 4], [12, 15, 'farm', 26, 13, 3], [15, 19, 'village', 38, 24, 2], [19, 22, 'house:hoa', 4, 6, 1]],
};

// Giờ mở cửa nhà dân
export const HOUSE_OPEN = [6, 22];

// Slot đang diễn ra của NPC (null = đang ngủ)
export function slotNow(id, t = state.time) {
  const h = t / 60;
  const s = SCHEDULE[id]?.find(([a, b]) => h >= a && h < b);
  return s ? { from: s[0], to: s[1], map: s[2], x: s[3], y: s[4], r: s[5] ?? 0 } : null;
}

// Nhà trong làng: ảnh (vị trí trong VILLAGE.houses), chủ nhà, kiểu tường/sàn, nội thất [id, x, y, lật]
export const HOUSES = {
  lan: {
    title: 'Nhà Bà Lan', house: 0, owners: ['lan'], wall: 'pink', floor: 'carpet',
    furn: [['bed_pink', 1, 2], ['bookshelf', 9, 2], ['plant_big', 10, 2], ['table_round', 5, 4], ['chair_wood', 4, 4], ['chair_wood', 7, 4, true], ['rug_red', 5, 5], ['vase_pink', 3, 2], ['dresser', 6, 2], ['painting_flower', 4, 1], ['clock', 8, 1], ['window_red', 2, 1]],
  },
  tu: {
    title: 'Nhà Chú Tư', house: 3, owners: ['tu'], wall: 'wood', floor: 'wood_dark',
    furn: [['bed_basic', 1, 2], ['desk', 4, 2], ['wardrobe', 8, 2], ['table_long', 5, 5], ['stool_round', 4, 5], ['stool_round', 7, 5], ['cabinet', 10, 2], ['painting_mountain', 3, 1], ['window_blue', 6, 1], ['wall_shelf', 8, 0], ['rug_long', 4, 6]],
  },
  mai: {
    title: 'Nhà Cô Mai', house: 4, owners: ['mai'], wall: 'green', floor: 'wood',
    furn: [['bed_green', 1, 2], ['sofa_green', 4, 2], ['coffee_table', 4, 4], ['plant_big', 7, 2], ['kitchen_counter', 9, 2], ['sink', 10, 2], ['cactus', 3, 5], ['rug_green', 4, 5], ['painting_farm', 5, 0], ['hanging_plant', 8, 1], ['calendar', 2, 1]],
  },
  ti: {
    title: 'Nhà Anh Ba & Bé Tí', house: 1, owners: ['ti', 'ba'], wall: 'blue', floor: 'tile_blue',
    furn: [['bed_blue', 1, 2], ['bed_basic', 3, 2], ['toy_box', 5, 2], ['aquarium', 7, 2], ['radio', 10, 2], ['table_round', 6, 5], ['armchair_teal', 9, 5], ['rug_check', 2, 5], ['garland', 4, 0], ['window_blue', 8, 1], ['mirror', 2, 1]],
  },
  sau: {
    title: 'Nhà Bác Sáu', house: 5, owners: ['sau'], wall: 'brick', floor: 'stone',
    furn: [['bed_basic', 1, 2], ['fireplace', 5, 2], ['armchair_red', 4, 4], ['cabinet', 9, 2], ['bookshelf', 10, 2], ['table_round', 7, 5], ['floor_lamp', 3, 2], ['rug_long', 4, 6], ['painting_mountain', 8, 1], ['clock', 2, 1]],
  },
  nam: {
    title: 'Nhà Ông Năm', house: 6, owners: ['nam'], wall: 'blue', floor: 'wood',
    furn: [['bed_basic', 1, 2], ['aquarium', 4, 2], ['bookshelf', 9, 2], ['table_round', 6, 5], ['stool_round', 5, 5], ['armchair_teal', 9, 5], ['rug_blue', 5, 6], ['painting_mountain', 3, 1], ['window_blue', 7, 1], ['radio', 10, 2]],
  },
  hoa: {
    title: 'Quán & nhà Chị Hoa', house: 7, owners: ['hoa', 'bin'], wall: 'cream', floor: 'check',
    furn: [['bed_pink', 1, 2], ['kitchen_counter', 5, 2], ['stove', 7, 2], ['sink', 9, 2], ['table_long', 4, 5], ['chair_wood', 3, 5], ['chair_wood', 7, 5, true], ['toy_box', 10, 2], ['plant_big', 10, 5], ['painting_flower', 4, 1], ['hanging_plant', 2, 1]],
  },
};
export const NPC_HOUSE_IN = { w: 12, h: 9, door: { x: 6, y: 8 }, enter: { x: 6, y: 7 } };

// Thoại theo mức thân thiết (số tim 0–1, 2–3, 4–5)
export const LINES = {
  lan: {
    1: ['Cháu mới về làng hả? Có cần hạt giống gì cứ ghé bà.', 'Đất làng mình tốt lắm, chịu khó tưới là cây lên xanh mướt.', 'Bà mở tiệm từ hồi còn con gái đó cháu.'],
    3: ['Hôm qua bà thấy ruộng nhà cháu xanh lắm, giỏi ghê!', 'Bí ngô mùa thu nấu canh là ngon nhất, nhớ trồng nha.', 'Cháu ăn uống đầy đủ chưa? Đừng làm quá sức nghen.'],
    5: ['Có cháu về làng, bà thấy vui hẳn ra.', 'Bà coi cháu như cháu ruột vậy đó. Mệt thì ghé bà nấu cơm cho.', 'Mai mốt bà già rồi, chắc phải nhờ cháu trông tiệm giùm quá!'],
  },
  tu: {
    1: ['Gỗ, đá cần bao nhiêu chú cũng có.', 'Chuồng trại muốn bền thì phải chọn gỗ tốt.', 'Nhà cháu hơi chật đó, muốn nới rộng thì nói chú.'],
    3: ['Chiều chiều chú hay lên Mỏ đá lựa đá đẹp về làm đồ.', 'Cái cuốc chim mà nâng cấp lên sắt thì đập đá ngọt lắm.', 'Chú đang đóng một bộ bàn ghế mới, rảnh ghé coi.'],
    5: ['Chú làm mộc cả đời, giờ mới gặp người chịu khó như cháu.', 'Có món nội thất nào cháu thích, chú bớt giá cho!', 'Hồi trẻ chú cũng mơ có trang trại như của cháu vậy đó.'],
  },
  mai: {
    1: ['Con vật cũng cần được yêu thương.', 'Nhớ cho ăn cỏ khô mỗi ngày nha.', 'Sáng sớm cô hay ghé ngang nông trại cháu coi tụi gà.'],
    3: ['Vuốt ve tụi nó thường xuyên thì trứng sữa ra đều lắm.', 'Gà nhà cháu mập ghê, chắc được cưng lắm hả?', 'Cô đang tính nuôi thêm vịt, cháu thấy sao?'],
    5: ['Tụi bò nhà cô nhận ra giọng cháu luôn đó!', 'Cháu là người nuôi thú giỏi nhất làng rồi.', 'Có gì không biết về chăn nuôi cứ hỏi cô, cô chỉ hết cho.'],
  },
  ti: {
    1: ['Anh chị chơi với em hông?', 'Em thích đi bắt chuồn chuồn!', 'Hôm nay trời đẹp ghê!'],
    3: ['Buổi trưa em hay ra hồ trong rừng ngắm cá đó!', 'Anh Ba hứa dạy em câu cá mà hoài chưa dạy...', 'Anh chị có thấy con bướm vàng nào hông?'],
    5: ['Anh chị là bạn thân nhất của em luôn!', 'Lớn lên em cũng sẽ có nông trại to như của anh chị!', 'Em để dành viên bi đẹp nhất tặng anh chị nè.'],
  },
  ba: {
    1: ['Làng mình yên bình ha.', 'Sáng nào tui cũng ra hồ trong rừng câu cá.', 'Có rảnh ghé bảng nhiệm vụ coi nha.'],
    3: ['Nghe nói nấm cục bán được giá lắm.', 'Cá chép hồ phía nam to lắm, thử câu coi.', 'Thằng Tí em tui nghịch quá trời, có gặp thì trông giùm nha.'],
    5: ['Ông bạn đúng là dân làng chính hiệu rồi!', 'Bữa nào rảnh mình đi câu chung nha, tui chỉ chỗ cá to.', 'Có ông bạn rồi làng mình vui hẳn.'],
  },
  sau: {
    1: ['Mỏ đá này bác đào mấy chục năm rồi.', 'Hốc đá đừng có bán, đem đập ra nhiều khi có ngọc đó.', 'Đá mọc lại mỗi sáng, chăm lên đây là có của ăn của để.'],
    3: ['Hang sâu càng xuống càng lạnh, rồi tới chỗ nóng như lò rèn.', 'Muốn đập quặng vàng phải có cuốc chim sắt nghe chưa.', 'Hồng ngọc nằm sâu dưới hang dung nham, quý lắm.'],
    5: ['Cái nghề đào mỏ này bác truyền lại cho cháu đó!', 'Hồi trẻ bác từng thấy cả một vách pha lê dưới hang sâu...', 'Cháu cứng cỏi lắm, bác tin cháu xuống tận đáy hang được.'],
  },
};

Object.assign(LINES, {
  nam: {
    1: ['Câu cá là phải kiên nhẫn con à.', 'Hồ trong rừng sâu hơn ao làng, cá cũng to hơn.', 'Ông đánh cá ở đây từ hồi làng còn chưa có chợ.'],
    3: ['Mùa thu cá chép béo nhất, nhớ đi câu nghe.', 'Cá trê thích ăn đêm, ra hồ sau 18 giờ thử coi.', 'Câu được cá ngon thì đem bán cho ông, ông trả giá cao.'],
    5: ['Con câu giỏi hơn ông hồi trẻ rồi đó!', 'Ông chỉ con chỗ này: góc hồ phía tây có cá chép vàng.', 'Cần câu của ông, mai mốt ông để lại cho con.'],
  },
  hoa: {
    1: ['Quán chị nấu bằng rau củ của làng mình đó.', 'Ăn no mới có sức làm việc nha em.', 'Buổi trưa chị hay ra quảng trường hóng gió.'],
    3: ['Rau nhà em tươi ghê, nấu canh ngọt lắm.', 'Bé Bin nhà chị hay chạy qua nông trại em chơi, có phiền không?', 'Chị đang nghĩ món mới từ dâu tây đó.'],
    5: ['Em là khách quen số một của quán chị rồi!', 'Muốn học nấu món gì chị chỉ cho, khỏi tốn tiền.', 'Có em, chợ làng vui hơn hẳn.'],
  },
  bin: {
    1: ['Chị Tí... à không, anh Tí chơi đuổi bắt với em nè!', 'Mẹ em nấu ăn ngon nhất làng!', 'Em đếm được 12 con cá trong ao làng đó!'],
    3: ['Buổi trưa em hay chạy qua nông trại coi gà con!', 'Em hái hoa tặng anh chị nè... à quên, em lỡ cầm về rồi.', 'Đài phun nước có đồng xu ai bỏ dưới đáy kìa!'],
    5: ['Anh chị là siêu anh hùng của làng!', 'Lớn lên em sẽ mở quán bán bánh dâu!', 'Em vẽ tặng anh chị một bức tranh nông trại nè.'],
  },
});

// Câu theo nơi đang đứng
export const PLACE_LINES = {
  forest: ['Trong rừng mát quá ha.', 'Suỵt... nhỏ tiếng kẻo cá chạy!'],
  quarry: ['Bụi đá nhiều quá, nhớ che mũi nha.', 'Chiều nào cũng có đá mới lộ ra.'],
  farm: ['Nông trại cháu dạo này đẹp ghê.', 'Sáng sớm ra đồng không khí trong lành quá.'],
  house: ['Vào chơi đi, đừng ngại!', 'Nhà hơi bừa, thông cảm nha.', 'Ngồi chơi uống miếng nước nè.'],
  village: [],
};

// Món NPC hay nhờ mang tới
export const WANTS = {
  lan: ['carrot', 'tomato', 'potato', 'egg', 'strawberry', 'pumpkin'],
  tu: ['wood', 'stone', 'ore_copper', 'bar_copper', 'potato'],
  mai: ['hay', 'carrot', 'milk', 'egg', 'beans'],
  ti: ['flower', 'strawberry', 'egg', 'honey', 'beans'],
  ba: ['fish_chep', 'truffle', 'pumpkin', 'tomato'],
  sau: ['ore_iron', 'geode', 'gem_purple', 'stone', 'bar_iron'],
  nam: ['fish_ro', 'fish_chep', 'fish_loc', 'fish_bong', 'honey'],
  hoa: ['tomato', 'carrot', 'egg', 'milk', 'strawberry', 'beans'],
  bin: ['flower', 'strawberry', 'egg', 'honey'],
};

export const tier = (pts) => (pts >= 40 ? 5 : pts >= 20 ? 3 : 1);
const dayKey = () => `${state.year}-${state.season}-${state.day}`;

// Lời nhờ hôm nay (tạo ngẫu nhiên lúc nói chuyện lần đầu trong ngày)
export function requestToday(id, create = false) {
  state.requests = state.requests || {};
  const r = state.requests[id];
  if (r && r.day === dayKey()) return r.done ? null : r;
  if (!create) return null;
  if (Math.random() > 0.45) {
    state.requests[id] = { day: dayKey(), done: true }; // hôm nay không nhờ gì
    return null;
  }
  const pool = (WANTS[id] || []).filter((x) => ITEMS[x]);
  if (!pool.length) return null;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const v = Math.max(5, ITEMS[item].sell || 5);
  const qty = Math.max(1, Math.min(10, Math.round(60 / v)));
  const reward = Math.round((v * qty * 1.8 + 30) / 5) * 5;
  return (state.requests[id] = { day: dayKey(), item, qty, reward });
}

export const greeting = () => {
  const h = state.time / 60;
  return h < 11 ? 'Chào buổi sáng!' : h < 14 ? 'Trưa rồi, ăn cơm chưa?' : h < 18 ? 'Chiều mát ghê ha.' : 'Tối rồi mà còn đi dạo hả?';
};

export const npcName = (id) => NPCS[id]?.name || id;
