import { test as base, expect } from '@playwright/test';
/** A network boundary for this release's E2E runs. More specific page-level mocks
 * still handle synthetic fixtures; any unmocked external request is blocked.
 */
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL || 'http://127.0.0.1:4173').origin;
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (/^https?:/.test(url) && new URL(url).origin !== origin)
        return route.abort('blockedbyclient');
      return route.fallback();
    });
    await use(context);
  },
});
export { expect };
export type { Page } from '@playwright/test';
