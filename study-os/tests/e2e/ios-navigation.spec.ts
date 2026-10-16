import { test, expect } from '@playwright/test';
test('iOS navigation is readable and advanced tools remain available below one menu', async ({page}) => {
  await page.clock.install({time:new Date('2026-10-14T06:00:00Z')});
  await page.goto('./');
  const nav=page.getByRole('navigation',{name:'주 메뉴'});
  await expect(nav.getByRole('button')).toHaveCount(5);
  const more=page.getByRole('button',{name:'더 보기'});
  await expect(more).toBeVisible();
  const geometry=await page.evaluate(()=>({
    tabHeights:[...document.querySelectorAll('.orbit-nav button')].map(e=>e.getBoundingClientRect().height),
    menuHeight:document.querySelector('.home-tools-button')!.getBoundingClientRect().height,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
  }));
  expect(geometry.tabHeights.every(h=>h>=44)).toBe(true);
  expect(geometry.menuHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.overflow).toBe(false);
  await more.click();
  await page.getByRole('button',{name:'빠른 한 줄 입력'}).click();
  await expect(page.getByRole('dialog').getByRole('heading',{name:'무엇부터 해야 할까요?'})).toBeVisible();
  await page.getByRole('button',{name:'닫기'}).click();
  await nav.getByRole('button',{name:'시간표'}).click();
  await expect(nav.getByRole('button',{name:'시간표'})).toHaveAttribute('aria-current','page');
});
