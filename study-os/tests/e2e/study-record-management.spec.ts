import { test, expect } from './local-fixture';
import { newState } from '../../src/model';
import { finishQuick, startQuick } from '../../src/quickTimer';

test.setTimeout(90000);
test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });
const key = 'bkit.study-os.v1';
const now = Date.parse('2026-10-25T04:00:00Z');
async function visit(page: import('@playwright/test').Page, saved = newState()) {
  await page.clock.install({ time: new Date(now) });
  await page.addInitScript((s) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(s)), saved);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '오늘의 공부', exact: true })).toBeVisible();
}
const state = (page: import('@playwright/test').Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
async function focus(page: import('@playwright/test').Page) {
  await page.locator('nav:visible').getByRole('button', { name: '집중', exact: true }).first().click();
}

test('a test stopwatch may stop without creating a study record', async ({ page }) => {
  await visit(page);
  await focus(page);
  await page.getByRole('button', { name: '지금 시작', exact: true }).click();
  expect((await state(page)).quickTimer).not.toBeNull();
  await page.getByRole('button', { name: '기록 없이 종료', exact: true }).click();
  // No-save deliberately returns home. Reopen focus before asserting a new timer can start.
  await focus(page);
  await expect(page.getByRole('button', { name: '지금 시작', exact: true })).toBeVisible();
  const after = await state(page);
  expect(after.sessions).toEqual([]);
  expect(after.quickTimer).toBeNull();
  await page.reload();
  expect((await state(page)).sessions).toEqual([]);
});

test('a focus timer can leave the mandatory form without saving', async ({ page }) => {
  // A user may arrive at the focus screen through a linked task or by upgrading
  // their quick stopwatch to a problem workspace. Seed exactly that active state.
  const saved = newState();
  saved.active = {
    id: 'focus-demo', taskId: null, subject: '자율 학습', action: '학습 테스트',
    target: 5, started: new Date(now - 30000).toISOString(), segmentStart: null,
    elapsed: 30, pauses: [],
  };
  await visit(page, saved);
  await focus(page);
  expect((await state(page)).active).not.toBeNull();
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장하지 않고 종료', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '저장하지 않고 종료', exact: true }).click();
  const after = await state(page);
  expect(after.sessions).toEqual([]);
  expect(after.active).toBeNull();
});

test('saved sessions are searchable, editable, deletable and reversible', async ({ page }) => {
  let saved = finishQuick(
    startQuick(newState(), 'stopwatch', 480, now - 240000, 'record-one'),
    now - 180000,
  );
  saved = finishQuick(
    startQuick(saved, 'stopwatch', 480, now - 120000, 'record-two'),
    now - 60000,
  );
  await visit(page, saved);
  await page.locator('nav:visible').getByRole('button', { name: '기록', exact: true }).first().click();
  const panel = page.getByRole('region', { name: '학습 기록 관리' });
  await expect(panel).toContainText('2개 기록');
  await panel.getByRole('button', { name: '수정', exact: true }).first().click();
  await panel.getByLabel('과목', { exact: true }).fill('수학');
  await panel.getByLabel('공부 내용', { exact: true }).fill('미적분 2문제');
  await panel.getByRole('button', { name: '변경 저장', exact: true }).click();
  await expect(panel).toContainText('미적분 2문제');
  await panel.getByRole('button', { name: '삭제', exact: true }).first().click();
  await expect(panel.getByRole('alertdialog', { name: '학습 기록 삭제 확인' })).toBeVisible();
  await panel.getByRole('button', { name: '삭제하기', exact: true }).click();
  expect((await state(page)).sessions).toHaveLength(1);
  await panel.getByRole('button', { name: '삭제 취소', exact: true }).click();
  expect((await state(page)).sessions).toHaveLength(2);
  await panel.getByLabel('학습 기록 검색').fill('미적분');
  await expect(panel.locator('.record-manager-item')).toHaveCount(1);
  await panel.getByLabel('학습 기록 검색').fill('');
  await panel.getByLabel('보이는 기록 모두 선택').check();
  await panel.getByRole('button', { name: '2개 삭제', exact: true }).click();
  await panel.getByRole('button', { name: '삭제하기', exact: true }).click();
  expect((await state(page)).sessions).toHaveLength(0);
  await expect(panel).toContainText('아직 저장한 공부 기록이 없어요');
  await panel.getByRole('button', { name: '삭제 취소', exact: true }).click();
  expect((await state(page)).sessions).toHaveLength(2);
  await page.reload();
  expect((await state(page)).sessions).toHaveLength(2);
});
