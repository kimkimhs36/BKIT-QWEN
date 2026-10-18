import { test, expect } from './local-fixture';
// These scenarios assert the phone dock; browser projects still exercise both engines.
test.use({ viewport: { width: 390, height: 844 } });

test('switching tabs always opens at top and keeps bottom content above floating glass dock', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  await expect(page.locator('.brand-glyph')).toHaveCount(0);
  await expect(page.locator('.v2-brand strong')).toContainText('BKIT');
  await page.locator('.today-more > summary').click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(70);
  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  await nav.getByRole('button', { name: '과제' }).click();
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  await expect(page.getByRole('heading', { name: '할 일', exact: true })).toBeInViewport();
  await nav.getByRole('button', { name: '오늘' }).click();
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bottom = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.orbit-nav')!.getBoundingClientRect();
    const footer = document.querySelector<HTMLElement>('.page-footer')!.getBoundingClientRect();
    const main = document.querySelector<HTMLElement>('.main-shell main')!;
    return {
      separated: footer.bottom <= nav.top - 12,
      safePad: parseFloat(getComputedStyle(main).paddingBottom) >= 145,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  expect(bottom.separated).toBe(true);
  expect(bottom.safePad).toBe(true);
  expect(bottom.horizontalOverflow).toBe(false);
});

test('real learner attempt persists across refresh and final session receipt', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '5분만 시작' }).click();
  const workspace = page.getByRole('region', { name: '실제 문제 풀이' });
  await expect(workspace).toBeVisible();
  await workspace.getByLabel('지금 풀 문제 또는 떠올릴 질문').fill('함수의 극한이 존재하려면?');
  await workspace.getByLabel('자료 출처 (선택)').fill('학교 수학 학습지 4쪽');
  await workspace.getByRole('button', { name: '문제 정하고 시작' }).click();
  await workspace.getByLabel('내 답을 먼저 써보기').fill('좌극한과 우극한이 같아야 해');
  await workspace.getByRole('button', { name: '내 답 저장' }).click();
  await expect(workspace.getByRole('button', { name: '다시 풀어야 해' })).toBeVisible();
  const initial = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}').active?.workspace,
  );
  expect(initial?.attempts?.[0]).toMatchObject({
    answer: '좌극한과 우극한이 같아야 해',
    selfCheck: 'unreviewed',
  });
  await workspace.getByRole('button', { name: '다시 풀어야 해' }).click();
  await workspace.getByLabel('다시 풀고 내 답 남기기').fill('좌우가 같은 하나의 값에 수렴해야 해');
  await workspace.getByRole('button', { name: '내 답 저장' }).click();
  await workspace.getByRole('button', { name: '내가 확인했어' }).click();
  const check = async () =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}');
      return {
        n: data.active?.workspace?.attempts?.length,
        checks: data.active?.workspace?.attempts?.map((a: { selfCheck: string }) => a.selfCheck),
      };
    });
  expect(await check()).toEqual({ n: 2, checks: ['retry', 'remembered'] });
  await page.reload();
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '집중' })
    .click();
  await expect(page.getByRole('region', { name: '실제 문제 풀이' })).toContainText(
    '함수의 극한이 존재하려면?',
  );
  await page.getByRole('button', { name: '학습량 기록 · 종료' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '학습 기록 저장 · 종료' }).click();
  const result = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}');
    return {
      active: data.active,
      saved: data.sessions?.[0]?.workspace?.attempts?.map((a: { answer: string }) => a.answer),
    };
  });
  expect(result.active).toBe(null);
  expect(result.saved).toHaveLength(2);
  await expect(page.getByText('내가 실제로 답한 문제')).toBeVisible();
});

test('problem workspace remains visible while focus timer is running', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T06:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '5분만 시작' }).click();
  const workspace = page.getByRole('region', { name: '실제 문제 풀이' });
  await workspace.getByLabel('지금 풀 문제 또는 떠올릴 질문').fill('원인과 결과 설명');
  await workspace.getByRole('button', { name: '문제 정하고 시작' }).click();
  await page.clock.runFor(6000);
  await expect(page.locator('.app-shell')).toHaveClass(/focus-learning/);
  await expect(page.locator('.app-shell')).not.toHaveClass(/focus-quiet/);
  await expect(workspace).toBeVisible();
  await expect(page.locator('.focus-readout .timer')).toBeVisible();
});
