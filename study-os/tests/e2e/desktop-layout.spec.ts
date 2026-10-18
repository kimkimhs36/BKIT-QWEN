import { test, expect } from './local-fixture';

test('desktop TODAY centers its content and quick-entry label stays horizontal', async ({ page }) => {
  for (const width of [1440, 1050]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await expect(page.getByRole('heading', {name:'오늘',exact:true})).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const home = await page.locator('.app-shell.page-today main').boundingBox();
    expect(home).toBeTruthy();
    expect(Math.abs(home!.x + home!.width / 2 - width / 2)).toBeLessThan(15);

    await page.getByRole('button', {name:'더 보기'}).click();
    await expect(page.getByRole('heading', {name:'도구와 설정'})).toBeVisible();
    const quick = page.locator('.home-tools-list > button').first();
    await expect(quick).toBeVisible();
    const geometry = await quick.evaluate((button) => {
      const label = button.querySelector('span')!;
      const rect = button.getBoundingClientRect();
      const textRect = label.getBoundingClientRect();
      return {
        buttonWidth: rect.width,
        buttonHeight: rect.height,
        labelWidth: textRect.width,
        labelHeight: textRect.height,
        labelText: label.textContent?.trim(),
        overflowing: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(geometry.buttonWidth).toBeGreaterThan(400);
    expect(geometry.labelWidth).toBeGreaterThan(200);
    expect(geometry.labelHeight).toBeLessThan(38);
    expect(geometry.buttonHeight).toBeLessThan(90);
    expect(geometry.labelText).toBe('빠른 한 줄 입력');
    expect(geometry.overflowing).toBe(false);

    await quick.click();
    await expect(page.getByRole('heading', {name:'무엇부터 해야 할까요?'})).toBeVisible();
  }
});
