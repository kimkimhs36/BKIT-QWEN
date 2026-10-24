import { test, expect } from './local-fixture';
import { newState, scheduleSchema, taskSchema } from '../../src/model';
test.setTimeout(90000);
// UI routing stays outside the service worker; compact-offline.spec verifies the real worker.
test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });
const date = '2026-10-25';
async function seed(page: import('@playwright/test').Page) {
  const s = newState();
  s.schedules = [
    scheduleSchema.parse({
      id: 'weekly',
      title: '일요일 수학 학원',
      subject: '수학',
      kind: 'academy',
      days: [0],
      date: null,
      start: '15:00',
      end: '16:00',
      prep: 10,
      travel: 15,
      buffer: 5,
      materials: '오답 노트',
      excluded: [],
    }),
  ];
  s.tasks = [
    taskSchema.parse({
      id: 'deadline',
      subject: '과학',
      title: '실험 보고서',
      kind: '수행평가',
      due: '2026-10-26T14:59:00Z',
      deadline: { date: '2026-10-26', precision: 'date-only', provenance: 'explicit' },
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      submissionRequired: true,
      optional: false,
      notes: '그대로 보존',
      link: '',
    }),
  ];
  await page.clock.install({ time: new Date(date + 'T03:00:00Z') });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, s);
  await page.route('**/api/config', (route) =>
    route.fulfill({
      status: 503,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: '{"error":"offline UI verification"}',
    }),
  );
  await page.goto('./');
}
const read = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
const calendar = async (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /오늘 일정 .*달력 열기/ }).click();

test('calendar day/week/month, creation, recurring exception and cancellation persist across reload', async ({
  page,
}) => {
  await seed(page);
  await calendar(page);
  await expect(page.getByRole('region', { name: '월간 달력' })).toBeVisible();
  for (const name of ['주간', '일간', '월간'])
    await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: '일요일 수학 학원 이 날짜만 수정', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.locator('[name="start"]').fill('16:00');
  await d.locator('[name="end"]').fill('17:00');
  await d.getByRole('button', { name: '일정 저장', exact: true }).click();
  expect((await read(page)).schedules[0]).toMatchObject({ start: '15:00', excluded: [date] });
  await page.getByRole('button', { name: '일요일 수학 학원 이 날짜만 수정', exact: true }).click();
  await d.getByRole('button', { name: '이 날짜만 취소', exact: true }).click();
  await expect(page.getByText('아직 일정이 없어요.', { exact: true })).toBeVisible();
  await page.getByLabel('조회 날짜').fill('2026-11-01');
  await expect(page.getByRole('region', { name: '선택 날짜 일정', exact: true })).toContainText(
    '15:00–16:00',
  );
  await page.getByRole('button', { name: '선택 날짜에 추가', exact: true }).click();
  await page.getByRole('button', { name: '일정 등록', exact: true }).click();
  await d.locator('[name="title"]').fill('학교 발표 준비');
  await d.getByRole('button', { name: '일정 저장', exact: true }).click();
  await page.reload();
  await calendar(page);
  await page.getByLabel('조회 날짜').fill('2026-11-01');
  await expect(page.getByRole('region', { name: '선택 날짜 일정', exact: true })).toContainText(
    '학교 발표 준비',
  );
  expect((await read(page)).tasks[0].notes).toBe('그대로 보존');
});

test('selected date adds all task kinds, untimed deadline exports as DATE, starts exact task', async ({
  page,
}) => {
  await seed(page);
  await calendar(page);
  await page.getByLabel('조회 날짜').fill('2026-10-26');
  const add = page.getByRole('group', { name: '선택 날짜에 추가' });
  for (const label of ['과제', '수행평가', '공부 계획']) {
    await page.getByRole('button', { name: '선택 날짜에 추가', exact: true }).click();
    await add.getByRole('button', { name: label, exact: label !== '공부 계획' }).click();
    const d = page.getByRole('dialog');
    await expect(d.locator('[name="dueDate"]')).toHaveValue('2026-10-26');
    await d.locator('[name="subject"]').fill('국어');
    await d.locator('[name="title"]').fill('월요일 ' + label);
    await d.getByRole('button', { name: '과제 저장', exact: true }).click();
    await expect(page.getByRole('region', { name: '선택 날짜 과제 마감' })).toContainText(
      '월요일 ' + label,
    );
  }
  const saved = await read(page);
  expect(saved.tasks.slice(1).map((t: { kind: string }) => t.kind)).toEqual([
    '숙제',
    '수행평가',
    '시험공부',
  ]);
  await expect(page.getByRole('region', { name: '선택 날짜 과제 마감' })).not.toContainText(
    '23:59',
  );
  await page.locator('.planner-options > summary').click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: '14일 캘린더 내보내기', exact: true }).click();
  const download = await dl;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const ics = Buffer.concat(chunks).toString();
  expect(ics).toContain('DTSTART;VALUE=DATE:20261026');
  await page.getByRole('button', { name: '월요일 과제 5분 공부 시작', exact: true }).click();
  expect((await read(page)).active.taskId).toBe(saved.tasks[1].id);
});

test('help actually opens five-minute study, calendar, theme and Awake without starting camera', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '도움말 열기', exact: true }).click();
  const d = page.getByRole('dialog');
  await expect(d.getByRole('region', { name: '빠른 시작 안내' })).toBeVisible();
  await d.getByRole('button', { name: '달력 · 시간표', exact: true }).click();
  await d.getByRole('button', { name: '달력 열기', exact: true }).click();
  await expect(page.getByRole('region', { name: '월간 달력', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '도움말 열기', exact: true }).click();
  await d.getByRole('button', { name: 'Awake 사용', exact: true }).click();
  await d.getByRole('button', { name: 'Awake 설정 열기', exact: true }).click();
  await expect(page.locator('#settings-awake')).toHaveAttribute('open', '');
  await expect(page.locator('#settings-awake')).toContainText('카메라');
  expect(await page.evaluate(() => document.documentElement.dataset.awakeCamera)).not.toBe('true');
  await page.getByRole('button', { name: '도움말 열기', exact: true }).click();
  await d.getByRole('button', { name: '테마 · 배경', exact: true }).click();
  await d.getByRole('button', { name: '테마 고르기', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '나의 공부 공간' })).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '도움말 열기', exact: true }).click();
  await d.getByRole('button', { name: '빠른 시작', exact: true }).click();
  await d.getByRole('button', { name: '지금 5분 시작하기', exact: true }).click();
  expect((await read(page)).quickTimer.targetMinutes).toBe(5);
});

test('study time can be placed, moved and cancelled without removing its task or weekly classes', async ({
  page,
}) => {
  await seed(page);
  await calendar(page);
  await page.getByLabel('조회 날짜').fill('2026-10-26');
  await page.getByRole('button', { name: '공부 시간 배치', exact: true }).click();
  let d = page.getByRole('dialog');
  await expect(d.locator('[name="start"]')).toHaveValue('2026-10-26T19:00');
  await d.getByRole('button', { name: '충돌 검사 · 시간 고정', exact: true }).click();
  expect((await read(page)).plan).toHaveLength(1);
  await page.getByRole('button', { name: '계획 시간 수정', exact: true }).click();
  await d.locator('[name="start"]').fill('2026-10-26T20:00');
  await d.locator('[name="end"]').fill('2026-10-26T20:25');
  await d.getByRole('button', { name: '충돌 검사 · 시간 고정', exact: true }).click();
  let stored = await read(page);
  expect(stored.plan).toHaveLength(1);
  expect(stored.plan[0].start).toBe('2026-10-26T11:00:00.000Z');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '계획 취소', exact: true }).click();
  stored = await read(page);
  expect(stored.plan).toEqual([]);
  expect(stored.tasks).toHaveLength(1);
  expect(stored.schedules).toHaveLength(1);
});

test('all themes join the top chrome, keep study data and remain stable after settings, scroll and reload', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await seed(page);
  const before = await read(page);
  const { mkdir, writeFile } = await import('node:fs/promises');
  const dir = `docs/calendar-help-20261025/verified/${info.project.name}`;
  await mkdir(dir, { recursive: true });
  const metrics = [];
  for (const id of [
    'classic',
    'forest',
    'glass',
    'peach',
    'diamond',
    'gold',
    'jelly',
    'droplets',
    'night',
  ]) {
    await page.getByRole('button', { name: '테마 선택', exact: true }).click();
    await page.locator(`[data-swatch="${id}"]`).click();
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    const top = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement),
        header = getComputedStyle(document.querySelector('.topbar')!);
      return {
        id: document.documentElement.dataset.material,
        html: html.backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        theme: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content,
        bg: html.getPropertyValue('--mat-bg').trim(),
        shadow: header.boxShadow,
        blur: header.backdropFilter,
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });
    expect(top.id).toBe(id);
    expect(top.body).toBe(top.html);
    expect(top.theme).toBe(top.bg);
    expect(top.shadow).toBe('none');
    expect(top.blur).toBe('none');
    expect(top.width).toBeLessThanOrEqual(top.viewport + 1);
    metrics.push(top);
    await page.screenshot({ path: `${dir}/${id}-home.png`, animations: 'disabled' });
    await page.getByRole('button', { name: '설정 열기', exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-material', id);
    expect((await read(page)).tasks).toEqual(before.tasks);
    expect((await read(page)).schedules).toEqual(before.schedules);
  }
  await writeFile(`${dir}/top-metrics.json`, JSON.stringify(metrics, null, 2));
});

test('phone and tablet pages, sheets and rotation remain readable and reachable', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const { mkdir } = await import('node:fs/promises');
  const dir = `docs/calendar-help-20261025/verified/${info.project.name}`;
  await mkdir(dir, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page);
  async function shot(name: string) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' });
  }
  await calendar(page);
  await shot('calendar');
  await page.getByRole('button', { name: '주간', exact: true }).click();
  await shot('calendar-week');
  await page.getByRole('button', { name: '일간', exact: true }).click();
  await shot('calendar-day');
  await page.getByRole('button', { name: '도움말 열기', exact: true }).click();
  await shot('help');
  const color = await page
    .getByRole('dialog')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(color).not.toBe('rgba(0, 0, 0, 0)');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  for (const [name, id] of [
    ['과제', 'tasks'],
    ['집중', 'study'],
    ['기록', 'records'],
  ]) {
    await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
    await shot(id);
  }
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await shot('settings');
  await page.locator('#settings-awake > summary').click();
  await shot('awake');
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await shot('themes');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.height, height: size.width });
  await shot('settings-rotated');
  await page.getByRole('button', { name: '도움말 열기', exact: true }).click();
  await shot('help-rotated');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.setViewportSize(size);
  expect(errors).toEqual([]);
});

test('stopwatch digits remain whole at minute/hour boundaries and narrow widths', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const { mkdir } = await import('node:fs/promises');
  const dir = `docs/calendar-help-20261025/verified/${info.project.name}`;
  await mkdir(dir, { recursive: true });
  await seed(page);
  const original = page.viewportSize()!;
  for (const [seconds, width] of [
    [0, 320],
    [3599, 320],
    [3600, 375],
    [46799, 320],
    [360000, original.width],
  ]) {
    await page.evaluate((seconds) => {
      const s = JSON.parse(localStorage.getItem('bkit.study-os.v1')!);
      s.quickTimer = {
        id: 'qa-clock',
        mode: 'stopwatch',
        targetMinutes: 480,
        started: '2026-10-25T00:00:00Z',
        segmentStart: null,
        elapsed: seconds,
        segments: [],
      };
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
    }, seconds);
    await page.setViewportSize({ width, height: original.height });
    await page.reload();
    await page
      .locator('nav:visible')
      .getByRole('button', { name: '집중', exact: true })
      .first()
      .click();
    await expect(page.locator('.quick-timer-active .study-clock-digits')).toBeVisible();
    const metrics = await page
      .locator('.quick-timer-active .quick-timer-display')
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [...el.querySelectorAll<HTMLElement>('.study-clock-digits > span > span')].map(
          (d) => {
            const b = d.getBoundingClientRect();
            return {
              left: b.left - r.left,
              right: r.right - b.right,
              top: b.top - r.top,
              bottom: r.bottom - b.bottom,
              overflow: getComputedStyle(d.parentElement!).overflow,
            };
          },
        );
      });
    for (const metric of metrics) {
      expect(metric.overflow).toBe('visible');
      expect(Math.min(metric.left, metric.right, metric.top, metric.bottom)).toBeGreaterThanOrEqual(
        -1,
      );
    }
    await page.screenshot({ path: `${dir}/clock-${seconds}-${width}.png`, animations: 'disabled' });
  }
});
