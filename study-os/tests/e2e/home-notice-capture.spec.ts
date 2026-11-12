import { test, expect } from './local-fixture';
import { newState } from '../../src/model';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('iPhone: copied school notice is saved, opened, explicitly converted to a task, and survives reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1')) localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: async () => '  물질과 에너지 수행평가: 산염기 실험 보고서. 마감은 확인 필요.  ' },
    });
  }, newState());
  await page.goto('./');
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await rescue.getByRole('button', { name: '복사한 공지 한 번에 보관' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await expect(inbox).toBeVisible();
  await expect(inbox.getByRole('textbox', { name: '원본 공지' })).toHaveValue(
    '물질과 에너지 수행평가: 산염기 실험 보고서. 마감은 확인 필요.',
  );
  const before = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!);
    const state = JSON.parse(localStorage.getItem('bkit.study-os.v1')!);
    return { notices: saved.notices, tasks: state.tasks };
  });
  expect(before.notices).toHaveLength(1);
  expect(before.notices[0]).toMatchObject({ reviewed: false, taskIds: [] });
  expect(before.tasks).toHaveLength(0);

  const form = inbox.locator('form.daily-confirm');
  await form.locator('input[name="title"]').fill('산염기 실험 보고서');
  await form.locator('input[name="subject"]').fill('물질과 에너지');
  await form.getByLabel('원본의 이 과제와 마감을 대조했어요').check();
  await form.getByRole('button', { name: '확인한 과제 등록' }).click();

  await expect(inbox.getByRole('region', { name: '공지에서 등록한 과제' })).toContainText('산염기 실험 보고서');
  const after = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!);
    const state = JSON.parse(localStorage.getItem('bkit.study-os.v1')!);
    return { notices: saved.notices, tasks: state.tasks };
  });
  expect(after.tasks).toHaveLength(1);
  expect(after.tasks[0]).toMatchObject({
    kind: '수행평가', subject: '물질과 에너지', submitted: false, due: null,
  });
  expect(after.tasks[0].notes).toContain('[학교공지:');
  expect(after.notices[0].taskIds).toContain(after.tasks[0].id);
  await page.reload();
  const returnedHome = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await expect(returnedHome).toContainText('산염기 실험 보고서');
  await returnedHome.getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  await expect(page.getByRole('textbox', { name: '원본 공지' })).toHaveValue(
    '물질과 에너지 수행평가: 산염기 실험 보고서. 마감은 확인 필요.',
  );
  await expect(page.getByRole('region', { name: '공지에서 등록한 과제' })).toContainText('산염기 실험 보고서');
});

test('iPhone: notice link write failure warns without duplicating or submitting the saved assessment', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  const inboxData = {
    version: 1, notices: [{
      id: 'link-write-failure', createdAt: '2026-11-10T00:00:00.000Z',
      text: '수행평가 원문. 실제 마감은 직접 확인.', ocrText: '',
      materials: { photoIds: [], papers: [] }, reviewed: false,
      archived: false, taskIds: [],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  const form = inbox.locator('form.daily-confirm');
  await form.locator('input[name="title"]').fill('연결 저장 실패 실험');
  await form.locator('input[name="subject"]').fill('역학과 에너지');
  await form.getByLabel('원본의 이 과제와 마감을 대조했어요').check();

  // Allow the preliminary notice write, then simulate only the linking write
  // failing. The study record itself must remain safely persisted.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let noticeWrites = 0;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'bkit.school-inbox.v1' && ++noticeWrites === 2)
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await form.getByRole('button', { name: '확인한 과제 등록' }).click();
  await expect(inbox.getByText('과제는 등록됐지만 공지 연결 저장에 실패했어요', { exact: false }))
    .toBeVisible();
  const saved = await page.evaluate(() => ({
    tasks: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks,
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
  }));
  expect(saved.tasks).toHaveLength(1);
  expect(saved.tasks[0]).toMatchObject({ title: '연결 저장 실패 실험', submitted: false });
  expect(saved.notice.taskIds).toEqual([]);
  expect(saved.notice.text).toBe('수행평가 원문. 실제 마감은 직접 확인.');

  await page.reload();
  const restored = await page.evaluate(() => ({
    tasks: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks,
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
  }));
  expect(restored.tasks).toHaveLength(1);
  expect(restored.notice.taskIds).toEqual([]);
});

test('iPhone: editing a checked notice original reopens assessment review without changing submission', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'notice-recheck-task', subject: '물질과 에너지', title: '실험 보고서',
    kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
    status: 'done', submitted: false, submissionRequired: true,
    optional: false, notes: '', link: '',
  }];
  const inboxData = {
    version: 1, notices: [{
      id: 'notice-recheck', createdAt: '2026-11-10T00:00:00.000Z',
      text: '실험 보고서만 제출', ocrText: '',
      materials: { photoIds: [], papers: [] }, reviewed: true,
      fullyRegistered: true, archived: false, taskIds: ['notice-recheck-task'],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    // Init scripts run again on reload: seed only the first visit so a
    // successful notice edit cannot be silently replaced by test fixtures.
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await expect(inbox.getByText('과제 등록 완료', { exact: true }).first()).toBeVisible();
  const original = inbox.getByRole('textbox', { name: '원본 공지' });
  await expect(original).toHaveJSProperty('readOnly', true);
  await inbox.getByRole('button', { name: '저장한 원문 수정 허용' }).click();
  await expect(original).toHaveJSProperty('readOnly', false);
  await original.fill('실험 보고서와 추가 발표 자료 제출');
  await inbox.getByRole('button', { name: '원문 편집 마치기' }).click();
  await expect(original).toHaveJSProperty('readOnly', true);
  await expect(inbox.getByText('정리 확인 필요', { exact: true }).first()).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(() => ({
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
    task: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks[0],
  }));
  expect(saved.notice).toMatchObject({
    text: '실험 보고서와 추가 발표 자료 제출',
    reviewed: false, fullyRegistered: false, taskIds: ['notice-recheck-task'],
  });
  expect(saved.task).toMatchObject({ status: 'done', submitted: false });
});

test('iPhone: corrected OCR text reopens review and preserves the unsubmitted task', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'ocr-recheck-task', subject: '물질과 에너지', title: '실험 보고서',
    kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
    status: 'done', submitted: false, submissionRequired: true,
    optional: false, notes: '', link: '',
  }];
  const inboxData = {
    version: 1, notices: [{
      id: 'ocr-recheck', createdAt: '2026-11-10T00:00:00.000Z',
      text: '사진으로 받은 실험 공지', ocrText: '실험 보고서 제출',
      materials: { photoIds: [], papers: [] }, reviewed: true,
      fullyRegistered: true, archived: false, taskIds: ['ocr-recheck-task'],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await expect(inbox.getByText('과제 등록 완료', { exact: true }).first()).toBeVisible();
  await inbox.getByRole('textbox', { name: '공지에서 읽은 글' })
    .fill('실험 보고서와 발표 자료 제출');
  await expect(inbox.getByText('정리 확인 필요', { exact: true }).first()).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(() => ({
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
    task: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks[0],
  }));
  expect(saved.notice).toMatchObject({
    text: '사진으로 받은 실험 공지',
    ocrText: '실험 보고서와 발표 자료 제출',
    reviewed: false, fullyRegistered: false, taskIds: ['ocr-recheck-task'],
  });
  expect(saved.task).toMatchObject({ status: 'done', submitted: false });
});

test('iPhone: attaching a new notice photo reopens review without marking work submitted', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'photo-recheck-task', subject: '물질과 에너지', title: '실험 보고서',
    kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
    status: 'done', submitted: false, submissionRequired: true,
    optional: false, notes: '', link: '',
  }];
  const inboxData = {
    version: 1, notices: [{
      id: 'photo-recheck', createdAt: '2026-11-10T00:00:00.000Z',
      text: '실험 보고서 제출', ocrText: '',
      materials: { photoIds: [], papers: [] }, reviewed: true,
      fullyRegistered: true, archived: false, taskIds: ['photo-recheck-task'],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await expect(inbox.getByText('과제 등록 완료', { exact: true }).first()).toBeVisible();
  await inbox.getByRole('region', { name: '과제 사진 및 PDF 첨부' })
    .getByLabel('갤러리 사진 첨부')
    .setInputFiles({
      name: 'new-school-notice.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=', 'base64'),
    });
  await expect(inbox.getByText('정리 확인 필요', { exact: true }).first()).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(() => ({
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
    task: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks[0],
  }));
  expect(saved.notice).toMatchObject({
    reviewed: false, fullyRegistered: false, taskIds: ['photo-recheck-task'],
  });
  expect(saved.notice.materials.photoIds).toHaveLength(1);
  expect(saved.task).toMatchObject({ status: 'done', submitted: false });
});

test('iPhone: existing assessment linking needs a second explicit confirmation and can be cancelled', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'existing-assessment', subject: '물질과 에너지', title: '실험 보고서',
    kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
    status: 'done', submitted: false, submissionRequired: true,
    optional: false, notes: '', link: '',
  }];
  const inboxData = {
    version: 1, notices: [{
      id: 'existing-link-notice', createdAt: '2026-11-10T00:00:00.000Z',
      text: '실험 보고서 공지. 마감은 원문에서 직접 확인.',
      ocrText: '', materials: { photoIds: [], papers: [] },
      reviewed: false, archived: false, taskIds: [],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await inbox.getByText('이미 등록한 과제와 연결').click();
  await inbox.getByRole('button', { name: '물질과 에너지 · 실험 보고서 연결 검토' }).click();
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0]);
  expect(saved.taskIds).toEqual([]);
  expect(saved.reviewed).toBe(false);
  await inbox.getByRole('button', { name: '연결 취소' }).click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0]);
  expect(saved.taskIds).toEqual([]);
  await inbox.getByRole('button', { name: '물질과 에너지 · 실험 보고서 연결 검토' }).click();
  await inbox.getByRole('button', { name: '물질과 에너지 · 실험 보고서 원문·마감 확인 후 연결 확정' }).click();
  await expect(inbox.getByRole('region', { name: '공지에서 등록한 과제' })).toContainText('실험 보고서');
  await page.reload();
  const restored = await page.evaluate(() => ({
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
    task: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks[0],
  }));
  expect(restored.notice.taskIds).toContain('existing-assessment');
  expect(restored.task).toMatchObject({ status: 'done', submitted: false });
});

test('iPhone: denied clipboard keeps records untouched and offers manual inbox access', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  await page.addInitScript((state) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { readText: async () => { throw new Error('not allowed'); } },
    });
  }, newState());
  await page.goto('./');
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await rescue.getByRole('button', { name: '복사한 공지 한 번에 보관' }).click();
  await expect(rescue.getByRole('alert')).toContainText('공지함에서 직접');
  expect(await page.evaluate(() => localStorage.getItem('bkit.school-inbox.v1'))).toBeNull();
  await rescue.getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  await expect(page.getByRole('region', { name: '학교 공지 받은함' })).toBeVisible();
});

test('iPhone: finished but unsubmitted assessments offer submission checking, not five-minute studying', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'finished-work', subject: '사회와 문화', title: '탐구 발표',
    kind: '수행평가', due: null, priority: 2, minutes: 20, remaining: 1,
    status: 'done', submitted: false, optional: false, notes: '', link: '',
  }];
  await page.addInitScript((init) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(init));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, state);
  await page.goto('./');
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await expect(rescue.getByRole('button', { name: '탐구 발표 5분 공부 시작' })).toHaveCount(0);
  await rescue.getByRole('button', { name: '탐구 발표 실제 제출 확인' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(after.tasks[0].submitted).toBe(false);
});

test('iPhone: school notice backup route preserves academic records while opening complete ZIP panel', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'assessment-zip', subject: '물질과 에너지', title: '실험 보고서',
    kind: '수행평가', due: null, priority: 2, minutes: 20, remaining: 1,
    status: 'done', submitted: false, optional: false, notes: '', link: '',
  }];
  await page.addInitScript((saved) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(saved));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, state);
  await page.goto('./');
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await rescue.getByRole('button', { name: '공지·수행평가 ZIP 백업으로 이동' }).click();
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' });
  await expect(backup).toBeVisible();
  await expect(backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' })).toBeVisible();
  await expect(backup.getByText('다운로드 요청만으로 파일 저장이 확인되는 것은 아니니', { exact: false })).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  // Home may record a RecommendationShown impression/revision independently.
  // Backup navigation must not alter actual assessment, submission or learning records.
  for (const key of ['tasks', 'schedules', 'sessions', 'active', 'quickTimer', 'plan', 'grades', 'reviewsDone', 'reviewProgress'] as const)
    expect(after[key], key).toEqual(original[key]);
  expect(await page.evaluate(() => localStorage.getItem('bkit.backup.last-file-checked.v1'))).toBeNull();
});


// The end-to-end receipt: a ZIP must actually leave the page as a download,
// be accepted by the same UI, and recover a finished-but-unsubmitted task.
// This uses a cleared device-local store, not a production account.
test('iPhone: downloaded ZIP restores an original notice and an unsubmitted assessment', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const state = newState();
  state.tasks = [{
    id: 'zip-task-1', subject: '역학과 에너지', title: '열기관 실험 보고서',
    kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
    status: 'done', submitted: false, submissionRequired: true,
    optional: false, notes: '', link: '',
  }, {
    id: 'zip-task-2', subject: '물질과 에너지', title: '날짜만 확인된 수행평가',
    kind: '수행평가', due: '2026-11-15T14:59:00.000Z',
    deadline: { date: '2026-11-15', precision: 'date-only', provenance: 'user-confirmed' },
    priority: 2, minutes: 25, remaining: 25,
    status: 'todo', submitted: false, submissionRequired: true,
    optional: false, notes: '', link: '',
  }];
  const inbox = {
    version: 1,
    notices: [{
      id: 'zip-notice-1', createdAt: '2026-11-10T00:00:00.000Z',
      text: '물리 수행평가 공지 원본입니다. 실제 마감은 선생님께 확인.',
      ocrText: '', materials: { photoIds: [], papers: [] },
      reviewed: true, fullyRegistered: true, archived: false, taskIds: ['zip-task-1', 'zip-task-2'],
    }],
  };
  await page.addInitScript(({ state, inbox }) => {
    if (sessionStorage.getItem('bkit:zip-e2e-seeded')) return;
    sessionStorage.setItem('bkit:zip-e2e-seeded', '1');
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inbox));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inbox });
  await page.goto('./');
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await rescue.getByRole('button', { name: '공지·수행평가 ZIP 백업으로 이동' }).click();
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' });
  await expect(backup).toBeVisible();
  await backup.getByText('iPhone · ZIP을 파일 앱에 보관하고 다시 검사하는 방법').click();
  await expect(backup.getByText('설정된 다운로드 폴더에 파일을 저장할 수 있습니다.', { exact: false })).toBeVisible();
  await expect(backup.getByText('실제 저장 위치를 확인하세요.', { exact: false })).toBeVisible();

  // Safari compatibility: the synthetic ZIP download link must be connected
  // when clicked, not a detached anchor that some browsers silently ignore.
  await page.evaluate(() => {
    const nativeClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      (window as Window & { __bkitZipAnchorConnected?: boolean }).__bkitZipAnchorConnected =
        this.isConnected;
      return nativeClick.call(this);
    };
  });
  const isIOS = await page.evaluate(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  );
  const downloadEvent = page.waitForEvent('download');
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' }).click();
  if (isIOS) {
    await expect(backup.getByText('ZIP 생성 완료 ·', { exact: false })).toBeVisible();
    // Asynchronous archive generation must never claim that a file was saved.
    expect(await page.evaluate(
      () => (window as Window & { __bkitZipAnchorConnected?: boolean }).__bkitZipAnchorConnected,
    )).toBeUndefined();
    await backup.getByRole('button', { name: '준비한 ZIP 다운로드' }).click();
  }
  const downloaded = await downloadEvent;
  expect(downloaded.suggestedFilename()).toMatch(/^bkit-complete-.*\.zip$/);
  const savedZip = await downloaded.path();
  expect(savedZip).toBeTruthy();
  expect(await page.evaluate(
    () => (window as Window & { __bkitZipAnchorConnected?: boolean }).__bkitZipAnchorConnected,
  )).toBe(true);
  await expect(backup.getByText(
    isIOS ? 'ZIP 다운로드 요청 완료.' : 'ZIP 생성 및 다운로드 요청 완료',
    { exact: false },
  )).toBeVisible();

  // Simulate a different empty browser profile, while retaining its downloaded file.
  await page.evaluate(() => {
    localStorage.removeItem('bkit.study-os.v1');
    localStorage.removeItem('bkit.school-inbox.v1');
  });
  await page.reload();
  const freshRescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await freshRescue.getByRole('button', { name: '공지·수행평가 ZIP 백업으로 이동' }).click();
  const freshBackup = page.getByRole('region', { name: '사진 포함 전체 백업' });
  await freshBackup.locator('input[type="file"][accept*="zip"]').setInputFiles(savedZip!);
  await expect(freshBackup.getByText('선택한 ZIP 파일의 무결성을 확인했습니다.', { exact: false })).toBeVisible();
  await freshBackup.getByText('ZIP에 기록된 학교 공지 1건 · 연결된 과제 확인').click();
  await expect(freshBackup.getByText('공지 원문 첫 줄: 물리 수행평가 공지 원본입니다. 실제 마감은 선생님께 확인.')).toBeVisible();
  await expect(freshBackup.getByText('열기관 실험 보고서', { exact: false }).last()).toContainText('제출 미확인');
  // The legacy 23:59 planning boundary must not look like an official submission cutoff.
  await expect(freshBackup.getByText('날짜만 확인된 수행평가', { exact: false }).last())
    .toContainText('2026-11-15 · 시각 미확인');

  await freshBackup.getByRole('button', { name: '검사한 백업 병합' }).click();
  await expect(freshBackup.getByText('복원 완료.', { exact: false })).toBeVisible();

  await page.reload();
  const restored = await page.evaluate(() => ({
    state: JSON.parse(localStorage.getItem('bkit.study-os.v1') || 'null'),
    inbox: JSON.parse(localStorage.getItem('bkit.school-inbox.v1') || 'null'),
  }));
  expect(restored.state.tasks.find((item: { id: string }) => item.id === 'zip-task-1'))
    .toMatchObject({ status: 'done', submitted: false });
  expect(restored.inbox.notices[0]).toMatchObject({
    id: 'zip-notice-1', taskIds: ['zip-task-1'],
    text: '물리 수행평가 공지 원본입니다. 실제 마감은 선생님께 확인.',
  });
});

test('iPhone: changed school notice invalidates a prepared ZIP without blocking a fresh download', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(saved));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, newState());
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지·수행평가 ZIP 백업으로 이동' }).click();
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' });

  // The iPhone project uses a mobile user-agent and must wait for a second direct tap.
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' }).click();
  const prepared = backup.getByRole('button', { name: '준비한 ZIP 다운로드' });
  await expect(prepared).toBeVisible();

  await page.evaluate(() => {
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      (window as Window & { __zipTaps?: number }).__zipTaps =
        ((window as Window & { __zipTaps?: number }).__zipTaps ?? 0) + 1;
      return originalClick.call(this);
    };
    localStorage.setItem('bkit.school-inbox.v1', JSON.stringify({
      version: 1, notices: [{
        id: 'new-school-notice', createdAt: '2026-11-10T00:00:00.000Z',
        text: 'ZIP 생성 이후 새로 받은 수행평가 공지', ocrText: '',
        materials: { photoIds: [], papers: [] },
        reviewed: false, archived: false, taskIds: [],
      }],
    }));
  });
  await prepared.click();
  await expect(backup.getByText('오래된 ZIP 대신 위의 전체 ZIP 내보내기를 다시 실행하세요.', { exact: false }))
    .toBeVisible();
  await expect(prepared).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __zipTaps?: number }).__zipTaps ?? 0))
    .toBe(0);

  // Rebuild from the newer source, then a direct tap must still initiate a real download.
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' }).click();
  await expect(prepared).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await prepared.click();
  const downloaded = await downloadEvent;
  expect(downloaded.suggestedFilename()).toMatch(/^bkit-complete-.*\.zip$/);
  expect(await page.evaluate(() => (window as Window & { __zipTaps?: number }).__zipTaps ?? 0))
    .toBe(1);
  const notice = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0]);
  expect(notice).toMatchObject({ text: 'ZIP 생성 이후 새로 받은 수행평가 공지', reviewed: false });
});

test('iPhone: failed school notice save preserves a copyable unsaved original until successful retry', async ({ page }) => {
  const state = newState();
  const inboxData = {
    version: 1,
    notices: [{
      id: 'recovery-notice', createdAt: '2026-11-10T00:00:00.000Z',
      text: '기존 수행평가 안내', ocrText: '',
      materials: { photoIds: [], papers: [] }, reviewed: false,
      archived: false, taskIds: [],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  const original = inbox.getByRole('textbox', { name: '원본 공지' });

  await page.evaluate(() => {
    const nativeWrite = Storage.prototype.setItem;
    (window as Window & { __restoreNoticeWrite?: () => void }).__restoreNoticeWrite =
      () => { Storage.prototype.setItem = nativeWrite; };
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'bkit.school-inbox.v1' &&
        value.includes('추가 발표 자료'))
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return nativeWrite.call(this, key, value);
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('Permission denied'); } },
    });
  });
  await inbox.getByRole('button', { name: '저장한 원문 수정 허용' }).click();
  await original.fill('실험 보고서와 추가 발표 자료 제출');

  const recovery = inbox.getByRole('textbox', { name: '미저장 공지 원문 복구' });
  await expect(recovery).toHaveValue('실험 보고서와 추가 발표 자료 제출');
  await expect(inbox.getByRole('alert')).toContainText('저장 확인 필요');
  await expect(inbox.getByRole('alert')).toContainText('사진·PDF 원본은 텍스트 복사에 포함되지 않습니다');
  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0].text);
  expect(persisted).toBe('기존 수행평가 안내');

  await inbox.getByRole('button', { name: '미저장 원문 복사' }).click();
  await expect(inbox.getByText('자동 복사가 차단됐어요.', { exact: false })).toBeVisible();
  await expect(recovery).toHaveValue('실험 보고서와 추가 발표 자료 제출');

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value: string) => {
        (window as Window & { __copiedNotice?: string }).__copiedNotice = value;
      } },
    });
  });
  await inbox.getByRole('button', { name: '미저장 원문 복사' }).click();
  await expect(inbox.getByText('클립보드에 복사했어요.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() =>
    (window as Window & { __copiedNotice?: string }).__copiedNotice))
    .toBe('실험 보고서와 추가 발표 자료 제출');

  await page.evaluate(() => (window as Window & { __restoreNoticeWrite?: () => void })
    .__restoreNoticeWrite?.());
  await inbox.getByRole('button', { name: '공지 저장 재시도' }).click();
  await expect(recovery).toHaveCount(0);
  await expect(inbox.getByText('이 기기에 저장됨', { exact: false })).toBeVisible();
  const stored = await page.evaluate(() => ({
    notice: JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices[0],
    tasks: JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks,
  }));
  expect(stored.notice.text).toBe('실험 보고서와 추가 발표 자료 제출');
  expect(stored.notice.reviewed).toBe(false);
  expect(stored.tasks).toHaveLength(0);
});

test('iPhone: first save failure of a new pasted notice offers the new original, not an older selected notice', async ({ page }) => {
  const state = newState();
  const inboxData = {
    version: 1,
    notices: [{
      id: 'previous-notice', createdAt: '2026-11-10T00:00:00.000Z',
      text: '이전 공지 내용', ocrText: '',
      materials: { photoIds: [], papers: [] }, reviewed: false,
      archived: false, taskIds: [],
    }],
  };
  await page.addInitScript(({ state, inboxData }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    if (!localStorage.getItem('bkit.school-inbox.v1'))
      localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === 'bkit.school-inbox.v1' &&
        value.includes('신규 공지 원문 수행평가 확인'))
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: async () => '신규 공지 원문 수행평가 확인' },
    });
  });
  await inbox.getByRole('button', { name: '복사한 공지 바로 보관' }).click();
  const recovery = inbox.getByRole('textbox', { name: '미저장 공지 원문 복구' });
  await expect(recovery).toHaveValue('신규 공지 원문 수행평가 확인');
  await expect(inbox.getByRole('alert')).toContainText('저장 확인 필요');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.school-inbox.v1')!).notices);
  expect(saved).toHaveLength(1);
  expect(saved[0].text).toBe('이전 공지 내용');
});
