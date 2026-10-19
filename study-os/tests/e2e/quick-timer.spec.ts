import { test, expect } from './local-fixture';
import { newState } from '../../src/model';
import type { Page } from '@playwright/test';

async function prepare(page: Page) {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  // install() alone keeps real time advancing during clicks and reload. Freeze
  // between explicit fastForward calls so exact second assertions stay exact.
  await page.clock.pauseAt(new Date('2026-10-19T12:00:01Z'));
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, newState());
  await page.goto('./');
  return page.getByRole('region', { name: '바로 시작 타이머' });
}
async function read(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
}

test('first screen keeps homework actions visible and starts an unplanned stopwatch with one tap', async ({
  page,
}) => {
  await prepare(page);
  await expect(page.getByRole('button', { name: '5분만 시작' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '오늘 할 일 정리' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '자료 추가' })).toBeInViewport();
  const shortcut = page.getByRole('button', { name: '스톱워치 바로 시작' });
  await expect(shortcut).toBeInViewport();
  await shortcut.click();
  expect((await read(page)).quickTimer.mode).toBe('stopwatch');
  await expect(page.getByRole('button', { name: /스톱워치 .* · 보기/ })).toBeVisible();
});

test('zero-input stopwatch can start, survive reload and save before entering subject', async ({
  page,
}) => {
  const timer = await prepare(page);
  await expect(timer.getByRole('button', { name: '지금 시작' })).toBeVisible();
  await timer.getByRole('button', { name: '지금 시작' }).click();
  expect((await read(page)).quickTimer.mode).toBe('stopwatch');
  await page.clock.fastForward(125000);
  await expect(timer.getByRole('timer')).toContainText('02:05');
  await timer.getByRole('button', { name: '일시정지' }).click();
  const elapsed = (await read(page)).quickTimer.elapsed;
  expect(elapsed).toBeGreaterThanOrEqual(124);
  await page.reload();
  await expect(timer.getByRole('timer')).toContainText('02:05');
  await timer.getByRole('button', { name: '이어하기' }).click();
  await page.clock.fastForward(65000);
  await timer.getByRole('button', { name: '끝내고 시간 저장' }).click();
  await expect(timer.getByText('최근 기록 저장됨', { exact: false })).toBeVisible();
  const data = await read(page);
  expect(data.quickTimer).toBeNull();
  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0].quick).toBe(true);
  expect(data.sessions[0].subject).toBe('미분류');
  expect(data.sessions[0].seconds).toBeGreaterThanOrEqual(189);
  await timer.getByLabel('과목 (선택)').selectOption('수학');
  await timer.getByPlaceholder('예: 미적분 학습지 3쪽').fill('미적분 기초 3쪽');
  await timer.getByRole('button', { name: '내용 저장' }).click();
  expect((await read(page)).sessions[0].subject).toBe('수학');
  await page.reload();
  expect((await read(page)).sessions[0].action).toBe('미적분 기초 3쪽');
  await timer.getByRole('button', { name: /최근 공부 기록 정리하기/ }).click();
  await expect(timer.getByLabel('과목 (선택)')).toHaveValue('수학');
  await expect(timer.getByPlaceholder('예: 미적분 학습지 3쪽')).toHaveValue('미적분 기초 3쪽');
});

test('countdown reaches goal and retains time even if learner skips the after-study form', async ({
  page,
}) => {
  const timer = await prepare(page);
  await timer.getByRole('button', { name: '심플 타이머' }).click();
  await timer.getByLabel('간단 타이머 시간').fill('10');
  await timer.getByRole('button', { name: '지금 시작' }).click();
  await page.clock.fastForward(601000);
  await expect(timer.getByRole('timer')).toContainText('00:00');
  await expect(timer).toContainText('목표에 도착했어');
  await timer.getByRole('button', { name: '끝내고 시간 저장' }).click();
  await timer.getByRole('button', { name: '나중에 적기' }).click();
  const saved = await read(page);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].seconds).toBeGreaterThanOrEqual(600);
  expect(saved.sessions[0].target).toBe(10);
  expect(saved.quickTimer).toBeNull();
});
