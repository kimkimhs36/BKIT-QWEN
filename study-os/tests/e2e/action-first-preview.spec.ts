import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from './local-fixture';

// Smoke test the optional single-file mobile preview from this repository.
// This is NOT a test of the real BKIT account, which has its own E2E suite.
test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true });

const html = readFileSync(
  resolve(process.cwd(), '../previews/bkit-action-home-20261109/index.html'),
  'utf8',
);

test('public mobile preview can save focus and immediately start an independent 5-minute retry', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T13:00:00+09:00') });
  // A local HTTP origin is necessary for localStorage and reload recovery.
  // Serve the committed preview HTML unmodified, without launching the real app.
  await page.route('**/bkit-standalone-review', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }),
  );
  await page.goto('./bkit-standalone-review');
  await page.evaluate(() => localStorage.setItem('bkit.study-os.v1', 'do-not-touch'));

  await page.getByRole('button', { name: '▶ 10분 집중 시작' }).click();
  await page.clock.fastForward(65_000);
  await page.getByRole('button', { name: '■ 공부 종료·직접 점검' }).click();
  await page.getByRole('button', { name: '직접 확인한 공부만 기록' }).click();

  const retry = page.getByRole('button', { name: '▶ 혼자 다시 풀기 · 5분' });
  await expect(retry).toBeVisible();
  let snapshot = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem('bkit-action-preview-local-v1') || '[]'),
    canonical: localStorage.getItem('bkit.study-os.v1'),
  }));
  expect(snapshot.records).toHaveLength(1);
  expect(snapshot.records[0]).toMatchObject({
    kind: 'study', independent: false,
  });
  expect(snapshot.records[0].seconds).toBeGreaterThanOrEqual(64);
  expect(snapshot.canonical).toBe('do-not-touch');

  await page.getByRole('textbox', { name: '다시 풀 문제 (선택)' }).fill('수학 학습지 3쪽 4번');
  await retry.click();
  let active = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit-action-preview-active-v1') || 'null'),
  );
  expect(active.target).toBe(300);
  expect(active.topic).toBe('수학 학습지 3쪽 4번');

  await page.clock.fastForward(21_000);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  active = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit-action-preview-active-v1') || 'null'),
  );
  expect(active.elapsed).toBeGreaterThanOrEqual(20);
  await page.clock.fastForward(3 * 60_000);
  await page.reload();
  const recovered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit-action-preview-active-v1') || 'null'),
  );
  expect(recovered.target).toBe(300);
  expect(recovered.elapsed).toBe(active.elapsed);
  await page.getByRole('button', { name: '▶ 이어하기' }).click();
  await page.clock.fastForward(8_000);
  await page.getByRole('button', { name: '■ 공부 종료·직접 점검' }).click();
  await page.getByRole('button', { name: '직접 확인한 공부만 기록' }).click();
  snapshot = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem('bkit-action-preview-local-v1') || '[]'),
    canonical: localStorage.getItem('bkit.study-os.v1'),
  }));
  expect(snapshot.records).toHaveLength(2);
  expect(snapshot.records[1].topic).toBe('수학 학습지 3쪽 4번');
  expect(snapshot.records[1].seconds).toBeGreaterThanOrEqual(28);
  expect(snapshot.records[1].seconds).toBeLessThan(40);
  expect(snapshot.canonical).toBe('do-not-touch');
});
