import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, type State } from '../../src/model';
import AxeBuilder from '@axe-core/playwright';
const key = 'bkit.study-os.v1';
const read = (page: Page): Promise<State> =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
async function prepare(page: Page) {
  const state = newState();
  state.tasks = [
    taskSchema.parse({
      id: 'real',
      title: '교과서 문제 직접 풀기',
      subject: '수학',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, state);
  await page.goto('./');
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
}
test('an unfinished written answer survives immediate reload and only submission counts as an attempt', async ({
  page,
}) => {
  await prepare(page);
  await page.getByText('학습 자료 · 문제 풀이', { exact: true }).click();
  await page.getByLabel('지금 풀 문제 또는 떠올릴 질문').fill('내가 고른 교과서 질문');
  await page.getByLabel('자료 출처 (선택)').fill('내 교과서');
  await page.getByRole('button', { name: '문제 정하고 시작' }).click();
  await page.getByLabel('내 답을 먼저 써보기', { exact: true }).fill('아직 완성하지 않은 내 답');
  await page.reload();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(page.getByLabel('내 답을 먼저 써보기', { exact: true })).toHaveValue(
    '아직 완성하지 않은 내 답',
  );
  expect((await read(page)).active?.workspace?.attempts).toHaveLength(0);
  expect(
    (await read(page)).learningEvents?.filter((e) => e.type === 'FirstLearningAttempt'),
  ).toHaveLength(0);
  await page.getByRole('button', { name: '내 답 저장', exact: true }).click();
  let state = await read(page);
  expect(state.active?.workspace?.attempts[0].answer).toBe('아직 완성하지 않은 내 답');
  expect(state.active?.workspace?.answerDraft).toBe('');
  expect(state.learningEvents?.filter((e) => e.type === 'FirstLearningAttempt')).toHaveLength(1);
  await page.getByRole('button', { name: '다시 풀어야 해', exact: true }).click();
  await page.getByLabel('다시 풀고 내 답 남기기', { exact: true }).fill('두 번째 답 초안');
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await expect(page.getByLabel('다시 풀고 내 답 남기기', { exact: true })).toHaveValue(
    '두 번째 답 초안',
  );
  state = await read(page);
  expect(state.active?.workspace?.attempts).toHaveLength(1);
});

test('failed draft writes keep input visible, block navigation and allow retry', async ({
  page,
}) => {
  await prepare(page);
  await page.getByText('내 답 · 막힌 부분 메모 (선택)', { exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restoreStudyStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (k, value) {
      if (k === 'bkit.study-os.v1') throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, k, value);
    };
  });
  await page.getByLabel('지금 문제와 내 생각').fill('잃으면 안 되는 생각');
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: '집중', exact: true })).toBeVisible();
  await expect(page.getByLabel('지금 문제와 내 생각')).toHaveValue('잃으면 안 되는 생각');
  await expect(page.getByRole('button', { name: '메모 다시 저장' })).toBeVisible();
  expect((await read(page)).active?.learningStep).toBeUndefined();
  await page.evaluate(() => (window as any).restoreStudyStorage());
  // A failed flush must cancel the old debounce; it cannot remove the retry control mid-tap.
  await page.clock.runFor(600);
  await expect(page.getByRole('button', { name: '메모 다시 저장' })).toBeVisible();
  expect((await read(page)).active?.learningStep).toBeUndefined();
  await page.getByRole('button', { name: '메모 다시 저장' }).click();
  expect((await read(page)).active?.learningStep?.note).toBe('잃으면 안 되는 생각');
});

test('learning actions and notes have accessible controls and fit a narrow viewport', async ({
  page,
}, info) => {
  if (info.project.name.includes('iphone')) await page.setViewportSize({ width: 320, height: 740 });
  await prepare(page);
  const notice = await page.locator('.toast').boundingBox();
  const controls = await page.locator('.focus-actions').boundingBox();
  if (notice) expect(notice.y + notice.height).toBeLessThanOrEqual(controls!.y);
  await expect(page.getByRole('timer', { name: '집중 타이머', exact: true })).toBeInViewport();
  await expect(
    page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }),
  ).toBeInViewport();
  const firstButton = await page.getByRole('button', { name: '첫 문제 시도했어요' }).boundingBox();
  const dock = page.getByRole('navigation', { name: '주 메뉴', exact: true });
  if (await dock.isVisible()) {
    const box = await dock.boundingBox();
    expect(firstButton!.y + firstButton!.height).toBeLessThanOrEqual(box!.y);
  }
  await page.getByRole('button', { name: '첫 문제 시도했어요' }).click();
  await expect(page.getByRole('group', { name: '첫 시도 다음 행동' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath('focus-next.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('all existing themes preserve the linked session, first attempt and private note', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const { materials } = await import('../../src/themes/material');
  await prepare(page);
  await page.getByRole('button', { name: '첫 문제 시도했어요' }).click();
  await page.getByText('내 답 · 막힌 부분 메모 (선택)', { exact: true }).click();
  await page.getByLabel('지금 문제와 내 생각').fill('테마를 바꿔도 남을 내 답');
  await page.getByLabel('지금 문제와 내 생각').blur();
  const before = await read(page);
  await page.getByRole('button', { name: 'BKIT 로고 · 테마 선택' }).click();
  for (const theme of materials) {
    await page.getByRole('button', { name: theme.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', theme.id);
    const contrast = await page.locator('.focus-readout .timer').evaluate((node) => {
      const resolve = document.createElement('span');
      resolve.style.color = 'var(--mat-bg)';
      document.body.append(resolve);
      const background = getComputedStyle(resolve).color;
      resolve.remove();
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((c) => {
            const n = c / 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const values = [luminance(getComputedStyle(node).color), luminance(background)].sort(
        (a, b) => a - b,
      );
      return (values[1] + 0.05) / (values[0] + 0.05);
    });
    // Animated digits have an image label, so axe can miss inherited low-contrast nature colors.
    expect(contrast, `${theme.name} clock contrast`).toBeGreaterThanOrEqual(4.5);

    const saved = await read(page);
    expect(saved.active).toEqual(before.active);
    expect(saved.learningEvents).toEqual(before.learningEvents);
    expect(saved.tasks).toEqual(before.tasks);
  }
  await page.getByRole('button', { name: 'Night Sprint', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  const scan = await new AxeBuilder({ page })
    .include('.focus-card')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath('night-focus.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'night');
  expect((await read(page)).active?.learningStep).toEqual(before.active?.learningStep);
});
