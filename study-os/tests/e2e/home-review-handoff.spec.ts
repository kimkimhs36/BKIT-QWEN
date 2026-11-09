import { test, expect } from './local-fixture';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('saved independent answer -> explicit check -> home review date -> visible progress queue -> next-day due', async ({ page }) => {
  test.setTimeout(75_000);
  await page.clock.install({ time: new Date('2026-11-09T13:00:00+09:00') });
  await page.goto('./');
  const home = page.getByRole('region', { name: '지금 할 일 한 가지' });
  await home.getByRole('button', { name: '5분만 시작하기' }).click();
  await page.clock.fastForward(5_000);
  await page.getByRole('button', { name: '끝내고 시간 저장' }).click();
  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '오늘', exact: true }).click();
  const retry = page.getByRole('region', { name: '저장한 공부 다음 행동' });
  await retry.getByRole('textbox', { name: '다시 풀 문제 (선택)' })
    .fill('미적분 학습지 3쪽 4번');
  await retry.getByRole('button', { name: '혼자 다시 풀기 · 5분' }).click();

  const workspace = page.getByRole('region', { name: '실제 문제 풀이' });
  await workspace.getByRole('textbox', { name: '내 답을 먼저 써보기' })
    .fill('내가 종이에 직접 푼 내용');
  await workspace.getByRole('button', { name: '내 답 저장' }).click();
  await expect(workspace.getByRole('button', { name: '다시 풀어야 해' })).toBeVisible();
  await workspace.getByRole('button', { name: '다시 풀어야 해' }).click();
  await expect(workspace.locator('.problem-next-review')).toContainText('2026-11-10');
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(saved.active.workspace.attempts[0].selfCheck).toBe('retry');

  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  // A linked five-minute quick session saves immediately; task sessions use the finish form.
  const finishFormButton = page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true });
  if (await finishFormButton.count()) await finishFormButton.click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(saved.active).toBeNull();
  expect(saved.sessions).toHaveLength(2);
  expect(saved.sessions.at(-1).workspace.attempts[0].selfCheck).toBe('retry');
  expect(saved.problemRetests ?? []).toHaveLength(0);
  expect(saved.tasks).toHaveLength(0);

  // Quick-session finish returns Home; the explicit review button opens Progress.
  const reminder = page.getByRole('region', { name: '다음 독립 복습 일정' });
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText('미적분 학습지 3쪽 4번');
  await expect(reminder).toContainText('2026-11-10');
  await expect(reminder).toContainText('자동 알림이나 정답 판정은 아니에요');
  await expect(home.getByRole('region', { name: '저장한 공부 다음 행동' })).toHaveCount(0);

  await page.reload();
  await expect(reminder).toContainText('2026-11-10');
  await reminder.getByRole('button', { name: '복습 일정 보기' }).click();
  const progressQueue = page.getByRole('region', { name: '문제별 지연 재시험' });
  await expect(progressQueue).toBeVisible();
  await expect(progressQueue).toContainText('다음 복습 2026-11-10');
  await expect(page.locator('.compact-progress-detail')).not.toHaveAttribute('open');

  await page.clock.setSystemTime(new Date('2026-11-10T13:00:00+09:00'));
  await page.reload();
  await page.getByRole('region', { name: '지금 할 일 한 가지' }).waitFor();
  await expect(page.getByRole('region', { name: '오늘 독립 재풀이' })).toContainText('미적분 학습지 3쪽 4번');
  await expect(page.getByRole('region', { name: '다음 독립 복습 일정' })).toHaveCount(0);
});