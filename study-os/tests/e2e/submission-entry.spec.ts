import { test, expect } from './local-fixture';
import { newState, taskSchema } from '../../src/model';
test.use({ reducedMotion: 'reduce' });
test('home submission count opens all pending submissions after an assessment filter was selected', async ({
  page,
}) => {
  const state = newState();
  const base = {
    subject: '수학',
    kind: '숙제',
    due: null,
    priority: 2,
    minutes: 25,
    remaining: 1,
    submitted: false,
    optional: false,
    notes: '보존할 메모',
    link: '',
  };
  state.tasks = [
    taskSchema.parse({
      ...base,
      id: 'homework',
      title: '이미 끝낸 숙제',
      status: 'done',
      submissionRequired: true,
    }),
    taskSchema.parse({
      ...base,
      id: 'assessment',
      title: '진행할 수행평가',
      kind: '수행평가',
      status: 'todo',
      submissionRequired: false,
    }),
  ];
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.addInitScript(
    (state) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(state)),
    state,
  );
  await page.goto('./');
  await page
    .getByRole('navigation', { name: '학교 할 일 바로가기' })
    .getByRole('button', { name: /수행평가/ })
    .click();
  await expect(
    page
      .getByRole('group', { name: '과제 유형' })
      .getByRole('button', { name: '수행평가', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: '제출 확인 1개 남았어요', exact: true }).click();
  await expect(
    page
      .getByRole('group', { name: '과제 유형' })
      .getByRole('button', { name: '전체', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: '과제 목록' })).toContainText('이미 끝낸 숙제');
  await page.getByRole('button', { name: '이미 끝낸 숙제 제출 완료 기록', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks.find((t: { id: string }) => t.id === 'homework')).toMatchObject({
    status: 'done',
    submitted: true,
    notes: '보존할 메모',
  });
  expect(saved.tasks.find((t: { id: string }) => t.id === 'assessment')).toEqual(state.tasks[1]);
});
