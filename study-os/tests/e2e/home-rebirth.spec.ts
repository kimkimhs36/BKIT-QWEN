import { test, expect, type Page } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
import { newState, taskSchema, type State } from '../../src/model';
import { materials } from '../../src/themes/material';
// Immediate offline study must work before a service-worker precache finishes.
test.use({ serviceWorkers: 'block' });
const read = (page: Page): Promise<State> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
function populated() {
  const state = newState();
  state.tasks = Array.from({ length: 5 }, (_, i) =>
    taskSchema.parse({
      id: 'task-' + i,
      title: i === 0 ? '극한 학습지 풀기' : '확인할 과제 ' + i,
      subject: '수학',
      kind: i === 4 ? '수행평가' : '숙제',
      due: null,
      deadline: { date: '2026-10-22', precision: 'date-only', provenance: 'user-confirmed' },
      minutes: 25,
      remaining: 25,
      status: i === 4 ? 'done' : 'todo',
      submitted: false,
      priority: 2,
      optional: false,
      notes: '',
      link: '',
    }),
  );
  state.schedules = [
    {
      id: 'academy',
      title: '수학 학원',
      subject: '수학',
      kind: 'academy',
      days: [4],
      date: '2026-10-22',
      start: '18:00',
      end: '19:00',
      prep: 0,
      travel: 0,
      buffer: 0,
      materials: '',
      excluded: [],
    },
  ];
  return state;
}
async function seed(page: Page, state = populated()) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, state);
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
}

test('home hierarchy fits 320–1440px with an actionable hero and bounded task list', async ({
  page,
}, info) => {
  await seed(page);
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
    await page.evaluate(() => scrollTo(0, 0));
    const start = page.getByRole('button', { name: '지금 공부 시작', exact: true });
    await expect(start).toBeInViewport();
    const box = (await start.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    const dock = page.getByRole('navigation', { name: '주 메뉴', exact: true });
    if (await dock.isVisible())
      expect(box.y + box.height).toBeLessThan((await dock.boundingBox())!.y);
    // The visible CTA must actually receive the tap, including after responsive changes.
    expect(
      await start.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await expect(page.locator('.rebirth-task')).toHaveCount(3);
    if ([320, 390, 768, 1024, 1440].includes(width))
      await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
  }
  await expect(page.getByRole('region', { name: '다음 일정' })).toContainText('수학 학원');
  await expect(page.getByRole('button', { name: '제출 확인 1개 남았어요' })).toBeVisible();
});

test('direct assessment capture, materials, full calendar and settings preserve the existing store', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '수행평가 등록', exact: true }).click();
  await expect(
    page
      .getByRole('group', { name: '등록 종류' })
      .getByRole('button', { name: '수행평가', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('과학 실험 보고서');
  await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
  const before = await read(page);
  expect(before.tasks.at(-1)).toMatchObject({ kind: '수행평가', due: null, submitted: false });
  await page.getByRole('button', { name: '자료 추가', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '카메라로 촬영 지금 책상 위의 자료', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '작성 보관하고 BKIT으로', exact: true }).click();
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await expect(page.getByRole('region', { name: '선택 날짜 일정' })).toContainText(
    '극한 학습지 풀기',
  );
  for (const view of ['일', '주', '월', '연도', '여러 해']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    await expect(page.getByRole('button', { name: view, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
  expect((await read(page)).tasks).toEqual(before.tasks);
});

test('all nine home materials remain accessible and retain user settings after reload', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await seed(page);
  const before = await read(page);
  for (const theme of materials) {
    await page.getByRole('button', { name: 'BKIT 로고 · 테마 선택' }).click();
    await page.getByRole('button', { name: theme.name, exact: true }).click();
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', theme.id);
    const scan = await new AxeBuilder({ page })
      .include('.home-rebirth')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(scan.violations, theme.name).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`home-${theme.id}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    expect((await read(page)).tasks).toEqual(before.tasks);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'night');
});

test('offline empty and completed homes stay honest, and active or paused study keeps its timer', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page, newState());
  await expect(page.locator('.rebirth-hero')).toHaveAttribute('data-state', 'empty');
  await page.context().setOffline(true);
  await page.evaluate(() => dispatchEvent(new Event('offline')));
  await expect(page.locator('.rebirth-offline')).toBeVisible();
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  const timer = (await read(page)).quickTimer!;
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  await expect(page.locator('.rebirth-hero')).toHaveAttribute('data-state', 'active');
  await page.screenshot({ path: info.outputPath('active-home.png'), fullPage: true });
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  expect((await read(page)).quickTimer?.id).toBe(timer.id);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '오늘', exact: true })
    .first()
    .click();
  await expect(page.locator('.rebirth-hero')).toHaveAttribute('data-state', 'paused');
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.locator('.rebirth-hero')).toHaveAttribute('data-state', 'paused');
  expect((await read(page)).quickTimer?.id).toBe(timer.id);
  expect(
    (await read(page)).learningEvents?.filter((e) => e.type === 'FirstLearningAttempt') ?? [],
  ).toHaveLength(0);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  await page.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  await page
    .locator('nav:visible')
    .getByRole('button', { name: '기록', exact: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: '공부 기록', exact: true })).toBeVisible();
  expect((await read(page)).sessions[0].id).toBe(timer.id);
  expect(errors).toEqual([]);
});

test('completed work still needs submission and selected calendar date survives closing', async ({
  page,
}) => {
  const state = populated();
  state.tasks = state.tasks
    .slice(0, 1)
    .map((task) => ({ ...task, status: 'done', completedAt: '2026-10-22T04:00:00Z' }));
  await seed(page, state);
  await expect(page.locator('.rebirth-hero')).toHaveAttribute('data-state', 'completed');
  await expect(page.locator('.rebirth-empty')).toContainText('완료와 제출');
  await expect(page.getByRole('button', { name: '제출 확인 1개 남았어요' })).toBeVisible();
  await expect(page.locator('.rebirth-progress dl')).toContainText('완료 과제1');
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await page.getByRole('button', { name: /^2026-10-23, 일정/ }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('.calendar-peek-week .is-selected')).toContainText('23');
  await page.getByRole('button', { name: '전체 달력 열기' }).click();
  await expect(page.getByRole('button', { name: /^2026-10-23, 일정/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await read(page)).tasks).toEqual(state.tasks);
});
