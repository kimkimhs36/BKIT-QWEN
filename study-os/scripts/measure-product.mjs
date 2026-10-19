// Local lab comparison, not field Core Web Vitals. Run both built previews first.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const output = process.env.BKIT_METRICS_DIR || 'docs/validation';
await mkdir(output, { recursive: true });
const rows = [];
for (const [label, url] of [
  ['baseline', process.env.BKIT_BASELINE_URL || 'http://127.0.0.1:4174/study-os/'],
  ['current', process.env.BKIT_CURRENT_URL || 'http://127.0.0.1:4175/study-os/'],
]) {
  for (let sample = 0; sample < 3; sample++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(url).origin
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('bkit.atelier.visited.v1', '1');
      window.lab = { lcp: null, cls: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.lab.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.lab.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ animations: 'disabled' });
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        ...window.lab,
        dcl: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        resourceBytes: performance
          .getEntriesByType('resource')
          .reduce((n, r) => n + r.encodedBodySize, 0),
      };
    });
    if (sample === 0) {
      for (const [device, viewport] of [
        ['iphone', { width: 390, height: 844 }],
        ['ipad-landscape', { width: 1194, height: 834 }],
        ['galaxy', { width: 1280, height: 800 }],
        ['desktop', { width: 1440, height: 1000 }],
      ]) {
        await page.setViewportSize(viewport);
        await page.screenshot({
          path: output + '/' + label + '-' + device + '.png',
          animations: 'disabled',
        });
      }
    }
    rows.push({ label, sample: sample + 1, ...metrics });
    await context.close();
  }
}
await browser.close();
await writeFile(
  output + '/lab-metrics.json',
  JSON.stringify(
    {
      environment:
        'Debian 13 / Chromium headless / local Vite preview / cold isolated context / no CPU or network throttling / SW blocked / returning empty learner / 390x844 CSS',
      measuredAt: new Date().toISOString(),
      rows,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(rows, null, 2));
