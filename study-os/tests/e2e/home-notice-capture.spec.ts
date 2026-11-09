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
