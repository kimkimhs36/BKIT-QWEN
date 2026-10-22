import { chromium, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const base = process.env.BKIT_REVIEW_URL || 'http://127.0.0.1:4178/';
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  await context.route('**/*', (r) =>
    new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort(),
  );
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-22T05:00:00Z') });
  await page.goto(base);
  expect(await page.evaluate(() => localStorage.getItem('bkit.atelier.visited.v1'))).toBeNull();
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await expect(page.getByLabel('지금 할 첫 학습 행동')).toContainText('질문 하나');
  const started = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')));
  expect(started.learningEvents.filter((e) => e.type === 'FirstLearningAttempt')).toHaveLength(0);
  await page.getByRole('button', { name: '첫 문제 시도했어요' }).click();
  const attempted = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')));
  expect(attempted.learningEvents.filter((e) => e.type === 'FirstLearningAttempt')).toHaveLength(1);
  await page.getByRole('button', { name: '끝내고 시간 저장', exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')));
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].problems).toBe(0);
  await writeFile(
    new URL('../artifacts/learning-continuity/first-visit.json', import.meta.url),
    JSON.stringify(
      {
        scenario: 'clean first visit without any onboarding marker',
        passed: true,
        scope:
          'isolated Chromium browser at phone viewport; explicit self-report, no real student timing measurement',
        savedSessions: 1,
        automaticallyClaimedProblems: 0,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
