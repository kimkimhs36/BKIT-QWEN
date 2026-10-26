import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.BKIT_EVIDENCE_URL || 'http://127.0.0.1:4173/';
const stage = process.env.BKIT_EVIDENCE_STAGE || 'after';
const directory = 'docs/build03/evidence';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const observations = [];
for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, iphone: { width: 390, height: 844 }, ipad: { width: 1194, height: 834 }, galaxy: { width: 1280, height: 800 } })) {
 const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
 await context.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
 const page = await context.newPage();
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 for (const route of ['', 'map', 'progress', 'roadmap']) {
  await page.goto(origin + 'juggernaut/' + route);
  await page.locator('.jg-main h1').waitFor();
  if (route === 'map') await page.locator('.jg-map-detail').waitFor();
  await page.screenshot({ path: `${directory}/${stage}-${device}-${route || 'command'}.png`, fullPage: true });
  observations.push({ origin, stage, device, route, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), errors: [...errors] });
 }
 if (stage !== 'before') {
  await page.goto(origin + 'juggernaut/map');
  await page.locator('.jg-map-list button').filter({ hasText: '문자 대입' }).click();
  await page.getByRole('button', { name: '이 개념 학습 시작' }).click();
 } else {
  await page.goto(origin + 'juggernaut/');
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
 }
 await page.locator('.jg-stem').waitFor();
 await page.screenshot({ path: `${directory}/${stage}-${device}-training.png`, fullPage: true });
 await context.close();
}
await writeFile(`${directory}/${stage}-observations.json`, JSON.stringify({ capturedAt: new Date().toISOString(), observations }, null, 2));
await browser.close();
