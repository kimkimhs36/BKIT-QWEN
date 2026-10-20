import { test, expect } from './local-fixture';

test('closed day orbit is not mounted or downloaded until requested', async ({ page }) => {
  await page.goto('./');
  const disclosure = page.locator('details.orbit-disclosure');
  const orbit = page.getByRole('img', { name: /24시간 일정 궤도/ });
  await expect(disclosure).toHaveCount(1);
  await expect(orbit).toHaveCount(0);
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(orbit).toBeVisible();
  await disclosure.locator('summary').click();
  await expect(orbit).toHaveCount(0);
});

test('opening orbit does not change learning records and survives a browser tab', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  const disclosure = page.locator('details.orbit-disclosure');
  await disclosure.locator('summary').click();
  await expect(page.getByRole('img', { name: /24시간 일정 궤도/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
});
