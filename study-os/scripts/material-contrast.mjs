import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 664 }, reducedMotion: 'reduce' });
const p = await c.newPage();
await p.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
await p.goto(process.argv[2] || 'http://127.0.0.1:4173/');
const results = [];
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
  const a = await new AxeBuilder({ page: p })
    .include('.study-home')
    .withRules(['color-contrast'])
    .analyze();
  results.push({
    id,
    violations: a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, message: n.failureSummary })),
    })),
  });
}
await writeFile('docs/material-world-20261023/contrast.json', JSON.stringify(results, null, 2));
await b.close();
if (results.some((x) => x.violations.length)) process.exitCode = 1;
