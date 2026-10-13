import { test, expect } from '@playwright/test';
import { freshState, startBattle, battleAction } from '../../src/game.js';
import { LEGACY_WORLD_IDS, characterById } from '../../src/data.js';
import { NEW_WORLDS, NEW_CHARACTERS } from '../../src/new-anime.js';
import { startMini } from '../../src/expansion.js';
import { QUIZ } from '../../src/content.js';

const save = page => page.evaluate(() => JSON.parse(localStorage.getItem('anime-nexus-v1')));

test('every new world has two selectable hero cards and its starter can cast the anime skill in combat', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/#heroes');
  await expect(page.locator('.character-card')).toHaveCount(32);
  for (const world of NEW_WORLDS) {
    await page.selectOption('#hero-world-filter', world.id);
    await expect(page.locator('.character-card')).toHaveCount(2);
    const starter = characterById(world.character);
    await expect(page.getByRole('img', { name: `Minh họa ${starter.name}`, exact: true })).toBeVisible();
    await page.locator(`[data-action="equip"][data-id="${world.character}"]`).click();
    await page.locator('nav [data-page="arena"]').click();
    await page.locator(`[data-action="select-world"][data-id="${world.id}"]`).click();
    await page.locator('[data-action="start-battle"][data-id="easy"]').click();
    await expect(page.locator('[data-action="battle-action"][data-id="skill"]')).toContainText(world.skill);
    await expect(page.locator('[data-action="battle-action"][data-id="ultimate"]')).toContainText(world.ultimate);
    await page.locator('[data-action="battle-action"][data-id="skill"]').click();
    await expect(page.locator('.combat-log')).toContainText(world.skill);
    await page.locator('[data-action="confirm-retreat"]').click();
    await page.locator('[data-action="retreat"]').click();
    await page.locator('[data-action="end-battle"]').first().click();
    await page.locator('nav [data-page="heroes"]').click();
  }
});

test('each new anime appears in story and ranking selectors with its own guide, title and rank ladder', async ({ page }) => {
  await page.goto('/#adventures');
  await page.locator('.activity-tabs [data-id="story"]').click();
  for (const world of NEW_WORLDS) {
    await page.selectOption('#story-world', world.id);
    await expect(page.locator('.guide-line')).toContainText(characterById(world.character).name);
    await expect(page.locator('.story-copy h2')).toHaveText(world.chapters[0]);
  }
  await expect(page.locator('.adventure-stats')).toContainText('0/80');
  await page.locator('nav [data-page="ranking"]').click();
  for (const world of NEW_WORLDS) {
    await page.selectOption('#rank-filter', world.id);
    await expect(page.locator('.rank-ladder li')).toHaveCount(7);
    await expect(page.locator('.rank-ladder li').last()).toContainText(world.ranks[6]);
  }
});

test('forge world filters expose and equip actual new recipes rather than decorative entries', async ({ page }) => {
  await page.goto('/#loadout');
  await expect(page.locator('.equipment-card')).toHaveCount(48);
  for (const world of NEW_WORLDS) {
    await page.selectOption('#gear-world-filter', world.id);
    await expect(page.locator('.equipment-card')).toHaveCount(3);
    await expect(page.locator('.equipment-card').first()).toContainText(world.equipment[0]);
  }
  await page.selectOption('#gear-world-filter', 'fate-zero');
  await page.locator('[data-action="ex-gear-craft"][data-id="fate-zero-weapon"]').click();
  await page.locator('[data-action="ex-gear-equip"][data-id="fate-zero-weapon"]').click();
  await expect(page.locator('.equipped-panel')).toContainText('Thánh kiếm Excalibur');
  expect((await save(page)).adventure.equipped.weapon).toBe('fate-zero-weapon');
});

test('the eight-world save migrates in the browser without changing its battle, currency or old milestones', async ({ page }) => {
  const old = freshState(); old.gold = 3456; old.gems = 500; old.characterLevels.goku = 6;
  for (const id of LEGACY_WORLD_IDS) old.adventure.story[id] = 5;
  old.adventure.achievements = ['story-40']; old.worldProgress.naruto.points = 900;
  startBattle(old); battleAction(old, 'skill', () => 0.5);
  const hp = old.battle.player.hp;
  delete old.catalogVersion;
  old.unlocked = old.unlocked.filter(id => LEGACY_WORLD_IDS.includes(characterById(id).world));
  for (const w of NEW_WORLDS) { delete old.worldProgress[w.id]; delete old.adventure.story[w.id]; }
  for (const c of NEW_CHARACTERS) delete old.characterLevels[c.id];
  await page.addInitScript(state => localStorage.setItem('anime-nexus-v1', JSON.stringify(state)), old);
  await page.goto('/#arena');
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
  const migrated = await save(page);
  expect(migrated.gold).toBe(3456); expect(migrated.gems).toBe(500); expect(migrated.battle.player.hp).toBe(hp);
  expect(migrated.characterLevels.goku).toBe(6); expect(migrated.worldProgress.naruto.points).toBe(900);
  expect(migrated.adventure.achievements).toEqual(['story-40']); expect(migrated.unlocked).toContain('jinwoo');
  await page.locator('nav [data-page="adventures"]').click();
  await expect(page.locator('.adventure-stats')).toContainText('40/80');
  await expect(page.locator('[data-action="ex-claim"][data-id="story-40"]')).toBeDisabled();
  await expect(page.locator('[data-action="ex-claim"][data-id="story-80"]')).toBeDisabled();
});

test('new anime questions render and explain their answers in the existing quiz game', async ({ page }) => {
  const state = freshState(); startMini(state, 'quiz', () => 0.5);
  state.adventure.mini.session.questions = [16, 18, 20, 24, 30];
  await page.addInitScript(value => localStorage.setItem('anime-nexus-v1', JSON.stringify(value)), state);
  await page.goto('/#adventures'); await page.locator('.activity-tabs [data-id="quiz"]').click();
  for (const question of state.adventure.mini.session.questions) {
    await expect(page.locator('.quiz-question h3')).toHaveText(QUIZ[question].q);
    await page.locator(`[data-action="ex-mini-action"][data-id="${QUIZ[question].correct}"]`).click();
    await expect(page.locator('.quiz-explanation p')).toHaveText(QUIZ[question].explanation);
    await page.locator('[data-action="ex-mini-action"][data-id="continue"]').click();
  }
  await expect(page.locator('.mini-result')).toContainText('5/5');
});

test('new long world and hero names, filter menus and recipes fit narrow phones', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#worlds');
  await expect(page.locator('.world-card')).toHaveCount(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.locator('[data-action="world-info"][data-id="jujutsu-kaisen"]').click();
  await expect(page.locator('dialog')).toContainText('Chú thuật sư Đặc cấp');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.locator('[data-action="close-modal"]').click();
  await page.getByRole('button', { name: 'Mở menu' }).click(); await page.locator('nav [data-page="heroes"]').click();
  await page.selectOption('#hero-world-filter', 'wistoria');
  await expect(page.locator('.character-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Mở menu' }).click(); await page.locator('nav [data-page="loadout"]').click();
  await page.selectOption('#gear-world-filter', 'demon-slayer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
