import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { addResource } from '../../src/learningEngine';
import { newGarage } from '../../src/drive/garage';
test.setTimeout(90000);
test.use({ timezoneId: 'Asia/Seoul' });
const t = Date.parse('2026-10-19T05:00:00Z');
async function more(page: Page, name: string, virtual = false) {
  await page.locator('nav button:visible').filter({ hasText: '더보기' }).click();
  if (virtual)
    await clockVisible(
      page,
      page
        .getByRole('navigation', { name: '추가 도구' })
        .getByRole('button', { name, exact: true }),
    );
  await page
    .getByRole('navigation', { name: '추가 도구' })
    .getByRole('button', { name, exact: true })
    .click();
}
async function settings(page: Page) {
  await page.getByRole('button', { name: '더 보기', exact: true }).click();
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
}
async function seed(page: Page) {
  const s = addResource(
    newState(),
    {
      title: '실전 연습 자료',
      subject: '수학',
      sourceType: 'user-note',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['첫 문제', '둘째 문제', '셋째 문제'],
    t,
  );
  await page.clock.install({ time: t });
  await page.clock.pauseAt(t + 1000);
  await page.addInitScript(
    ({ s, g }) => {
      if (!localStorage.getItem('bkit.study-os.v1'))
        localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
      if (!localStorage.getItem('bkit.drive-garage.v1'))
        localStorage.setItem('bkit.drive-garage.v1', JSON.stringify(g));
      localStorage.setItem('bkit.juggernaut.skip-intro.v1', '1');
    },
    { s, g: newGarage(t - 1000) },
  );
  await page.goto('./');
  return s;
}
async function clockVisible(page: Page, locator: ReturnType<Page['getByRole']>) {
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return locator.isVisible();
    })
    .toBe(true);
}
const read = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));

test('nine material previews apply and restore without changing study data', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await settings(page);
  const panel = page.getByRole('region', { name: '재질 테마 설정' });
  await expect(panel).toBeVisible();
  const original = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  const themes = [
    ['peach', 'Peach Flow'],
    ['glass', 'Liquid Glass'],
    ['diamond', 'Diamond'],
    ['gold', 'Champagne Gold'],
    ['jelly', 'Soft Jelly'],
    ['droplets', 'Living Droplets'],
    ['night', 'Night Sprint'],
    ['forest', 'Forest Dark'],
    ['classic', 'Classic Light'],
  ];
  for (const [id, name] of themes) {
    const before = await page.locator('html').getAttribute('data-material');
    await panel
      .getByRole('group', { name: '테마 미리보기 선택' })
      .getByRole('button', { name: new RegExp(name) })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-material', before!);
    await expect(panel.getByRole('region', { name: name + ' 미리보기' })).toBeVisible();
    await panel.getByRole('button', { name: name + ' 적용', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', id);
  }
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(original);
  await panel.getByRole('button', { name: 'Peach Flow', exact: true }).click();
  await panel.getByRole('button', { name: 'Peach Flow 적용', exact: true }).click();
  await panel.getByLabel('배터리 절약 · 정적 재질').check();
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'peach');
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 240, 231)');
});

test('garage tuning changes the shared car and survives reopening', async ({ page }) => {
  await page.goto('./');
  await more(page, 'TOHEŞAR GARAGE');
  const garage = page.getByRole('region', { name: 'TOHEŞAR GARAGE' });
  await garage.getByLabel('도장 재질').selectOption('matte');
  await garage.getByLabel('범퍼 · 외형').selectOption('sport');
  await garage.getByLabel('데칼', { exact: true }).selectOption('number');
  await garage.getByLabel('사이드 스커트').click();
  await expect(garage.getByLabel('사이드 스커트')).toBeChecked();
  await garage.getByLabel('차고 조명').selectOption('warm');
  await garage.getByLabel('차량 이름').fill('나의 첫 투어러');
  await garage.getByRole('button', { name: '이름 저장' }).click();
  await expect(garage.locator('.tohesar-car')).toHaveAttribute('data-finish', 'matte');
  await expect(garage.locator('.tohesar-car')).toHaveAttribute('data-trim', 'sport');
  await expect(garage.locator('.tohesar-car text')).toHaveText('36');
  await expect(garage.locator('.garage-showroom')).toHaveClass(/light-warm/);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).car,
  );
  await page.reload();
  await more(page, 'TOHEŞAR GARAGE');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).car),
  ).toEqual(saved);
  await garage.getByRole('button', { name: 'DRAG RACE · 3분 쉬기' }).click();
  const race = page.getByRole('dialog', { name: 'DRAG RACE', exact: true });
  await expect(race).toBeVisible();
  await race.getByLabel('레이스 거리').selectOption('400');
  await expect(race.locator('.tohesar-car')).toHaveAttribute('data-finish', 'matte');
  await expect(race.locator('.tohesar-car')).toHaveAttribute('data-trim', 'sport');
  await expect(race).toContainText('나의 첫 투어러');
  await race.getByRole('button', { name: '학습으로 돌아가기 ↗' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('mock exam preserves shared timing, notes, skipped questions and answers after expiry and reload', async ({
  page,
}) => {
  await seed(page);
  await more(page, 'JUGGERNAUT', true);
  const setup = page.locator('.mock-exam-setup').filter({ hasText: '모의고사 실전 연습' });
  await clockVisible(page, setup);
  await setup.locator('summary').click();
  await setup.getByLabel('시험 시간 (분)').fill('1');
  await setup.getByLabel('시험 문항 수').fill('2');
  await setup.getByRole('button', { name: '이 자료로 모의시험 시작' }).click();
  const race = page.getByRole('region', { name: '문제별 시간 진행' });
  await clockVisible(page, race);
  await page.getByRole('button', { name: 'MINI', exact: true }).click();
  await page.clock.fastForward(15000);
  const beforeDisplayChange = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await race.getByRole('button', { name: '차량 숨기기', exact: true }).click();
  await expect(race.locator('.question-track')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(
    beforeDisplayChange,
  );
  await race.getByRole('button', { name: '차량 켜기', exact: true }).click();
  await expect(race.locator('.question-track')).toBeVisible();
  await race.getByLabel('풀이 메모', { exact: true }).fill('조건을 다시 확인');
  await page.getByLabel('최종 답', { exact: true }).fill('보관할 답안');
  await race.getByText('문제 페이스·검토', { exact: true }).click();
  await race.getByRole('button', { name: '나중에 검토 표시' }).click();
  await race.getByRole('button', { name: '풀이를 유지하고 넘어가기' }).click();
  await page.clock.fastForward(10000);
  await page.getByRole('button', { name: 'DRAG RACE · 3분 쉬기', exact: true }).click();
  const game = page.getByRole('dialog', { name: 'DRAG RACE', exact: true });
  await clockVisible(page, game);
  await page.clock.fastForward(30000);
  await game.getByRole('button', { name: '학습으로 돌아가기 ↗' }).click();
  await expect(race.getByRole('timer')).toHaveText('00:10');
  await page.getByRole('button', { name: '다시 시작', exact: true }).click();
  await page.getByRole('button', { name: '이전 문제', exact: true }).click();
  await expect(race.getByLabel('풀이 메모')).toHaveValue('조건을 다시 확인');
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('보관할 답안');
  await page.clock.fastForward(40000);
  const status = page.getByRole('region', { name: '모의시험 현황' });
  await expect(status.getByRole('timer')).toHaveText('00:00');
  await expect(status).toContainText('시험 시간이 끝났어요');
  const s = await read(page);
  expect(s.active.elapsed).toBe(60);
  expect(s.active.segmentStart).toBeNull();
  expect(s.active.exam.problemIds).toHaveLength(2);
  expect(s.active.questionPace.skipped).toHaveLength(2);
  await page.reload();
  await page.locator('nav button:visible').filter({ hasText: '집중' }).click();
  await clockVisible(page, race);
  await expect(race.getByLabel('풀이 메모')).toHaveValue('조건을 다시 확인');
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('보관할 답안');
  await expect(page.getByRole('button', { name: '다시 시작', exact: true })).toBeDisabled();
});

test('camera remains opt-in, denial preserves the original answer and manual study', async ({
  page,
}) => {
  await seed(page);
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/awake/') || r.url().includes('awake-engine-')) requests.push(r.url());
  });
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await clockVisible(page, page.getByLabel('최종 답', { exact: true }));
  await page.getByLabel('최종 답', { exact: true }).fill('카메라 없이 푸는 답');
  await page.locator('.awake-assist summary').click();
  expect(requests).toEqual([]);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException('denied', 'NotAllowedError');
        },
      },
    });
  });
  await page.getByRole('button', { name: '카메라 켜고 기기 내 분석 시작' }).click();
  await expect(page.locator('.awake-assist')).toContainText('카메라 권한을 허용하지 않았어요');
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('카메라 없이 푸는 답');
  expect(requests).toEqual([]);
  expect((await read(page)).active.segmentStart).not.toBeNull();
});

test('two tabs claim one completion reward and buy one part from the same ledger', async ({
  page,
  context,
}) => {
  const at = Date.now(),
    s = newState();
  s.tasks = [
    {
      id: 'shared-task',
      subject: '영어',
      title: '직접 완료한 수행평가',
      kind: '수행평가',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 1,
      status: 'done',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
      completedAt: new Date(at - 1000).toISOString(),
    },
  ];
  await context.addInitScript(
    ({ s, g }) => {
      if (!localStorage.getItem('bkit.study-os.v1'))
        localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
      if (!localStorage.getItem('bkit.drive-garage.v1'))
        localStorage.setItem('bkit.drive-garage.v1', JSON.stringify(g));
    },
    { s, g: newGarage(at - 2000) },
  );
  await page.goto('./');
  await more(page, 'TOHEŞAR GARAGE');
  const other = await context.newPage();
  await other.goto('./');
  await more(other, 'TOHEŞAR GARAGE');
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).credits),
    )
    .toBe(15);
  await Promise.all([
    page.getByRole('button', { name: '10 CR로 열기', exact: true }).click(),
    other.getByRole('button', { name: '10 CR로 열기', exact: true }).click(),
  ]);
  const originalStudy = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  // Native clicks preserve disabled-button behavior when the other tab wins first.
  // Playwright's actionability retry would wait for an intentionally disabled button.
  await Promise.all([
    page
      .getByRole('button', { name: '구매 확정', exact: true })
      .evaluate((el) => (el as HTMLButtonElement).click()),
    other
      .getByRole('button', { name: '구매 확정', exact: true })
      .evaluate((el) => (el as HTMLButtonElement).click()),
  ]);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!).credits),
    )
    .toBe(5);
  const g = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.drive-garage.v1')!));
  expect(g.owned).toEqual(['wing']);
  expect(g.claimed).toEqual(['task:shared-task']);
  expect(g.transactions.map((t: { reason: string }) => t.reason)).toEqual(['task', 'purchase']);
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(originalStudy);
  await other.close();
});

test('rest ambience requires a tap and releases audio when returning to study', async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const Base = window.AudioContext;
    (window as typeof window & { audioCounts?: { created: number; closed: number } }).audioCounts =
      { created: 0, closed: 0 };
    window.AudioContext = class extends Base {
      constructor() {
        super();
        (window as typeof window & { audioCounts: { created: number } }).audioCounts.created++;
      }
      override async close() {
        (window as typeof window & { audioCounts: { closed: number } }).audioCounts.closed++;
        await super.close();
      }
    };
  });
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await clockVisible(page, page.getByLabel('최종 답', { exact: true }));
  await page.getByLabel('최종 답', { exact: true }).fill('휴식 뒤 이어갈 답');
  await page.getByRole('button', { name: 'INTERMISSION · 쉬기', exact: true }).click();
  const room = page.getByRole('dialog', { name: 'INTERMISSION', exact: true });
  await clockVisible(page, room);
  await room.getByText('선택 · 합성 환경음', { exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as typeof window & { audioCounts: { created: number } }).audioCounts.created,
    ),
  ).toBe(0);
  await room.getByRole('button', { name: '환경음 재생', exact: true }).click();
  await expect(room.getByRole('button', { name: '환경음 중지', exact: true })).toBeVisible();
  await room.getByRole('button', { name: '수학 1번 문제로 돌아가기', exact: true }).last().click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { audioCounts: { closed: number } }).audioCounts.closed,
      ),
    )
    .toBe(1);
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('휴식 뒤 이어갈 답');
  expect((await read(page)).active.segmentStart).toBeNull();
});
