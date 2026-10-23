import { test, expect, type Page } from './local-fixture';
import { materials } from '../../src/themes/material';
import { readFile, mkdir } from 'node:fs/promises';
const qa = 'docs/material-world-20261023/verified';
const before = JSON.parse(
  await readFile('docs/material-world-20261023/before/computed.json', 'utf8'),
);
async function boot(page: Page) {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      status: 503,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: '{"error":"offline theme QA"}',
    }),
  );
  await page.goto('./');
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function choose(page: Page, id: string) {
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.locator(`[data-swatch="${id}"]`).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
}
async function nav(page: Page, name: string) {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
}
for (const m of materials)
  test(`${m.id}: preserved home, material surface, screens, rotation and reload`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await boot(page);
    await choose(page, m.id);
    const dir = `${qa}/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    const metrics = await page.evaluate(() => {
      const c = getComputedStyle(document.documentElement),
        hero = document.querySelector('.study-start')!,
        r = hero.getBoundingClientRect();
      return {
        topbar: getComputedStyle(document.querySelector('.topbar')!).backgroundColor,
        html: c.backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        bg: c.getPropertyValue('--mat-bg').trim(),
        theme: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
        hero: { x: r.x, y: r.y, width: r.width, height: r.height },
        finish: getComputedStyle(hero).backgroundImage,
        edge: getComputedStyle(hero, '::after').backgroundImage,
        font: getComputedStyle(document.querySelector('.study-start h2')!).fontFamily,
      };
    });
    expect(metrics.topbar).toBe('rgba(0, 0, 0, 0)');
    expect(metrics.body).toBe(metrics.html);
    expect(metrics.theme).toBe(metrics.bg);
    expect(metrics.finish).not.toBe('none');
    expect(metrics.edge).not.toBe('none');
    expect(metrics.font).toContain('BKIT Pretendard');
    const baseline = before.find(
      (x: any) =>
        x.id === m.id && x.device === (info.project.name === 'desktop' ? 'desktop' : 'iphone'),
    );
    if (info.project.name === 'desktop' || info.project.name === 'webkit-iphone') {
      const rect = baseline.els['.study-start'].rect;
      expect(Math.abs(metrics.hero.y - rect.y)).toBeLessThanOrEqual(4);
      expect(metrics.hero.x).toBe(rect.x);
      expect(metrics.hero.width).toBe(rect.width);
    }
    await page.screenshot({ path: `${dir}/${m.id}-home.png`, animations: 'disabled' });
    // Actual passive pointer contact produces a material-specific rendered animation.
    await page.mouse.click(4, Math.min(500, page.viewportSize()!.height - 150));
    const pulse = page.locator('.material-touch').last();
    await expect(pulse).toHaveAttribute('data-touch', m.id);
    const animation = await pulse.evaluate((e) => getComputedStyle(e).animationName);
    expect(animation).toBe(
      (
        {
          classic: 'material-sun',
          forest: 'material-forest',
          glass: 'material-glass',
          peach: 'material-satin',
          diamond: 'material-prism',
          gold: 'material-metal',
          jelly: 'material-jelly',
          droplets: 'material-water',
          night: 'material-console',
        } as Record<string, string>
      )[m.id],
    );
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${dir}/${m.id}-touch.png` });
    for (const [label, id] of [
      ['집중', 'focus'],
      ['과제', 'tasks'],
      ['기록', 'records'],
      ['도구', 'tools'],
    ]) {
      await nav(page, label);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        .toBe(true);
      await page.screenshot({ path: `${dir}/${m.id}-${id}.png`, animations: 'disabled' });
    }
    await page.getByRole('button', { name: '설정', exact: true }).click();
    await page.screenshot({ path: `${dir}/${m.id}-settings.png`, animations: 'disabled' });
    await page.getByRole('button', { name: '테마 선택', exact: true }).click();
    await page.screenshot({ path: `${dir}/${m.id}-picker.png`, animations: 'disabled' });
    await page.getByRole('combobox', { name: '테마 움직임' }).selectOption('reduced');
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
    await page.getByRole('combobox', { name: '테마 움직임' }).selectOption('auto');
    await page.getByRole('switch', { name: '배터리 절약' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-material', m.id);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await page.emulateMedia({
      reducedMotion: 'reduce',
      colorScheme: m.base === 'dark' ? 'dark' : 'light',
    });
    await page.getByRole('button', { name: '테마 선택', exact: true }).click();
    await page.getByRole('switch', { name: '배터리 절약' }).uncheck();
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.evaluate(() => scrollTo(0, 1000));
    await page.evaluate(() => scrollTo(0, 0));
    expect(await page.locator('.topbar').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      'rgba(0, 0, 0, 0)',
    );
    expect(errors).toEqual([]);
  });
test('simulated gyro: permission is not input; invalid, calibration, stale, rotation and OFF are honest', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let requests = 0;
    Object.defineProperty(window.DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => {
        (window as any).__requests = ++requests;
        return Promise.resolve('granted');
      },
    });
  });
  await boot(page);
  await choose(page, 'diamond');
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: '센서 연결', exact: true }).click();
  const control = page.locator('.material-sensor-control');
  await expect(control).toContainText('센서 대기 중');
  const tilt = (beta: number | null, gamma: number | null) =>
    page.evaluate(
      ({ beta, gamma }) => {
        const e = new Event('deviceorientation');
        Object.defineProperties(e, { beta: { value: beta }, gamma: { value: gamma } });
        dispatchEvent(e);
      },
      { beta, gamma },
    );
  await tilt(null, null);
  await expect(control).toContainText('미수신');
  await tilt(30, 0);
  await expect(control).toContainText('센서값 수신 중');
  await tilt(45, 22);
  await expect(control).toContainText('반응 활성화');
  await expect
    .poll(() =>
      page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--sensor-x'))),
    )
    .toBeGreaterThan(0.1);
  await page.getByRole('button', { name: '현재 자세로 보정' }).click();
  await expect(control).toContainText('센서 대기 중');
  await tilt(45, 22);
  await tilt(45, 22);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(Number(document.documentElement.style.getPropertyValue('--sensor-x'))),
      ),
    )
    .toBeLessThan(0.05);
  await page.evaluate(() => dispatchEvent(new Event('orientationchange')));
  await tilt(45, 22);
  await tilt(35, 10);
  await expect(control).toContainText('반응 활성화');
  await page.waitForTimeout(3500);
  await expect(control).toContainText('센서 대기 중');
  await page.getByRole('switch', { name: '배터리 절약' }).check();
  await expect(control).toContainText('절전으로 일시중지');
  await page.getByRole('button', { name: '센서 끄기', exact: true }).click();
  await expect(control).toContainText('비활성화');
});
test('unsupported sensors retain touch and reduced motion removes animation', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      configurable: true,
      value: undefined,
    }),
  );
  await boot(page);
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: '센서 연결', exact: true }).click();
  await expect(page.locator('.material-sensor-control')).toContainText('지원되지 않음');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.click(4, 400);
  await expect(page.locator('.material-touch')).toHaveCount(0);
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await expect(page.locator('.quick-timer-active')).toBeVisible();
});
