import { test, expect } from './local-fixture';
import { newState, taskSchema } from '../../src/model';
import { mkdir } from 'node:fs/promises';
test.setTimeout(120000);
const original = newState();
original.tasks = [
  taskSchema.parse({
    id: 'math',
    subject: '수학',
    title: '수열의 극한 · 교과서 문제를 풀고 풀이를 정리하기',
    kind: '숙제',
    due: null,
    priority: 3,
    minutes: 30,
    remaining: 30,
    status: 'todo',
    submitted: false,
    optional: false,
    notes: '보존할 기존 메모',
    link: '',
  }),
  taskSchema.parse({
    id: 'essay',
    subject: '국어',
    title: '독서 감상문 제출',
    kind: '수행평가',
    due: null,
    priority: 2,
    minutes: 20,
    remaining: 1,
    status: 'done',
    submitted: false,
    optional: false,
    notes: '제출은 직접 확인',
    link: '',
  }),
];
async function prepare(page: import('@playwright/test').Page) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, original);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '오늘도, 한 걸음.' })).toBeVisible();
}
async function fits(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
}
async function shot(page: import('@playwright/test').Page, name: string, project: string) {
  if (name.endsWith('home'))
    await expect(page.getByRole('heading', { name: '오늘도, 한 걸음.' })).toBeVisible();
  await expect(page.locator('main')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(600); // Capture the settled material, after its finite entrance.
  const directory = new URL('../../../qa-premium/', import.meta.url).pathname;
  await mkdir(directory, { recursive: true });
  if (name.includes('settings'))
    await page
      .locator('.study-appearance')
      .screenshot({ path: directory + project + '-' + name + '.png' });
  else
    await page.screenshot({
      path: directory + project + '-' + name + '.png',
      fullPage: name.endsWith('home'),
    });
}
test('one-tap study restores and saves time while preserving existing tasks', async ({
  page,
}, info) => {
  await prepare(page);
  await expect(page.getByRole('region', { name: '오늘 해야 할 일' })).toContainText(
    original.tasks[0].title,
  );
  await expect(page.getByRole('button', { name: '제출 확인 1개 남았어요' })).toBeVisible();
  await expect(page.getByText(/TOHEŞAR|DRAG RACE|CR ·/)).toHaveCount(0);
  await fits(page);
  await shot(page, 'home', info.project.name);
  await page.getByRole('button', { name: '오늘 과제 추가' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'modal', info.project.name);
  await fits(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '오늘 과제 추가' })).toBeFocused();
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '집중', exact: true })).toBeVisible();
  const timer = page.getByRole('region', { name: '바로 시작 타이머' });
  await expect(timer.getByRole('timer')).toBeVisible();
  await shot(page, 'timer', info.project.name);
  await fits(page);
  await timer.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.reload();
  await page.locator('nav:visible').getByRole('button', { name: '집중', exact: true }).click();
  await expect(timer.getByRole('button', { name: '이어하기' })).toBeVisible();
  await timer.getByRole('button', { name: '끝내고 시간 저장' }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(stored.tasks).toEqual(original.tasks);
  expect(stored.quickTimer).toBeNull();
  expect(stored.sessions).toHaveLength(1);
});
test('themes, settings, search and larger text fit the device', async ({ page }, info) => {
  await prepare(page);
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  const themes = page.getByRole('group', { name: '테마 미리보기 선택' });
  await expect(themes.getByRole('button')).toHaveCount(4);
  for (const [id, name] of [
    ['forest', 'Forest Dark'],
    ['glass', 'Liquid Glass'],
    ['jelly', 'Soft Jelly'],
    ['classic', 'Classic Light'],
  ]) {
    await themes.getByRole('button', { name: new RegExp(name) }).click();
    await page.getByRole('button', { name: '이 테마 적용', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', id);
    await fits(page);
    await shot(page, id + '-settings', info.project.name);
    await page.locator('nav:visible').getByRole('button', { name: '오늘', exact: true }).click();
    await shot(page, id + '-home', info.project.name);
    await fits(page);
    await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  }
  const experimental = page.locator('.awake-assist');
  await expect(experimental).not.toHaveAttribute('open', '');
  await expect(experimental.locator('video')).not.toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(stored.tasks).toEqual(original.tasks);
  await page.locator('nav:visible').getByRole('button', { name: '오늘', exact: true }).click();
  await page.evaluate(() => (document.documentElement.style.fontSize = '20px'));
  await fits(page);
  await page.getByRole('searchbox', { name: 'BKIT 기능 및 학습 사이트 검색' }).fill('EBS');
  await expect(page.getByRole('region', { name: '통합검색 결과' })).toBeVisible();
  await fits(page);
  await shot(page, 'search-large-text', info.project.name);
  await page.keyboard.press('Escape');
  await page.locator('nav:visible').getByRole('button', { name: '도구', exact: true }).click();
  await page.getByRole('button', { name: 'BKIT AI ZONE', exact: true }).click();
  await expect(page.getByRole('region', { name: 'BKIT AI ZONE' })).toBeVisible();
  await fits(page);
  await shot(page, 'ai', info.project.name);
});

test('수행 등록 opens the assessment form and saves a visible assessment without changing older tasks', async ({
  page,
}, info) => {
  await prepare(page);
  await page.getByRole('button', { name: '수행 등록', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '수행평가 등록', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: '종류', exact: true })).toHaveValue('수행평가');
  await dialog.getByLabel('과목', { exact: true }).fill('영어');
  await dialog.getByLabel('과제 이름 · 바로 할 행동', { exact: true }).fill('영어 발표 준비');
  await dialog.getByRole('button', { name: '과제 저장', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '할 일', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /영어.*영어 발표 준비/ })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(data.tasks.slice(0, 2)).toEqual(original.tasks);
  expect(data.tasks.at(-1)).toMatchObject({
    kind: '수행평가',
    subject: '영어',
    title: '영어 발표 준비',
    submitted: false,
  });
  await page.reload();
  await page.locator('nav:visible').getByRole('button', { name: '과제', exact: true }).click();
  await expect(page.getByRole('button', { name: /영어.*영어 발표 준비/ })).toBeVisible();
  await fits(page);
  await shot(page, 'assessment-saved', info.project.name);
});

test('BKIT motion is independent of device reduced motion and persists its own choice', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page);
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'auto');
  expect(await page.locator('main').evaluate((el) => getComputedStyle(el).animationName)).not.toBe(
    'none',
  );
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.getByRole('combobox', { name: '테마 움직임', exact: true }).selectOption('off');
  await page.getByRole('button', { name: '이 테마 적용', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  expect(await page.locator('main').evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'none',
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.getByRole('combobox', { name: '테마 움직임', exact: true }).selectOption('auto');
  await page.getByRole('button', { name: '이 테마 적용', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'auto');
});
