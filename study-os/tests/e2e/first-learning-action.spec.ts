import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, type State } from '../../src/model';
const key = 'bkit.study-os.v1';
const read = (page: Page): Promise<State> =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
async function nav(page: Page, name: string) {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
}
async function seed(page: Page, state = newState()) {
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, state);
  await page.goto('./');
}
const task = (id: string, extra = {}) =>
  taskSchema.parse({
    id,
    title: id + ' 실제 학습지',
    subject: '수학',
    kind: '숙제',
    due: null,
    minutes: 25,
    remaining: 25,
    status: 'todo',
    submitted: false,
    priority: 2,
    optional: false,
    notes: '기존 메모',
    link: '',
    ...extra,
  });

test('home capture starts the real recommended task, deduplicates first attempt and preserves the record', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '과제 등록', exact: true }).click();
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('수학 학습지 5문제');
  await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('첫 학습 행동', { exact: true })).toContainText('수학 학습지');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  let saved = await read(page);
  expect(saved.active?.taskId).toBe(saved.tasks[0].id);
  expect(saved.active?.target).toBe(5);
  const id = saved.active!.id;
  expect(saved.learningEvents?.filter((e) => e.type === 'FirstLearningAttempt')).toHaveLength(0);
  await expect(page.getByLabel('지금 할 첫 학습 행동')).toContainText('수학 학습지');
  await page.getByRole('button', { name: '첫 문제 시도했어요' }).click();
  await expect(page.getByText('첫 시도 기록 완료', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '다시 풀기', exact: true }).click();
  await page.getByText('내 답 · 막힌 부분 메모 (선택)', { exact: true }).click();
  await page.getByLabel('지금 문제와 내 생각').fill('종이에 조건을 적었고 단위가 헷갈려요.');
  // Navigate immediately, before debounce: the existing draft guard must flush.
  await nav(page, '오늘');
  await expect(page.getByLabel('첫 학습 행동', { exact: true })).toContainText('다시 풀어');
  await page.reload();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(page.getByLabel('지금 문제와 내 생각')).toHaveValue(
    '종이에 조건을 적었고 단위가 헷갈려요.',
  );
  await expect(page.getByRole('button', { name: '다시 풀기', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  saved = await read(page);
  expect(saved.active?.id).toBe(id);
  expect(saved.learningEvents?.filter((e) => e.type === 'FirstLearningAttempt')).toHaveLength(1);
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  saved = await read(page);
  expect(saved.active).toBeNull();
  expect(saved.sessions[0].id).toBe(id);
  expect(saved.sessions[0].taskId).toBe(saved.tasks[0].id);
  expect(saved.sessions[0].learningStep).toEqual({
    note: '종이에 조건을 적었고 단위가 헷갈려요.',
    next: 'retry',
  });
  expect(saved.tasks[0].submitted).toBe(false);
});

test('free five-minute study records an explicit attempt and keeps context when attaching a task', async ({
  page,
}) => {
  const state = newState();
  state.tasks = [task('연결할 과제')];
  await seed(page, state);
  await page.getByText('과제 바꾸기', { exact: true }).click();
  await page.getByLabel('지금 공부할 과제').selectOption('__free__');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  const first = (await read(page)).quickTimer!;
  expect(first.targetMinutes).toBe(5);
  await page.getByRole('button', { name: '첫 문제 시도했어요' }).click();
  await page.getByText('내 답 · 막힌 부분 메모 (선택)', { exact: true }).click();
  await page.getByLabel('지금 문제와 내 생각').fill('처음 쓴 답');
  await page.getByText('과제에 연결하기 (선택)', { exact: true }).click();
  await page.getByLabel('진행 중인 스톱워치 과제 연결').selectOption(state.tasks[0].id);
  await expect(page.getByLabel('지금 문제와 내 생각')).toHaveValue('처음 쓴 답');
  expect((await read(page)).active?.id).toBe(first.id);
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  const saved = await read(page);
  expect(saved.sessions[0].learningStep?.note).toBe('처음 쓴 답');
  expect(saved.learningEvents?.filter((e) => e.type === 'FirstLearningAttempt')).toHaveLength(1);
});

test('empty home starts free learning and never counts timer time as an attempt', async ({
  page,
}) => {
  await seed(page);
  await expect(page.getByLabel('첫 학습 행동', { exact: true })).toContainText('질문 하나');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await page.clock.runFor(6000);
  expect(
    (await read(page)).learningEvents?.filter((e) => e.type === 'FirstLearningAttempt'),
  ).toHaveLength(0);
  await page.getByRole('button', { name: '첫 문제 시도했어요' }).click();
  await page.reload();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(page.getByText('첫 시도 기록 완료', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  const saved = await read(page);
  expect(saved.quickTimer).toBeNull();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].problems).toBe(0);
});

test('100 tasks, zero quantity and user choice keep the recommendation and session aligned', async ({
  page,
}) => {
  const state = newState();
  state.tasks = Array.from({ length: 100 }, (_, i) => task('과제-' + i));
  state.tasks[0] = task('과제-0', {
    priority: 3,
    quantity: { unit: 'problems', total: 2, remaining: 0 },
  });
  await seed(page, state);
  await page.getByText('과제 바꾸기', { exact: true }).click();
  await page.getByLabel('지금 공부할 과제').selectOption('과제-99');
  await expect(page.getByLabel('첫 학습 행동', { exact: true })).toContainText('과제-99');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  const saved = await read(page);
  expect(saved.active?.taskId).toBe('과제-99');
  expect(saved.learningEvents?.filter((e) => e.type === 'StudyStarted').at(-1)?.taskId).toBe(
    '과제-99',
  );
  expect(saved.tasks).toHaveLength(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

for (const minute of [0, 3])
  test(`home protects a fixed schedule ${minute} minutes away`, async ({ page }) => {
    const state = newState();
    state.tasks = [task('보호된 과제')];
    state.schedules = [
      {
        id: 'academy',
        title: '실제 학원',
        subject: '수학',
        kind: 'academy',
        days: [4],
        date: '2026-10-22',
        start: minute ? '14:03' : '14:00',
        end: '15:00',
        prep: 0,
        travel: 0,
        buffer: 0,
        materials: '',
        excluded: [],
      },
    ];
    await seed(page, state);
    await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('첫 학습 행동', { exact: true })).toContainText('실제 학원');
    await page.getByRole('button', { name: '시간표 확인하기', exact: true }).click();
    expect((await read(page)).active).toBeNull();
    expect((await read(page)).quickTimer).toBeNull();
  });
