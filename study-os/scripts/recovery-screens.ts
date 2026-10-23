import { chromium, webkit, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.argv[2],
  out = process.argv[3];
if (!base || !out) throw new Error('base URL and output directory required');
await mkdir(out, { recursive: true });
const metrics: unknown[] = [];
for (const [name, browser, options] of [
  ['iphone', webkit, devices['iPhone 13']],
  ['ipad', webkit, devices['iPad Pro 11']],
  ['desktop', chromium, { viewport: { width: 1440, height: 1000 } }],
] as const) {
  const b = await browser.launch(
    browser === chromium ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {},
  );
  const context = await b.newContext({ ...options });
  await context.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-23T04:00:00Z') });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const capture = async (screen: string) => {
    await page.waitForTimeout(500);
    await page.screenshot({
      path: out + '/' + name + '-' + screen + '.png',
      animations: 'disabled',
    });
    metrics.push({
      device: name,
      screen,
      errors: [...errors],
      geometry: await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        elements: [
          ...document.querySelectorAll(
            '.study-home>*,.study-start-primary,.study-start-five,nav[aria-label="주 메뉴"]',
          ),
        ].map((e) => ({
          tag: e.tagName,
          class: e.className,
          text: e.textContent,
          rect: JSON.parse(JSON.stringify(e.getBoundingClientRect())),
        })),
      })),
    });
  };
  await capture('home');
  if (name === 'iphone') {
    for (const [label, screen] of [
      ['집중', 'focus'],
      ['과제', 'tasks'],
      ['도구', 'settings'],
    ]) {
      await page
        .locator('nav:visible')
        .getByRole('button', { name: label, exact: true })
        .first()
        .click();
      if (label === '도구') await page.getByRole('button', { name: '설정', exact: true }).click();
      await capture(screen);
    }
    await page.getByRole('button', { name: '테마 선택', exact: true }).click();
    await capture('themes');
  }
  await b.close();
}
await writeFile(out + '/screens.json', JSON.stringify({ base, metrics }, null, 2));
