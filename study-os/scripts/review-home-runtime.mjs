import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const results = [];
try {
  for (const [stage, url] of [['before', process.env.BKIT_BASELINE_URL || 'http://127.0.0.1:4174/study-os/'], ['after', process.env.BKIT_REVIEW_URL || 'http://127.0.0.1:4173/study-os/']]) {
    const context = await browser.newContext({ viewport: { width:390, height:844 }, reducedMotion:'reduce', serviceWorkers:'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-22T05:00:00Z'));
    await page.addInitScript(() => { localStorage.setItem('bkit.atelier.visited.v1','1'); localStorage.setItem('bkit.material.v1',JSON.stringify({id:'peach',motion:'off',intensity:.5,lowPower:true})); });
    await page.goto(url); await page.evaluate(() => document.fonts.ready);
    for (const mode of ['idle','studying']) {
      if (mode === 'studying') await page.getByRole('button',{name:'지금 공부 시작',exact:true}).click();
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        window.__homeMetrics = { longTasks:[], mutations:0 };
        window.__homePerformance = new PerformanceObserver(list => window.__homeMetrics.longTasks.push(...list.getEntries().map(e => e.duration)));
        window.__homePerformance.observe({ type:'longtask', buffered:false });
        window.__homeMutations = new MutationObserver(list => window.__homeMetrics.mutations += list.length);
        window.__homeMutations.observe(document.querySelector('main'),{subtree:true,childList:true,characterData:true,attributes:true});
      });
      await page.waitForTimeout(5200);
      results.push({stage,mode,windowMs:5200,...await page.evaluate(() => { window.__homePerformance.disconnect(); window.__homeMutations.disconnect(); return window.__homeMetrics; }),errors});
    }
    await context.close();
  }
  await writeFile(new URL('../artifacts/home-rebirth/runtime.json',import.meta.url),JSON.stringify({scope:'Short minimal-data Chromium smoke, reduced motion and low power. Not an LCP, hardware battery, large-store or student action-time benchmark.',results},null,2)+'\n');
} finally { await browser.close(); }
