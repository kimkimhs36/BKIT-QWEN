import { test, expect } from './local-fixture';
test.use({ serviceWorkers: 'allow' });

test('installed offline shell reopens a saved notice and preserves a real local maths attempt', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.goto('./');
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await page.getByRole('button', { name: '사진·PDF 공지 추가', exact: true }).click();
  await page.getByLabel('원본 공지', { exact: true }).fill('오프라인에서도 잊지 않을 합성 공지');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
  await expect(page.getByLabel('원본 공지', { exact: true })).toHaveValue(
    '오프라인에서도 잊지 않을 합성 공지',
  );
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '오늘', exact: true })
    .click();
  await page.getByRole('button', { name: '수능관 · 기초 훈련', exact: true }).click();
  const room = page.getByRole('region', { name: 'BKIT 수능관' });
  await room.getByRole('button', { name: /실제 문제 시작/ }).click();
  await room.getByRole('textbox', { name: '숫자 답안' }).fill('99999');
  await room.getByRole('button', { name: /답 확인하기/ }).click();
  await expect(room).toContainText('다시 배울 지점을 찾았어요');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.juggernaut.v1.device')!).attempts.length,
    ),
  ).toBe(1);
});
