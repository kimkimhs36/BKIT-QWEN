import { test, expect, type Page } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
test.use({ storageState: { cookies: [], origins: [] } });
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRR8AAAAASUVORK5CYII=',
  'base64',
);
async function arrive(page: Page) {
  await page.clock.install({ time: new Date('2026-10-16T06:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  const skip = page.getByRole('button', { name: '오프닝 건너뛰기' });
  if (await skip.isVisible()) await skip.click();
}
async function prepare(page: Page, text = '내일 수학 학습지 20문제') {
  await page.getByLabel('오늘 해야 할 일').fill(text);
  await page.getByRole('button', { name: '오늘의 자료 모으기' }).click();
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
}
async function state(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{"tasks":[]}'),
  );
}
test('first visit is cinematic and skippable; returning visit goes directly to TODAY', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  const skip = page.getByRole('button', { name: '오프닝 건너뛰기' });
  await expect(page.getByLabel('오늘 해야 할 일')).toBeVisible();
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page.getByLabel('오늘 해야 할 일')).toBeVisible();
  await page.getByRole('button', { name: '작성 보관하고 BKIT으로' }).click();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'TOHEŞAR 학습 준비실' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
});
test('briefing, multi-photo picker, persisted review, real TODAY save, duplicate replay and focus launch', async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'GET' && req.method() !== 'HEAD') uploads.push(req.url());
  });
  await arrive(page);
  await page.getByLabel('오늘 해야 할 일').fill('내일 수학 학습지 20문제\n영어 발표 준비');
  await page.getByRole('button', { name: '오늘의 자료 모으기' }).click();
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '갤러리에서 선택' }).click();
  await (
    await picker
  ).setFiles([
    { name: 'worksheet.png', mimeType: 'image/png', buffer: png },
    {
      name: 'notice.png',
      mimeType: 'image/png',
      buffer: Buffer.concat([png, Buffer.from('different fixture')]),
    },
  ]);
  await expect(page.locator('.atelier-photo')).toHaveCount(2);
  await expect
    .poll(() =>
      page
        .locator('.atelier-photo img')
        .evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0)),
    )
    .toBe(true);
  await expect(page.getByText('사진을 안전하게 보관하고 있어요.')).toHaveCount(0);
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
  await expect(page.getByLabel('과제 1 마감일', { exact: true })).toHaveValue('');
  await page.getByLabel('과제 1 마감일', { exact: true }).fill('2026-10-21');
  await page.getByLabel('과제 1 예상 시간', { exact: true }).fill('35');
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByLabel('과제 2 확인', { exact: true }).check();
  const replay = await page.evaluate(() => localStorage.getItem('bkit.atelier.draft.v1'));
  await page.reload();
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  await expect(page.getByLabel('과제 1 예상 시간', { exact: true })).toHaveValue('35');
  await expect(page.getByLabel('과제 1 확인', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await expect(page.getByRole('dialog', { name: 'TOHEŞAR 학습 준비실' })).toHaveCount(0);
  const saved = await state(page);
  expect(saved.tasks).toHaveLength(2);
  expect(saved.tasks[0]).toMatchObject({
    minutes: 35,
    deadline: { date: '2026-10-21', precision: 'date-only', provenance: 'user-confirmed' },
  });
  expect(saved.tasks[0].attachmentIds).toHaveLength(2);
  expect(saved.tasks[1].due).toBeNull();
  await page.locator('.today-more > summary').click();
  await expect(page.getByRole('region', { name: '오늘 실행할 과제' })).toContainText(
    '수학 학습지 20문제',
  );
  await page.getByRole('button', { name: '내 자료 2장' }).first().click();
  await expect(
    page.getByRole('dialog', { name: '과제의 비공개 학습 자료' }).locator('img'),
  ).toHaveCount(2);
  await page.getByRole('button', { name: '자료 닫기' }).click();
  await page.locator('.today-more > summary').click();
  await page.evaluate((raw) => localStorage.setItem('bkit.atelier.draft.v1', raw!), replay);
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await expect(page.getByRole('dialog', { name: 'TOHEŞAR 학습 준비실' })).toHaveCount(0);
  expect((await state(page)).tasks).toHaveLength(2);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: '5분만 시작' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/is-focusing/);
  expect((await state(page)).active).toMatchObject({
    taskId: saved.tasks[0].id,
    target: 5,
    action: '내일 수학 학습지 20문제',
  });
  expect(uploads).toEqual([]);
});
test('camera chooser, photo-only manual registration, duplicate images, removal and reattachment', async ({
  page,
}) => {
  await arrive(page);
  await page.getByRole('button', { name: '오늘의 자료 모으기' }).click();
  await expect(page.getByLabel('카메라 사진', { exact: true })).toHaveAttribute(
    'capture',
    'environment',
  );
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '카메라로 촬영' }).click();
  await (await picker).setFiles({ name: 'camera.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.atelier-photo')).toHaveCount(1);
  await page
    .getByLabel('갤러리 사진', { exact: true })
    .setInputFiles({ name: 'same-image.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('사진을 안전하게 보관하고 있어요.')).toHaveCount(0);
  await expect(page.locator('.atelier-photo')).toHaveCount(1);
  await page.getByRole('button', { name: 'camera.png 첨부 해제' }).click();
  await expect(page.locator('.atelier-photo')).toHaveCount(0);
  await page
    .getByLabel('갤러리 사진', { exact: true })
    .setInputFiles({ name: 'camera.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.atelier-photo')).toHaveCount(1);
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
  await expect(page.getByLabel('과제 1 내용', { exact: true })).toHaveValue('');
  await page.getByLabel('과제 1 과목', { exact: true }).fill('통합과학');
  await page.getByLabel('과제 1 내용', { exact: true }).fill('실험 보고서 준비');
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await expect(page.getByRole('dialog', { name: 'TOHEŞAR 학습 준비실' })).toHaveCount(0);
  expect((await state(page)).tasks[0]).toMatchObject({
    subject: '통합과학',
    title: '실험 보고서 준비',
    due: null,
  });
});
test('draft survives dismissal and refresh; changed fields reset confirmation', async ({
  page,
}) => {
  await arrive(page);
  await prepare(page);
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByLabel('과제 1 예상 시간', { exact: true }).fill('40');
  await expect(page.getByLabel('과제 1 확인', { exact: true })).not.toBeChecked();
  await expect(page.getByRole('button', { name: '확인하고 BKIT에 저장' })).toBeDisabled();
  await page.getByRole('button', { name: '작성 보관하고 BKIT으로' }).click();
  await page.reload();
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  await expect(page.getByLabel('과제 1 예상 시간', { exact: true })).toHaveValue('40');
  expect((await state(page)).tasks).toHaveLength(0);
});
test('failed task save keeps the complete draft and gives an actionable error', async ({
  page,
}) => {
  await arrive(page);
  await prepare(page);
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'bkit.study-os.v1') throw new DOMException('full', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
  await expect(page.locator('.atelier-error')).toContainText('저장하지 못했습니다');
  expect((await state(page)).tasks).toHaveLength(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.atelier.draft.v1')!).missions[0].title,
    ),
  ).toContain('수학');
});
test('no horizontal overflow, usable targets, reduced motion and accessible preparation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await arrive(page);
  for (const action of [
    async () => {},
    async () => page.getByRole('button', { name: '오늘의 자료 모으기' }).click(),
    async () => page.getByRole('button', { name: '과제 준비하기', exact: true }).click(),
  ]) {
    await action();
    const geometry = await page.locator('dialog.atelier').evaluate((el) => ({
      fits: el.scrollWidth <= el.clientWidth + 1,
      inputSizes: [...el.querySelectorAll('input:not([type=checkbox]),textarea,select')]
        .filter((e) => (e as HTMLElement).offsetHeight > 0)
        .map((e) => parseFloat(getComputedStyle(e).fontSize)),
    }));
    expect(geometry.fits).toBe(true);
    expect(geometry.inputSizes.every((n) => n >= 16)).toBe(true);
    const a11y = await new AxeBuilder({ page })
      .include('dialog.atelier')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      a11y.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
});
test('invalid attachment is rejected without dropping the briefing', async ({ page }) => {
  await arrive(page);
  await page.getByLabel('오늘 해야 할 일').fill('영어 발표 준비');
  await page.getByRole('button', { name: '오늘의 자료 모으기' }).click();
  await page.getByLabel('갤러리 사진', { exact: true }).setInputFiles({
    name: 'not-a-photo.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test'),
  });
  await expect(page.locator('.atelier-error')).toContainText('사진 파일');
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByLabel('오늘 해야 할 일')).toHaveValue('영어 발표 준비');
});

test('returning TODAY remains readable at 320px with accessible contrast', async ({ page }) => {
  await arrive(page);
  await page.getByRole('button', { name: '작성 보관하고 BKIT으로' }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
