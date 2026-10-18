import { test, expect, type Page } from './local-fixture';
async function tasks(page: Page) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '과제', exact: true })
    .filter({ visible: true })
    .first()
    .click();
}
test('exam scope remains unknown until confirmed, saves sources and survives reload', async ({
  page,
}) => {
  await page.goto('./');
  await tasks(page);
  const panel = page.getByRole('region', { name: '시험 범위 관리' });
  await panel.getByRole('button', { name: '시험 추가', exact: true }).click();
  await panel.getByLabel('시험 과목', { exact: true }).fill('경제');
  await panel.getByLabel('시험 이름', { exact: true }).fill('중간고사');
  await panel.getByLabel('포함 여부를 확인할 범위', { exact: true }).fill('3단원 포함 여부');
  await panel.getByRole('button', { name: '시험 정보 저장', exact: true }).click();
  await expect(panel).toContainText('범위 미확인');
  await expect(panel).toContainText('시험 날짜 미확인');
  await panel.getByRole('button', { name: '이 시험 수정', exact: true }).click();
  await panel.getByLabel('확인된 시험 범위', { exact: true }).fill('학교 학습지 1~2쪽');
  await panel.getByRole('button', { name: '시험 정보 저장', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('출처');
  await panel.getByLabel('시험 범위 출처', { exact: true }).fill('수업 공지 직접 확인');
  await panel.getByRole('button', { name: '시험 정보 저장', exact: true }).click();
  await page.reload();
  await tasks(page);
  await expect(panel).toContainText('범위 부분 확인');
  await expect(panel).toContainText('수업 공지 직접 확인');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.exams).toHaveLength(1);
  expect(saved.exams[0].date).toBeNull();
  expect(saved.tasks).toEqual([]);
});
test('new learning and exam forms fit ten CSS widths without overflow or overlapped controls', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('./');
  await tasks(page);
  const panel = page.getByRole('region', { name: '시험 범위 관리' });
  await panel.getByRole('button', { name: '시험 추가', exact: true }).click();
  for (const width of [320, 360, 390, 430, 600, 768, 800, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await panel.evaluate((node) => {
      const boxes = [...node.querySelectorAll('input,textarea')].map((e) =>
        e.getBoundingClientRect(),
      );
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        clipped: boxes.some((r) => r.left < 0 || r.right > innerWidth + 1),
        overlap: boxes.some((a, i) =>
          boxes
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 &&
                Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1,
            ),
        ),
      };
    });
    expect(geometry, `${width} CSS px`).toEqual({
      overflow: false,
      clipped: false,
      overlap: false,
    });
  }
});
