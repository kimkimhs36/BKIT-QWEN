import { test, expect } from './local-fixture';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('home quick focus survives pause, reload and writes one real session', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T13:00:00+09:00') });
  await page.goto('./');
  const action = page.getByRole('region', { name: '지금 할 일 한 가지' });
  await expect(action.getByRole('button', { name: '10분 집중 시작' })).toBeVisible();
  await action.getByRole('button', { name: '10분 집중 시작' }).click();
  await expect(page.getByRole('region', { name: '바로 시작 타이머' })).toBeVisible();
  await page.clock.fastForward(3_000);

  await page.getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '오늘', exact: true }).click();
  const controls = page.getByRole('group', { name: '진행 중인 빠른 집중 관리' });
  await expect(controls.getByRole('button', { name: '잠깐 멈추기' })).toBeVisible();
  await controls.getByRole('button', { name: '잠깐 멈추기' }).click();
  await expect(controls.getByRole('button', { name: '계속 공부하기' })).toBeVisible();
  const paused = await controls.innerText();

  await page.reload();
  await expect(controls.getByRole('button', { name: '계속 공부하기' })).toBeVisible();
  expect(await controls.innerText()).toContain(paused.split(' 실제 집중')[0].split('\n').at(-1) ?? '');
  await controls.getByRole('button', { name: '계속 공부하기' }).click();
  await page.clock.fastForward(2_000);
  await controls.getByRole('button', { name: '끝내고 시간 저장' }).click();
  await expect(page.getByRole('status').filter({ hasText: '저장됨' }).first()).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}'));
  expect(saved.quickTimer).toBeNull();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0]).toMatchObject({ quick: true, taskId: null });
  expect(saved.sessions[0].seconds).toBeGreaterThan(0);
  expect(saved.tasks).toHaveLength(0);

  await page.reload();
  await expect(page.getByText(/최근 집중 .* 저장됨/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
