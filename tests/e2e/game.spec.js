import { test, expect } from '@playwright/test';

const navigate = (page, id) => page.locator(`nav [data-page="${id}"]`).click();
const readSave = page => page.evaluate(() => JSON.parse(localStorage.getItem('anime-nexus-v1')));

test('complete a fight, reload mid-fight, claim a quest and see real ranking progress', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await page.locator('[data-action="start-battle"][data-id="easy"]').click();
  await expect(page.getByRole('progressbar', { name: 'Sinh lực của bạn' })).toBeVisible();
  await page.locator('[data-action="battle-action"][data-id="skill"]').click();
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
  await page.reload();
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
  for (let i = 0; i < 10 && (await readSave(page)).battle.status === 'active'; i++) {
    await page.locator('[data-action="battle-action"][data-id="attack"]').click();
  }
  await expect(page.locator('.battle-result h2')).toHaveText('CHIẾN THẮNG!');
  const beforeClaim = await readSave(page);
  expect(beforeClaim.worldProgress['dragon-ball'].points).toBe(65);
  await navigate(page, 'quests');
  await page.locator('[data-action="claim-quest"][data-id="first-win"]').click();
  const afterClaim = await readSave(page);
  expect(afterClaim.gold).toBe(beforeClaim.gold + 200);
  await expect(page.locator('.quest-card').first().getByRole('button', { name: /Đã nhận/ })).toBeDisabled();
  await navigate(page, 'ranking');
  await expect(page.locator('.own-row')).toContainText('65');
  expect(errors).toEqual([]);
});

test('all sixteen universes expose anime ranks and lead to the corresponding arena', async ({ page }) => {
  // This flow opens and closes dialogs, battles and routes in all sixteen worlds.
  test.setTimeout(60_000);
  await page.goto('/#worlds');
  const ids = ['dragon-ball', 'naruto', 'one-piece', 'bleach', 'tokyo-ghoul', 'slime', 'sao', 'overlord', 'solo-leveling', 'wistoria', 'black-clover', 'jujutsu-kaisen', 'seven-deadly-sins', 'fate-zero', 'demon-slayer', 'fairy-tail'];
  for (const id of ids) {
    await page.locator(`[data-action="world-info"][data-id="${id}"]`).click();
    await expect(page.locator('dialog .world-ranks > span')).toHaveCount(7);
    await page.locator(`[data-action="enter-world"][data-id="${id}"]`).click();
    await expect(page.locator(`.arena-world[data-id="${id}"]`)).toHaveClass(/active/);
    await page.locator('[data-action="start-battle"][data-id="easy"]').click();
    expect((await readSave(page)).battle.worldId).toBe(id);
    await page.locator('[data-action="confirm-retreat"]').click();
    await page.locator('dialog [data-action="retreat"]').click();
    await page.locator('[data-action="end-battle"]').first().click();
    await navigate(page, 'worlds');
  }
});

test('hero upgrades, selection, profile editing and potion purchase persist', async ({ page }) => {
  await page.goto('/#heroes');
  await expect(page.locator('.character-card')).toHaveCount(32);
  await page.locator('[data-action="upgrade"][data-id="naruto"]').click();
  await page.locator('[data-action="equip"][data-id="naruto"]').click();
  await page.locator('[data-action="profile"]').click();
  await page.getByLabel('Tên người chơi').fill('Hokage Việt');
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await navigate(page, 'shop');
  await page.locator('[data-action="buy-potion"]').click();
  await page.locator('[data-action="recruit"][data-id="vegeta"]').click();
  await expect(page.locator('#toast')).toContainText('Chưa đủ tinh thạch');
  await page.reload();
  const state = await readSave(page);
  expect(state.name).toBe('Hokage Việt');
  expect(state.activeCharacter).toBe('naruto');
  expect(state.characterLevels.naruto).toBe(2);
  expect(state.gold).toBe(1170);
  expect(state.potions).toBe(4);
});

test('save exports and imports round-trip and invalid saves never erase progress', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="settings"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bản lưu' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('anime-nexus-save.json');
  const save = await readSave(page);
  save.name = 'Người du hành';
  await page.locator('#import-save').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save)) });
  await expect(page.locator('.profile-details strong')).toHaveText('Người du hành');
  await page.locator('[data-action="settings"]').click();
  await page.locator('#import-save').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('#toast')).toContainText('Không thể đọc bản lưu');
  expect((await readSave(page)).name).toBe('Người du hành');
  await page.locator('[data-action="confirm-reset"]').click();
  await page.getByRole('button', { name: 'Giữ tiến trình' }).click();
  expect((await readSave(page)).name).toBe('Người du hành');
});

test('keyboard combat, modal escape and sound settings work', async ({ page }) => {
  await page.goto('/#arena');
  await page.locator('[data-action="start-battle"][data-id="normal"]').click();
  await page.keyboard.press('3');
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
  await page.locator('[data-action="settings"]').click();
  const sound = page.getByRole('switch', { name: 'Âm thanh chiến đấu' });
  await sound.click();
  await expect(page.getByRole('switch', { name: 'Âm thanh chiến đấu' })).toBeChecked();
  await page.keyboard.press('1');
  expect((await readSave(page)).battle.turn).toBe(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.keyboard.press('1');
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 3');
});

test('all screens and combat fit a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  for (const route of ['overview', 'worlds', 'heroes', 'arena', 'quests', 'ranking', 'shop']) {
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await navigate(page, route);
    await expect(page.locator('.sidebar')).not.toHaveClass(/mobile-open/);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth, route).toBeLessThanOrEqual(dimensions.width);
  }
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await navigate(page, 'arena');
  await page.locator('[data-action="start-battle"][data-id="normal"]').click();
  await expect(page.getByRole('progressbar', { name: 'Sinh lực của bạn' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.locator('[data-action="battle-action"][data-id="attack"]').click();
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
});

test('storage denial does not prevent gameplay and is explained to the player', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bắt đầu hành trình' })).toBeVisible();
  await expect(page.locator('.footer')).toContainText('Không thể tự động lưu');
  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await page.locator('[data-action="start-battle"][data-id="easy"]').click();
  await page.locator('[data-action="battle-action"][data-id="attack"]').click();
  await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
});
