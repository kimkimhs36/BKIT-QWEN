import { test, expect } from './local-fixture';

// A prominent Start button must start learning, not only an unlinked clock.
test('home primary action starts the recommended task and preserves its first step', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  await page.getByLabel('오늘 해야 할 일').fill('수학 학습지 5문제');
  await page.getByRole('button', { name: '사진 없이 과제 확인하기' }).click();
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await expect(page.getByLabel('첫 학습 행동')).toContainText('수학 학습지');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active?.taskId).toBe(saved.tasks[0].id);
  expect(saved.active?.target).toBe(5);
  expect(saved.learningEvents?.some((e: { type: string; action?: string }) =>
    e.type === 'StudyStarted' && e.action?.includes('수학 학습지'))).toBe(true);
  await expect(page.getByRole('heading', { name: '집중', exact: true })).toBeVisible();
});

test('home primary action still starts a five-minute timer when no task exists', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.goto('./');
  await expect(page.getByLabel('첫 학습 행동')).toContainText('질문 하나');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active).toBeNull();
  expect(saved.quickTimer?.targetMinutes).toBe(5);
  await expect(page.getByRole('heading', { name: '집중', exact: true })).toBeVisible();
});
