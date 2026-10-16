import { test, expect } from '@playwright/test';
test('2026 research NOW: small fixed event, first action and quick capture before details', async ({page})=>{
  await page.clock.install({time:new Date('2026-10-14T06:00:00Z')});
  await page.goto('./');
  const upcoming=page.getByRole('button',{name:'다음 고정 일정 확인'});
  const start=page.getByRole('button',{name:'5분만 시작'});
  const quick=page.locator('.research-quick-capture');
  await expect(upcoming).toBeVisible();
  await expect(start).toBeVisible();
  await expect(quick).toBeVisible();
  await expect(page.locator('.today-more')).not.toHaveAttribute('open');
  const details=await page.evaluate(()=>{
    const a=document.querySelector<HTMLElement>('.research-next-context')!;
    const b=document.querySelector<HTMLElement>('.now-focus')!;
    const c=document.querySelector<HTMLElement>('.research-quick-capture')!;
    const d=document.querySelector<HTMLElement>('.today-more')!;
    return {
      order:!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(b.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(c.compareDocumentPosition(d)&Node.DOCUMENT_POSITION_FOLLOWING),
      target:c.getBoundingClientRect().height,
      overflow:document.documentElement.scrollWidth>innerWidth+1
    };
  });
  expect(details.order).toBe(true);
  expect(details.target).toBeGreaterThanOrEqual(44);
  expect(details.overflow).toBe(false);
  await quick.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('오늘 해야 할 일')).toBeVisible();
});
