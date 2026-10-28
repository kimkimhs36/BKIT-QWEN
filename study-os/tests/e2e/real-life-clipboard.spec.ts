import { expect, test } from './local-fixture';

test.use({ serviceWorkers: 'block' });

test('iPhone: paste school notice once, prevent duplicates, reopen it after restart', async ({ page }) => {
  const copied = '미적분Ⅰ 수행평가 안내: 학습지 3장, 마감일은 학교 공지 확인 필요';
  await page.addInitScript((text) => {
    // Simulate an explicitly approved device clipboard, not any remote AI or paid API.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: async () => text },
    });
  }, copied);
  await page.goto('./');
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  const paste = page.getByRole('button', { name: '복사한 공지 바로 보관', exact: true });
  await paste.click();
  await expect(page.getByRole('textbox', { name: '원본 공지' })).toHaveValue(copied);
  await expect(page.getByText('공지 원문을 이 기기에 보관했어요.', { exact: false })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.school-inbox.v1') || '{}'));
  expect(stored.notices).toHaveLength(1);
  expect(stored.notices[0].text).toBe(copied);
  expect(stored.notices[0].taskIds).toEqual([]);

  await paste.click();
  await expect(page.getByText(/이미 보관한 같은 공지를 열었어요/)).toBeVisible();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.school-inbox.v1') || '{}').notices.length)).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '원본 공지' })).toHaveValue(copied);
});

test('iPhone: homework import never invents a confirmed deadline', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: async () => '영어 수행평가 발표 준비, 기한 미정' },
    });
  });
  await page.goto('./');
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await page.getByRole('button', { name: '복사한 공지 바로 보관', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '원본 공지' })).toHaveValue(
    '영어 수행평가 발표 준비, 기한 미정',
  );
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.school-inbox.v1') || '{}'));
  expect(saved.notices[0].reviewed).toBe(false);
  expect(saved.notices[0].fullyRegistered).toBeUndefined();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}').tasks?.length || 0)).toBe(0);
});
