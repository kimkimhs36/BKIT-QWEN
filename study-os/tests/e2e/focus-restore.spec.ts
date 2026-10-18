import { test, expect } from './local-fixture';
// This scenario verifies phone touch recovery in every browser engine.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('focus can hide and reliably reveal its controls on a phone', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '5분만 시작' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/is-focusing/);
  await page.getByRole('button', { name: '지금 UI 숨기기' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/focus-quiet/);
  await expect(page.locator('.focus-readout .timer')).toBeVisible();
  await page.getByRole('button', { name: '조작 표시' }).click();
  await expect(page.locator('.app-shell')).not.toHaveClass(/focus-quiet/);
  await page.clock.runFor(6000);
  await expect(page.locator('.app-shell')).toHaveClass(/focus-quiet/);
  await page.locator('.focus-instrument').tap();
  await expect(page.locator('.app-shell')).not.toHaveClass(/focus-quiet/);
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
});
