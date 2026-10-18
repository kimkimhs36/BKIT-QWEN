import { test, expect } from './local-fixture';
test('Capture v2: date-only deadline and number of problems survive restart and edit', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-15T05:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '더 보기' }).click();
  await page.getByRole('button', { name: '빠른 한 줄 입력' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: '할 일을 한 문장으로' })
    .fill('금요일까지 수학 숙제 20문제');
  await expect(dialog.getByLabel('빠른 등록 과목')).toHaveValue('수학');
  await expect(dialog.getByLabel('빠른 등록 마감')).toHaveValue('2026-10-16');
  await expect(dialog.getByLabel('마감 확실성')).toHaveValue('date-only');
  await expect(dialog.getByLabel('분량 단위')).toHaveValue('problems');
  await expect(dialog.getByLabel('전체 분량')).toHaveValue('20');
  await dialog.getByRole('button', { name: '오늘에 담기' }).click();
  await expect(dialog).not.toBeVisible();
  const getSaved = async () =>
    page.evaluate(() => {
      const t = JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}').tasks?.[0];
      return t ? { title: t.title, deadline: t.deadline, quantity: t.quantity, due: t.due } : null;
    });
  expect(await getSaved()).toMatchObject({
    title: '금요일까지 수학 숙제 20문제',
    deadline: { date: '2026-10-16', precision: 'date-only' },
    quantity: { unit: 'problems', total: 20, remaining: 20 },
  });
  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '과제', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator('.task-content').filter({ hasText: '시각 미확인' })).toBeVisible();
  await page.locator('.task-content').filter({ hasText: '금요일까지 수학 숙제 20문제' }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.locator('input[name="dueDate"]')).toHaveValue('2026-10-16');
  await expect(editor.locator('select[name="duePrecision"]')).toHaveValue('date-only');
  await expect(editor.locator('input[name="quantityTotal"]')).toHaveValue('20');
  await editor.getByRole('button', { name: '닫기' }).click();
  expect(await getSaved()).toMatchObject({
    quantity: { total: 20 },
    deadline: { precision: 'date-only' },
  });
});
test('Capture v2: the confirmed 4 PM deadline stays exact', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T05:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '더 보기' }).click();
  await page.getByRole('button', { name: '빠른 한 줄 입력' }).click();
  const modal = page.getByRole('dialog');
  await modal
    .getByRole('textbox', { name: '할 일을 한 문장으로' })
    .fill('금요일 오후 4시까지 경제 수행평가 제출');
  await expect(modal.getByLabel('마감 확실성')).toHaveValue('exact-time');
  await expect(modal.getByLabel('정확한 마감 시각')).toHaveValue('16:00');
  await modal.getByRole('button', { name: '오늘에 담기' }).click();
  const saved = await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('bkit.study-os.v1') || '{}').tasks?.[0];
    return t ? { deadline: t.deadline, due: t.due } : null;
  });
  expect(saved).toMatchObject({ deadline: { date: '2026-10-16', precision: 'exact-time' } });
  expect(saved?.due).toBe('2026-10-16T07:00:00.000Z');
});
