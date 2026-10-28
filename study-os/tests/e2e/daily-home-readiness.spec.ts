import { test, expect } from './local-fixture';
import { newState, type Task } from '../../src/model';
import { at, iso } from '../../src/time';

test('home counts deadlines once and opens all unsubmitted assessments after reload', async ({
  page,
}) => {
  const due = iso(at('2026-10-19', '23:59'));
  const assessment: Task = {
    id: 'assessment',
    subject: '영어',
    title: '발표',
    kind: '수행평가',
    due,
    deadline: { date: '2026-10-19', precision: 'date-only', provenance: 'explicit' },
    priority: 3,
    minutes: 25,
    remaining: 25,
    status: 'done',
    submitted: false,
    submissionRequired: true,
    optional: false,
    notes: '',
    link: '',
  };
  const pending: Task = { ...assessment, id: 'pending', title: '보고서', status: 'todo' };
  const state = newState();
  state.tasks = [assessment, pending];
  state.plan = [
    {
      id: 'block',
      taskId: 'pending',
      start: iso(at('2026-10-19', '16:00')),
      end: iso(at('2026-10-19', '16:25')),
      locked: false,
    },
  ];
  await page.clock.install({ time: new Date('2026-10-19T05:00:00Z') });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, state);
  await page.goto('./');
  await expect(page.getByRole('button', { name: /오늘 마감 2/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /아직 제출하지 않은 수행평가 1개/ })).toBeVisible();
  await page.getByRole('button', { name: /학습 완료 후 제출 확인 1개/ }).click();
  const list = page.getByRole('region', { name: '과제 목록' });
  await expect(list).toContainText('발표');
  await expect(list).not.toContainText('보고서');
});
