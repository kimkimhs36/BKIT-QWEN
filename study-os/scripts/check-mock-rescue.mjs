import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';

const raw = readFileSync('../mock-rescue/index.html', 'utf8');
const script = raw.match(/<script>([\s\S]*?)<\/script>/);
assert(script, 'Rescue app script not found');
new Script(script[1], { filename: 'mock-rescue/index.html' });
assert(raw.includes('2026.10.20'));
console.log('Mock Rescue inline JS: valid syntax');

for (const [name, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4175/mock-rescue/', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#chips button').count(), 7);
  assert.equal(await page.locator('.opt').count(), 5);
  await page.locator('#mission-120').click();
  assert.match(await page.locator('#mission-title').innerText(), /영어/);
  let data = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.mock-rescue.20261020.v1')));
  assert.equal(data.mission.minutes, 120);
  assert.equal(data.mission.running, true);
  await page.reload({waitUntil: 'domcontentloaded'});
  assert.match(await page.locator('#mission-title').innerText(), /영어/);
  // English first question's answer is index 1; index 0 is wrong.
  await page.locator('#card .opt').first().click();
  await page.locator('.reason-list button').filter({ hasText: '문장·해석' }).click();
  data = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.mock-rescue.20261020.v1')));
  assert.equal(data.completed.q013.firstCorrect, false);
  assert.equal(data.completed.q013.reason, '문장·해석');
  const download = page.waitForEvent('download');
  await page.locator('#downloadProgress').click();
  const backup = await download;
  assert.equal(backup.suggestedFilename(), 'BKIT-MOCK-20261019-progress.json');
  await page.locator('#mission-pause').click();
  data = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.mock-rescue.20261020.v1')));
  assert.equal(data.mission.running, false);
  await page.reload({waitUntil: 'domcontentloaded'});
  assert.equal(await page.locator('#mission-pause').innerText(), '미션 이어하기');
  await page.locator('#mission-pause').click();
  await page.locator('#mission-jump').click();
  assert.equal(await page.locator('#status').innerText(), '영어 · 기본 문제');
  assert.deepEqual(errors, [], name + ' page errors');
  console.log(name + ': mission, response, wrong reason, export, pause, resume and reload PASS');
  await context.close();
  await browser.close();
}
