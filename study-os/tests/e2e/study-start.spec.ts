import { test, expect } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';

const fixture = resolve('tests/fixtures/printed-homework.png');
const aiHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
};
async function mockAI(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (options) => ({
            requestAccessToken: () => {
              (window as typeof window & { requestedScopes?: string }).requestedScopes =
                options.scope;
              options.callback({
                access_token: 'synthetic-token',
                scope: 'https://www.googleapis.com/auth/userinfo.email',
              });
            },
          }),
        },
      },
    };
  });
  await page.route('https://bkit-api.vercel.app/api/config', (route) =>
    route.fulfill({
      headers: aiHeaders,
      json: { googleClientId: 'test.apps.googleusercontent.com', briefingEnabled: true },
    }),
  );
}
const aiResult = {
  mode: 'live',
  missions: [
    {
      title: '수학 학습지 풀기',
      subject: '수학',
      kind: '숙제',
      due: null,
      dueTime: null,
      quantityUnit: 'problems',
      quantityTotal: 20,
      minutes: null,
    },
  ],
};
async function home(page: import('@playwright/test').Page) {
  await page.clock.install({ time: new Date('2026-10-18T06:00:00Z') });
  await page.goto('./');
}
async function state(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{"tasks":[]}'),
  );
}

test('text-only shortcut selects the newly saved task instead of an older recommendation', async ({
  page,
}) => {
  await home(page);
  for (const title of ['수학 이전 과제', '영어 오늘 시작할 과제']) {
    await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
    await page.getByLabel('오늘 해야 할 일').fill(title);
    await page.getByRole('button', { name: '사진 없이 과제 확인하기' }).click();
    await page.getByLabel('과제 1 확인', { exact: true }).check();
    await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  }
  await expect(page.getByRole('region', { name: '지금 할 일과 5분 집중' })).toContainText(
    '영어 오늘 시작할 과제',
  );
  await page.getByRole('button', { name: '5분만 시작' }).click();
  expect((await state(page)).active.action).toBe('영어 오늘 시작할 과제');
});

test('real Korean OCR stays local, is editable, requires confirmation, and keeps photos available during study', async ({
  page,
}) => {
  test.setTimeout(90000);
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const writes: string[] = [],
    foreign: string[] = [],
    ocr: string[] = [];
  page.on('request', (req) => {
    if (!['GET', 'HEAD'].includes(req.method())) writes.push(req.url());
    if (req.url().startsWith('http') && new URL(req.url()).origin !== origin)
      foreign.push(req.url());
    if (req.url().includes('/ocr/')) ocr.push(req.url());
  });
  await home(page);
  await page.getByRole('button', { name: '자료 추가' }).click();
  await page.getByLabel('갤러리 사진', { exact: true }).setInputFiles(fixture);
  await expect(page.locator('.atelier-photo img')).toBeVisible();
  expect(ocr).toEqual([]);
  await page.locator('.photo-text > summary').click();
  await page.getByRole('button', { name: '이 사진 글자 읽기', exact: true }).click();
  const result = page.getByLabel('사진에서 읽은 글자', { exact: true });
  await expect(result).toBeVisible({ timeout: 70000 });
  await expect(result).toHaveValue(/수학.*20/);
  expect((await state(page)).tasks).toEqual([]);
  expect(ocr.length).toBeGreaterThan(2);
  expect(writes).toEqual([]);
  expect(foreign).toEqual([]);
  const a11y = await new AxeBuilder({ page })
    .include('.photo-text')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await result.fill('수학 학습지 20문제');
  await page.getByRole('button', { name: '이 내용으로 과제 확인' }).click();
  await expect(page.getByLabel('과제 1 내용', { exact: true })).toHaveValue('수학 학습지 20문제');
  await expect(page.getByLabel('과제 1 확인', { exact: true })).not.toBeChecked();
  await expect(page.getByRole('button', { name: '확인하고 BKIT에 저장' })).toBeDisabled();
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await page.getByRole('button', { name: '5분만 시작' }).click();
  await page.locator('.focus-materials > summary').click();
  await expect
    .poll(() =>
      page
        .locator('.focus-materials img')
        .evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0)),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole('button', { name: '집중 화면으로' }).click();
  await page.locator('.focus-materials > summary').click();
  await expect(page.locator('.focus-materials img')).toBeVisible();
  expect((await state(page)).active.taskId).toBe((await state(page)).tasks[0].id);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/study-materials-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('canceling an optional OCR download preserves manual capture and confirmed task saving', async ({
  page,
}) => {
  await home(page);
  await page.route('**/ocr/**', async (route) => {
    // Hold initialization until cancellation, then fail. Manual capture must stay usable.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.abort();
  });
  await page.getByRole('button', { name: '자료 추가' }).click();
  await page.getByLabel('갤러리 사진', { exact: true }).setInputFiles(fixture);
  await page.locator('.photo-text > summary').click();
  await page.getByRole('button', { name: '이 사진 글자 읽기', exact: true }).click();
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(
    page.getByText('글자 읽기를 취소했어요. 사진과 작성한 과제는 그대로예요.'),
  ).toBeVisible();
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
  await page.getByLabel('과제 1 과목', { exact: true }).fill('수학');
  await page.getByLabel('과제 1 내용', { exact: true }).fill('직접 입력한 과제');
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await expect(page.getByRole('dialog', { name: 'TOHEŞAR 학습 준비실' })).toHaveCount(0);
  expect((await state(page)).tasks[0].title).toBe('직접 입력한 과제');
  expect((await state(page)).tasks[0].attachmentIds).toHaveLength(1);
});

test.describe('AI briefing', () => {
  // WebKit cannot intercept fetches once a service worker controls the page.
  // These cases simulate API/OAuth; real offline behavior is covered separately.
  test.use({ serviceWorkers: 'block' });
  test('optional AI submits only user text after email-only sign-in and still requires human confirmation', async ({
    page,
  }) => {
    await mockAI(page);
    let calls = 0;
    await page.route('https://bkit-api.vercel.app/api/briefing', async (route) => {
      calls++;
      expect(route.request().postDataJSON()).toEqual({ text: '수학 학습지 20문제' });
      expect(route.request().headers().authorization).toBe('Bearer synthetic-token');
      await route.fulfill({ headers: aiHeaders, json: aiResult });
    });
    await home(page);
    await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
    await page.getByLabel('오늘 해야 할 일').fill('수학 학습지 20문제');
    await page.locator('.briefing-ai > summary').click();
    await page.getByRole('button', { name: 'Google로 연결', exact: true }).click();
    expect(calls).toBe(0);
    expect(
      await page.evaluate(
        () => (window as typeof window & { requestedScopes?: string }).requestedScopes,
      ),
    ).toBe('https://www.googleapis.com/auth/userinfo.email');
    await page.getByRole('button', { name: 'DeepSeek로 과제 정리', exact: true }).click();
    await expect(page.getByLabel('과제 1 내용', { exact: true })).toHaveValue('수학 학습지 풀기');
    await expect(page.getByLabel('과제 1 확인', { exact: true })).not.toBeChecked();
    expect((await state(page)).tasks).toHaveLength(0);
    await page.getByLabel('과제 1 확인', { exact: true }).check();
    await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
    await expect(page.getByRole('dialog', { name: 'TOHEŞAR 학습 준비실' })).toHaveCount(0);
    expect((await state(page)).tasks[0].quantity.total).toBe(20);
    expect(calls).toBe(1);
  });

  test('a late AI reply never replaces text changed by the learner; manual preparation stays available', async ({
    page,
  }) => {
    await mockAI(page);
    let release: (() => void) | undefined;
    await page.route('https://bkit-api.vercel.app/api/briefing', async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({ headers: aiHeaders, json: aiResult });
    });
    await home(page);
    await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
    await page.getByLabel('오늘 해야 할 일').fill('수학 학습지 20문제');
    await page.locator('.briefing-ai > summary').click();
    await page.getByRole('button', { name: 'Google로 연결', exact: true }).click();
    await page.getByRole('button', { name: 'DeepSeek로 과제 정리', exact: true }).click();
    await expect.poll(() => Boolean(release)).toBe(true);
    await page.getByLabel('오늘 해야 할 일').fill('영어 새로 바꾼 과제');
    release!();
    await expect(
      page.getByText('입력 내용이 바뀌었어요. 새 내용으로 다시 정리해 주세요.'),
    ).toBeVisible();
    await page.getByRole('button', { name: '사진 없이 과제 확인하기' }).click();
    await expect(page.getByLabel('과제 1 내용', { exact: true })).toHaveValue(
      '영어 새로 바꾼 과제',
    );
  });
});
