import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
const out = [];
try {
  for (const [stage, url] of [
    ['before', process.env.BKIT_BASELINE_URL || 'http://127.0.0.1:4174/study-os/'],
    ['after', process.env.BKIT_REVIEW_URL || 'http://127.0.0.1:4175/study-os/'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(url).origin
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('bkit.atelier.visited.v1', '1');
      localStorage.setItem(
        'bkit.material.v1',
        JSON.stringify({ id: 'peach', motion: 'off', intensity: 0.5, lowPower: true }),
      );
    });
    await page.goto(url);
    await page.getByRole('button', { name: '지금 공부 시작', exact: true }).waitFor();
    for (const mode of ['idle', 'studying']) {
      if (mode === 'studying')
        await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
      await page.evaluate(() => {
        window.__learningRuntime = { longTasks: [], mutations: 0 };
        window.__learningObserver = new PerformanceObserver((list) =>
          window.__learningRuntime.longTasks.push(...list.getEntries().map((e) => e.duration)),
        );
        window.__learningObserver.observe({ type: 'longtask', buffered: false });
        window.__learningMutations = new MutationObserver(
          (list) => (window.__learningRuntime.mutations += list.length),
        );
        window.__learningMutations.observe(document.querySelector('main'), {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        });
      });
      await page.waitForTimeout(5200);
      const data = await page.evaluate(() => {
        window.__learningObserver.disconnect();
        window.__learningMutations.disconnect();
        return window.__learningRuntime;
      });
      out.push({ stage, mode, windowMs: 5200, ...data, errors });
    }
    await context.close();
  }
  await writeFile(
    new URL('../artifacts/learning-continuity/runtime.json', import.meta.url),
    JSON.stringify(out, null, 2),
  );
} finally {
  await browser.close();
}
