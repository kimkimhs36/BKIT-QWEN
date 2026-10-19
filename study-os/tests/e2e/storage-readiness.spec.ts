import { test, expect } from './local-fixture';
import { newState } from '../../src/model';
import type { Page } from '@playwright/test';

async function openSettings(page: Page) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, newState());
  await page.goto('./');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '더보기', exact: true })
    .filter({ visible: true }).first().click();
  await page.getByRole('button', { name: '설정', exact: true }).filter({visible:true}).first().click();
}

test('storage check is read-only and a manually inspected ZIP can be compared with latest study', async ({page}, testInfo) => {
  test.setTimeout(90000);
  await openSettings(page);
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' });
  await expect(backup).toBeVisible();
  await backup.getByRole('button', { name: '내 공부 기록·PDF·필기 원본 정밀 검사' }).click();
  const report = backup.getByRole('region', { name: '저장 무결성 진단 결과' });
  await expect(report).toContainText('학습 사진 0/0장 검증');
  await expect(report).toContainText('PDF/학습지 원본 0/0개 확인');

  const download = page.waitForEvent('download');
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기' }).click();
  const file = await download;
  const path = testInfo.outputPath('safety-verified.zip');
  await file.saveAs(path);
  await backup.getByLabel('전체 ZIP 백업 검사', { exact: true }).setInputFiles(path);
  await expect(backup.getByText(/선택한 ZIP은 검사 시점의 학습·수면·PDF\/필기 저장 내용과 일치합니다/)).toBeVisible();

  // Confirm that an *older but valid* backup is not misrepresented as current.
  await page.evaluate(() => {
    const key = 'bkit.study-os.v1';
    const state = JSON.parse(localStorage.getItem(key)!);
    state.revision += 1;
    localStorage.setItem(key, JSON.stringify(state));
  });
  await backup.getByLabel('전체 ZIP 백업 검사', { exact: true }).setInputFiles(path);
  await expect(backup.getByText(/현재 기기의 모든 최신 기록과 일치하지는 않습니다/)).toBeVisible();
});
