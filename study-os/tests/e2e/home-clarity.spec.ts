import { test, expect } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
import { newState, type Task } from '../../src/model';

test('many tasks do not expand the home; choosing one starts the correct real task', async ({
  page,
}) => {
  const state = newState();
  state.tasks = Array.from({ length: 60 }, (_, i): Task => ({
    id: 'home-fixture-' + i,
    subject: '수학',
    title: '연습 과제 ' + (i + 1),
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
  }));
  await page.clock.install({ time: new Date('2026-10-16T06:00:00Z') });
  await page.addInitScript(
    (s) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(s)),
    state,
  );
  await page.goto('./');
  await expect(page.locator('.now-focus h2')).toHaveText('연습 과제 1');
  await expect(page.locator('.atelier-task')).toHaveCount(60);
  await expect(page.locator('.atelier-task').first()).toBeHidden();
  await expect(page.getByRole('button', { name: '5분만 시작' })).toBeInViewport();
  await page.locator('.now-task-options summary').click();
  await page.getByLabel('시작할 과제', { exact: true }).selectOption('home-fixture-8');
  await expect(page.locator('.now-focus h2')).toHaveText('연습 과제 9');
  await page.getByRole('button', { name: '5분만 시작' }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).active.taskId),
  ).toBe('home-fixture-8');
});

test('first briefing can be typed during the film, and finishing it preserves text and focus', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.removeItem('bkit.atelier.visited.v1'));
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  const input = page.getByLabel('오늘 해야 할 일');
  await expect(page.getByRole('button', { name: '오프닝 건너뛰기' })).toBeVisible();
  await input.fill('영어 수행평가 발표 준비');
  await input.focus();
  const inputTop = (await input.boundingBox())!.y;
  // Complete the film independently from input; the learner keeps their cursor.
  await page
    .getByRole('button', { name: '오프닝 건너뛰기' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(input).toHaveValue('영어 수행평가 발표 준비');
  await expect(input).toBeFocused();
  // Allow the short entrance motion; never a whole film-panel layout jump.
  expect(Math.abs((await input.boundingBox())!.y - inputTop)).toBeLessThan(9);
  await page.getByRole('button', { name: '작성 보관하고 BKIT으로' }).click();
  await page.getByRole('button', { name: '오늘 할 일 정리' }).click();
  await expect(input).toHaveValue('영어 수행평가 발표 준비');
  await expect(page.getByRole('button', { name: '오프닝 건너뛰기' })).toHaveCount(0);
});

test('materials route opens capture directly and preserves a confirmed draft when revisited', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: '자료 추가' }).click();
  await expect(page.getByRole('button', { name: '카메라로 촬영' })).toBeVisible();
  await expect(page.getByRole('button', { name: '갤러리에서 선택' })).toBeVisible();
  await expect(page.getByRole('button', { name: '오프닝 건너뛰기' })).toHaveCount(0);
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
  await page.getByLabel('과제 1 과목', { exact: true }).fill('통합과학');
  await page.getByLabel('과제 1 내용', { exact: true }).fill('실험 보고서');
  await page.getByRole('button', { name: '작성 보관하고 BKIT으로' }).click();
  await page.getByRole('button', { name: '자료 추가' }).click();
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
  await expect(page.getByLabel('과제 1 내용', { exact: true })).toHaveValue('실험 보고서');
});

test('home at 320px fits, has readable controls, and tools and film are accessible', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-16T06:00:00Z') });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await expect(page.locator('.orbit-nav')).toBeVisible();
  await expect(page.locator('.home-entry-action').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.evaluate(() => {
    const nav = document.querySelector('.orbit-nav')!.getBoundingClientRect();
    const actions = [...document.querySelectorAll('.home-entry-action,.now-focus-primary')];
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      actions: actions.map((e) => ({
        height: e.getBoundingClientRect().height,
        bottom: e.getBoundingClientRect().bottom,
        font: parseFloat(getComputedStyle(e).fontSize),
      })),
      navTop: nav.top,
    };
  });
  expect(geometry.overflow).toBe(false);
  expect(geometry.actions).toHaveLength(3);
  expect(geometry.actions.every((a) => a.height >= 44 && a.bottom < geometry.navTop)).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole('button', { name: '더 보기' }).click();
  const tools = await new AxeBuilder({ page })
    .include('dialog')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    tools.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
