import { chromium, devices } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const out = [];
for (const [device, opts] of [
  ['iphone', devices['iPhone 13']],
  ['desktop', { viewport: { width: 1440, height: 1000 } }],
]) {
  const c = await b.newContext({ ...opts, serviceWorkers: 'block' });
  const p = await c.newPage();
  await c.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
  await p.goto('https://teambkit.com/', { waitUntil: 'networkidle' });
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
    await p.getByRole('button', { name: '테마 선택', exact: true }).click();
    await p.locator(`[data-swatch="${id}"]`).click();
    await p.getByRole('button', { name: '닫기', exact: true }).click();
    await p.waitForTimeout(1000);
    await p.screenshot({
      path: `docs/material-world-20261023/before/${device}-${id}.png`,
      animations: 'disabled',
    });
    await p.waitForTimeout(1000);
    out.push(
      await p.evaluate(
        ({ device, id }) => ({
          device,
          id,
          els: Object.fromEntries(
            [
              'html',
              'body',
              '#root',
              '.app-shell',
              '.topbar',
              '.theme-scenery',
              '.study-start',
              '.study-agenda',
            ].map((s) => {
              const e = document.querySelector(s);
              if (!e) return [s, null];
              const c = getComputedStyle(e),
                r = e.getBoundingClientRect();
              return [
                s,
                {
                  bg: c.background,
                  color: c.color,
                  filter: c.backdropFilter,
                  rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                },
              ];
            }),
          ),
          themeColor: document.querySelector('meta[name="theme-color"]')?.content,
        }),
        { device, id },
      ),
    );
  }
  await c.close();
}
await writeFile('docs/material-world-20261023/before/computed.json', JSON.stringify(out, null, 2));
await b.close();
