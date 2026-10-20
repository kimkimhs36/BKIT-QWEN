import { test, expect } from './local-fixture';
async function openGarage(page: import('@playwright/test').Page, virtualClock = false) {
  await page.locator('nav button:visible').filter({ hasText: '더보기' }).click();
  if (virtualClock)
    await expect
      .poll(async () => {
        await page.clock.runFor(100);
        return page.getByRole('button', { name: 'TOHEŞAR GARAGE', exact: true }).isVisible();
      })
      .toBe(true);
  await page.getByRole('button', { name: 'TOHEŞAR GARAGE', exact: true }).click();
  if (virtualClock)
    await expect
      .poll(async () => {
        await page.clock.runFor(100);
        return page.getByRole('region', { name: 'TOHEŞAR GARAGE' }).isVisible();
      })
      .toBe(true);
  await expect(page.getByRole('region', { name: 'TOHEŞAR GARAGE' })).toBeVisible();
}
test('garage keeps car locally without touching study data and respects dark mode', async ({
  page,
}) => {
  await page.goto('./');
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await openGarage(page);
  await page.getByRole('button', { name: '다크모드로 전환', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-bkit-theme', 'dark');
  await expect(page.getByLabel('배경 · 무료')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: '코랄', exact: true }).click();
  await page.getByLabel('배경 · 무료').selectOption('dusk');
  await page.getByLabel('모션 감소', { exact: true }).click();
  await expect(page.getByLabel('모션 감소', { exact: true })).toBeChecked();
  const car = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).car,
  );
  expect(car.color).toBe('coral');
  expect(car.scene).toBe('dusk');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
  await page.reload();
  await openGarage(page);
  await expect(page.getByRole('button', { name: '코랄', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('모션 감소', { exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
test('corrupt garage is preserved and storage failure never invents owned parts', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('bkit.drive-garage.v1', '{broken'));
  await page.goto('./');
  await openGarage(page);
  await expect(page.getByRole('alert')).toContainText('원본을 보존');
  await page.getByRole('button', { name: '블루', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('bkit.drive-garage.v1'))).toBe('{broken');
});

import { newState } from '../../src/model';
import { addResource } from '../../src/learningEngine';
import { newGarage } from '../../src/drive/garage';
async function prepare(page: import('@playwright/test').Page) {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-19T12:00:01Z'));
  await page.addInitScript((value) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(value));
  }, newState());
  await page.goto('./');
  return page.getByRole('region', { name: '바로 시작 타이머' });
}
test('DRIVE and classic screens share one timer, pause, reload and saved history', async ({
  page,
}) => {
  const timer = await prepare(page);
  await timer.getByRole('button', { name: '심플 타이머', exact: true }).click();
  await timer.getByRole('button', { name: '지금 시작', exact: true }).click();
  await page.clock.fastForward(65000);
  const raw = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await timer.getByRole('button', { name: 'DRIVE MODE', exact: true }).click();
  await expect(page.getByRole('timer', { name: 'DRIVE 경과 시간' })).toHaveText('01:05');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(raw);
  await timer.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.reload();
  await page.clock.fastForward(30000);
  await expect(page.getByRole('timer', { name: 'DRIVE 경과 시간' })).toHaveText('01:05');
  await timer.getByRole('button', { name: '기본 타이머', exact: true }).click();
  await expect(timer.getByRole('timer')).toHaveText('23:55');
  await timer.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].seconds).toBe(65);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).credits),
  ).toBe(0);
});
test('race stages a false start, preserves the break deadline on replay/reload and returns a paused timer', async ({
  page,
}) => {
  const timer = await prepare(page);
  await timer.getByRole('button', { name: '지금 시작', exact: true }).click();
  await page.clock.fastForward(30000);
  await timer.getByRole('button', { name: 'DRAG RACE · 3분 쉬기', exact: true }).click();
  const race = page.getByRole('dialog', { name: 'DRAG RACE', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return race.isVisible();
    })
    .toBe(true);
  const raw = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  expect(JSON.parse(raw!).quickTimer.segmentStart).toBeNull();
  await race.getByRole('button', { name: '출발 준비', exact: true }).click();
  await race.getByRole('button', { name: '출발', exact: true }).click();
  await expect(race.getByRole('region', { name: '레이스 결과' })).toContainText('조금 빨랐어요');
  const until = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('bkit.drive-break.v1')!).until,
  );
  await race.getByRole('button', { name: '다시 달리기 · 남은 휴식 안에서', exact: true }).click();
  await page.reload();
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return race.isVisible();
    })
    .toBe(true);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('bkit.drive-break.v1')!).until),
  ).toBe(until);
  await page.clock.fastForward(181000);
  await expect(race).not.toBeVisible();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  for (const key of ['quickTimer', 'sessions', 'tasks', 'learning'])
    expect(restored[key]).toEqual(JSON.parse(raw!)[key]);
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeVisible();
});
test('race completes with acceleration and shifting without changing learning or credits', async ({
  page,
}) => {
  await prepare(page);
  await openGarage(page, true);
  await page.getByRole('button', { name: 'DRAG RACE · 3분 쉬기', exact: true }).click();
  const race = page.getByRole('dialog', { name: 'DRAG RACE', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return race.isVisible();
    })
    .toBe(true);
  const before = await page.evaluate(() => [
    localStorage.getItem('bkit.study-os.v1'),
    localStorage.getItem('bkit.drive-garage.v1'),
  ]);
  await race.getByRole('button', { name: '출발 준비', exact: true }).click();
  await page.clock.runFor(3100);
  await expect(race.getByRole('status')).toContainText('GO');
  await race.getByRole('button', { name: '출발', exact: true }).click();
  await page.keyboard.down('Space');
  for (const duration of [1150, 1300, 1700, 2200]) {
    await page.clock.runFor(duration);
    await race.getByRole('button', { name: '기어 ↑ 변속', exact: true }).click();
  }
  await page.clock.runFor(10000);
  await page.keyboard.up('Space');
  await expect(race.getByRole('region', { name: '레이스 결과' })).toContainText('200m 완주');
  const after = await page.evaluate(() => [
    localStorage.getItem('bkit.study-os.v1'),
    localStorage.getItem('bkit.drive-garage.v1'),
  ]);
  expect(after[0]).toBe(before[0]);
  const oldGarage = JSON.parse(before[1]!),
    savedGarage = JSON.parse(after[1]!);
  expect({ ...savedGarage, raceRecords: oldGarage.raceRecords }).toEqual(oldGarage);
  expect(savedGarage.raceRecords).toHaveLength(oldGarage.raceRecords.length + 1);
  expect(savedGarage.raceRecords.at(-1)).toMatchObject({ distance: 200 });
  await race.getByRole('button', { name: '학습으로 복귀', exact: true }).click();
  await expect(race).not.toBeVisible();
});
test('DRIVE problem cars, answer rewards and break return preserve the current draft', async ({
  page,
}) => {
  const s = addResource(
    newState(),
    {
      title: 'DRIVE 모의고사',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['첫 문제', '둘째 문제'],
  );
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await page.addInitScript((value) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(value));
  }, s);
  await page.goto('./');
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await page.getByRole('button', { name: 'DRIVE MODE', exact: true }).click();
  await expect(page.getByLabel('문제별 자동차 진행')).toContainText('1번');
  await page.getByLabel('최종 답', { exact: true }).fill('x = 3');
  await page.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
  await page.getByRole('button', { name: '정답 · 직접 확인했어요', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).credits),
    )
    .toBe(7);
  const rewards = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).transactions,
  );
  expect(rewards.map((t: { reason: string }) => t.reason).sort()).toEqual(['answer', 'start']);
  await page.getByRole('button', { name: '다음 문제', exact: true }).click();
  await page.getByLabel('최종 답', { exact: true }).fill('둘째 문제 작성 중');
  await page.getByRole('button', { name: 'DRAG RACE · 3분 쉬기', exact: true }).click();
  const race = page.getByRole('dialog', { name: 'DRAG RACE', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return race.isVisible();
    })
    .toBe(true);
  await page.clock.fastForward(181000);
  await expect(race).not.toBeVisible();
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('둘째 문제 작성 중');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(stored.active.resourceId).toBe(s.learning!.resources[0].id);
  expect(stored.active.segmentStart).toBeNull();
  expect(stored.learning.resources[0].currentProblemId).toBe(s.learning!.problems[1].id);
  await page.reload();
  await page.locator('nav button:visible').filter({ hasText: '집중' }).click();
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('둘째 문제 작성 중');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).credits),
  ).toBe(7);
});
test('storage-full and concurrent tab purchases preserve balances and study bytes', async ({
  page,
  context,
}) => {
  await page.addInitScript(
    (g) => {
      if (!localStorage.getItem('bkit.drive-garage.v1'))
        localStorage.setItem('bkit.drive-garage.v1', JSON.stringify(g));
    },
    { ...newGarage(), credits: 30 },
  );
  await page.goto('./');
  await openGarage(page);
  const second = await context.newPage();
  await second.goto('./');
  await openGarage(second);
  await page.getByRole('button', { name: '15 CR로 열기', exact: true }).click();
  await page.getByRole('button', { name: '구매 확정', exact: true }).click();
  await expect(second.getByRole('button', { name: '20 CR로 열기', exact: true })).toBeDisabled();
  const before = await page.evaluate(() => localStorage.getItem('bkit.drive-garage.v1'));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'bkit.drive-garage.v1') throw new DOMException('Full', 'QuotaExceededError');
      original.call(this, k, v);
    };
  });
  await page.getByRole('button', { name: '블루', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'TOHEŞAR GARAGE' }).getByRole('alert'),
  ).toContainText('저장하지 못했어요');
  expect(await page.evaluate(() => localStorage.getItem('bkit.drive-garage.v1'))).toBe(before);
});

test('shared car and reduced motion apply to DRIVE and the race', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const timer = await prepare(page);
  await openGarage(page, true);
  await page.getByRole('button', { name: '블루', exact: true }).click();
  await page.getByLabel('애니메이션 숨기기', { exact: true }).click();
  await expect(page.getByLabel('애니메이션 숨기기', { exact: true })).toBeChecked();
  await page.locator('nav button:visible').filter({ hasText: '오늘' }).click();
  await timer.getByRole('button', { name: 'DRIVE MODE', exact: true }).click();
  await timer.getByRole('button', { name: '지금 시작', exact: true }).click();
  const drive = page.getByRole('region', { name: 'DRIVE 집중 계기판' });
  await expect(drive).toHaveAttribute('data-motion', 'none');
  await expect(drive.locator('.car-wheel').first()).toHaveCSS('animation-name', 'none');
  await expect(drive.locator('.tohesar-car')).toHaveAttribute('data-color', 'blue');
  await timer.getByRole('button', { name: 'DRAG RACE · 3분 쉬기', exact: true }).click();
  const race = page.getByRole('dialog', { name: 'DRAG RACE', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return race.isVisible();
    })
    .toBe(true);
  await expect(race).toHaveAttribute('data-motion', 'none');
  await expect(race.locator('.tohesar-car')).toHaveAttribute('data-color', 'blue');
  expect(await race.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test('an expired break on reload returns to the study route and keeps the timer paused', async ({
  page,
}) => {
  const timer = await prepare(page);
  await timer.getByRole('button', { name: '지금 시작', exact: true }).click();
  await timer.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.evaluate(() =>
    sessionStorage.setItem(
      'bkit.drive-break.v1',
      JSON.stringify({ until: Date.now() - 1000, route: 'study', scroll: 100 }),
    ),
  );
  await page.reload();
  await page.clock.runFor(500);
  await expect(page.locator('.app-shell')).toHaveClass(/page-study/);
  await expect(page.getByRole('dialog', { name: 'DRAG RACE', exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('bkit.drive-break.v1'))).toBeNull();
});

test('INTERMISSION keeps the break deadline through rooms and reload, and WAKE pauses actual study', async ({
  page,
}) => {
  const timer = await prepare(page);
  await timer.getByRole('button', { name: '지금 시작', exact: true }).click();
  await page.clock.fastForward(30000);
  await timer.getByRole('button', { name: 'INTERMISSION · 쉬기', exact: true }).click();
  const room = page.getByRole('dialog', { name: 'INTERMISSION', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return room.isVisible();
    })
    .toBe(true);
  const paused = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  expect(JSON.parse(paused!).quickTimer.elapsed).toBe(30);
  expect(JSON.parse(paused!).quickTimer.segmentStart).toBeNull();
  await room.getByRole('button', { name: '바다', exact: true }).click();
  await room.getByText('지금부터 쉴 시간 선택', { exact: true }).click();
  await room.getByRole('button', { name: '지금부터 5분 쉬기', exact: true }).click();
  const until = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('bkit.drive-break.v1')!).until,
  );
  await page.reload();
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return room.isVisible();
    })
    .toBe(true);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('bkit.drive-break.v1')!).until),
  ).toBe(until);
  await room.getByRole('button', { name: 'WAKE BOMB · 30초 리셋', exact: true }).click();
  const wake = page.getByRole('dialog', { name: 'WAKE BOMB', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return wake.isVisible();
    })
    .toBe(true);
  await wake.getByRole('button', { name: 'ICE RESET', exact: true }).click();
  await page.clock.fastForward(31000);
  await expect(wake).not.toBeVisible();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  for (const key of [
    'quickTimer',
    'active',
    'sessions',
    'tasks',
    'learning',
    'plan',
    'settings',
    'reviewsDone',
  ])
    expect(restored[key]).toEqual(JSON.parse(paused!)[key]);
  expect(
    restored.learningEvents.every((e: { type: string }) => e.type === 'RecommendationShown'),
  ).toBe(true);
  await expect(timer.getByRole('button', { name: '이어하기', exact: true })).toBeVisible();
});

test('question sprint measures actual time independently from solved output and survives a reset', async ({
  page,
}) => {
  const t = new Date('2026-10-19T12:00:00Z');
  const s = addResource(
    newState(),
    {
      title: '시간 연습',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['첫 문제', '둘째 문제'],
  );
  await page.clock.install({ time: t });
  await page.clock.pauseAt(new Date(+t + 1000));
  await page.addInitScript((value) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(value));
  }, s);
  await page.goto('./');
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await page.getByRole('button', { name: 'MINI', exact: true }).click();
  const sprint = page.getByRole('region', { name: '문제별 시간 진행', exact: true });
  await page.clock.fastForward(160000);
  await expect(sprint.getByRole('timer')).toHaveText('02:40');
  await expect(sprint.getByRole('progressbar')).toHaveAttribute('value', '160');
  await page.getByRole('button', { name: '다음 문제', exact: true }).click();
  await page.clock.fastForward(10000);
  await expect(sprint.getByRole('timer')).toHaveText('00:10');
  await page.getByRole('button', { name: '이전 문제', exact: true }).click();
  await expect(sprint.getByRole('timer')).toHaveText('02:40');
  await page.getByLabel('최종 답', { exact: true }).fill('초안을 유지해요');
  await page.getByRole('button', { name: 'WAKE BOMB · 30초 리셋', exact: true }).click();
  const wake = page.getByRole('dialog', { name: 'WAKE BOMB', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return wake.isVisible();
    })
    .toBe(true);
  await page.clock.fastForward(31000);
  await expect(wake).not.toBeVisible();
  await expect(sprint.getByRole('timer')).toHaveText('02:40');
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('초안을 유지해요');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active.elapsed).toBe(170);
  expect(saved.learning.attempts).toHaveLength(0);
});

test('new garage layers and confirmed ownership persist after refresh', async ({
  page,
}, testInfo) => {
  await page.addInitScript(
    (g) => {
      if (!localStorage.getItem('bkit.drive-garage.v1'))
        localStorage.setItem('bkit.drive-garage.v1', JSON.stringify(g));
    },
    { ...newGarage(), credits: 30 },
  );
  await page.goto('./');
  await openGarage(page);
  await page.getByLabel('휠 색상 · 무료', { exact: true }).selectOption('bronze');
  await page.getByLabel('서스펜션 높이 · 외형 전용', { exact: true }).selectOption('low');
  await page.getByRole('button', { name: '15 CR로 열기', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).credits),
  ).toBe(30);
  await page.getByRole('button', { name: '구매 확정', exact: true }).click();
  await page.getByLabel('휠', { exact: true }).selectOption('aero');
  await page.reload();
  await openGarage(page);
  await expect(page.getByLabel('휠 색상 · 무료', { exact: true })).toHaveValue('bronze');
  await expect(page.getByLabel('서스펜션 높이 · 외형 전용', { exact: true })).toHaveValue('low');
  await expect(page.getByLabel('휠', { exact: true })).toHaveValue('aero');
  const garage = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!),
  );
  expect(garage.credits).toBe(15);
  expect(garage.transactions).toHaveLength(1);
  await page.screenshot({
    path: `test-results/garage-3.6-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('JUGGERNAUT saves a confirmed date and reads the existing study ledger', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('bkit.juggernaut.visited.v1', '1'));
  const timer = await prepare(page);
  await timer.getByRole('button', { name: '지금 시작', exact: true }).click();
  await page.clock.fastForward(60000);
  await timer.getByRole('button', { name: '일시정지', exact: true }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  await page.locator('nav button:visible').filter({ hasText: '더보기' }).click();
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return page.getByRole('button', { name: 'JUGGERNAUT', exact: true }).isVisible();
    })
    .toBe(true);
  await page.getByRole('button', { name: 'JUGGERNAUT', exact: true }).click();
  const dashboard = page.getByRole('region', { name: 'JUGGERNAUT 실제 학습 현황', exact: true });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return dashboard.isVisible();
    })
    .toBe(true);
  await expect(dashboard).toContainText('시험 날짜를 직접 확인해 설정하세요.');
  await expect(dashboard).toContainText('01:00');
  await dashboard.getByText('나의 시험 날짜·주간 목표 설정', { exact: true }).click();
  await dashboard.getByLabel('확인한 시험 날짜', { exact: true }).fill('2027-11-18');
  await dashboard.getByLabel('주간 학습 목표 (분)', { exact: true }).fill('120');
  await dashboard.getByRole('button', { name: '나의 목표 저장', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.juggernaut).toEqual({ examDate: '2027-11-18', weeklyMinutes: 120 });
  expect(saved.quickTimer).toEqual(before.quickTimer);
  expect(saved.sessions).toEqual(before.sessions);
  await page.screenshot({
    path: `test-results/juggernaut-3.6-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
