import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, type State } from '../../src/model';

test.use({ serviceWorkers: 'block' });

async function openCalendar(page: Page, state: State) {
  await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(saved));
  }, state);
  await page.goto('./');
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
}

test('selecting a date creates a dated assessment rather than an undated generic task', async ({ page }) => {
  await openCalendar(page, newState());
  await page.getByRole('button', { name: /^2026-10-26, 일정/ }).click();
  await page.getByRole('group', { name: '선택 날짜에 추가' })
    .getByRole('button', { name: '수행평가' }).click();
  await expect(page.getByRole('group', { name: '등록 종류' })
    .getByRole('button', { name: '수행평가' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('빠른 등록 마감')).toHaveValue('2026-10-26');
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('영어 발표 준비');
  await page.getByRole('button', { name: '오늘에 담기' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks.at(-1)).toMatchObject({
    kind: '수행평가', deadline: { date: '2026-10-26', precision: 'date-only' },
  });
});

test('school or academy shortcut preselects the exact chosen calendar date', async ({ page }) => {
  await openCalendar(page, newState());
  await page.getByRole('button', { name: /^2026-10-27, 일정/ }).click();
  await page.getByRole('group', { name: '선택 날짜에 추가' })
    .getByRole('button', { name: '학교·학원' }).click();
  const form = page.locator('#schedule-editor-form');
  await expect(form).toBeVisible();
  await expect(form.locator('input[name="date"]')).toHaveValue('2026-10-27');
  await expect(form.locator('select[name="kind"]')).toHaveValue('school');
  await form.locator('select[name="kind"]').selectOption('academy');
  await expect(form.locator('select[name="kind"]')).toHaveValue('academy');
});

test('day view shows date-only homework and starts its real task-linked five-minute session', async ({ page }) => {
  const state = newState();
  state.tasks = [taskSchema.parse({
    id: 'homework-math', title: '수학 극한 학습지', subject: '수학', kind: '숙제',
    due: null,
    deadline: { date: '2026-10-23', precision: 'date-only', provenance: 'user-confirmed' },
    priority: 2, minutes: 25, remaining: 25, status: 'todo',
    submitted: false, optional: false, notes: '', link: '',
  })];
  await openCalendar(page, state);
  await page.getByRole('button', { name: '일', exact: true }).click();
  await expect(page.getByLabel('마감 시간 미정')).toContainText('수학 극한 학습지');
  await page.getByRole('button', { name: '수학 극한 학습지 5분 공부 시작' }).click();
  await expect(page.getByRole('heading', { name: '집중', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active?.taskId).toBe('homework-math');
  expect(saved.active?.target).toBe(5);
});

test('completed deadline stays visible but cannot launch an extra study session', async ({ page }) => {
  const state = newState();
  state.tasks = [taskSchema.parse({
    id: 'done', title: '제출 대기 보고서', subject: '화학', kind: '수행평가',
    due: null,
    deadline: { date: '2026-10-23', precision: 'date-only', provenance: 'user-confirmed' },
    priority: 2, minutes: 20, remaining: 0, status: 'done',
    submitted: false, optional: false, notes: '', link: '',
  })];
  await openCalendar(page, state);
  await expect(page.getByRole('region', { name: '선택 날짜 일정' }))
    .toContainText('제출 대기 보고서');
  await expect(page.getByRole('button', { name: '제출 대기 보고서 5분 공부 시작' }))
    .toHaveCount(0);
});
