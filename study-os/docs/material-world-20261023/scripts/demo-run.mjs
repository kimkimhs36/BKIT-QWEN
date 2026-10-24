import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:4173/';
const dir = process.argv[3] || 'docs/material-world-20261023/demo';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  ...devices['iPhone 13'],
  serviceWorkers: 'block',
  recordVideo: { dir, size: { width: 390, height: 664 } },
});
await context.addInitScript(() => {
  localStorage.setItem('bkit.atelier.visited.v1', '1');
  Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
    configurable: true,
    value: () => Promise.resolve('granted'),
  });
});
const page = await context.newPage();
await page.goto(base, { waitUntil: 'networkidle' });
const build = await page.evaluate(() => fetch(new URL('build-info.json', location.href)).then(r => r.json()));
const metadata = [];
for (const id of [
  'classic',
  'forest',
  'glass',
  'peach',
  'diamond',
  'gold',
  'jelly',
  'droplets',
  'night',
]) {
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.locator(`[data-swatch="${id}"]`).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.waitForTimeout(1000);
  const before = await page.locator('.study-start h2').boundingBox();
  await page.mouse.click(8, 500);
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${dir}/${id}-touch.png` });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: '센서 연결', exact: true }).click();
  for (const [beta, gamma] of [
    [30, 0],
    [40, 18],
    [35, -18],
    [30, 0],
  ]) {
    await page.evaluate(
      ({ beta, gamma }) => {
        const e = new Event('deviceorientation');
        Object.defineProperties(e, { beta: { value: beta }, gamma: { value: gamma } });
        dispatchEvent(e);
      },
      { beta, gamma },
    );
    await page.waitForTimeout(350);
  }
  await page.locator('.material-sensor-preview').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dir}/${id}-sensor-simulation.png` });
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  const after = await page.locator('.study-start h2').boundingBox();
  metadata.push({
    id,
    source: 'Simulated orientation events, not physical sensors',
    textPositionFixed: Math.abs(before.x - after.x) < 1 && Math.abs(before.y - after.y) < 1,
  });
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: '센서 끄기', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
}
const video = page.video();
await context.close();
await video.saveAs(dir + '/nine-materials-touch-and-simulated-tilt.webm');
await writeFile(dir + '/demo.json', JSON.stringify({ base, build, metadata }, null, 2));
await browser.close();
