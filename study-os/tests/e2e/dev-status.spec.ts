import { expect, test } from './local-fixture';

const publicRepo = 'https://api.github.com/repos/kimkimhs36/BKIT-QWEN';
const liveSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const oldSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function json(body: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(body) };
}

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('founder development dashboard shows exact deployed/source SHA, CI, changed files without touching study data', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('bkit.study-os.v1', '{"unchanged":true}'));
  await page.route('**/build-info.json', (route) =>
    route.fulfill(json({ sourceCommit: liveSha, environment: 'preview' })),
  );
  await page.route('https://api.github.com/**', (route) => {
    const url = route.request().url();
    if (url === publicRepo + '/pulls/57')
      return route.fulfill(
        json({
          number: 57,
          draft: true,
          base: { ref: 'preview/bkit-notice-capture-20261110' },
          head: { sha: liveSha },
        }),
      );
    if (url === publicRepo + '/commits/' + liveSha)
      return route.fulfill(
        json({
          commit: { message: 'fix: preserve school notice original\nDetails' },
          files: [
            {
              filename: 'study-os/src/SchoolInboxPanel.tsx',
              additions: 4,
              deletions: 1,
              blob_url:
                'https://github.com/kimkimhs36/BKIT-QWEN/blob/test/study-os/src/SchoolInboxPanel.tsx',
            },
          ],
        }),
      );
    if (url.includes('/actions/runs?head_sha='))
      return route.fulfill(
        json({
          workflow_runs: [
            {
              head_sha: liveSha,
              name: 'BKIT school notice ZIP regression (isolated)',
              id: 1234,
              status: 'completed',
              conclusion: 'success',
              event: 'pull_request',
              html_url: 'https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/1234',
            },
          ],
        }),
      );
    if (url.includes('/commits?sha='))
      return route.fulfill(
        json([
          {
            sha: liveSha,
            html_url: 'https://github.com/kimkimhs36/BKIT-QWEN/commit/' + liveSha,
            commit: {
              message: 'feat: show real changes',
              committer: { date: '2026-11-12T09:00:00Z' },
            },
          },
        ]),
      );
    return route.abort();
  });
  await page.goto('./dev-status.html');
  await expect(
    page.getByRole('heading', { name: '뭘 만들고 있고, 제대로 작동하는가.' }),
  ).toBeVisible();
  await expect(page.locator('#deployed-version')).toHaveText(liveSha.slice(0, 12));
  await expect(page.locator('#github-version')).toHaveText(liveSha.slice(0, 12));
  await expect(page.locator('#version-match')).toContainText('같음');
  await expect(page.locator('#ci-result')).toHaveText('자동 검증 통과');
  await expect(page.locator('#commit-title')).toHaveText('fix: preserve school notice original');
  await expect(page.locator('#files')).toContainText('study-os/src/SchoolInboxPanel.tsx');
  await expect(page.locator('#history')).toContainText('feat: show real changes');
  await expect(page.getByRole('link', { name: '실제 실행 로그 직접 보기' })).toHaveAttribute(
    'href',
    'https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/1234',
  );
  const original = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await page.getByRole('button', { name: '최신 상태 다시 조회' }).click();
  await expect(page.locator('#version-match')).toContainText('같음');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(original);
});

test('iPhone home exposes the development dashboard as a real new-tab link', async ({ page }) => {
  await page.goto('./');
  const entry = page.getByRole('link', { name: '개발 현황 · 커밋·테스트 보기' });
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute('href', /dev-status\.html$/);
  const [dashboard] = await Promise.all([page.waitForEvent('popup'), entry.click()]);
  await expect(
    dashboard.getByRole('heading', { name: '뭘 만들고 있고, 제대로 작동하는가.' }),
  ).toBeVisible();
});

test('founder dashboard never treats stale preview SHA or blocked GitHub CI as success', async ({
  page,
}) => {
  await page.route('**/build-info.json', (route) =>
    route.fulfill(json({ sourceCommit: oldSha, environment: 'preview' })),
  );
  await page.route('https://api.github.com/**', (route) => {
    if (route.request().url() === publicRepo + '/pulls/57')
      return route.fulfill(
        json({
          number: 57,
          draft: true,
          base: { ref: 'preview/bkit-notice-capture-20261110' },
          head: { sha: liveSha },
        }),
      );
    return route.abort();
  });
  await page.goto('./dev-status.html');
  await expect(page.locator('#version-match')).toContainText('다름');
  await expect(page.locator('#ci-result')).toContainText('조회 실패');
  await expect(page.locator('#commit-title')).toContainText('조회 실패');
  await expect(page.locator('#version-match')).not.toContainText('같음');
});
