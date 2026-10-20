import { test, expect } from './local-fixture';

test('top back button returns to previous BKIT screen, not browser history', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: '이전 화면으로 돌아가기' })).toHaveCount(0);
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '집중' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-study/);
  await page.locator('.topbar-settings-action').click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-settings/);
  const back = page.getByRole('button', { name: '이전 화면으로 돌아가기' });
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute('type', 'button');
  await back.click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-study/);
  await back.click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-today/);
  await expect(back).toHaveCount(0);
});

test('garage back returns to More and keeps local study records unchanged', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '더보기' }).click();
  await page.getByRole('navigation', { name: '추가 도구' }).getByRole('button', { name: 'TOHEŞAR GARAGE' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-garage/);
  await page.getByRole('button', { name: '이전 화면으로 돌아가기' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-more/);
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toEqual(before);
});
