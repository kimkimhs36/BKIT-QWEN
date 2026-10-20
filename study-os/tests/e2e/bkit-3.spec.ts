import { test, expect, type Page } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';

test.use({ timezoneId: 'Asia/Seoul' });
test.setTimeout(90000);
const fixture = resolve('tests/fixtures/printed-homework.png');
const sleepState = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bkit.sleep-guard.v3') || '{}'));
const studyState = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{"tasks":[]}'));
async function openSleep(page: Page) {
  await page.getByRole('button', { name: 'Sleep Guard 열기', exact: true }).click();
}
async function schedule(page: Page, bed = '23:00', wake = '07:00') {
  if (!(await page.getByLabel('목표 취침 시각', { exact: true }).isVisible()))
    await page.getByText('요일별 일정 변경', { exact: true }).click();
  await page.getByLabel('목표 취침 시각', { exact: true }).fill(bed);
  await page.getByLabel('목표 기상 시각', { exact: true }).fill(wake);
  await page.getByLabel('모든 요일에 적용', { exact: true }).check();
  await page.getByRole('button', { name: '수면 일정 저장', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  // This suite must never reach an external API, OAuth, or a paid provider.
  await page.route('https://**', (route) => route.abort('blockedbyclient'));
  await page.clock.install({ time: new Date('2026-10-18T13:15:00Z') });
  await page.goto('./');
});

test('menu toggles ten times, Escape restores focus, settings and capture dialogs remain usable', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: '더 보기', exact: true });
  for (let i = 0; i < 10; i++) {
    await toggle.click();
    await expect(page.locator('dialog.tools-dialog')).toBeVisible();
    await toggle.click();
    await expect(page.locator('dialog.tools-dialog')).toHaveCount(0);
  }
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '생활 리듬' })).toBeVisible();
  await page.getByRole('button', { name: '과제 추가', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('sleep routine saves day schedules, private photo, night controls, morning reflection and deletion', async ({
  page,
}) => {
  await openSleep(page);
  await schedule(page, '00:30', '08:00');
  await page.getByLabel('Sleep Guard 사용', { exact: true }).check();
  await page.getByLabel('변경할 요일', { exact: true }).selectOption('2');
  await page.getByLabel('목표 취침 시각', { exact: true }).fill('01:00');
  await page.getByRole('button', { name: '수면 일정 저장', exact: true }).click();
  expect((await sleepState(page)).schedule[2].bed).toBe('01:00');
  await page.clock.fastForward(90 * 60000); // 23:45 prepares for 00:30 next day.
  await expect(page.locator('.sleep-state')).toContainText('취침 60분 전');
  for (const name of ['공부 정리', '씻기', '취침 준비', '누웠음 확인'])
    await page.getByRole('checkbox', { name, exact: false }).check();
  await page.getByText('선택 · 기기 내부 사진 인증', { exact: true }).click();
  await page.getByLabel('인증 사진 첨부 (최대 2장)', { exact: true }).setInputFiles(fixture);
  await expect(page.locator('.sleep-photos img').first()).toBeVisible();
  const before = await sleepState(page);
  expect(before.records[0].checks).toEqual([true, true, true, true]);
  expect(before.records[0].date).toBe('2026-10-19');
  expect(before.records[0].photoIds).toHaveLength(1);
  expect(JSON.stringify(before)).not.toContain('data:image');
  await page.reload();
  await openSleep(page);
  await expect(page.getByRole('checkbox', { name: '씻기', exact: true })).toBeChecked();
  await page.getByText('선택 · 기기 내부 사진 인증', { exact: true }).click();
  await expect(page.locator('.sleep-photos img').first()).toBeVisible();
  await page.getByRole('button', { name: '야간 화면 시작', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sleep-night', 'true');
  await page.getByRole('button', { name: '야간 화면 종료', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sleep-night', 'false');
  await page.getByRole('button', { name: '오늘만 건너뛰기', exact: true }).click();
  await expect(page.locator('.sleep-state')).toContainText('오늘만 건너뛰는 중');
  await page.getByRole('button', { name: '오늘 건너뛰기 취소', exact: true }).click();
  await page.getByRole('button', { name: '1시간 일시 중지', exact: true }).click();
  await expect(page.locator('.sleep-state')).toContainText('일시 중지');
  await page.getByRole('button', { name: '일시 중지 해제', exact: true }).click();
  await page.getByLabel('확인한 실제 취침', { exact: true }).fill('2026-10-19T00:40');
  await page.getByLabel('실제 기상', { exact: true }).fill('2026-10-19T08:10');
  await page.getByLabel('간단한 수면 회고', { exact: true }).fill('아침에 개운했다');
  await page.getByRole('button', { name: '회고 저장', exact: true }).click();
  expect((await sleepState(page)).records[0].actualWake).toBe('2026-10-18T23:10:00.000Z');
  await page.reload();
  await openSleep(page);
  await expect(page.getByLabel('간단한 수면 회고', { exact: true })).toHaveValue('아침에 개운했다');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '이 수면 기록 삭제', exact: true }).click();
  expect((await sleepState(page)).records).toEqual([]);
  expect((await studyState(page)).tasks).toEqual([]);
});

test('automatic night starts at bedtime, stays optional, and never interrupts active study', async ({
  page,
}) => {
  await openSleep(page);
  await schedule(page, '22:16', '07:00');
  await page.getByLabel('Sleep Guard 사용', { exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-sleep-night', 'false');
  await page.clock.fastForward(60000);
  await expect(page.locator('html')).toHaveAttribute('data-sleep-night', 'true');
  await page.getByRole('button', { name: '야간 화면 종료', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sleep-night', 'false');
  // Finish the palette check, then start before the next protected bedtime.
  await schedule(page, '22:30', '07:00');
  await page.getByRole('button', { name: '집중 화면으로 이동', exact: true }).click();
  await page.getByRole('button', { name: '과제 추가', exact: true }).click();
  await page.getByLabel('할 일을 한 문장으로', { exact: true }).fill('수학 20문제');
  await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
  // Use the primary home action so the task is linked to the timer.
  const nav = page.getByRole('navigation', { name: '주 메뉴', exact: true });
  const tablet = page.getByRole('navigation', { name: '태블릿 및 데스크톱 주 메뉴', exact: true });
  await ((await nav.isVisible()) ? nav : tablet)
    .getByRole('button', { name: '오늘', exact: true })
    .click();
  await page.getByRole('button', { name: '5분만 시작', exact: true }).click();
  expect((await studyState(page)).active).toBeTruthy();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('bkit.sleep-guard.v3')!);
    state.dismissedNight = null;
    localStorage.setItem('bkit.sleep-guard.v3', JSON.stringify(state));
    window.dispatchEvent(new StorageEvent('storage', { key: 'bkit.sleep-guard.v3' }));
  });
  await page.getByLabel('집중 타이머', { exact: true }).click();
  await page.getByRole('button', { name: '오늘로 · 타이머 유지', exact: true }).click();
  await openSleep(page);
  await expect(page.locator('.sleep-state')).toContainText('공부 중');
  await expect(page.getByRole('button', { name: '야간 화면 시작', exact: true })).toBeDisabled();
  await expect(page.locator('html')).toHaveAttribute('data-sleep-night', 'false');
});

test('notification denial preserves all local controls and corrupt sleep data is never overwritten', async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: class {
        static permission = 'denied';
        static async requestPermission() {
          return 'denied';
        }
      },
    });
  });
  await openSleep(page);
  await page.getByRole('button', { name: '브라우저 알림 켜기', exact: true }).click();
  await expect(
    page.getByText('알림 권한이 없어도 모든 체크와 기록을 사용할 수 있습니다.'),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: '씻기', exact: true }).check();
  expect((await sleepState(page)).records[0].checks[1]).toBe(true);
  const goodBackup = await sleepState(page);
  await page.evaluate(() => localStorage.setItem('bkit.sleep-guard.v3', '{broken-original'));
  await page.reload();
  await openSleep(page);
  await expect(page.getByRole('alert')).toContainText('원본은 덮어쓰지');
  await expect(page.getByLabel('Sleep Guard 사용', { exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('bkit.sleep-guard.v3'))).toBe(
    '{broken-original',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('수면 백업 복구', { exact: true }).setInputFiles({
    name: 'sleep.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(goodBackup)),
  });
  await expect(page.getByRole('checkbox', { name: '씻기', exact: true })).toBeChecked();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some(
        (k) =>
          k.startsWith('bkit.sleep-guard.v3.recovery.') &&
          localStorage.getItem(k) === '{broken-original',
      ),
    ),
  ).toBe(true);
});

test('sleep screen fits phone, tablet rotation, DeX windows, and zoom-like CSS widths with accessible controls', async ({
  page,
}) => {
  await openSleep(page);
  await page.getByText('요일별 일정 변경', { exact: true }).click();
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 1024],
    [1024, 768],
    [800, 1280],
    [1280, 800],
    [960, 600],
    [1440, 1000],
    [640, 360],
  ]) {
    await page.setViewportSize({ width, height });
    const geometry = await page.evaluate(() => {
      const rects = [...document.querySelectorAll('.sleep-fields input')].map((e) =>
        e.getBoundingClientRect(),
      );
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        overlaps: rects.some((a, i) =>
          rects
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 &&
                Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1,
            ),
        ),
        clipped: rects.some((a) => a.left < 0 || a.right > innerWidth + 1),
      };
    });
    expect(geometry, `${width}×${height}`).toEqual({
      overflow: false,
      overlaps: false,
      clipped: false,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const day = await new AxeBuilder({ page })
    .include('.sleep-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(day.violations).toEqual([]);
  await page.getByRole('button', { name: '야간 화면 시작', exact: true }).click();
  const night = await new AxeBuilder({ page })
    .include('.sleep-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(night.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/bkit-3-night-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('local study flow edits quantities, saves one session, restores photos, and keeps history after task deletion', async ({
  page,
}) => {
  await page.getByRole('button', { name: /^자료 추가/ }).click();
  await page.getByLabel('갤러리 사진', { exact: true }).setInputFiles(fixture);
  await expect(page.locator('.atelier-photo img')).toBeVisible();
  await page.getByRole('button', { name: '과제 준비하기', exact: true }).click();
  await page.getByLabel('과제 1 과목', { exact: true }).fill('수학');
  await page.getByLabel('과제 1 내용', { exact: true }).fill('수학 연습문제');
  await page.getByLabel('과제 1 확인', { exact: true }).check();
  await page.getByRole('button', { name: '확인하고 BKIT에 저장', exact: true }).click();
  const nav = page.getByRole('navigation', { name: '주 메뉴', exact: true });
  const tablet = page.getByRole('navigation', { name: '태블릿 및 데스크톱 주 메뉴', exact: true });
  const menu = (await nav.isVisible()) ? nav : tablet;
  await menu.getByRole('button', { name: '과제', exact: true }).click();
  await page.locator('.task-content').filter({ hasText: '수학 연습문제' }).click();
  await page.getByLabel('과제 이름 · 바로 할 행동', { exact: true }).fill('수학 20문제 복습');
  await page
    .getByRole('combobox', { name: '학습 분량 단위', exact: true })
    .selectOption('problems');
  await page.getByLabel('총 분량', { exact: true }).fill('20');
  await page.getByLabel('남은 실제 분량', { exact: true }).fill('20');
  await page.getByRole('button', { name: '과제 저장', exact: true }).click();
  expect((await studyState(page)).tasks[0].attachmentIds).toHaveLength(1);
  await menu.getByRole('button', { name: '오늘', exact: true }).click();
  await page.getByRole('button', { name: '5분만 시작', exact: true }).click();
  await page.clock.fastForward(60000);
  await page.getByLabel('집중 타이머', { exact: true }).click();
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: true }).click();
  await page.getByLabel('완료한 문제 수', { exact: true }).fill('6');
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  expect((await studyState(page)).sessions).toHaveLength(1);
  expect((await studyState(page)).tasks[0].quantity.remaining).toBe(14);
  await page.reload();
  await menu.getByRole('button', { name: '과제', exact: true }).click();
  await page.locator('.task-content').filter({ hasText: '수학 20문제 복습' }).click();
  await expect(page.getByRole('region',{name:'과제 사진 및 PDF 첨부'}).locator('img')).toBeVisible();
  await expect(page.getByLabel('남은 실제 분량', { exact: true })).toHaveValue('14');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  expect((await studyState(page)).tasks).toEqual([]);
  expect((await studyState(page)).sessions).toHaveLength(1);
});

test('study and sleep records remain usable offline after shell installation', async ({
  page,
  context,
}) => {
  await openSleep(page);
  await page.getByRole('checkbox', { name: '씻기', exact: true }).check();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await openSleep(page);
  await expect(page.getByRole('checkbox', { name: '씻기', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: '공부 정리', exact: true }).check();
  expect((await sleepState(page)).records[0].checks.slice(0, 2)).toEqual([true, true]);
  await context.setOffline(false);
});

test('two tabs reconcile sleep checks without losing the other tab’s changes', async ({
  page,
  context,
}) => {
  await openSleep(page);
  await page.getByRole('checkbox', { name: '씻기', exact: true }).check();
  const other = await context.newPage();
  await other.clock.install({ time: new Date('2026-10-18T13:15:00Z') });
  await other.goto('./');
  await openSleep(other);
  await expect(other.getByRole('checkbox', { name: '씻기', exact: true })).toBeChecked();
  await other.getByRole('checkbox', { name: '공부 정리', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: '공부 정리', exact: true })).toBeChecked();
  expect((await sleepState(page)).records[0].checks.slice(0, 2)).toEqual([true, true]);
  await other.close();
});

test('foreground reminder phases are opt-in and emit at most two synthetic notices per night', async ({
  page,
}) => {
  await page.evaluate(() => {
    const notices: string[] = [];
    (window as typeof window & { sleepNotices?: string[] }).sleepNotices = notices;
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: class {
        static permission = 'granted';
        static async requestPermission() {
          return 'granted';
        }
        constructor(title: string) {
          notices.push(title);
        }
      },
    });
    if (navigator.serviceWorker)
      navigator.serviceWorker.getRegistration = async () =>
        ({
          showNotification: async (title: string) => {
            notices.push(title);
          },
        }) as ServiceWorkerRegistration;
  });
  await openSleep(page);
  await page.getByLabel('Sleep Guard 사용', { exact: true }).check();
  expect((await sleepState(page)).notified).toEqual([]);
  await page.getByRole('button', { name: '브라우저 알림 켜기', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { sleepNotices?: string[] }).sleepNotices?.length,
      ),
    )
    .toBe(1);
  await page.clock.fastForward(30000);
  expect((await sleepState(page)).notified).toHaveLength(1);
  await page.clock.fastForward(45 * 60000);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { sleepNotices?: string[] }).sleepNotices?.length,
      ),
    )
    .toBe(2);
  await page.clock.fastForward(20 * 60000);
  expect((await sleepState(page)).notified).toHaveLength(2);
});

test('visual viewport resizing protects typing controls and does not mistake pinch zoom for a keyboard', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), {
      height: innerHeight,
      width: innerWidth,
      scale: 1,
      offsetTop: 0,
      offsetLeft: 0,
    });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  });
  await page.reload();
  await openSleep(page);
  await page.getByText('요일별 일정 변경', { exact: true }).click();
  await page.getByLabel('목표 취침 시각', { exact: true }).focus();
  await page.evaluate(() => {
    Object.assign(visualViewport!, { height: 300, scale: 1 });
    visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-os-keyboard', 'true');
  await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toBeHidden();
  await page.evaluate(() => {
    Object.assign(visualViewport!, { height: 300, scale: 2 });
    visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-os-keyboard', 'false');
  await page.evaluate(() => {
    Object.assign(visualViewport!, { height: innerHeight, scale: 1 });
    visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-os-keyboard', 'false');
});
