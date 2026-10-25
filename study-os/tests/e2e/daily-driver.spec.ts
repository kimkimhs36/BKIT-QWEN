import { test, expect } from './local-fixture';
import { newState, taskSchema } from '../../src/model';
import { mkdir } from 'node:fs/promises';
test.use({ serviceWorkers: 'block' });
const nav = async (page: import('@playwright/test').Page, name: string) =>
  page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();

test('maximum glass uses no mobile GPU context, idle settles, icon feedback respects reduced motion', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bkit.material.v1',
      JSON.stringify({ id: 'glass', motion: 'auto', intensity: 1, lowPower: false }),
    );
    (window as any).__gpuRequests = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) {
      if (String(args[0]).startsWith('webgl')) (window as any).__gpuRequests++;
      return (original as any).apply(this, args);
    } as any;
  });
  await page.goto('./');
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeVisible();
  if (info.project.name !== 'desktop')
    expect(await page.evaluate(() => (window as any).__gpuRequests)).toBe(0);
  const stamp = page.locator('.study-calendar-stamp');
  await stamp.dispatchEvent('pointerdown', { pointerType: 'touch' });
  expect(await stamp.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(450);
  await stamp.dispatchEvent('pointerdown', { pointerType: 'touch' });
  expect(await stamp.evaluate((el) => el.getAnimations().length)).toBe(0);
  const dir = `docs/daily-driver-20261025/after/${info.project.name}`;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: dir + '/home.png', animations: 'disabled' });
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await nav(page, '달력');
  const chip = page.getByRole('button', { name: /공부 타이머 열기/ });
  await expect(chip).toBeVisible();
  expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: dir + '/calendar-timer.png',
    fullPage: true,
    animations: 'disabled',
  });
  await chip.click();
  await page.getByRole('button', { name: '기록 없이 종료', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).sessions),
  ).toEqual([]);
});

test('year overview drills into leap February, selecting a date keeps date-only integrity', async ({
  page,
}) => {
  await page.goto('./');
  await nav(page, '달력');
  await page.getByLabel('조회 날짜').fill('2028-02-29');
  await page.getByRole('button', { name: '연간', exact: true }).click();
  await expect(page.getByRole('region', { name: '연간 달력' }).getByRole('button')).toHaveCount(12);
  await page.getByRole('button', { name: '2028-02 월간 보기' }).click();
  await page.getByRole('button', { name: /2028-02-29 · 일정/ }).click();
  await expect(page.getByLabel('조회 날짜')).toHaveValue('2028-02-29');
  await page.getByRole('button', { name: '다음 기간', exact: true }).click();
  await expect(page.getByLabel('조회 날짜')).toHaveValue('2028-03-29');
});

test('home starts the task it actually recommends', async ({ page }) => {
  const state = newState();
  state.tasks = [
    taskSchema.parse({
      id: 'recommended',
      subject: '수학',
      title: '함수 학습지',
      kind: '숙제',
      due: null,
      minutes: 25,
      remaining: 25,
      priority: 3,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  await page.addInitScript(
    (s) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(s)),
    state,
  );
  await page.goto('./');
  await expect(page.locator('.study-start')).toContainText('함수 학습지');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).active?.taskId),
  ).toBe('recommended');
  await nav(page, '달력');
  await page.getByRole('button', { name: /공부 타이머 열기/ }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).active?.taskId),
  ).toBe('recommended');
});

test('remembered Google connection restores without popup and logout preserves learning data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient(options: any) {
            return {
              requestAccessToken() {
                (window as any).__googlePrompts = ((window as any).__googlePrompts || 0) + 1;
                options.callback({ access_token: 'synthetic-google', scope: options.scope });
              },
            };
          },
        },
      },
    };
    const original = fetch;
    const credential = 'bkit_sync_' + 'a'.repeat(64);
    (window as any).__revoked = false;
    window.fetch = (async (input: any, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/config'))
        return new Response(
          JSON.stringify({
            googleClientId: 'test.apps.googleusercontent.com',
            rememberSyncEnabled: true,
          }),
        );
      if (url.endsWith('/api/session')) {
        if (init?.method === 'DELETE') {
          (window as any).__revoked = true;
          return new Response(null, { status: 204 });
        }
        return new Response(JSON.stringify({ token: credential, expiresAt: Date.now() + 60000 }));
      }
      if (url.endsWith('/api/sync')) {
        if (init?.method === 'PUT') {
          localStorage.setItem('qa-remote', JSON.stringify(JSON.parse(String(init.body)).state));
          return new Response('{"version":1}');
        }
        const state = JSON.parse(localStorage.getItem('qa-remote') || 'null');
        return new Response(JSON.stringify({ version: state ? 1 : 0, state }));
      }
      return original(input, init);
    }) as typeof fetch;
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Google로 이어가기', exact: true }).click();
  const panel = page.getByRole('region', { name: 'BKIT 개인 클라우드' });
  await expect(panel.getByLabel(/이 기기에서 로그인 유지/)).toBeChecked();
  await panel.getByRole('button', { name: 'Google로 개인 클라우드 연결' }).click();
  await expect(panel).toContainText('연결됨');
  await page.reload();
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByText('기기 간 연동', { exact: true }).click();
  await expect(panel).toContainText('로그인이 유지됐어요');
  expect(await page.evaluate(() => (window as any).__googlePrompts || 0)).toBe(0);
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await panel.getByRole('button', { name: '이 기기 연결 해제' }).click();
  await expect(panel).toContainText('연결을 끊었어요');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
  await expect.poll(() => page.evaluate(() => (window as any).__revoked)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByText('기기 간 연동', { exact: true }).click();
  await expect(panel).toContainText('이 기기만');
});
