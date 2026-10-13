import { test, expect } from '@playwright/test';
import { freshState, startBattle, battleAction } from '../../src/game.js';
import { QUIZ } from '../../src/content.js';

const save = page => page.evaluate(() => JSON.parse(localStorage.getItem('anime-nexus-v1')));
const tab = (page, id) => page.locator(`.activity-tabs [data-id="${id}"]`).click();
async function finishFight(page) {
  for (let i = 0; i < 20; i++) {
    const b = (await save(page)).battle;
    if (b.status !== 'active') break;
    const action = b.player.energy >= 100 ? 'ultimate' : b.player.energy >= 35 && b.player.cooldown === 0 ? 'skill' : b.turn % 3 === 0 ? 'guard' : 'attack';
    await page.locator(`[data-action="battle-action"][data-id="${action}"]`).click();
  }
  await expect(page.locator('.battle-result h2')).toHaveText('CHIẾN THẮNG!');
}

test('activity hub exposes all six playable modes and a first chapter advances to chapter two', async ({ page }) => {
  await page.goto('/#adventures');
  await expect(page.locator('.activity-card')).toHaveCount(6);
  await tab(page, 'story');
  await page.selectOption('#story-world', 'naruto');
  await page.locator('[data-action="ex-choice"][data-id="guard"]').click();
  await page.locator('[data-action="ex-story-start"]').click();
  await expect(page.locator('.battle-objective')).toContainText('Đánh bại đối thủ');
  await finishFight(page);
  await page.locator('[data-action="ex-return"]').click();
  await expect(page.locator('.chapter-node.selected')).toContainText('Truy dấu trong rừng');
  expect((await save(page)).adventure.story.naruto).toBe(1);
  await tab(page, 'hub');
  await page.locator('[data-action="ex-claim"][data-id="story-1"]').click();
  await expect(page.locator('[data-action="ex-claim"][data-id="story-1"]')).toBeDisabled();
});

test('tower victory leads to boon choice and next floor keeps damage through a reload', async ({ page }) => {
  await page.goto('/#adventures'); await tab(page, 'tower');
  await page.locator('[data-action="ex-run-start"][data-id="tower"]').click();
  await finishFight(page);
  const before = (await save(page)).battle.player;
  await page.locator('[data-action="ex-return"]').click();
  await expect(page.locator('.boon')).toHaveCount(3);
  await page.locator('[data-action="ex-boon"][data-id="attack"]').click();
  await page.reload();
  await tab(page, 'tower');
  await page.locator('[data-action="ex-run-next"][data-id="tower"]').click();
  const next = (await save(page)).battle;
  expect(next.stage).toBe(2); expect(next.player.hp).toBe(before.hp); expect(next.player.attack).toBe(before.attack + 5);
});

test('boss rush enforces eight-turn limit instead of turning into a standard arena match', async ({ page }) => {
  await page.goto('/#adventures'); await tab(page, 'rush');
  await page.locator('[data-action="ex-run-start"][data-id="rush"]').click();
  for (let i = 0; i < 8; i++) await page.locator('[data-action="battle-action"][data-id="guard"]').click();
  await expect(page.locator('.battle-result h2')).toHaveText('CHƯA PHẢI KẾT THÚC.');
  await expect(page.locator('.combat-log')).toContainText('Hết số lượt');
  expect((await save(page)).adventure.rush.run).toBeNull();
  await page.locator('[data-action="ex-return"]').click();
  await expect(page.locator('[data-action="ex-run-start"][data-id="rush"]')).toBeVisible();
});

test('memory mismatch, explicit continue, matching, save resume and rewards work in the browser', async ({ page }) => {
  await page.goto('/#adventures'); await tab(page, 'memory');
  await page.locator('[data-action="ex-mini-start"]').click();
  let session = (await save(page)).adventure.mini.session;
  const wrong = session.cards.findIndex(id => id !== session.cards[0]);
  await page.locator('[data-action="ex-mini-action"][data-id="0"]').click();
  await page.locator(`[data-action="ex-mini-action"][data-id="${wrong}"]`).click();
  await expect(page.locator('.memory-card.revealed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Úp lại và tiếp tục' }).click();
  await page.reload(); await tab(page, 'memory');
  await expect(page.locator('.memory-card')).toHaveCount(12);
  session = (await save(page)).adventure.mini.session;
  const pairs = new Map(); session.cards.forEach((id, i) => pairs.set(id, [...(pairs.get(id) ?? []), i]));
  for (const pair of pairs.values()) for (const id of pair) await page.locator(`[data-action="ex-mini-action"][data-id="${id}"]`).click();
  await expect(page.locator('.mini-result h2')).toContainText('965');
  expect((await save(page)).adventure.mini.session.paid).toBe(true);
});

test('reflex game scores hits and ends on its saved deadline after navigating away', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#adventures'); await tab(page, 'reflex');
  await page.locator('[data-action="ex-mini-start"]').click();
  for (let i = 0; i < 6; i++) await page.locator('.reflex-cell.target').click();
  const deadline = (await save(page)).adventure.mini.session.endsAt;
  await tab(page, 'hub'); await page.clock.fastForward('00:21'); await tab(page, 'reflex');
  await expect(page.locator('.mini-result')).toContainText('6 lần trúng');
  const session = (await save(page)).adventure.mini.session;
  expect(session.endsAt).toBe(deadline); expect(session.paid).toBe(true);
});

test('quiz gives explanations, locks answered questions and finishes with correct score', async ({ page }) => {
  await page.goto('/#adventures'); await tab(page, 'quiz');
  await page.locator('[data-action="ex-mini-start"]').click();
  const session = (await save(page)).adventure.mini.session;
  for (let i = 0; i < 5; i++) {
    const correct = QUIZ[session.questions[i]].correct;
    await page.locator(`[data-action="ex-mini-action"][data-id="${correct}"]`).click();
    await expect(page.locator('.quiz-explanation')).toContainText('Chính xác!');
    await expect(page.locator('.quiz-answer.correct')).toBeDisabled();
    await page.locator('[data-action="ex-mini-action"][data-id="continue"]').click();
  }
  await expect(page.locator('.mini-result h2')).toContainText('1.000');
  await expect(page.locator('.mini-result')).toContainText('5/5 câu trả lời đúng');
});

test('craft and equip gear, select two supports and execute combo damage and healing', async ({ page }) => {
  await page.goto('/#loadout');
  await expect(page.locator('.equipment-card')).toHaveCount(48);
  await page.locator('[data-action="ex-gear-craft"][data-id="dragon-ball-weapon"]').click();
  await page.locator('[data-action="ex-gear-equip"][data-id="dragon-ball-weapon"]').click();
  await page.locator('[data-action="ex-support"][data-id="rimuru"]').click();
  await page.locator('[data-action="ex-support"][data-id="naruto"]').click();
  await expect(page.locator('.main-hero-loadout')).toContainText('33 ATK');
  await page.locator('nav [data-page="arena"]').click();
  await page.locator('[data-action="start-battle"][data-id="normal"]').click();
  await page.locator('[data-action="battle-action"][data-id="support"]').click();
  await expect(page.locator('.combat-log')).toContainText('Liên kích cùng Rimuru Tempest & Uzumaki Naruto');
  expect((await save(page)).battle.player.supportCooldown).toBe(3);
  await page.reload(); await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
});

test('existing saves migrate in place with gold, upgrades and active combat unchanged', async ({ page }) => {
  const old = freshState(); old.gold = 2345; old.characterLevels.goku = 3;
  startBattle(old); battleAction(old, 'attack', () => 0.5);
  delete old.adventure; delete old.battle.mode; delete old.battle.supportIds;
  await page.addInitScript(value => localStorage.setItem('anime-nexus-v1', JSON.stringify(value)), old);
  await page.goto('/#arena');
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
  const migrated = await save(page);
  expect(migrated.gold).toBe(2345); expect(migrated.characterLevels.goku).toBe(3); expect(migrated.adventure.shards).toBe(2);
});

test('all new modes and the forge fit 360px phones with no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#adventures');
  for (const id of ['hub', 'story', 'tower', 'rush', 'memory', 'reflex', 'quiz']) {
    await tab(page, id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), id).toBeLessThanOrEqual(360);
  }
  for (const kind of ['memory', 'reflex', 'quiz']) {
    await tab(page, kind); await page.locator('[data-action="ex-mini-start"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), kind).toBeLessThanOrEqual(360);
    await page.locator('[data-action="ex-mini-end"]').click();
  }
  await page.getByRole('button', { name: 'Mở menu' }).click(); await page.locator('nav [data-page="loadout"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
