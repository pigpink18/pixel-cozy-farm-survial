// ============================================================
//  Nhiệm vụ chính "Giành lại vùng đất": nối trồng trọt – lục đồ – chế tạo – xây căn cứ –
//  đánh zombie – đổi hàng – nhờ dân làng xây – giải phóng vùng thành một hành trình.
//  Mỗi bước có gợi ý đi đâu, làm gì; xong thì nhận thưởng & thư của người giao.
// ============================================================
import { ITEMS } from './config.js';
import { state, bus, changed, sfx, addItem } from './state.js';
import { have } from './hayday.js';

const st = () => state.stats || {};
const base = (id) => state.base?.[id] || 0;
const zoneFree = (id) => (state.zones?.[id]?.infection ?? 100) <= 0;
const nestsDown = (id) => Object.keys(state.zones?.[id]?.nests || {}).length;
const looted = () => Object.keys(state.looted || {}).length;

// cur(): tiến độ hiện tại, goal: đích. from: người giao (khuôn mặt + tên trong thư)
export const QUESTS = [
  // --- Mở đầu (ván mới) ---
  {
    title: 'Nghỉ một đêm ở căn nhà mới', from: 'nam', goal: 1, cur: () => (state.day > 1 || state.season > 0 || state.year > 1 ? 1 : 0),
    hint: 'Căn nhà cũ Ông Walter cho ở nằm trên nông trại phía tây trại. Vào nhà, bấm vào giường để ngủ. Mái hơi dột nhưng vẫn ngủ được.',
    reward: { canned: 2, water: 2 }, done: 'Ngủ ngon chứ cháu? Sáng nay ta mang đồ nghề qua cho.',
  },
  {
    title: 'Nhận đồ nghề từ trưởng làng', from: 'nam', goal: 1, cur: () => (state.gotTools ? 1 : 0),
    hint: 'Ông Walter đang đợi ngay trước cửa nhà — bước ra ngoài là gặp.',
    reward: { seed_carrot: 4, seed_potato: 2 }, done: 'Đất có sẵn, đồ nghề có rồi. Cuốc đất, gieo hạt, tưới nước — cứ thế mà sống.',
  },
  {
    title: 'Vá mái nhà dột', from: 'nam', goal: 1, cur: () => (state.roofFixed ? 1 : 0),
    hint: 'Cầm Rìu chặt cây quanh nông trại lấy 10 gỗ, rồi vào nhà bấm vào chỗ nước dột để vá.',
    reward: { bandage: 2, seed_strawberry: 2 }, done: 'Mái lành rồi! Mưa gió gì cũng yên tâm ngủ.',
  },
  // --- Chuỗi chính ---
  {
    title: 'Dựng bàn chế tạo', from: 'tu', panel: 'base', goal: 1, cur: () => base('bench'),
    hint: 'Bàn chế tạo ở cạnh nhà. Cần 20 gỗ (chặt cây bằng rìu) + 5 sắt vụn (lục thùng, xe trong Rừng hoang).',
    reward: { bandage: 3, scrap: 5 }, done: 'Tốt lắm! Có bàn rồi thì chế gì cũng được. Chú gửi thêm ít đồ.',
  },
  {
    title: 'Trồng & thu hoạch 10 nông sản', from: 'lan', goal: 10, cur: () => st().crops || 0,
    hint: 'Cuốc đất, gieo hạt, tưới nước mỗi ngày. Hạt giống mua ở tiệm Bà Martha trong trại.',
    reward: { seed_corn: 5, canned: 2 }, done: 'Có rau ăn là sống được rồi cháu. Bà gửi thêm hạt ngô.',
  },
  {
    title: 'Lục đồ ở 6 chỗ', from: 'ba', goal: 6, cur: looted,
    hint: 'Vào Rừng hoang (đi xuống phía nam nông trại): lục ba lô, lều, xe hỏng. Đứng gần rồi bấm Làm.',
    reward: { ammo_pistol: 8, water: 2 }, done: 'Biết lục đồ là biết sống. Cầm ít đạn phòng thân.',
  },
  {
    title: 'Hạ 10 zombie', from: 'ba', goal: 10, cur: () => st().zombies || 0,
    hint: 'Cầm gậy (hoặc súng) rồi bấm Làm — tự nhắm con gần nhất. Ban đêm zombie nhanh hơn!',
    reward: { medkit: 1, gunpowder: 2 }, done: 'Ra dáng chiến binh rồi đó!',
  },
  {
    title: 'Xây hàng rào phòng thủ', from: 'tu', panel: 'base', goal: 1, cur: () => base('fence'),
    hint: 'Đến Bàn chế tạo cạnh nhà, bấm Làm → dòng "Hàng rào phòng thủ" → Xây (40 gỗ + 10 sắt vụn). Không phải món "Rào gỗ trang trí" trong túi đồ! Xây xong, 3 cổng nông trại tự có bao cát chắn: zombie đêm phải phá cổng mới vào được.',
    reward: { scrap: 10, wood: 15 }, done: 'Rào chắc rồi, đêm ngủ yên hơn hẳn.',
  },
  {
    title: 'Đổi hàng với Anh Jack', from: 'ba', goal: 1, cur: () => st().trades || 0,
    hint: 'Anh Jack gác cổng trại: nói chuyện → "Đổi hàng". Đổi nông sản dư lấy đạn, vải, linh kiện.',
    reward: { parts: 2 }, done: 'Có qua có lại. Mai anh có mối hàng mới.',
  },
  {
    title: 'Phá ổ zombie trong Rừng hoang', from: 'ba', goal: 1, cur: () => nestsDown('forest'),
    hint: 'Ổ zombie là đống thịt nhầy trong Rừng hoang, cứ ~14 giây đẻ zombie. Đánh liên tục tới khi vỡ.',
    reward: { ammo_shell: 6, medkit: 1 }, done: 'Rừng bớt nguy hiểm rồi. Dọn nốt zombie là giải phóng được!',
  },
  {
    title: 'Nhờ Chú Frank dựng Cối xay gió', from: 'tu', goal: 1, cur: () => (state.factories?.mill ? 1 : 0),
    hint: 'Mang 10 sắt vụn + 2 linh kiện + 15 gỗ tới Xưởng mộc của Chú Frank trong trại. Cối xay làm bột & thức ăn gia súc.',
    reward: { wood: 20, scrap: 5 }, done: 'Cối xay quay rồi! Có bột làm bánh, có cám cho gà.',
  },
  {
    title: 'Giải phóng Rừng hoang', from: 'ba', goal: 1, cur: () => (zoneFree('forest') ? 1 : 0),
    hint: 'Hạ zombie & phá ổ cho tới khi độ nhiễm về 0%. Vùng giải phóng: ban ngày yên bình, lục được nhiều đồ hơn.',
    reward: { w_machete: 1, battery: 2 }, done: 'Cả trại reo hò! Rừng hoang đã sạch bóng zombie ban ngày.',
  },
  {
    title: 'Chế súng lục', from: 'tu', panel: 'craft', goal: 1, cur: () => (have('w_pistol') > 0 ? 1 : 0),
    hint: 'Nâng Bàn chế tạo lên cấp 2, rồi chế súng lục (25 sắt vụn, 4 linh kiện, 2 thuốc súng). Thuốc súng có trong thùng phuy, hòm thợ săn.',
    reward: { ammo_pistol: 16 }, done: 'Có súng thì vào thị trấn đỡ lo hơn nhiều.',
  },
  {
    title: 'Lục đồ trong 3 căn nhà ở Thị trấn', from: 'hoa', goal: 3, cur: () => new Set(Object.keys(state.looted || {}).filter((k) => k.startsWith('ruin')).map((k) => k.split(':')[0])).size,
    hint: 'Thị trấn bỏ hoang ở phía nam trại. Vào nhà qua cửa chính, lục tủ lạnh, tủ bếp, kệ hàng... coi chừng zombie trong nhà.',
    reward: { canned: 4, cloth: 6 }, done: 'Đồ hộp này đủ cho cả trại mấy bữa. Cảm ơn cháu!',
  },
  {
    title: 'Xuống tầng 5 hầm quân sự', from: 'sau', goal: 5, cur: () => state.mineDeepest || 0,
    hint: 'Cửa hầm thép trong Rừng hoang. Đập đống bê tông vỡ để tìm cầu thang xuống. Tủ sắt & hòm quân dụng có đạn, chip quân sự.',
    reward: { milchip: 1, ammo_rifle: 6 }, done: 'Chip quân sự đó! Thứ này dùng nâng cấp công trình xịn.',
  },
  {
    title: 'Giải phóng Thị trấn bỏ hoang', from: 'ba', goal: 1, cur: () => (zoneFree('town') ? 1 : 0),
    hint: 'Phá 3 ổ zombie trong thị trấn và hạ zombie tới khi độ nhiễm về 0%. Nên mang súng & bộ sơ cứu.',
    reward: { milchip: 1, medkit: 2 }, done: 'Thị trấn đã là của chúng ta! Giờ có thể dọn về dần rồi.',
  },
  {
    title: 'Máy phát điện cấp 3 — bắt sóng radio', from: 'tu', panel: 'base', goal: 3, cur: () => base('generator'),
    hint: 'Nâng Máy phát điện lên cấp 3 ở Bàn chế tạo (cần chip quân sự). Radio sẽ bắt được tín hiệu từ khu quân sự...',
    reward: { milchip: 1 }, done: 'Rè rè... "...còn ai sống sót... căn cứ quân sự phía đông, theo quốc lộ..." Có người ngoài kia!',
  },
  {
    title: 'Tìm tới Căn cứ quân sự', from: 'ba', goal: 1, cur: () => (state.baseVisited ? 1 : 0),
    hint: 'Trong Rừng hoang đi theo đường mòn ra quốc lộ ở mép đông, gần trạm xăng có biển "Căn cứ quân sự →".',
    reward: { ammo_rifle: 10, medkit: 1 }, done: 'Căn cứ còn nguyên rào kẽm gai... nhưng toàn zombie mặc quân phục. Cẩn thận đó!',
  },
  {
    title: 'Giải phóng Căn cứ quân sự', from: 'ba', goal: 1, cur: () => (zoneFree('base') ? 1 : 0),
    hint: 'Phá 3 ổ zombie trong căn cứ và hạ zombie lính tới khi độ nhiễm về 0%. Container doanh trại & hòm quân dụng có súng, đạn.',
    reward: { milchip: 2, w_rifle: 1 }, done: 'Căn cứ là của chúng ta! Với chỗ vũ khí này, cả trại sẽ an toàn hơn nhiều.',
  },
];

// Tiến độ nhiệm vụ chính lưu ở state.mainQuest (state.quest là nhiệm vụ giao hàng của dân làng)
// Bản trước lỡ lưu chung vào state.quest → tách ra lại, không mất tiến trình
export function ensureMainQuest() {
  if (typeof state.quest === 'number') {
    state.mainQuest = state.quest;
    state.quest = null;
  } else if (state.quest != null && (typeof state.quest !== 'object' || !state.quest.npc)) state.quest = null;
  if (typeof state.mainQuest !== 'number' || !(state.mainQuest >= 0)) state.mainQuest = 0;
}
export const questIdx = () => state.mainQuest || 0;
export const questNow = () => QUESTS[questIdx()] || null;
export const questProgress = (q) => Math.min(q.goal, q.cur());

// Gọi khi trạng thái game thay đổi: xong bước hiện tại → thưởng, thư, sang bước kế
export function checkQuest() {
  const q = questNow();
  if (!q || q.cur() < q.goal) return false;
  for (const [id, n] of Object.entries(q.reward)) addItem(id, n, true);
  const gifts = Object.entries(q.reward).map(([id, n]) => `${n} ${ITEMS[id]?.name || id}`).join(', ');
  state.mainQuest = questIdx() + 1;
  state.mail = [...(state.mail || []), { from: q.from, text: `${q.done}\nThưởng: ${gifts}.` }];
  sfx('fanfare', 0.55);
  bus.emit('questDone', `Xong nhiệm vụ: ${q.title}! Thưởng: ${gifts}`);
  changed();
  return true;
}
