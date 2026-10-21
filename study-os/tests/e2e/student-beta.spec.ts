import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, type State } from '../../src/model';
const key = 'bkit.study-os.v1';
async function seed(page: Page, state: State = newState()) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, state);
  await page.goto('./');
}
const saved = (page: Page): Promise<State> =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
const school = (page: Page) => page.getByRole('navigation', { name: '학교 할 일 바로가기' });
test('home school shortcuts select one shared task store, keep submissions visible and preselect capture kind', async ({
  page,
}) => {
  const state = newState();
  state.tasks = [
    taskSchema.parse({
      id: 'hw',
      title: '수학 문제 풀기',
      subject: '수학',
      kind: '숙제',
      due: null,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      priority: 2,
      optional: false,
      notes: '',
      link: '',
    }),
    taskSchema.parse({
      id: 'assessment',
      title: '과학 발표 제출',
      subject: '과학',
      kind: '수행평가',
      due: null,
      minutes: 25,
      remaining: 1,
      status: 'done',
      submitted: false,
      submissionRequired: true,
      priority: 2,
      optional: false,
      notes: '',
      link: '',
    }),
  ];
  await seed(page, state);
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeInViewport();
  await expect(school(page).getByRole('button', { name: /과제/ })).toBeInViewport();
  await school(page)
    .getByRole('button', { name: /수행평가/ })
    .click();
  await expect(
    page
      .getByRole('group', { name: '과제 유형' })
      .getByRole('button', { name: '수행평가', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: '과제 목록' })).toContainText('과학 발표 제출');
  await expect(page.getByRole('region', { name: '과제 목록' })).not.toContainText('수학 문제 풀기');
  await page.getByRole('button', { name: '수행평가 추가', exact: true }).click();
  await expect(
    page
      .getByRole('group', { name: '등록 종류' })
      .getByRole('button', { name: '수행평가', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('물리 실험 보고서');
  await page.getByRole('button', { name: '오늘에 담기' }).click();
  await page.reload();
  const tasks = (await saved(page)).tasks;
  expect(tasks).toHaveLength(3);
  expect(tasks.find((t) => t.title === '물리 실험 보고서')).toMatchObject({
    kind: '수행평가',
    due: null,
    submitted: false,
  });
  expect(tasks.find((t) => t.id === 'assessment')).toMatchObject({
    status: 'done',
    submitted: false,
  });
});
test('native camera and gallery launch directly, cancellation is harmless, OCR failure preserves the original and manual save', async ({
  page,
}) => {
  await seed(page);
  await school(page)
    .getByRole('button', { name: /수행평가/ })
    .click();
  await page.getByRole('button', { name: '수행평가 추가', exact: true }).click();
  const capture = page.getByRole('dialog');
  const cameraChooser = page.waitForEvent('filechooser');
  await capture.getByRole('button', { name: '사진 촬영', exact: true }).click();
  const camera = await cameraChooser;
  expect(await camera.element().getAttribute('capture')).toBe('environment');
  await camera.setFiles([]);
  await expect(capture.getByRole('button', { name: '오늘에 담기' })).toBeDisabled();
  // Block the actual local asset directory at context scope, including workers.
  await page.context().route('**/ocr/**', (route) => route.abort());
  const galleryChooser = page.waitForEvent('filechooser');
  await capture.getByRole('button', { name: '갤러리 선택', exact: true }).click();
  const gallery = await galleryChooser;
  expect(await gallery.element().getAttribute('capture')).toBeNull();
  await gallery.setFiles('tests/fixtures/printed-homework.png');
  await expect(capture.locator('.atelier-photos img')).toHaveCount(1);
  await expect(capture.locator('.photo-text')).toHaveAttribute('open', '');
  await expect(capture.locator('.photo-text [role=alert]')).toBeVisible({ timeout: 30000 });
  expect((await saved(page)).tasks).toHaveLength(0);
  await capture.getByRole('textbox', { name: '할 일을 한 문장으로' }).fill('과학 실험 준비');
  await capture.getByRole('button', { name: '오늘에 담기' }).click();
  await page.reload();
  const task = (await saved(page)).tasks[0];
  expect(task).toMatchObject({ title: '과학 실험 준비', kind: '수행평가', due: null });
  expect(task.attachmentIds).toHaveLength(1);
  const bytes = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('bkit-private-materials-v1', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record: any = await new Promise((resolve, reject) => {
      const request = db.transaction('photos').objectStore('photos').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record.bytes.byteLength;
  }, task.attachmentIds![0]);
  expect(bytes).toBeGreaterThan(1000);
});
test('photo selection runs real local OCR, keeps the chosen kind and requires explicit confirmation', async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page);
  await school(page)
    .getByRole('button', { name: /수행평가/ })
    .click();
  await page.getByRole('button', { name: '수행평가 추가', exact: true }).click();
  await page.getByLabel('갤러리 사진 첨부').setInputFiles('tests/fixtures/printed-homework.png');
  const text = page.getByRole('textbox', { name: '사진에서 읽은 글자' });
  await expect(text).toBeVisible({ timeout: 90000 });
  expect((await text.inputValue()).length).toBeGreaterThan(10);
  expect((await saved(page)).tasks).toHaveLength(0);
  await page.getByRole('button', { name: '이 내용으로 과제 확인' }).click();
  await expect(
    page
      .getByRole('group', { name: '등록 종류' })
      .getByRole('button', { name: '수행평가', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect((await saved(page)).tasks).toHaveLength(0);
  await page
    .getByRole('textbox', { name: '할 일을 한 문장으로' })
    .fill('사진에서 확인한 학교 과제');
  await page.getByRole('button', { name: '오늘에 담기' }).click();
  await page.reload();
  expect((await saved(page)).tasks[0].notes.length).toBeGreaterThan(10);
});
test('settings is labeled, returns home, and the small phone keeps all school entry points reachable', async ({
  page,
}, info) => {
  await seed(page);
  // Reduced motion must leave the CSS material visible, rather than a stopped
  // non-preserved WebGL frame that Safari can composite as an opaque dark layer.
  await expect(page.locator('.surreal-surface')).toHaveCSS('opacity', '0');
  await expect(page.getByRole('button', { name: '설정 열기', exact: true })).toContainText('설정');
  await page.getByRole('button', { name: '설정 열기', exact: true }).click();
  await expect(page.getByRole('button', { name: /테마와 움직임/ })).toBeVisible();
  await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
  await expect(school(page)).toBeVisible();
  await page.screenshot({ path: `test-results/student-beta-${info.project.name}-home.png` });
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: '지금 공부 시작', exact: true })).toBeInViewport();
  await expect(school(page)).toBeInViewport();
  const box = await page.getByRole('button', { name: '설정 열기', exact: true }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});
