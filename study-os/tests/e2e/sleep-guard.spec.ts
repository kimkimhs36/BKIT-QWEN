import { test, expect } from '@playwright/test';
import { newState } from '../../src/model';
import { DEFAULT_SLEEP_SETTINGS } from '../../src/sleepGuardLogic';

const sleep = { ...DEFAULT_SLEEP_SETTINGS, enabled: true };

test('320px phone wind-down guidance is visible without horizontal overflow', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T12:45:00Z') }); // Mon 21:45 Korea
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(s => localStorage.setItem('bkit.sleep-guard.v1', JSON.stringify(s)), sleep);
  await page.goto('./');
  await expect(page.locator('.bkit-sleep-notice')).toContainText('22:30');
  await page.getByRole('button', { name: '수면 가드 설정 열기' }).click();
  await expect(page.getByRole('dialog', { name: '수면 보호 설정' })).toBeVisible();
  await expect(page.getByText('화면 내려놓기')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
  await page.getByLabel('iPhone에서 직접 설정함').check();
  await page.getByRole('button', { name: '설정 저장하고 닫기' }).click();
  await page.reload();
  await page.getByRole('button', { name: '수면 가드 설정 열기' }).click();
  await expect(page.getByLabel('iPhone에서 직접 설정함')).toBeChecked();
  await expect(page.getByLabel('iPad에서 직접 설정함')).not.toBeChecked();
});

test('night screen is quiet and can be extended for an urgent task', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T14:00:00Z') }); // Mon 23:00 Korea
  await page.addInitScript(s => localStorage.setItem('bkit.sleep-guard.v1', JSON.stringify(s)), sleep);
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: '오늘은 여기까지.' })).toBeVisible();
  await page.getByRole('button', { name: '꼭 필요한 일이 있어 · 30분만 연장' }).click();
  await expect(page.getByRole('dialog', { name: '오늘은 여기까지.' })).toHaveCount(0);
});

test('sleep window stops running focus at the 22:30 boundary, not 02:00', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T17:00:00Z') }); // Tue 02:00 Korea
  const state = newState();
  state.active = {
    id: 'sleep-fixture', taskId: null, subject: '영어',
    action: '지문 해석', target: 25, started: '2026-10-19T13:20:00.000Z',
    segmentStart: '2026-10-19T13:20:00.000Z', elapsed: 0, pauses: [], segments: [],
  };
  await page.addInitScript(
    ({ study, settings }) => {
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(study));
      localStorage.setItem('bkit.sleep-guard.v1', JSON.stringify(settings));
    },
    { study: state, settings: sleep },
  );
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: '오늘은 여기까지.' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('bkit.study-os.v1')!);
    return { elapsed: stored.active.elapsed, segmentStart: stored.active.segmentStart };
  })).toEqual({ elapsed: 600, segmentStart: null });
});
