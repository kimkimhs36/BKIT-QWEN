import { webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.argv[2], dir=process.argv[3];
await mkdir(dir,{recursive:true});
const browser=await webkit.launch();
try {
  const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'});
  await context.addInitScript(()=>{
    localStorage.setItem('bkit.atelier.visited.v1','1');
    Object.defineProperty(DeviceOrientationEvent,'requestPermission',{configurable:true,value:()=>Promise.resolve('granted')});
  });
  const page=await context.newPage();
  await page.goto(base,{waitUntil:'networkidle'});
  const build=await page.evaluate(()=>fetch(new URL('build-info.json',location.href)).then(r=>r.json()));
  await page.getByRole('button',{name:'테마 선택',exact:true}).click();
  await page.locator('[data-swatch="diamond"]').click();
  await page.waitForTimeout(1000);
  await page.getByRole('button',{name:'센서 연결',exact:true}).click();
  const control=page.locator('.material-sensor-control'),preview=page.locator('.material-sensor-preview');
  await expect(control).toContainText('센서 대기 중');
  const tilt=gamma=>page.evaluate(gamma=>{
    const event=new Event('deviceorientation');
    Object.defineProperties(event,{beta:{value:30},gamma:{value:gamma}});
    dispatchEvent(event);
  },gamma);
  await expect.poll(async()=>{await tilt(0);return control.innerText()},{timeout:15000}).toMatch(/센서값 수신 중|반응 활성화/);
  const light = () => preview.evaluate(e => {
    const style=getComputedStyle(e,'::after');
    return {width:e.getBoundingClientRect().width,left:parseFloat(style.left),top:parseFloat(style.top)};
  });
  const positions=[];
  for(const gamma of [0,22,-22,12]) {
    const previous=positions.at(-1);
    if(previous) await expect.poll(async()=>{
      await tilt(gamma);
      const current=await light();
      return Math.hypot(current.left-previous.left,current.top-previous.top);
    },{timeout:15000}).toBeGreaterThan(3);
    else { await tilt(0); await page.waitForTimeout(200); }
    positions.push(await light());
  }
  const orientationAngle=await page.evaluate(()=>screen.orientation?.angle??window.orientation??0);
  await preview.scrollIntoViewIfNeeded();
  await page.screenshot({path:dir+'/webkit-iphone.png'});
  await page.getByRole('button',{name:'센서 끄기',exact:true}).click();
  await writeFile(dir+'/result.json',JSON.stringify({base,build,scope:'Linux WebKit iPhone profile; injected orientation, not physical hardware',orientationAngle,positions},null,2));
} finally { await browser.close(); }
