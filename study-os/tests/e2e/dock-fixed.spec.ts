import { test, expect } from './local-fixture';
// These scenarios assert the phone dock; browser projects still exercise both engines.
test.use({ viewport: { width: 390, height: 844 } });

test('iPhone dock is visible at the top, middle, and bottom of a long page', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  await expect(nav).toBeVisible();
  await expect(nav).toBeInViewport({ ratio: 1 });

  const before = await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('.orbit-nav')!;
    const r = node.getBoundingClientRect();
    return {
      parent: node.parentElement?.tagName,
      position: getComputedStyle(node).position,
      top: r.top,
      bottomGap: innerHeight - r.bottom,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  expect(before.parent).toBe('BODY');
  expect(before.position).toBe('fixed');
  expect(before.bottomGap).toBeGreaterThanOrEqual(0);
  expect(before.bottomGap).toBeLessThan(90);
  expect(before.horizontalOverflow).toBe(false);

  const details = page.locator('.today-more');
  await details.locator(':scope > summary').click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(60);
  await expect(nav).toBeInViewport({ ratio: 1 });
  const middle = await nav.boundingBox();
  expect(middle).not.toBeNull();
  expect(Math.abs(middle!.y - before.top)).toBeLessThan(3);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(nav).toBeInViewport({ ratio: 1 });
  const bottom = await nav.boundingBox();
  expect(Math.abs(bottom!.y - before.top)).toBeLessThan(3);

  await nav.getByRole('button', { name: '과제' }).click();
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  await expect(nav).toBeInViewport({ ratio: 1 });
  await nav.getByRole('button', { name: '오늘' }).click();
  await expect(nav).toBeInViewport({ ratio: 1 });
});

test('dock intentionally hides only during immersive active focus', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  await expect(nav).toBeVisible();
  await page.getByRole('button', { name: '5분만 시작' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/is-focusing/);
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: '오늘로 · 타이머 유지' }).click();
  await expect(nav).toBeVisible();
  await expect(nav).toBeInViewport({ ratio: 1 });
});
