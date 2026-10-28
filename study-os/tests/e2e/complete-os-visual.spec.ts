import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema } from '../../src/model';
import { newNotice } from '../../src/schoolInbox';
import { newBook, linkMaterial } from '../../src/books';
import { parseTimetable } from '../../src/timetable';
import { materials } from '../../src/themes/material';
import { PDFDocument } from 'pdf-lib';
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

async function nav(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('button', { name: label, exact: true })
    .click();
}
test('nine materials preserve the daily journey and real originals at this viewport', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const state = newState();
  const notice = {
    ...newNotice(),
    id: 'synthetic-notice',
    text: '실험 보고서: 보안경을 준비하고 10월 28일에 제출하세요.',
    taskIds: ['report'],
  };
  state.tasks = [
    taskSchema.parse({
      id: 'report',
      subject: '물질과 에너지',
      title: '실험 보고서',
      kind: '수행평가',
      due: '2026-10-28T14:59:00.000Z',
      deadline: { date: '2026-10-28', precision: 'date-only', provenance: 'user-confirmed' },
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '[학교공지:synthetic-notice]',
      link: '',
    }),
  ];
  state.schedules = parseTimetable(
    '수\t09:00\t09:50\t물질과 에너지\t과학실\n수\t10:00\t10:50\t미적분Ⅰ',
    [],
  );
  let book = newBook('나의 미적분Ⅰ', '미적분Ⅰ');
  book.chapters = [
    {
      id: 'chapter',
      title: '함수의 극한',
      parentId: null,
      note: '좌극한과 우극한',
      status: 'review',
    },
  ];
  book.bookmark.chapterId = 'chapter';
  book.lastOpenedAt = '2026-10-28T00:00:00Z';
  book = linkMaterial(book, { kind: 'task', targetId: 'report', chapterId: 'chapter' });
  await page.clock.install({ time: new Date('2026-10-28T00:10:00Z') });
  await page.addInitScript(
    ({ state, notice, book }) => {
      if (!localStorage.getItem('bkit.books.v1')) {
        localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
        localStorage.setItem(
          'bkit.school-inbox.v1',
          JSON.stringify({ version: 1, notices: [notice] }),
        );
        localStorage.setItem(
          'bkit.books.v1',
          JSON.stringify({ version: 1, revision: 0, books: [book] }),
        );
      }
    },
    { state, notice, book },
  );
  const capture = async (name: string) => {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      name + ' fits',
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(name + '.png'),
      fullPage: true,
      animations: 'disabled',
    });
  };
  await page.goto('./');
  // Use valid persisted preferences and reload; dataset-only mutations miss real theme regressions.
  for (const material of [...materials].sort((a, b) =>
    a.id === 'glass' ? -1 : b.id === 'glass' ? 1 : 0,
  )) {
    await page.evaluate((material) => {
      localStorage.setItem(
        'bkit.material.v1',
        JSON.stringify({ id: material.id, motion: 'reduced', intensity: 0.5, lowPower: false }),
      );
      localStorage.setItem('bkit.study-os.theme.v1', material.base);
      sessionStorage.removeItem('bkit.books.selected');
    }, material);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-material', material.id);
    await expect(page.getByRole('button', { name: '학교 공지 보관', exact: true })).toBeVisible();
    await capture(material.id + '-home');
    await page.getByRole('button', { name: '학교 공지 보관', exact: true }).click();
    await expect(page.getByRole('search', { name: '학교 공지 찾기' })).toBeVisible();
    await capture(material.id + '-notice');
    await nav(page, '오늘');
    await page.getByRole('button', { name: 'BOOKS · 학습지', exact: true }).click();
    await expect(page.getByRole('region', {name:'BKIT BOOKS',exact:true})).toBeVisible();
    await expect(page.locator('.books-tile')).toBeVisible();
    await capture(material.id + '-bookshelf');
    await page.locator('.books-tile').click();
    await expect(page.getByRole('heading', { name: '나의 미적분Ⅰ', exact: true })).toBeVisible();
    await capture(material.id + '-book');
    if (material.id === 'glass') {
      const pdf = await PDFDocument.create();
      pdf.addPage([300, 400]);
      await page.getByLabel('새 PDF·학습지 사진 가져오기', { exact: true }).setInputFiles({
        name: 'visual-synthetic.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(await pdf.save()),
      });
      await expect(
        page.getByRole('button', { name: '자료 열기 · 필기', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: '자료 열기 · 필기', exact: true }).click();
      await expect(page.getByTestId('ink-canvas')).toBeVisible();
      await capture('glass-paper');
      await page.getByRole('button', { name: '종이 닫기', exact: true }).click();
    }
    await page.getByRole('button', { name: /BKIT 수능관 · 36문항/ }).click();
    await expect(page.getByRole('region', { name: 'BKIT 수능관' })).toBeVisible();
    await capture(material.id + '-exam');
    if (material.id === 'glass') {
      await nav(page, '과제');
      await page.locator('.task-content').filter({ hasText: '실험 보고서' }).click();
      await expect(page.getByRole('dialog', { name: '과제 수정' })).toBeVisible();
      await capture('glass-assessment');
      await page.getByRole('button', { name: '닫기', exact: true }).click();
      await nav(page, '달력');
      await expect(page.getByRole('region', { name: '학교 시간표', exact: true })).toBeVisible();
      await capture('glass-day');
      await nav(page, '오늘');
      await page.getByRole('button', { name: 'BKIT AI 비서에게 물어보기' }).click();
      await expect(page.getByRole('region', { name: 'BKIT 멀티 비서' })).toBeVisible();
      await capture('glass-assistant');
      await page.getByRole('button', { name: '닫기', exact: true }).click();
    }
  }
  expect(errors).toEqual([]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks[0].submitted).toBe(false);
  expect(saved.learning.attempts).toHaveLength(0);
});
