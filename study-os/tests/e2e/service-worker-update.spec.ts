import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

test('a waiting worker preserves old lazy assets and activation preserves study/PDF data and other scopes', async ({ page, context }) => {
  test.setTimeout(90000);
  const worker = await readFile('public/sw.js', 'utf8');
  let version = 'old';
  const activated = new Set<string>();
  const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url?.startsWith('/worker-activated')) {
      activated.add(new URL(req.url, 'http://local.test').searchParams.get('version')!);
      res.end('ok');
    } else if (req.url === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      // Native lifecycle observation also works on WebKit, where Playwright's
      // browserContext 'serviceworker' event is not supported.
      res.end(worker.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(['index.html', `lazy-${version}.js`])) +
        `\nself.addEventListener('activate', e => e.waitUntil(fetch('/worker-activated?version=${version}', {method:'POST'})));`);
    } else if (req.url?.startsWith('/lazy-')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(`window.lazyVersion = '${version}';`);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<h1>${version}</h1><script>navigator.serviceWorker.register('/sw.js')</script>`);
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server port');
  const url = `http://127.0.0.1:${address.port}/`;
  try {
    await page.goto(url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(async () => {
      localStorage.setItem('bkit.study-os.v1', 'exact-study-checkpoint');
      await caches.open('bkit-study-os@/preview-other/@shell-retain');
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bkit-digital-paper-v1', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('documents', { keyPath: 'id' });
          request.result.createObjectStore('originals', { keyPath: 'id' });
          request.result.createObjectStore('recovery', { keyPath: 'id' });
        };
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction(['documents', 'originals'], 'readwrite');
          tx.objectStore('documents').add({ id: 'ink', strokes: [{ id: 'my-stroke', pressure: 0.7 }] });
          tx.objectStore('originals').add({ id: 'pdf', bytes: new Uint8Array([37, 80, 68, 70]).buffer });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
        request.onerror = () => reject(request.error);
      });
    });
    const other = await context.newPage();
    await other.goto(url);
    version = 'new';
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await expect.poll(() => page.evaluate(() => caches.keys())).toContain('bkit-study-os@/@shell-old');
    await context.setOffline(true);
    expect(await page.evaluate(async () => (await fetch('/lazy-old.js')).text())).toContain("'old'");
    expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe('exact-study-checkpoint');
    await context.setOffline(false);
    expect(activated.has('new')).toBe(false);
    await page.close();
    // The second old client still protects the old shell.
    expect(await other.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await other.close();
    await expect.poll(() => activated.has('new')).toBe(true);
    const reopened = await context.newPage();
    await reopened.goto(url);
    await expect(reopened.getByRole('heading', { name: 'new', exact: true })).toBeVisible();
    await expect.poll(() => reopened.evaluate(() => caches.keys())).not.toContain('bkit-study-os@/@shell-old');
    expect(await reopened.evaluate(() => caches.keys())).toContain('bkit-study-os@/preview-other/@shell-retain');
    expect(await reopened.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe('exact-study-checkpoint');
    const persisted = await reopened.evaluate(() => new Promise<{ strokes: unknown[]; bytes: number[] }>((resolve, reject) => {
      const request = indexedDB.open('bkit-digital-paper-v1', 1);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction(['documents', 'originals']);
        const document = tx.objectStore('documents').get('ink'), original = tx.objectStore('originals').get('pdf');
        tx.oncomplete = () => { db.close(); resolve({ strokes: document.result.strokes, bytes: Array.from(new Uint8Array(original.result.bytes)) }); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
      request.onerror = () => reject(request.error);
    }));
    expect(persisted).toEqual({ strokes: [{ id: 'my-stroke', pressure: 0.7 }], bytes: [37, 80, 68, 70] });
  } finally {
    await context.setOffline(false).catch(() => {});
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
