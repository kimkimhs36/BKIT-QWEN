import { test, expect, type Page } from './local-fixture';
// Synthetic model responses must be routed by this test, outside the real worker cache.
test.use({ serviceWorkers: 'block' });
async function focus(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await expect(page.locator('.quick-timer-active')).toBeVisible();
  await page.locator('.awake-assist > summary').click();
}
async function syntheticCamera(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__streams = [];
    w.__cameraRequests = 0;
    w.__models = 0;
    w.__closedModels = 0;
    w.__blink = false;
    const getUserMedia = async () => {
      w.__cameraRequests++;
      if (w.__deny) throw new DOMException('denied', 'NotAllowedError');
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;
      let count = 0;
      const draw = () => {
        ctx.fillStyle = count++ % 2 ? '#aaa' : '#a9a9a9';
        ctx.fillRect(0, 0, 320, 240);
      };
      draw();
      const stream = canvas.captureStream(12),
        timer = setInterval(draw, 70);
      stream.getTracks().forEach((track) => {
        const stop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(timer);
          stop();
        };
      });
      w.__streams.push(stream);
      return stream;
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
  });
  await page.route(/\/assets\/engine-[^/]+\.js$/, async (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export async function createFaceEngine(){window.__models++;if(window.__modelFail)throw Error('synthetic model failure');return {close(){window.__closedModels++},detectForVideo(){if(window.__inferenceFail)throw Error('synthetic inference failure');const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));const close=window.__blink,dy=close ? .003 : .027;for(const [a,b,c,d,e,f,x] of [[33,160,158,133,153,144,.3],[362,385,387,263,373,380,.57]]){p[a]={x,y:.4,z:0};p[d]={x:x+.13,y:.4,z:0};p[b]={x:x+.04,y:.4-dy,z:0};p[c]={x:x+.09,y:.4-dy,z:0};p[e]={x:x+.09,y:.4+dy,z:0};p[f]={x:x+.04,y:.4+dy,z:0};}p[1]={x:.5,y:.52,z:0};p[152]={x:.5,y:.85,z:0};return {faceLandmarks:window.__missing?[]:[p],faceBlendshapes:[{categories:[{categoryName:'eyeBlinkLeft',score:close ? .94 : .1},{categoryName:'eyeBlinkRight',score:close ? .94 : .1}]}],facialTransformationMatrixes:[]}}}}`,
    }),
  );
}
async function ended(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__streams.every((s: MediaStream) =>
          s.getTracks().every((t) => t.readyState === 'ended'),
        ),
      ),
    )
    .toBe(true);
}
test('synthetic camera: explicit start, calibration, repeated closure, acknowledged guidance, safe break', async ({
  page,
}) => {
  test.setTimeout(70000);
  await syntheticCamera(page);
  await focus(page);
  expect(await page.evaluate(() => (window as any).__cameraRequests)).toBe(0);
  const awake = page.locator('.awake-assist');
  await awake.getByRole('button', { name: '졸음 신호 감지 시작', exact: true }).click();

  await expect(awake).toContainText('눈 기준 보정 중');
  await expect(awake.locator('.awake-status')).toContainText('ON');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.awakeCamera))
    .toBe('true');
  await expect(awake.locator('.awake-status').getByText('관찰 중', { exact: true })).toBeVisible({
    timeout: 12000,
  });
  // First intentional closure causes no strong intervention.
  await page.evaluate(() => ((window as any).__blink = true));
  await page.waitForTimeout(1000);
  await page.evaluate(() => ((window as any).__blink = false));
  await page.waitForTimeout(700);
  await expect(awake.locator('.awake-guidance')).toHaveCount(0);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => ((window as any).__blink = true));
    await expect(awake).toContainText(`긴 눈 감김 ${i + 1}회`, { timeout: 15000 });
    await page.evaluate(() => ((window as any).__blink = false));
    await page.waitForTimeout(1500);
  }
  await expect(awake).toContainText('휴식 권장');
  await awake.getByRole('button', { name: '확인 · 추가 알림 중지', exact: true }).click();
  await expect(awake.getByRole('button', { name: '확인했어요 · 알림 중지' })).toBeDisabled();
  await awake.getByRole('button', { name: '일시정지하고 WAKE BOMB 휴식', exact: true }).click();
  await ended(page);
  await expect(page.getByRole('dialog', { name: 'WAKE BOMB', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).quickTimer.segmentStart,
    ),
  ).toBeNull();
  await page.getByRole('button', { name: '학습으로 돌아가기', exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).quickTimer.segmentStart,
    ),
  ).toBeNull();
});
test('synthetic camera: preview hiding, pause, panel close and navigation release real MediaStream tracks', async ({
  page,
}) => {
  test.setTimeout(60000);
  await syntheticCamera(page);
  await focus(page);
  const awake = page.locator('.awake-assist');
  const start = () =>
    awake.getByRole('button', { name: '졸음 신호 감지 시작', exact: true }).click();
  await start();
  await expect(awake).toContainText('눈 기준 보정 중');
  await awake.locator('.awake-advanced > summary').click();
  await awake.getByLabel('카메라 미리보기 표시', { exact: true }).check();
  await expect(awake.locator('video')).not.toHaveClass(/concealed/);
  await awake.getByLabel('카메라 미리보기 표시', { exact: true }).uncheck();
  await expect(awake.locator('video')).toHaveClass(/concealed/);
  await expect(awake.locator('.awake-status')).toContainText('ON');
  await awake.getByRole('button', { name: '일시중지', exact: true }).click();
  await ended(page);
  await expect(awake).toContainText('일시중지 · 카메라 OFF');
  await start();
  await expect(awake).toContainText('눈 기준 보정 중');
  await awake.locator(':scope > summary').click();
  await ended(page);
  await awake.locator(':scope > summary').click();
  await start();
  await expect(awake).toContainText('눈 기준 보정 중');
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  await ended(page);
  expect(await page.evaluate(() => (window as any).__models)).toBe(
    await page.evaluate(() => (window as any).__closedModels),
  );
});
test('synthetic camera: denial and model failure leave learning usable; pagehide ends analysis without restart', async ({
  page,
}) => {
  test.setTimeout(60000);
  await syntheticCamera(page);
  await focus(page);
  const awake = page.locator('.awake-assist');
  await page.evaluate(() => ((window as any).__deny = true));
  await awake.getByRole('button', { name: '졸음 신호 감지 시작', exact: true }).click();
  await expect(awake).toContainText('카메라 권한을 허용하지');
  await page.evaluate(() => {
    (window as any).__deny = false;
    (window as any).__modelFail = true;
  });
  await awake.getByRole('button', { name: '졸음 신호 감지 시작', exact: true }).click();
  await expect(awake).toContainText('준비하지 못');
  await ended(page);
  await page.evaluate(() => ((window as any).__modelFail = false));
  await awake.getByRole('button', { name: '졸음 신호 감지 시작', exact: true }).click();
  await expect(awake).toContainText('눈 기준 보정 중');
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await ended(page);
  const requests = await page.evaluate(() => (window as any).__cameraRequests);
  await page.evaluate(() => dispatchEvent(new Event('pageshow')));
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).__cameraRequests)).toBe(requests);
  await expect(page.locator('.quick-timer-active')).toBeVisible();
});

test('unavailable optional camera UI never interrupts a five-minute study', async ({ page }) => {
  await page.route(/\/assets\/AwakeAssist-[^/]+\.js$/, (route) => route.abort('failed'));
  await page.goto('./');
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await expect(page.locator('.quick-timer-active')).toBeVisible();
  await expect(page.locator('.awake-unavailable')).toContainText('카메라 OFF');
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '일시정지', exact: true })
    .click();
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '끝내고 시간 저장', exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).sessions.length,
    ),
  ).toBe(1);
});
