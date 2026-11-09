import { test, expect } from './local-fixture';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('the real premium home has one material-aware start card and a working five-minute route', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T13:00:00+09:00') });
  await page.goto('./');

  const backgrounds: string[] = [];
  for (const material of ['classic', 'jelly', 'glass'] as const) {
    await page.evaluate((id) => {
      localStorage.setItem('bkit.material.v1', JSON.stringify({
        id, motion: 'reduced', intensity: 0.5, lowPower: false,
      }));
    }, material);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-material', material);

    const action = page.getByRole('region', { name: '지금 할 일 한 가지' });
    await expect(action).toHaveClass(/study-start/);
    await expect(action).toHaveAttribute('data-home-action', 'study');
    await expect(page.locator('.study-home .study-start')).toHaveCount(1);
    await expect(action.getByRole('button', { name: '10분 집중 시작' })).toBeVisible();
    await expect(action.getByRole('button', { name: '5분만 시작하기' })).toBeVisible();
    await expect(action.getByRole('button', { name: '수면 루틴' })).toBeVisible();
    backgrounds.push(await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.backgroundImage + '/' + style.backgroundColor;
    }));
  }

  // The original 9-material theme engine, not a hard-coded navy card, owns the home surface.
  expect(new Set(backgrounds).size).toBeGreaterThan(1);

  await page.getByRole('region', { name: '지금 할 일 한 가지' })
    .getByRole('button', { name: '5분만 시작하기' }).click();
  await expect(page.getByRole('region', { name: '바로 시작 타이머' })).toBeVisible();
  await expect(page.getByText('목표 5분 · 끝난 뒤 기록하기')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('region', { name: '지금 할 일 한 가지' })).toHaveAttribute('data-home-action', 'resume');
  await expect(page.getByRole('group', { name: '진행 중인 빠른 집중 관리' })).toBeVisible();
  await expect(page.locator('.study-home .study-start')).toHaveCount(1);
});
