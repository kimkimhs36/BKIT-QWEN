import {test,expect} from '@playwright/test';
test('assistant drafts new task and only commits after confirmation', async ({page}) => {
  await page.goto('./');
  await page.getByRole('button',{name:'BKIT 비서 열기'}).click();
  const assistant=page.getByRole('region',{name:'BKIT 멀티 비서'});
  await expect(assistant).toBeVisible();
  await assistant.getByLabel('비서에게 질문하기').fill('내일 화학 학습지 3장 추가해줘');
  await assistant.getByRole('button',{name:'비서에게 보내기'}).click();
  await expect(assistant.getByRole('button',{name:'확인하고 저장'})).toBeVisible();
  await assistant.getByRole('button',{name:'확인하고 저장'}).click();
  await expect(assistant).toContainText('확인한 변경사항을 BKIT에 저장했어.');
  await page.getByRole('button',{name:'닫기'}).click();
  await page.getByRole('button',{name:'과제',exact:true}).click();
  await expect(page.getByText('내일 화학 학습지 3장')).toBeVisible();
});
