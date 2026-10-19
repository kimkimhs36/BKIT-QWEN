import { test, expect } from './local-fixture';
async function openGarage(page: import('@playwright/test').Page) {
  await page.locator('nav button:visible').filter({ hasText: '더보기' }).click();
  await page.getByRole('button', { name: 'TOHEŞAR GARAGE', exact: true }).click();
  await expect(page.getByRole('region', { name: 'TOHEŞAR GARAGE' })).toBeVisible();
}
test('garage keeps car locally without touching study data and respects dark mode', async ({
  page,
}) => {
  await page.goto('./');
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await openGarage(page);
  await page.getByRole('button', { name: '코랄', exact: true }).click();
  await page.getByLabel('배경 · 무료').selectOption('dusk');
  await page.getByLabel('모션 감소', { exact: true }).check();
  const car = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).car,
  );
  expect(car.color).toBe('coral');
  expect(car.scene).toBe('dusk');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
  await page.reload();
  await openGarage(page);
  await expect(page.getByRole('button', { name: '코랄', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('모션 감소', { exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
test('corrupt garage is preserved and storage failure never invents owned parts', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('bkit.drive-garage.v1', '{broken'));
  await page.goto('./');
  await openGarage(page);
  await expect(page.getByRole('alert')).toContainText('원본을 보존');
  await page.getByRole('button', { name: '블루', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('bkit.drive-garage.v1'))).toBe('{broken');
});
