import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, CHARACTERS, LEGACY_WORLD_IDS, RANK_THRESHOLDS, characterById } from '../src/data.js';
import { NEW_WORLDS, NEW_CHARACTERS } from '../src/new-anime.js';
import { EQUIPMENT, SUPPORTS, QUIZ, STORY_TOTAL, ACHIEVEMENTS, storyTitle } from '../src/content.js';
import { freshState, parseSave, startBattle, battleAction, statsFor, rankFor, recruit } from '../src/game.js';
import { startStory, beginRun, startMini, nextRunBattle, craftEquipment, equipEquipment, toggleSupport } from '../src/expansion.js';
import { portrait, landscape } from '../src/art.js';

function legacyState(state = freshState()) {
  delete state.catalogVersion;
  state.unlocked = state.unlocked.filter(id => LEGACY_WORLD_IDS.includes(characterById(id).world));
  for (const world of NEW_WORLDS) { delete state.worldProgress[world.id]; delete state.adventure.story[world.id]; }
  for (const character of NEW_CHARACTERS) delete state.characterLevels[character.id];
  return state;
}

test('catalog contains exactly the requested sixteen worlds, 32 heroes, 80 chapters, 48 equipment and 32 questions', () => {
  assert.equal(WORLDS.length, 16); assert.equal(CHARACTERS.length, 32);
  assert.equal(STORY_TOTAL, 80); assert.equal(EQUIPMENT.length, 48); assert.equal(QUIZ.length, 32);
  assert.equal(new Set(WORLDS.map(w => w.id)).size, WORLDS.length);
  assert.equal(new Set(CHARACTERS.map(c => c.id)).size, CHARACTERS.length);
  assert.deepEqual(NEW_WORLDS.map(w => w.id), ['solo-leveling', 'wistoria', 'black-clover', 'jujutsu-kaisen', 'seven-deadly-sins', 'fate-zero', 'demon-slayer', 'fairy-tail']);
});

test('each added world has starter and recruit heroes, distinct ranks and complete story, equipment and support content', () => {
  for (const world of NEW_WORLDS) {
    const heroes = CHARACTERS.filter(c => c.world === world.id);
    assert.equal(heroes.length, 2); assert.equal(heroes.filter(c => c.free).length, 1);
    assert.equal(heroes.find(c => c.free).id, world.character);
    assert.equal(world.ranks.length, 7); assert.equal(new Set(world.ranks).size, 7);
    for (let i = 0; i < 7; i++) assert.equal(rankFor(world.id, RANK_THRESHOLDS[i]).name, world.ranks[i]);
    for (let chapter = 0; chapter < 5; chapter++) assert.ok(storyTitle(world.id, chapter));
    assert.equal(EQUIPMENT.filter(e => e.world === world.id).length, 3);
    assert.ok(SUPPORTS[world.id].name);
    assert.ok(world.quiz.every(q => q.answers.length === 4 && q.answers[q.correct] && q.explanation));
  }
});

test('all sixteen added heroes render distinct accessible pixel sprites without invalid values', () => {
  const illustrations = NEW_CHARACTERS.map(c => portrait(c, NEW_WORLDS.find(w => w.id === c.world).color));
  assert.equal(new Set(illustrations.map(svg => svg.replace(/portrait-\d+/g, 'portrait'))).size, 16);
  for (const illustration of illustrations) { assert.ok(illustration.includes('role="img"')); assert.ok(!illustration.includes('undefined')); }
  for (const world of NEW_WORLDS) assert.ok(!landscape(world).includes('undefined'));
});

test('a real eight-world save upgrades in place, preserving currency, levels, original rank, crafting and claimed achievements', () => {
  const old = legacyState(); old.gold = 2345; old.gems = 450; old.potions = 7;
  old.characterLevels.goku = 6; old.unlocked.push('vegeta');
  old.worldProgress.naruto = { wins: 5, matches: 8, points: 850 };
  old.adventure.story.naruto = 5; old.adventure.achievements = ['story-1', 'story-40'];
  old.adventure.equipment = ['dragon-ball-weapon']; old.adventure.equipped.weapon = 'dragon-ball-weapon';
  old.adventure.supports = ['naruto'];
  const current = parseSave(JSON.stringify(old));
  assert.ok(current); assert.equal(current.catalogVersion, 2);
  assert.equal(current.gold, 2345); assert.equal(current.gems, 450); assert.equal(current.potions, 7);
  assert.equal(current.characterLevels.goku, 6); assert.ok(current.unlocked.includes('vegeta'));
  assert.deepEqual(current.worldProgress.naruto, old.worldProgress.naruto);
  assert.equal(current.adventure.story.naruto, 5);
  assert.deepEqual(current.adventure.achievements, ['story-1', 'story-40']);
  assert.equal(current.adventure.equipped.weapon, 'dragon-ball-weapon');
  for (const world of NEW_WORLDS) { assert.equal(current.adventure.story[world.id], 0); assert.equal(current.worldProgress[world.id].points, 0); assert.ok(current.unlocked.includes(world.character)); }
  for (const hero of NEW_CHARACTERS) assert.equal(current.characterLevels[hero.id], 1);
  assert.deepEqual(parseSave(JSON.stringify(current)), current);
});

test('pre-expansion saves also gain the new worlds without restarting a current arena battle', () => {
  const old = freshState(); startBattle(old); battleAction(old, 'skill', () => 0.5);
  const battle = structuredClone(old.battle);
  legacyState(old); delete old.adventure;
  const current = parseSave(JSON.stringify(old));
  assert.ok(current); assert.deepEqual(current.battle, battle); assert.equal(current.unlocked.length, 16);
});

test('ongoing story and tower saves retain their combat snapshots and perks during catalog migration', () => {
  for (const mode of ['story', 'tower']) {
    const old = freshState();
    if (mode === 'story') startStory(old, 'naruto', 0, 'guard', statsFor(old));
    else beginRun(old, 'tower', statsFor(old));
    battleAction(old, 'guard', () => 0.5);
    const b = structuredClone(old.battle), run = structuredClone(old.adventure.tower.run);
    legacyState(old);
    const current = parseSave(JSON.stringify(old));
    assert.ok(current); assert.deepEqual(current.battle, b); assert.deepEqual(current.adventure.tower.run, run);
  }
});

test('quiz and memory games from the old catalog retain their exact questions, cards, moves and answers', () => {
  for (const kind of ['quiz', 'memory']) {
    const old = freshState(); startMini(old, kind, () => 0.5);
    const s = old.adventure.mini.session;
    if (kind === 'quiz') { s.questions = [0, 4, 7, 9, 15]; s.index = 1; s.answers = [0]; s.correct = 1; }
    else { s.cards = [...LEGACY_WORLD_IDS.slice(0, 6), ...LEGACY_WORLD_IDS.slice(0, 6)]; s.open = [0]; }
    legacyState(old); const current = parseSave(JSON.stringify(old));
    assert.ok(current); assert.deepEqual(current.adventure.mini.session, s);
  }
  assert.equal(QUIZ[15].q, 'Albedo giữ vai trò gì ở Nazarick?');
});

test('catalog migration does not conceal corrupted old fields or repair malformed current-version saves', () => {
  const missing = legacyState(); delete missing.characterLevels.goku;
  assert.equal(parseSave(JSON.stringify(missing)), null);
  const missingWorld = legacyState(); delete missingWorld.worldProgress.naruto;
  assert.equal(parseSave(JSON.stringify(missingWorld)), null);
  const malformed = freshState(); delete malformed.worldProgress['solo-leveling'];
  assert.equal(parseSave(JSON.stringify(malformed)), null);
  const future = freshState(); future.catalogVersion = 99;
  assert.equal(parseSave(JSON.stringify(future)), null);
});

test('new gear and supports apply functional stat bonuses and new recruit heroes can use their named abilities', () => {
  for (const world of NEW_WORLDS) {
    const state = freshState();
    craftEquipment(state, `${world.id}-weapon`); equipEquipment(state, `${world.id}-weapon`);
    const before = statsFor(state); toggleSupport(state, world.character);
    const after = statsFor(state), bonus = SUPPORTS[world.id];
    assert.equal(after.attack, before.attack + bonus.attack); assert.equal(after.hp, before.hp + bonus.hp);
    const hero = CHARACTERS.find(c => c.world === world.id && !c.free);
    state.gems = 250; recruit(state, hero.id); state.activeCharacter = hero.id; state.selectedWorld = world.id;
    startBattle(state); battleAction(state, 'skill', () => 0.5);
    assert.ok(state.battle.logs.some(log => log.text.startsWith(hero.skill)));
  }
});

test('tower visits the added worlds after floor eight and rush includes new worlds from a new origin', () => {
  const tower = freshState(); beginRun(tower, 'tower', statsFor(tower));
  tower.battle.status = 'lost'; const run = tower.adventure.tower.run; run.stage = 9; run.status = 'ready';
  nextRunBattle(tower, 'tower'); assert.equal(tower.battle.worldId, 'solo-leveling');
  const rush = freshState(); rush.selectedWorld = 'fate-zero'; beginRun(rush, 'rush', statsFor(rush));
  assert.equal(rush.battle.worldId, 'fate-zero');
});

test('original forty-chapter achievement stays unchanged and a separate eighty-chapter reward is added', () => {
  assert.equal(ACHIEVEMENTS.find(a => a.id === 'story-40').target, 40);
  assert.equal(ACHIEVEMENTS.find(a => a.id === 'story-80').target, 80);
});
