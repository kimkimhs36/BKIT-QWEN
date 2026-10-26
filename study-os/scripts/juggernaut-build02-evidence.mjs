import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = (process.env.BKIT_EVIDENCE_URL || 'http://127.0.0.1:4173/').replace(/\/?$/, '/');
const out = process.env.BKIT_EVIDENCE_DIR || 'docs/build02/evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const results = [];
for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['iphone', { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
    hasTouch: device === 'iphone',
  });
  await context.addInitScript(() => {
    localStorage.setItem('bkit.atelier.visited.v1', '1');
    window.__juggernautGPU = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (String(args[0]).startsWith('webgl')) window.__juggernautGPU++;
      return original.apply(this, args);
    };
  });
  const page = await context.newPage();
  for (const [label, path] of [
    ['command', ''],
    ['map', 'map'],
    ['studio', 'progress'],
    ['arrival', 'arrival'],
  ]) {
    await page.goto(base + 'juggernaut/' + path);
    await page.locator('.jg-main h1').waitFor();
    if (path === 'map') await page.locator('.react-flow__node').first().waitFor();
    await page.screenshot({
      path: `${out}/build02-${label}-${device}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.goto(base + 'juggernaut/');
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).waitFor();
  const start = Date.now();
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
  await page.getByRole('button', { name: '첫 답변 제출' }).waitFor();
  const actionToFormMs = Date.now() - start;
  await page.screenshot({
    path: `${out}/build02-training-${device}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('radio', { name: '2', exact: true }).check();
  await page
    .getByRole('textbox', { name: '풀이 설명', exact: true })
    .fill('양변에서 3을 빼고, x=2를 원래 식에 대입하여 검산했다.');
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await page
    .locator('.jg-dock')
    .getByRole('link', { name: /PERFORMANCE STUDIO/ })
    .click();
  await page.screenshot({
    path: `${out}/build02-studio-populated-${device}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  results.push({
    device,
    viewport,
    actionToFormMs,
    notes:
      'Automation click-to-visible form elapsed; includes Playwright overhead, not INP or a physical-device benchmark',
    ...(await page.evaluate(() => ({
      webGLRequests: window.__juggernautGPU,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      storedAttempts: JSON.parse(localStorage.getItem('bkit.juggernaut.v1.device')).attempts.length,
    }))),
  });
  if (device === 'desktop') {
    await page.goto(base + 'juggernaut/');
    for (const [name, id] of [
      ['Soft Jelly', 'jelly'],
      ['Night Sprint', 'night'],
    ]) {
      await page.getByRole('button', { name: '재질 테마 설정 열기' }).click();
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByRole('button', { name: '재질 설정 닫기' }).click();
      await page.screenshot({
        path: `${out}/build02-command-${id}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await context.close();
}
await browser.close();
await writeFile(
  `${out}/browser-observations.json`,
  JSON.stringify({ base, recordedAt: new Date().toISOString(), results }, null, 2) + '\n',
);
console.log(JSON.stringify(results));
