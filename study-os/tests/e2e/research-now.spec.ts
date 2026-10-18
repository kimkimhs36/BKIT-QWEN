import { test, expect } from './local-fixture';
test('home shows three clear actions and defers operational details', async ({page}) => {
  await page.clock.install({time:new Date('2026-10-14T06:00:00Z')});
  await page.goto('./');
  const briefing=page.getByRole('button',{name:'오늘 할 일 정리'});
  const materials=page.getByRole('button',{name:'자료 추가'});
  const start=page.getByRole('button',{name:'5분만 시작'});
  for(const control of [briefing,materials,start]) await expect(control).toBeInViewport();
  await expect(page.locator('.today-more')).not.toHaveAttribute('open');
  await expect(page.getByRole('region',{name:'마감 확인'})).toBeHidden();
  await expect(page.getByRole('button',{name:'다음 고정 일정 확인'})).toBeHidden();
  await briefing.click();
  await expect(page.getByLabel('오늘 해야 할 일')).toBeVisible();
});
