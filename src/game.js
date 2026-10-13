import { CHARACTERS, WORLDS, QUESTS, RANK_THRESHOLDS, DIFFICULTIES, CATALOG_VERSION, LEGACY_WORLD_IDS, characterById, worldById } from './data.js';
import { freshExpansion, migrateExpansion, validExpansion, loadoutBonus, settleAdventureBattle } from './expansion.js';

export const SAVE_KEY = 'anime-nexus-v1';
export const dateKey = () => new Date().toLocaleDateString('en-CA');
export const xpRequired = level => 100 + (level - 1) * 40;
export const totalPoints = state => Object.values(state.worldProgress).reduce((sum, world) => sum + world.points, 0);
export const rankFor = (id, points) => {
  const world = worldById(id);
  const index = RANK_THRESHOLDS.findLastIndex(threshold => points >= threshold);
  return { name: world.ranks[index], index, next: world.ranks[index + 1], floor: RANK_THRESHOLDS[index], ceiling: RANK_THRESHOLDS[index + 1] ?? RANK_THRESHOLDS[index] };
};

export function freshState() {
  return {
    version: 1, catalogVersion: CATALOG_VERSION, name: 'Lữ khách', level: 1, xp: 0, gold: 1500, gems: 120, potions: 3,
    activeCharacter: 'goku', selectedWorld: 'dragon-ball',
    unlocked: CHARACTERS.filter(c => c.free).map(c => c.id),
    characterLevels: Object.fromEntries(CHARACTERS.map(c => [c.id, 1])),
    worldProgress: Object.fromEntries(WORLDS.map(w => [w.id, { wins: 0, matches: 0, points: 0 }])),
    daily: { date: dateKey(), wins: 0, matches: 0, upgrades: 0, worlds: [], claimed: [] },
    battle: null, history: [], settings: { sound: false, motion: true }, adventure: freshExpansion(),
  };
}

export function refreshDaily(state) {
  if (state.daily.date !== dateKey()) state.daily = freshState().daily;
  return state;
}

export function parseSave(text) {
  try {
    const raw = JSON.parse(text);
    if (!raw || raw.version !== 1) return null;
    if (raw.catalogVersion !== undefined && raw.catalogVersion !== 1 && raw.catalogVersion !== CATALOG_VERSION) return null;
    migrateCatalog(raw);
    // Reject malformed saves rather than letting invalid data break the game.
    const numeric = value => Number.isFinite(value) && value >= 0;
    if (!['gold', 'gems', 'xp', 'level', 'potions'].every(key => numeric(raw[key])) || !Number.isInteger(raw.level) || raw.level < 1 || raw.xp >= xpRequired(raw.level) || !Number.isInteger(raw.potions) || !characterById(raw.activeCharacter) || !worldById(raw.selectedWorld)) return null;
    if (!Array.isArray(raw.unlocked) || !raw.unlocked.includes(raw.activeCharacter) || raw.unlocked.some(id => !characterById(id))) return null;
    if (!CHARACTERS.every(c => Number.isInteger(raw.characterLevels?.[c.id]) && raw.characterLevels[c.id] >= 1 && raw.characterLevels[c.id] <= 20)) return null;
    if (!WORLDS.every(w => raw.worldProgress?.[w.id] && ['wins', 'matches', 'points'].every(key => numeric(raw.worldProgress[w.id][key])))) return null;
    if (!raw.daily || typeof raw.daily.date !== 'string' || !Array.isArray(raw.daily.worlds) || raw.daily.worlds.some(id => !worldById(id)) || !Array.isArray(raw.daily.claimed) || raw.daily.claimed.some(id => !QUESTS.some(q => q.id === id)) || !['wins', 'matches', 'upgrades'].every(key => numeric(raw.daily[key])) || !Array.isArray(raw.history)) return null;
    if (raw.history.some(h => !worldById(h.worldId) || typeof h.enemy !== 'string' || typeof h.won !== 'boolean' || !numeric(h.points) || !numeric(h.date))) return null;
    raw.history = raw.history.slice(0, 20);
    if (raw.adventure !== undefined && !validExpansion(raw.adventure, numeric)) return null;
    migrateExpansion(raw);
    if (raw.adventure.supports.some(id => !raw.unlocked.includes(id) || id === raw.activeCharacter)) return null;
    if (raw.battle && !validBattle(raw.battle)) return null;
    if (['tower', 'rush'].includes(raw.battle?.mode) && raw.battle.status === 'active' && (!raw.adventure[raw.battle.mode].run || raw.adventure[raw.battle.mode].run.stage !== raw.battle.stage)) return null;
    raw.name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 24) : 'Lữ khách';
    raw.settings = { sound: raw.settings?.sound === true, motion: raw.settings?.motion !== false };
    return refreshDaily(raw);
  } catch { return null; }
}

// Extend only the known newly-added IDs. Missing or corrupt old entries still fail validation.
// Keep the old world/character/quiz ordering intact for active survival runs and mini games.
function migrateCatalog(raw) {
  if (raw.catalogVersion === CATALOG_VERSION) return;
  if (raw.worldProgress && typeof raw.worldProgress === 'object') {
    for (const world of WORLDS.filter(w => !LEGACY_WORLD_IDS.includes(w.id))) {
      if (raw.worldProgress[world.id] === undefined) raw.worldProgress[world.id] = { wins: 0, matches: 0, points: 0 };
      if (raw.adventure?.story && raw.adventure.story[world.id] === undefined) raw.adventure.story[world.id] = 0;
    }
  }
  if (raw.characterLevels && typeof raw.characterLevels === 'object' && Array.isArray(raw.unlocked)) {
    for (const character of CHARACTERS.filter(c => !LEGACY_WORLD_IDS.includes(c.world))) {
      if (raw.characterLevels[character.id] === undefined) raw.characterLevels[character.id] = 1;
      if (character.free && !raw.unlocked.includes(character.id)) raw.unlocked.push(character.id);
    }
  }
  raw.catalogVersion = CATALOG_VERSION;
}

export function loadState(storage) {
  try { return parseSave(storage.getItem(SAVE_KEY)) ?? freshState(); }
  catch { return freshState(); }
}

function validBattle(b) {
  if (b.mode && !['arena', 'story', 'tower', 'rush'].includes(b.mode)) return false;
  if (b.mode === 'story' && (!Number.isInteger(b.chapter) || b.chapter < 0 || b.chapter > 4)) return false;
  if (['tower', 'rush'].includes(b.mode) && (!Number.isInteger(b.stage) || b.stage < 1)) return false;
  if (b.supportIds && (!Array.isArray(b.supportIds) || b.supportIds.length > 2 || b.supportIds.some(id => !characterById(id)))) return false;
  if (b.player?.regen !== undefined && (!Number.isFinite(b.player.regen) || b.player.regen < 0)) return false;
  if (b.player?.supportCooldown !== undefined && (!Number.isInteger(b.player.supportCooldown) || b.player.supportCooldown < 0 || b.player.supportCooldown > 3)) return false;
  if (b.maxTurns != null && (!Number.isInteger(b.maxTurns) || b.maxTurns < 1 || b.maxTurns > 8)) return false;
  return worldById(b.worldId) && characterById(b.characterId) && DIFFICULTIES[b.difficulty] && ['active', 'won', 'lost'].includes(b.status) && Number.isInteger(b.turn) && b.turn >= 1 && Array.isArray(b.logs) && b.logs.every(l => ['player', 'enemy', 'system', 'victory'].includes(l.type) && typeof l.text === 'string') && ['hp', 'maxHp', 'energy', 'attack', 'defense', 'cooldown'].every(k => Number.isFinite(b.player?.[k]) && b.player[k] >= 0) && b.player.hp <= b.player.maxHp && b.player.maxHp > 0 && b.player.energy <= 100 && ['hp', 'maxHp', 'attack', 'defense'].every(k => Number.isFinite(b.enemy?.[k]) && b.enemy[k] >= 0) && typeof b.enemy.name === 'string' && b.enemy.hp <= b.enemy.maxHp && b.enemy.maxHp > 0 && (b.status === 'active' || ['gold', 'gems', 'xp', 'points'].every(k => Number.isFinite(b.rewards?.[k]) && b.rewards[k] >= 0));
}

export function statsFor(state, id = state.activeCharacter) {
  const character = characterById(id);
  const level = state.characterLevels[id];
  const bonus = loadoutBonus(state, id);
  return { hp: character.hp + (level - 1) * 14 + bonus.hp, attack: character.attack + (level - 1) * 3 + bonus.attack, defense: character.defense + (level - 1) * 1.5 + bonus.defense, regen: bonus.regen, level };
}

export function selectCharacter(state, id) {
  if (!state.unlocked.includes(id)) return { error: 'Anh hùng chưa được chiêu mộ.' };
  state.activeCharacter = id;
  migrateExpansion(state).adventure.supports = state.adventure.supports.filter(support => support !== id);
  return { message: `Đã chọn ${characterById(id).name}.` };
}

export function upgradeCharacter(state, id) {
  refreshDaily(state);
  if (!state.unlocked.includes(id)) return { error: 'Anh hùng chưa được chiêu mộ.' };
  const level = state.characterLevels[id];
  if (level >= 20) return { error: 'Đã đạt cấp anh hùng tối đa.' };
  const cost = level * 180;
  if (state.gold < cost) return { error: 'Không đủ vàng để nâng cấp.' };
  state.gold -= cost;
  state.characterLevels[id]++;
  state.daily.upgrades++;
  return { message: `${characterById(id).name} đạt cấp ${level + 1}!` };
}

export function recruit(state, id) {
  const character = characterById(id);
  if (!character || state.unlocked.includes(id)) return { error: 'Anh hùng đã có trong bộ sưu tập.' };
  if (state.gems < character.price) return { error: 'Chưa đủ tinh thạch. Hoàn thành trận đấu và nhiệm vụ để nhận thêm.' };
  state.gems -= character.price;
  state.unlocked.push(id);
  return { message: `Đã chiêu mộ ${character.name}!` };
}

export function buyPotion(state) {
  if (state.gold < 150) return { error: 'Cần 150 vàng để mua bình hồi phục.' };
  state.gold -= 150;
  state.potions++;
  return { message: 'Đã thêm 1 bình hồi phục vào hành trang.' };
}

export function questProgress(state, quest) {
  refreshDaily(state);
  return Math.min(quest.target, quest.key === 'worlds' ? state.daily.worlds.length : state.daily[quest.key]);
}

export function claimQuest(state, id) {
  const quest = QUESTS.find(q => q.id === id);
  if (!quest) return { error: 'Nhiệm vụ không tồn tại.' };
  refreshDaily(state);
  if (state.daily.claimed.includes(id)) return { error: 'Bạn đã nhận phần thưởng này.' };
  if (questProgress(state, quest) < quest.target) return { error: 'Hãy hoàn thành nhiệm vụ trước.' };
  state.gold += quest.gold;
  state.gems += quest.gems;
  state.daily.claimed.push(id);
  return { message: `Nhận ${quest.gold} vàng và ${quest.gems} tinh thạch!` };
}

export function startBattle(state, difficulty = 'easy') {
  refreshDaily(state);
  if (state.battle?.status === 'active') return { message: 'Tiếp tục trận đấu đang diễn ra.' };
  if (!DIFFICULTIES[difficulty]) return { error: 'Độ khó không hợp lệ.' };
  if (difficulty === 'boss' && state.worldProgress[state.selectedWorld].wins < 2) return { error: 'Giành 2 chiến thắng tại thế giới này để mở trận trùm.' };
  const world = worldById(state.selectedWorld);
  const stats = statsFor(state);
  const tier = ['easy', 'normal', 'boss'].indexOf(difficulty);
  const multiplier = DIFFICULTIES[difficulty].multiplier;
  const enemyHp = Math.round((100 + Math.min(state.level - 1, 12) * 7) * multiplier);
  state.battle = {
    mode: 'arena', worldId: world.id, characterId: state.activeCharacter, difficulty, turn: 1, status: 'active',
    supportIds: [...migrateExpansion(state).adventure.supports],
    player: { hp: stats.hp, maxHp: stats.hp, attack: stats.attack, defense: stats.defense, regen: stats.regen, energy: 40, cooldown: 0, supportCooldown: 0 },
    enemy: { name: world.enemies[tier], hp: enemyHp, maxHp: enemyHp, attack: Math.round(22 * multiplier + Math.min(state.level - 1, 12)), defense: 4 + tier * 3 },
    logs: [{ type: 'system', text: `Đặt chân tới ${world.land}. ${world.enemies[tier]} xuất hiện!` }],
    rewards: null,
  };
  return { message: `Bắt đầu ${DIFFICULTIES[difficulty].name.toLowerCase()}!` };
}

export const enemyIntent = battle => battle.turn % 3 === 0 ? { name: 'Đòn cường hóa', strong: true } : { name: 'Tấn công', strong: false };

function finishBattle(state, won) {
  const battle = state.battle;
  const rewards = DIFFICULTIES[battle.difficulty];
  battle.status = won ? 'won' : 'lost';
  battle.rewards = ['story', 'tower', 'rush'].includes(battle.mode) ? settleAdventureBattle(state, won) : won ? { gold: rewards.gold, gems: rewards.gems, xp: rewards.xp, points: rewards.reward } : { gold: 0, gems: 0, xp: 15, points: 0 };
  if (battle.rewards.shards) state.adventure.shards += battle.rewards.shards;
  state.gold += battle.rewards.gold;
  state.gems += battle.rewards.gems;
  state.xp += battle.rewards.xp;
  while (state.xp >= xpRequired(state.level)) { state.xp -= xpRequired(state.level); state.level++; }
  const world = state.worldProgress[battle.worldId];
  world.matches++;
  world.points += battle.rewards.points;
  if (won) { world.wins++; state.daily.wins++; }
  state.daily.matches++;
  if (!state.daily.worlds.includes(battle.worldId)) state.daily.worlds.push(battle.worldId);
  state.history.unshift({ worldId: battle.worldId, enemy: battle.enemy.name, won, points: battle.rewards.points, date: Date.now() });
  state.history = state.history.slice(0, 20);
  battle.logs.push({ type: won ? 'victory' : 'enemy', text: won ? 'CHIẾN THẮNG! Sức mạnh của bạn đã được ghi nhận.' : 'Trận đấu kết thúc. Nâng cấp anh hùng và thử lại!' });
}

export function battleAction(state, action, random = Math.random) {
  refreshDaily(state);
  const b = state.battle;
  if (!b || b.status !== 'active') return { error: 'Không có trận đấu đang diễn ra.' };
  const p = b.player;
  const character = characterById(b.characterId);
  const world = worldById(character.world);
  if (!['attack', 'skill', 'guard', 'ultimate', 'potion', 'retreat', 'support'].includes(action)) return { error: 'Hành động không hợp lệ.' };
  if (action === 'skill' && (p.energy < 35 || p.cooldown > 0)) return { error: 'Kỹ năng cần 35 năng lượng và hết hồi chiêu.' };
  if (action === 'ultimate' && p.energy < 100) return { error: 'Tuyệt kỹ cần 100 năng lượng.' };
  if (action === 'potion' && b.rule === 'no-potion') return { error: 'Chương này không cho phép dùng bình hồi phục.' };
  if (action === 'support' && (!b.supportIds?.length || p.energy < 30 || (p.supportCooldown ?? 0) > 0)) return { error: 'Liên kích cần đồng đội hỗ trợ, 30 năng lượng và hết hồi chiêu.' };
  if (action === 'potion' && (state.potions < 1 || p.hp === p.maxHp)) return { error: state.potions < 1 ? 'Hết bình hồi phục.' : 'Sinh lực đang đầy.' };
  if (action === 'retreat') { finishBattle(state, false); return { message: 'Đã rút lui. Anh hùng sẵn sàng cho trận tiếp theo.' }; }
  const intent = enemyIntent(b);
  let damage = 0;
  let critical = false;
  if (action === 'support') {
    const supportAttack = b.supportIds.reduce((sum, id) => sum + characterById(id).attack, 0);
    damage = Math.max(1, Math.round(p.attack * 0.7 + supportAttack * 0.6 - b.enemy.defense));
    b.enemy.hp = Math.max(0, b.enemy.hp - damage);
    p.energy -= 30;
    p.hp = Math.min(p.maxHp, p.hp + 8 * b.supportIds.length);
    b.logs.push({ type: 'player', text: `Liên kích cùng ${b.supportIds.map(id => characterById(id).name).join(' & ')}: ${damage} sát thương, hồi ${8 * b.supportIds.length} HP.` });
  } else if (action === 'attack' || action === 'skill' || action === 'ultimate') {
    critical = random() < 0.15;
    const multiplier = action === 'ultimate' ? 3.6 : action === 'skill' ? 1.9 : 1;
    damage = Math.max(1, Math.round(p.attack * multiplier * (0.9 + random() * 0.2) * (critical ? 1.5 : 1) - b.enemy.defense));
    b.enemy.hp = Math.max(0, b.enemy.hp - damage);
    const name = action === 'attack' ? 'Tấn công' : action === 'skill' ? (character.skill ?? world.skill) : (character.ultimate ?? world.ultimate);
    b.logs.push({ type: 'player', text: `${name}: ${damage} sát thương${critical ? ' · BẠO KÍCH!' : '.'}` });
    p.energy = Math.min(100, p.energy + (action === 'attack' ? 22 : action === 'skill' ? -35 : -100));
  } else if (action === 'guard') {
    p.energy = Math.min(100, p.energy + 30);
    b.logs.push({ type: 'player', text: 'Phòng thủ: giảm 70% sát thương nhận vào, +30 năng lượng.' });
  } else if (action === 'potion') {
    state.potions--;
    const healing = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * 0.45));
    p.hp += healing;
    b.logs.push({ type: 'player', text: `Bình hồi phục: +${healing} sinh lực.` });
  }
  p.cooldown = Math.max(0, p.cooldown - 1);
  p.supportCooldown = Math.max(0, (p.supportCooldown ?? 0) - 1);
  if (action === 'skill') p.cooldown = 2;
  if (action === 'support') p.supportCooldown = 3;
  if (b.enemy.hp === 0) { finishBattle(state, true); return { damage, critical, won: true }; }
  const incoming = Math.max(1, Math.round((b.enemy.attack * (intent.strong ? 1.8 : 1) - p.defense) * (action === 'guard' ? 0.3 : 1)));
  p.hp = Math.max(0, p.hp - incoming);
  b.logs.push({ type: 'enemy', text: `${b.enemy.name} dùng ${intent.name.toLowerCase()}: ${incoming} sát thương.` });
  // Regeneration is a distinct benefit of ghoul and slime heroes.
  if (p.hp > 0 && (['tokyo-ghoul', 'slime'].includes(character.world) || p.regen > 0)) {
    const heal = Math.min(p.maxHp - p.hp, (['tokyo-ghoul', 'slime'].includes(character.world) ? 5 : 0) + (p.regen ?? 0));
    p.hp += heal;
    if (heal) b.logs.push({ type: 'system', text: `Tái sinh: +${heal} sinh lực.` });
  }
  b.turn++;
  if (p.hp === 0) finishBattle(state, false);
  else if (b.rule === 'survive' && b.turn > 6) { b.logs.push({ type: 'system', text: 'Đã giữ phòng tuyến đủ 6 lượt!' }); finishBattle(state, true); }
  else if (b.maxTurns && b.turn > b.maxTurns) { b.logs.push({ type: 'system', text: 'Hết số lượt của thử thách. Hãy tối ưu đội hình và thử lại.' }); finishBattle(state, false); }
  b.logs = b.logs.slice(-30);
  return { damage, incoming, critical, lost: b.status === 'lost' };
}
