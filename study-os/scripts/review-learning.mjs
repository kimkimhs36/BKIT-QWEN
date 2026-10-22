import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../artifacts/learning-continuity/', import.meta.url).pathname;
const baselineURL = process.env.BKIT_BASELINE_URL || 'http://127.0.0.1:4174/study-os/';
const reviewURL = process.env.BKIT_REVIEW_URL || 'http://127.0.0.1:4175/study-os/';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
const metrics = [];
try {
  for (const [device, viewport] of [
    ['iphone', { width: 390, height: 844 }],
    ['ipad', { width: 1194, height: 834 }],
    ['small', { width: 320, height: 740 }],
  ]) {
    for (const [stage, url] of [
      ['before', baselineURL],
      ['after', reviewURL],
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === new URL(url).origin
          ? route.continue()
          : route.abort(),
      );
      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
      await page.addInitScript(() => {
        localStorage.setItem('bkit.atelier.visited.v1', '1');
        localStorage.setItem(
          'bkit.material.v1',
          JSON.stringify({ id: 'peach', motion: 'off', intensity: 0.5, lowPower: true }),
        );
        localStorage.setItem('bkit.study-os.theme.v1', 'light');
      });
      await page.goto(url);
      await page.getByRole('button', { name: '과제 · 일정 등록', exact: true }).click();
      await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('수학 학습지 5문제');
      await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.evaluate(() => document.fonts.ready);
      await page.clock.runFor(6500);
      await page.screenshot({
        path: `${out}/${device}-${stage}-home.png`,
        fullPage: true,
        animations: 'disabled',
      });
      metrics.push({
        device,
        stage,
        screen: 'home',
        ...(await page.evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          hero: document.querySelector('.study-start').getBoundingClientRect().toJSON(),
          cta: document.querySelector('.study-start-primary').getBoundingClientRect().toJSON(),
        }))),
      });
      await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
      await page.getByRole('heading', { name: '집중', exact: true }).waitFor();
      await page.clock.runFor(6500);
      await page.screenshot({
        path: `${out}/${device}-${stage}-focus.png`,
        fullPage: true,
        animations: 'disabled',
      });
      metrics.push({
        device,
        stage,
        screen: 'focus',
        ...(await page.evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          timer: document.querySelector('.focus-instrument').getBoundingClientRect().toJSON(),
          actions: document.querySelector('.focus-actions').getBoundingClientRect().toJSON(),
        }))),
      });
      await context.close();
    }
  }
  await writeFile(out + '/geometry.json', JSON.stringify(metrics, null, 2));
} finally {
  await browser.close();
}
