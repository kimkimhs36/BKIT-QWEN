import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, type State } from '../../src/model';

// One action from the real home to the real durable study store on phone widths.
// Chromium mobile emulation is not certification on a physical iPhone.
test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true });
test.setTimeout(60000);

const key = 'bkit.study-os.v1';
const read = (page: Page) =>
  page.evaluate((name) => JSON.parse(localStorage.getItem(name)!), key);

async function openFreshHome(page: Page, state: State) {
  await page.clock.install({ time: new Date('2026-11-09T04:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-09T04:00:01Z'));
  await page.addInitScript((snapshot) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(snapshot));
  }, state);
  await page.goto('./');
  await expect(page.getByRole('region', { name: '지금 할 일 한 가지' })).toBeVisible();
}

test('mobile home -> 10-minute focus -> pause -> reload -> resume -> one durable record', async ({ page }) => {
  await openFreshHome(page, newState());
  const action = page.getByRole('region', { name: '지금 할 일 한 가지' });
  const go = action.getByRole('button', { name: '10분 집중 시작', exact: true });
  await expect(go).toBeVisible();
  const tapArea = await go.boundingBox();
  // Fractional CSS pixels can render 44px as 43.999... on mobile emulation.
  expect(Math.round(tapArea?.height ?? 0)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await go.click();
  const started = await read(page);
  expect(started.quickTimer).toMatchObject({ mode: 'countdown', targetMinutes: 10 });
  expect(started.active).toBeNull();

  const timer = page.getByRole('region', { name: '바로 시작 타이머' });
  await expect(timer.getByRole('button', { name: '일시정지' })).toBeVisible();
  await page.clock.fastForward(77000);
  await timer.getByRole('button', { name: '일시정지' }).click();
  const paused = (await read(page)).quickTimer;
  expect(paused.elapsed).toBeGreaterThanOrEqual(76);
  expect(paused.segmentStart).toBeNull();

  // Time spent in a paused/closed browser must never become fake study credit.
  await page.clock.fastForward(6 * 60 * 1000);
  await page.reload();
  const reloaded = (await read(page)).quickTimer;
  expect(reloaded.id).toBe(paused.id);
  expect(Math.abs(reloaded.elapsed - paused.elapsed)).toBeLessThanOrEqual(1);
  // Reload returns to Home: recover through the visible one-tap resume action.
  await page.getByRole('region', { name: '지금 할 일 한 가지' })
    .getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await timer.getByRole('button', { name: '이어하기' }).click();
  await page.clock.fastForward(50000);
  await timer.getByRole('button', { name: '끝내고 시간 저장' }).click();

  const finished = await read(page);
  expect(finished.quickTimer).toBeNull();
  expect(finished.sessions).toHaveLength(1);
  expect(finished.sessions[0].id).toBe(paused.id);
  expect(finished.sessions[0].quick).toBe(true);
  expect(finished.sessions[0].seconds).toBeGreaterThanOrEqual(126);
  expect(finished.sessions[0].seconds).toBeLessThan(145);

  await page.reload();
  const persisted = await read(page);
  expect(persisted.sessions).toEqual(finished.sessions);
  expect(persisted.quickTimer).toBeNull();
});

test('saved quick focus offers an immediate independent five-minute problem retry without changing old records', async ({ page }, testInfo) => {
  await openFreshHome(page, newState());
  await page.getByRole('region', { name: '지금 할 일 한 가지' })
    .getByRole('button', { name: '10분 집중 시작', exact: true }).click();
  const quick = page.getByRole('region', { name: '바로 시작 타이머' });
  await page.clock.fastForward(61_000);
  await quick.getByRole('button', { name: '끝내고 시간 저장' }).click();
  const before = await read(page);
  expect(before.sessions).toHaveLength(1);
  expect(before.sessions[0].seconds).toBeGreaterThanOrEqual(60);
  const retry = quick.getByRole('button', { name: '혼자 다시 풀기 · 5분' });
  await expect(retry).toBeVisible();
  // Actual compiled BKIT screen, with only synthetic session data.
  await retry.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('post-focus-retry-synthetic.png') });
  await retry.click();
  const practicing = await read(page);
  expect(practicing.sessions).toEqual(before.sessions);
  expect(practicing.quickTimer).toBeNull();
  expect(practicing.active).toMatchObject({
    quick: true, subject: '자율 학습', taskId: null, target: 5,
  });
  expect(practicing.active.id).not.toBe(before.sessions[0].id);
  // The new five-minute problem session is a fresh voluntary action, not
  // retroactive mastery, submission, or another label on the saved record.
  expect(practicing.tasks).toEqual(before.tasks);
  await page.clock.fastForward(20_000);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const paused = (await read(page)).active;
  expect(paused.id).toBe(practicing.active.id);
  expect(paused.segmentStart).toBeNull();
  expect(paused.elapsed).toBeGreaterThanOrEqual(19);
  await page.clock.fastForward(10 * 60_000);
  await page.reload();
  const recovered = await read(page);
  expect(recovered.active.id).toBe(paused.id);
  expect(recovered.active.segmentStart).toBeNull();
  expect(Math.abs(recovered.active.elapsed - paused.elapsed)).toBeLessThanOrEqual(1);
  expect(recovered.sessions).toEqual(before.sessions);
});

test('mobile home recommendation begins the exact existing task and never claims submission', async ({ page }) => {
  const s = newState();
  s.tasks = [taskSchema.parse({
    id: 'physics-homework', title: '역학 학습지 1문제', subject: '물리',
    kind: '숙제', due: null, priority: 2, minutes: 25, remaining: 25,
    status: 'todo', submitted: false, optional: false, notes: '', link: '',
  })];
  await openFreshHome(page, s);
  const home = page.getByRole('region', { name: '지금 할 일 한 가지' });
  await expect(home).toContainText('역학 학습지 1문제');
  await home.getByRole('button', { name: '10분 집중 시작', exact: true }).click();

  const active = await read(page);
  expect(active.active).toMatchObject({
    taskId: 'physics-homework', target: 10, subject: '물리',
  });
  expect(active.tasks[0].status).toBe('doing');
  expect(active.tasks[0].submitted).toBe(false);

  await page.clock.fastForward(65000);
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();

  const finished = await read(page);
  expect(finished.active).toBeNull();
  expect(finished.sessions).toHaveLength(1);
  expect(finished.sessions[0].taskId).toBe('physics-homework');
  expect(finished.sessions[0].seconds).toBeGreaterThanOrEqual(64);
  expect(finished.tasks[0].submitted).toBe(false);
  await page.reload();
  expect((await read(page)).sessions).toEqual(finished.sessions);
});


// Simulate the browser's lifecycle event without crediting the hidden interval.
// This exercises the real App event handler and persisted state, not just a timer helper.
test('mobile pagehide pauses a live quick timer and requires explicit resume', async ({ page }) => {
  await openFreshHome(page, newState());
  await page.getByRole('region', { name: '지금 할 일 한 가지' })
    .getByRole('button', { name: '10분 집중 시작', exact: true }).click();
  await page.clock.fastForward(45000);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const paused = (await read(page)).quickTimer;
  expect(paused.segmentStart).toBeNull();
  expect(paused.elapsed).toBeGreaterThanOrEqual(44);
  await page.clock.fastForward(5 * 60_000);
  await page.reload();
  const recovered = (await read(page)).quickTimer;
  expect(recovered.id).toBe(paused.id);
  expect(Math.abs(recovered.elapsed - paused.elapsed)).toBeLessThanOrEqual(1);
  await page.getByRole('region', { name: '지금 할 일 한 가지' })
    .getByRole('button', { name: '공부 이어가기', exact: true }).click();
  const timer = page.getByRole('region', { name: '바로 시작 타이머' });
  await expect(timer.getByRole('button', { name: '이어하기' })).toBeVisible();
  await timer.getByRole('button', { name: '이어하기' }).click();
  await page.clock.fastForward(15000);
  await timer.getByRole('button', { name: '끝내고 시간 저장' }).click();
  const saved = await read(page);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].seconds).toBeGreaterThanOrEqual(59);
  expect(saved.sessions[0].seconds).toBeLessThan(75);
});
