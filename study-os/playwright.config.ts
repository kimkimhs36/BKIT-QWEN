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
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BKIT_TEST_BASE_URL || 'http://127.0.0.1:4173/study-os/',
    trace: 'retain-on-failure',
    // Regression suites exercise returning learners. Arrival tests override this
    // with empty storage to cover the full first-visit cinematic path.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(process.env.BKIT_TEST_BASE_URL || 'http://127.0.0.1:4173').origin,
          localStorage: [{ name: 'bkit.atelier.visited.v1', value: '1' }],
        },
      ],
    },
  },
  projects: [
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'ipad',
      use: {
        ...devices['iPad Pro 11'],
        defaultBrowserType: 'chromium',
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'galaxy-css',
      use: {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        hasTouch: true,
        browserName: 'chromium',
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 1000 },
        browserName: 'chromium',
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'ipad-landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
        defaultBrowserType: 'chromium',
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'webkit-ipad-landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
        browserName: 'webkit',
        defaultBrowserType: 'webkit',
      },
    },
    {
      name: 'webkit-ipad',
      use: { ...devices['iPad Pro 11'], browserName: 'webkit', defaultBrowserType: 'webkit' },
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 13'], browserName: 'webkit', defaultBrowserType: 'webkit' },
    },
    {
      // Samsung-phone-sized Android Chromium emulation, not a physical device
      // or Samsung Internet certification. Keep this separate from galaxy-css tablet.
      name: 'galaxy-phone',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port ' + (process.env.BKIT_PREVIEW_PORT || '4173'),
    url: process.env.BKIT_TEST_BASE_URL || 'http://127.0.0.1:4173/study-os/',
    reuseExistingServer: true,
  },
});
