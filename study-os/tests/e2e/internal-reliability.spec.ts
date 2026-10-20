import { test, expect, type Page } from './local-fixture';
import { newState, type State } from '../../src/model';

const key = 'bkit.study-os.v1';
const began = Date.parse('2026-10-21T03:00:00Z');
const read = (page: Page): Promise<State> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
async function nav(page: Page, name: string) {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
}
async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: began });
  await page.clock.pauseAt(began + 1_000);
  await page.goto('./');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  return page.locator('.quick-timer-active');
}

test('foreground clock changes cannot erase or inflate the stopwatch history', async ({ page }) => {
  const timer = await prepare(page);
  await page.clock.runFor(30_000);
  await expect(timer.getByRole('timer')).toContainText('00:30');
  await page.clock.setSystemTime(began - 3_600_000 + 31_000);
  await page.clock.runFor(10_000);
  await expect(timer.getByRole('timer')).toContainText('00:40');
  await page.clock.setSystemTime(began + 7_200_000 + 41_000);
  await page.clock.runFor(10_000);
  await expect(timer.getByRole('timer')).toContainText('00:50');
  await timer.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  const state = await read(page);
  expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0].seconds).toBe(50);
  expect(state.sessions[0].segments).toHaveLength(1);
  await page.reload();
  expect((await read(page)).sessions).toEqual(state.sessions);
});

test('quota failure leaves the live timer intact, and rapid retry records exactly one session', async ({ page }) => {
  const timer = await prepare(page);
  await page.clock.runFor(65_000);
  const before = await read(page);
  await page.evaluate((key) => {
    const set = Storage.prototype.setItem;
    (window as any).restoreStorage = () => { Storage.prototype.setItem = set; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('simulated full disk', 'QuotaExceededError');
      return set.call(this, name, value);
    };
  }, key);
  await timer.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '저장하지 못했습니다' })).toBeVisible();
  expect((await read(page)).quickTimer).toEqual(before.quickTimer);
  expect((await read(page)).sessions).toHaveLength(0);
  await expect(timer).toBeVisible();
  await page.evaluate(() => (window as any).restoreStorage());
  await timer.getByRole('button', { name: '끝내고 시간 저장', exact: true }).evaluate((el) => {
    (el as HTMLButtonElement).click();
    (el as HTMLButtonElement).click();
  });
  expect((await read(page)).sessions).toHaveLength(1);
  expect((await read(page)).sessions[0]).toMatchObject({ id: before.quickTimer!.id, seconds: 65 });
  await page.reload();
  expect((await read(page)).sessions).toHaveLength(1);
});

test('closing a browser page and reopening preserves the running timestamp and excludes pauses', async ({ page, context }) => {
  const timer = await prepare(page);
  await page.clock.runFor(30_000);
  await timer.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.clock.runFor(60_000);
  await timer.getByRole('button', { name: '이어하기', exact: true }).click();
  const previous = await read(page);
  await page.close();
  const reopened = await context.newPage();
  await reopened.clock.install({ time: began + 121_000 });
  await reopened.clock.pauseAt(began + 121_000);
  await reopened.goto('./');
  await nav(reopened, '집중');
  const active = reopened.locator('.quick-timer-active');
  await expect(active.getByRole('timer')).toContainText('01:00');
  await active.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  const result = await read(reopened);
  expect(result.sessions[0].id).toBe(previous.quickTimer!.id);
  expect(result.sessions[0].seconds).toBe(60);
  expect(result.sessions[0].segments).toHaveLength(2);
});

test('a corrupt active clock is read-only and its original bytes remain exportable', async ({ page }) => {
  const state = newState();
  state.quickTimer = {
    id: 'corrupt', mode: 'stopwatch', targetMinutes: 480,
    started: new Date(began).toISOString(), segmentStart: null, elapsed: 300, segments: [],
  };
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.goto('./');
  await expect(page.getByRole('alert').filter({ hasText: '저장 데이터를 읽지 못했습니다' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(raw);
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(raw);
});

test('finish between clock ticks stops at a protected schedule boundary', async ({ page }) => {
  const boundary = began;
  const state = newState();
  state.active = {
    id: 'boundary', taskId: null, subject: '수학', action: '복습', target: 5,
    started: new Date(boundary - 500).toISOString(),
    segmentStart: new Date(boundary - 500).toISOString(),
    elapsed: 0, segments: [], pauses: [],
  };
  state.schedules = [{
    id: 'class', title: '보호 수업', subject: '', kind: 'fixed', days: [3],
    start: '12:00', end: '13:00', prep: 0, travel: 0, buffer: 0, materials: '',
    date: '2026-10-21', excluded: [],
  }];
  await page.clock.install({ time: boundary - 500 });
  await page.clock.pauseAt(boundary - 500);
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key, state });
  await page.goto('./');
  await nav(page, '집중');
  // The next 1s UI interval has not run. The click must enforce the boundary.
  await page.clock.runFor(750);
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  const stopped = await read(page);
  expect(stopped.active?.elapsed).toBe(0.5);
  expect(stopped.active?.segments?.[0].end).toBe(new Date(boundary).toISOString());
});

test('only one tab writes study records, and closing it allows a fresh second tab to write', async ({ page, context }) => {
  await page.goto('./');
  const second = await context.newPage();
  await second.goto('./');
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await second.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await expect(second.getByRole('status').filter({ hasText: '다른 BKIT 탭' })).toBeVisible();
  expect(await second.evaluate((key) => localStorage.getItem(key), key)).toBe(before);
  await page.close();
  await second.reload();
  await second.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await expect(second.locator('.quick-timer-active')).toBeVisible();
  expect((await read(second)).quickTimer).not.toBeNull();
});
