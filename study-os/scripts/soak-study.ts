/** Real elapsed-time soak in an isolated local browser profile; no production data. */
import { webkit, chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const [url = 'http://127.0.0.1:4176/study-os/', minutesText = '35', engine = 'webkit'] = process.argv.slice(2);
const minutes = Number(minutesText);
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || !(minutes >= 2 && minutes <= 120))
  throw new Error('Use a local preview and a 2–120 minute duration.');
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin
  ? route.continue() : route.abort());
let page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
await page.goto(url);
await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
await expect(page.locator('.quick-timer-active')).toBeVisible();
const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).quickTimer);
const samples: unknown[] = [];
const started = performance.now();
for (let minute = 1; minute <= minutes; minute++) {
  const until = started + minute * 60_000;
  while (performance.now() < until) await new Promise(resolve => setTimeout(resolve, Math.min(1000, until - performance.now())));
  if (minute === 2) await context.setOffline(true);
  if (minute === 3) await context.setOffline(false);
  if (minute % 5 === 0) {
    await page.locator('nav:visible').getByRole('button', { name: '기록', exact: true }).first().click();
    await page.locator('nav:visible').getByRole('button', { name: '집중', exact: true }).first().click();
  }
  if (minute % 10 === 0) {
    // Close and recreate the actual page; an app reload must not reset its timer.
    await page.close();
    page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.locator('nav:visible').getByRole('button', { name: '집중', exact: true }).first().click();
  }
  const sample = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bkit.study-os.v1')!);
    return { at: Date.now(), id: s.quickTimer?.id, sessions: s.sessions.length,
      display: document.querySelector('.quick-timer-active [role="timer"]')?.textContent };
  });
  expect(sample.id).toBe(initial.id);
  expect(sample.sessions).toBe(0);
  samples.push(sample);
  console.log(JSON.stringify({ minute, ...sample }));
}
const stop = Date.now();
await page.locator('.quick-timer-actions').getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
const result = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
expect(result.sessions).toHaveLength(1);
expect(result.quickTimer).toBeNull();
expect(result.sessions[0].id).toBe(initial.id);
const expectedSeconds = (stop - Date.parse(initial.started)) / 1000;
expect(Math.abs(result.sessions[0].seconds - expectedSeconds)).toBeLessThan(2);
await page.reload();
expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).sessions)).toEqual(result.sessions);
expect(errors).toEqual([]);
const report = { measuredAt: new Date().toISOString(), engine, browser: browser.version(),
  minutes, expectedSeconds, recordedSeconds: result.sessions[0].seconds,
  absoluteErrorSeconds: Math.abs(result.sessions[0].seconds - expectedSeconds),
  samples, errors, limitations: 'Headless engine. Does not simulate iOS device locking, OS process eviction or physical camera permissions.' };
await mkdir('docs/validation/internal-reliability', { recursive: true });
await writeFile('docs/validation/internal-reliability/soak-' + engine + '.json', JSON.stringify(report, null, 2) + '\n');
await browser.close();
console.log(JSON.stringify(report, null, 2));
