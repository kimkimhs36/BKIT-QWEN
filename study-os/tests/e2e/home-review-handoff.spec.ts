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
  expect(saved.active.workspace.attempts[0].checkedAt).toBeDefined();

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

  // One deliberate tap from Home opens the EXACT due problem, not a generic record list.
  await page.getByRole('region', { name: '오늘 독립 재풀이' })
    .getByRole('button', { name: '이 문제 다시 풀기' }).click();
  const dueQueue = page.getByRole('region', { name: '문제별 지연 재시험' });
  await expect(dueQueue).toBeVisible();
  const selected = dueQueue.locator('.bkit-review-card-selected');
  await expect(selected).toHaveCount(1);
  await expect(selected).toContainText('미적분 학습지 3쪽 4번');
  const input = selected.getByRole('textbox', { name: '다시 푼 내 답' });
  await expect(input).toBeFocused();
  await expect(input).toBeInViewport();
  await input.fill('다음날 해설을 가리고 직접 다시 푼 답');
  await selected.getByRole('button', { name: '재시험 답 저장' }).click();

  const afterAttempt = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(afterAttempt.sessions).toEqual(saved.sessions);
  expect(afterAttempt.problemRetests).toHaveLength(1);
  expect(afterAttempt.problemRetests[0]).toMatchObject({
    sessionId: saved.sessions.at(-1).id,
    answer: '다음날 해설을 가리고 직접 다시 푼 답',
    selfCheck: 'unreviewed',
  });
  await expect(selected).toContainText('저장한 내 답: 다음날 해설을 가리고 직접 다시 푼 답');
  // A recorded answer is not a grade: only a separate human self-check settles its status.
  await selected.getByRole('button', { name: '다시 연습 필요' }).click();
  const checked = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(checked.problemRetests[0].selfCheck).toBe('retry');
  expect(checked.problemRetests[0].checkedAt).toBeDefined();
  expect(checked.sessions).toEqual(saved.sessions);
});