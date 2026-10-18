import { test, expect } from '@playwright/test';

test('iPad portrait and landscape keep Settings, cloud status and action buttons separated', async ({page}) => {
  for (const width of [768, 820, 1024, 1180, 1366]) {
    await page.setViewportSize({width,height:1100});
    await page.goto('./');
    await page.getByRole('button',{name:'더 보기'}).click();
    const tools=page.locator('.home-tools-list > button').first();
    await expect(tools).toBeVisible();
    const toolText = await tools.locator('span').first().boundingBox();
    const buttonBounds = await tools.boundingBox();
    expect(toolText!.width).toBeGreaterThan(180);
    expect(toolText!.height).toBeLessThan(44);
    expect(buttonBounds!.height).toBeLessThan(100);
    await page.getByRole('button',{name:'설정 열기'}).click();
    await expect(page.getByRole('heading',{name:'생활 리듬'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'BKIT Private Cloud'})).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const result = await page.evaluate(()=>{
      const box=(selector:string)=>{
        const el=document.querySelector(selector);
        if(!el) throw new Error('Missing layout selector '+selector);
        return el.getBoundingClientRect();
      };
      const children = [...document.querySelectorAll('.settings-layout > *')].map(el=>el.getBoundingClientRect());
      const intersects=(a:DOMRect,b:DOMRect)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2 &&
        Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
      const cloud=box('.bkit-cloud-panel');
      const title=box('.bkit-cloud-panel .section-head h2');
      const status=box('.bkit-cloud-panel .bkit-cloud-state');
      const firstField=box('.settings-layout .field input');
      const timeInputs=[...document.querySelectorAll('.settings-layout .form-grid input[type="time"]')].map(el=>el.getBoundingClientRect());
      const allInputs=[...document.querySelectorAll('.settings-layout .form-grid input')].map(el=>el.getBoundingClientRect());
      const nav=box('.tablet-primary-nav');
      const phoneNav=document.querySelector('body > .orbit-nav')!;
      const heading=box('.page-head');
      const firstButton=box('.bkit-cloud-panel .button-stack > button');
      const section=box('.settings-layout');
      const viewportOverflow=document.documentElement.scrollWidth>innerWidth+2;
      return {
        overlapsColumns:intersects(children[0],children[1]),
        overlapsHeader:intersects(title,status),
        cloudClipped: cloud.left<0 || cloud.right>innerWidth+2,
        fieldClipped:firstField.left<section.left-2 || firstField.right>section.right+2,
        buttonClipped:firstButton.left<cloud.left-2 || firstButton.right>cloud.right+2,
        formInputsOverlap: allInputs.some((a,i)=>allInputs.slice(i+1).some(b=>intersects(a,b))),
        clockInputsOverlap: timeInputs.some((a,i)=>timeInputs.slice(i+1).some(b=>intersects(a,b))),
        navOverHeading:intersects(nav,heading),
        navAfterHeading:nav.bottom>heading.top,
        phoneNavVisible:getComputedStyle(phoneNav).display!=='none',
        viewportOverflow,
      };
    });
    expect(result, 'width='+width).toEqual({
      overlapsColumns:false,overlapsHeader:false,cloudClipped:false,
      fieldClipped:false,buttonClipped:false,formInputsOverlap:false,
      clockInputsOverlap:false,navOverHeading:false,navAfterHeading:false,
      phoneNavVisible:false,viewportOverflow:false,
    });
  }
});
