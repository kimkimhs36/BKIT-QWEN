import { test, expect } from '@playwright/test';

test('mobile homepage shows a primary start action and defers detailed dashboard', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '5분만 시작' })).toBeVisible();
  await expect(page.locator('.today-more')).not.toHaveAttribute('open');
  await expect(page.locator('.today-more .day-strip')).toBeHidden();
  await page.locator('.today-more > summary').click();
  await expect(page.locator('.today-more')).toHaveAttribute('open');
  await expect(page.locator('.today-more .day-strip')).toBeVisible();
});
