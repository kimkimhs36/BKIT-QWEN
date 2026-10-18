import { test, expect } from '@playwright/test';

test('the same three-line button opens and closes tools on phone and tablet', async ({ page }) => {
  await page.goto('./');
  const toggle = page.getByRole('button', { name: '더 보기' });
  const menu = page.locator('dialog.tools-dialog');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.getByRole('button',{name:'빠른 한 줄 입력'})).toBeVisible();

  // A real non-modal menu lets the trigger receive another pointer click.
  await toggle.click();
  await expect(menu).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  await toggle.click();
  await page.locator('.v2-brand').click();
  await expect(menu).toHaveCount(0);

  await toggle.click();
  await menu.getByRole('button',{name:'빠른 한 줄 입력'}).click();
  await expect(page.getByRole('heading',{name:'무엇부터 해야 할까요?'})).toBeVisible();
});

test('iPad settings controls remain separated when the tool menu is closed', async ({page}) => {
  await page.setViewportSize({width:1024,height:768});
  await page.goto('./');
  await page.getByRole('button',{name:'더 보기'}).click();
  await page.getByRole('button',{name:'설정 열기'}).click();
  await expect(page.getByRole('heading',{name:'생활 리듬'})).toBeVisible();
  const geometry = await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.settings-layout .form-grid .field input')];
    const rects=nodes.map(n=>n.getBoundingClientRect());
    const horizontallyOverlap = (a:DOMRect,b:DOMRect)=>a.left<b.right-2 && a.right>b.left+2;
    return {
      colCount:getComputedStyle(document.querySelector('.settings-layout .form-grid')!).gridTemplateColumns.split(' ').length,
      intersects:rects.some((a,i)=>rects.slice(i+1).some(b=>horizontallyOverlap(a,b) &&
        a.top<b.bottom-2 && a.bottom>b.top+2)),
      overflows:document.documentElement.scrollWidth>innerWidth+2,
    };
  });
  expect(geometry).toEqual({colCount:1,intersects:false,overflows:false});
});
