# Giang Hồ: Đại Lộ & Bờ Biển 3D (Tu Tiên Thế Giới Mở)

Trò chơi thế giới mở 3D trên trình duyệt xây dựng bằng **Three.js r160**, đóng gói thành **1 file `index.html` duy nhất** (`~3.6 MB`), hỗ trợ cả **Offline** và **Online 12 người/phòng** qua Socket.IO.

---

## Tính năng hiện có

### 1. Cốt lõi Thế giới mở & Chiến đấu (`src/`)
* **Bản đồ & Đồ họa PBR:** Đại Lộ Chu Tước, Bờ Biển Bồng Lai, cầu tàu, Côn Lôn Tiên Sơn, hoa đào rơi, chu kỳ ngày/đêm & thời tiết.
* **Chiến đấu & Khinh Công:** Thanh Phong Kiếm phóng kiếm khí, 7 ô Bát Quái Binh Khí (`Tab` / `1–7`), Khinh Công đạp không (`Space` ×2–3), Nội Công Tâm Pháp (`V`).
* **Hệ thống Truy nã 5★ cân bằng:** Thang điểm truy nã `0–520` tăng dần theo cấp số (chống dồn điểm ảo); xe chấp pháp truy đuổi từ phía sau/hai bên (`68–98m`), chốt chặn lập xa phía trước (`105–130m`), lính đi bộ sinh trên vỉa hè.
* **Trường Đua Tử Thần (`race_arena.js`):** 4 xe chiến đấu, 7 tay đua (AI 1.1×), 2 bản đồ chướng ngại vật, bình chọn map và cá cược.
* **Chơi mạng Online (`multiplayer.js` + `server/`):** Phòng tối đa 12 người, đồng bộ vị trí/phương tiện, PvP kiếm khí & súng, Truyền Âm chat (`T`), bảo vệ chống gian lận (`anticheat.js`).

### 2. Tính năng mở rộng chủ đề Tu Tiên (nhánh `feat/feature-concat`)
* **Mở rộng Bản đồ & Hạ tầng:** Cầu dây văng vượt biển, Linh Chu Thượng Cổ 62m, Đài Thiên Văn Côn Lôn, Linh Thạch Bảo Khố, 12 dốc Ngự Phong Phi Độ và 3 phân khu mở rộng (*Linh Đan Đỉnh*, *Thanh Vân Đồi*, *Bích Thủy Kênh*) *(đã lược bỏ đường cao tốc trên cao & map cầu cảng để giữ gọn nhẹ)*.
* **Vạn Bảo Đổ Phường & 10 Trò Chơi Đỏ Đen (`casino_world.js`, `casino_games.js`):** Vòng Quay Thiên Mệnh, Tài Xỉu nặn bát 3D, Xóc Đĩa, Roulette, Blackjack, Poker 6 người, Baccarat, Slots Jackpot, Đua điện tử & Quầy VIP.
* **Túy Tiên Lâu (`nightlife_bar.js`):** Quầy 8 loại tiên tửu + hiệu ứng say/ngất xỉu, sàn nhảy nhịp, Bida 8 bi, Phi tiêu & kinh doanh tửu lâu.
* **Phương tiện Mở rộng & Luyện Khí Các (`vehicles_extra.js`, `customs_shops.js`):**
  * *Xích Thố Thần Câu* (mô-tô bốc đầu), *Hắc Phong Thiết Kỵ*, *Thanh Long Siêu Chiến Xa* (cửa cắt kéo), *Huyền Vũ Thiết Giáp* (xe tăng 120mm), *Bích Ba Du Thuyền*, *Lãng Lý Phi Chu*, *Cửu Thiên Thần Ưng* (phi cơ) & góc nhìn buồng lái 1P (`K`).
  * *Luyện Khí Các* (độ xe 3D), *Thần Binh Các* (mua vũ khí + trường bắn bia 45s), *Tiên Y Các* (thời trang) & Gara 6 chỗ.
* **Hoạt động & Đại Kiếp (`heists_activities.js`):** Đại Kiếp Bảo Khố (#4 & #5), 5 giải đua đường phố **ban ngày** kèm mũi tên 3D cỡ lớn & báo hướng rẽ tại khúc cua, lệnh truy nã, sàn giao dịch *Vạn Thương Linh Các* & 40 thành tựu.
* **Đời sống Đô thị & Vật lý môi trường (`npc_life.js`, `world.js`, `map_commercial.js`):**
  * NPC đi bộ bám chuẩn giữa vỉa hè, tự tách khoảng cách chống chồng lấp, bong bóng thoại giao lưu giang hồ; xe AI phanh sớm `22m` & nhường đường ở ngã tư; xe hỏng tự biến mất sau **7 giây**; hitbox **OBB** chính xác chống xuyên xe.
  * **Cột đèn/cột điện** đâm dừng xe & gây thiệt hại; **30 cột bảng chỉ đường** văng bay xoay khi đâm trúng.
  * **Màn hình mờ Nhấp chuột để tiếp tục** chống cướp cò bắn súng khi mới vào game hoặc quay lại từ `Esc` / `Alt+Tab`.
* **Tối ưu hiệu năng PC & Mobile (`perf_core.js`, `engine.js`):** Bảng *Thiên Cơ Đo Hiệu Năng* (`F4`), gỡ chuỗi hậu kỳ nặng (`gfx_ultra`), siết `camera.far`, `PixelRatio`, Shadow Map `512×512` cập nhật 4 frame/lần và render trực tiếp trên Mobile.

---

## Hạn chế hiện tại
* **Đồng bộ Multiplayer:** Các tính năng mở rộng mới ghép (sòng bạc, tửu lâu, xưởng độ, phương tiện mở rộng, đại kiếp, cổ phiếu) hiện chạy cục bộ phía client, chưa đồng bộ trạng thái & tiền thưởng qua máy chủ Socket.IO.
* **Yêu cầu tăng tốc phần cứng trên trình duyệt:** Trên laptop có card rời (như RTX 3050), cần bật *Graphics Acceleration* và chọn *High performance GPU* cho trình duyệt trong Windows Graphics Settings để tránh Windows ép Chrome chạy card onboard (Efficiency Mode).

---

## Cách chạy & Đóng gói
```bash
# Đóng gói lại index.html và server/public/index.html từ src/
node tools/bundle.mjs

# Chạy local (mở bằng server tĩnh)
npx serve .
```
