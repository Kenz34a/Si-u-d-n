# Anime Nexus

Fan game RPG đa vũ trụ anime bằng tiếng Việt, chơi trên trình duyệt máy tính hoặc điện thoại. Đây là bản chơi đơn với đối thủ máy, không cần tài khoản hay khóa API.

## Bản 1.5 — UI và UX RPG pixel

Sảnh chơi có cửa sổ anh hùng, chỉ số và XP, lộ trình ba bước, các cổng hoạt động và nút tiếp tục đúng trận/mini game/lượt sinh tồn đang lưu. Trên điện thoại, thanh điều hướng dưới màn hình mở nhanh sảnh, anh hùng, khu chơi, đội hình và menu đầy đủ. Menu giữ tiêu điểm bàn phím, đóng bằng Escape, khóa nền khi mở và trả lại tiêu điểm khi đóng. Các nút chính có vùng chạm tối thiểu 44px. Trong trận, chỉ dẫn theo ý định đối thủ và lý do kỹ năng khóa giúp lựa chọn hành động; bảng điều khiển vẫn giữ nét pixel và đủ dấu tiếng Việt.

## Bản 1.4 — toàn bộ giao diện pixel

Toàn bộ giao diện dùng chữ pixel **VT323 có đủ bộ dấu tiếng Việt**, biểu tượng bằng ô vuông, khung thẻ và nút có viền nổi, thanh HP/năng lượng chia ô, huy hiệu bậc thang và hiệu ứng chuyển động theo bước. Hoạt động, mini game, xưởng rèn, bảng xếp hạng, cửa hàng và hộp thoại đều dùng cùng phong cách; âm thanh tổng hợp dùng sóng vuông kiểu chiptune. Phông được đóng gói cục bộ, không tải từ Google Fonts khi chơi. Tiến trình đã lưu và các luật chơi được giữ nguyên.

## Bản 1.3 — pixel art

Đồ họa trong game đã chuyển sang pixel art: **32 sprite anh hùng**, **48 sprite đối thủ** (quái thường, tinh anh, trùm), **16 cảnh thế giới** và một cảnh toàn cảnh đa vũ trụ cho Tổng quan. Nhân vật có trang phục, vũ khí và màu sắc theo anime; mỗi loại đối thủ được chọn theo tên trong trận, kể cả chế độ liên chiến trùm.

Ảnh nền trong suốt và cảnh được tạo riêng cho dự án, lưu cùng mã nguồn trong `public/art/pixel/`. Renderer dùng các ô ảnh cố định và phóng bằng `image-rendering: pixelated` để giữ nét pixel. Thẻ trí nhớ, đội hỗ trợ, cửa hàng, cốt truyện và đấu trường đều dùng cùng bộ hình. Đổi đồ họa không làm đổi cơ chế chiến đấu, tài nguyên hoặc tiến trình đã lưu.

Chi tiết bố trí bộ ảnh: [public/art/pixel/README.md](public/art/pixel/README.md). Không cần tạo lại ảnh khi cài đặt hoặc khởi động game.

## Bản mở rộng 1.2 — thêm tám anime

Game hiện có **16 thế giới, 32 anh hùng, 80 chương, 48 trang bị và 112 cấp bậc**. Tám thế giới mới đều có mặt trong đấu trường, cốt truyện, tháp, liên chiến trùm, mini game và bảng xếp hạng:

| Thế giới mới | Anh hùng miễn phí | Anh hùng chiêu mộ |
| --- | --- | --- |
| Solo Leveling | Sung Jinwoo | Cha Hae-In |
| Wistoria: Trượng và Kiếm | Will Serfort | Elfaria Albis Serfort |
| Black Clover | Asta | Yuno Grinberryall |
| Chú thuật hồi chiến (Jujutsu Kaisen) | Yuji Itadori | Satoru Gojo |
| Thất hình đại tội | Meliodas | Escanor |
| Fate/Zero | Artoria Pendragon (Saber) | Gilgamesh |
| Thanh gươm diệt quỷ (Demon Slayer) | Tanjiro Kamado | Nezuko Kamado |
| Fairy Tail | Natsu Dragneel | Erza Scarlet |

Tám anh hùng khởi đầu mới được bổ sung miễn phí vào cả bản lưu cũ. Cấp bậc mỗi thế giới được rút gọn thành 7 mốc cho game, lấy cảm hứng từ anime; không phải mọi thang cấp đều là danh sách chính thức trong truyện. Nhân vật có minh họa pixel, kỹ năng, tuyệt kỹ và hiệu ứng hỗ trợ riêng. Màn hình anh hùng và xưởng rèn có bộ lọc theo thế giới.

Việc nâng cấp giữ nguyên tài nguyên, nhân vật đã chiêu mộ/nâng cấp, trang bị, cấp bậc, chương đã qua, thành tựu đã nhận, trận chiến và mini game đang chơi. Mốc 40 chương giữ nguyên; thêm mốc 80 chương riêng. Thứ tự 16 câu đố cũ được giữ để tiếp tục bản lưu quiz.

## Nhiều cách để chơi

Mở **Hoạt động** trong menu hoặc chọn một trong sáu thẻ trên Tổng quan:

| Hoạt động | Luật chơi riêng |
| --- | --- |
| Biên niên đa vũ trụ | **80 chương**, 5 chương mỗi anime. Chọn +4 ATK hoặc +3 DEF trước trận. Có chương thắng trong 6 lượt, sống sót 6 lượt hoặc hạ địch, không dùng bình hồi phục và đấu trùm. Chương mở tuần tự; thưởng lớn chỉ nhận ở lần hoàn thành đầu. |
| Tháp vô tận | Sinh lực và năng lượng giữ qua từng tầng. Sau chiến thắng chọn +5 ATK, +2 DEF và +15 HP, hoặc hồi 45% HP. Chọn đúng một phước lành trước khi tiến tầng. Thất bại kết thúc lượt leo; giữ thưởng và kỷ lục. |
| Liên chiến trùm | Ba trùm ở ba thế giới liên tiếp, mỗi trận tối đa 8 lượt. Hồi 20% HP giữa trận; hạ trùm cuối nhận 700 vàng, 75 tinh thạch và 5 mảnh chế tạo. |
| Ký ức đa vũ trụ | Lật 12 thẻ, tìm 6 cặp. Hai thẻ sai giữ nguyên để ghi nhớ rồi bấm tiếp tục. Điểm cao hơn khi ít lượt lật. |
| Luyện phản xạ | Chạm mục tiêu đổi vị trí trên lưới trong 20 giây. Chuỗi trúng tăng điểm; bấm sai −5 điểm và mất chuỗi. Thời hạn giữ nguyên khi tải lại trang hoặc chuyển màn hình. |
| Học viện anime | 5 câu ngẫu nhiên từ 32 câu hỏi về 16 anime. Có giải thích sau từng câu; +200 điểm mỗi đáp án đúng. |

Mỗi mini game nhận thưởng tối đa **3 lượt/ngày**, các lượt tiếp theo vẫn ghi điểm kỷ lục. Phản xạ cần ít nhất 5 lần trúng; đố vui cần ít nhất 1 câu đúng. Dừng giữa chừng không nhận thưởng.

Mở **Đội hình & rèn** để chọn tối đa **2 đồng đội hỗ trợ** và chế tạo **48 trang bị** vào 3 ô: vũ khí, giáp, bảo vật. Mỗi anime có các trang bị mang tên riêng; có thể dùng ở mọi thế giới. Đồng đội tăng chỉ số và mở **Liên kích (phím 5)**: 30 năng lượng, gây sát thương, hồi HP và hồi chiêu 3 lượt. Bảo vật hồi thêm 2 HP mỗi lượt.

Mảnh đa vũ trụ đến từ cốt truyện lần đầu, mỗi 3 tầng tháp và chuỗi trùm. Có 2 mảnh khởi đầu. **9 thành tựu vĩnh viễn** thưởng cho cốt truyện, leo tháp, mini game, chế tạo và săn trùm. Đội hình, trang bị được tính khi bắt đầu trận/lượt sinh tồn; thay đổi giữa lượt không làm đổi chỉ số đã chốt.

Bản lưu 1.0 được nâng cấp tự động, giữ nguyên tài nguyên, anh hùng, cấp bậc và trận đang chơi. Cốt truyện, phước lành và mini game đều được lưu, có thể tạm dừng rồi quay lại.

## Chơi game

- **16 thế giới:** Dragon Ball, Naruto, One Piece, Bleach, Tokyo Ghoul, Tensei Slime, Sword Art Online, Overlord và tám anime của bản 1.2 bên trên.
- **32 anh hùng:** 16 nhân vật khởi đầu miễn phí; 16 nhân vật có thể chiêu mộ bằng tinh thạch kiếm trong game.
- **Chiến đấu theo lượt:** tấn công, kỹ năng riêng, phòng thủ, tuyệt kỹ và bình hồi phục. Đối thủ dùng đòn cường hóa mỗi 3 lượt. Ghoul và Slime có tái sinh.
- **3 độ khó:** Thám hiểm, Thử thách, Trùm thế giới. Trùm mở sau 2 chiến thắng tại thế giới tương ứng.
- **Cấp bậc anime:** mỗi thế giới có 7 cấp, mở ở 0 / 120 / 350 / 700 / 1.200 / 2.000 / 3.200 điểm. Điểm từng thế giới độc lập; bảng tổng cộng điểm tất cả thế giới.
- **Nhiệm vụ ngày, nâng cấp anh hùng, cửa hàng và lịch sử trận đấu.** Nâng cấp áp dụng từ trận tiếp theo; mỗi trận hồi đầy sinh lực.
- **Tự động lưu** bằng localStorage, kể cả trận đang diễn ra. Cài đặt hỗ trợ xuất/khôi phục JSON, âm thanh, giảm chuyển động và xóa tiến trình có xác nhận.
- **Bảng xếp hạng mô phỏng:** các NPC có điểm mẫu cố định, điểm người chơi được tính từ trận thật. Không có máy chủ hay PvP trực tuyến.

Phím tắt trong trận: **1** tấn công, **2** kỹ năng, **3** phòng thủ, **4** tuyệt kỹ, **5** liên kích khi có đội hỗ trợ, **H** hồi phục. Tuyệt kỹ cần 100 năng lượng; kỹ năng cần 35 năng lượng và hồi sau 2 lượt. Hồi phục sử dụng một lượt, đối thủ vẫn tấn công.

## Chạy dự án

Yêu cầu Node.js **22.12+** hoặc **24+**, npm. Trong Codex cloud, dùng checkout có sẵn ở `/workspace/Si-u-d-n`; mỗi task đã được cô lập, không cần tạo Git worktree.

```bash
cd /workspace/Si-u-d-n
npm ci --cache /workspace/.cache/npm --no-audit --no-fund
npm run dev -- --port 5173 --strictPort
```

Vite phục vụ game trên cổng 5173. Font và hình pixel được đóng gói cùng ứng dụng; trình duyệt không cần gọi dịch vụ bên ngoài để chơi. Máy chủ phải được khởi động lại trong task mới; tiến trình trình duyệt lưu theo origin (host và cổng).

```bash
npm test        # kiểm tra cơ chế chiến đấu và tiến trình
npm run build  # tạo dist/ để triển khai tĩnh
npm run preview -- --port 4173 --strictPort
```

## Kiểm thử trình duyệt

```bash
npm run test:e2e
```

Playwright tự khởi động Vite trên cổng 5174 và dùng `/usr/bin/chromium` nếu có. Có thể đặt `CHROMIUM_PATH` đến Chromium cài sẵn hoặc cài Chromium của Playwright bằng `npx playwright install chromium` trong môi trường được phép tải browser. Các test chạy độc lập; không ghi đè bản lưu thực tế của người chơi.

## Cấu trúc

| Tệp | Nội dung |
| --- | --- |
| `src/data.js` | Thế giới, cấp bậc, anh hùng, nhiệm vụ, độ khó |
| `src/new-anime.js` | Tám anime mới: thế giới, nhân vật, kỹ năng, hình dạng, truyện, trang bị, hỗ trợ và câu đố |
| `src/game.js` | Luật chiến đấu, phần thưởng, tiến trình, kiểm tra bản lưu |
| `src/content.js` | Chương truyện, trang bị, đồng đội hỗ trợ, câu hỏi, thành tựu |
| `src/expansion.js` | Chế độ cốt truyện, tháp, liên chiến, mini game và nâng cấp bản lưu |
| `src/activities-ui.js` | Giao diện sáu hoạt động, đội hình và xưởng rèn |
| `src/activities.css` | Bố cục và hình minh họa cho bản mở rộng |
| `src/main.js` | Màn hình game, điều hướng, lưu tiến trình và sự kiện |
| `src/art.js` | Điểm xuất các hàm hiển thị hình trong game |
| `src/pixel-art.js` | Ánh xạ 32 nhân vật, 16 thế giới và 48 đối thủ vào bộ ảnh pixel |
| `src/pixel-art.css` | Hiển thị pixel, khung sprite, nền đấu trường và bố cục điện thoại |
| `public/art/pixel/` | Bộ ảnh pixel PNG đã được tạo và đóng gói cùng game |
| `src/style.css` | Giao diện responsive và hiệu ứng |
| `tests/` | Unit test và kiểm thử trình duyệt |

Tên anime/nhân vật thuộc chủ sở hữu tương ứng. Dự án là fan game độc lập, không có liên kết chính thức với các thương hiệu. Font Be Vietnam Pro và Barlow Condensed được phân phối qua Fontsource với giấy phép SIL OFL.
