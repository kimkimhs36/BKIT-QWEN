import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';

const root=new URL('../',import.meta.url);
for(const name of ['app.js','questions.js']){
  new Script(readFileSync(new URL(name,root),'utf8'),{filename:name});
}
const bankScript=new Script(readFileSync(new URL('questions.js',root),'utf8'));
const scope={window:{}};
bankScript.runInNewContext(scope);
const bank=scope.window.BKIT_EXAM_QUESTIONS;
assert.equal(bank.length,46);
assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
for(const q of bank){
  assert.equal(q.options.length,5,q.id+' choices');
  assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<5,q.id+' answer');
  assert(q.stem.length>12&&q.why.length>15,q.id+' explanation');
}
console.log('Original 46-question bank schema and standalone JS syntax: PASS');

for(const [label,type,viewport] of [
 ['chrome-iphone',chromium,{width:390,height:844}],
 ['webkit-iphone',webkit,{width:390,height:844}],
 ['webkit-ipad',webkit,{width:820,height:1180}],
 ['chrome-desktop',chromium,{width:1280,height:860}]
]){
 const browser=await type.launch({headless:true});
 const ctx=await browser.newContext({viewport,acceptDownloads:true,permissions:[]});
 const page=await ctx.newPage();
 const errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 await page.goto('http://127.0.0.1:4175/exam-lab/',{waitUntil:'domcontentloaded'});
 assert.match(await page.title(),/BKIT EXAM LAB/);
 assert.equal((await page.locator('#hero-count').innerText()).trim(),'46문항');
 await page.locator('#hero-start').click();
 assert.equal(await page.locator('#question-shell .choices button').count(),5);
 assert.match(await page.locator('#question-shell .question-reading').innerText(),/A school/);
 await page.locator('#hint-toggle').click();
 assert.match(await page.locator('.hint-box').innerText(),/no longer required|delay|계획|중심|뒤의|주목/);
 await page.locator('#question-shell .choices button').nth(0).click();
 assert.equal(await page.locator('#question-shell .feedback.is-wrong').count(),1);
 await page.locator('#question-shell [data-cause="독해·해석"]').click();
 let data=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.exam-lab.20261019.v1')));
 assert.equal(data.attempts.lab013.firstCorrect,false);
 assert.equal(data.attempts.lab013.cause,'독해·해석');
 await page.locator('#mode-review').click();
 assert.equal(await page.locator('#question-shell .choices button').count(),5);
 await page.locator('#question-shell .choices button').nth(1).click();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.exam-lab.20261019.v1')));
 assert.equal(data.attempts.lab013.mastered,true);
 await page.locator('#tab-past').click();
 await page.locator('#past-subject').selectOption('수학');
 assert.equal(await page.locator('#past-grid button').count(),30);
 await page.locator('#past-grid [data-past-number="3"]').click();
 await page.locator('#past-choices [data-pick="4"]').click();
 await page.locator('[data-mark="wrong"]').click();
 await page.locator('#past-note').fill('함수 조건을 놓침');
 await page.locator('#past-note').blur();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.exam-lab.20261019.v1')));
 assert.equal(data.past['수학#3'].pick,4);
 assert.equal(data.past['수학#3'].mark,'wrong');
 await page.locator('#mission-120').click();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.exam-lab.20261019.v1')));
 assert.equal(data.mission.minutes,120);
 await page.locator('#mission-toggle').click();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.exam-lab.20261019.v1')));
 assert.equal(data.mission.running,false);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#mission-toggle').innerText(),'이어하기');
 await page.locator('#tab-report').click();
 assert.match(await page.locator('#report-subjects').innerText(),/영어/);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 assert.equal(download.suggestedFilename(),'BKIT-EXAM-LAB-20261019.json');
 assert.equal(errs.length,0,label+' JS errors: '+errs.join(' / '));
 console.log(label+': original quiz, hints, review, EBS answer log, pause, reload, JSON export PASS');
 await ctx.close();await browser.close();
}
