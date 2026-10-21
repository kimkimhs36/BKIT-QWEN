import { test, expect, type Page } from './local-fixture';
import { newState, scheduleSchema, taskSchema, type State } from '../../src/model';
import AxeBuilder from '@axe-core/playwright';
import { at, iso } from '../../src/time';
test.setTimeout(90000);
const key = 'bkit.study-os.v1',
  day = '2026-10-21';
async function seed(page: Page, state: State = newState()) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-21T04:00:00Z') });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, state);
  await page.goto('./');
}
const schedule = (id = 'school', extra = {}) =>
  scheduleSchema.parse({
    id,
    title: '수학 수업',
    subject: '수학',
    kind: 'school',
    days: [3],
    start: '14:00',
    end: '14:50',
    prep: 0,
    travel: 0,
    buffer: 0,
    materials: '302호',
    date: null,
    excluded: [],
    ...extra,
  });
async function saved(page: Page): Promise<State> {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
}
test('capture photo, review, save, reload and calendar share a single durable task', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
  await page.getByRole('button', { name: '수행평가', exact: true }).click();
  await page
    .getByRole('textbox', { name: '할 일을 한 문장으로' })
    .fill('내일 과학 탐구 보고서 제출');
  await expect(page.getByRole('button', { name: '사진 촬영', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '갤러리 선택', exact: true })).toBeVisible();
  const camera = page.getByLabel('카메라로 과제 촬영');
  await expect(camera).toHaveAttribute('capture', 'environment');
  await camera.setInputFiles('tests/fixtures/printed-homework.png');
  await expect(page.getByText('원본 보관 중… 저장이 끝날 때까지 기다려 주세요.')).toHaveCount(0);
  await expect(page.locator('.atelier-photos img')).toHaveCount(1);
  await page.getByLabel('갤러리 사진 첨부').setInputFiles('tests/fixtures/printed-homework.png');
  await expect(page.locator('.atelier-photos img')).toHaveCount(1);
  await page.getByRole('button', { name: '오늘에 담기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let state = await saved(page);
  expect(state.tasks).toHaveLength(1);
  expect(state.tasks[0].attachmentIds).toHaveLength(1);
  expect(state.tasks[0].kind).toBe('수행평가');
  expect(state.tasks[0].submitted).toBe(false);
  await page.reload();
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.getByRole('button', { name: '2026-10-22, 일정 1개', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: '선택 날짜 일정' })
      .getByText('내일 과학 탐구 보고서 제출', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
  await page.getByRole('button', { name: '수행평가', exact: true }).click();
  await page
    .getByRole('textbox', { name: '할 일을 한 문장으로' })
    .fill('내일 과학 탐구 보고서 제출');
  await page.getByRole('button', { name: '오늘에 담기' }).click();
  await expect(page.getByRole('alert')).toContainText('같은 과제가 이미');
  expect((await saved(page)).tasks).toHaveLength(1);
});
test('one-day class change is previewed, survives back, and leaves the weekly series intact', async ({
  page,
}) => {
  const s = newState();
  s.schedules = [schedule()];
  await seed(page, s);
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.locator('.calendar-entry.school').getByRole('button').first().click();
  await page.getByLabel('수업 · 일정 시작', { exact: true }).fill('15:00');
  await page.getByLabel('종료', { exact: true }).fill('15:50');
  await page.getByRole('button', { name: '일정 저장', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '일정 변경 미리보기', exact: true }),
  ).toBeVisible();
  expect((await saved(page)).schedules).toHaveLength(1);
  await page.getByRole('button', { name: '돌아가기', exact: true }).click();
  await expect(page.getByLabel('수업 · 일정 시작', { exact: true })).toHaveValue('15:00');
  await page.getByRole('button', { name: '일정 저장', exact: true }).click();
  await page.getByRole('button', { name: '확인 후 적용', exact: true }).click();
  await page.reload();
  const state = await saved(page);
  expect(state.schedules).toHaveLength(2);
  expect(state.schedules[0].excluded).toEqual([day]);
  expect(state.schedules[0].start).toBe('14:00');
  expect(state.schedules[1].date).toBe(day);
  expect(state.schedules[1].start).toBe('15:00');
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await expect(page.locator('.calendar-entry.school small').first()).toContainText('15:00');
  await page.getByRole('button', { name: '이날 취소', exact: true }).click();
  await page.getByRole('button', { name: '확인 후 적용', exact: true }).click();
  expect((await saved(page)).schedules).toHaveLength(1);
});
test('calendar views, help, five screens and settings work without clipping', async ({
  page,
}, info) => {
  const s = newState();
  s.schedules = [
    schedule(),
    schedule('academy', { kind: 'academy', title: '영어 학원', start: '17:00', end: '17:50' }),
  ];
  await seed(page, s);
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  const dialog = page.getByRole('dialog');
  expect(
    await dialog.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return (
        r.top >= -1 && r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
      );
    }),
  ).toBe(true);
  for (const view of ['일', '주', '월', '연도', '여러 해']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    await expect(page.getByRole('button', { name: view, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await page.getByRole('button', { name: '다음 기간' }).click();
  await page.getByRole('button', { name: /2038\s*년/, exact: true }).click();
  await page.getByRole('button', { name: '2038년 2월 열기' }).click();
  await expect(page.locator('.calendar-toolbar h2')).toHaveText('2038년 2월');
  await page.screenshot({ path: `test-results/recovery-${info.project.name}-calendar.png` });
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '오늘의 공부', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '도움말 열기' }).click();
  await expect(page.getByRole('heading', { name: 'BKIT 사용 안내' })).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  for (const label of ['집중', '과제', '기록', '도구', '오늘']) {
    await page
      .locator('nav:visible')
      .getByRole('button', { name: label, exact: true })
      .first()
      .click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await page.screenshot({ path: `test-results/recovery-${info.project.name}-home.png` });
});
test('saved theme and reduced motion preserve study records and accessible calendar', async ({
  page,
}) => {
  await seed(page);
  const before = await saved(page);
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: /Soft Jelly/ }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'jelly');
  const after = await saved(page);
  expect({
    tasks: after.tasks,
    schedules: after.schedules,
    sessions: after.sessions,
    plan: after.plan,
  }).toEqual({
    tasks: before.tasks,
    schedules: before.schedules,
    sessions: before.sessions,
    plan: before.plan,
  });
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  const results = await new AxeBuilder({ page })
    .include('[role=dialog]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
test('schedule conflict is visible and an optional replan protects a locked block', async ({
  page,
}) => {
  const s = newState();
  s.schedules = [schedule()];
  s.tasks = [
    taskSchema.parse({
      id: 'task',
      subject: '영어',
      title: '영어 독해',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  s.plan = [
    {
      id: 'locked',
      taskId: 'task',
      start: iso(at(day, '15:00')),
      end: iso(at(day, '15:25')),
      locked: true,
    },
  ];
  await seed(page, s);
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.locator('.calendar-entry.school').getByRole('button').first().click();
  await page.getByLabel('수업 · 일정 시작', { exact: true }).fill('15:00');
  await page.getByLabel('종료', { exact: true }).fill('15:50');
  await page.getByRole('button', { name: '일정 저장', exact: true }).click();
  await expect(page.getByLabel('제안된 공부 계획도 함께 적용')).toBeDisabled();
  await expect(
    page.getByText('새 일정과 겹치는 공부 계획이 있어요.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: '확인 후 적용' }).click();
  expect((await saved(page)).plan).toEqual(s.plan);
});

test('detailed entry keeps the capture draft, completion and submission remain separate, then deletion persists', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('내일 수학 학습지 제출');
  await page.getByRole('button', { name: '상세 입력', exact: true }).click();
  await expect(page.locator('[name=title]')).toHaveValue('내일 수학 학습지 제출');
  await expect(page.locator('[name=subject]')).toHaveValue('수학');
  await page.getByRole('button', { name: '과제 저장', exact: true }).click();
  await page.locator('.study-task-copy').first().click();
  await page.locator('.study-task-details summary').click();
  await page.getByRole('combobox', { name: '학습 상태', exact: true }).selectOption('done');
  await page.getByRole('button', { name: '과제 저장', exact: true }).click();
  expect((await saved(page)).tasks[0]).toMatchObject({ status: 'done', submitted: false });
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.getByRole('button', { name: '2026-10-22, 일정 1개', exact: true }).click();
  await page.locator('.calendar-entry.task').getByRole('button').first().click();
  await page.locator('.study-task-details summary').click();
  await page.getByLabel('제출 완료 (학습 완료 상태에서 체크)').check();
  await page.getByRole('button', { name: '과제 저장', exact: true }).click();
  await page.reload();
  expect((await saved(page)).tasks[0].submitted).toBe(true);
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.getByRole('button', { name: '2026-10-22, 일정 1개', exact: true }).click();
  await page.locator('.calendar-entry.task').getByRole('button').first().click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.reload();
  expect((await saved(page)).tasks).toHaveLength(0);
});

test('dated academy makeup and an approved learning proposal update the same calendar state', async ({
  page,
}) => {
  const s = newState();
  s.schedules = [schedule()];
  s.tasks = [
    taskSchema.parse({
      id: 'reading',
      subject: '국어',
      title: '비문학 독해',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  await seed(page, s);
  await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
  await page.getByRole('button', { name: '일정', exact: true }).click();
  await page.getByLabel('학교 과목 · 학원 이름 · 일정').fill('영어 보충수업');
  await page.getByRole('combobox', { name: '구분', exact: true }).selectOption('academy');
  await page.getByLabel('하루만 적용할 날짜 (입력하면 반복 요일보다 우선)').fill('2026-10-22');
  await page.getByLabel('수업 · 일정 시작', { exact: true }).fill('16:00');
  await page.getByLabel('종료', { exact: true }).fill('16:50');
  await page.getByRole('button', { name: '일정 저장', exact: true }).click();
  await page.getByLabel('제안된 공부 계획도 함께 적용').check();
  expect((await saved(page)).schedules).toHaveLength(1);
  await page.getByRole('button', { name: '확인 후 적용' }).click();
  const state = await saved(page);
  expect(state.schedules).toHaveLength(2);
  expect(state.schedules[1]).toMatchObject({ date: '2026-10-22', kind: 'academy' });
  expect(state.plan.length).toBeGreaterThan(0);
  expect(state.tasks).toEqual(s.tasks);
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.getByRole('button', { name: '2026-10-22, 일정 1개', exact: true }).click();
  await expect(page.locator('.calendar-entry.academy strong')).toHaveText('영어 보충수업');
});

test('small phone, rotation, keyboard-sized viewport and storage failure keep the input recoverable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page);
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 440 });
  await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('수학 과제 보존');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'bkit.study-os.v1')
        throw new DOMException('Test quota failure', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  });
  await page.getByRole('button', { name: '오늘에 담기' }).click();
  await expect(page.getByRole('textbox', { name: '할 일을 한 문장으로' })).toHaveValue(
    '수학 과제 보존',
  );
  expect((await saved(page)).tasks).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
