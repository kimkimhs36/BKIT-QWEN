import { test, expect } from '@playwright/test';

test('plain mobile controls stay readable and focus starts', async ({page}) => {
  await page.clock.install({time:new Date('2026-10-14T06:00:00Z')});
  await page.goto('./');
  const dock = page.locator('.orbit-nav');
  const primary = page.getByRole('button', {name: '5분만 시작'});
  await expect(dock).toBeVisible();
  await expect(primary).toBeVisible();
  await expect(page.locator('#bkit-liquid-dock')).toHaveCount(1);
  await expect(page.locator('#bkit-liquid-panel')).toHaveCount(1);
  const detail=await page.evaluate(()=>{
    const root=document.documentElement;
    const dock=document.querySelector<HTMLElement>('.orbit-nav')!;
    const card=document.querySelector<HTMLElement>('.now-focus')!;
    const button=document.querySelector<HTMLElement>('.now-focus-primary')!;
    const lens=document.querySelector<SVGFEImageElement>('#bkit-liquid-dock feImage');
    return {
      engine:root.dataset.bkitGlassEngine,
      map: lens?.getAttribute('href')?.startsWith('data:image/png') || false,
      buttonColor:getComputedStyle(button).color,
      radius:parseFloat(getComputedStyle(dock).borderRadius),
      cardRadius:parseFloat(getComputedStyle(document.querySelector('.command-stage')!).borderRadius),
      width:document.documentElement.scrollWidth,
      screen:innerWidth,
      blurred:getComputedStyle(dock).backdropFilter,
      opticalOverlay:getComputedStyle(dock,'::before').display,
    };
  });
  expect(detail.engine).toBeTruthy();
  expect(detail.map).toBe(true);
  expect(detail.buttonColor).toBe('rgb(255, 255, 255)');
  expect(detail.radius).toBeGreaterThanOrEqual(20);
  expect(detail.cardRadius).toBeGreaterThanOrEqual(18);
  expect(detail.width).toBeLessThanOrEqual(detail.screen+1);
  expect(detail.blurred).not.toBe('none');
  expect(detail.opticalOverlay).toBe('none');
  await primary.click();
  await expect(page.locator('.app-shell')).toHaveClass(/is-focusing/);
  await expect(page.locator('.focus-readout .timer')).toBeVisible();
  await expect(page.getByRole('button',{name:'지금 UI 숨기기'})).toBeVisible();
});
