import { defineConfig } from '@playwright/test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const testDatabase = join(mkdtempSync(join(tmpdir(), 'nexus-browser-test-')), 'test.sqlite');

const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath, args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false, env: { ANIME_DATABASE_PATH: testDatabase, ANIME_ADMIN_USERNAME: 'testadmin', ANIME_ADMIN_PASSWORD: 'test-admin-only-123', ANIME_APP_ORIGIN: 'http://127.0.0.1:5174', ANIME_SECURE_COOKIE: 'false' } },
});
