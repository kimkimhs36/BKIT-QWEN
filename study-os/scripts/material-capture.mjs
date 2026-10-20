/** Small product smoke and actual-render capture; no study storage migrations. */
import { chromium, webkit, devices, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const output = process.env.MATERIAL_CAPTURE_DIR || 'artifacts/material-experience';
await fs.mkdir(output, { recursive: true });
const useWebkit = process.env.MATERIAL_ENGINE !== 'chromium';
const browser = useWebkit
  ? await webkit.launch({ headless: true })
  : await chromium.launch({
      headless: true,
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox'],
    });
const context = await browser.newContext({ ...devices['iPhone 13'] });
const seedPath = process.env.MATERIAL_SEED;
const seed = seedPath ? JSON.parse(await fs.readFile(seedPath, 'utf8')) : null;
await context.addInitScript(
  ({ seed }) => {
    localStorage.setItem('bkit.atelier.visited.v1', '1');
    if (seed && !localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(seed));
  },
  { seed },
);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || e.message));
await page.goto(process.env.MATERIAL_BASE_URL || 'http://127.0.0.1:4173/study-os/', {
  waitUntil: 'networkidle',
});
await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
// Existing top-search failure is checked through the real field and real results.
const search = () => page.getByRole('searchbox', { name: 'BKIT 기능 및 학습 사이트 검색' });
await search().fill('AI ZONE');
await page
  .locator('#bkit-search-results')
  .getByRole('button', { name: /BKIT AI ZONE/ })
  .first()
  .click();
await expect(page.getByRole('region', { name: 'BKIT AI ZONE' })).toBeVisible();
await page.getByRole('searchbox', { name: 'AI 도구 검색' }).fill('NotebookLM');
await expect(page.getByRole('heading', { name: 'NotebookLM', exact: true })).toBeVisible();
await page.screenshot({ path: output + '/ai-zone-iphone.png' });
await search().fill('설정');
await page.locator('#bkit-search-results').getByRole('button', { name: /설정/ }).first().click();
const settings = page.getByRole('region', { name: '재질 테마 설정' });
await expect(settings).toBeVisible();
// Capture the current valid study snapshot, seed a real task once through app UI in a separate flow if needed.
const recordSnapshot = () =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bkit.study-os.v1') || 'null');
    return JSON.stringify(
      s && {
        tasks: s.tasks,
        sessions: s.sessions,
        schedules: s.schedules,
        grades: s.grades,
        settings: s.settings,
      },
    );
  });
const before = await recordSnapshot();
const allThemes = [
  ['classic', 'Classic Light'],
  ['forest', 'Forest Dark'],
  ['glass', 'Liquid Glass'],
  ['peach', 'Peach Flow'],
  ['diamond', 'Diamond'],
  ['gold', 'Champagne Gold'],
  ['jelly', 'Soft Jelly'],
  ['droplets', 'Living Droplets'],
  ['night', 'Night Sprint'],
];
const themes = process.env.MATERIAL_THEMES
  ? allThemes.filter(([id]) => process.env.MATERIAL_THEMES.split(',').includes(id))
  : allThemes;
const checks = [];
for (const [id, name] of themes) {
  const previous = await page.locator('html').getAttribute('data-material');
  await settings.locator(`[data-swatch="${id}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('data-material', previous);
  await expect(settings.getByRole('region', { name: name + ' 미리보기' })).toBeVisible();
  const apply = settings.getByRole('button', { name: /이 재질 적용/ });
  if (await apply.count()) await apply.click();
  await expect(page.locator('html')).toHaveAttribute('data-material', id);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-material', id);
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await page.screenshot({ path: output + '/home-' + id + '-iphone.png' });
  checks.push({
    id,
    persisted: true,
    studyRecordsPreserved: (await recordSnapshot()) === before,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  });
  await search().fill('설정');
  await page.locator('#bkit-search-results').getByRole('button', { name: /설정/ }).first().click();
  if (['glass', 'jelly', 'droplets', 'gold', 'night'].includes(id))
    await settings
      .locator('.material-preview')
      .screenshot({ path: output + '/showroom-' + id + '-iphone.png' });
}
await settings.getByRole('switch', { name: /배터리 절약/ }).check();
await expect(page.locator('html')).toHaveAttribute('data-effects', 'auto');
await settings.getByRole('button', { name: /이 재질 적용/ }).click();
await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
await page.reload();
await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
await search().fill('TOHEŞAR');
await page
  .locator('#bkit-search-results')
  .getByRole('button', { name: /TOHEŞAR/ })
  .first()
  .click();
await expect(page.locator('.garage-showroom')).toBeVisible();
await page.screenshot({ path: output + '/garage-' + themes.at(-1)[0] + '-iphone.png' });
await page.setViewportSize({ width: 834, height: 1194 });
await page.screenshot({ path: output + '/garage-' + themes.at(-1)[0] + '-ipad.png' });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: output + '/garage-' + themes.at(-1)[0] + '-desktop.png' });
await fs.writeFile(
  output + '/smoke.json',
  JSON.stringify({ engine: useWebkit ? 'WebKit' : 'Chromium', checks, errors }, null, 2),
);
console.log(JSON.stringify({ engine: useWebkit ? 'WebKit' : 'Chromium', checks, errors }));
if (errors.length || checks.some((c) => !c.persisted || !c.studyRecordsPreserved || c.overflow))
  throw new Error('Material smoke failed; see smoke.json');
await browser.close();
