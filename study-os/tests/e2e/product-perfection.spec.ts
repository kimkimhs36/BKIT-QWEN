import { test, expect, type Page } from './local-fixture';
import AxeBuilder from '@axe-core/playwright';
import { newState } from '../../src/model';
import { addResource } from '../../src/learningEngine';
import { finishQuick, startQuick, labelQuick } from '../../src/quickTimer';

async function seed(page: Page) {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  let s = addResource(
    newState(),
    {
      title: '내 모의고사',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['극한을 구하고 근거를 설명하라'],
  );
  s = finishQuick(
    startQuick(s, 'stopwatch', 480, Date.parse('2026-10-18T12:00:00Z'), 'older'),
    Date.parse('2026-10-18T12:01:00Z'),
  );
  s = labelQuick(s, 'older', '생명과학', '어제 공부', '이전 메모');
  s = finishQuick(
    startQuick(s, 'stopwatch', 480, Date.parse('2026-10-18T13:00:00Z'), 'newer'),
    Date.parse('2026-10-18T13:02:00Z'),
  );
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, s);
  await page.goto('./');
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
}
async function progress(page: Page) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '더보기', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole('navigation', { name: '추가 도구', exact: true })
    .getByRole('button', { name: '기록', exact: true })
    .click();
}

test('one tap → real worksheet → attempted answer → immediate durable session', async ({
  page,
}) => {
  await seed(page);
  await page.screenshot({ path: test.info().outputPath('now-before-start.png') });
  await page.getByRole('button', { name: '스톱워치 바로 시작', exact: true }).click();
  const id = (await saved(page)).quickTimer.id;
  await page.clock.fastForward(65000);
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await expect(page.getByRole('region', { name: '다중 문제 학습실' })).toBeVisible();
  expect((await saved(page)).active.id).toBe(id);
  expect((await saved(page)).active.quickMode).toBe('stopwatch');
  await expect(page.getByLabel('집중 타이머', { exact: true })).toContainText('01:');
  expect((await saved(page)).quickTimer).toBeNull();
  await page.getByLabel('최종 답', { exact: true }).fill('직접 구한 답과 이유');
  await page.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
  await page.getByRole('button', { name: '오답 · 다시 연습', exact: true }).click();
  await page.clock.fastForward(35000);
  await page.getByRole('button', { name: '저장하고 학습 종료', exact: true }).click();
  // Quick study does not ask for mandatory end-of-session quantities or labels.
  expect((await saved(page)).active).toBeNull();
  const result = (await saved(page)).sessions.find((s: { id: string }) => s.id === id);
  expect(result.seconds).toBeGreaterThanOrEqual(100);
  expect(result).toMatchObject({
    quick: true,
    problems: 1,
    subject: '수학',
    action: '내 모의고사',
  });
  expect((await saved(page)).learning.attempts[0].selfCheck).toBe('incorrect');
  await page.reload();
  expect((await saved(page)).sessions.find((s: { id: string }) => s.id === id).seconds).toBe(
    result.seconds,
  );
  await page.screenshot({ path: test.info().outputPath('now-after-session.png') });
});

test('older quick history edits preserve duration, other records and custom subjects', async ({
  page,
}) => {
  await seed(page);
  const before = (await saved(page)).sessions;
  await progress(page);
  const row = page.locator('.session-row').filter({ hasText: '어제 공부' });
  await row.getByRole('button', { name: '공부 기록 수정', exact: true }).click();
  const form = row.getByRole('form', { name: '공부 기록 내용 수정' });
  await expect(form.getByLabel('과목 (선택)')).toHaveValue('생명과학');
  await form.getByLabel('짧은 메모 (선택)').fill('수정한 메모');
  await form.getByRole('button', { name: '내용 저장', exact: true }).click();
  const after = (await saved(page)).sessions;
  expect(after[0]).toEqual({ ...before[0], concepts: '수정한 메모' });
  expect(after[1]).toEqual(before[1]);
  await page.reload();
  await progress(page);
  await expect(page.getByText('개념: 수정한 메모', { exact: true })).toBeVisible();
});

test('failed history save keeps the draft and exact original, then allows retry', async ({
  page,
}) => {
  await seed(page);
  await progress(page);
  const row = page.locator('.session-row').filter({ hasText: '어제 공부' });
  await row.getByRole('button', { name: '공부 기록 수정' }).click();
  const form = row.getByRole('form', { name: '공부 기록 내용 수정' });
  await form.getByLabel('짧은 메모 (선택)').fill('실패해도 남길 초안');
  const original = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => {
      Storage.prototype.setItem = originalSet;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'bkit.study-os.v1') throw new DOMException('full', 'QuotaExceededError');
      originalSet.call(this, key, value);
    };
  });
  await form.getByRole('button', { name: '내용 저장' }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(form.getByLabel('짧은 메모 (선택)')).toHaveValue('실패해도 남길 초안');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(original);
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await form.getByRole('button', { name: '내용 저장' }).click();
  expect((await saved(page)).sessions[0].concepts).toBe('실패해도 남길 초안');
});

test('quick controls remain accessible after rotation and reject a stale second tab', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '스톱워치 바로 시작', exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  const timer = page.getByRole('region', { name: '바로 시작 타이머' });
  await timer.getByRole('button', { name: '일시정지', exact: true }).click();
  await expect(timer.getByRole('button', { name: '이어하기', exact: true })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .include('.quick-timer')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  const second = await context.newPage();
  await second.goto('./');
  await second
    .getByRole('region', { name: '바로 시작 타이머' })
    .getByRole('button', { name: '이어하기', exact: true })
    .click();
  const external = await second.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await timer.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  await expect(page.getByText(/다른 탭에서 데이터가 변경/).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(external);
  await second.close();
});

test('edited memo blocks navigation until explicitly saved or deferred', async ({ page }) => {
  await seed(page);
  await progress(page);
  const row = page.locator('.session-row').filter({ hasText: '어제 공부' });
  await row.getByRole('button', { name: '공부 기록 수정' }).click();
  const form = row.getByRole('form', { name: '공부 기록 내용 수정' });
  await form.getByLabel('짧은 메모 (선택)').fill('아직 저장하지 않은 메모');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '오늘', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(form.getByRole('alert')).toContainText('수정한 내용');
  await expect(form.getByLabel('짧은 메모 (선택)')).toHaveValue('아직 저장하지 않은 메모');
  await form.getByRole('button', { name: '내용 저장' }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '오늘', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '스톱워치 바로 시작', exact: true })).toBeVisible();
  expect((await saved(page)).sessions[0].concepts).toBe('아직 저장하지 않은 메모');
});

test('JSON backup snapshots a live timer and restore cannot replace it until finished', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '스톱워치 바로 시작', exact: true }).click();
  await page.clock.fastForward(65000);
  const live = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  async function settings() {
    await page
      .getByRole('navigation')
      .getByRole('button', { name: '더보기', exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page
      .getByRole('navigation', { name: '추가 도구', exact: true })
      .getByRole('button', { name: '설정', exact: true })
      .click();
  }
  await settings();
  await expect(page.getByLabel('JSON 백업 파일')).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 백업 내보내기', exact: true }).click();
  const file = await download;
  const { readFile } = await import('node:fs/promises');
  const snapshot = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(snapshot.quickTimer.segmentStart).toBeNull();
  expect(snapshot.quickTimer.elapsed).toBeGreaterThanOrEqual(65);
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(live);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '오늘', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole('region', { name: '바로 시작 타이머' })
    .getByRole('button', { name: '끝내고 시간 저장', exact: true })
    .click();
  await settings();
  await page.getByLabel('JSON 백업 파일').setInputFiles({
    name: 'snapshot.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await page.getByRole('button', { name: '백업으로 교체', exact: true }).click();
  const restored = await saved(page);
  expect(restored.quickTimer.segmentStart).toBeNull();
  expect(restored.quickTimer.elapsed).toBe(snapshot.quickTimer.elapsed);
});
