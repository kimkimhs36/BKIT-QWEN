import {webkit,devices} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const phase=process.argv[2]||'before',base=process.env.BKIT_CAPTURE_URL||'https://teambkit.com/';
const browser=await webkit.launch();const metrics=[];
for(const [name,device] of [['iphone',devices['iPhone 13']],['ipad',devices['iPad Pro 11']],['ipad-landscape',devices['iPad Pro 11 landscape']]]){
 const context=await browser.newContext({...device,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 const page=await context.newPage();await page.goto(base);await page.getByRole('button',{name:'지금 공부 시작',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
 const release=await page.evaluate(()=>fetch('/release.json',{cache:'no-store'}).then(r=>r.json()));
 const dir=`docs/daily-driver-20261025/${phase}/${name}`;await mkdir(dir,{recursive:true});
 for(const id of ['classic','forest','glass','peach','diamond','gold','jelly','droplets','night']){
  await page.getByRole('button',{name:'테마 선택',exact:true}).click();await page.locator(`[data-swatch="${id}"]`).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.screenshot({path:`${dir}/${id}-home.png`,animations:'disabled'});
  metrics.push({phase,name,id,sourceCommit:release.sourceCommit,reducedMotion:true,...await page.evaluate(()=>({html:getComputedStyle(document.documentElement).backgroundColor,body:getComputedStyle(document.body).backgroundColor,header:getComputedStyle(document.querySelector('.topbar')).backgroundColor,border:getComputedStyle(document.querySelector('.topbar')).borderBottomWidth,shadow:getComputedStyle(document.querySelector('.topbar')).boxShadow,theme:document.querySelector('meta[name="theme-color"]').content,overflow:document.documentElement.scrollWidth>innerWidth}))});
 }
 await context.close();
}await writeFile(`docs/daily-driver-20261025/${phase}/theme-metrics.json`,JSON.stringify(metrics,null,2)+'\n');await browser.close();console.log(`${phase}: ${metrics.length} screenshots`);
