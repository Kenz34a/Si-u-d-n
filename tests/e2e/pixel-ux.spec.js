import { test, expect } from '@playwright/test';
import { freshState, startBattle } from '../../src/game.js';
import { startMini } from '../../src/expansion.js';

const nav = (page, route) => page.locator(`nav [data-page="${route}"]`).click();

test('phone dock opens screens directly and the full menu contains keyboard focus, closes and adapts to desktop', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const dock = page.getByRole('navigation', { name: 'Điều hướng nhanh' });
  await expect(dock).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    const start = await page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true }).boundingBox();
    const controls = await dock.boundingBox();
    expect(start.y + start.height).toBeLessThanOrEqual(controls.y);
  }
  await dock.getByRole('button', { name: 'Anh hùng', exact: true }).click();
  await expect(page).toHaveURL(/#heroes$/);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(dock.getByRole('button', { name: 'Anh hùng', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.locator('.filter[data-id="owned"]').click();
  await expect(page.locator('.filter[data-id="owned"]')).toBeFocused();
  await expect(page.locator('.filter[data-id="owned"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#hero-world-filter').selectOption('naruto');
  await expect(page.locator('#hero-world-filter')).toBeFocused();
  await dock.getByRole('button', { name: 'Menu đầy đủ' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu Nexus' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đóng menu', exact: true })).toBeFocused();
  await expect(page.locator('.main-shell')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.sidebar [data-action="settings"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Đóng menu', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-dock-menu')).toBeFocused();
  await expect(page.locator('.main-shell')).not.toHaveAttribute('inert');
  await page.locator('#mobile-dock-menu').click();
  await page.locator('.sidebar [data-action="settings"]').click();
  await expect(page.locator('#game-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-dock-menu')).toBeFocused();
  await page.locator('#mobile-dock-menu').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.sidebar')).not.toHaveClass(/mobile-open/);
  await expect(page.locator('.main-shell')).not.toHaveAttribute('inert');
  await expect(dock).toBeHidden();
});

test('lobby resumes the saved battle or memory game at the same turn and card state', async ({ page }) => {
  const battle = freshState(); startBattle(battle, 'easy');
  const memory = freshState(); startMini(memory, 'memory');
  for (const [initial, label, route] of [[battle, 'Tiếp tục trận đấu', 'arena'], [memory, 'Tiếp tục mini game', 'adventures']]) {
    await page.goto('/');
    await page.evaluate(state => localStorage.setItem('anime-nexus-v1', JSON.stringify(state)), initial);
    await page.reload();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${route}$`));
    if (route === 'arena') {
      await page.locator('[data-action="battle-action"][data-id="guard"]').click();
      await nav(page, 'overview');
      await expect(page.locator('.launch-console p')).toContainText('Lượt 2');
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('.turn-pill')).toHaveText('LƯỢT 2');
    } else {
      await page.locator('[data-action="ex-mini-action"][data-id="0"]').click();
      await nav(page, 'overview');
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('.memory-card.revealed')).toHaveCount(1);
      await expect(page.locator('.memory-card')).toHaveCount(12);
    }
  }
});

test('combat explains unavailable abilities and updates cooldown and turn guidance after an action', async ({ page }) => {
  await page.goto('/#arena');
  await page.locator('[data-action="start-battle"][data-id="easy"]').click();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('#main-content')).toBeFocused();
  const ultimate = page.locator('.ability.ultimate'), skill = page.locator('.ability.skill');
  await expect(ultimate).toBeDisabled();
  await expect(ultimate).toContainText('Cần thêm 60 năng lượng');
  await expect(page.locator('.pixel-turn-hint')).toContainText('Đến lượt bạn');
  await skill.click();
  await expect(skill).toBeDisabled();
  await expect(skill).toContainText('Hồi chiêu: 2 lượt');
  await expect(ultimate).toContainText('Cần thêm 95 năng lượng');
  await page.locator('.ability.guard').click();
  await expect(skill).toContainText('Hồi chiêu: 1 lượt');
  await expect(page.locator('.pixel-turn-hint')).toContainText('Đối thủ chuẩn bị đòn mạnh');
});
