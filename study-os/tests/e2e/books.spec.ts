import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { addResource } from '../../src/learningEngine';
import { PDFDocument } from 'pdf-lib';
async function prepare(page: Page) {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  const state = addResource(
    newState(),
    {
      title: '극한 연습',
      subject: '미적분Ⅰ',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['극한을 구하세요'],
  );
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, state);
  await page.goto('./');
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '도구', exact: true }).click();
  await page.getByRole('navigation', { name: '추가 도구', exact: true }).getByRole('button', { name: '공부 자료', exact: true }).click();
  await page.getByRole('button', { name: 'BOOKS · 내 책장', exact: true }).click();
}
async function add(page: Page) {
  await page.getByRole('button', { name: '책 추가', exact: true }).click();
  await page.getByLabel('책 제목', { exact: true }).fill('나의 미적분Ⅰ');
  await page.getByRole('button', { name: '책 저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '나의 미적분Ⅰ', exact: true })).toBeVisible();
}
test('book persists, chapter PDF opens, ink room returns, original survives trash and restore', async ({
  page,
}, info) => {
  await prepare(page);
  await add(page);
  await page.getByRole('button', { name: '대단원 추가', exact: true }).click();
  await page.getByLabel('단원명', { exact: true }).fill('함수의 극한');
  await page.getByLabel('단원별 메모', { exact: true }).fill('좌극한과 우극한 확인');
  await page.getByRole('button', { name: '단원 저장', exact: true }).click();
  await page.getByRole('combobox', { name: '공부 상태', exact: true }).selectOption('review');
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  await page
    .getByLabel('새 PDF·학습지 사진 가져오기', { exact: true })
    .setInputFiles({
      name: 'limits.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
  await expect(page.getByRole('button', { name: '자료 열기 · 필기', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '자료 열기 · 필기', exact: true }).click();
  await expect(page.getByRole('button', { name: '종이 닫기', exact: true })).toBeVisible();
  // Existing room owns cursor persistence and closing/flush semantics.
  await page.getByRole('button', { name: '종이 닫기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '함수의 극한', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /최근 공부한 책/ }).click();
  await expect(page.getByRole('combobox', { name: '공부 상태', exact: true })).toHaveValue('review');
  await page.screenshot({ path: info.outputPath('books-chapter.png'), fullPage: true });
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '휴지통으로 이동', exact: true }).click();
  await page.getByRole('combobox', { name: '책장', exact: true }).selectOption('trash');
  await page.locator('.books-tile').click();
  await page.getByRole('button', { name: '책 복구', exact: true }).click();
  await expect(page.getByRole('button', { name: '자료 열기 · 필기', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).learning.resources.length,
    ),
  ).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('existing problem engine records once and returns to book without marking chapter understood', async ({
  page,
}) => {
  await prepare(page);
  await add(page);
  await page.getByRole('combobox', { name: '자료 종류', exact: true }).selectOption('resource');
  await page.getByRole('combobox', { name: '연결할 자료', exact: true }).selectOption({ label: '극한 연습' });
  await page.getByRole('button', { name: '선택한 자료 연결', exact: true }).click();
  await page.getByRole('button', { name: '5분 공부 시작', exact: true }).click();
  const w = page.getByRole('region', { name: '다중 문제 학습실' });
  await expect(w).toBeVisible();
  await page.clock.fastForward(65000);
  // The learning template owns the accessible label (e.g. 풀이, 해석, 최종 답).
  // Exercise the actual editable answer, not one subject-specific name.
  await w.locator('.main-answer textarea').fill('1');
  await w.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
  await w.getByRole('button', { name: '오답 · 다시 연습', exact: true }).click();
  await w.getByRole('button', { name: '저장하고 학습 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  await page.getByRole('button', { name: /최근 공부한 책/ }).click();
  await expect(page.getByRole('heading', { name: '나의 미적분Ⅰ', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.sessions).toHaveLength(1);
  expect(saved.learning.attempts).toHaveLength(1);
});
test('all nine material themes preserve book data and fit the viewport', async ({ page }, info) => {
  await prepare(page);
  await add(page);
  for (const theme of [
    'classic',
    'forest',
    'glass',
    'peach',
    'diamond',
    'gold',
    'jelly',
    'droplets',
    'night',
  ]) {
    await page.evaluate((t) => {
      localStorage.setItem('bkit.material.v1', t);
      document.documentElement.dataset.material = t;
    }, theme);
    await expect(page.getByRole('heading', { name: '나의 미적분Ⅰ', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`books-${theme}.png`), fullPage: true });
  }
  await page.reload();
  await page.getByRole('button', { name: /최근 공부한 책/ }).click();
  await expect(page.getByRole('heading', { name: '나의 미적분Ⅰ', exact: true })).toBeVisible();
});


test('maths book → BKIT exam lab → real attempt → book evidence without auto-completing chapters', async ({ page }) => {
  await prepare(page);
  await add(page);
  await page.getByRole('button', { name: '대단원 추가', exact: true }).click();
  await page.getByLabel('단원명', { exact: true }).fill('함수의 극한');
  await page.getByRole('button', { name: '단원 저장', exact: true }).click();
  await page.getByRole('button', { name: /BKIT 수능관 · 36문항/ }).click();
  const room = page.getByRole('region', { name: 'BKIT 수능관' });
  await expect(room).toBeVisible();
  await room.getByRole('button', { name: /실제 문제 시작/ }).click();
  await room.getByRole('textbox', { name: '숫자 답안' }).fill('99999');
  await room.getByRole('button', { name: /답 확인하기/ }).click();
  await room.getByRole('button', { name: 'BOOKS · 책장으로 돌아가기' }).click();
  await expect(page.getByRole('heading', { name: '나의 미적분Ⅰ', exact: true })).toBeVisible();
  const bridge = page.locator('.books-foundation-progress');
  await expect(bridge).toContainText('풀이 시도');
  await expect(bridge).toContainText('BOOKS');
  await expect(page.getByRole('combobox', { name: '공부 상태' })).toHaveValue('todo');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.books.v1')!));
  expect(saved.books[0].chapters[0].status).toBe('todo');
});


test('new user quick-start subject never saves until user confirms book details', async ({ page }) => {
  await prepare(page);
  const books = page.getByRole('region', { name: 'BKIT BOOKS' });
  await books.getByRole('button', { name: '미적분Ⅰ', exact: true }).click();
  await expect(page.getByLabel('책 제목', { exact: true })).toHaveValue('미적분Ⅰ 학습지');
  await expect(page.getByLabel('과목', { exact: true })).toHaveValue('미적분Ⅰ');
  const before = await page.evaluate(() => localStorage.getItem('bkit.books.v1'));
  expect(before).toBeNull();
  await page.getByRole('button', { name: '책 저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '미적분Ⅰ 학습지', exact: true })).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.books.v1')!));
  expect(after.books).toHaveLength(1);
  expect(after.books[0].subject).toBe('미적분Ⅰ');
});
