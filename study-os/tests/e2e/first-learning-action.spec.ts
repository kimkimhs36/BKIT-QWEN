import { test, expect } from './local-fixture';

// A prominent Start button must start learning, not only an unlinked clock.
test('home primary action starts the recommended task and preserves its first step', async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('수학 학습지 5문제');
  await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
  await expect(page.getByLabel('첫 학습 행동')).toContainText('수학 학습지');
  for (const material of ['glass', 'peach']) {
    await page.locator('html').evaluate((root, value) => root.setAttribute('data-material', value), material);
    const card = page.getByLabel('첫 학습 행동');
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`home-${material}.png`) });
  }
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active?.taskId).toBe(saved.tasks[0].id);
  expect(saved.active?.target).toBe(5);
  expect(saved.learningEvents?.some((e: { type: string; action?: string }) =>
    e.type === 'StudyStarted' && e.action?.includes('수학 학습지'))).toBe(true);
  await expect(page.getByLabel('지금 할 첫 학습 행동')).toContainText('수학 학습지');
  const firstMove = page.getByLabel('지금 할 첫 학습 행동');
  const attemptButton = page.getByRole('button', { name: '첫 문제 시도했어요' });
  expect((await attemptButton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const bounds = (await firstMove.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('focus.png') });
  await attemptButton.click();
  await expect(page.getByText('첫 시도 기록 완료', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '첫 문제 시도했어요' })).toHaveCount(0);
  const attempted = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(attempted.learningEvents.filter((e: { type: string }) =>
    e.type === 'FirstLearningAttempt')).toHaveLength(1);
  expect(attempted.active.id).toBe(saved.active.id);
  expect(attempted.active.segmentStart).toBe(saved.active.segmentStart);
  await page.getByRole('button', { name: '오늘로 · 타이머 유지' }).click();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(resumed.active).toEqual(attempted.active);
  await expect(page.getByRole('button', { name: '첫 문제 시도했어요' })).toHaveCount(0);
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
