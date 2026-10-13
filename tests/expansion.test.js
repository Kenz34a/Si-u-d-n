import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS } from '../src/data.js';
import { QUIZ } from '../src/content.js';
import { freshState, statsFor, startBattle, battleAction, parseSave, selectCharacter } from '../src/game.js';
import { startStory, beginRun, nextRunBattle, chooseBoon, endRun, craftEquipment, equipEquipment, toggleSupport, startMini, miniAction, finishMini, claimAchievement, endMini } from '../src/expansion.js';

const today = '2026-10-14';
const rng = () => 0.5;
function playToWin(state) {
  for (let i = 0; i < 50 && state.battle.status === 'active'; i++) {
    const p = state.battle.player, b = state.battle;
    const action = p.hp < 60 && state.potions > 0 && b.rule !== 'no-potion' ? 'potion' : p.energy >= 100 ? 'ultimate' : p.energy >= 35 && !p.cooldown ? 'skill' : b.turn % 3 === 0 ? 'guard' : 'attack';
    battleAction(state, action, rng);
  }
  assert.equal(state.battle.status, 'won');
}
function preparedState() {
  const state = freshState(); state.characterLevels.goku = 8; state.potions = 20;
  return state;
}

test('old saves migrate without losing hero levels, resources, rank points or an active battle', () => {
  const state = freshState(); startBattle(state); battleAction(state, 'attack', rng);
  state.gold = 2356; state.characterLevels.goku = 4; state.worldProgress.naruto.points = 450;
  delete state.adventure; delete state.battle.mode; delete state.battle.supportIds;
  const migrated = parseSave(JSON.stringify(state));
  assert.equal(migrated.gold, 2356); assert.equal(migrated.characterLevels.goku, 4);
  assert.equal(migrated.worldProgress.naruto.points, 450); assert.equal(migrated.battle.turn, 2);
  assert.equal(migrated.adventure.shards, 2); assert.deepEqual(migrated.adventure.supports, []);
});

test('story chapters unlock sequentially in each of the sixteen worlds', () => {
  for (const world of WORLDS) {
    const state = preparedState();
    assert.ok(startStory(state, world.id, 1, 'attack', statsFor(state)).error);
    startStory(state, world.id, 0, 'attack', statsFor(state)); playToWin(state);
    assert.equal(state.adventure.story[world.id], 1);
    assert.equal(state.adventure.shards, 4);
    assert.equal(startStory(state, world.id, 1, 'guard', statsFor(state)).error, undefined);
    playToWin(state);
    assert.equal(state.adventure.story[world.id], 2);
  }
});

test('first story completion and replay give different rewards without skipping chapters', () => {
  const state = preparedState();
  startStory(state, 'naruto', 0, 'attack', statsFor(state)); playToWin(state);
  assert.equal(state.battle.rewards.gold, 220); assert.equal(state.battle.rewards.shards, 2);
  startStory(state, 'naruto', 0, 'guard', statsFor(state)); playToWin(state);
  assert.equal(state.adventure.story.naruto, 1);
  assert.equal(state.battle.rewards.gold, 60); assert.equal(state.battle.rewards.shards, 0);
});

test('story combat choices change the battle snapshot rather than permanent stats', () => {
  const attack = freshState(), guard = freshState();
  const original = statsFor(attack);
  startStory(attack, 'naruto', 0, 'attack', original);
  startStory(guard, 'naruto', 0, 'guard', statsFor(guard));
  assert.equal(attack.battle.player.attack, original.attack + 4);
  assert.equal(guard.battle.player.defense, original.defense + 3);
  assert.equal(statsFor(attack).attack, original.attack);
});

test('speed objectives fail after six completed turns and cannot unlock the next chapter', () => {
  const state = preparedState(); state.adventure.story.naruto = 1;
  startStory(state, 'naruto', 1, 'guard', statsFor(state));
  for (let i = 0; i < 6; i++) battleAction(state, 'guard', rng);
  assert.equal(state.battle.status, 'lost');
  assert.equal(state.adventure.story.naruto, 1);
  assert.equal(state.battle.rewards.gold, 0);
});

test('survival objectives succeed by enduring six turns with the enemy still alive', () => {
  const state = preparedState(); state.adventure.story.bleach = 2;
  startStory(state, 'bleach', 2, 'guard', statsFor(state));
  for (let i = 0; i < 6; i++) battleAction(state, 'guard', rng);
  assert.equal(state.battle.status, 'won'); assert.ok(state.battle.enemy.hp > 0);
  assert.equal(state.adventure.story.bleach, 3);
});

test('no-potion chapters reject potion use without consuming inventory or a turn', () => {
  const state = preparedState(); state.adventure.story.sao = 3;
  startStory(state, 'sao', 3, 'attack', statsFor(state));
  state.battle.player.hp -= 20;
  const before = JSON.stringify(state);
  assert.ok(battleAction(state, 'potion').error); assert.equal(JSON.stringify(state), before);
  playToWin(state); assert.equal(state.adventure.story.sao, 4);
});

test('all five chapters can be completed and the final reward is a one-time progression reward', () => {
  const state = preparedState();
  for (let chapter = 0; chapter < 5; chapter++) {
    startStory(state, 'dragon-ball', chapter, 'attack', statsFor(state)); playToWin(state);
  }
  assert.equal(state.adventure.story['dragon-ball'], 5);
  assert.equal(state.adventure.shards, 12);
  assert.ok(startStory(state, 'dragon-ball', 5, 'attack', statsFor(state)).error);
});

test('tower carries damage and energy, forces exactly one boon and stores the best floor', () => {
  const state = freshState();
  beginRun(state, 'tower', statsFor(state)); playToWin(state);
  const endingHp = state.battle.player.hp, endingEnergy = state.battle.player.energy;
  assert.equal(state.adventure.tower.best, 1);
  assert.equal(state.adventure.tower.run.player.hp, endingHp);
  assert.ok(nextRunBattle(state, 'tower').error);
  const attack = state.adventure.tower.run.player.attack;
  chooseBoon(state, 'attack');
  assert.equal(state.adventure.tower.run.player.attack, attack + 5);
  assert.ok(chooseBoon(state, 'guard').error);
  nextRunBattle(state, 'tower');
  assert.equal(state.battle.player.hp, endingHp); assert.equal(state.battle.player.energy, endingEnergy);
  assert.equal(state.battle.stage, 2);
});

test('healing and defense boons respect HP limits and cannot be purchased outside a choice', () => {
  const state = preparedState();
  beginRun(state, 'tower', statsFor(state)); playToWin(state);
  const run = state.adventure.tower.run, max = run.player.maxHp;
  chooseBoon(state, 'guard');
  assert.equal(run.player.maxHp, max + 15); assert.ok(run.player.hp <= run.player.maxHp);
  nextRunBattle(state, 'tower'); playToWin(state);
  chooseBoon(state, 'heal'); assert.ok(run.player.hp <= run.player.maxHp);
  assert.ok(chooseBoon(state, 'invalid').error);
});

test('tower defeat ends the run, keeps prior rewards and allows a fresh run', () => {
  const state = freshState();
  beginRun(state, 'tower', statsFor(state)); playToWin(state); chooseBoon(state, 'heal');
  const gold = state.gold; nextRunBattle(state, 'tower'); battleAction(state, 'retreat');
  assert.equal(state.adventure.tower.run, null); assert.equal(state.adventure.tower.best, 1);
  assert.equal(state.gold, gold); beginRun(state, 'tower', statsFor(state));
  assert.equal(state.battle.stage, 1);
});

test('rush cycles across three worlds, heals only 20% and pays the finale once', () => {
  const state = preparedState(); beginRun(state, 'rush', statsFor(state));
  const worlds = [];
  for (let stage = 1; stage <= 3; stage++) {
    worlds.push(state.battle.worldId); playToWin(state);
    if (stage < 3) {
      const p = state.battle.player, run = state.adventure.rush.run;
      assert.equal(run.player.hp, Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.2)));
      nextRunBattle(state, 'rush');
    }
  }
  assert.equal(new Set(worlds).size, 3); assert.equal(state.adventure.rush.run, null);
  assert.equal(state.adventure.rush.wins, 1); assert.equal(state.battle.rewards.shards, 5);
  assert.equal(state.battle.rewards.gold, 700);
  const gold = state.gold; assert.ok(battleAction(state, 'attack').error); assert.equal(state.gold, gold);
});

test('modes cannot overwrite active combat or an ongoing run', () => {
  const state = freshState(); startBattle(state);
  const before = JSON.stringify(state);
  assert.ok(startStory(state, 'naruto', 0, 'attack', statsFor(state)).error);
  assert.ok(beginRun(state, 'tower', statsFor(state)).error);
  assert.equal(JSON.stringify(state), before);
  battleAction(state, 'retreat'); beginRun(state, 'tower', statsFor(state)); playToWin(state);
  assert.ok(beginRun(state, 'tower', statsFor(state)).error);
  assert.equal(endRun(state, 'tower').error, undefined);
});

test('crafting spends both resources, prevents duplicate charges and equipping swaps same-slot items', () => {
  const state = freshState();
  craftEquipment(state, 'dragon-ball-weapon');
  assert.equal(state.gold, 1200); assert.equal(state.adventure.shards, 1);
  assert.ok(craftEquipment(state, 'dragon-ball-weapon').error);
  equipEquipment(state, 'dragon-ball-weapon'); assert.equal(statsFor(state).attack, 32);
  craftEquipment(state, 'naruto-weapon'); equipEquipment(state, 'naruto-weapon');
  assert.equal(statsFor(state).attack, 32);
  equipEquipment(state, 'naruto-weapon'); assert.equal(statsFor(state).attack, 25);
  assert.ok(craftEquipment(state, 'bleach-charm').error);
  assert.ok(equipEquipment(state, 'slime-armor').error);
});

test('supports enforce ownership, two slots and different active hero; bonuses and combo are functional', () => {
  const state = freshState();
  assert.ok(toggleSupport(state, 'goku').error); assert.ok(toggleSupport(state, 'vegeta').error);
  toggleSupport(state, 'naruto'); toggleSupport(state, 'rimuru');
  assert.ok(toggleSupport(state, 'kirito').error);
  assert.equal(statsFor(state).hp, 182); assert.equal(statsFor(state).regen, 2);
  startBattle(state); battleAction(state, 'support', rng);
  assert.ok(state.battle.enemy.hp < state.battle.enemy.maxHp);
  assert.equal(state.battle.player.supportCooldown, 3);
  const before = JSON.stringify(state);
  assert.ok(battleAction(state, 'support').error); assert.equal(JSON.stringify(state), before);
  selectCharacter(state, 'naruto'); assert.deepEqual(state.adventure.supports, ['rimuru']);
});

test('gear and support changes do not change stats already captured by an active run', () => {
  const state = freshState(); beginRun(state, 'tower', statsFor(state));
  const snapshot = { ...state.battle.player };
  craftEquipment(state, 'dragon-ball-weapon'); equipEquipment(state, 'dragon-ball-weapon'); toggleSupport(state, 'rimuru');
  assert.deepEqual(state.battle.player, snapshot);
  playToWin(state); chooseBoon(state, 'attack'); nextRunBattle(state, 'tower');
  assert.equal(state.battle.player.attack, snapshot.attack + 5);
  assert.deepEqual(state.battle.supportIds, []);
});

function solveMemory(state) {
  const s = state.adventure.mini.session;
  const pairs = new Map();
  s.cards.forEach((world, index) => pairs.set(world, [...(pairs.get(world) ?? []), index]));
  for (const pair of pairs.values()) for (const index of pair) miniAction(state, index, today, rng);
}

test('memory matches six randomized pairs, rejects open cards, and pays completion once', () => {
  const state = freshState(); startMini(state, 'memory', rng);
  const s = state.adventure.mini.session;
  miniAction(state, 0, today);
  assert.ok(miniAction(state, 0, today).error);
  const matching = s.cards.findIndex((world, i) => i !== 0 && world === s.cards[0]);
  miniAction(state, matching, today);
  const pairs = new Map(); s.cards.forEach((id, i) => { if (!s.matched.includes(i)) pairs.set(id, [...(pairs.get(id) ?? []), i]); });
  for (const pair of pairs.values()) for (const index of pair) miniAction(state, index, today);
  assert.equal(s.status, 'finished'); assert.equal(s.score, 1000); assert.equal(s.moves, 6);
  assert.equal(state.adventure.mini.played, 1);
  const gold = state.gold; assert.ok(finishMini(state, today).error); assert.equal(state.gold, gold);
});

test('memory mismatches remain visible until continued and cost an extra move', () => {
  const state = freshState(); startMini(state, 'memory', rng);
  const s = state.adventure.mini.session;
  miniAction(state, 0, today); miniAction(state, s.cards.findIndex(id => id !== s.cards[0]), today);
  assert.equal(s.open.length, 2); assert.equal(s.moves, 1);
  assert.ok(miniAction(state, 5, today).error);
  miniAction(state, 'continue', today); assert.deepEqual(s.open, []);
  solveMemory(state); assert.equal(s.score, 965);
});

test('each mini game pays at most three completions a day, while practice still tracks scores', () => {
  const state = freshState();
  for (let i = 0; i < 4; i++) { startMini(state, 'memory', rng); solveMemory(state); }
  assert.equal(state.adventure.mini.daily.memory, 3); assert.equal(state.adventure.mini.session.paid, false);
  assert.equal(state.adventure.mini.played, 4); assert.equal(state.adventure.mini.best.memory, 1000);
  startMini(state, 'memory', rng);
  const s = state.adventure.mini.session;
  const pairs = new Map(); s.cards.forEach((id, i) => pairs.set(id, [...(pairs.get(id) ?? []), i]));
  for (const pair of pairs.values()) for (const index of pair) miniAction(state, index, '2026-10-15', rng);
  assert.equal(state.adventure.mini.daily.memory, 1); assert.equal(s.paid, true);
});

test('reflex combos award points, misses reset streak, deadlines prevent late clicks and idle runs do not pay', () => {
  const state = freshState(); startMini(state, 'reflex', rng, 1000);
  const s = state.adventure.mini.session;
  for (let i = 0; i < 5; i++) miniAction(state, s.target, today, rng, 2000 + i * 100);
  assert.equal(s.hits, 5); assert.equal(s.streak, 5); assert.equal(s.score, 65);
  miniAction(state, (s.target + 1) % 12, today, rng, 3000);
  assert.equal(s.streak, 0); assert.equal(s.score, 60);
  miniAction(state, s.target, today, rng, 21000);
  assert.equal(s.status, 'finished'); assert.equal(s.hits, 5); assert.equal(s.paid, true);
  startMini(state, 'reflex', rng, 25000); miniAction(state, 0, today, rng, 45000);
  assert.equal(state.adventure.mini.session.paid, false);
});

test('quiz locks answers, explains correctness and scores exactly five different questions', () => {
  const state = freshState(); startMini(state, 'quiz', rng);
  const s = state.adventure.mini.session;
  assert.equal(new Set(s.questions).size, 5);
  for (let i = 0; i < 5; i++) {
    const correct = QUIZ[s.questions[i]].correct;
    miniAction(state, correct, today);
    assert.ok(miniAction(state, correct, today).error);
    miniAction(state, 'continue', today);
  }
  assert.equal(s.status, 'finished'); assert.equal(s.correct, 5); assert.equal(s.score, 1000); assert.equal(s.paid, true);
});

test('mini game sessions resume with their existing cards, answers or deadline; cancellation gives no reward', () => {
  for (const kind of ['memory', 'quiz', 'reflex']) {
    const state = freshState(); startMini(state, kind, rng);
    const restored = parseSave(JSON.stringify(state));
    assert.deepEqual(restored.adventure.mini.session, state.adventure.mini.session);
    assert.ok(startMini(state, 'memory').error);
    const gold = state.gold; endMini(state); assert.equal(state.gold, gold);
    assert.equal(state.adventure.mini.played, 0);
  }
});

test('achievement rewards are permanent and cannot be claimed early or twice', () => {
  const state = preparedState(); assert.ok(claimAchievement(state, 'story-1').error);
  startStory(state, 'dragon-ball', 0, 'attack', statsFor(state)); playToWin(state);
  const gold = state.gold; claimAchievement(state, 'story-1'); assert.equal(state.gold, gold + 200);
  assert.ok(claimAchievement(state, 'story-1').error);
});

test('expansion saves validate active tower and between-floor choices and reject corrupt loadouts', () => {
  const state = freshState(); beginRun(state, 'tower', statsFor(state));
  assert.deepEqual(parseSave(JSON.stringify(state)), state);
  playToWin(state); assert.deepEqual(parseSave(JSON.stringify(state)), state);
  const invalid = structuredClone(state); invalid.adventure.equipped.weapon = 'fake-weapon';
  assert.equal(parseSave(JSON.stringify(invalid)), null);
  const bad = structuredClone(state); bad.battle.mode = 'fake-mode';
  assert.equal(parseSave(JSON.stringify(bad)), null);
  const mini = freshState(); startMini(mini, 'quiz', rng); mini.adventure.mini.session.index = 5;
  assert.equal(parseSave(JSON.stringify(mini)), null);
  const invalidRegen = freshState(); startBattle(invalidRegen); invalidRegen.battle.player.regen = 'bad';
  assert.equal(parseSave(JSON.stringify(invalidRegen)), null);
});
