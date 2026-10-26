import { test, expect, type Page } from './local-fixture';
import {
  EXT_KEY,
  KEY,
  DAY,
  emptyDocument,
  startSession,
  putSession,
} from '../../src/juggernaut/engine';
import { questionById } from '../../src/juggernaut/content';
import AxeBuilder from '@axe-core/playwright';
const time = Date.parse('2026-10-26T03:00:00Z');
const visit = async (page: Page, path = '') => {
  await page.goto('juggernaut/' + path);
  await expect(page.locator('.jg-build03')).toBeVisible();
};
const storedDoc = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), EXT_KEY);
const current = async (page: Page) =>
  (await storedDoc(page)).sessions.sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0];
async function answer(page: Page, value?: string) {
  const q = questionById((await current(page)).questionId);
  await page
    .getByRole('textbox', { name: q.answerLabel || 'x의 값', exact: true })
    .fill(value ?? q.answer);
  await page
    .getByRole('textbox', { name: '풀이 설명', exact: true })
    .fill('문자에 수를 괄호로 넣고 계산 순서와 부호를 확인했다.');
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
}
async function begin(page: Page) {
  await visit(page, 'map');
  await page
    .locator('.jg-map-list')
    .getByRole('button', { name: /문자 대입/ })
    .click();
  await expect(page.locator('.jg-map-detail')).toContainText('대입해 검산');
  await page.getByRole('button', { name: '이 개념 학습 시작' }).click();
}
test('new learner: actual new prerequisite, wrong/hint/repair, independent retry, pause/reload, delayed review and export', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.clock.install({ time });
  await begin(page);
  await page.getByRole('button', { name: '힌트 0/2' }).click();
  await answer(page, '999');
  const firstAttempt = (await storedDoc(page)).attempts[0];
  expect(firstAttempt).toMatchObject({ answer: '999', hints: 1 });
  await page.getByRole('button', { name: '개념 복구 후 새 문제 재도전' }).click();
  await page.getByRole('textbox', { name: '식의 값', exact: true }).fill('-2');
  await page.getByRole('button', { name: '중단하고 나중에 이어하기' }).click();
  await page.reload();
  await page.getByRole('button', { name: '이전 학습 이어서 하기' }).click();
  await expect(page.getByRole('textbox', { name: '식의 값', exact: true })).toHaveValue('-2');
  await answer(page);
  await page.getByRole('button', { name: '결과 확인 / 다음 단계' }).click();
  await expect(page.getByText('처음 막힌 문제로 돌아왔어요.', { exact: false })).toBeVisible();
  await answer(page);
  await page.getByRole('button', { name: '개념 복구 후 새 문제 재도전' }).click();
  await page.clock.setSystemTime(time + 2 * DAY);
  await visit(page, 'review');
  await page.getByRole('button', { name: '새 문제로 검증' }).click();
  await answer(page);
  await visit(page, 'progress');
  await expect(page.locator('.jg-evidence-changes')).toContainText('첫 독립 실패 → 최근 독립 정답');
  await expect(page.locator('.jg-studio-stats')).toContainText('1회 유효 검증');
  const d = await storedDoc(page);
  expect(d.attempts).toHaveLength(4);
  expect(d.attempts.find((a: any) => a.id === firstAttempt.id)).toMatchObject({
    answer: '999',
    hints: 1,
  });
  expect(d.attempts.filter((a: any) => a.questionId === firstAttempt.questionId)).toHaveLength(2);
  const legacy = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(legacy.attempts).toHaveLength(0);
  expect(legacy.sessions).toHaveLength(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '기록 내보내기', exact: true }).click();
  await (await download).saveAs(info.outputPath('build03-backup.json'));
  await page.screenshot({ path: info.outputPath('build03-real-evidence.png'), fullPage: true });
  // Import is a real file-input flow, not a direct storage write. Deletion must
  // survive reimporting this older backup, and duplicate restores are idempotent.
  await page.getByText('백업 가져오기 / 원본 복구', { exact: true }).click();
  const backup = {
    name: 'build03-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(d)),
  };
  await page.getByLabel('수능관 백업 파일').setInputFiles(backup);
  await expect(page.locator('.jg-log')).toHaveCount(4);
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.jg-log')
    .filter({ hasText: '첫 답변 999' })
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.locator('.jg-log')).toHaveCount(3);
  await page.getByLabel('수능관 백업 파일').setInputFiles([]);
  await page.getByLabel('수능관 백업 파일').setInputFiles(backup);
  await expect(page.locator('.jg-log')).toHaveCount(3);
  expect((await storedDoc(page)).attempts.find((a: any) => a.id === firstAttempt.id).deleted).toBe(
    true,
  );
});
test('rational entry keeps Korean explanation separate; tablet paper grows and survives viewport rotation', async ({
  page,
}) => {
  const s = {
    ...startSession(emptyDocument(), 'training', time, 'm28-substitution'),
    questionId: 'm28-substitution-4',
  };
  await page.addInitScript(({ key, doc }) => localStorage.setItem(key, JSON.stringify(doc)), {
    key: EXT_KEY,
    doc: putSession(emptyDocument(), s),
  });
  await visit(page, 'train');
  await page.getByRole('textbox', { name: '식의 값', exact: true }).fill('1/2');
  await page
    .getByRole('textbox', { name: '풀이 설명', exact: true })
    .fill('분모를 맞추어 계산했다.');
  await expect(page.getByRole('textbox', { name: '풀이 설명', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '넓은 종이', exact: true }).click();
  await expect(page.getByRole('button', { name: '기본 종이', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.setViewportSize({ width: 834, height: 1194 });
  await expect(page.getByRole('textbox', { name: '식의 값', exact: true })).toHaveValue('1/2');
  await page.getByRole('button', { name: '첫 답변 제출' }).click();
  await expect(page.getByRole('heading', { name: '정답입니다.' })).toBeVisible();
  expect((await storedDoc(page)).attempts[0].answer).toBe('1/2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
test('extension corruption/quota is visible; original bytes and a recoverable current export survive', async ({
  page,
}) => {
  await begin(page);
  await page.evaluate((key) => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key) throw new DOMException('quota', 'QuotaExceededError');
      return set.call(this, k, v);
    };
  }, EXT_KEY);
  await page.getByRole('textbox', { name: '식의 값', exact: true }).fill('11');
  await expect(page.getByRole('alert')).toContainText('저장에 실패');
  await expect(page.getByRole('textbox', { name: '식의 값', exact: true })).toHaveValue('11');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '현재 화면 내보내기' }).click();
  await download;
  // Restore native Storage in a fresh page context before installing a corrupt original.
  await page.reload();
  await page.evaluate((key) => localStorage.setItem(key, 'damaged-sidecar'), EXT_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('원본을 보호');
  await page.getByRole('button', { name: '저장 재시도' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), EXT_KEY)).toBe('damaged-sidecar');
});
test('The Road offers bounded exam-week work and honest subject availability; new map is accessible in reduced motion', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page, 'roadmap');
  await page.getByLabel('오늘 가능한 시간').selectOption('30');
  await page.getByLabel('학교 시험 기간').check();
  await expect(page.locator('.jg-daily-road ol li')).toHaveCount(1);
  await page.getByText('과목별 다음 학습 형식과 제공 상태', { exact: true }).click();
  await expect(page.locator('.jg-daily-road')).toContainText('콘텐츠 검수 대기 / 진단·숙달도 없음');
  await visit(page, 'map');
  await expect(page.locator('.jg-map-caption')).toContainText('점선은 연습 권장');
  const scan = await new AxeBuilder({ page })
    .include('.jg-os')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(scan.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual(
    [],
  );
});
