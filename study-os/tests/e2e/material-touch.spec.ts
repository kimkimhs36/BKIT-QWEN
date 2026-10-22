import { test, expect } from './local-fixture';
import { materials } from '../../src/themes/material';

test('nine materials have distinct bounded touch atmospheres and no logo rectangle', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  const initial = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  const signatures = new Set<string>();
  for (const material of materials) {
    await page.getByRole('button', { name: 'BKIT 로고 · 테마 선택' }).click();
    await page.getByRole('button', { name: material.name, exact: true }).click();
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', material.id);
    for (const selector of ['.topbar', '.topbar-leading', '.brand-theme-button']) {
      await expect(page.locator(selector)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(page.locator(selector)).toHaveCSS('background-image', 'none');
      await expect(page.locator(selector)).toHaveCSS('box-shadow', 'none');
    }
    const hero = page.locator('.rebirth-hero');
    const before = (await hero.boundingBox())!;
    await page.mouse.click(page.viewportSize()!.width / 2, before.y - 7);
    const pulse = page.locator('.material-touch-pulse[data-live]');
    await expect(pulse).toHaveCount(1);
    await expect(pulse).toHaveAttribute('data-live', material.id);
    // Freeze a real Web Animation at its representative frame; software GPUs
    // can spend a whole short ripple compiling the existing glass renderer.
    await pulse.evaluate((node) => {
      const animation = node.getAnimations()[0];
      animation.pause();
      animation.currentTime = Number(animation.effect!.getTiming().duration) * 0.25;
    });
    const signature = await pulse.evaluate((node) => {
      const opacity = Number(getComputedStyle(node).opacity);
      const geometry = Array.from(node.children)
        .map((child) => {
          const style = getComputedStyle(child);
          return [style.backgroundImage, style.border, style.clipPath, style.boxShadow].join('|');
        })
        .join(';');
      return { opacity, geometry };
    });
    expect(signature.opacity).toBeGreaterThan(0);
    signatures.add(signature.geometry);
    const after = (await hero.boundingBox())!;
    expect(after).toEqual(before);
    expect(
      await page
        .locator('.material-touch-field')
        .evaluate((node) => getComputedStyle(node).pointerEvents),
    ).toBe('none');
    await page.screenshot({
      path: info.outputPath(`touch-${material.id}.png`),
      animations: 'allow',
    });
    await pulse.evaluate((node) => node.getAnimations()[0].play());
    await expect(pulse).toHaveCount(0, { timeout: 5000 });
    expect(await page.locator('.material-touch-pulse').count()).toBe(3);
  }
  expect(signatures.size).toBe(9);
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(initial);
});

test('touch atmosphere honors OS, saved motion, low power and active study', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  for (const prefs of [
    { motion: 'off', lowPower: false },
    { motion: 'reduced', lowPower: false },
    { motion: 'auto', lowPower: true },
    { motion: 'auto', lowPower: false },
  ]) {
    await page.evaluate(
      (prefs) =>
        localStorage.setItem(
          'bkit.material.v1',
          JSON.stringify({ id: 'glass', intensity: 0.5, ...prefs }),
        ),
      prefs,
    );
    await page.reload();
    if (prefs.motion === 'auto' && !prefs.lowPower)
      await page.emulateMedia({ reducedMotion: 'reduce' });
    const hero = (await page.locator('.rebirth-hero').boundingBox())!;
    await page.mouse.click(page.viewportSize()!.width / 2, hero.y - 7);
    await expect(page.locator('.material-touch-pulse[data-live]')).toHaveCount(0);
    await expect(page.locator('.material-touch-field')).toBeHidden();
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  const hero = (await page.locator('.rebirth-hero').boundingBox())!;
  await page.mouse.click(page.viewportSize()!.width / 2, hero.y - 7);
  await expect(page.locator('.material-touch-pulse[data-live]')).toHaveCount(0);
  await expect(page.locator('.material-touch-field')).toBeHidden();
});

test('quiet preferences avoid even allocating the hidden WebGL background', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as any).bkitTestGLContexts = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) {
      if (String(args[0]).includes('webgl')) (window as any).bkitTestGLContexts++;
      return (getContext as any).apply(this, args);
    } as typeof getContext;
  });
  await page.goto('./');
  await page.getByRole('heading', { name: '오늘의 공부', exact: true }).waitFor();
  expect(await page.evaluate(() => (window as any).bkitTestGLContexts)).toBe(0);
  await expect(page.locator('.surreal-surface')).toHaveCSS('opacity', '0');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() => page.evaluate(() => (window as any).bkitTestGLContexts))
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.surreal-surface')).toHaveCSS('opacity', '0');
});
