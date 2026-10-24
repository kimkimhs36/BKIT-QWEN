import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const context=await chromium.launchPersistentContext('/workspace/evidence/upgrade-profile',{
 executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],offline:true,reducedMotion:'reduce',viewport:{width:1440,height:1000}
});
try {
 const page=await context.newPage();
 await page.goto('https://teambkit.com/');
 await expect(page.getByRole('button',{name:'지금 공부 시작',exact:true})).toBeVisible();
 await expect(page.locator('script[type="module"][src]').first()).toHaveAttribute('src','/assets/index-ueiII1hm.js');
 await page.reload();
 await expect(page.getByRole('button',{name:'5분만 시작하기',exact:true})).toBeVisible();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.study-os.v1')));
 const before=JSON.parse(await readFile('/workspace/evidence/before-upgrade.json','utf8'));
 for(const field of ['tasks','schedules','sessions','learning'])expect(state[field]).toEqual(before.state[field]);
 const result=await page.evaluate(()=>({entry:document.querySelector('script[type="module"][src]').getAttribute('src'),controller:navigator.serviceWorker.controller?.scriptURL,material:document.documentElement.dataset.material,background:getComputedStyle(document.body).backgroundColor}));
 await page.screenshot({path:'docs/material-world-20261023/verification/production-pwa-offline.png'});
 await writeFile('docs/material-world-20261023/verification/production-pwa-offline.json',JSON.stringify({scope:'Persistent Chromium profile offline relaunch/reload; not an installed iOS PWA',sourceCommit:'bb79f409bd536bd9196a2f4e61532af728620c72',...result,legacyDataPreserved:true,passed:true},null,2));
 console.log('Production worker offline relaunch and reload passed; exact new entry and old study data retained');
} finally {await context.close()}
