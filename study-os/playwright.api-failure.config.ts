import { defineConfig } from '@playwright/test';
import base from './playwright.config';
// Route interception cannot reliably replace a service-worker-owned request.
// Only the synthetic API-failure scenario uses this harness. Offline and all
// other production smoke checks keep the real service worker enabled.
export default defineConfig({
  ...base,
  use: { ...base.use, serviceWorkers: 'block' },
});
