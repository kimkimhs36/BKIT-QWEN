import { test, expect } from '@playwright/test';

test('iOS-first layout keeps navigation separate from actions', async ({page}) => {
  await page.clock.install({time:new Date('2026-10-14T06:00:00Z')});
  await page.goto('./');
  const tabBar=page.getByRole('navigation',{name:'주 메뉴'});
  await expect(tabBar).toBeVisible();
  await expect(tabBar.getByRole('button')).toHaveCount(5);
  await expect(tabBar.getByRole('button',{name:'과제 추가'})).toHaveCount(0);
  const add=page.locator('.topbar-add-action');
  await expect(add).toHaveAttribute('aria-label','과제 추가');
  await expect(add).toBeVisible();
  const sizes=await page.evaluate(()=>{
    const tabs=[...document.querySelectorAll<HTMLButtonElement>('.orbit-nav button')];
    const top=document.querySelector<HTMLElement>('.topbar-add-action')!;
    const paper=document.querySelector<HTMLElement>('.now-focus.now-action')!;
    return {
      tabHeights:tabs.map(x=>x.getBoundingClientRect().height),
      tabNames:tabs.map(x=>x.innerText),
      actionHeight:top.getBoundingClientRect().height,
      paperBlur:getComputedStyle(paper).backdropFilter,
      navBlur:getComputedStyle(document.querySelector('.orbit-nav')!).backdropFilter,
      overflow:document.documentElement.scrollWidth > innerWidth+1,
    };
  });
  expect(sizes.tabHeights.every(v=>v>=44)).toBe(true);
  expect(sizes.actionHeight).toBeGreaterThanOrEqual(44);
  expect(sizes.paperBlur).toBe('none');
  expect(sizes.navBlur).not.toBe('none');
  expect(sizes.overflow).toBe(false);
  await add.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading',{name:'무엇부터 해야 할까요?'})).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'닫기'}).click();
  await tabBar.getByRole('button',{name:'시간표'}).click();
  await expect(tabBar.getByRole('button',{name:'시간표'})).toHaveAttribute('aria-current','page');
});
