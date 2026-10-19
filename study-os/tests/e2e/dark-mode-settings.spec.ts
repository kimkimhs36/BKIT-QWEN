import { test, expect } from './local-fixture';

test('header moon switches complete night palette without changing study history', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme', 'light');
  const oldRecord = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  const toggle = page.locator('.home-top-tools .theme-toggle');
  await expect(toggle).toHaveAttribute('aria-label', '다크모드로 전환');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 27, 23)');
  const newRecord = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  expect(newRecord).toEqual(oldRecord);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme', 'dark');
  await expect(page.locator('.home-top-tools .theme-toggle')).toHaveAttribute('aria-label', '라이트모드로 전환');
  await page.locator('.home-top-tools .theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme', 'light');
});

test('settings icon toggles closed when tapped again and settings has a dedicated dark toggle', async ({ page }) => {
  await page.goto('./');
  const menu = page.getByRole('button', { name: '더 보기' });
  await menu.click();
  await expect(page.locator('#bkit-tools-menu')).toBeVisible();
  // The same three-lines button closes its own tools menu.
  await menu.click();
  await expect(page.locator('#bkit-tools-menu')).not.toBeVisible();
  await menu.click();
  await page.getByRole('button', { name: '설정 열기' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-settings/);
  const modePanel = page.getByRole('region', { name: '화면 모드 설정' });
  await modePanel.getByRole('button', { name: '다크모드로 전환' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme','dark');
  await expect(modePanel).toBeVisible();
  const settingsButton=page.locator('.topbar-settings-action');
  await expect(settingsButton).toHaveAttribute('aria-label','설정 닫기');
  await settingsButton.click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-today/);
  await expect(page.locator('.topbar-settings-action')).toHaveCount(0);
  await menu.click();
  await page.getByRole('button',{name:'설정 열기'}).click();
  await expect(modePanel.getByRole('button',{name:'라이트모드로 전환'})).toBeVisible();
});

test('settings top-right button returns to last non-settings screen', async ({ page }) => {
  await page.goto('./');
  // From another app tab, settings should close back to that tab.
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '집중' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-study/);
  const button = page.locator('.topbar-settings-action');
  await button.click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-settings/);
  await button.click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-study/);
});
