import { test, expect } from './local-fixture';
import { newState, taskSchema } from '../../src/model';
import { newNotice } from '../../src/schoolInbox';
import { PDFDocument } from 'pdf-lib';
test.use({ serviceWorkers: 'block' });

test('capture original PDF, register a confirmed KST deadline and recover everything after reload', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T00:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await page.getByRole('button', { name: '사진·PDF 공지 추가', exact: true }).click();
  await page
    .getByLabel('원본 공지', { exact: true })
    .fill('물질과 에너지 실험 보고서. 보안경 지참, PDF 양식으로 제출.');
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  await page.getByLabel('과제 PDF 첨부', { exact: true }).setInputFiles({
    name: 'experiment.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.getByText('PDF 원본 보관됨 · experiment.pdf')).toBeVisible();
  await page.getByLabel('확인한 과제 이름', { exact: true }).fill('실험 보고서');
  await page.getByLabel('확인한 과목', { exact: true }).fill('물질과 에너지');
  await page.getByLabel('확인한 마감 날짜', { exact: true }).fill('2027-01-04');
  await page.getByLabel('확인한 마감 시각 (선택)', { exact: true }).fill('16:30');
  await page
    .getByLabel('해야 할 일·준비물·제출물 (선택)', { exact: true })
    .fill('준비물: 보안경\n제출물: PDF 보고서');
  await page.getByLabel('원본의 이 과제와 마감을 대조했어요').check();
  await page.getByRole('button', { name: '확인한 과제 등록', exact: true }).click();
  const linked = page.getByRole('region', { name: '공지에서 등록한 과제' });
  await expect(linked).toContainText('2027-01-04 16:30');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks[0]).toMatchObject({
    due: '2027-01-04T07:30:00.000Z',
    submitted: false,
    deadline: { date: '2027-01-04', precision: 'exact-time', provenance: 'user-confirmed' },
  });
  expect(saved.tasks[0].notes).toContain('제출물: PDF 보고서');
  expect(saved.learning.problems).toHaveLength(0);
  expect(saved.learning.attempts).toHaveLength(0);
  await page.reload();
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await page.getByLabel('공지 검색', { exact: true }).fill('에너지 보고서');
  await expect(page.locator('.inbox-list button')).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'experiment.pdf PDF 원본 보기', exact: true }),
  ).toBeVisible();
  await expect(linked).toContainText('제출 미확인');
  await page.getByRole('button', { name: '연결 PDF 열기', exact: true }).click();
  await expect(page.getByTestId('ink-canvas')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).active),
  ).toBeNull();
  await page.getByRole('button', { name: '종이 닫기', exact: true }).click();
  await page.getByRole('button', { name: '이 과제 5분 시작', exact: true }).click();
  const active = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).active,
  );
  expect(active.taskId).toBe(saved.tasks[0].id);
  expect(active.resourceId).toBeUndefined();
});

test('find linked subjects, distinguish completed from submitted, archive and rediscover an original', async ({
  page,
}) => {
  const state = newState();
  const notice = {
    ...newNotice(),
    text: '실험 준비 안내',
    fullyRegistered: true,
    taskIds: ['task'],
  };
  state.tasks = [
    taskSchema.parse({
      id: 'task',
      subject: '물질과 에너지',
      title: '실험 보고서',
      kind: '수행평가',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'done',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  await page.addInitScript(
    ({ state, notice }) => {
      if (!localStorage.getItem('bkit.school-inbox.v1')) {
        localStorage.setItem(
          'bkit.school-inbox.v1',
          JSON.stringify({ version: 1, notices: [notice] }),
        );
        localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
      }
    },
    { state, notice },
  );
  await page.goto('./');
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await page.getByLabel('공지 검색', { exact: true }).fill('에너지');
  await page.getByRole('combobox', { name: '공지 보기', exact: true }).selectOption('submission');
  await expect(page.locator('.inbox-list button')).toHaveCount(1);
  await expect(page.getByRole('region', { name: '공지에서 등록한 과제' })).toContainText(
    '학습 완료 · 제출 미확인',
  );
  await page.getByRole('button', { name: '공지 보관 처리', exact: true }).click();
  await expect(page.locator('.inbox-list button')).toHaveCount(0);
  await page.getByRole('combobox', { name: '공지 보기', exact: true }).selectOption('archived');
  await expect(page.locator('.inbox-list button')).toHaveCount(1);
  await page.getByRole('button', { name: '받은함으로 이동', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks[0].submitted).toBe(false);
  expect(saved.tasks[0].status).toBe('done');
});
