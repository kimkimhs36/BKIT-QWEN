import {chromium, devices} from '@playwright/test';
import {writeFile, mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
for (const [version,url] of [['before','https://teambkit.com/'],['after',process.env.BKIT_MEASURE_URL||'http://127.0.0.1:4173/study-os/']]) {
 for (const [device,options] of [['iphone',devices['iPhone 13']],['ipad',devices['iPad Pro 11']],['desktop',{viewport:{width:1440,height:1000}}]]) {
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
  await context.addInitScript(()=>{
   localStorage.setItem('bkit.material.v1',JSON.stringify({id:'glass',motion:'auto',intensity:1,lowPower:false}));
   window.__draws=0;window.__contexts=0;
   const get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(...args){if(args[0]==='webgl')window.__contexts++;return get.apply(this,args);};
   const draw=WebGLRenderingContext.prototype.drawArrays;
   WebGLRenderingContext.prototype.drawArrays=function(...args){window.__draws++;return draw.apply(this,args);};
  });
  const page=await context.newPage();await page.goto(url);await page.getByRole('button',{name:'지금 공부 시작',exact:true}).waitFor();
  await page.waitForTimeout(2000);
  const initial=await page.evaluate(()=>window.__draws);await page.waitForTimeout(1500);
  const idle=await page.evaluate(initial=>({draws:window.__draws-initial,contexts:window.__contexts,coarse:matchMedia('(pointer:coarse)').matches,canvas:[...document.querySelectorAll('.surreal-surface')].map(c=>({width:c.width,height:c.height,ready:c.dataset.ready||false}))}),initial);
  await page.getByRole('button',{name:'5분만 시작하기',exact:true}).click();await page.waitForTimeout(2000);
  const started=await page.evaluate(()=>window.__draws);await page.waitForTimeout(1500);
  const studyingDraws=await page.evaluate(n=>window.__draws-n,started);
  results.push({version,device,sampleMs:1500,idle,studyingDraws});
  await context.close();
 }
}
await mkdir('docs/daily-driver-20261025',{recursive:true});
await writeFile('docs/daily-driver-20261025/performance.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));await browser.close();
