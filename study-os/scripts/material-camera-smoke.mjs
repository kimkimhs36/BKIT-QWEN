/** Uses Chromium's generated test camera; no person, face image or external video. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:4173/';
const dir = process.argv[3] || 'docs/material-world-20261023/camera-smoke';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({ permissions: ['camera'], serviceWorkers: 'block' });
await context.addInitScript(() => {
  localStorage.setItem('bkit.atelier.visited.v1', '1');
  const w = window;
  w.__smokeStreams = [];
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => {
    const stream = await original(c);
    w.__smokeStreams.push(stream);
    return stream;
  };
});
const page = await context.newPage();
const requests = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => requests.push({ method: r.method(), url: r.url() }));
await page.goto(base, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
const awake = page.locator('.awake-assist');
await awake.locator(':scope > summary').click();
if (requests.some((x) => /face_landmarker.task/.test(x.url)))
  throw Error('Model fetched before start');
await awake.getByRole('button', { name: '졸음 신호 감지 시작', exact: true }).click();
await awake
  .locator('.awake-status')
  .getByText('관찰 불가 · 신뢰도 낮음', { exact: true })
  .waitFor({ timeout: 60000 });
await page.screenshot({ path: dir + '/actual-mediapipe-generated-camera.png' });
await awake.getByRole('button', { name: '즉시 종료', exact: true }).click();
const tracks = await page.evaluate(() =>
  window.__smokeStreams.flatMap((s) =>
    s.getTracks().map((t) => ({ kind: t.kind, state: t.readyState })),
  ),
);
if (!tracks.length || tracks.some((t) => t.state !== 'ended'))
  throw Error('Camera tracks still live');
if (!requests.some((x) => /face_landmarker.task/.test(x.url)))
  throw Error('Real model not downloaded');
if (requests.some((x) => !['GET', 'HEAD', 'OPTIONS'].includes(x.method)))
  throw Error('Unexpected outgoing non-read request');
if (errors.length) throw Error(errors.join('\n'));
await writeFile(
  dir + '/result.json',
  JSON.stringify(
    {
      base,
      scope:
        'Real MediaPipe CPU/WASM model with Chromium-generated camera. No real face or physical camera/accuracy test.',
      tracks,
      requests,
      errors,
      passed: true,
    },
    null,
    2,
  ),
);
await browser.close();
