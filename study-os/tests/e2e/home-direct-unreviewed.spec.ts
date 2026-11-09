import { test, expect } from './local-fixture';
import { newState, type Session } from '../../src/model';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('Home opens the saved answer self-check, not a new test, when answer is still unchecked', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T13:00:00+09:00') });
  const ended = '2026-11-08T13:00:00+09:00';
  const session: Session = {
    id: 'unchecked-on-disk', taskId: null, quick: true, subject: '수학',
    action: '학생이 직접 푼 문제', started: '2026-11-08T12:55:00+09:00',
    ended, seconds: 300, target: 5, problems: 1, concepts: '',
    rating: '보통', reason: '', pauses: [], mistake: '', reviewDate: null,
    workspace: {
      problem: '지난번 직접 풀이를 확인할 문제', source: '',
      attempts: [{
        id: 'attempt-1', answer: '내가 적은 미확인 답',
        submittedAt: ended, selfCheck: 'unreviewed',
      }],
    },
  };
  await page.addInitScript((snapshot) => {
    if (!localStorage.getItem('bkit.study-os.v1')) {
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(snapshot));
    }
  }, { ...newState(), sessions: [session] });
  await page.goto('./');
  const due = page.getByRole('region', { name: '오늘 독립 재풀이' });
  await expect(due).toContainText('저장한 답부터 직접 확인해요');
  await due.getByRole('button', { name: '내 답 확인하기' }).click();

  const card = page.locator('.problem-review-card.bkit-review-card-selected');
  await expect(card).toContainText('지난번 직접 풀이를 확인할 문제');
  await expect(card.getByRole('textbox', { name: '다시 푼 내 답' })).toHaveCount(0);
  const checkFirst = card.getByRole('button', { name: '다시 연습 필요' });
  await expect(checkFirst).toBeFocused();
  await expect(card).toContainText('저장한 내 답: 내가 적은 미확인 답');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(before.sessions[0].workspace.attempts[0].selfCheck).toBe('unreviewed');

  // The learner, not the app, selects this outcome.
  await checkFirst.click();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(after.sessions[0].workspace.attempts[0].selfCheck).toBe('retry');
  expect(after.sessions[0].workspace.attempts[0].submittedAt).toBe(ended);
  expect(after.sessions[0].workspace.attempts[0].checkedAt).toBeDefined();
  expect(after.problemRetests ?? []).toHaveLength(0);
  await page.reload();
  await expect(page.getByRole('region', { name: '다음 독립 복습 일정' })).toContainText('2026-11-10');
});
