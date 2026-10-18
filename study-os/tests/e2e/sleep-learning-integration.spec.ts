import { test, expect } from './local-fixture';
test.use({ timezoneId: 'Asia/Seoul' });
test('Sleep Guard caps only real focus time at bedtime and preserves the attempted problem', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.clock.install({ time: new Date('2026-10-19T10:54:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: 'Sleep Guard 열기', exact: true }).click();
  await page.getByText('요일별 일정 변경', { exact: true }).click();
  await page.getByLabel('목표 취침 시각', { exact: true }).fill('20:00');
  await page.getByLabel('목표 기상 시각', { exact: true }).fill('06:00');
  await page.getByLabel('모든 요일에 적용', { exact: true }).check();
  await page.getByRole('button', { name: '수면 일정 저장', exact: true }).click();
  await page.getByLabel('Sleep Guard 사용', { exact: true }).check();
  await page.getByRole('button', { name: '집중 화면으로 이동', exact: true }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '오늘', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: '5분만 시작', exact: true }).click();
  await page
    .getByLabel('지금 풀 문제 또는 떠올릴 질문', { exact: true })
    .fill('오늘 배운 개념 한 가지는?');
  await page.getByRole('button', { name: '문제 정하고 시작', exact: false }).click();
  await page.getByLabel('내 답을 먼저 써보기', { exact: true }).fill('수업에서 직접 배운 개념');
  await page.getByRole('button', { name: '내 답 저장', exact: false }).click();
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  const before = await read();
  await page.clock.fastForward(7 * 60000);
  await expect.poll(async () => (await read()).active.segmentStart).toBe(null);
  const after = await read();
  expect(after.active.id).toBe(before.active.id);
  expect(after.active.elapsed).toBeGreaterThan(0);
  expect(after.active.elapsed).toBeLessThanOrEqual(360);
  expect(after.active.workspace.attempts[0].answer).toBe('수업에서 직접 배운 개념');
  expect(after.sessions).toEqual([]);
  await page.reload();
  expect((await read()).active.id).toBe(before.active.id);
  await expect(page.getByRole('button', { name: '집중 화면으로', exact: false })).toBeVisible();
});

test('returning JUGGERNAUT selects a real task and starts the actual learning workspace', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-19T06:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '더 보기', exact: true }).click();
  await page.getByRole('button', { name: '빠른 한 줄 입력', exact: false }).click();
  await page.getByLabel('할 일을 한 문장으로', { exact: true }).fill('영어 지문 3개 외우기');
  await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
  const taskId = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks[0].id,
  );
  await page.getByRole('button', { name: '더 보기', exact: true }).click();
  await page.getByRole('button', { name: 'JUGGERNAUT · 시네마틱 아카이브', exact: false }).click();
  await expect(page.getByLabel('JUGGERNAUT 학습 과제', { exact: true })).toBeVisible();
  await page.getByLabel('JUGGERNAUT 학습 과제', { exact: true }).selectOption(taskId);
  await expect(page.locator('.jg-mission-instruction')).toContainText('첫 문장을 가리고 직접 해석');
  await page.getByRole('button', { name: '실제 과제로 5분 시작', exact: false }).click();
  await expect(page.getByRole('region', { name: '실제 문제 풀이' })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(state.active.taskId).toBe(taskId);
  expect(state.active.target).toBe(5);
  expect(state.sessions).toEqual([]);
});

test('enabling an earlier bedtime during study preserves time already actually studied', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.clock.install({ time: new Date('2026-10-19T10:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '5분만 시작', exact: true }).click();
  await page
    .getByLabel('지금 풀 문제 또는 떠올릴 질문', { exact: true })
    .fill('수면 설정 전에 풀던 문제');
  await page.getByRole('button', { name: '문제 정하고 시작', exact: false }).click();
  await page.clock.fastForward(15 * 60000);
  await page.getByRole('button', { name: '오늘로 · 타이머 유지', exact: false }).click();
  await page.getByRole('button', { name: 'Sleep Guard 열기', exact: true }).click();
  await page.getByText('요일별 일정 변경', { exact: true }).click();
  await page.getByLabel('목표 취침 시각', { exact: true }).fill('18:30');
  await page.getByLabel('모든 요일에 적용', { exact: true }).check();
  await page.getByRole('button', { name: '수면 일정 저장', exact: true }).click();
  await page.getByLabel('Sleep Guard 사용', { exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).active.segmentStart,
      ),
    )
    .toBe(null);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active.elapsed).toBeGreaterThanOrEqual(900);
  expect(saved.active.workspace.problem).toBe('수면 설정 전에 풀던 문제');
  expect(saved.sessions).toEqual([]);
});
