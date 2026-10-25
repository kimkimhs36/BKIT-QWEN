import { test as base, expect, type BrowserContext, type Page, webkit } from '@playwright/test';
import express from 'express';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { newState, taskSchema, type State } from '../../src/model';
import { startQuick, finishQuick } from '../../src/quickTimer';
import { addResource } from '../../src/learningEngine';

type Harness = {
  seed: State;
  records: Map<string, string>;
  storeFail: boolean;
  networkDown: boolean;
  sessionFail: boolean;
  dropWriteAck: boolean;
  forcedStatus: number;
  writes: number;
  sessions: number;
  reads: number;
  calls: number;
  rejectWrites: boolean;
  root: string;
  attach: (context: BrowserContext) => Promise<void>;
  remote: () => any;
  changeRemote: (goal: string) => void;
};
const test = base.extend<{ cloud: Harness }>({
  cloud: async ({}, use) => {
    const apiRoot = process.env.BKIT_RECOVERY_API_ROOT;
    if (!apiRoot) throw Error('BKIT_RECOVERY_API_ROOT must identify the exact tested API checkout');
    const { createPrivateApi } = await import(resolve(apiRoot, 'server/privateApi.ts'));
    const h: Harness = {
      seed: newState(),
      records: new Map(),
      storeFail: false,
      networkDown: false,
      sessionFail: false,
      dropWriteAck: false,
      forcedStatus: 0,
      writes: 0,
      sessions: 0,
      reads: 0,
      calls: 0,
      rejectWrites: false,
      root: '',
      attach: async () => {},
      remote: () => {},
      changeRemote: () => {},
    };
    const api = createPrivateApi(
      {
        BKIT_OWNER_EMAIL: 'synthetic-owner@example.test',
        BKIT_GOOGLE_CLIENT_ID: 'synthetic.apps.googleusercontent.com',
        UPSTASH_REDIS_REST_URL: 'https://synthetic-redis.test',
        UPSTASH_REDIS_REST_TOKEN: 'synthetic-redis',
        BKIT_AI_LIVE: 'false',
      },
      {
        verify: async (value: string) => value === 'synthetic-google',
        fetcher: async (_url: unknown, options?: RequestInit) => {
          const args = JSON.parse(String(options?.body)) as string[];
          if (h.storeFail) throw Error('Synthetic Redis outage');
          let result: unknown = null;
          if (args[0] === 'SET') {
            h.records.set(args[1], args[2]);
            h.sessions++;
            result = 'OK';
          }
          if (args[0] === 'GET') {
            h.reads++;
            result = h.records.get(args[1]) ?? null;
          }
          if (args[0] === 'DEL') result = Number(h.records.delete(args[1]));
          if (args[0] === 'EXISTS') result = Number(h.records.has(args[1]));
          if (args[0] === 'EVAL') {
            if (h.rejectWrites) throw Error('Synthetic durable write failure');
            const previous = JSON.parse(h.records.get(args[3]) || 'null');
            const version = previous?.version ?? 0;
            if (version !== Number(args[5])) result = [0, version];
            else {
              h.records.set(
                args[3],
                JSON.stringify({ version: version + 1, data: JSON.parse(args[6]) }),
              );
              // Simulate the atomic owner-scoped legacy cleanup.
              if (args[4] !== args[3]) h.records.delete(args[4]);
              h.writes++;
              result = [1, version + 1];
            }
          }
          return new Response(JSON.stringify({ result }));
        },
      },
    );
    const app = express();
    app.use((req, res, next) => {
      if (req.path === '/api/sync') h.calls++;
      if (h.sessionFail && req.path === '/api/session' && req.method === 'POST') {
        res.status(503).json({ code: 'SESSION_STORE_UNAVAILABLE' });
        return;
      }
      if (h.forcedStatus && req.path === '/api/sync') {
        res.set('Retry-After', '1');
        res.status(h.forcedStatus).json({ error: 'Synthetic platform failure' });
        return;
      }
      next();
    });
    app.use(api);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    h.root = 'http://127.0.0.1:' + (typeof address === 'object' && address ? address.port : 0);
    h.remote = () => {
      const row = [...h.records].find(([k]) => k.startsWith('bkit:private-study:v2:'));
      return row ? JSON.parse(row[1]) : null;
    };
    h.changeRemote = (goal) => {
      const row = [...h.records].find(([k]) => k.startsWith('bkit:private-study:v2:'))!;
      const record = JSON.parse(row[1]);
      record.version++;
      record.data.settings.goal = goal;
      h.records.set(row[0], JSON.stringify(record));
    };
    h.attach = async (context) => {
      await context.addInitScript((s) => {
        if (!localStorage.getItem('bkit.study-os.v1'))
          localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
      }, h.seed);
      await context.exposeBinding(
        '__bkitApi',
        async (
          _source,
          input: { path: string; method: string; headers: Record<string, string>; body?: string },
        ) => {
          if (h.networkDown) return { networkFailure: true };
          const response = await fetch(h.root + input.path, {
            method: input.method,
            headers: { ...input.headers, Origin: 'https://teambkit.com' },
            body: input.body,
          });
          if (
            h.dropWriteAck &&
            input.path === '/api/sync' &&
            input.method === 'PUT' &&
            response.ok
          ) {
            h.dropWriteAck = false;
            return { status: 503, headers: {}, body: '{}' };
          }
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: await response.text(),
          };
        },
      );
      await context.addInitScript(() => {
        const w = window as any;
        w.__googlePrompts = 0;
        w.google = {
          accounts: {
            oauth2: {
              initTokenClient(options: any) {
                return {
                  requestAccessToken() {
                    w.__googlePrompts++;
                    options.callback({ access_token: 'synthetic-google', scope: options.scope });
                  },
                };
              },
            },
          },
        };
        const original = window.fetch.bind(window);
        window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const url =
            typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          if (url.startsWith('https://bkit-api.vercel.app/')) {
            if (!navigator.onLine) throw new TypeError('Synthetic offline transport');
            const parsed = new URL(url);
            const result = await w.__bkitApi({
              path: parsed.pathname,
              method: init?.method || 'GET',
              headers: Object.fromEntries(new Headers(init?.headers)),
              body: init?.body,
            });
            if (result.networkFailure) throw new TypeError('Synthetic connection interrupted');
            return new Response(result.body || null, {
              status: result.status,
              headers: result.headers,
            });
          }
          return original(input, init);
        }) as typeof fetch;
      });
    };
    try {
      await use(h);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
});
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce', trace: 'off' });
test.setTimeout(45000);
const panel = (p: Page) => p.getByRole('region', { name: 'BKIT 개인 클라우드' });
async function openPanel(p: Page) {
  if (await p.getByRole('button', { name: '설정 열기', exact: true }).isVisible())
    await p.getByRole('button', { name: '설정 열기', exact: true }).click();
  const section = p.locator('#settings-sync');
  if (!(await section.evaluate((e) => (e as HTMLDetailsElement).open)))
    await section.locator('summary').first().click();
}
async function login(p: Page, h: Harness) {
  const issuesBefore = h.sessions;
  await h.attach(p.context());
  await p.goto('./');
  await p.getByRole('button', { name: 'Google로 이어가기', exact: true }).click();
  await panel(p).getByRole('button', { name: 'Google로 개인 클라우드 연결' }).click();
  await expect(panel(p)).toContainText('연결됨');
  expect(h.sessions).toBe(issuesBefore + 1);
}
async function credentialPresent(p: Page) {
  return p.evaluate(
    () =>
      new Promise<boolean>((resolve, reject) => {
        const r = indexedDB.open('bkit-auth-v1', 1);
        r.onsuccess = () => {
          const db = r.result;
          const t = db.transaction('credentials');
          const q = t.objectStore('credentials').get('sync');
          q.onsuccess = () => resolve(!!q.result?.token);
          t.oncomplete = () => db.close();
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
async function editGoal(p: Page, goal: string) {
  await p.locator('.settings-rhythm > summary').click();
  await p.getByRole('textbox', { name: '장기 목표', exact: true }).fill(goal);
  await p.getByRole('button', { name: '설정 저장', exact: true }).click();
}
const state = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));

test('remembered v1 checkpoint reopens into clean v2 cloud, deletes only the old owner snapshot', async ({
  page, cloud,
}) => {
  await login(page, cloud);
  const previousSessions = cloud.sessions;
  const before = await state(page);
  const newKey = [...cloud.records.keys()].find(k => k.startsWith('bkit:private-study:v2:'))!;
  expect(newKey).toBeTruthy();
  const oldKey = newKey.replace(':v2:', ':v1:');
  cloud.records.set(oldKey, JSON.stringify({
    version: 12,
    data: { ...cloud.seed, tasks: {} },
  }));
  cloud.records.delete(newKey);
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.records.has(oldKey)).toBe(false);
  expect(cloud.records.has(newKey)).toBe(true);
  expect(cloud.remote()?.data.tasks).toEqual([]);
  expect(cloud.sessions).toBe(previousSessions);
  expect((await state(page)).settings.goal).toBe(before.settings.goal);
  expect(await credentialPresent(page)).toBe(true);
  expect(await page.evaluate(() => (window as any).__googlePrompts)).toBe(0);
});

test('login → refresh and close page → ten-second relaunch keep the real issued session without Google popup', async ({
  page,
  cloud,
  context,
}) => {
  await login(page, cloud);
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('연결됨');
  expect(await page.evaluate(() => (window as any).__googlePrompts)).toBe(0);
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const next = await context.newPage();
  await next.clock.install({ time: new Date(Date.now() + 10000) });
  await next.goto('./');
  await openPanel(next);
  await expect(panel(next)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
  expect(await credentialPresent(next)).toBe(true);
});
test('valid session restores after more than one hour', async ({ page, cloud }) => {
  await login(page, cloud);
  await page.clock.install({ time: new Date(Date.now() + 65 * 60000) });
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
  expect(await page.evaluate(() => (window as any).__googlePrompts)).toBe(0);
});
test('offline learning survives relaunch and automatically syncs local changes when online returns', async ({
  page,
  context,
  cloud,
}) => {
  await login(page, cloud);
  await context.setOffline(true);
  await expect(panel(page)).toContainText('오프라인');
  await editGoal(page, '오프라인에서 계속한 공부');
  expect((await state(page)).settings.goal).toBe('오프라인에서 계속한 공부');
  expect(await credentialPresent(page)).toBe(true);
  await context.setOffline(false);
  await expect.poll(() => cloud.remote()?.data.settings.goal).toBe('오프라인에서 계속한 공부');
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
});
test('Redis 503 on session validation retains auth and automatically recovers after foreground return', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  cloud.storeFail = true;
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('재시도');
  await expect(
    panel(page).getByRole('button', { name: 'Google로 개인 클라우드 연결' }),
  ).toHaveCount(0);
  expect(await credentialPresent(page)).toBe(true);
  cloud.storeFail = false;
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
});
test('automatic sync failure resumes without reload and retry attempts are exponentially bounded', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  await page.clock.install();
  cloud.forcedStatus = 503;
  const writes = cloud.writes;
  await editGoal(page, '잠시 실패한 자동 저장');
  await page.clock.fastForward(2000);
  await expect(panel(page)).toContainText('재시도');
  const startCalls = cloud.calls;
  for (let i = 1; i <= 5; i++) {
    await expect(panel(page)).toContainText(`(${i}/5)`);
    await page.clock.fastForward(1000 * 2 ** (i - 1));
  }
  await expect(panel(page)).toContainText('연결 대기');
  expect(cloud.calls - startCalls).toBe(5);
  const stable = cloud.calls;
  await page.clock.fastForward(120000);
  expect(cloud.calls).toBe(stable);
  expect(cloud.writes).toBe(writes);
  cloud.forcedStatus = 0;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => cloud.remote()?.data.settings.goal).toBe('잠시 실패한 자동 저장');
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
});
test('401 expires only auth, preserves all study data, and never automatically opens Google', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  const before = await state(page);
  cloud.forcedStatus = 401;
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('로그인 만료');
  expect(await credentialPresent(page)).toBe(false);
  expect((await state(page)).tasks).toEqual(before.tasks);
  expect((await state(page)).sessions).toEqual(before.sessions);
  expect(await page.evaluate(() => (window as any).__googlePrompts)).toBe(0);
});
test('403 is access failure, 429 is retryable rate limiting, and neither logs out a valid session', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  cloud.forcedStatus = 403;
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('접근 확인 필요');
  expect(await credentialPresent(page)).toBe(true);
  cloud.forcedStatus = 429;
  await panel(page).getByRole('button', { name: '로그인 유지한 채 다시 동기화' }).click();
  await expect(panel(page)).toContainText('요청이 많아');
  expect(await credentialPresent(page)).toBe(true);
  cloud.forcedStatus = 0;
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(panel(page)).toContainText('연결됨');
});
test('two-device changes during outage remain a conflict without either snapshot being overwritten', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  cloud.storeFail = true;
  await editGoal(page, '이 기기의 새 목표');
  await expect(panel(page)).toContainText('재시도');
  cloud.changeRemote('다른 기기의 새 목표');
  cloud.storeFail = false;
  const writes = cloud.writes;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(panel(page)).toContainText('선택 필요');
  expect((await state(page)).settings.goal).toBe('이 기기의 새 목표');
  expect(cloud.remote().data.settings.goal).toBe('다른 기기의 새 목표');
  expect(cloud.writes).toBe(writes);
  expect(await credentialPresent(page)).toBe(true);
});
test('failed cloud writes keep original local data and retry successfully after storage recovers', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  const original = cloud.remote().data.settings.goal;
  cloud.rejectWrites = true;
  await editGoal(page, '실패해도 보존할 학습 목표');
  await expect(panel(page)).toContainText('재시도');
  expect((await state(page)).settings.goal).toBe('실패해도 보존할 학습 목표');
  expect(cloud.remote().data.settings.goal).toBe(original);
  cloud.rejectWrites = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => cloud.remote().data.settings.goal).toBe('실패해도 보존할 학습 목표');
});
test('device-local answer drafts and original photo/PDF bytes survive remote update', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  const seeded = addResource(
    await state(page),
    {
      title: '기존 학습지',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['원래 문제'],
  );
  seeded.learning!.problems[0].draft = '보존해야 하는 원래 답안';
  seeded.revision++;
  await page.evaluate((s) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(s)), seeded);
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('연결됨');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('bkit-private-materials-v1', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
      r.onsuccess = () => {
        const db = r.result,
          t = db.transaction('photos', 'readwrite');
        t.objectStore('photos').put({ id: 'original', bytes: new Uint8Array([2, 4, 6, 8]).buffer });
        t.oncomplete = () => {
          db.close();
          resolve();
        };
      };
      r.onerror = () => reject(r.error);
    });
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('bkit-digital-paper-v1', 1);
        r.onupgradeneeded = () => {
          for (const name of ['documents', 'originals', 'recovery'])
            r.result.createObjectStore(name, { keyPath: 'id' });
        };
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction('originals', 'readwrite');
          t.objectStore('originals').put({
            id: 'original-pdf',
            bytes: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 10]).buffer,
          });
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
  const before = await state(page);
  cloud.changeRemote('다른 기기에서 변경한 목표');
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect
    .poll(async () => (await state(page)).settings.goal)
    .toBe('다른 기기에서 변경한 목표');
  expect((await state(page)).learning).toEqual(before.learning);
  expect(
    await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const r = indexedDB.open('bkit-private-materials-v1', 1);
          r.onsuccess = () => {
            const db = r.result,
              q = db.transaction('photos').objectStore('photos').get('original');
            q.onsuccess = () => {
              resolve([...new Uint8Array(q.result.bytes)]);
              db.close();
            };
          };
        }),
    ),
  ).toEqual([2, 4, 6, 8]);
  expect(
    await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const r = indexedDB.open('bkit-digital-paper-v1', 1);
          r.onsuccess = () => {
            const db = r.result,
              q = db.transaction('originals').objectStore('originals').get('original-pdf');
            q.onsuccess = () => {
              resolve([...new Uint8Array(q.result.bytes)]);
              db.close();
            };
          };
        }),
    ),
  ).toEqual([37, 80, 68, 70, 45, 49, 46, 55, 10]);
});
test('PWA storage lifecycle simulation: full WebKit process closes, relaunches offline, then reconnects', async ({
  cloud,
  baseURL,
}, info) => {
  const profile = await mkdtemp(resolve(tmpdir(), 'bkit-pwa-recovery-'));
  let context: BrowserContext | undefined;
  try {
    const viewport = info.project.use.viewport;
    context = await webkit.launchPersistentContext(profile, {
      headless: true,
      viewport,
      hasTouch: true,
      serviceWorkers: 'allow',
      reducedMotion: 'reduce',
    });
    await cloud.attach(context);
    let p = context.pages()[0] || (await context.newPage());
    await p.goto(baseURL!);
    await p.getByRole('button', { name: 'Google로 이어가기', exact: true }).click();
    await panel(p).getByRole('button', { name: 'Google로 개인 클라우드 연결' }).click();
    await expect(panel(p)).toContainText('연결됨');
    await p.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => p.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.close();
    context = undefined;
    context = await webkit.launchPersistentContext(profile, {
      headless: true,
      viewport,
      hasTouch: true,
      serviceWorkers: 'allow',
      reducedMotion: 'reduce',
    });
    await cloud.attach(context);
    await context.setOffline(true);
    p = context.pages()[0] || (await context.newPage());
    await p.goto(baseURL!);
    await openPanel(p);
    await expect(panel(p)).toContainText('오프라인');
    expect(await credentialPresent(p)).toBe(true);
    await context.setOffline(false);
    await expect(panel(p)).toContainText('연결됨');
    expect(cloud.sessions).toBe(1);
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test('current task metadata and quick records round-trip through the API without a false restore conflict or sync loop', async ({
  page,
  cloud,
}) => {
  cloud.seed = finishQuick(
    startQuick(newState(), 'stopwatch', 480, Date.now() - 65000, 'saved-quick'),
    Date.now(),
  );
  cloud.seed.tasks = [
    taskSchema.parse({
      id: 'existing-task',
      subject: '수학',
      title: '기존 과제',
      kind: '숙제',
      due: null,
      minutes: 25,
      remaining: 25,
      priority: 2,
      status: 'todo',
      submitted: false,
      submissionRequired: true,
      capture: { source: 'manual', confirmedByUser: true },
      notes: '원래 메모',
      link: '',
      optional: false,
      attachmentIds: ['device-photo'],
    }),
  ];
  cloud.seed.sessions[0].resourceId = 'local-resource';
  await login(page, cloud);
  expect(cloud.remote().data.tasks[0].submissionRequired).toBe(true);
  expect(cloud.remote().data.sessions[0].quick).toBe(true);
  expect(cloud.remote().data.sessions[0].resourceId).toBeUndefined();
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('연결됨');
  expect((await state(page)).sessions[0].resourceId).toBe('local-resource');
  const writes = cloud.writes;
  await page.clock.install();
  await page.clock.fastForward(65000);
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.writes).toBe(writes);
});
test('a failed local apply preserves local records and retries after browser storage is available', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  const original = (await state(page)).settings.goal;
  await page.evaluate(() => {
    const w = window as any;
    w.__originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'bkit.study-os.v1')
        throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      return w.__originalSet.call(this, key, value);
    };
  });
  cloud.changeRemote('저장소 복구 뒤 받을 목표');
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(panel(page)).toContainText('저장 확인 필요');
  expect((await state(page)).settings.goal).toBe(original);
  expect(await credentialPresent(page)).toBe(true);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).__originalSet;
  });
  await panel(page).getByRole('button', { name: '로그인 유지한 채 다시 동기화' }).click();
  await expect(panel(page)).toContainText('연결됨');
  expect((await state(page)).settings.goal).toBe('저장소 복구 뒤 받을 목표');
});

test('a transport failure while the OS still reports online recovers automatically without reauthorizing Google', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  cloud.networkDown = true;
  await page.reload();
  await openPanel(page);
  await expect(panel(page)).toContainText('네트워크 연결이 불안정');
  await expect(
    panel(page).getByRole('button', { name: 'Google로 개인 클라우드 연결' }),
  ).toHaveCount(0);
  expect(await credentialPresent(page)).toBe(true);
  cloud.networkDown = false;
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
});
test('two real browser clients retain their independent changes and require conflict resolution', async ({
  page,
  browser,
  cloud,
}) => {
  await login(page, cloud);
  const other = await browser.newContext({
    viewport: page.viewportSize()!,
    hasTouch: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  try {
    const second = await other.newPage();
    await login(second, cloud);
    expect(cloud.sessions).toBe(2);
    cloud.storeFail = true;
    await editGoal(page, '첫 번째 기기에서 쓴 목표');
    await editGoal(second, '두 번째 기기에서 쓴 목표');
    await expect(panel(page)).toContainText('재시도');
    await expect(panel(second)).toContainText('재시도');
    cloud.storeFail = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => cloud.remote().data.settings.goal).toBe('첫 번째 기기에서 쓴 목표');
    await second.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(panel(second)).toContainText('선택 필요');
    expect((await state(second)).settings.goal).toBe('두 번째 기기에서 쓴 목표');
    expect(cloud.remote().data.settings.goal).toBe('첫 번째 기기에서 쓴 목표');
  } finally {
    await other.close();
  }
});

test('temporary session issuance failure completes remembered login without a second Google popup', async ({
  page,
  cloud,
}) => {
  await cloud.attach(page.context());
  cloud.sessionFail = true;
  await page.goto('./');
  await page.getByRole('button', { name: 'Google로 이어가기', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Google로 개인 클라우드 연결' }).click();
  await expect(panel(page)).toContainText('재시도');
  expect(cloud.sessions).toBe(0);
  cloud.sessionFail = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.sessions).toBe(1);
  expect(await credentialPresent(page)).toBe(true);
  expect(await page.evaluate(() => (window as any).__googlePrompts)).toBe(1);
});
test('a committed write with a lost acknowledgement recovers without duplicate writes', async ({
  page,
  cloud,
}) => {
  await login(page, cloud);
  const writes = cloud.writes;
  cloud.dropWriteAck = true;
  await editGoal(page, '서버에는 저장됐지만 응답이 끊긴 목표');
  await expect(panel(page)).toContainText('재시도');
  expect(cloud.writes).toBe(writes + 1);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(panel(page)).toContainText('연결됨');
  expect(cloud.writes).toBe(writes + 1);
  expect((await state(page)).settings.goal).toBe('서버에는 저장됐지만 응답이 끊긴 목표');
});
