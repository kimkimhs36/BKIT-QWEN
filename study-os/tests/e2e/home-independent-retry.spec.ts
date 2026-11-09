import { test, expect } from './local-fixture';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('real HOME saved focus -> named independent question retry -> persisted workspace', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T13:00:00+09:00') });
  await page.goto('./');
  const action = page.getByRole('region', { name: '지금 할 일 한 가지' });
  await expect(action.getByRole('button', { name: '5분만 시작하기' })).toBeVisible();
  await action.getByRole('button', { name: '5분만 시작하기' }).click();
  await expect(page.getByRole('region', { name: '바로 시작 타이머' })).toBeVisible();
  await page.clock.fastForward(3000);
  await page.getByRole('button', { name: '끝내고 시간 저장' }).click();
  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '오늘', exact: true }).click();

  const retry = page.getByRole('region', { name: '저장한 공부 다음 행동' });
  await expect(retry).toBeVisible();
  // The saved-work next action must appear BEFORE generic start buttons on iPhone.
  expect(await retry.evaluate((element) => {
    const genericButtons = element.parentElement?.querySelector('.bkit-action-first-actions');
    return Boolean(genericButtons && (element.compareDocumentPosition(genericButtons) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  await expect(page.locator('.study-home .study-start')).toHaveCount(1);
  await retry.getByRole('textbox', { name: '다시 풀 문제 (선택)' })
    .fill('수학 학습지 3쪽 4번');
  await retry.getByRole('button', { name: '혼자 다시 풀기 · 5분' }).click();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(stored.sessions).toHaveLength(1);
  expect(stored.active?.workspace?.problem).toBe('수학 학습지 3쪽 4번');
  expect(stored.active?.workspace?.attempts).toEqual([]);
  expect(stored.active?.action).toBe('직접 선택한 문제 독립 재풀이');
  expect(stored.tasks).toHaveLength(0);
  await page.reload();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(restored.active?.workspace?.problem).toBe('수학 학습지 3쪽 4번');
  expect(restored.active?.workspace?.attempts).toEqual([]);
  expect(restored.sessions).toHaveLength(1);
  // Saving the original focus was real; starting retry does NOT invent a correct answer.
});
