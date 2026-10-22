import { test, expect } from './local-fixture';

test.use({ reducedMotion: 'reduce', storageState: { cookies: [], origins: [] } });
for (const failure of ['503', 'offline', 'invalid-config', 'timeout'] as const) {
  test(`public notice entry exposes text intake and AI ${failure} never blocks local registration`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
    await page.route('**/api/config', (route) =>
      failure === 'offline'
        ? route.abort('failed')
        : failure === 'timeout'
          ? new Promise<void>(() => {})
          : route.fulfill({
              status: failure === '503' ? 503 : 200,
              headers: { 'Access-Control-Allow-Origin': '*' },
              json: failure === '503' ? { error: 'synthetic failure' } : { broken: true },
            }),
    );
    const uploads: string[] = [];
    page.on('request', (r) => {
      if (!['GET', 'HEAD'].includes(r.method())) uploads.push(r.url());
    });
    await page.goto('./');
    await page
      .locator('nav:visible')
      .getByRole('button', { name: '도구', exact: true })
      .first()
      .click();
    await page.getByRole('button', { name: '공지 정리', exact: true }).click();
    // The named entry must open writing directly, without discovering an "이전" button.
    await expect(page.getByLabel('오늘 해야 할 일', { exact: true })).toBeVisible();
    await page.getByLabel('오늘 해야 할 일', { exact: true }).fill('영어 발표 직접 등록');
    await page.getByText('AI로 할 일 정리 · 선택', { exact: true }).click();
    if (failure === 'timeout') {
      await expect(page.getByRole('status').filter({ hasText: 'AI 연결 상태' })).toBeVisible();
      await page.clock.fastForward(11000);
    }
    await expect(
      page.getByText('AI 서버에 연결하지 못했어요. 직접 정리는 계속 사용할 수 있어요.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: '사진 없이 과제 확인하기' }).click();
    await page.getByLabel('과제 1 확인', { exact: true }).check();
    await page.getByRole('button', { name: '확인하고 BKIT에 저장' }).click();
    await page.reload();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      title: '영어 발표 직접 등록',
      due: null,
      submitted: false,
    });
    expect(uploads).toEqual([]);
  });
}
