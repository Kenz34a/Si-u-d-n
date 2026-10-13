import { NEW_WORLDS, NEW_CHARACTERS } from './new-anime.js';
export const RANK_THRESHOLDS = [0, 120, 350, 700, 1200, 2000, 3200];
export const CATALOG_VERSION = 2;
export const LEGACY_WORLD_IDS = ['dragon-ball', 'naruto', 'one-piece', 'bleach', 'tokyo-ghoul', 'slime', 'sao', 'overlord'];

export const WORLDS = [
  { id: 'dragon-ball', name: 'Dragon Ball', label: 'Sức mạnh không giới hạn', color: '#f6a144', accent: '#ffc45d', emblem: '✦', land: 'Hành tinh Namek', type: 'Ki · Võ thuật', ranks: ['Tân võ sĩ', 'Chiến binh Trái Đất', 'Saiyan', 'Super Saiyan', 'Super Saiyan God', 'Super Saiyan Blue', 'Ultra Instinct'], enemies: ['Saibaman', 'Đội trưởng Ginyu', 'Frieza'], skill: 'Kamehameha', ultimate: 'Genki Dama', character: 'goku', art: 'fighter' },
  { id: 'naruto', name: 'Naruto', label: 'Viết nên nhẫn đạo của bạn', color: '#ef7450', accent: '#ffa075', emblem: '◎', land: 'Làng Lá', type: 'Chakra · Nhẫn thuật', ranks: ['Học viên', 'Genin', 'Chūnin', 'Jōnin', 'ANBU', 'Kage', 'Lục Đạo'], enemies: ['Ninja phản bội', 'Thành viên Akatsuki', 'Madara'], skill: 'Rasengan', ultimate: 'Rasen Shuriken', character: 'naruto', art: 'ninja' },
  { id: 'one-piece', name: 'One Piece', label: 'Ra khơi, tìm kho báu của bạn', color: '#47c4da', accent: '#83e6ee', emblem: '⚓', land: 'Grand Line', type: 'Haki · Trái ác quỷ', ranks: ['Tân binh', 'Hải tặc', 'Siêu Tân Tinh', 'Thất Vũ Hải', 'Chỉ huy Tứ Hoàng', 'Tứ Hoàng', 'Vua Hải Tặc'], enemies: ['Hải quân', 'Pacifista', 'Kaido'], skill: 'Gomu Gomu no Gatling', ultimate: 'Gear Fifth', character: 'luffy', art: 'pirate' },
  { id: 'bleach', name: 'Bleach', label: 'Thức tỉnh sức mạnh linh hồn', color: '#ad8cf6', accent: '#d6bbff', emblem: '†', land: 'Soul Society', type: 'Reiatsu · Zanpakutō', ranks: ['Linh hồn', 'Shinigami', 'Sĩ quan', 'Phó đội trưởng', 'Đội trưởng', 'Bankai', 'Siêu việt'], enemies: ['Hollow', 'Arrancar', 'Aizen'], skill: 'Getsuga Tenshō', ultimate: 'Tensa Zangetsu', character: 'ichigo', art: 'swordsman' },
  { id: 'tokyo-ghoul', name: 'Tokyo Ghoul', label: 'Bản năng sau chiếc mặt nạ', color: '#ed557d', accent: '#ff9bb8', emblem: '◈', land: 'Tokyo · Quận 20', type: 'Kagune · Tái sinh', ranks: ['Ghoul hạng C', 'Ghoul hạng B', 'Ghoul hạng A', 'Ghoul hạng S', 'Ghoul hạng SS', 'Ghoul hạng SSS', 'One-Eyed King'], enemies: ['Điều tra viên CCG', 'Jason', 'Arima'], skill: 'Rinkaku', ultimate: 'Kakuja thức tỉnh', character: 'kaneki', art: 'ghoul' },
  { id: 'slime', name: 'Tensei Slime', label: 'Từ slime đến Ma Vương', color: '#62b8ff', accent: '#a1d9ff', emblem: '◉', land: 'Liên bang Tempest', type: 'Ma tố · Hấp thụ', ranks: ['Slime', 'Quái vật hữu danh', 'Kijin', 'Hạt giống Ma Vương', 'Ma Vương', 'Chân Ma Vương', 'Long chủng'], enemies: ['Goblin hoang dã', 'Orc Disaster', 'Clayman'], skill: 'Hắc lôi', ultimate: 'Megiddo', character: 'rimuru', art: 'mage' },
  { id: 'sao', name: 'Sword Art Online', label: 'Chinh phục từng tầng Aincrad', color: '#68d1ba', accent: '#a9f1df', emblem: '⚔', land: 'Aincrad', type: 'Sword Skill · Song kiếm', ranks: ['Tân thủ', 'Kiếm sĩ', 'Beater', 'Tiền tuyến', 'Kiếm sĩ tinh nhuệ', 'Black Swordsman', 'Người phá đảo'], enemies: ['Kobold', 'The Gleam Eyes', 'Heathcliff'], skill: 'Sonic Leap', ultimate: 'Starburst Stream', character: 'kirito', art: 'swordsman' },
  { id: 'overlord', name: 'Overlord', label: 'Quyền năng của Nazarick', color: '#c39b62', accent: '#edd1a5', emblem: '♛', land: 'Đại lăng mộ Nazarick', type: 'Ma pháp · Triệu hồi', ranks: ['Mạo hiểm giả Đồng', 'Mạo hiểm giả Sắt', 'Mạo hiểm giả Bạc', 'Mạo hiểm giả Vàng', 'Mithril', 'Adamantite', 'Chúa tể Nazarick'], enemies: ['Kỵ sĩ vương quốc', 'Death Knight', 'Shalltear'], skill: 'Grasp Heart', ultimate: 'Fallen Down', character: 'ainz', art: 'lord' },
  ...NEW_WORLDS,
];

export const CHARACTERS = [
  { id: 'goku', name: 'Son Goku', world: 'dragon-ball', role: 'Đấu sĩ', quote: 'Giới hạn sinh ra để vượt qua.', hp: 160, attack: 25, defense: 9, free: true },
  { id: 'naruto', name: 'Uzumaki Naruto', world: 'naruto', role: 'Nhẫn giả', quote: 'Không bao giờ từ bỏ nhẫn đạo.', hp: 175, attack: 23, defense: 10, free: true },
  { id: 'luffy', name: 'Monkey D. Luffy', world: 'one-piece', role: 'Hải tặc', quote: 'Mình sẽ trở thành Vua Hải Tặc!', hp: 190, attack: 22, defense: 8, free: true },
  { id: 'ichigo', name: 'Kurosaki Ichigo', world: 'bleach', role: 'Shinigami', quote: 'Thanh kiếm này để bảo vệ mọi người.', hp: 150, attack: 28, defense: 8, free: true },
  { id: 'kaneki', name: 'Ken Kaneki', world: 'tokyo-ghoul', role: 'Ghoul', quote: 'Tìm lại chính mình trong bóng tối.', hp: 165, attack: 26, defense: 7, free: true },
  { id: 'rimuru', name: 'Rimuru Tempest', world: 'slime', role: 'Ma vương', quote: 'Một thế giới nơi mọi người cùng sống.', hp: 180, attack: 22, defense: 11, free: true },
  { id: 'kirito', name: 'Kirigaya Kazuto', world: 'sao', role: 'Kiếm sĩ', quote: 'Mỗi tầng đều có một lối ra.', hp: 145, attack: 30, defense: 7, free: true },
  { id: 'ainz', name: 'Ainz Ooal Gown', world: 'overlord', role: 'Pháp sư', quote: 'Vinh quang thuộc về Nazarick.', hp: 170, attack: 24, defense: 10, free: true },
  { id: 'vegeta', name: 'Vegeta', world: 'dragon-ball', role: 'Đấu sĩ', hp: 155, attack: 29, defense: 9, price: 250, skill: 'Final Flash', ultimate: 'Final Explosion' },
  { id: 'sasuke', name: 'Uchiha Sasuke', world: 'naruto', role: 'Nhẫn giả', hp: 150, attack: 28, defense: 10, price: 250, skill: 'Chidori', ultimate: 'Susanoo' },
  { id: 'zoro', name: 'Roronoa Zoro', world: 'one-piece', role: 'Kiếm sĩ', hp: 185, attack: 26, defense: 9, price: 250, skill: 'Oni Giri', ultimate: 'Asura' },
  { id: 'rukia', name: 'Kuchiki Rukia', world: 'bleach', role: 'Shinigami', hp: 150, attack: 26, defense: 12, price: 250, skill: 'Sode no Shirayuki', ultimate: 'Hakka no Togame' },
  { id: 'touka', name: 'Touka Kirishima', world: 'tokyo-ghoul', role: 'Ghoul', hp: 145, attack: 30, defense: 8, price: 250, skill: 'Ukaku', ultimate: 'Cánh đỏ thức tỉnh' },
  { id: 'milim', name: 'Milim Nava', world: 'slime', role: 'Ma vương', hp: 175, attack: 30, defense: 7, price: 250, skill: 'Dragon Buster', ultimate: 'Drago Nova' },
  { id: 'asuna', name: 'Yuuki Asuna', world: 'sao', role: 'Kiếm sĩ', hp: 155, attack: 28, defense: 10, price: 250, skill: 'Linear', ultimate: 'Mother’s Rosario' },
  { id: 'albedo', name: 'Albedo', world: 'overlord', role: 'Hộ vệ', hp: 220, attack: 21, defense: 14, price: 250, skill: 'Ginnungagap', ultimate: 'Hộ vệ Nazarick' },
  ...NEW_CHARACTERS,
];

export const DIFFICULTIES = {
  easy: { name: 'Thám hiểm', description: 'Làm quen thế giới', multiplier: 0.85, reward: 65, gold: 160, xp: 55, gems: 15 },
  normal: { name: 'Thử thách', description: 'Đối thủ đáng gờm', multiplier: 1.2, reward: 110, gold: 240, xp: 85, gems: 25 },
  boss: { name: 'Trùm thế giới', description: 'Mở sau 2 chiến thắng', multiplier: 1.7, reward: 180, gold: 400, xp: 130, gems: 45 },
};

export const QUESTS = [
  { id: 'first-win', name: 'Khởi đầu huyền thoại', description: 'Giành 1 chiến thắng hôm nay', key: 'wins', target: 1, gold: 200, gems: 30, icon: 'trophy' },
  { id: 'three-matches', name: 'Không ngừng tiến bước', description: 'Hoàn thành 3 trận đấu hôm nay', key: 'matches', target: 3, gold: 300, gems: 40, icon: 'swords' },
  { id: 'training', name: 'Vượt qua giới hạn', description: 'Nâng cấp một anh hùng hôm nay', key: 'upgrades', target: 1, gold: 150, gems: 20, icon: 'bolt' },
  { id: 'explore', name: 'Lữ khách đa vũ trụ', description: 'Chiến đấu ở 3 thế giới hôm nay', key: 'worlds', target: 3, gold: 400, gems: 50, icon: 'globe' },
];

export const NPCS = [
  { name: 'Akira', points: 4250, world: 'naruto' }, { name: 'Yoru', points: 3100, world: 'bleach' },
  { name: 'Kai', points: 2350, world: 'dragon-ball' }, { name: 'Hikari', points: 1640, world: 'sao' },
  { name: 'Sora', points: 980, world: 'one-piece' }, { name: 'Ren', points: 540, world: 'tokyo-ghoul' },
  { name: 'Miko', points: 230, world: 'slime' }, { name: 'Aoi', points: 90, world: 'overlord' },
  { name: 'Jin', points: 3800, world: 'solo-leveling' }, { name: 'Wynn', points: 2850, world: 'wistoria' },
  { name: 'Noelle', points: 1870, world: 'black-clover' }, { name: 'Megumi', points: 1440, world: 'jujutsu-kaisen' },
  { name: 'Elaine', points: 840, world: 'seven-deadly-sins' }, { name: 'Iris', points: 670, world: 'fate-zero' },
  { name: 'Kanao', points: 420, world: 'demon-slayer' }, { name: 'Lucy', points: 180, world: 'fairy-tail' },
];

export const worldById = id => WORLDS.find(world => world.id === id);
export const characterById = id => CHARACTERS.find(character => character.id === id);
