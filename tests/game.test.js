import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, CHARACTERS, QUESTS } from '../src/data.js';
import { freshState, loadState, parseSave, startBattle, battleAction, enemyIntent, rankFor, upgradeCharacter, statsFor, recruit, claimQuest, questProgress, buyPotion, refreshDaily, totalPoints } from '../src/game.js';

const rng = () => 0.5;
function win(state, tactical = false) {
  for (let turn = 0; turn < 40 && state.battle.status === 'active'; turn++) {
    const player = state.battle.player;
    const action = tactical && player.hp < 70 && state.potions ? 'potion' : tactical && enemyIntent(state.battle).strong ? 'guard' : player.energy >= 100 ? 'ultimate' : player.energy >= 35 && player.cooldown === 0 ? 'skill' : 'attack';
    battleAction(state, action, rng);
  }
  assert.equal(state.battle.status, 'won');
}

test('every universe is playable with its starting hero and has seven increasing ranks', () => {
  for (const world of WORLDS) {
    const state = freshState();
    state.selectedWorld = world.id;
    state.activeCharacter = world.character;
    assert.equal(startBattle(state).error, undefined);
    win(state);
    assert.equal(state.worldProgress[world.id].wins, 1);
    assert.equal(state.worldProgress[world.id].points, 65);
    assert.equal(world.ranks.length, 7);
    assert.equal(rankFor(world.id, 120).name, world.ranks[1]);
    assert.equal(rankFor(world.id, 3200).name, world.ranks[6]);
    assert.equal(rankFor(world.id, 5000).next, undefined);
  }
});

test('combat rewards, XP, quests and history are awarded exactly once', () => {
  const state = freshState();
  startBattle(state);
  win(state);
  assert.equal(state.gold, 1660);
  assert.equal(state.gems, 135);
  assert.equal(state.xp, 55);
  assert.equal(state.daily.matches, 1);
  assert.equal(state.history.length, 1);
  const before = JSON.stringify(state);
  assert.ok(battleAction(state, 'attack').error);
  assert.equal(JSON.stringify(state), before);
  assert.equal(questProgress(state, QUESTS[0]), 1);
});

test('invalid, low-energy and cooling-down actions do not advance a turn', () => {
  const state = freshState();
  startBattle(state);
  let before = JSON.stringify(state);
  assert.ok(battleAction(state, 'ultimate').error);
  assert.ok(battleAction(state, 'invalid').error);
  assert.equal(JSON.stringify(state), before);
  battleAction(state, 'skill', rng);
  assert.equal(state.battle.player.cooldown, 2);
  before = JSON.stringify(state);
  assert.ok(battleAction(state, 'skill').error);
  assert.equal(JSON.stringify(state), before);
  battleAction(state, 'guard', rng);
  assert.equal(state.battle.player.cooldown, 1);
  battleAction(state, 'guard', rng);
  assert.equal(state.battle.player.cooldown, 0);
  assert.equal(battleAction(state, 'skill', rng).error, undefined);
});

test('guard reduces the enemy strong attack by 70% and adds energy', () => {
  const normal = freshState();
  startBattle(normal, 'normal');
  normal.battle.turn = 3;
  const defended = structuredClone(normal);
  assert.equal(enemyIntent(normal.battle).strong, true);
  const hit = battleAction(normal, 'attack', rng);
  const blocked = battleAction(defended, 'guard', rng);
  assert.ok(blocked.incoming <= hit.incoming * 0.3 + 1);
  assert.equal(defended.battle.player.energy, 70);
});

test('potions heal, consume inventory and a turn without exceeding max HP', () => {
  const state = freshState();
  startBattle(state);
  assert.ok(battleAction(state, 'potion').error);
  assert.equal(state.potions, 3);
  state.battle.player.hp = 100;
  battleAction(state, 'potion', rng);
  assert.equal(state.potions, 2);
  assert.ok(state.battle.player.hp <= 160);
  assert.equal(state.battle.turn, 2);
  state.potions = 0;
  const before = JSON.stringify(state);
  assert.ok(battleAction(state, 'potion').error);
  assert.equal(JSON.stringify(state), before);
});

test('boss requires two wins in the chosen world, then gives higher rewards', () => {
  const state = freshState();
  assert.ok(startBattle(state, 'boss').error);
  startBattle(state); win(state);
  startBattle(state); win(state);
  assert.equal(state.level, 2);
  assert.equal(state.xp, 10);
  upgradeCharacter(state, 'goku');
  assert.equal(startBattle(state, 'boss').error, undefined);
  win(state, true);
  assert.equal(state.battle.rewards.points, 180);
  state.selectedWorld = 'naruto';
  assert.ok(startBattle(state, 'boss').error);
});

test('an active battle cannot be overwritten by starting another', () => {
  const state = freshState();
  startBattle(state);
  battleAction(state, 'attack', rng);
  const before = JSON.stringify(state.battle);
  state.selectedWorld = 'naruto';
  startBattle(state, 'normal');
  assert.equal(JSON.stringify(state.battle), before);
});

test('defeat and retreat count as completed matches without win rewards', () => {
  for (const retreat of [true, false]) {
    const state = freshState();
    startBattle(state);
    state.battle.player.hp = 1;
    battleAction(state, retreat ? 'retreat' : 'guard', rng);
    assert.equal(state.battle.status, 'lost');
    assert.equal(state.gold, 1500);
    assert.equal(state.gems, 120);
    assert.equal(state.xp, 15);
    assert.equal(state.worldProgress['dragon-ball'].matches, 1);
    assert.equal(state.daily.wins, 0);
  }
});

test('daily quest rewards cannot be claimed early or more than once', () => {
  const state = freshState();
  assert.ok(claimQuest(state, 'first-win').error);
  startBattle(state); win(state);
  assert.equal(claimQuest(state, 'first-win').error, undefined);
  assert.equal(state.gold, 1860);
  assert.equal(state.gems, 165);
  const before = JSON.stringify(state);
  assert.ok(claimQuest(state, 'first-win').error);
  assert.equal(JSON.stringify(state), before);
});

test('daily reset preserves total progression and refreshes all quests', () => {
  const state = freshState();
  startBattle(state); win(state);
  claimQuest(state, 'first-win');
  state.daily.date = '2000-01-01';
  refreshDaily(state);
  assert.equal(state.daily.wins, 0);
  assert.deepEqual(state.daily.claimed, []);
  assert.equal(totalPoints(state), 65);
  assert.equal(state.gold, 1860);
});

test('exploration quests count distinct worlds, not repeated matches', () => {
  const state = freshState();
  for (const id of ['dragon-ball', 'dragon-ball', 'naruto', 'one-piece']) {
    state.selectedWorld = id;
    startBattle(state); win(state);
  }
  assert.equal(state.daily.worlds.length, 3);
  assert.equal(questProgress(state, QUESTS[3]), 3);
  assert.equal(claimQuest(state, 'explore').error, undefined);
});

test('upgrades spend gold, increase stats, respect level cap and apply to subsequent fights', () => {
  const state = freshState();
  startBattle(state);
  assert.equal(upgradeCharacter(state, 'goku').error, undefined);
  assert.equal(state.gold, 1320);
  assert.equal(statsFor(state).hp, 174);
  assert.equal(statsFor(state).attack, 28);
  assert.equal(state.battle.player.maxHp, 160);
  assert.equal(state.daily.upgrades, 1);
  state.gold = 0;
  assert.ok(upgradeCharacter(state, 'goku').error);
  state.characterLevels.goku = 20;
  assert.ok(upgradeCharacter(state, 'goku').error);
  assert.ok(upgradeCharacter(state, 'vegeta').error);
});

test('recruitment and potion shop never overspend or charge twice for the same hero', () => {
  const state = freshState();
  assert.ok(recruit(state, 'vegeta').error);
  state.gems = 250;
  assert.equal(recruit(state, 'vegeta').error, undefined);
  assert.equal(state.gems, 0);
  assert.ok(state.unlocked.includes('vegeta'));
  assert.ok(recruit(state, 'vegeta').error);
  buyPotion(state);
  assert.equal(state.gold, 1350);
  assert.equal(state.potions, 4);
  state.gold = 149;
  assert.ok(buyPotion(state).error);
  assert.equal(state.gold, 149);
});

test('ghouls and slime regenerate after surviving enemy attacks', () => {
  const state = freshState();
  state.activeCharacter = 'kaneki';
  startBattle(state);
  const hp = state.battle.player.hp;
  const hit = battleAction(state, 'attack', rng);
  assert.equal(state.battle.player.hp, hp - hit.incoming + 5);
});

test('saving preserves active combat and completed battle rewards', () => {
  const state = freshState();
  startBattle(state); battleAction(state, 'attack', rng);
  const resumed = loadState({ getItem: () => JSON.stringify(state) });
  assert.deepEqual(resumed, state);
  win(resumed);
  assert.deepEqual(parseSave(JSON.stringify(resumed)), resumed);
});

test('invalid or inaccessible saves safely recover, and malformed imports are rejected', () => {
  assert.deepEqual(loadState({ getItem: () => '{bad' }), freshState());
  assert.deepEqual(loadState({ getItem: () => { throw new Error('Storage denied'); } }), freshState());
  assert.equal(parseSave('{bad'), null);
  for (const field of ['worldProgress', 'daily', 'unlocked', 'characterLevels']) {
    const invalid = freshState(); delete invalid[field];
    assert.equal(parseSave(JSON.stringify(invalid)), null);
  }
  const invalid = freshState(); startBattle(invalid); invalid.battle.player.energy = 500;
  assert.equal(parseSave(JSON.stringify(invalid)), null);
});

test('every premium hero uses unique skills and remains playable when recruited', () => {
  for (const character of CHARACTERS.filter(c => !c.free)) {
    const state = freshState(); state.gems = 250;
    recruit(state, character.id); state.activeCharacter = character.id;
    state.selectedWorld = character.world;
    startBattle(state); battleAction(state, 'skill', rng);
    assert.ok(state.battle.logs.some(log => log.text.startsWith(character.skill)));
    win(state);
  }
});
