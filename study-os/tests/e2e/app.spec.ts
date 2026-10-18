import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { KEY } from '../../src/storage';
// Combined CRUD / timer / backup flows take longer on WebKit software rendering.
test.setTimeout(90000);
const fixedTime = new Date('2026-10-12T06:00:00Z');
async function nav(p: Page, name: string) {
  if (name==='시간표'||name==='기록') {
    await p.getByRole('navigation').getByRole('button',{name:'더보기',exact:true}).filter({visible:true}).first().click();
    await p.getByRole('navigation',{name:'추가 도구',exact:true}).getByRole('button',{name,exact:true}).click();
    return;
  }
  if (name === '설정') {
    const settings = p.getByRole('button', { name: '설정 열기', exact: true });
    if (!(await settings.isVisible()))
      await p.getByRole('button', { name: '더 보기', exact: true }).click();
    await settings.click();
    return;
  }
  await p
    .getByRole('navigation')
    .getByRole('button', { name, exact: true })
    .filter({ visible: true })
    .first()
    .click();
}
async function showTodayDetails(p: Page) {
  if (!((await p.locator('.today-more').getAttribute('open')) !== null))
    await p.locator('.today-more > summary').click();
}
async function detailedTask(p: Page) {
  await nav(p, '과제');
  await p.getByRole('button', { name: '과제 등록', exact: true }).click();
  await p.getByRole('button', { name: '상세 입력', exact: true }).click();
  return p.getByRole('dialog');
}
async function addTask(p: Page, title = '테스트 · 학습지 극한 1–3번') {
  const d = await detailedTask(p);
  await d.getByLabel('과목', { exact: true }).fill('수학');
  await d.getByLabel('과제 이름 · 바로 할 행동').fill(title);
  await d.getByLabel('마감 날짜 (모르면 비우기)', { exact: true }).fill('2026-10-14');
  await d.getByRole('combobox', { name: '마감의 정확성', exact: true }).selectOption('exact-time');
  await d.getByLabel('확정된 시각 (시각까지 알 때)', { exact: true }).fill('21:00');
  await d.getByRole('button', { name: '과제 저장', exact: true }).click();
  await expect(d).not.toBeVisible();
  await nav(p, '오늘');
  await showTodayDetails(p);
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: fixedTime });
  await page.goto('./');
});
test('empty state, CRUD, timer pause, finish, submission and refresh persistence', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '5분만, 가볍게.' })).toBeVisible();
  await addTask(page);
  await page.getByRole('button', { name: '5분만 시작', exact: true }).click();
  await page.clock.runFor(5000);
  await page.getByLabel('집중 타이머', { exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.getByLabel('일시정지 사유').fill('테스트 · 잠깐 휴식');
  await page.getByRole('dialog').getByRole('button', { name: '일시정지', exact: true }).click();
  await page.reload();
  await expect(page.locator('.now-focus-status')).toContainText('일시정지');
  await nav(page, '집중');
  await page.getByRole('button', { name: '다시 시작', exact: true }).click();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: '학습량 기록 · 종료' }).click();
  await page.getByLabel('완료한 문제 수').fill('3');
  await page.getByLabel('떠올리거나 이해한 개념').fill('테스트 · 극한');
  await page.locator('.finish-details > summary').click();
  await page.getByLabel('오답 · 이해하지 못한 개념').fill('테스트 · 분수 약분');
  await page
    .getByRole('dialog')
    .getByLabel(/이 과제의 학습 분량/)
    .check();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료' }).click();
  await nav(page, '과제');
  await page.getByRole('button', { name: '학습 완료', exact: true }).click();
  await expect(page.getByText(/제출 여부 확인/).first()).toBeVisible();
  await page.getByRole('button', { name: /수학.*테스트 · 학습지/ }).click();
  await page.getByRole('dialog').getByLabel('제출 완료 (학습 완료 상태에서 체크)').check();
  await page.getByRole('button', { name: '과제 저장' }).click();
  await expect(page.getByText(/제출 완료/).first()).toBeVisible();
  await page.reload();
  await nav(page, '기록');
  await expect(page.getByRole('heading', { name: '테스트 · 학습지 극한 1–3번', level: 3 })).toBeVisible();
  await expect(page.getByText(/3문제 · 어려움/)).toBeVisible();
  const state = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(state.sessions[0].pauses).toHaveLength(1);
  expect(state.sessions[0].seconds).toBeGreaterThan(0);
  expect(state.tasks[0].submitted).toBe(true);
});
test('repeating schedules all week, temporary exclusions, deadline edit and delete', async ({
  page,
}) => {
  await nav(page, '시간표');
  await page.getByRole('button', { name: '일정 등록', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('학교 과목 · 학원 이름 · 일정').fill('테스트 · 반복 수업');
  for (const day of ['월', '화', '수', '목', '금', '토', '일'])
    await d.getByLabel(day, { exact: true }).check();
  await d.getByLabel('수업 · 일정 시작').fill('18:00');
  await d.getByLabel('종료', { exact: true }).fill('22:00');
  await d.getByLabel(/^구분/).selectOption('academy');
  await d.getByLabel('준비 (분)').fill('10');
  await d.getByLabel('이동 (분)').fill('20');
  await d.getByLabel('안전 여유 (분)').fill('10');
  await d.getByLabel(/제외 날짜/).fill('2026-10-13');
  await d.getByRole('button', { name: '일정 저장' }).click();
  await expect(page.locator('.week-class')).toHaveCount(7);
  await expect(page.getByText('준비 17:20 → 출발 17:30 → 도착 17:50')).toBeVisible();
  await page.getByRole('button', { name: '내일', exact: true }).click();
  await expect(page.getByRole('heading', { name: '등록된 수업이 없어요' })).toBeVisible();
  await nav(page, '과제');
  await addTask(page);
  await page.getByRole('button', { name: /수학.*테스트 · 학습지/ }).click();
  await page.getByLabel('마감 날짜 (모르면 비우기)', { exact: true }).fill('2026-10-15');
  await page.getByLabel('확정된 시각 (시각까지 알 때)', { exact: true }).fill('20:00');
  await page.getByRole('button', { name: '과제 저장' }).click();
  await expect(page.getByText(/10.15.*20:00/).first()).toBeVisible();
  await page.getByRole('button', { name: /수학.*테스트 · 학습지/ }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await nav(page, '과제');
  await expect(page.getByRole('heading', { name: '여기에 할 일을 모아두세요' })).toBeVisible();
});
test('API unavailable recovery, compare, approve, undo, export and import', async ({ page }) => {
  await page.route('**/api/**', (r) => r.abort());
  await addTask(page);
  await page.getByRole('button', { name: '오늘 계획 복구' }).click();
  await expect(page.getByText(/Demo AI Mode/).first()).toBeVisible();
  await expect(page.getByText('변경 전: 미배치')).toBeVisible();
  await page.getByRole('button', { name: '검토한 계획 승인' }).click();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).plan.length, KEY)).toBe(1);
  await page.getByRole('button', { name: '계획 실행 취소' }).click();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).plan.length, KEY)).toBe(0);
  await nav(page, '설정');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 백업 내보내기' }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe('bkit-2026-10-12.json');
  const imported = newState();
  imported.settings.goal = '테스트 · 가져온 목표';
  await page.getByLabel('JSON 백업 파일').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await page.getByRole('button', { name: '백업으로 교체' }).click();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).settings.goal, KEY)).toBe(
    '테스트 · 가져온 목표',
  );
});
test('production PWA shell reloads offline, keeps records and scope isolation', async ({
  page,
  context,
}) => {
  await page.evaluate(() => localStorage.setItem('crashweek.v3', 'legacy-preserved'));
  await addTask(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    const urls = [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(
      (e) => (e as HTMLScriptElement).src || (e as HTMLLinkElement).href,
    );
    await Promise.all(urls.map((u) => fetch(u)));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await expect(page.locator('.now-focus h2')).toHaveText('테스트 · 학습지 극한 1–3번');
  expect(await page.evaluate(() => localStorage.getItem('crashweek.v3'))).toBe('legacy-preserved');
  await expect(page.getByText('오프라인', { exact: true })).toBeVisible();
  await context.setOffline(false);
});
test('all six screens fit narrow viewport with keyboard-accessible dialog', async ({
  page,
}, info) => {
  for (const name of ['오늘', '시간표', '과제', '집중', '기록', '설정']) {
    await nav(page, name);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await nav(page, '오늘');
  await addTask(page);
  await page.clock.runFor(7000);
  await page.screenshot({
    path: info.outputPath(`bkit-${info.project.name}.png`),
    fullPage: true,
  });
  await page.getByRole('button', { name: /수학.*테스트 · 학습지/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('quota failure and corrupt data never silently reset stored data', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('bkit.study-os.v1', 'broken-original');
  });
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await detailedTask(page);
  await page.getByRole('dialog').getByLabel('과목', { exact: true }).fill('수학');
  await page.getByRole('dialog').getByLabel('과제 이름 · 바로 할 행동').fill('테스트');
  await page.getByRole('dialog').getByRole('button', { name: '과제 저장' }).click();
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(
    'broken-original',
  );
});
test('WCAG automated checks on primary screens', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const failures = [];
  for (const name of ['오늘', '시간표', '과제', '집중', '기록', '설정']) {
    await nav(page, name);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    if (result.violations.length)
      failures.push({
        screen: name,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
        })),
      });
  }
  expect(failures).toEqual([]);
});
test('storage write failure preserves existing records and shows a save error', async ({
  page,
}) => {
  const before = await page.evaluate((k) => localStorage.getItem(k), KEY);
  await page.evaluate((k) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === k) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      original.call(this, key, value);
    };
  }, KEY);
  await detailedTask(page);
  await page.getByRole('dialog').getByLabel('과목', { exact: true }).fill('수학');
  await page.getByRole('dialog').getByLabel('과제 이름 · 바로 할 행동').fill('테스트 · 저장 실패');
  await page.getByRole('dialog').getByRole('button', { name: '과제 저장' }).click();
  await expect(page.getByRole('alert').first()).toContainText('저장하지 못했습니다');
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(before);
});
test('Seoul dashboard advances across midnight without fabricated output', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-10-12T14:59:55Z'));
  await page.clock.runFor(1000);
  await expect(page.locator('.date-box')).toContainText('10월 12일');
  await page.clock.runFor(10000);
  await expect(page.locator('.date-box')).toContainText('10월 13일');
  await expect(page.getByRole('heading', { name: '지금은 충분히 쉬어갈 시간.' })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{\"sessions\":[]}').sessions,
    ),
  ).toEqual([]);
});
test('submission reminders remain on TODAY until the user marks submitted', async ({ page }) => {
  await addTask(page);
  await nav(page, '과제');
  await page.getByRole('button', { name: '테스트 · 학습지 극한 1–3번 학습 완료로 변경' }).click();
  await nav(page, '오늘');
  await expect(page.getByRole('region', { name: '제출 확인 알림' })).toContainText(
    '숙제·수행평가 1개',
  );
  await page.getByRole('button', { name: '제출 확인하기', exact: true }).click();
  await expect(page.getByRole('button', { name: '제출 확인', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '테스트 · 학습지 극한 1–3번 제출 완료 기록' }).click();
  await nav(page, '오늘');
  await expect(page.getByRole('region', { name: '제출 확인 알림' })).toHaveCount(0);
  await page.reload();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).tasks[0].submitted, KEY),
  ).toBe(true);
});
test('static demo recovery makes no AI network request', async ({ page }) => {
  let calls = 0;
  page.on('request', (r) => {
    if (r.url().includes('/api/')) calls++;
  });
  await addTask(page);
  await page.getByRole('button', { name: '오늘 계획 복구' }).click();
  await expect(page.getByRole('button', { name: '검토한 계획 승인' })).toBeEnabled();
  expect(calls).toBe(0);
});
test('320px layout keeps actions and task filters within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await addTask(page);
  for (const name of ['오늘', '시간표', '과제', '집중', '기록', '설정']) {
    await nav(page, name);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
test('completed tasks show submission or clear completion instead of pretending no tasks exist', async ({
  page,
}) => {
  await addTask(page);
  await nav(page, '과제');
  await page.getByRole('button', { name: '테스트 · 학습지 극한 1–3번 학습 완료로 변경' }).click();
  await nav(page, '오늘');
  await expect(
    page.getByRole('heading', { name: '학습은 끝났어요. 제출도 확인해요.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '제출 확인하기', exact: true }).click();
  await page.getByRole('button', { name: '테스트 · 학습지 극한 1–3번 제출 완료 기록' }).click();
  await nav(page, '오늘');
  await expect(page.getByRole('heading', { name: '남은 학습 과제가 없어요.' })).toBeVisible();
  await showTodayDetails(page);
  await expect(page.getByRole('heading', { name: '지금 챙길 과제가 없어요' })).toBeVisible();
  await expect(page.getByRole('button', { name: '새 과제 등록', exact: true })).toBeVisible();
});
