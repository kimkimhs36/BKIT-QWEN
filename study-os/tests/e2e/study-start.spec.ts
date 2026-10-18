import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';

const fixture = resolve('tests/fixtures/printed-homework.png');
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
