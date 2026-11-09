import { test, expect, type Page } from './local-fixture';
import { newState, type State } from '../../src/model';
import { defaultSleep, SLEEP_KEY, type SleepState } from '../../src/sleep';
import { at, iso } from '../../src/time';

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true });
test.setTimeout(60000);
const stateKey = 'bkit.study-os.v1';
const evidence = (page: Page) => page.getByRole('region', { name: '최근 7일 실제 행동 확인' });
const read = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), stateKey);
async function seed(page: Page, state: State, sleep = defaultSleep()) {
  await page.clock.install({ time: new Date('2026-11-09T05:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-09T05:00:01Z'));
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

test('new learner: no fabricated progress, start five minutes, save, and see durable daily evidence', async ({ page }) => {
  await seed(page, newState());
  await openEvidence(page);
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

test('real checked sleep steps and hint-free retest count separately from actual bedtime', async ({ page }) => {
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
