import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { materials } from '../src/themes/material';
import { writeFile } from 'node:fs/promises';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await b.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
await page.goto('http://127.0.0.1:4173/');
const results = [];
for (const theme of materials) {
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: theme.name, exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).waitFor();
  const a = await new AxeBuilder({ page })
    .include('.study-home')
    .withRules(['color-contrast'])
    .analyze();
  results.push({
    theme: theme.id,
    persisted: await page.locator('html').getAttribute('data-material'),
    motion: await page.locator('html').getAttribute('data-motion'),
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    violations: a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
}
await writeFile('/workspace/evidence/themes.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
await b.close();
