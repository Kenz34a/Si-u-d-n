import { test, expect } from '@playwright/test';
import { freshState } from '../../src/game.js';

test('pixel atlases load as real images with transparent sprite backgrounds and no broken resources', async ({ page }) => {
  const failures = [];
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto('/#heroes');
  const images = await page.evaluate(async () => {
    const spriteFiles = ['heroes-classic.png', 'heroes-new.png', 'enemy-common.png', 'enemy-elite.png', 'enemy-boss.png'];
    const files = [...spriteFiles, 'worlds.png', 'nexus-banner.png'];
    const results = [];
    for (const file of files) {
      const image = new Image(); image.src = `/art/pixel/${file}`; await image.decode();
      const result = { file, width: image.naturalWidth, height: image.naturalHeight };
      if (spriteFiles.includes(file)) {
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0, samples = 0;
        for (let i = 3; i < pixels.length; i += 64) { samples++; if (pixels[i] === 0) transparent++; }
        result.transparentRatio = transparent / samples;
      }
      results.push(result);
    }
    return results;
  });
  expect(images).toHaveLength(7);
  for (const image of images) {
    expect(image.width, image.file).toBeGreaterThanOrEqual(1000);
    if (image.file !== 'nexus-banner.png') expect(image.width, image.file).toBe(image.height);
    if (image.transparentRatio !== undefined) expect(image.transparentRatio, image.file).toBeGreaterThan(0.25);
  }
  expect(failures).toEqual([]);
});

test('all 32 heroes render visible nearest-neighbor sprite frames on desktop and phone', async ({ page }) => {
  await page.goto('/#heroes');
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const frames = await page.locator('.character-art .pixel-sprite').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { width: rect.width, height: rect.height, rendering: style.imageRendering, atlas: style.backgroundImage };
    }));
    expect(frames).toHaveLength(32);
    for (const frame of frames) {
      expect(frame.width).toBeGreaterThan(90); expect(frame.height).toBeGreaterThan(90);
      expect(frame.rendering).toBe('pixelated'); expect(frame.atlas).toContain('/art/pixel/heroes-');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('combat selects common, elite and boss artwork by the actual opponent, including boss rush', async ({ page }) => {
  const initial = freshState(); initial.worldProgress['dragon-ball'].wins = 2;
  await page.addInitScript(state => localStorage.setItem('anime-nexus-v1', JSON.stringify(state)), initial);
  await page.goto('/#arena');
  for (const [difficulty, atlas] of [['easy', 'enemy-common.png'], ['normal', 'enemy-elite.png'], ['boss', 'enemy-boss.png']]) {
    await page.locator(`[data-action="start-battle"][data-id="${difficulty}"]`).click();
    await expect(page.locator('.enemy-art .pixel-sprite')).toHaveCSS('background-image', new RegExp(atlas.replace('.', '\.')));
    await page.locator('[data-action="confirm-retreat"]').click(); await page.locator('[data-action="retreat"]').click();
    await page.locator('[data-action="end-battle"]').first().click();
  }
  await page.locator('nav [data-page="adventures"]').click(); await page.locator('.activity-tabs [data-id="rush"]').click();
  await page.locator('[data-action="ex-run-start"][data-id="rush"]').click();
  await expect(page.locator('.enemy-art .pixel-sprite')).toHaveCSS('background-image', /enemy-boss\.png/);
  await expect(page.getByRole('progressbar', { name: 'Sinh lực đối thủ' })).toBeVisible();
});
