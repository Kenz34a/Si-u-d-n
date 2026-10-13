import { test, expect } from '@playwright/test';
import { freshState, startBattle, battleAction } from '../../src/game.js';

const save = page => page.evaluate(() => JSON.parse(localStorage.getItem('anime-nexus-v1')));
const action = (page, id) => page.locator(`[data-action="battle-action"][data-id="${id}"]`).click();
async function boot(page, character = 'goku', prepare = () => {}) {
  const state = freshState();
  state.activeCharacter = character;
  prepare(state);
  startBattle(state, 'normal', () => 0.8);
  await page.addInitScript(initial => {
    localStorage.setItem('anime-nexus-v1', JSON.stringify(initial));
    Math.random = () => 0.8;
  }, state);
  await page.goto('/#arena');
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 1');
  return state;
}

test('anime skills animate without changing combat, and navigation cancels effects without replaying damage', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const before = await boot(page);
  const expected = structuredClone(before);
  battleAction(expected, 'skill', () => 0.8);
  await action(page, 'skill');
  await expect(page.locator('.pixel-fx-layer')).toHaveAttribute('data-effect', 'beam');
  await expect(page.locator('.fx-callout')).toHaveText('Kamehameha');
  expect((await save(page)).battle).toEqual(expected.battle);
  await expect(page.getByRole('progressbar', { name: 'Sinh lực đối thủ' })).toHaveAttribute('aria-valuenow', String(expected.battle.enemy.hp));
  await page.locator('nav [data-page="heroes"]').click();
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(0);
  await expect.poll(() => page.locator('.character-art .is-awake').count()).toBeGreaterThan(0);
  expect(await page.locator('.character-art .is-awake').count()).toBeLessThan(32);
  await page.locator('nav [data-page="arena"]').click();
  await expect(page.locator('.damage-number')).toHaveCount(0);
  expect((await save(page)).battle).toEqual(expected.battle);
  expect(errors).toEqual([]);
});

test('guard, heal and support have distinct effects; rapid actions consume exactly one turn each', async ({ page }) => {
  await boot(page, 'goku', state => { state.adventure.supports = ['naruto', 'luffy']; });
  await action(page, 'guard');
  await expect(page.locator('.fx-guard')).toHaveCount(1);
  await action(page, 'potion');
  await expect(page.locator('.fx-heal')).toHaveCount(1);
  await expect(page.locator('.fx-guard')).toHaveCount(0);
  await action(page, 'support');
  await expect(page.locator('.fx-support')).toHaveCount(2);
  await expect(page.locator('.fx-support [data-character="naruto"]')).toHaveCount(1);
  await expect(page.locator('.fx-support [data-character="luffy"]')).toHaveCount(1);
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) document.querySelector('[data-action="battle-action"][data-id="guard"]').click();
  });
  const state = await save(page);
  expect(state.battle.turn).toBe(7);
  expect(state.potions).toBe(2);
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(1);
  await expect(page.locator('.fx-support')).toHaveCount(0);
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator('.damage-number')).toHaveCount(0);
  expect((await save(page)).battle).toEqual(state.battle);
});

test('phone sword and fire animations stay within the screen and a finisher credits rewards once', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await boot(page, 'ichigo');
  await action(page, 'skill');
  await expect(page.locator('.pixel-fx-layer')).toHaveAttribute('data-effect', 'slash');
  const scene = await page.locator('.battle-stage').boundingBox();
  expect(scene.y).toBeGreaterThanOrEqual(70);
  expect(scene.y + scene.height).toBeLessThanOrEqual(728);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await page.locator('nav [data-page="heroes"]').click();
  await page.locator('[data-action="equip"][data-id="natsu"]').click();
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await page.locator('nav [data-page="arena"]').click();
  await page.locator('[data-action="confirm-retreat"]').click();
  await page.locator('dialog [data-action="retreat"]').click();
  await page.locator('[data-action="end-battle"]').first().click();
  await page.locator('[data-action="start-battle"][data-id="easy"]').click();
  await action(page, 'skill');
  await expect(page.locator('.pixel-fx-layer')).toHaveAttribute('data-effect', 'flame');
  for (let i = 0; i < 8 && (await save(page)).battle.status === 'active'; i++) await action(page, 'attack');
  await expect(page.locator('.battle-result h2')).toHaveText('CHIẾN THẮNG!');
  await expect.poll(() => page.locator('.battle-result').evaluate(node => node.inert)).toBe(false);
  const won = await save(page);
  expect(won.worldProgress['dragon-ball'].wins).toBe(1);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })));
  expect((await save(page)).gold).toBe(won.gold);
  expect((await save(page)).worldProgress).toEqual(won.worldProgress);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('settings and live operating-system reduced motion stop all animations while gameplay continues', async ({ page }) => {
  await boot(page);
  await action(page, 'skill');
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('body')).toHaveClass(/reduce-motion/);
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await action(page, 'guard');
  expect((await save(page)).battle.turn).toBe(3);
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('body')).not.toHaveClass(/reduce-motion/);
  await page.locator('[data-action="settings"]').click();
  await page.getByRole('switch', { name: 'Hiệu ứng chuyển động' }).click();
  await page.keyboard.press('Escape');
  await action(page, 'attack');
  expect((await save(page)).battle.turn).toBe(4);
  await expect(page.locator('.pixel-fx-layer')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  expect((await save(page)).settings.motion).toBe(false);
});
