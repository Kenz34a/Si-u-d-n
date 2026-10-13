import { WORLDS, characterById, worldById } from './data.js';
import { CHAPTERS, EQUIPMENT, SUPPORTS, ACHIEVEMENTS, QUIZ, storyTitle } from './content.js';

export function freshExpansion() {
  return {
    story: Object.fromEntries(WORLDS.map(w => [w.id, 0])),
    tower: { best: 0, run: null }, rush: { wins: 0, run: null },
    shards: 2, equipment: [], equipped: { weapon: null, armor: null, charm: null },
    supports: [], achievements: [],
    mini: { played: 0, best: { memory: 0, reflex: 0, quiz: 0 }, daily: { date: '', memory: 0, reflex: 0, quiz: 0 }, session: null },
  };
}

export function migrateExpansion(state) {
  state.adventure ??= freshExpansion();
  return state;
}

export function validExpansion(a, numeric) {
  if (!a || !WORLDS.every(w => Number.isInteger(a.story?.[w.id]) && a.story[w.id] >= 0 && a.story[w.id] <= 5)) return false;
  if (!numeric(a.shards) || !numeric(a.tower?.best) || !numeric(a.rush?.wins) || !Array.isArray(a.equipment) || a.equipment.some(id => !EQUIPMENT.some(e => e.id === id))) return false;
  if (!['weapon', 'armor', 'charm'].every(slot => a.equipped && (a.equipped[slot] === null || a.equipment.includes(a.equipped[slot]) && EQUIPMENT.find(e => e.id === a.equipped[slot]).slot === slot))) return false;
  if (!Array.isArray(a.supports) || a.supports.length > 2 || new Set(a.supports).size !== a.supports.length || a.supports.some(id => !characterById(id)) || !Array.isArray(a.achievements) || a.achievements.some(id => !ACHIEVEMENTS.some(m => m.id === id))) return false;
  for (const mode of ['tower', 'rush']) {
    const run = a[mode].run;
    if (run && (!characterById(run.characterId) || !worldById(run.origin) || !Number.isInteger(run.stage) || run.stage < 1 || !['ready', 'fighting', 'choice'].includes(run.status) || !['hp', 'maxHp', 'attack', 'defense', 'energy', 'regen'].every(k => numeric(run.player?.[k])) || run.player.hp > run.player.maxHp || run.player.energy > 100 || run.supportIds && (!Array.isArray(run.supportIds) || run.supportIds.length > 2 || run.supportIds.some(id => !characterById(id))))) return false;
    if (mode === 'rush' && run && (run.stage > 3 || run.status === 'choice')) return false;
  }
  const m = a.mini;
  if (!m || !numeric(m.played) || !['memory', 'reflex', 'quiz'].every(id => numeric(m.best?.[id]) && numeric(m.daily?.[id])) || typeof m.daily.date !== 'string') return false;
  if (m.session) {
    const s = m.session;
    if (!['memory', 'reflex', 'quiz'].includes(s.kind) || !['active', 'finished'].includes(s.status) || !numeric(s.score) || !numeric(s.startedAt)) return false;
    if (s.kind === 'memory' && (!Array.isArray(s.cards) || s.cards.length !== 12 || s.cards.some(id => !worldById(id) || s.cards.filter(card => card === id).length !== 2) || !Array.isArray(s.matched) || !Array.isArray(s.open) || s.open.length > 2 || s.matched.length % 2 !== 0 || new Set([...s.matched, ...s.open]).size !== s.matched.length + s.open.length || [...s.matched, ...s.open].some(i => !Number.isInteger(i) || i < 0 || i > 11) || !numeric(s.moves))) return false;
    if (s.kind === 'reflex' && (!Number.isInteger(s.target) || s.target < 0 || s.target > 11 || !numeric(s.endsAt) || !numeric(s.streak) || !numeric(s.hits) || !numeric(s.misses))) return false;
    if (s.kind === 'quiz' && (!Array.isArray(s.questions) || s.questions.length !== 5 || new Set(s.questions).size !== 5 || s.questions.some(i => !Number.isInteger(i) || !QUIZ[i]) || !Number.isInteger(s.index) || s.index < 0 || s.index > 5 || s.status === 'active' && s.index === 5 || !numeric(s.correct) || s.correct > 5 || !Array.isArray(s.answers) || s.answers.length < s.index || s.answers.length > Math.min(5,s.index + 1) || s.answers.some(i => !Number.isInteger(i) || i < 0 || i > 3))) return false;
  }
  return true;
}

export function loadoutBonus(state, characterId = state.activeCharacter) {
  const bonus = { hp: 0, attack: 0, defense: 0, regen: 0 };
  const a = state.adventure ?? freshExpansion();
  const sources = Object.values(a.equipped).map(id => EQUIPMENT.find(e => e.id === id)).filter(Boolean);
  for (const id of a.supports.filter(id => id !== characterId && state.unlocked.includes(id))) sources.push(SUPPORTS[characterById(id).world]);
  for (const source of sources) for (const key of Object.keys(bonus)) bonus[key] += source[key] ?? 0;
  return bonus;
}

export function toggleSupport(state, id) {
  const a = migrateExpansion(state).adventure;
  if (!state.unlocked.includes(id) || id === state.activeCharacter) return { error: 'Chọn anh hùng đã sở hữu, khác anh hùng chính.' };
  if (a.supports.includes(id)) { a.supports = a.supports.filter(item => item !== id); return { message: 'Đã đưa anh hùng khỏi đội hỗ trợ.' }; }
  if (a.supports.length === 2) return { error: 'Đội hỗ trợ có tối đa 2 người. Bỏ chọn một người trước.' };
  a.supports.push(id);
  return { message: `${characterById(id).name} đã tham gia đội hỗ trợ!` };
}

export function craftEquipment(state, id) {
  const a = migrateExpansion(state).adventure;
  const item = EQUIPMENT.find(e => e.id === id);
  if (!item || a.equipment.includes(id)) return { error: 'Trang bị không hợp lệ hoặc đã được chế tạo.' };
  if (state.gold < item.gold || a.shards < item.shards) return { error: 'Chưa đủ vàng hoặc mảnh đa vũ trụ. Kiếm mảnh từ cốt truyện, tháp và liên chiến trùm.' };
  state.gold -= item.gold; a.shards -= item.shards; a.equipment.push(id);
  return { message: `Chế tạo thành công ${item.name}!` };
}

export function equipEquipment(state, id) {
  const a = migrateExpansion(state).adventure;
  const item = EQUIPMENT.find(e => e.id === id);
  if (!item || !a.equipment.includes(id)) return { error: 'Bạn chưa sở hữu trang bị này.' };
  a.equipped[item.slot] = a.equipped[item.slot] === id ? null : id;
  return { message: a.equipped[item.slot] ? `Đã trang bị ${item.name}.` : `Đã tháo ${item.name}.` };
}

export const chapterCount = state => Object.values(state.adventure.story).reduce((sum, value) => sum + value, 0);
export function achievementProgress(state, achievement) {
  const a = migrateExpansion(state).adventure;
  const values = { chapters: chapterCount(state), tower: a.tower.best, rush: a.rush.wins, mini: a.mini.played, gear: a.equipment.length };
  return Math.min(achievement.target, values[achievement.key]);
}

export function claimAchievement(state, id) {
  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement || state.adventure.achievements.includes(id)) return { error: 'Mốc này không tồn tại hoặc đã nhận thưởng.' };
  if (achievementProgress(state, achievement) < achievement.target) return { error: 'Chưa hoàn thành mốc khám phá.' };
  state.adventure.achievements.push(id); state.gold += achievement.gold; state.gems += achievement.gems;
  return { message: `Nhận ${achievement.gold} vàng và ${achievement.gems} tinh thạch!` };
}

const busy = state => state.battle?.status === 'active';
export const modeName = battle => ({ story: 'Cốt truyện', tower: `Tháp · Tầng ${battle.stage}`, rush: `Liên chiến · Trùm ${battle.stage}/3` })[battle.mode] ?? null;

function specialBattle(state, stats, config) {
  const world = worldById(config.worldId);
  const player = { hp: stats.hp, maxHp: stats.maxHp ?? stats.hp, attack: stats.attack, defense: stats.defense, energy: stats.energy ?? 40, regen: stats.regen ?? 0, cooldown: 0 };
  state.battle = {
    ...config, characterId: config.characterId ?? state.activeCharacter,
    difficulty: config.stage >= 5 ? 'boss' : 'normal', status: 'active', turn: 1, player,
    supportIds: [...(config.supportIds ?? state.adventure.supports)].filter(id => id !== (config.characterId ?? state.activeCharacter)),
    enemy: { name: config.enemy, hp: Math.round(config.hp), maxHp: Math.round(config.hp), attack: Math.round(config.attack), defense: Math.round(config.defense) },
    logs: [{ type: 'system', text: `${modeName(config)}: ${config.objective} · ${world.land}.` }], rewards: null,
  };
  return { message: 'Thử thách mới bắt đầu!' };
}

export function startStory(state, worldId, chapter, choice, stats) {
  migrateExpansion(state);
  if (busy(state)) return { error: 'Hoàn thành hoặc rút lui khỏi trận hiện tại trước.' };
  if (!worldById(worldId) || !Number.isInteger(chapter) || !CHAPTERS[chapter] || chapter > state.adventure.story[worldId] || !['attack', 'guard'].includes(choice)) return { error: 'Chương chưa mở hoặc lựa chọn không hợp lệ.' };
  const world = worldById(worldId), detail = CHAPTERS[chapter];
  const modified = { ...stats, attack: stats.attack + (choice === 'attack' ? 4 : 0), defense: stats.defense + (choice === 'guard' ? 3 : 0) };
  return specialBattle(state, modified, {
    mode: 'story', worldId, stage: chapter + 1, chapter, choice, rule: detail.rule, objective: detail.objective,
    title: storyTitle(worldId, chapter), enemy: world.enemies[chapter === 4 ? 2 : chapter < 2 ? 0 : 1],
    hp: (detail.rule === 'survive' ? 250 : 100) * detail.multiplier,
    attack: 21 * detail.multiplier, defense: 3 + chapter * 1.5,
    maxTurns: detail.rule === 'speed' ? 6 : null,
  });
}

export function beginRun(state, mode, stats) {
  migrateExpansion(state);
  if (!['tower', 'rush'].includes(mode)) return { error: 'Chế độ không hợp lệ.' };
  if (busy(state)) return { error: 'Hoàn thành hoặc rút lui khỏi trận hiện tại trước.' };
  if (state.adventure[mode].run) return { error: 'Đang có lượt chơi. Tiếp tục hoặc kết thúc lượt đó trước.' };
  state.adventure[mode].run = { stage: 1, characterId: state.activeCharacter, status: 'ready', player: { ...stats, maxHp: stats.hp, energy: 40 }, origin: state.selectedWorld, supportIds: [...state.adventure.supports] };
  return nextRunBattle(state, mode);
}

export function nextRunBattle(state, mode) {
  const run = state.adventure[mode]?.run;
  if (busy(state) || !run || run.status !== 'ready') return { error: 'Lượt chơi chưa sẵn sàng để tiếp tục.' };
  const index = mode === 'tower' ? (run.stage - 1) % WORLDS.length : (WORLDS.findIndex(w => w.id === run.origin) + run.stage - 1) % WORLDS.length;
  const world = WORLDS[index];
  const multiplier = mode === 'tower' ? 0.65 + run.stage * 0.12 : 1.1 + run.stage * 0.18;
  run.status = 'fighting';
  return specialBattle(state, run.player, {
    mode, stage: run.stage, worldId: world.id, characterId: run.characterId, supportIds: run.supportIds ?? [], rule: 'duel',
    objective: mode === 'tower' ? 'Thắng và giữ sinh lực cho tầng kế tiếp' : 'Đánh bại trùm trong tối đa 8 lượt',
    title: mode === 'tower' ? `Tháp vô tận · Tầng ${run.stage}` : `Liên chiến · ${world.enemies[2]}`,
    enemy: world.enemies[mode === 'rush' || run.stage % 5 === 0 ? 2 : 1],
    hp: 90 * multiplier, attack: 20 * multiplier, defense: 3 + run.stage,
    maxTurns: mode === 'rush' ? 8 : null,
  });
}

export function chooseBoon(state, choice) {
  const run = state.adventure.tower.run;
  if (!run || run.status !== 'choice' || !['attack', 'guard', 'heal'].includes(choice)) return { error: 'Chưa thể chọn phước lành.' };
  if (choice === 'attack') run.player.attack += 5;
  if (choice === 'guard') { run.player.defense += 2; run.player.maxHp += 15; run.player.hp += 15; }
  if (choice === 'heal') run.player.hp = Math.min(run.player.maxHp, run.player.hp + Math.round(run.player.maxHp * 0.45));
  run.status = 'ready';
  return { message: 'Phước lành đã áp dụng. Sẵn sàng cho tầng tiếp theo!' };
}

export function endRun(state, mode) {
  const run = state.adventure[mode]?.run;
  if (!run || run.status === 'fighting' || busy(state)) return { error: 'Hoàn thành hoặc rút lui khỏi trận trước khi kết thúc lượt chơi.' };
  state.adventure[mode].run = null;
  return { message: 'Đã kết thúc lượt chơi, các phần thưởng đã kiếm được vẫn được giữ.' };
}

export function settleAdventureBattle(state, won) {
  const b = state.battle, a = state.adventure;
  if (b.mode === 'story') {
    const first = won && b.chapter === a.story[b.worldId];
    if (first) a.story[b.worldId]++;
    return won ? { gold: first ? 220 + b.chapter * 40 : 60, gems: first ? 25 : 3, xp: first ? 70 : 20, points: first ? 80 : 15, shards: first ? 2 : 0 } : { gold: 0, gems: 0, xp: 15, points: 0, shards: 0 };
  }
  const run = a[b.mode].run;
  if (!won) { a[b.mode].run = null; return { gold: 0, gems: 0, xp: 15, points: 0, shards: 0 }; }
  run.player = { ...b.player, cooldown: 0 };
  run.stage++;
  if (b.mode === 'tower') {
    a.tower.best = Math.max(a.tower.best, b.stage); run.status = 'choice';
    return { gold: 70 + b.stage * 15, gems: 5, xp: 30, points: 25, shards: b.stage % 3 === 0 ? 1 : 0 };
  }
  if (b.stage === 3) { a.rush.wins++; a.rush.run = null; return { gold: 700, gems: 75, xp: 160, points: 150, shards: 5 }; }
  run.player.hp = Math.min(run.player.maxHp, run.player.hp + Math.round(run.player.maxHp * 0.2)); run.status = 'ready';
  return { gold: 150, gems: 10, xp: 60, points: 50, shards: 1 };
}

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

export function startMini(state, kind, random = Math.random, now = Date.now()) {
  const mini = migrateExpansion(state).adventure.mini;
  if (!['memory', 'reflex', 'quiz'].includes(kind)) return { error: 'Mini game không hợp lệ.' };
  if (mini.session?.status === 'active') return { error: 'Hoàn thành hoặc kết thúc mini game đang chơi trước.' };
  const base = { kind, status: 'active', startedAt: now, score: 0, paid: false };
  if (kind === 'memory') { const worlds = shuffle(WORLDS.map(w => w.id), random).slice(0, 6); Object.assign(base, { cards: shuffle([...worlds, ...worlds], random), matched: [], open: [], moves: 0 }); }
  if (kind === 'reflex') Object.assign(base, { target: Math.floor(random() * 12), endsAt: now + 20000, streak: 0, hits: 0, misses: 0 });
  if (kind === 'quiz') Object.assign(base, { questions: shuffle(QUIZ.map((_, i) => i), random).slice(0, 5), index: 0, correct: 0, answers: [] });
  mini.session = base;
  return { message: 'Bắt đầu mini game!' };
}

export function finishMini(state, today) {
  const mini = state.adventure.mini, s = mini.session;
  if (!s || s.status !== 'active') return { error: 'Lượt chơi đã kết thúc.' };
  s.status = 'finished'; mini.played++;
  mini.best[s.kind] = Math.max(mini.best[s.kind], s.score);
  if (mini.daily.date !== today) mini.daily = { date: today, memory: 0, reflex: 0, quiz: 0 };
  const eligible = (s.kind === 'memory' && s.matched.length === 12) || (s.kind === 'quiz' && s.correct > 0) || (s.kind === 'reflex' && s.hits >= 5);
  s.paid = eligible && mini.daily[s.kind] < 3;
  s.reward = s.paid ? { gold: 50 + Math.min(150, Math.floor(s.score / 5)), gems: Math.min(15, 3 + Math.floor(s.score / 100)) } : { gold: 0, gems: 0 };
  if (s.paid) { state.gold += s.reward.gold; state.gems += s.reward.gems; mini.daily[s.kind]++; }
  return { message: s.paid ? `Hoàn thành! +${s.reward.gold} vàng, +${s.reward.gems} tinh thạch.` : 'Đã hoàn thành lượt chơi. Điểm kỷ lục đã được cập nhật.' };
}

export function miniAction(state, value, today, random = Math.random, now = Date.now()) {
  const s = state.adventure.mini.session;
  if (!s || s.status !== 'active') return { error: 'Không có mini game đang diễn ra.' };
  if (s.kind === 'memory') {
    if (value === 'continue') { if (s.open.length !== 2) return { error: 'Chưa có cặp thẻ cần đóng.' }; s.open = []; return {}; }
    if (!Number.isInteger(value) || value < 0 || value > 11 || s.open.includes(value) || s.matched.includes(value) || s.open.length === 2) return { error: 'Thẻ này chưa thể lật.' };
    s.open.push(value);
    if (s.open.length === 2) {
      s.moves++;
      if (s.cards[s.open[0]] === s.cards[s.open[1]]) { s.matched.push(...s.open); s.open = []; }
      if (s.matched.length === 12) { s.score = Math.max(100, 1000 - (s.moves - 6) * 35); return finishMini(state, today); }
    }
  } else if (s.kind === 'reflex') {
    if (now >= s.endsAt) return finishMini(state, today);
    if (!Number.isInteger(value) || value < 0 || value > 11) return { error: 'Mục tiêu không hợp lệ.' };
    if (value === s.target) { s.hits++; s.streak++; s.score += 10 + Math.min(10, s.streak); const offset = 1 + Math.floor(random() * 11); s.target = (s.target + offset) % 12; }
    else { s.misses++; s.streak = 0; s.score = Math.max(0, s.score - 5); }
  } else {
    if (value === 'continue') { if (s.answers.length !== s.index + 1) return { error: 'Hãy chọn đáp án trước.' }; s.index++; if (s.index === 5) { s.score = s.correct * 200; return finishMini(state, today); } return {}; }
    if (!Number.isInteger(value) || value < 0 || value > 3 || s.answers.length !== s.index) return { error: 'Câu hỏi này đã trả lời hoặc đáp án không hợp lệ.' };
    s.answers.push(value); if (value === QUIZ[s.questions[s.index]].correct) s.correct++;
  }
  return {};
}

export function endMini(state) {
  if (!state.adventure.mini.session) return { error: 'Không có lượt chơi.' };
  state.adventure.mini.session = null;
  return { message: 'Đã về khu vui chơi.' };
}
