import { expect, test } from './local-fixture';
import { KEY, EXT_KEY } from '../../src/juggernaut/engine';
test.use({ serviceWorkers: 'block' });

async function openExam(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '수능관 · 기초 훈련', exact: true }).click();
  await expect(page.getByRole('region', { name: 'BKIT 수능관' })).toBeVisible();
}

test('iPhone: authentic maths attempt is saved, reviewed, and survives reload', async ({ page }) => {
  await openExam(page);
  const room = page.getByRole('region', { name: 'BKIT 수능관' });
  await expect(room).toContainText('36개의 독립 제작 수학 선수학습 문항');
  await room.getByRole('button', { name: /실제 문제 시작/ }).click();
  const question = await room.locator('.exam-lab-workspace h3').textContent();
  expect(question).toBeTruthy();
  const questionID = await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key) || '{}');
    return d.sessions?.find((s: { phase: string }) => s.phase === 'question')?.questionId || '';
  }, KEY);
  expect(questionID).toBeTruthy();

  // Use the authored answer from the genuine catalogue rather than inventing it.
  // A wrong answer still counts as an actual attempt, not as mastery.
  await room.getByRole('textbox', { name: '숫자 답안' }).fill('99999');
  await room.getByRole('button', { name: /답 확인하기/ }).click();
  await expect(room).toContainText('다시 배울 지점을 찾았어요');
  const n = await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key) || '{}');
    return d.attempts?.length ?? 0;
  }, KEY);
  expect(n).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: '수능관 · 기초 훈련', exact: true }).click();
  await expect(room).toContainText('다시 배울 지점을 찾았어요');
  const current = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).attempts, KEY);
  expect(current).toHaveLength(1);
  expect(current[0].questionId).toBe(questionID);
  expect(current[0].answer).toBe('99999');
  expect(current[0].error).not.toBe(null);
});

test('iPhone: free practice does not contaminate persistent study records', async ({ page }) => {
  await openExam(page);
  const room = page.getByRole('region', { name: 'BKIT 수능관' });
  await room.getByRole('button', { name: '저장 없이 가볍게 연습' }).click();
  await room.getByRole('textbox', { name: '숫자 답안' }).fill('0');
  await room.getByRole('button', { name: /답 확인하기/ }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), EXT_KEY)).toBeNull();
  await page.reload();
  await page.getByRole('button', { name: '수능관 · 기초 훈련', exact: true }).click();
  await expect(room.getByText('저장된 풀이 시도')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
});

test('iPhone: invalid existing study original blocks writes without deleting it', async ({ page }) => {
  await page.addInitScript(key=>localStorage.setItem(key,'DO-NOT-OVERWRITE-CORRUPT'),KEY);
  await openExam(page);
  const room = page.getByRole('region', { name: 'BKIT 수능관' });
  await expect(room.getByRole('alert')).toContainText('저장');
  await expect(room.getByRole('button', { name: /실제 문제 시작/ })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key),KEY)).toBe('DO-NOT-OVERWRITE-CORRUPT');
});


test('iPhone: paused maths answer resumes in same page and does not count away time', async ({ page }) => {
  await openExam(page);
  const room = page.getByRole('region', { name: 'BKIT 수능관' });
  await room.getByRole('button', { name: /실제 문제 시작/ }).click();
  await room.getByRole('textbox', { name: '숫자 답안' }).fill('7');
  await room.getByRole('button', { name: '나중에 이어하기' }).click();
  await expect(room.getByRole('button', { name: /이전 문제 이어서/ })).toBeVisible();
  await room.getByRole('button', { name: /이전 문제 이어서/ }).click();
  await expect(room.getByRole('textbox', { name: '숫자 답안' })).toHaveValue('7');
  const count = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).attempts.length, KEY);
  expect(count).toBe(0);
});
