import { test, expect } from '@playwright/test';

test('the mobile dashboard is bright, soft and action-first without overflow', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  await expect(page.getByRole('button', { name: '5분만 시작' })).toBeVisible();
  await expect(page.locator('.now-focus')).toBeVisible();
  await expect(page.locator('.today-more')).not.toHaveAttribute('open');
  const state = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const focus = getComputedStyle(document.querySelector('.now-focus')!);
    const start = getComputedStyle(document.querySelector('.now-focus-primary')!);
    const nav = getComputedStyle(document.querySelector('.orbit-nav')!);
    return {
      scheme: root.colorScheme,
      bg: body.backgroundColor,
      focusColor: focus.color,
      focusBackground: focus.backgroundImage,
      startColor: start.color,
      navBackground: nav.backgroundColor,
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    };
  });
  expect(state.scheme).toBe('light');
  expect(state.bg).toBe('rgb(247, 248, 254)');
  expect(state.focusBackground).toContain('linear-gradient');
  expect(state.startColor).toBe('rgb(255, 255, 255)');
  expect(state.width).toBeLessThanOrEqual(state.viewport + 1);
});
