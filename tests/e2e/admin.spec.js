import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { freshState } from '../../src/game.js';
const nav = (page, route) => page.locator(`nav [data-page="${route}"]`).click();
const userName = () => 'player_' + randomUUID().slice(0,8);
async function signUp(page, username) {
  await page.goto('/#account');
  await page.locator('[data-action="account-tab"][data-id="register"]').click();
  await page.locator('#account-username').fill(username); await page.locator('#account-name').fill('Người chơi '+username.slice(-4));
  await page.locator('#account-password').fill('player-pass-123'); await page.locator('#account-auth-form [type="submit"]').click();
  await expect(page).toHaveURL(/#overview$/);
}
async function signIn(page, username='testadmin', password='test-admin-only-123') {
  await page.goto('/#account');await page.locator('[data-action="account-tab"][data-id="login"]').click();await page.locator('#account-username').fill(username);await page.locator('#account-password').fill(password);await page.locator('#account-auth-form [type="submit"]').click();
  await expect(page).toHaveURL(username==='testadmin' ? /#admin$/ : /#overview$/);
}

test('player accounts save a real combat session to the server and resume it in another browser',async({page,browser})=>{
 const username=userName();await signUp(page,username);
 await nav(page,'arena');await page.locator('[data-action="start-battle"][data-id="easy"]').click();await page.locator('.ability.guard').click();
 await expect(page.locator('#server-sync-indicator')).toContainText('Đã lưu máy chủ');
 const context=await browser.newContext();const other=await context.newPage();
 try{
  await signIn(other,username,'player-pass-123');await other.getByRole('button',{name:'Tiếp tục trận đấu',exact:true}).click();await expect(other.locator('.turn-pill')).toHaveText('LƯỢT 2');
  const response=await other.request.get('/api/admin/dashboard');expect(response.status()).toBe(403);
 }finally{await context.close();}
});

test('admin edits another player, stale saves are blocked, and backups and audit records are real',async({page,browser})=>{
 const username=userName();await signUp(page,username);
 const context=await browser.newContext();const admin=await context.newPage();
 try{
  await signIn(admin);await admin.locator('#admin-search').fill(username);await admin.locator('#admin-search-form [type="submit"]').click();await expect(admin.locator('.admin-player')).toHaveCount(1);
  await admin.locator('.admin-player').click();await admin.locator('#admin-gold').fill('9876');await admin.locator('#admin-gems').fill('345');await admin.locator('#admin-resource-form [type="submit"]').click();
  await expect(admin.locator('.admin-backups [data-action="admin-restore"]')).toHaveCount(1);
  await expect(admin.locator('.admin-audit')).toContainText('Cập nhật người chơi');
  await nav(page,'shop');await page.locator('[data-action="buy-potion"]').click();
  await expect(page.locator('#account-banner')).toContainText('Bản lưu cần kiểm tra');
  await page.locator('[data-action="account-reload"]').click();await page.locator('[data-action="account-reload-confirm"]').click();
  await expect(page.locator('.currencies')).toContainText('9.876');await expect(page.locator('.currencies')).toContainText('345');
  await admin.locator('[data-action="admin-restore"]').click();await admin.locator('[data-action="admin-execute"]').click();
  await expect(admin.locator('#admin-gold')).toHaveValue('1500');await expect(admin.locator('.admin-audit')).toContainText('Khôi phục tiến trình');
 }finally{await context.close();}
});

test('admin ban revokes a player session; unban and password reset permit a new login',async({page,browser})=>{
 const username=userName();await signUp(page,username);
 const context=await browser.newContext();const admin=await context.newPage();
 try{
  await signIn(admin);await admin.locator('#admin-search').fill(username);await admin.locator('#admin-search-form [type="submit"]').click();await expect(admin.locator('.admin-player')).toHaveCount(1);await admin.locator('.admin-player').click();
  await admin.locator('[data-action="admin-status"]').click();await admin.locator('[data-action="admin-execute"]').click();
  await expect(admin.locator('[data-action="admin-status"]')).toHaveText('Mở tài khoản');
  await nav(page,'shop');await page.locator('[data-action="buy-potion"]').click();await expect(page.locator('#account-banner')).toContainText('Cần đăng nhập lại');
  await admin.locator('[data-action="admin-status"]').click();await admin.locator('[data-action="admin-execute"]').click();
  await admin.locator('#admin-reset-password').fill('new-player-pass-123');await admin.locator('#admin-password-form [type="submit"]').click();
  await expect(admin.locator('.admin-audit')).toContainText('Đặt lại mật khẩu');
  await signIn(page,username,'new-player-pass-123');await expect(page.locator('#server-sync-indicator')).toContainText('Đã lưu máy chủ');
 }finally{await context.close();}
});

test('account and admin pixel screens fit narrow phones and can be reached through the full menu',async({page})=>{
 await signIn(page);
 for(const width of [360,320]){
  await page.setViewportSize({width,height:850});
  for(const route of ['account','admin']){
   await page.locator('#mobile-dock-menu').click();await nav(page,route);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.locator('.admin-player').first().click();
  await expect(page.locator('#admin-resource-form')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
});


test('importing a guest save is confirmed and logging out preserves the separate local game',async({page})=>{
 const local=freshState();local.gold=4321;local.name='Bản chơi cục bộ';
 await page.addInitScript(state=>localStorage.setItem('anime-nexus-v1',JSON.stringify(state)),local);
 await signUp(page,userName());await expect(page.locator('.currencies')).toContainText('1.500');
 await nav(page,'account');await page.locator('[data-action="account-import"]').click();
 await expect(page.locator('#game-dialog')).toContainText('Nhập tiến trình trên thiết bị?');
 await page.locator('[data-action="account-import-confirm"]').click();
 await expect(page.locator('.currencies')).toContainText('4.321');
 await page.locator('[data-action="account-logout"]').click();
 await expect(page.locator('#account-auth-form')).toBeVisible();
 await expect(page.locator('.currencies')).toContainText('4.321');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('anime-nexus-v1')).gold)).toBe(4321);
});
