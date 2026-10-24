import {chromium,webkit,devices,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const base=process.argv[2],out=process.argv[3],result=[];
for(const profile of ['desktop','webkit-iphone','webkit-ipad']){
 const b=await(profile==='desktop'?chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}):webkit.launch());
 const c=await b.newContext({...profile==='desktop'?{viewport:{width:1440,height:1000}}:devices[profile==='webkit-iphone'?'iPhone 13':'iPad Pro 11'],serviceWorkers:'block'});
 await c.addInitScript(()=>{localStorage.setItem('bkit.atelier.visited.v1','1');window.__sensorPermission='denied';window.__sensorRequests=0;Object.defineProperty(DeviceOrientationEvent,'requestPermission',{configurable:true,value:()=>{window.__sensorRequests++;return Promise.resolve(window.__sensorPermission)}})});
 const p=await c.newPage();await p.goto(base,{waitUntil:'networkidle'});await p.getByRole('button',{name:'테마 선택',exact:true}).click();
 const control=p.locator('.material-sensor-control');expect(await p.evaluate(()=>window.__sensorRequests)).toBe(0);
 await p.getByRole('button',{name:'센서 연결',exact:true}).click();await expect(control).toContainText('권한 거부');
 await p.evaluate(()=>window.__sensorPermission='granted');await p.getByRole('button',{name:'센서 연결',exact:true}).click();await expect(control).toContainText('센서 대기 중');await p.waitForTimeout(2800);await expect(control).toContainText('미수신');
 await p.getByRole('combobox',{name:'테마 움직임'}).selectOption('reduced');await expect(control).toContainText('모션 감소로 일시중지');
 await p.getByRole('combobox',{name:'테마 움직임'}).selectOption('auto');await expect(control).toContainText('센서 대기 중');
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await expect(control).toContainText('비활성화');
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));const e=new Event('deviceorientation');Object.defineProperties(e,{beta:{value:30},gamma:{value:20}});dispatchEvent(e)});await expect(control).toContainText('비활성화');
 result.push({profile,permissionOnlyFromTap:true,denial:true,grantedWithoutInputStaysWaiting:true,reducedPauses:true,hiddenTurnsOff:true,visibleDoesNotReconnect:true,scope:'Injected permission and orientation/visibility state; not physical sensor'});await b.close();
}
await writeFile(out,JSON.stringify({base,result},null,2));
