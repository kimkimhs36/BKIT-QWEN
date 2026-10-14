import {test,expect} from '@playwright/test';
test('Cloud Sync settings remain private until explicit Google consent',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T05:00:00Z')});
 const sheetId='BKIT_TEST_SHEET_ID_SAMPLE_1234567890';
 await page.goto('./?bkit_sheet='+sheetId);
 await expect(page.getByRole('navigation',{name:'주 메뉴'})).toBeVisible();
 await page.getByRole('button',{name:'설정 열기'}).click();
 const cloud=page.getByRole('region',{name:'BKIT 클라우드 동기화'});
 await expect(cloud).toContainText('Google 계정 연결');
 await expect(cloud).toContainText('연결 전');
 await cloud.getByRole('button',{name:'연결 설정 / 처음 사용하는 방법'}).click();
 await expect(cloud.getByLabel('공유 Google Sheet 주소')).toHaveValue('https://docs.google.com/spreadsheets/d/'+sheetId+'/edit');
 await expect(cloud.getByLabel('Google OAuth 웹 클라이언트 ID (비밀번호 아님)')).toHaveValue('');
 expect(await page.evaluate(()=>location.search)).toBe('');
 expect(await page.evaluate(()=>localStorage.getItem('bkit.cloud-settings.v1'))).toBe(null);
 await expect(cloud.getByRole('button',{name:'Google 계정 연결'})).toBeEnabled();
});
