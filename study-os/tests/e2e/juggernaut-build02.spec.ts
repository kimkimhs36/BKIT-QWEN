import { test, expect } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
import { KEY } from '../../src/juggernaut/engine';
// These new scenarios traverse several complete spaces or audit four documents.
// Keep the inherited BUILD 01 tests and their original timeout untouched.
test.setTimeout(60000);
const visit = async (page: import('@playwright/test').Page, path = '') => {
  await page.goto('juggernaut/' + path);
  await expect(page.locator('.jg-build02')).toBeVisible();
};
const fit = async (page: import('@playwright/test').Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
test('knowledge selection → persisted attempt → evidence studio → next study', async ({
  page,
}, info) => {
  await visit(page);
  await page.getByRole('button', { name: '개념의 연결을 따라가기' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page
    .locator('.jg-map-list')
    .getByRole('button', { name: /음수 계수/ })
    .click();
  await page.getByRole('button', { name: '이 개념 학습 시작' }).click();
  await expect(page.locator('.jg-stem')).toContainText('−2x');
  await page.getByRole('radio', { name: '2', exact: true }).check();
  await page
    .getByRole('textbox', { name: '풀이 설명', exact: true })
    .fill('양변에서 3을 빼고 -2로 나누어 검산했다.');
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await page.reload();
  await expect(page.getByText('첫 답변:', { exact: false })).toBeVisible();
  await page
    .locator('.jg-dock')
    .getByRole('link', { name: /PERFORMANCE STUDIO/ })
    .click();
  await expect(page.locator('.jg-studio-stats')).toContainText('1 / 1');
  await expect(page.locator('.jg-growth-table')).toContainText('1');
  const d = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(d.attempts).toHaveLength(1);
  expect(d.attempts[0].questionId).toBe('negative-0');
  await page.screenshot({ path: info.outputPath('studio-populated.png'), fullPage: true });
  await fit(page);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '다음 학습으로 연결' }).click();
  await expect(page.getByRole('button', { name: '첫 답변 제출' })).toBeVisible();
});
test('arrival can skip, replay and start; reduced motion leaves scene static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page, 'arrival');
  await expect(page.getByText('01 / THE ARCHIVE', { exact: true })).toBeVisible();
  await expect(page.getByText('정적 연출', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '오프닝 건너뛰기' }).click();
  await expect(page.getByRole('button', { name: '지금 첫 문제 시작' })).toBeVisible();
  await page.getByRole('button', { name: /시네마틱 진입/ }).click();
  await page.getByRole('button', { name: '3번 장면' }).click();
  await page.getByRole('button', { name: '학습 시작', exact: true }).click();
  await expect(page.getByRole('button', { name: '첫 답변 제출' })).toBeVisible();
  expect(await page.locator('.jg-portal').count()).toBe(0);
  await expect(page.locator('html')).toHaveAttribute('data-material-studying', 'true');
});
test('nine real materials, low power, keyboard dismissal, preferences persist', async ({
  page,
}) => {
  await visit(page);
  await page.getByRole('button', { name: '재질 테마 설정 열기' }).click();
  const ids = [
      'classic',
      'forest',
      'glass',
      'peach',
      'diamond',
      'gold',
      'jelly',
      'droplets',
      'night',
    ],
    names = [
      'Classic Light',
      'Forest Dark',
      'Liquid Glass',
      'Peach Flow',
      'Diamond',
      'Champagne Gold',
      'Soft Jelly',
      'Living Droplets',
      'Night Sprint',
    ];
  const surfaces = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    await page.getByRole('button', { name: names[i], exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', ids[i]);
    surfaces.add(
      await page
        .locator('.jg-next-action .jg-primary')
        .evaluate((e) => getComputedStyle(e).backgroundImage),
    );
  }
  expect(surfaces.size).toBe(9);
  await page.getByRole('switch', { name: '배터리 절약' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: '재질 테마 설정 열기' })).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'night');
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await fit(page);
});
test('existing ink engine draws in temporary paper; narrow/rotated layouts fit', async ({
  page,
}, info) => {
  await visit(page);
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
  const canvas = page.getByTestId('ink-canvas');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const before = await page
    .locator('.paper-ink.saved')
    .evaluate((e: HTMLCanvasElement) => e.toDataURL());
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect(
    await page.locator('.paper-ink.saved').evaluate((e: HTMLCanvasElement) => e.toDataURL()),
  ).not.toBe(before);
  await expect(page.getByRole('button', { name: '되돌리기', exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('training-ink.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: '되돌리기', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 844, height: 390 });
  await fit(page);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).attempts.length, KEY),
  ).toBe(0);
});
test('core spaces have no serious accessibility violations, readable theme and no horizontal overflow', async ({
  page,
}, info) => {
  for (const path of ['', 'map', 'progress', 'roadmap']) {
    await visit(page, path);
    await expect(page.locator('.jg-main h1')).toBeVisible();
    if (path === 'map') await expect(page.locator('.react-flow__node')).toHaveCount(3);
    await fit(page);
    const result = await new AxeBuilder({ page })
      .include('.jg-build02')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath((path || 'command') + '.png'),
      fullPage: true,
      animations: 'disabled',
    });
  }
});

test('numeric sign keypad preserves first answer and scores a fresh short-answer retry', async ({
  page,
}) => {
  await visit(page);
  await page.getByRole('button', { name: '지금 첫 문제 시작' }).click();
  await page.getByRole('radio', { name: '1', exact: true }).check();
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await page.getByRole('button', { name: '개념 복구 후 새 문제 재도전' }).click();
  await page.getByText('숫자·부호 입력 도구', { exact: true }).click();
  await page.locator('.jg-number-pad').getByRole('button', { name: '2', exact: true }).click();
  await page.locator('.jg-number-pad').getByRole('button', { name: '−', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'x의 값', exact: true })).toHaveValue('-2');
  await page
    .getByRole('textbox', { name: '풀이 설명', exact: true })
    .fill('양변에서 4를 빼고 대입하여 확인했다.');
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await expect(page.getByText('정답입니다.', { exact: true })).toBeVisible();
  const answers = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).attempts.map((a: { answer: string }) => a.answer),
    KEY,
  );
  expect(answers).toEqual(['1', '-2']);
});
