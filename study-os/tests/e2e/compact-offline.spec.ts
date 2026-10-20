import { test, expect } from './local-fixture';

test.setTimeout(90000);
test('a first offline visit can open all themes and complete a study without loading a theme chunk', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-10-21T04:00:00Z') });
  await page.goto('./');
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // No theme dialog or theme module has been visited before going offline.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '나의 공부 공간' });
  await expect(dialog.getByRole('group', { name: '테마 선택' }).getByRole('button')).toHaveCount(9);
  await dialog.getByRole('button', { name: 'Forest Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'forest');
  await dialog.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '일시정지', exact: true })
    .click();
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '끝내고 시간 저장', exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).sessions.length,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});
