import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const out = new URL('../artifacts/home-rebirth/', import.meta.url).pathname;
const before = process.env.BKIT_BASELINE_URL || 'http://127.0.0.1:4174/study-os/';
const after = process.env.BKIT_REVIEW_URL || 'http://127.0.0.1:4173/study-os/';
const onlyAfter = process.env.BKIT_ONLY_AFTER === '1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
const metrics = onlyAfter ? JSON.parse(await readFile(`${out}/geometry.json`, 'utf8')).filter((row) => row.stage === 'before') : [];
try {
  for (const [device, viewport] of [['iphone', {width:390,height:844}], ['ipad-portrait',{width:834,height:1194}], ['ipad',{width:1194,height:834}], ['galaxy',{width:1280,height:800}], ['desktop',{width:1440,height:1000}]]) {
    for (const [stage, url] of onlyAfter ? [['after', after]] : [['before', before], ['after', after]]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.clock.install({time:new Date('2026-10-22T05:00:00Z')});
      await page.addInitScript(() => { localStorage.setItem('bkit.atelier.visited.v1','1'); localStorage.setItem('bkit.material.v1',JSON.stringify({id:'peach',motion:'off',intensity:.5,lowPower:true})); });
      await page.goto(url); await page.evaluate(() => document.fonts.ready);
      await page.screenshot({path:`${out}/${device}-${stage}-empty.png`,fullPage:true,animations:'disabled'});
      await page.getByRole('button',{name:'과제 · 일정 등록',exact:true}).click();
      await page.getByRole('textbox',{name:'할 일을 한 문장으로'}).fill('수학 극한 학습지 풀기');
      await page.getByRole('button',{name:'오늘에 담기',exact:true}).click();
      await page.getByRole('dialog').waitFor({state:'detached'}); await page.clock.runFor(6500);
      await page.screenshot({path:`${out}/${device}-${stage}-task.png`,fullPage:true,animations:'disabled'});
      metrics.push({device,stage,errors,...await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cta:document.querySelector('.study-start-primary').getBoundingClientRect().toJSON(),headingSize:getComputedStyle(document.querySelector('h1')).fontSize}))});
      if (stage === 'after') {
        await page.getByRole('button',{name:'전체 달력 열기'}).click();
        await page.screenshot({path:`${out}/${device}-calendar.png`,animations:'disabled'});
        await page.getByRole('button',{name:'닫기',exact:true}).click();
        await page.getByRole('button',{name:'지금 공부 시작',exact:true}).click();
        await page.clock.runFor(6500);
        await page.screenshot({path:`${out}/${device}-focus.png`,fullPage:true,animations:'disabled'});
        await page.locator('nav:visible').getByRole('button',{name:'오늘',exact:true}).first().click();
        await page.screenshot({path:`${out}/${device}-active-home.png`,fullPage:true,animations:'disabled'});
        await page.getByRole('button',{name:'설정 열기',exact:true}).click();
        await page.screenshot({path:`${out}/${device}-settings.png`,fullPage:true,animations:'disabled'});
        await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
        if (device === 'iphone') for (const [id,name] of [['glass','Liquid Glass'],['jelly','Soft Jelly'],['night','Night Sprint']]) {
          await page.getByRole('button',{name:'BKIT 로고 · 테마 선택'}).click();
          await page.getByRole('button',{name,exact:true}).click();
          await page.getByRole('button',{name:'닫기',exact:true}).click();
          await page.screenshot({path:`${out}/iphone-${id}.png`,fullPage:true,animations:'disabled'});
        }
      }
      await context.close();
    }
  }
  await writeFile(`${out}/geometry.json`,JSON.stringify(metrics,null,2));
  const devices = ['iphone','ipad-portrait','ipad','galaxy','desktop'];
  await writeFile(`${out}/index.html`, `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>BKIT 4.0 · Home Rebirth</title><style>body{margin:0;padding:32px;background:#f4eee7;color:#39322f;font-family:system-ui,sans-serif}h1{font-size:24px}h2{font-size:18px}p{max-width:800px;line-height:1.7}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}figure{margin:0}img{width:100%;border-radius:16px;border:1px solid #d8cbc1}figcaption{padding:12px 0;font-size:14px}section{max-width:1200px;margin:40px 0}a{color:inherit}@media(max-width:650px){body{padding:16px}.pair{gap:10px}}</style><h1>BKIT STUDY OS 4.0</h1><p>PR #24 기준 홈과 Home Rebirth의 실제 Chromium 렌더링입니다. 동일한 합성 과제·Peach 테마·시각을 사용했습니다. 학생 데이터와 실제 기기 캡처가 아닙니다. 애니메이션은 감소 설정입니다.</p>${devices.map(d=>`<section><h2>${d}</h2><div class="pair"><figure><figcaption>Before · PR #24 / 66f96b4</figcaption><a href="${d}-before-task.png"><img src="${d}-before-task.png" alt="${d} 변경 전 홈"></a></figure><figure><figcaption>After · Home Rebirth</figcaption><a href="${d}-after-task.png"><img src="${d}-after-task.png" alt="${d} 변경 후 홈"></a></figure></div><p><a href="${d}-after-empty.png">빈 홈</a> · <a href="${d}-active-home.png">학습 중</a> · <a href="${d}-calendar.png">전체 달력</a> · <a href="${d}-focus.png">집중</a> · <a href="${d}-settings.png">설정</a></p></section>`).join('')}<p><a href="iphone-glass.png">Liquid Glass</a> · <a href="iphone-jelly.png">Soft Jelly</a> · <a href="iphone-night.png">Night Sprint</a> · <a href="geometry.json">화면 측정값</a></p></html>`);
} finally { await browser.close(); }
