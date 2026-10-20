import { test, expect, type Page } from './local-fixture';
import type { State } from '../../src/model';
test.setTimeout(120000);
test.use({ reducedMotion: 'reduce' });

const key = 'bkit.study-os.v1';
const read = (page: Page): Promise<State> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
async function nav(page: Page, name: string) {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
}
async function addTask(page: Page, title: string) {
  await nav(page, '과제');
  await page.getByRole('button', { name: '과제 추가', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '상세 입력', exact: true }).click();
  await dialog.getByLabel('과제 이름 · 바로 할 행동', { exact: true }).fill(title);
  await dialog.getByLabel('과목', { exact: true }).fill('수학');
  await dialog.getByRole('button', { name: '과제 저장', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
async function settings(page: Page) {
  await nav(page, '도구');
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByText('백업 · 복구', { exact: true }).click();
  return page.getByRole('region', { name: '사진 포함 전체 백업' });
}

test('empty device to real task, linked study, pause/resume, reload, more data and ZIP restore', async ({ page, browser }, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const empty = await read(page);
  // A brand-new device need not write a document before the first user action.
  expect(empty?.tasks ?? []).toEqual([]);
  expect(empty?.sessions ?? []).toEqual([]);
  expect(empty?.grades ?? []).toEqual([]);
  await addTask(page, '처음 등록한 실제 과제');
  const task = (await read(page)).tasks[0];
  await nav(page, '집중');
  await page.getByRole('button', { name: '지금 시작', exact: true }).click();
  await page.getByText('과제에 연결하기 (선택)', { exact: true }).click();
  await page.getByLabel('진행 중인 스톱워치 과제 연결', { exact: true }).selectOption(task.id);
  await expect(page.locator('.focus-actions')).toBeVisible();
  await page.locator('.focus-actions').getByRole('button', { name: '일시정지', exact: true }).click();
  const pause = page.getByRole('dialog');
  await pause.getByLabel('일시정지 사유', { exact: true }).fill('실제 휴식');
  await pause.getByRole('button', { name: '일시정지', exact: true }).click();
  const paused = (await read(page)).active!;
  expect(paused.segmentStart).toBeNull();
  await page.reload();
  await nav(page, '집중');
  expect((await read(page)).active?.elapsed).toBe(paused.elapsed);
  await page.getByRole('button', { name: '다시 시작', exact: true }).click();
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  const recorded = await read(page);
  expect(recorded.active).toBeNull();
  expect(recorded.sessions).toHaveLength(1);
  const session = recorded.sessions[0];
  expect(session.taskId).toBe(task.id);
  expect(session.id).toBe(paused.id);
  expect(session.seconds).toBeGreaterThanOrEqual(paused.elapsed);
  expect(session.segments?.reduce((sum, s) => sum + (Date.parse(s.end) - Date.parse(s.start)) / 1000, 0)).toBeCloseTo(session.seconds, 3);
  await page.reload();
  expect((await read(page)).sessions).toEqual(recorded.sessions);
  await addTask(page, '두 번째 과제');
  expect((await read(page)).tasks).toHaveLength(2);
  expect((await read(page)).sessions).toEqual(recorded.sessions);

  const backup = await settings(page);
  const download = page.waitForEvent('download');
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기', exact: true }).click();
  const archive = info.outputPath('clean-study.zip');
  await (await download).saveAs(archive);
  const target = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await target.route('**/*', route => new URL(route.request().url()).origin === new URL(page.url()).origin
      ? route.continue() : route.abort());
    const fresh = await target.newPage();
    await fresh.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
    await fresh.goto(page.url());
    const restore = await settings(fresh);
    await restore.getByLabel('전체 ZIP 백업 검사', { exact: true }).setInputFiles(archive);
    await restore.getByRole('button', { name: '검사한 백업 병합', exact: true }).click();
    await expect(restore.getByRole('button', { name: '복원한 앱 다시 열기', exact: true })).toBeVisible();
    await fresh.reload();
    const restored = await read(fresh);
    expect(restored.tasks).toEqual((await read(page)).tasks);
    expect(restored.sessions).toEqual(recorded.sessions);
  } finally { await target.close(); }
});

test('completion and submission remain separate across reload on a clean device', async ({ page }) => {
  await page.goto('./');
  await addTask(page, '제출까지 확인할 과제');
  await page.getByRole('button', { name: '제출까지 확인할 과제 학습 완료로 변경', exact: true }).click();
  let task = (await read(page)).tasks[0];
  expect(task.status).toBe('done');
  expect(task.submitted).toBe(false);
  await page.reload();
  await nav(page, '과제');
  await page.getByRole('group', { name: '과제 필터' }).getByRole('button', { name: '제출 확인', exact: true }).click();
  await page.getByRole('button', { name: '제출까지 확인할 과제 제출 완료 기록', exact: true }).click();
  await page.reload();
  task = (await read(page)).tasks[0];
  expect(task.status).toBe('done');
  expect(task.submitted).toBe(true);
  expect((await read(page)).sessions).toEqual([]);
});
