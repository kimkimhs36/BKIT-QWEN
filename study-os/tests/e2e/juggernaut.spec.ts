import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { KEY, DAY } from '../../src/juggernaut/engine';
import { questionById } from '../../src/juggernaut/content';
import { createJuggernautApi } from '../../server/juggernautApi';
import type { AddressInfo } from 'node:net';
const time = Date.parse('2026-10-25T04:00:00Z');
async function visit(page: Page, path = '') {
  await page.goto('juggernaut' + (path ? '/' + path : '/'));
  await expect(page.locator('.jg-os')).toBeVisible();
}
async function current(page: Page) {
  return page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key)!);
    return d.sessions.sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0];
  }, KEY);
}
async function solve(page: Page, value?: string) {
  const s = await current(page);
  const q = questionById(s.questionId),
    answer = value ?? q.answer;
  if (q.options) await page.getByRole('radio', { name: answer, exact: true }).check();
  else await page.getByRole('textbox', { name: 'x의 값', exact: true }).fill(answer);
  await page
    .getByRole('textbox', { name: '풀이 설명', exact: true })
    .fill('양변에서 상수를 빼고 계수로 나누어 검산했다.');
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
}
async function fit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth + 1),
  );
}
test('real wrong answer → recovery → independent transfer → tomorrow review; resume and duplicate safety', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time });
  await visit(page);
  await expect(page.getByText('아직 학습 기록이 없어요.', { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('command-center.png'), fullPage: true });
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
  await page.getByRole('button', { name: '힌트 0/2' }).click();
  await page.getByRole('radio', { name: '1', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: '1', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '힌트 1/2' })).toBeVisible();
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await expect(page.getByText('다시 연결해 봅시다.')).toBeVisible();
  await page.getByRole('combobox', { name: '오류 원인', exact: true }).selectOption('A');
  await page.getByRole('button', { name: '개념 복구 후 새 문제 재도전' }).click();
  await expect(page.getByRole('textbox', { name: 'x의 값', exact: true })).toBeVisible();
  await solve(page);
  await page.reload();
  await expect(page.getByText('힌트 없는 정답을 관찰했어요.', { exact: false })).toBeVisible();
  const recorded = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).attempts,
    KEY,
  );
  expect(recorded).toHaveLength(2);
  expect(recorded.find((a: any) => a.answer === '1')).toMatchObject({ hints: 1, error: 'A' });
  await page.screenshot({ path: testInfo.outputPath('transfer-feedback.png'), fullPage: true });
  await fit(page);
  await page.getByRole('button', { name: '결과 확인 / 다음 단계' }).click();
  await page.getByRole('button', { name: 'COMMAND CENTER로', exact: true }).click();
  await page.clock.setFixedTime(time + DAY + 60000);
  await page.reload();
  await expect(page.getByText('기억을 다시 꺼낼 시간.')).toBeVisible();
  await page.getByRole('button', { name: '오늘의 학습 시작' }).click();
  await solve(page);
  const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).attempts, KEY);
  expect(after).toHaveLength(3);
  expect(after.filter((a: any) => a.kind === 'review')).toHaveLength(1);
  await page.getByRole('button', { name: '결과 확인 / 다음 단계' }).click();
  await expect(page.getByText('오늘의 답변을 남겼습니다.')).toBeVisible();
});
test('free practice never persists answers or becomes a saved resume session', async ({ page }) => {
  await visit(page);
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await page.getByRole('button', { name: '저장 없는 자유 연습' }).click();
  await page.getByRole('button', { name: '힌트 0/2' }).click();
  await page.getByRole('radio', { name: '2', exact: true }).check();
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await expect(page.getByText('자유 연습 · 저장하지 않음')).toBeVisible();
  await page.getByRole('button', { name: '연습 화면 나가기' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  await page.reload();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
  await expect(page.getByRole('button', { name: '지금 첫 문제 시작' })).toBeVisible();
});
test('direct routes, browser back, menu toggle, light/dark, keyboard, and legacy BKIT navigation', async ({
  page,
}, testInfo) => {
  await visit(page, 'diagnosis');
  await expect(page.getByRole('heading', { name: '내 출발점을 확인하세요.' })).toBeVisible();
  await page.getByRole('button', { name: '수학 진단 시작' }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: '내 출발점을 확인하세요.' })).toBeVisible();
  const menu = page.getByRole('button', { name: '메뉴 열기', exact: true });
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole('button', { name: '메뉴 닫기', exact: true }).click();
    await expect(page.locator('.jg-sidebar')).toBeHidden();
  }
  await page.getByRole('button', { name: '어두운 테마', exact: true }).click();
  await expect(page.locator('.jg-os')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('dark-diagnostics.png'), fullPage: true });
  await fit(page);
  for (const path of ['review', 'roadmap', 'progress']) {
    await visit(page, path);
    await page.reload();
    await expect(page.locator('.jg-main h1')).toBeVisible();
    await fit(page);
  }
  await page.keyboard.press('Tab');
  if (await page.getByRole('button', { name: '메뉴 열기', exact: true }).isVisible())
    await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('button', { name: 'BKIT으로 돌아가기' }).click();
  await expect(page.locator('.jg-os')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toBeVisible();
});
test('device quota failure preserves the visible answer and offers export; corrupt originals remain unchanged', async ({
  page,
}) => {
  await visit(page);
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
  await page.evaluate((key) => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.startsWith(key)) throw new DOMException('QuotaExceeded', 'QuotaExceededError');
      return real.call(this, k, v);
    };
  }, KEY);
  await page.getByRole('radio', { name: '2', exact: true }).check();
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await expect(page.getByRole('alert')).toContainText('저장에 실패');
  await expect(page.locator('.jg-status')).toContainText('기기 저장 실패');
  await expect(page.getByText('첫 답변:')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '현재 화면 내보내기' }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('backup');
  await page.evaluate((key) => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.evaluate((key) => localStorage.setItem(key, 'corrupt-original'), KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('원본을 보호');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('corrupt-original');
});
test('offline draft survives a reload and never claims server acknowledgment', async ({
  page,
  context,
}) => {
  await visit(page);
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.getByRole('radio', { name: '2', exact: true }).check();
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await expect(page.locator('.jg-status')).not.toContainText('서버에 저장됨');
  await page.reload();
  await expect(page.getByText('첫 답변:')).toBeVisible();
  await context.setOffline(false);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).attempts.length, KEY),
  ).toBe(1);
});
test('existing session + real API adapter: failed/lost ACK, reconnect, idempotency and expiry', async ({
  page,
  context,
}) => {
  const map = new Map<string, string>();
  let fail = false,
    dropAck = false,
    writes = 0;
  const api = createJuggernautApi(
    {
      BKIT_OWNER_EMAIL: 'synthetic@example.test',
      BKIT_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
    },
    {
      command: async (args) => {
        if (args[0] === 'GET' && args[1].startsWith('bkit:sync-session:'))
          return String(Date.now() + DAY);
        if (fail) throw Error('Synthetic outage');
        if (args[0] === 'GET') return map.get(args[1]) ?? null;
        if (args[0] === 'EVAL') {
          const current = JSON.parse(map.get(args[3]) || '{"version":0}');
          if (current.version !== Number(args[4])) return [0, current.version];
          map.set(
            args[3],
            JSON.stringify({ version: current.version + 1, document: JSON.parse(args[5]) }),
          );
          writes++;
          return [1, current.version + 1];
        }
        throw Error('Unexpected command');
      },
    },
  );
  const server = api.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  let expire = false;
  try {
    await context.route('**/api/sync', (r) =>
      r.fulfill({ json: { version: 1, state: newState() } }),
    );
    await context.route('**/api/juggernaut', async (route) => {
      if (expire) return route.fulfill({ status: 401, json: { error: 'expired' } });
      const request = route.request();
      const res = await fetch(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/juggernaut`,
        {
          method: request.method(),
          headers: {
            Authorization: request.headers().authorization || '',
            Origin: 'https://teambkit.com',
            'Content-Type': 'application/json',
          },
          body: request.postData(),
        },
      );
      if (dropAck && request.method() === 'PUT') {
        dropAck = false;
        return route.abort('failed');
      }
      await route.fulfill({
        status: res.status,
        body: await res.text(),
        contentType: 'application/json',
      });
    });
    await visit(page);
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('bkit-auth-v1', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('credentials');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const t = r.result.transaction('credentials', 'readwrite');
          t.objectStore('credentials').put(
            { token: 'bkit_sync_' + 'a'.repeat(64), expiresAt: Date.now() + 86400000 },
            'sync',
          );
          t.oncomplete = () => {
            r.result.close();
            resolve();
          };
        };
      });
    });
    await page.reload();
    await expect(page.locator('.jg-status')).toContainText('서버에 저장됨');
    fail = true;
    await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
    await solve(page);
    await expect(page.locator('.jg-status')).toContainText('동기화 실패');
    const localCount = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).attempts.length,
      KEY,
    );
    expect(localCount).toBe(1);
    fail = false;
    dropAck = true;
    await page.getByRole('button', { name: '동기화', exact: true }).click();
    await expect(page.locator('.jg-status')).toContainText('동기화 실패');
    await page.getByRole('button', { name: '동기화', exact: true }).click();
    await expect(page.locator('.jg-status')).toContainText('서버에 저장됨');
    expect(
      [...map.values()].map((v) => JSON.parse(v)).find((v) => v.document)?.document.attempts,
    ).toHaveLength(1);
    expect(writes).toBeGreaterThan(1);
    expire = true;
    await page.getByRole('button', { name: '동기화', exact: true }).click();
    await expect(page.locator('.jg-status')).toContainText('로그인이 만료');
    expect(
      await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).attempts.length, KEY),
    ).toBe(1);
  } finally {
    server.close();
  }
});
