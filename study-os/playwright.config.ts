import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chromiumLaunchOptions = {
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
};
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BKIT_TEST_BASE_URL || 'http://127.0.0.1:4173/study-os/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', launchOptions: chromiumLaunchOptions } },
    { name: 'ipad', use: { ...devices['iPad Pro 11'], defaultBrowserType: 'chromium', launchOptions: chromiumLaunchOptions } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 }, browserName: 'chromium', launchOptions: chromiumLaunchOptions } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'], browserName: 'webkit', defaultBrowserType: 'webkit' } },
  ],
  webServer: {
    command: 'npm run preview -- --port ' + (process.env.BKIT_PREVIEW_PORT || '4173'),
    url: process.env.BKIT_TEST_BASE_URL || 'http://127.0.0.1:4173/study-os/',
    reuseExistingServer: true,
  },
});
