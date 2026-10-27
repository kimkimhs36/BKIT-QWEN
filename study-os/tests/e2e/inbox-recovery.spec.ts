import { test, expect } from './local-fixture';
test.use({ serviceWorkers: 'block' });
test('corrupt notice metadata is never overwritten and raw bytes remain downloadable', async ({
  page,
}, info) => {
  const raw = '{"version":1,"notices":[{"id":"broken-original"}]}';
  await page.addInitScript((raw) => localStorage.setItem('bkit.school-inbox.v1', raw), raw);
  await page.goto('./');
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await expect(page.getByRole('button', { name: '새 공지 보관', exact: true })).toBeDisabled();
  await expect(page.getByRole('alert').first()).toContainText('원본을 덮어쓰지 않습니다');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '공지 보관함 원본 JSON 내보내기', exact: true }).click();
  const file = await downloaded,
    path = info.outputPath('raw-notice.json');
  await file.saveAs(path);
  const fs = await import('node:fs/promises');
  expect(await fs.readFile(path, 'utf8')).toBe(raw);
  expect(await page.evaluate(() => localStorage.getItem('bkit.school-inbox.v1'))).toBe(raw);
});
