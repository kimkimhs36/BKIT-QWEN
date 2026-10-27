import { test, expect } from './local-fixture';
import { newState, taskSchema } from '../../src/model';
test.use({ serviceWorkers: 'block' });
test('attaching an existing study timer never counts another study start', async ({ page }) => {
  const prepared = newState();
  prepared.tasks = [
    taskSchema.parse({
      id: 'attach-test',
      title: '연결할 과제',
      subject: '영어',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  await page.clock.install({ time: new Date('2026-10-19T05:00:00Z') });
  await page.addInitScript(
    (s) => localStorage.setItem('bkit.study-os.v1', JSON.stringify(s)),
    prepared,
  );
  await page.goto('./');
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await page.getByRole('region', { name: '첫 주 사용 확인' }).getByRole('checkbox').check();
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: '오늘', exact: true })
    .click();
  await page.getByRole('button', { name: '5분만 시작하기', exact: true }).click();
  await page.locator('.quick-timer-task-link > summary').click();
  await page.getByLabel('진행 중인 스톱워치 과제 연결').selectOption('attach-test');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.activation-local.v1')!).counts.studyStarted,
    ),
  ).toBe(1);
  await page.getByRole('button', { name: '기록 없이 종료', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).sessions),
  ).toEqual([]);
});
