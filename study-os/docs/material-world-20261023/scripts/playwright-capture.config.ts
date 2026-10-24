import { defineConfig } from '@playwright/test';
import base from '../../../playwright.config';
export default defineConfig({
  ...base, testDir: '.', testMatch: 'awake-capture.spec.ts', webServer: undefined,
  projects: base.projects?.filter(p => p.name === 'webkit-iphone'),
  use: { ...base.use, baseURL: process.env.BKIT_TEST_BASE_URL || 'https://teambkit.com/previews/bkit-material-world-20261023/',
    storageState: { cookies: [], origins: [{ origin: 'https://teambkit.com', localStorage: [{ name: 'bkit.atelier.visited.v1', value: '1' }] }] }
  }
});
