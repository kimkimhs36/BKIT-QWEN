import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { exportStudySheets } from '../../src/cloudSheet';
test.use({ reducedMotion: 'reduce' });
test.setTimeout(60000);

async function settings(page: Page) {
  await page.goto('./');
  await page.locator('nav:visible').getByRole('button', { name: '도구', exact: true }).first().click();
  await page.getByRole('button', { name: '설정', exact: true }).click();
}

test('disconnect prevents a delayed private-sync response from reviving the connection', async ({ page }) => {
  const initial = newState();
  const remote = newState();
  remote.settings.goal = '늦게 도착한 원격 목표';
  await page.addInitScript(({ initial, remote }) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(initial));
    (window as any).google = { accounts: { oauth2: { initTokenClient(options: any) {
      return { requestAccessToken() { options.callback({ access_token: 'synthetic-test-token', scope: options.scope }); } };
    } } } };
    let reads = 0;
    const original = window.fetch.bind(window);
    const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
    window.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/config')) return response({ googleClientId: 'test.apps.googleusercontent.com', briefingEnabled: false });
      if (url.endsWith('/api/sync')) {
        if (init?.method === 'PUT') return response({ version: 1 });
        if (++reads === 1) return response({ version: 0, state: null });
        return new Promise(resolve => { (window as any).releaseSync = () => resolve(response({ version: 2, state: remote })); });
      }
      return original(input, init);
    };
  }, { initial, remote });
  await settings(page);
  const panel = page.getByRole('region', { name: 'BKIT 개인 클라우드' });
  await panel.getByRole('button', { name: 'Google로 개인 클라우드 연결', exact: true }).click();
  await expect(panel.getByRole('button', { name: '이 기기 연결 해제', exact: true })).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await panel.getByRole('button', { name: '지금 동기화', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseSync)).toBe('function');
  await panel.getByRole('button', { name: '이 기기 연결 해제', exact: true }).click();
  await page.evaluate(() => (window as any).releaseSync());
  await expect(panel.getByRole('button', { name: 'Google로 개인 클라우드 연결', exact: true })).toBeVisible();
  await expect(panel).toContainText('연결을 끊었어요.');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
});

test('disconnect prevents a delayed Sheets response from reviving old connection state', async ({ page }) => {
  const state = newState();
  const sheets = exportStudySheets(state);
  const changed = exportStudySheets({ ...state, settings: { ...state.settings, goal: '다른 연결의 원격 목표' } });
  await page.addInitScript(({ state, sheets, changed }) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.cloud-settings.v1', JSON.stringify({ sheetId: 'BKIT_SYNTHETIC_SHEET_1234567890', oauthClientId: 'test.apps.googleusercontent.com' }));
    (window as any).google = { accounts: { oauth2: { initTokenClient(options: any) {
      return { requestAccessToken() { options.callback({ access_token: 'synthetic-sheet-token', scope: options.scope }); } };
    } } } };
    let reads = 0;
    const original = window.fetch.bind(window);
    const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
    const values = (data: typeof sheets) => ({ valueRanges: [data.tasks, data.schedules, data.context].map(values => ({ values })) });
    window.fetch = async (input, init) => {
      const url = String(input);
      if (url.startsWith('https://sheets.googleapis.com/')) {
        if (url.includes('values:batchGet')) {
          if (++reads === 1) return response(values(sheets));
          return new Promise(resolve => { (window as any).releaseSheet = () => resolve(response(values(changed))); });
        }
        return response({ sheets: ['Meta', 'Tasks', 'Schedules', 'LearningContext'].map((title, sheetId) => ({ properties: { title, sheetId } })) });
      }
      return original(input, init);
    };
  }, { state, sheets, changed });
  await settings(page);
  await page.getByText('Google Sheets 연동 (이전 방식 · 별도 설정)', { exact: true }).click();
  const panel = page.getByRole('region', { name: 'BKIT 클라우드 동기화' });
  await panel.getByRole('button', { name: 'Google 계정 연결', exact: true }).click();
  await expect(panel.getByRole('button', { name: '이 기기 연결 끊기', exact: true })).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await panel.getByRole('button', { name: '지금 동기화 확인', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseSheet)).toBe('function');
  await panel.getByRole('button', { name: '이 기기 연결 끊기', exact: true }).click();
  await page.evaluate(() => (window as any).releaseSheet());
  await expect(panel.getByRole('button', { name: 'Google 계정 연결', exact: true })).toBeVisible();
  await expect(panel).toContainText('동기화를 중지했어.');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
});
