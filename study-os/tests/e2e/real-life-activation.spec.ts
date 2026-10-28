import { test, expect, type Page } from './local-fixture';
import { newState, scheduleSchema, taskSchema } from '../../src/model';
import { portableStudyState } from '../../src/portableStudyState';
import { INBOX_KEY } from '../../src/schoolInbox';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
test.use({ serviceWorkers: 'block' });
const nav = async (page: Page, label: string) =>
  page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: label, exact: true })
    .click();
async function seed(page: Page, state = newState(), at = '2026-10-19T05:00:00Z') {
  await page.clock.install({ time: new Date(at) });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, state);
  await page.goto('./');
}
async function inbox(page: Page) {
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  return page.getByRole('region', { name: '학교 공지 받은함' });
}
async function register(page: Page, title: string, date = '') {
  await page.getByLabel('확인한 과제 이름', { exact: true }).fill(title);
  await page.getByLabel('확인한 과목', { exact: true }).fill('영어');
  if (date) await page.getByLabel('확인한 마감 날짜', { exact: true }).fill(date);
  await page.getByLabel('원본의 이 과제와 마감을 대조했어요', { exact: true }).check();
  await page.getByRole('button', { name: '확인한 과제 등록', exact: true }).click();
}
const state = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));

test('forgotten notice survives closing page, local OCR failure, duplicate retry and task completion', async ({
  page,
  context,
}, info) => {
  await seed(page);
  await inbox(page);
  await page.getByRole('button', { name: '사진·PDF 공지 추가', exact: true }).click();
  await page
    .getByLabel('원본 공지', { exact: true })
    .fill('영어 발표 수행평가 · 10월 20일 · 제출 자료 원본 확인');
  await page
    .getByLabel('갤러리 사진 첨부', { exact: true })
    .setInputFiles('tests/fixtures/printed-homework.png');
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  await page.close();
  page = await context.newPage();
  await page.goto('./');
  await inbox(page);
  await expect(page.getByLabel('원본 공지', { exact: true })).toHaveValue(/영어 발표/);
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  await page.route('**/ocr/**', (r) => r.abort());
  await page.locator('.photo-text > summary').click();
  await page.getByRole('button', { name: '이 사진 글자 읽기', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /글자 읽기/ })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  await register(page, '발표 자료 준비', '2026-10-20');
  await expect(page.getByRole('region', { name: '공지에서 등록한 과제' })).toContainText(
    '제출 미확인',
  );
  expect((await state(page)).tasks).toHaveLength(1);
  await page.getByLabel('원본의 이 과제와 마감을 대조했어요', { exact: true }).check();
  await page.getByRole('button', { name: '확인한 과제 등록', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '같은 과제가 이미' })).toBeVisible();
  expect((await state(page)).tasks).toHaveLength(1);
  await page
    .getByRole('region', { name: '공지에서 등록한 과제' })
    .getByRole('button', { name: '달력에서 보기' })
    .click();
  await expect(page.getByLabel('조회 날짜')).toHaveValue('2026-10-20');
  await nav(page, '과제');
  await page.getByRole('button', { name: '발표 자료 준비 학습 완료로 변경', exact: true }).click();
  await nav(page, '오늘');
  await page.getByRole('button', { name: /아직 제출하지 않은 수행평가 1개/ }).click();
  await expect(page.getByRole('region', { name: '과제 목록' })).toContainText('발표 자료 준비');
  await nav(page, '오늘');
  await inbox(page);
  await expect(page.getByRole('region', { name: '공지에서 등록한 과제' })).toContainText(
    '학습 완료 · 제출 미확인',
  );
  const dir = '/tmp/bkit-evidence/' + info.project.name;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: dir + '/notice.png', fullPage: true });
});

test('inbox quota failure keeps text and photo, retry persists only confirmed tasks and source', async ({
  page,
}) => {
  await seed(page);
  await inbox(page);
  await page.getByRole('button', { name: '사진·PDF 공지 추가' }).click();
  await page.getByLabel('원본 공지', { exact: true }).fill('수학 원본 공지');
  await page
    .getByLabel('갤러리 사진 첨부', { exact: true })
    .setInputFiles('tests/fixtures/printed-homework.png');
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  await page.evaluate(() => {
    const old = Storage.prototype.setItem;
    (window as any).restore = () => {
      Storage.prototype.setItem = old;
    };
    Storage.prototype.setItem = function (k, v) {
      if (k === 'bkit.school-inbox.v1' || k === 'bkit.study-os.v1')
        throw new DOMException('full', 'QuotaExceededError');
      old.call(this, k, v);
    };
  });
  await page.getByLabel('원본 공지', { exact: true }).fill('저장 실패에도 남겨야 할 공지');
  await expect(page.getByRole('alert').first()).toContainText('저장 확인 필요');
  await register(page, '원본 보며 문제 풀기');
  expect((await state(page)).tasks).toHaveLength(0);
  await expect(page.getByLabel('원본 공지', { exact: true })).toHaveValue(
    '저장 실패에도 남겨야 할 공지',
  );
  await page.evaluate(() => (window as any).restore());
  await page.getByRole('button', { name: '공지 저장 재시도' }).click();
  await page.getByRole('button', { name: '확인한 과제 등록' }).click();
  await page.reload();
  await inbox(page);
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  expect((await state(page)).tasks[0]).toMatchObject({ due: null, submitted: false });
});

test('actual Korean OCR is local and cannot create a task before original comparison', async ({
  page,
}) => {
  test.setTimeout(90000);
  await seed(page);
  await inbox(page);
  await page.getByRole('button', { name: '사진·PDF 공지 추가' }).click();
  await page.getByLabel('갤러리 사진 첨부').setInputFiles('tests/fixtures/printed-homework.png');
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  await page.locator('.photo-text > summary').click();
  await page.getByRole('button', { name: '이 사진 글자 읽기', exact: true }).click();
  await expect(page.getByLabel('사진에서 읽은 글자', { exact: true })).toHaveValue(/수학.*20/, {
    timeout: 70000,
  });
  expect((await state(page)).tasks).toHaveLength(0);
  await page.getByRole('button', { name: '이 내용으로 과제 확인', exact: true }).click();
  await expect(page.getByLabel('공지에서 읽은 글', { exact: true })).toHaveValue(/수학.*20/);
  await expect(page.getByRole('button', { name: '확인한 과제 등록' })).toBeDisabled();
});

test('bulk timetable matches Korean weekday, current class, tomorrow and one-day change', async ({
  page,
}, info) => {
  await seed(page, newState(), '2026-10-18T23:40:00Z');
  await page.getByRole('button', { name: '학교 시간표', exact: true }).click();
  await page.getByText('시간표 한 번에 등록 · 표 붙여넣기', { exact: true }).click();
  await page
    .getByLabel('시간표 표 붙여넣기')
    .fill(
      '월\t08:30\t09:20\t수학\t2-1\n월\t09:30\t10:20\t영어\t어학실\n화\t08:30\t09:20\t물리학Ⅱ\t과학실',
    );
  await page.getByRole('button', { name: '입력 시간표 확인' }).click();
  await page.getByRole('button', { name: '확인한 시간표 저장' }).click();
  const timetable = page.getByRole('region', { name: '학교 시간표' });
  await expect(timetable).toContainText('10월 19일 월요일');
  await expect(timetable).toContainText('지금 수업');
  await expect(timetable).toContainText('다음 수업');
  await timetable.getByRole('button', { name: '내일 시간표', exact: true }).click();
  await expect(timetable).toContainText('물리학Ⅱ');
  await expect(timetable).not.toContainText('영어');
  await page.reload();
  await page.getByRole('button', { name: '학교 시간표', exact: true }).click();
  await timetable.getByRole('button', { name: '이 날짜 수업 변경' }).first().click();
  await page.locator('[name=title]').fill('수학 자습 변경');
  await page.getByRole('button', { name: '일정 저장', exact: true }).click();
  await expect(timetable).toContainText('수학 자습 변경');
  const saved = await state(page);
  expect(saved.schedules[0].excluded).toContain('2026-10-19');
  expect(saved.schedules.find((s: any) => s.title === '수학 자습 변경').date).toBe('2026-10-19');
  await nav(page, '오늘');
  await expect(page.getByRole('region', { name: '지금 챙길 일정' })).toContainText('08:30');
  const dir = '/tmp/bkit-evidence/' + info.project.name;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: dir + '/morning.png', fullPage: true });
});

test('academy preparation and sleep protect real time; missed task remains and five minutes saves', async ({
  page,
}) => {
  const s = newState();
  s.schedules = [
    scheduleSchema.parse({
      id: 'academy',
      title: '영어 학원',
      subject: '영어',
      kind: 'academy',
      days: [1],
      start: '18:00',
      end: '20:00',
      prep: 10,
      travel: 25,
      buffer: 5,
      materials: '단어장',
      date: null,
      excluded: [],
    }),
  ];
  s.tasks = [
    taskSchema.parse({
      id: 'late-task',
      title: '미뤄둔 학습지',
      subject: '영어',
      kind: '수행평가',
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
  await seed(page, s, '2026-10-19T08:14:00Z');
  const action = page.getByRole('region', { name: '지금 챙길 일정' });
  await expect(action).toContainText('준비 17:20 · 출발 목표 17:30 · 수업 18:00');
  await expect(action).toContainText('앱 종료 후 알림은 지원하지 않아요');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await page.clock.fastForward(300000);
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  const saved = await state(page);
  expect(saved.sessions[0].seconds).toBeGreaterThanOrEqual(300);
  expect(saved.tasks[0].submitted).toBe(false);
  await page.clock.setSystemTime(new Date('2026-10-19T13:58:00Z'));
  await page.reload();
  await expect(page.getByRole('region', { name: '취침까지 남은 계획' })).toContainText('수면');
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeDisabled();
  expect((await state(page)).active).toBeNull();
  expect((await state(page)).tasks).toHaveLength(1);
});

test('portable cloud data never claims original photos exist on second device', async ({
  page,
}) => {
  const local = newState();
  local.tasks = [
    taskSchema.parse({
      id: 'remote-task',
      title: '다른 기기 수행평가',
      subject: '영어',
      kind: '수행평가',
      due: null,
      attachmentIds: ['local-photo'],
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'done',
      submitted: false,
      optional: false,
      notes: '[학교공지:local] 원본은 등록한 기기에 보관됩니다.',
      link: '',
    }),
  ];
  await seed(page, portableStudyState(local));
  await inbox(page);
  await expect(page.getByRole('region', { name: '학교 공지 받은함' })).toContainText(
    '원본은 전송되지 않아요',
  );
  await expect(page.locator('.atelier-photo img')).toHaveCount(0);
  expect((await state(page)).tasks[0].attachmentIds).toBeUndefined();
  await nav(page, '오늘');
  await page.getByRole('button', { name: /아직 제출하지 않은 수행평가 1개/ }).click();
  await expect(page.getByRole('region', { name: '과제 목록' })).toContainText('다른 기기 수행평가');
});

test('activation is optional, home/inbox are accessible and no horizontal overflow', async ({
  page,
}, info) => {
  await seed(page);
  expect(await page.evaluate(() => localStorage.getItem('bkit.activation-local.v1'))).toBeNull();
  await inbox(page);
  await page.getByRole('button', { name: '사진·PDF 공지 추가' }).click();
  const result = await new AxeBuilder({ page })
    .include('.school-inbox')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  const panel = page.getByRole('region', { name: '첫 주 사용 확인' });
  await expect(panel.getByRole('checkbox')).not.toBeChecked();
  await panel.getByRole('checkbox').check();
  await nav(page, '오늘');
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.activation-local.v1')!).counts.studyStarted,
    ),
  ).toBe(1);
  await page.getByRole('button', { name: '기록 없이 종료', exact: true }).click();
  expect((await state(page)).sessions).toHaveLength(0);
});

test('notice photo and PDF originals round-trip through an external ZIP into an empty browser', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const { PDFDocument } = await import('pdf-lib');
  await seed(page);
  await inbox(page);
  await page.getByRole('button', { name: '사진·PDF 공지 추가' }).click();
  await page.getByLabel('원본 공지', { exact: true }).fill('한 공지의 영어 발표와 보고서');
  await page.getByLabel('갤러리 사진 첨부').setInputFiles('tests/fixtures/printed-homework.png');
  await expect(page.locator('.atelier-photos img')).toBeVisible();
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  await page.getByLabel('과제 PDF 첨부', { exact: true }).setInputFiles({
    name: 'original-notice.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(
    page.getByRole('link', { name: 'original-notice.pdf PDF 원본 보기', exact: true }),
  ).toBeVisible();
  // No task is required to preserve or open the original.
  expect((await state(page)).tasks).toHaveLength(0);
  await register(page, '영어 발표');
  await register(page, '영어 보고서');
  expect((await state(page)).tasks).toHaveLength(2);
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.getByText('백업 · 복구', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const fresh = await browser.newContext();
  try {
    const other = await fresh.newPage();
    await other.goto(page.url());
    await other.getByRole('button', { name: '설정 열기', exact: true }).click();
    await other.getByText('백업 · 복구', { exact: true }).click();
    await other.getByLabel('전체 ZIP 백업 검사', { exact: true }).setInputFiles(path!);
    await expect(
      other.getByRole('heading', { name: '가져오기 전 확인', exact: true }),
    ).toBeVisible();
    await other.getByRole('button', { name: '검사한 백업 병합', exact: true }).click();
    await expect(other.getByText(/복원 완료\. 앱을 다시/)).toBeVisible();
    await other.reload();
    await inbox(other);
    await expect(other.getByLabel('원본 공지', { exact: true })).toHaveValue(
      '한 공지의 영어 발표와 보고서',
    );
    await expect(other.locator('.atelier-photos img')).toBeVisible();
    await expect(
      other.getByRole('link', { name: 'original-notice.pdf PDF 원본 보기', exact: true }),
    ).toBeVisible();
    expect((await state(other)).tasks).toHaveLength(2);
  } finally {
    await fresh.close();
  }
});
