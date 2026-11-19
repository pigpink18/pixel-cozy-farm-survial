# Ashen Acre — Vườn Tàn Tro

Game mô phỏng nông trại pixel art chạy trên trình duyệt (máy tính và điện thoại màn hình ngang). Làm bằng Phaser 3 + Vite.

## Chạy game

```bash
npm install          # chỉ cần lần đầu
npm run dev          # mở http://localhost:5173
npm run dev -- --host   # chơi thử trên điện thoại cùng Wi‑Fi (mở địa chỉ "Network")
npm run build        # xuất bản vào dist/ (chạy thử: npm run preview)
```

## Điều khiển

- **Điện thoại:** kéo **cần điều khiển** ở góc trái để đi, bấm nút **Làm** ở góc phải để dùng món đang chọn lên ô trước mặt. Hoặc chạm thẳng vào ô/nhân vật để tự đi tới.
- **Chạm / click** vào ô hoặc nhân vật → tự đi tới và làm việc (dùng món đang chọn trên thanh công cụ).
- Máy tính có thêm: WASD/mũi tên + Space · phím 1–9 chọn đồ · I mở Menu (Túi đồ, Kỹ năng, Quan hệ, Lịch) · Esc đóng.
- Thanh công cụ: **Cuốc** (cuốc đất / lấp đất), **Bình tưới** (tưới cây, ra ao lấy nước), **Rìu** (chặt cây, gốc, cành, gỡ hàng rào), **Cuốc chim** (đập đá, gỡ bình phun), hạt giống, vật phẩm đặt được.

## Lối chơi

**Thời gian & mùa**
- Một ngày từ 6:00 đến 2:00 sáng (mặc định khoảng 12 phút chơi thật). Trời tối dần từ 17h.
- Ngủ ở cửa nhà để sang ngày mới. Thức quá 2h sẽ ngất xỉu: mất 10% tiền và chỉ còn nửa năng lượng.
- 4 mùa, mỗi mùa 14 ngày. Cây theo mùa: Xuân (cà rốt, khoai tây), Hạ (cà chua, đậu que, thu hoạch nhiều lần), Thu (bí ngô, cà rốt). Mùa Đông đất đóng băng.
- Đổi mùa thì cây trái mùa bị héo. Trời mưa sẽ tự tưới cây. Mùa đông có tuyết.

**Tài nguyên & chế tạo**
- Nông trại có cây, đá, cành và cỏ dại. Mỗi sáng mọc thêm một ít.
- Gỗ dùng để làm **hàng rào**. Gỗ + đá dùng để làm **bình phun**, tự tưới 8 ô xung quanh mỗi sáng. Chế tạo trong **Túi đồ**.
- Nhổ cỏ dại có thể được cỏ khô.

**Vật nuôi**
- Gặp **Chú Frank** (xưởng mộc) để xây Chuồng gà hoặc Chuồng bò. Chuồng xây xong vào sáng hôm sau.
- Gặp **Cô Emily** (trại chăn nuôi) để mua gà, bò, heo và cỏ khô.
- Bấm vào máng cỏ để cho ăn, bấm vào con vật để vuốt ve hoặc nhặt trứng, sữa, nấm cục.

**Làng & NPC**
- Đi về phía đông nông trại để sang làng. Cửa hàng mở từ 8:00 đến 18:00.
- **Bà Martha** bán hạt giống, cần câu và nội thất. **Chú Frank** xây chuồng, nâng cấp công cụ, bán gỗ và đá. **Cô Emily** bán vật nuôi và cỏ khô.
- Trò chuyện mỗi ngày và tặng quà để tăng tình cảm (♥). Đạt 2♥ hoặc 4♥ thì NPC tặng quà. **Sinh nhật** NPC: quà được tình cảm gấp 3.
- **Bảng nhiệm vụ** cạnh lối vào làng: nhận việc giao hàng để lấy thưởng.
- **4 lễ hội** (xem tab Lịch): Hoa Xuân (Xuân 13), Thi câu cá (Hạ 11), Hội chợ nông sản (Thu 16), Đèn lồng (Đông 8). Lễ hội diễn ra từ 9:00 đến 16:00 ở quảng trường. Nói chuyện với người chủ trì để tham gia.

**Kiểu Hay Day (trên nông trại)**
- **Vuốt để làm hàng loạt:** chạm vào luống trong tầm 4 ô quanh nông dân rồi kéo ngón tay → thu hoạch / gieo hạt / tưới / cuốc mọi ô đi qua (không cần đi tới).
- **Cấp độ nông trại** (huy hiệu dưới chân dung): thu hoạch, chế biến, giao đơn → XP. Lên cấp mở khoá nhà máy: Cối xay & Quầy ép nước (cấp 2), Lò bánh (cấp 3), Xưởng sữa (cấp 4).
- **Kho thóc** (nông sản) & **Nhà kho** (sản phẩm, đồ chế biến, nguyên liệu): giới hạn số món, nâng cấp bằng xu + gỗ/đá/thỏi kim loại. Nhà máy, đơn hàng, sạp bán lấy nguyên liệu thẳng từ túi + 2 kho.
- **Nhà máy chế biến** (xây ở biển báo trên nông trại): xếp tối đa 3 món, chạy theo giờ game (qua đêm vẫn chạy). Bong bóng sản phẩm hiện trên mái khi xong.
- **Bảng đơn hàng** cạnh nhà: 6 đơn cùng lúc, giao để nhận xu + XP; bỏ đơn thì 1 giờ sau có đơn mới. Dấu "!" khi có đơn giao được.
- **Sạp bán ven đường** gần lối ra làng: bày tối đa 10 món/ô, tự đặt giá; khách ghé mua dần từ 7h–20h, giá càng rẻ bán càng nhanh.
- Vật nuôi ăn **cỏ khô** hoặc **thức ăn gia súc** (làm ở Cối xay).

**Rừng, hầm mỏ & chiến đấu** (đi xuống phía nam nông trại)
- Rừng có hồ để câu cá và đồ hái lượm mọc mới mỗi ngày theo mùa.
- **Hầm mỏ**: đập đá lấy đá, quặng đồng/sắt/vàng và đá quý. Cầu thang xuống tầng dưới giấu dưới một hòn đá. Thang máy dừng mỗi 5 tầng.
- Quái vật (slime, dơi, chuột chũi, đầu lâu) mạnh dần theo độ sâu. Dùng **kiếm** (nhặt được lần đầu vào hầm). Hết máu sẽ ngất và mất ít tiền.
- Nung 5 quặng + 2 gỗ thành thỏi (trong Menu → Chế tạo). Mang thỏi tới Chú Frank để **nâng cấp công cụ**: đồng → sắt → vàng. Cuốc và tưới được nhiều ô hơn, chặt và đập mạnh hơn, kiếm đau hơn.

**Câu cá**
- Mua cần câu ở tiệm Bà Martha, chọn cần câu rồi chạm vào mặt nước (quăng xa tối đa 3 ô).
- Chờ dấu **!** thì chạm ngay, rồi chạm khi kim trắng nằm trong vùng xanh. Có 7 loại cá theo mùa, giờ và thời tiết.

**Nhà & nấu ăn**
- Bấm cửa để vào nhà. Ngủ trên giường. Nấu ăn ở bếp (7 món). Chọn món ăn trên thanh công cụ rồi chạm để ăn, hồi sức lực và máu.
- Mua nội thất ở tiệm Bà Martha, chọn trên thanh công cụ rồi đặt trong nhà. Bấm vào đồ đã đặt để cất lại.

**Kỹ năng** (Menu → Kỹ năng): Trồng trọt, Khai khoáng, Hái lượm, Câu cá, Chiến đấu, mỗi kỹ năng 10 cấp. Cấp càng cao càng có cơ hội được thêm sản phẩm. Từ cấp 5, công cụ tương ứng tốn ít sức hơn.

## Sửa bản đồ (thiết kế tay)

Các bản đồ được bố trí bằng toạ độ ô (1 ô = 16px), sửa trực tiếp rồi tải lại trang:

| Bản đồ | File | Mục cần sửa |
|---|---|---|
| Nông trại | `src/farmLayout.js` | `FARM.paths` (đường đất), `FARM.field` (ruộng có rào + cổng), `coop/barn.fence` (rào chuồng), `FARM.flowerBeds`, `FARM.forestBands` (dải rừng), `inWild` (vùng mọc cây chặt được) |
| Làng | `src/scenes/WorldScene.js` → `VILLAGE` | `roads`, `houses`, `flowerBeds`, `trees`, `groves`, `plaza` |
| Rừng | `src/maps/forest.js` → `FOREST` | `trails` (lối mòn), `meadows` (bãi hoa), `lake/lake2`, `cave` |

Toạ độ dạng `[x0, y0, x1, y1]` = hình chữ nhật từ ô (x0, y0) tới ô (x1, y1).

## Giao diện

Giao diện kiểu Stardew (khung gỗ, nền giấy, nút gỗ) được vẽ bằng code trong `src/ui/theme.js`. Màu ở biến `C`. Font pixel **VT323** hỗ trợ đầy đủ tiếng Việt (`public/fonts/`, giấy phép OFL).

## Chỉnh nhanh (src/config.js)

| Hằng số | Ý nghĩa |
|---|---|
| `PLAYER_SPEED` | Tốc độ đi (hiện 48) |
| `TICK_MS` | Số ms thật cho mỗi 10 phút trong game (6000 → 1 ngày ≈ 12 phút) |
| `DAYS_PER_SEASON` | Số ngày mỗi mùa |
| `CROPS`, `ITEMS`, `ANIMALS`, `BUILDINGS`, `RECIPES`, `NPCS` | Dữ liệu cây, giá, vật nuôi, công thức, NPC |

## Cấu trúc

```
src/config.js            hằng số + dữ liệu game
src/state.js             trạng thái, lưu/tải (localStorage), tiện ích
src/farmLayout.js        bố cục nông trại, sinh cây/đá/cỏ
src/day.js               xử lý sang ngày mới (cây lớn, vật nuôi, mùa, thời tiết, nhiệm vụ)
src/shops.js             cửa hàng, chế tạo, hội thoại NPC, nhiệm vụ, tặng quà
src/maps/forest.js       khu rừng (hồ, hái lượm, lối vào hầm)
src/maps/mine.js         hầm mỏ sinh ngẫu nhiên mỗi tầng
src/maps/home.js         bên trong nhà (giường, bếp, nội thất)
src/combat.js            quái vật & vung kiếm
src/fishing.js           câu cá + mini-game
src/skills.js            kỹ năng & lợi ích theo cấp
src/festivals.js         lễ hội, sinh nhật, sự kiện tình cảm, thư
src/scenes/BootScene.js  tải asset, tạo animation
src/scenes/WorldScene.js bản đồ nông trại & làng, nhân vật, tìm đường, hành động
src/scenes/UIScene.js    HUD, đồng hồ, thanh công cụ, cần điều khiển, hộp thoại, túi đồ
src/lofi.js              bộ tạo nhạc lofi
```

## Asset & bản quyền

| Thư mục | Nguồn | Giấy phép |
|---|---|---|
| `public/assets/fp/` | **Farmer Pack v1.0** — Pyong Hoo (nông dân, cỏ, đất, nước, cà rốt/cà chua/dâu/dưa hấu, gà/heo/bò) | Dùng **thương mại** được, ghi công không bắt buộc. Không bán lại riêng file asset. |
| `public/assets/ninja/`, `public/assets/audio/sfx/` | Ninja Adventure | **CC0** (tự do) |
| `public/assets/tiny-wonder/` | Tiny Wonder Farm (bản free) — nhà, rương, đá, khoai tây/bí ngô/đậu, nội thất | Bản free **chỉ phi thương mại** — cần mua bản trả phí hoặc thay thế trước khi bán/quảng cáo thương mại |
| `public/assets/interior/` | "interior free" | Kiểm tra giấy phép gốc trước khi dùng thương mại |
| `public/assets/hero/`, `public/assets/pc/`, `public/assets/crops/`, sàn & tường trong `public/assets/furn/` | **Pixel Crawler — Free Pack** (Anokolisa): nhân vật chính + động tác, cỏ/đất/đá lát/nước, cây theo mùa, cỏ dại, đá, cành, bàn chế tạo, sàn & tường trong nhà, cà rốt/bắp cải | Dùng **thương mại** được, không cần ghi công; không bán lại asset. Tạo bằng `tools/make_hero.py`, `make_terrain_pc.py`, `make_nature_pc.py`, `make_buildings_pc.py`, `patch_furn_pc.py`, `make_crops_pack.py` (cần thư mục gốc `Pixel Crawler - Free Pack/` ở gốc dự án) |
| `public/assets/zombie/zom_*.png` | **PostApocalypse Asset Pack v1.1.2** — TheLazyStone: zombie thường / nhỏ / to béo / cầm rìu (đi, đứng, vồ cắn, ngã) | Miễn phí **phi thương mại**; dùng thương mại phải mua (≥ 2 USD); không phát lại nguyên bộ. Tạo bằng `tools/make_zombies_pa.py` (cần thư mục `PostApocalypse_AssetPack_v1.1.2/` ở gốc dự án) |
| `public/assets/fp/npc_*.png` | Dân làng dựng từ thân người Pixel Crawler (như nhân vật chính) | Như Pixel Crawler. Tạo bằng `tools/make_npcs_pc.py` |
| `public/assets/crops/`, `public/assets/pc/house.png`, `chest.png` | **Farm RPG FREE 16x16 — Tiny Asset Pack**: dâu tây, khoai tây (+ gói hạt), nhà nông trại, rương | Bản free — kiểm tra điều khoản trang tải trước khi bán thương mại. Tool tự giải nén file `.rar` ở gốc dự án |
| `public/fonts/VT323-Regular.ttf` | VT323 (Google Fonts), đã vá móc chữ Ơ/Ư cho rõ (`tools/patch_font_horn.py`, bản gốc ở `tools/fonts/`) | SIL Open Font License — dùng thương mại được, được sửa (không có tên bảo lưu) |

Mọi asset (trừ Farmer Pack) đã được **chuyển sang bảng màu của Farmer Pack** để đồng bộ phong cách:

```bash
python3 tools/build_farmer_pack.py <thư mục Farmer-Pack-v1.0>   # đóng gói sprite sheet vào public/assets/fp
python3 tools/palettize.py public/assets/ninja public/assets/tiny-wonder public/assets/interior   # đồng bộ màu
python3 tools/brighten.py public/assets/fp public/assets/ninja public/assets/tiny-wonder public/assets/interior   # làm màu tươi sáng
```

Cây, bụi, gốc cây, đất cuốc và cây trồng khoai tây/bí ngô/đậu que được **vẽ bằng code** theo đúng bảng màu Farmer Pack:

```bash
python3 tools/make_trees.py   # cây 3 kiểu × 4 mùa, bụi, gốc cây → public/assets/fp/trees.png, bushes.png
python3 tools/make_soil.py    # ụ đất cuốc (khô / ướt) → public/assets/fp/soil.png
python3 tools/make_crops.py   # khoai tây, bí ngô, đậu que → public/assets/fp/crops2.png
python3 tools/make_fences.py  # hàng rào gỗ (ngang, dọc, cột, đầu rào) → public/assets/fp/fences.png
python3 tools/make_goods.py   # icon 12 sản phẩm chế biến → public/assets/fp/goods.png
python3 tools/make_buildings.py ../farm/Gr8FarmPack && python3 tools/brighten.py public/assets/gr8   # kho, nhà máy, sạp
```

Hiệu ứng (bóng đổ, cây đung đưa, bướm, cánh hoa, lá rơi, đom đóm, màu trời theo giờ, đèn cửa sổ, nước lấp lánh, bụi chân) nằm trong `src/fx.js`. Màu trời từng giờ chỉnh ở bảng `SKY`.

Muốn chỉnh độ tươi/sáng: sửa các hằng số đầu file `tools/brighten.py` (LIFT, SAT, GREEN_*, BLUE_*), chạy lại cả 3 bước trên từ file gốc.

File gốc: `GAME/farm/Farmer-Pack-v1.0.zip`. Nhạc nền lofi được tạo bằng code (`src/lofi.js`).
