import { test, expect } from './local-fixture';
import { newState, type Task } from '../../src/model';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const item = (id: string, overrides: Partial<Task> = {}): Task => ({
  id, subject: '화학', title: '실험 보고서', kind: '수행평가',
  due: null, priority: 2, minutes: 20, remaining: 20,
  status: 'todo', submitted: false, optional: false, notes: '', link: '',
  ...overrides,
});

test('iPhone: registered assessments are visible and an exact task opens for editing without changing records', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const initial = newState();
  initial.tasks = [
    item('overdue', { title: '보고서 A', deadline: { date: '2026-11-09', precision: 'date-only', provenance: 'explicit' } }),
    item('undated', { title: '보고서 B' }),
    item('submitted-check', { title: '보고서 C', status: 'done' }),
  ];
  await page.addInitScript((state) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, initial);
  await page.goto('./');
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await expect(rescue).toBeVisible();
  await expect(rescue).toContainText('기록 3건 · 확인 필요 3건');
  await expect(rescue).toContainText('제출 확인 필요 1건');
  await expect(rescue).toContainText('마감 미확인·추정 2건');
  await expect(rescue.getByRole('button', { name: /화학 · 보고서 A/ })).toBeVisible();
  await rescue.getByRole('button', { name: /화학 · 보고서 B/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="title"]')).toHaveValue('보고서 B');
  await page.reload();
  await expect(page.getByRole('region', { name: '수행평가 긴급 점검' })).toContainText('기록 3건');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks);
  expect(stored.map((task: Task) => task.id)).toEqual(['overdue', 'undated', 'submitted-check']);
});

test('iPhone: without recorded assessments the audit points to the existing capture flow', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
  const initial = newState();
  await page.addInitScript((state) => {
    localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  }, initial);
  await page.goto('./');
  const rescue = page.getByRole('region', { name: '수행평가 긴급 점검' });
  await expect(rescue).toContainText('등록된 수행평가가 없어요');
  await rescue.getByRole('button', { name: '빠진 수행평가 등록' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('select[name="kind"]')).toHaveValue('수행평가');
});
