import { test, expect, type Page } from './local-fixture';
import { newState, scheduleSchema, type State } from '../../src/model';
import { defaultSleep, SLEEP_KEY, type SleepState } from '../../src/sleep';
import { at, iso } from '../../src/time';

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: 'Asia/Seoul' });
test.setTimeout(60000);
const stateKey = 'bkit.study-os.v1';
const evidence = (page: Page) => page.getByRole('region', { name: '최근 7일 실제 행동 확인' });
const read = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), stateKey);
async function seed(page: Page, state: State, sleep = defaultSleep(), atTime = '2026-11-09T05:00:00Z') {
  await page.clock.install({ time: new Date(atTime) });
  await page.clock.pauseAt(new Date(Date.parse(atTime) + 1000));
  await page.addInitScript(({ study, sleep }) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(study));
    if (!localStorage.getItem('bkit.sleep-guard.v3'))
      localStorage.setItem('bkit.sleep-guard.v3', JSON.stringify(sleep));
  }, { study: state, sleep });
  await page.goto('./');
}
async function openEvidence(page: Page) {
  await page.getByRole('button', { name: '실제 학습·재풀이·취침 준비 확인' }).click();
  await expect(evidence(page)).toBeVisible();
}

test('new learner: no fabricated progress, start five minutes, save, and see durable daily evidence', async ({ page }, testInfo) => {
  await seed(page, newState());
  await page.screenshot({ path: testInfo.outputPath('home-empty-synthetic.png'), fullPage: true });
  await openEvidence(page);
  await page.screenshot({ path: testInfo.outputPath('evidence-empty-synthetic.png'), fullPage: true });
  const section = evidence(page);
  await expect(section).toContainText('0/7일 기록 확인');
  await expect(section).toContainText('미기록');
  await expect(section).toContainText('미기록’은 실패를 뜻하지 않아요');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await section.getByRole('button', { name: '자율 학습 5분 시작' }).click();
  expect((await read(page)).active).toMatchObject({ taskId: null, target: 5 });
  expect((await read(page)).sessions).toHaveLength(0);

  await page.clock.fastForward(75000);
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  const saved = await read(page);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].seconds).toBeGreaterThanOrEqual(74);

  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '기록', exact: true }).click();
  await expect(section).toContainText('1/7일 기록 확인');
  await expect(section.getByRole('listitem').last()).toContainText('1분');

  await page.reload();
  await openEvidence(page);
  await expect(evidence(page)).toContainText('1/7일 기록 확인');
  expect((await read(page)).sessions).toEqual(saved.sessions);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SLEEP_KEY))
    .toMatchObject({ records: [] });
});

test('real checked sleep steps and hint-free retest count separately from actual bedtime', async ({ page }, testInfo) => {
  const state = newState();
  state.sessions = [{
    id:'s1', taskId:null, subject:'수학', action:'내 오답 재풀이',
    started:iso(at('2026-11-09','11:00')),
    ended:iso(at('2026-11-09','11:05')),
    seconds:300, target:5, problems:1, concepts:'', rating:'어려움',
    reason:'', pauses:[], mistake:'틀린 계산', reviewDate:null,
  }];
  state.problemRetests = [{
    id:'ret1', sessionId:'s1', answer:'풀이 과정', submittedAt:iso(at('2026-11-09','13:00')),
    selfCheck:'remembered', hintUsed:false,
  }];
  const sleep: SleepState = defaultSleep();
  sleep.records = [{
    date:'2026-11-09', targetBed:iso(at('2026-11-09','23:00')),
    targetWake:iso(at('2026-11-10','07:00')),
    checks:[true,true,true,false], actualBed:null, actualWake:null,
    reflection:'', photoIds:[],
  }];
  await seed(page, state, sleep);
  await openEvidence(page);
  await page.screenshot({ path: testInfo.outputPath('evidence-with-synthetic-records.png'), fullPage: true });
  const section = evidence(page);
  await expect(section).toContainText('1/7일 기록 확인');
  const last = section.getByRole('listitem').last();
  await expect(last).toContainText('5분');
  await expect(last).toContainText('재풀이 확인 1');
  await expect(last).toContainText('취침 준비 3/3');
  await expect(section).toContainText('취침 준비 체크는 실제 수면이 아니며');
  expect((await read(page)).problemRetests).toHaveLength(1);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SLEEP_KEY))
    .toMatchObject({ records: [{ actualBed:null, actualWake:null }] });
});

test('Sleep Guard preparation refuses quick start and paused-session resume, preserving existing seconds', async ({ page }) => {
  const sleep = defaultSleep(); sleep.enabled = true;
  const state = newState();
  await seed(page, state, sleep, '2026-11-09T13:30:00Z'); // 22:30 Korea, bedtime preparation
  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '집중', exact: true }).click();
  const timer = page.getByRole('region', { name: '바로 시작 타이머' });
  await timer.getByRole('button', { name: '지금 시작' }).click();
  expect((await read(page)).quickTimer).toBeNull();
  expect((await read(page)).sessions).toHaveLength(0);

  // A previously paused study is never resumed implicitly in protected time.
  const started = iso(at('2026-11-09','21:50'));
  const previous = newState();
  previous.quickTimer = {
    id:'protected-q', mode:'countdown', targetMinutes:10, started,
    segmentStart:null, elapsed:90, segments:[{
      start:started, end:iso(at('2026-11-09','21:51') + 30_000),
    }],
  };
  await page.evaluate((next) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(next)), previous);
  await page.reload();
  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '집중', exact: true }).click();
  await timer.getByRole('button', { name: '이어하기' }).click();
  expect((await read(page)).quickTimer).toMatchObject({
    id:'protected-q', segmentStart:null, elapsed:90,
  });
  expect((await read(page)).sessions).toHaveLength(0);
});

test('school boundary blocks a long quick timer and caps a shorter stopwatch at class start', async ({ page }) => {
  const state = newState();
  state.schedules = [scheduleSchema.parse({
    id:'class-1', kind:'school', title:'학교 물리 수업', subject:'물리',
    days:[1], start:'15:00', end:'15:50', prep:0, travel:0, buffer:0,
    materials:'', date:null, excluded:[],
  })];
  await seed(page, state, defaultSleep(), '2026-11-09T05:53:00Z'); // 14:53 Korea
  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '집중', exact: true }).click();
  const timer = page.getByRole('region', { name: '바로 시작 타이머' });
  await timer.getByRole('button', { name: '심플 타이머' }).click();
  await timer.getByLabel('간단 타이머 시간').fill('10');
  await timer.getByRole('button', { name: '지금 시작' }).click();
  expect((await read(page)).quickTimer).toBeNull();

  // A free stopwatch can start in the seven-minute gap, but may not credit
  // time after 15:00 as study when the scheduled school class begins.
  await timer.getByRole('button', { name: '스톱워치', exact: true }).click();
  await timer.getByRole('button', { name: '지금 시작' }).click();
  expect((await read(page)).quickTimer).toMatchObject({ mode:'stopwatch' });
  await page.clock.fastForward(9 * 60_000);
  await expect.poll(async () => (await read(page)).quickTimer.segmentStart).toBeNull();
  const stopped = (await read(page)).quickTimer;
  expect(stopped.elapsed).toBeGreaterThanOrEqual(415);
  expect(stopped.elapsed).toBeLessThanOrEqual(421);
  expect((await read(page)).sessions).toHaveLength(0);
});

test('a scheduled class makes weekly CTA open the actual schedule instead of a failed timer', async ({ page }, testInfo) => {
  const state = newState();
  state.schedules = [scheduleSchema.parse({
    id:'verified-school', title:'물리 수업', subject:'물리', kind:'school',
    days:[1], start:'14:00', end:'15:00', prep:0, travel:0, buffer:0,
    materials:'', date:null, excluded:[],
  })];
  await seed(page, state, defaultSleep(), '2026-11-09T05:30:00Z'); // Monday 14:30 KST
  await openEvidence(page);
  const panel = evidence(page);
  await expect(panel).toContainText('물리 수업 시간이에요');
  await expect(panel.getByRole('button', { name: '오늘 일정 확인' })).toBeVisible();
  await expect(panel.getByRole('button', { name: '자율 학습 5분 시작' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('evidence-schedule-synthetic.png'), fullPage: true });
  await panel.getByRole('button', { name: '오늘 일정 확인' }).click();
  await expect(page.getByRole('region', { name: '지금 할 일 한 가지' })).toBeVisible();
  expect((await read(page)).active).toBeNull();
  expect((await read(page)).quickTimer).toBeNull();
  expect((await read(page)).sessions).toHaveLength(0);
});
