import { webkit, devices, expect } from '@playwright/test';
import { newState, taskSchema } from '../src/model';
import { PDFDocument } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'https://teambkit.com';
const browser = await webkit.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
});
const context = await browser.newContext({ ...devices['iPhone 13'] });
await context.route('**/*', (r) =>
  new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
);
const page = await context.newPage();
const fixture = newState();
fixture.tasks = [
  taskSchema.parse({
    id: 'live-qa-sentinel',
    subject: '수학',
    title: '배포 전후 보존 확인용 과제',
    kind: '숙제',
    due: null,
    priority: 2,
    minutes: 20,
    remaining: 20,
    status: 'todo',
    submitted: false,
    optional: false,
    notes: 'Safari 새로고침 후에도 보존',
    link: '',
  }),
];
await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.evaluate((state) => {
  localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  localStorage.setItem('bkit.atelier.visited.v1', '1');
  localStorage.setItem('bkit.study-os.theme.v1', 'light');
  localStorage.setItem(
    'bkit.material.v1',
    JSON.stringify({ id: 'classic', motion: 'auto', intensity: 0.5, lowPower: false }),
  );
}, fixture);
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate(() => navigator.serviceWorker.ready);
const pdf = await PDFDocument.create();
pdf.addPage([400, 600]).drawText('BKIT before release');
const bytes = Array.from(await pdf.save());
await page.evaluate(async (bytes) => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.open('bkit-digital-paper-v1', 1);
    r.onupgradeneeded = () => {
      for (const s of ['documents', 'originals', 'recovery'])
        r.result.createObjectStore(s, { keyPath: 'id' });
    };
    r.onsuccess = () => {
      const db = r.result,
        tx = db.transaction('originals', 'readwrite');
      tx.objectStore('originals').put({
        id: 'live-qa-original',
        bytes: new Uint8Array(bytes).buffer,
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}, bytes);
console.log(
  'Returning Safari client warmed on the prior production version; fixture and PDF saved.',
);
const requiredProduct = 'BKIT STUDY OS · Compact Experience';
let observed = false;
for (let attempt = 0; attempt < 360; attempt++) {
  const release = await page.evaluate(async () => {
    try {
      return await (await fetch('/release.json?qa=' + Date.now(), { cache: 'no-store' })).json();
    } catch {
      return null;
    }
  });
  if (release?.product === requiredProduct) {
    console.log('Observed release source ' + release.sourceCommit);
    observed = true;
    break;
  }
  await page.waitForTimeout(5000);
}
if (!observed) throw Error('Timed out waiting for the compact release.');
await page.reload({ waitUntil: 'networkidle' });
await expect(page.getByRole('button', { name: 'BKIT 로고 · 테마 선택' })).toBeVisible();
await expect(page.locator('html')).toHaveAttribute('data-material', 'classic');
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
expect(stored.tasks).toEqual(fixture.tasks);
expect(stored.sessions).toEqual(fixture.sessions);
const afterBytes = await page.evaluate(
  () =>
    new Promise<number[]>((resolve, reject) => {
      const r = indexedDB.open('bkit-digital-paper-v1', 1);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('originals', 'readonly'),
          q = tx.objectStore('originals').get('live-qa-original');
        tx.oncomplete = () => {
          db.close();
          resolve([...new Uint8Array(q.result.bytes)]);
        };
        tx.onerror = () => reject(tx.error);
      };
    }),
);
expect(afterBytes).toEqual(bytes);
await page.getByRole('button', { name: '테마 선택', exact: true }).click();
await page.getByRole('button', { name: 'Liquid Glass', exact: true }).click();
await page.getByRole('button', { name: '닫기', exact: true }).click();
await mkdir('/workspace/bkit-qa/live', { recursive: true });
await page.screenshot({ path: '/workspace/bkit-qa/live/returning-user.png' });
const sw = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { active: r?.active?.state, waiting: r?.waiting?.state, caches: await caches.keys() };
});
await page.close();
const fresh = await context.newPage();
await fresh.goto(origin + '/', { waitUntil: 'networkidle' });
await fresh.evaluate(() => navigator.serviceWorker.ready);
await context.setOffline(true);
await fresh.reload({ waitUntil: 'networkidle' });
await expect(fresh.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeVisible();
await expect(fresh.locator('html')).toHaveAttribute('data-material', 'glass');
await writeFile(
  '/workspace/bkit-qa/live/returning-user-check.json',
  JSON.stringify(
    {
      passed: true,
      taskPreserved: true,
      pdfBytesPreserved: true,
      savedThemeRespected: true,
      offlineReload: true,
      serviceWorker: sw,
    },
    null,
    2,
  ),
);
console.log(
  'PASS: returning Safari client retained tasks, PDF bytes and saved appearance; updated shell reloaded offline.',
);
await browser.close();
