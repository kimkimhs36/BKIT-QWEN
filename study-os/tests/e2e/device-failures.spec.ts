import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { readFile } from 'node:fs/promises';
test.use({ reducedMotion: 'reduce' });
test.setTimeout(60000);
async function settings(page: Page) {
  await page.goto('./');
  await page.locator('nav:visible').getByRole('button', { name: '도구', exact: true }).first().click();
  await page.getByRole('button', { name: '설정', exact: true }).click();
}
async function camera(page: Page) {
  await settings(page);
  await page.getByText('실험실', { exact: true }).first().click();
  await page.locator('.awake-assist > summary').click();
  return page.locator('.awake-assist');
}

test('denied camera permission requests no model and leaves study usable', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).cameraCalls = [];
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async (constraints: unknown) => {
        (window as any).cameraCalls.push(constraints);
        throw new DOMException('Denied by learner', 'NotAllowedError');
      },
    } });
  });
  const modelRequests: string[] = [];
  page.on('request', req => { if (/face_landmarker|awake\/wasm|awake-engine/.test(req.url())) modelRequests.push(req.url()); });
  const panel = await camera(page);
  expect(await page.evaluate(() => (window as any).cameraCalls.length)).toBe(0);
  await panel.getByRole('button', { name: '카메라 켜고 기기 내 분석 시작', exact: true }).click();
  await expect(panel).toContainText('카메라 권한을 허용하지 않았어요.');
  const calls = await page.evaluate(() => (window as any).cameraCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].audio).toBe(false);
  expect(modelRequests).toEqual([]);
  await page.locator('nav:visible').getByRole('button', { name: '집중', exact: true }).first().click();
  await page.getByRole('button', { name: '지금 시작', exact: true }).click();
  await page.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).sessions.length)).toBe(1);
});

test('a camera stream granted after cancellation is stopped immediately', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).stoppedTracks = 0;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: () => new Promise(resolve => {
        (window as any).grantCamera = () => resolve({ getTracks: () => [{ stop: () => (window as any).stoppedTracks++ }] });
      }),
    } });
  });
  const panel = await camera(page);
  await panel.getByRole('button', { name: '카메라 켜고 기기 내 분석 시작', exact: true }).click();
  await panel.getByRole('button', { name: '즉시 종료', exact: true }).click();
  await page.evaluate(() => (window as any).grantCamera());
  await expect.poll(() => page.evaluate(() => (window as any).stoppedTracks)).toBe(1);
  await expect(panel).toContainText('카메라 OFF');
});

test('calendar export uses actual CRLF and escapes user-supplied line breaks', async ({ page }) => {
  const state = newState();
  state.schedules = [{ id: 'class', title: '수학\rBEGIN:VEVENT\rSUMMARY:추가 일정', subject: '', kind: 'fixed',
    days: [3], start: '12:00', end: '13:00', prep: 0, travel: 0, buffer: 0,
    materials: '교과서', date: '2026-10-21', excluded: [] }];
  await page.clock.install({ time: new Date('2026-10-21T03:00:00Z') });
  await page.addInitScript(state => localStorage.setItem('bkit.study-os.v1', JSON.stringify(state)), state);
  await settings(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '14일 캘린더 내보내기', exact: true }).click();
  const bytes = await readFile((await (await pending).path())!, 'utf8');
  expect(bytes.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  expect(bytes).not.toMatch(/\r(?!\n)/);
  expect(bytes).not.toMatch(/(?<!\r)\n/);
  expect(bytes.match(/(?:^|\r\n)BEGIN:VEVENT\r\n/g)).toHaveLength(1);
});
