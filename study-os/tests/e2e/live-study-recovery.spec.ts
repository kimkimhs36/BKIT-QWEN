import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, scheduleSchema, type State } from '../../src/model';
import { addResource } from '../../src/learningEngine';
const key = 'bkit.study-os.v1';
const date = '2026-10-23';
const now = new Date(date + 'T04:00:00Z');
const state = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
const task = (id: string) =>
  taskSchema.parse({
    id,
    subject: '수학',
    title: '실제 과제 ' + id,
    kind: '숙제',
    due: null,
    priority: 2,
    minutes: 25,
    remaining: 25,
    status: 'todo',
    submitted: false,
    optional: false,
    notes: '기존 메모',
    link: '',
  });
async function seed(page: Page, s: State = newState()) {
  await page.clock.install({ time: now });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, s);
  await page.goto('./');
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeVisible();
}
async function nav(page: Page, name: string) {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
}
async function school(page: Page) {
  await nav(page, '도구');
  await page
    .getByRole('navigation', { name: '추가 도구' })
    .getByRole('button', { name: '시간표', exact: true })
    .click();
}
async function problem(page: Page) {
  await page.getByRole('button', { name: '첫 문제 기록', exact: true }).click();
  await page
    .getByLabel('지금 풀 문제 또는 떠올릴 질문', { exact: true })
    .fill('내 학습지에 적힌 첫 문제');
  await page.getByRole('button', { name: '문제 정하고 시작', exact: false }).click();
}
test.setTimeout(90000);

test('free five-minute study: first action, draft, pause, reload, explicit attempt and one saved receipt', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  const quick = (await state(page)).quickTimer;
  expect(quick.targetMinutes).toBe(5);
  await expect(page.locator('.focus-first-action')).toContainText('질문 하나');
  await page.clock.fastForward(65000);
  await problem(page);
  expect((await state(page)).active).toMatchObject({
    id: quick.id,
    taskId: null,
    started: quick.started,
  });
  const answer = page.getByLabel('내 답을 먼저 써보기', { exact: true });
  await answer.fill('사라지면 안 되는 내 풀이');
  await nav(page, '오늘');
  await page.reload();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(answer).toHaveValue('사라지면 안 되는 내 풀이');
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.getByLabel('일시정지 사유').fill('잠깐 휴식');
  await page.getByRole('dialog').getByRole('button', { name: '일시정지', exact: true }).click();
  const paused = (await state(page)).active;
  await page.clock.fastForward(360000);
  await page.reload();
  await nav(page, '집중');
  expect((await state(page)).active).toEqual(paused);
  expect(paused.workspace.attempts).toHaveLength(0);
  expect(
    (await state(page)).learningEvents?.filter(
      (e: { type: string }) => e.type === 'FirstLearningAttempt',
    ) ?? [],
  ).toHaveLength(0);
  await page.getByRole('button', { name: '다시 시작', exact: true }).click();
  await page.getByRole('button', { name: '내 답 저장', exact: false }).click();
  expect((await state(page)).active.workspace.attempts).toHaveLength(1);
  await page.getByRole('button', { name: '내가 확인했어', exact: false }).click();
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  const saved = await state(page);
  expect(saved.active).toBeNull();
  expect(saved.quickTimer).toBeNull();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0]).toMatchObject({
    id: quick.id,
    taskId: null,
    problems: 0,
    workspace: { attempts: [{ answer: '사라지면 안 되는 내 풀이', selfCheck: 'remembered' }] },
  });
  expect(
    saved.learningEvents.filter((e: { type: string }) => e.type === 'FirstLearningAttempt'),
  ).toHaveLength(1);
  await page.reload();
  expect((await state(page)).sessions).toEqual(saved.sessions);
});

test('a selected task is exact; another task never silently opens the current task session', async ({
  page,
}) => {
  const s = newState();
  s.tasks = [task('A'), task('B')];
  await seed(page, s);
  await page.getByRole('button', { name: '실제 과제 B 5분 시작', exact: true }).click();
  expect((await state(page)).active.taskId).toBe('B');
  await expect(page.locator('.focus-first-action')).toContainText('실제 과제 B');
  await nav(page, '오늘');
  await page.getByRole('button', { name: '실제 과제 A 5분 시작', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '학습을 저장하고 종료' })).toBeVisible();
  expect((await state(page)).active.taskId).toBe('B');
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  await nav(page, '오늘');
  await page.getByRole('button', { name: '실제 과제 A 5분 시작', exact: true }).click();
  expect((await state(page)).active.taskId).toBe('A');
  expect((await state(page)).tasks.map((t: { notes: string }) => t.notes)).toEqual([
    '기존 메모',
    '기존 메모',
  ]);
});

test('failed draft storage preserves the answer and blocks route changes until retry succeeds', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await problem(page);
  const before = await state(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restoreSave = () => (Storage.prototype.setItem = original);
    Storage.prototype.setItem = function (k, v) {
      if (k === 'bkit.study-os.v1') throw new DOMException('full', 'QuotaExceededError');
      original.call(this, k, v);
    };
  });
  const answer = page.getByLabel('내 답을 먼저 써보기', { exact: true });
  await answer.fill('실패해도 보존할 답');
  await nav(page, '오늘');
  await expect(answer).toHaveValue('실패해도 보존할 답');
  await expect(page.getByRole('button', { name: '초안 다시 저장', exact: true })).toBeVisible();
  expect((await state(page)).active.workspace).toEqual(before.active.workspace);
  await page.evaluate(() => (window as any).restoreSave());
  await page.getByRole('button', { name: '초안 다시 저장', exact: true }).click();
  await nav(page, '오늘');
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(answer).toHaveValue('실패해도 보존할 답');
});

test('selected school date adds a task and an assessment with no invented deadline time', async ({
  page,
}) => {
  await seed(page);
  await school(page);
  await page.getByLabel('조회 날짜').fill('2026-10-24');
  for (const [label, title] of [
    ['과제', '토요일 숙제'],
    ['수행평가', '토요일 수행평가'],
  ]) {
    await page
      .getByRole('group', { name: '선택 날짜에 추가' })
      .getByRole('button', { name: label, exact: true })
      .click();
    const d = page.getByRole('dialog');
    await expect(d.locator('[name="dueDate"]')).toHaveValue('2026-10-24');
    await d.locator('[name="subject"]').fill('수학');
    await d.locator('[name="title"]').fill(title);
    await d.getByRole('button', { name: '과제 저장', exact: true }).click();
  }
  const tasks = (await state(page)).tasks;
  expect(tasks).toHaveLength(2);
  expect(tasks[1].kind).toBe('수행평가');
  for (const t of tasks) {
    expect(t.deadline).toMatchObject({ date: '2026-10-24', precision: 'date-only' });
    expect(t.submitted).toBe(false);
    expect(t.due).toBe('2026-10-24T14:59:00.000Z');
  }
  await school(page);
  await expect(page.getByRole('region', { name: '선택 날짜 과제 마감' })).toContainText(
    '시각 미확인',
  );
  await page.getByRole('button', { name: '토요일 숙제 5분 공부 시작', exact: true }).click();
  expect((await state(page)).active.taskId).toBe(tasks[0].id);
});

test('one-day schedule edit and cancellation preserve the weekly original and next week', async ({
  page,
}) => {
  const s = newState();
  s.schedules = [
    scheduleSchema.parse({
      id: 'weekly',
      title: '매주 수학',
      subject: '수학',
      kind: 'school',
      days: [5],
      date: null,
      start: '09:00',
      end: '09:50',
      prep: 0,
      travel: 0,
      buffer: 0,
      materials: '노트',
      excluded: [],
    }),
  ];
  await seed(page, s);
  await school(page);
  await page.getByRole('button', { name: '매주 수학 이 날짜만 수정', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.locator('[name="start"]').fill('10:00');
  await d.locator('[name="end"]').fill('10:50');
  await d.getByRole('button', { name: '일정 저장', exact: true }).click();
  let stored = await state(page);
  expect(stored.schedules[0]).toEqual({ ...s.schedules[0], excluded: [date] });
  expect(stored.schedules[1].date).toBe(date);
  await page.getByRole('button', { name: '매주 수학 이 날짜만 수정', exact: true }).click();
  await d.getByRole('button', { name: '이 날짜만 취소', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '등록된 수업이 없어요', exact: true }),
  ).toBeVisible();
  await page.getByLabel('조회 날짜').fill('2026-10-30');
  await expect(page.locator('.schedule-row')).toContainText('매주 수학');
  stored = await state(page);
  expect(stored.schedules[0].start).toBe('09:00');
  expect(stored.schedules).toHaveLength(2);
});

test('task-linked materials keep QUESTION RACE, problem draft and selected question after reload', async ({
  page,
}) => {
  const s = newState();
  s.tasks = [task('A')];
  const populated = addResource(
    s,
    {
      title: '실제 학습지',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: 'A',
      linkedMediaIds: [],
    },
    ['학생이 입력한 문제 하나', '학생이 입력한 문제 둘'],
  );
  await seed(page, populated);
  await page.getByRole('button', { name: '실제 과제 A 5분 시작', exact: true }).click();
  await expect(page.getByRole('region', { name: '문제별 시간 진행', exact: true })).toBeVisible();
  const workspace = page.getByRole('region', { name: '다중 문제 학습실' });
  const select = workspace.getByLabel('문제 목록', { exact: true });
  await select.selectOption(populated.learning!.problems[1].id);
  await workspace.getByLabel('최종 답', { exact: true }).fill('자료의 두 번째 답안 초안');
  await nav(page, '오늘');
  await page.reload();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(select).toHaveValue(populated.learning!.problems[1].id);
  await expect(workspace.getByLabel('최종 답', { exact: true })).toHaveValue(
    '자료의 두 번째 답안 초안',
  );
  expect((await state(page)).learning.attempts).toHaveLength(0);
});

test('camera input and real local OCR remain usable; AI configuration failure keeps manual text and confirmed saving', async ({
  page,
}) => {
  await seed(page);
  await nav(page, '도구');
  await page.getByRole('button', { name: '공지 정리', exact: true }).click();
  await expect(page.getByLabel('카메라 사진', { exact: true })).toHaveAttribute(
    'capture',
    'environment',
  );
  await page
    .getByLabel('갤러리 사진', { exact: true })
    .setInputFiles('tests/fixtures/printed-homework.png');
  await page.getByText('사진에서 글자 가져오기 · 선택', { exact: true }).click();
  await page.getByRole('button', { name: '이 사진 글자 읽기', exact: true }).click();
  await expect(page.getByLabel('사진에서 읽은 글자', { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByLabel('사진에서 읽은 글자', { exact: true })).toHaveValue(/수학|숙제/);
  expect((await state(page)).tasks).toHaveLength(0);
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await page.getByLabel('오늘 해야 할 일', { exact: true }).fill('수학 학습지 3문제');
  await page.route('**/api/config', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.getByText('AI로 할 일 정리 · 선택', { exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'AI 서버에 연결하지 못했어요' }),
  ).toBeVisible();
  await expect(page.getByLabel('오늘 해야 할 일', { exact: true })).toHaveValue(
    '수학 학습지 3문제',
  );
  await page.getByRole('button', { name: '사진 없이 과제 확인하기', exact: false }).click();
  await expect(page.getByLabel('과제 1 내용', { exact: true })).toHaveValue('수학 학습지 3문제');
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장', exact: false }).click();
  expect((await state(page)).tasks).toHaveLength(1);
  expect((await state(page)).tasks[0].attachmentIds).toHaveLength(1);
});

test('existing JSON backup and restore preserve tasks, schedules, and original pre-restore bytes', async ({
  page,
}) => {
  const original = newState();
  original.tasks = [task('backup')];
  await seed(page, original);
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.locator('.compact-section>summary').filter({ hasText: '백업 · 복구' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 백업 내보내기', exact: true }).click();
  const exported = await download;
  const stream = await exported.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const snapshot = JSON.parse(Buffer.concat(chunks).toString());
  expect(snapshot.tasks).toEqual(original.tasks);
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page
    .getByLabel('JSON 백업 파일', { exact: true })
    .setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });
  await page.getByRole('button', { name: '백업으로 교체', exact: true }).click();
  expect((await state(page)).tasks).toEqual(original.tasks);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith('bkit.study-os.v1.before-restore.'))
        .map((k) => localStorage.getItem(k)),
    ),
  ).toContain(before);
});
