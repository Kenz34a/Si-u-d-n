import { WORLDS } from './data.js';
import { NEW_WORLDS } from './new-anime.js';

const sagas = {
  'dragon-ball': ['Tín hiệu từ Namek', 'Cuộc truy đuổi Ngọc Rồng', 'Phòng tuyến cuối cùng', 'Niềm kiêu hãnh Saiyan', 'Trận quyết chiến Frieza'],
  naruto: ['Lời nhắn ở cổng Làng Lá', 'Truy dấu trong rừng', 'Bảo vệ đội vận chuyển', 'Nhẫn đạo không lùi bước', 'Bóng tối của Madara'],
  'one-piece': ['Tấm bản đồ Grand Line', 'Chạy đua tới hòn đảo', 'Giữ vững con tàu', 'Lời hứa của thuyền trưởng', 'Đối mặt Kaido'],
  bleach: ['Tiếng gọi từ Soul Society', 'Vượt qua cổng linh hồn', 'Bảo vệ những linh hồn', 'Kiếm và ý chí', 'Ảo ảnh của Aizen'],
  'tokyo-ghoul': ['Lá thư ở Anteiku', 'Truy đuổi giữa Tokyo', 'Bảo vệ Quận 20', 'Sau chiếc mặt nạ', 'Đối diện Arima'],
  slime: ['Một vị khách ở Tempest', 'Thông điệp khẩn cấp', 'Phòng tuyến Goblin', 'Lời thề của liên bang', 'Kế hoạch của Clayman'],
  sao: ['Cánh cửa tầng đầu', 'Đường tới phòng trùm', 'Bảo vệ đồng đội', 'Một mạng sống duy nhất', 'Song kiếm và Heathcliff'],
  overlord: ['Mệnh lệnh từ Nazarick', 'Truy kích đội kỵ sĩ', 'Bảo vệ đại lăng mộ', 'Danh dự của hộ vệ', 'Quyền năng của Shalltear'],
  ...Object.fromEntries(NEW_WORLDS.map(w => [w.id, w.chapters])),
};
export const CHAPTERS = [
  { rule: 'duel', objective: 'Đánh bại đối thủ', multiplier: 0.8, text: 'Một vết nứt xuất hiện giữa các thế giới. Người dẫn đường cần bạn kiểm tra tín hiệu lạ. Trận chiến đầu tiên sẽ quyết định ai được bước qua cánh cổng.' },
  { rule: 'speed', objective: 'Thắng trong tối đa 6 lượt', multiplier: 1, text: 'Cánh cổng đang khép lại. Đối thủ chặn đường mang theo manh mối quan trọng. Bạn phải kết thúc nhanh, trước khi tín hiệu biến mất.' },
  { rule: 'survive', objective: 'Sống sót 6 lượt hoặc đánh bại địch', multiplier: 1.2, text: 'Đồng đội cần thời gian để rút lui. Hãy giữ phòng tuyến đủ lâu. Phòng thủ và tích năng lượng có thể hữu ích hơn một cuộc tấn công liều lĩnh.' },
  { rule: 'no-potion', objective: 'Thắng mà không dùng bình hồi phục', multiplier: 1.3, text: 'Nguồn tiếp tế đã bị cắt đứt. Còn lại kỹ năng, ý chí và những đồng đội bên bạn. Mỗi lựa chọn lúc này đều phải được tính toán cẩn thận.' },
  { rule: 'duel', objective: 'Đánh bại trùm cuối của chương', multiplier: 1.55, text: 'Kẻ đứng sau vết nứt đã lộ diện. Cánh cổng cuối đang chờ bạn. Chiến thắng sẽ để lại một dấu ấn vĩnh viễn trên hành trình đa vũ trụ.' },
];
export const storyTitle = (worldId, chapter) => sagas[worldId][chapter];
export const STORY_TOTAL = WORLDS.length * CHAPTERS.length;

export const ACTIVITIES = [
  { id: 'story', name: 'Biên niên đa vũ trụ', subtitle: `${STORY_TOTAL} chương cốt truyện`, description: `${WORLDS.length} hành trình, hội thoại và những mục tiêu chiến đấu khác nhau. Lựa chọn chiến thuật trước mỗi chương.`, icon: 'scroll', color: '#ab8bf2', tag: 'CỐT TRUYỆN', symbol: '✧' },
  { id: 'tower', name: 'Tháp vô tận', subtitle: 'Sinh tồn qua từng tầng', description: 'Giữ nguyên sinh lực giữa các trận. Chọn một phước lành sau mỗi tầng và xây dựng sức mạnh trong lượt leo tháp.', icon: 'bolt', color: '#e7b56c', tag: 'SINH TỒN', symbol: '♜' },
  { id: 'rush', name: 'Liên chiến trùm', subtitle: 'Ba trùm · Một đội hình', description: 'Ba thế giới liên tiếp, chỉ hồi 20% HP giữa trận. Mỗi trùm có giới hạn 8 lượt; thắng cả chuỗi để nhận nguyên liệu.', icon: 'swords', color: '#e887a3', tag: 'BOSS RUSH', symbol: '⚔' },
  { id: 'memory', name: 'Ký ức đa vũ trụ', subtitle: 'Lật thẻ và tìm cặp', description: 'Ghi nhớ sáu cặp biểu tượng anime. Ít lượt lật hơn, điểm cao hơn. Không có giới hạn thời gian.', icon: 'grid', color: '#7bbbdc', tag: 'TRÍ NHỚ', symbol: '◈' },
  { id: 'reflex', name: 'Luyện phản xạ', subtitle: '20 giây bứt phá', description: 'Chạm vào mục tiêu đang đổi vị trí trên lưới. Chuỗi trúng liên tục tăng điểm; bấm nhầm làm mất chuỗi.', icon: 'bolt', color: '#8bceb9', tag: 'PHẢN XẠ', symbol: '◎' },
  { id: 'quiz', name: 'Học viện anime', subtitle: `Đố vui về ${WORLDS.length} thế giới`, description: 'Trả lời năm câu hỏi ngẫu nhiên. Giải thích sau từng đáp án giúp bạn khám phá thêm về các nhân vật.', icon: 'star', color: '#c69bdd', tag: 'ĐỐ VUI', symbol: '?' },
];

const equipmentNames = [
  ['Như Ý Bổng', 'Đạo phục Rùa', 'Ngọc Rồng'], ['Kunai Làng Lá', 'Áo giáp nhẫn giả', 'Bùa Chakra'],
  ['Kiếm Grand Line', 'Áo choàng hải tặc', 'La bàn Log Pose'], ['Zanpakutō', 'Shihakushō', 'Ấn linh lực'],
  ['Mảnh Kagune', 'Áo khoác Anteiku', 'Mặt nạ Ghoul'], ['Kiếm Tempest', 'Áo choàng Kijin', 'Tinh thể ma tố'],
  ['Kiếm Aincrad', 'Áo giáp tiền tuyến', 'Nhẫn kiếm sĩ'], ['Trượng Nazarick', 'Áo choàng vương giả', 'Ấn triệu hồi'],
  ...NEW_WORLDS.map(w => w.equipment),
];
export const SLOTS = { weapon: 'Vũ khí', armor: 'Giáp', charm: 'Bảo vật' };
export const EQUIPMENT = WORLDS.flatMap((world, i) => ['weapon', 'armor', 'charm'].map((slot, index) => ({
  id: `${world.id}-${slot}`, world: world.id, name: equipmentNames[i][index], slot,
  gold: 300 + index * 100, shards: index + 1,
  attack: slot === 'weapon' ? 7 : slot === 'charm' ? 3 : 0,
  hp: slot === 'armor' ? 35 : slot === 'charm' ? 15 : 0,
  defense: slot === 'armor' ? 3 : 0,
  regen: slot === 'charm' ? 2 : 0,
})));

export const SUPPORTS = {
  'dragon-ball': { name: 'Tiếp sức Ki', attack: 3, hp: 0, defense: 0, regen: 0 },
  naruto: { name: 'Ảnh phân thân', attack: 1, hp: 12, defense: 1, regen: 0 },
  'one-piece': { name: 'Ý chí đồng đội', attack: 0, hp: 25, defense: 0, regen: 0 },
  bleach: { name: 'Kết giới linh lực', attack: 0, hp: 0, defense: 2, regen: 0 },
  'tokyo-ghoul': { name: 'Bản năng săn mồi', attack: 2, hp: 0, defense: 0, regen: 1 },
  slime: { name: 'Phước lành Tempest', attack: 0, hp: 10, defense: 0, regen: 2 },
  sao: { name: 'Phối hợp kiếm kỹ', attack: 3, hp: 0, defense: 0, regen: 0 },
  overlord: { name: 'Hộ vệ Nazarick', attack: 0, hp: 15, defense: 1, regen: 0 },
  ...Object.fromEntries(NEW_WORLDS.map(w => [w.id, w.support])),
};

export const ACHIEVEMENTS = [
  { id: 'story-1', name: 'Trang đầu biên niên', description: 'Hoàn thành 1 chương cốt truyện', key: 'chapters', target: 1, gold: 200, gems: 25 },
  { id: 'story-10', name: 'Người nối các thế giới', description: 'Hoàn thành 10 chương cốt truyện', key: 'chapters', target: 10, gold: 800, gems: 100 },
  { id: 'story-40', name: 'Tác giả huyền thoại', description: 'Hoàn thành 40 chương', key: 'chapters', target: 40, gold: 2000, gems: 250 },
  { id: 'story-80', name: 'Biên niên bất tận', description: `Hoàn thành cả ${STORY_TOTAL} chương`, key: 'chapters', target: STORY_TOTAL, gold: 4000, gems: 400 },
  { id: 'tower-5', name: 'Chạm mây', description: 'Chinh phục tầng 5 của tháp', key: 'tower', target: 5, gold: 400, gems: 50 },
  { id: 'tower-15', name: 'Không có giới hạn', description: 'Chinh phục tầng 15 của tháp', key: 'tower', target: 15, gold: 1200, gems: 150 },
  { id: 'rush-1', name: 'Kẻ săn huyền thoại', description: 'Hoàn thành 1 chuỗi ba trùm', key: 'rush', target: 1, gold: 600, gems: 80 },
  { id: 'mini-3', name: 'Tài năng toàn diện', description: 'Hoàn thành 3 mini game', key: 'mini', target: 3, gold: 300, gems: 50 },
  { id: 'gear-3', name: 'Thợ rèn đa vũ trụ', description: 'Chế tạo 3 trang bị khác nhau', key: 'gear', target: 3, gold: 500, gems: 70 },
];

export const QUIZ = [
  { q: 'Ai là cha của Naruto?', answers: ['Minato Namikaze', 'Kakashi Hatake', 'Jiraiya', 'Hashirama Senju'], correct: 0, explanation: 'Minato Namikaze là Hokage Đệ Tứ và là cha của Naruto.' },
  { q: 'Kỹ năng xoáy Chakra nổi tiếng của Naruto tên là gì?', answers: ['Chidori', 'Rasengan', 'Amaterasu', 'Getsuga Tenshō'], correct: 1, explanation: 'Rasengan là kỹ thuật Chakra dạng cầu mà Naruto học từ Jiraiya.' },
  { q: 'Chiêu thức nổi tiếng được Goku học từ Quy Lão là gì?', answers: ['Final Flash', 'Chidori', 'Kamehameha', 'Bankai'], correct: 2, explanation: 'Kamehameha là chiêu thức của trường phái Quy Lão.' },
  { q: 'Có bao nhiêu viên Ngọc Rồng trong một bộ thông thường?', answers: ['5', '6', '8', '7'], correct: 3, explanation: 'Một bộ Ngọc Rồng thông thường gồm bảy viên.' },
  { q: 'Ước mơ của Monkey D. Luffy là gì?', answers: ['Vua Hải Tặc', 'Hokage', 'Đội trưởng Shinigami', 'Chúa tể Nazarick'], correct: 0, explanation: 'Luffy ra khơi với ước mơ trở thành Vua Hải Tặc.' },
  { q: 'Zoro thường chiến đấu bằng mấy thanh kiếm?', answers: ['Hai', 'Ba', 'Bốn', 'Một'], correct: 1, explanation: 'Zoro nổi tiếng với Santōryū, phong cách tam kiếm.' },
  { q: 'Trong Bleach, thanh kiếm của Shinigami được gọi là gì?', answers: ['Kunai', 'Kagune', 'Zanpakutō', 'Log Pose'], correct: 2, explanation: 'Zanpakutō là thanh kiếm linh hồn của Shinigami.' },
  { q: 'Nhân vật nào trao sức mạnh Shinigami cho Ichigo lúc đầu?', answers: ['Orihime', 'Aizen', 'Renji', 'Rukia'], correct: 3, explanation: 'Rukia Kuchiki trao sức mạnh Shinigami cho Ichigo ở đầu truyện.' },
  { q: 'Quán cà phê gắn với Kaneki và Touka tên là gì?', answers: ['Anteiku', 'Tempest', 'Nazarick', 'Aincrad'], correct: 0, explanation: 'Anteiku là quán cà phê ở Quận 20, một nơi quan trọng trong Tokyo Ghoul.' },
  { q: 'Vũ khí sinh học của Ghoul được gọi là gì?', answers: ['Haki', 'Kagune', 'Chakra', 'Reiatsu'], correct: 1, explanation: 'Kagune là cơ quan săn mồi của Ghoul, có thể biểu hiện thành vũ khí.' },
  { q: 'Rimuru tái sinh thành sinh vật gì?', answers: ['Goblin', 'Rồng', 'Slime', 'Kijin'], correct: 2, explanation: 'Rimuru bắt đầu cuộc sống mới dưới hình dạng một slime.' },
  { q: 'Quốc gia do Rimuru xây dựng có tên là gì?', answers: ['Soul Society', 'Làng Lá', 'Grand Line', 'Tempest'], correct: 3, explanation: 'Liên bang Jura Tempest do Rimuru lãnh đạo.' },
  { q: 'Tòa thành bay của Sword Art Online tên là gì?', answers: ['Aincrad', 'Nazarick', 'Namek', 'Anteiku'], correct: 0, explanation: 'Aincrad là tòa thành bay một trăm tầng trong SAO.' },
  { q: 'Tên thật của Kirito là gì?', answers: ['Minato', 'Kirigaya Kazuto', 'Kurosaki Ichigo', 'Ken Kaneki'], correct: 1, explanation: 'Kirito là tên trong game của Kirigaya Kazuto.' },
  { q: 'Đại lăng mộ của Ainz được gọi là gì?', answers: ['Aincrad', 'Tempest', 'Nazarick', 'Soul Society'], correct: 2, explanation: 'Đại lăng mộ Nazarick là căn cứ của Ainz và các hộ vệ.' },
  { q: 'Albedo giữ vai trò gì ở Nazarick?', answers: ['Thuyền trưởng', 'Nhẫn giả', 'Kiếm sĩ tiền tuyến', 'Tổng quản hộ vệ'], correct: 3, explanation: 'Albedo là tổng quản các hộ vệ của Nazarick.' },
  ...NEW_WORLDS.flatMap(w => w.quiz),
];
