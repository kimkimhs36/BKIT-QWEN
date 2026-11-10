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
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.school-inbox.v1', JSON.stringify(inboxData));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, { state, inboxData });
  await page.goto('./');
  await page.getByRole('region', { name: '수행평가 긴급 점검' })
    .getByRole('button', { name: '공지함 · 직접 붙여넣기' }).click();
  const inbox = page.getByRole('region', { name: '학교 공지 받은함' });
  await expect(inbox.getByText('과제 등록 완료')).toBeVisible();
  await inbox.getByRole('textbox', { name: '원본 공지' })
    .fill('실험 보고서와 추가 발표 자료 제출');
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

test('iPhone: school notice backup route opens the actual complete ZIP panel without altering study data', async ({ page }) => {
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
  const original = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await rescue.getByRole('button', { name: '공지·수행평가 ZIP 백업으로 이동' }).click();
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' });
  await expect(backup).toBeVisible();
  await expect(backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' })).toBeVisible();
  await expect(backup.getByText('다운로드 요청만으로 파일 저장이 확인되는 것은 아니니', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(original);
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
  }];
  const inbox = {
    version: 1,
    notices: [{
      id: 'zip-notice-1', createdAt: '2026-11-10T00:00:00.000Z',
      text: '물리 수행평가 공지 원본입니다. 실제 마감은 선생님께 확인.',
      ocrText: '', materials: { photoIds: [], papers: [] },
      reviewed: true, fullyRegistered: true, archived: false, taskIds: ['zip-task-1'],
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

  const downloadEvent = page.waitForEvent('download');
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' }).click();
  const downloaded = await downloadEvent;
  expect(downloaded.suggestedFilename()).toMatch(/^bkit-complete-.*\.zip$/);
  const savedZip = await downloaded.path();
  expect(savedZip).toBeTruthy();
  await expect(backup.getByText('ZIP 생성 및 다운로드 요청 완료', { exact: false })).toBeVisible();

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
