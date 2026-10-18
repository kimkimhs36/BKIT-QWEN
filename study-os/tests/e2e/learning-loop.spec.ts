import { test, expect, type Page } from './local-fixture';
async function nav(page: Page, name: string) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name, exact: true })
    .filter({ visible: true })
    .first()
    .click();
}
test('NOW to first answer, error, saved receipt and next-day independent retest survives reload', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.clock.install({ time: new Date('2026-10-19T06:00:00Z') });
  await page.goto('./');
  await page.getByRole('button', { name: '더 보기', exact: true }).click();
  await page.getByRole('button', { name: '빠른 한 줄 입력', exact: false }).click();
  await page
    .getByLabel('할 일을 한 문장으로', { exact: true })
    .fill('내일까지 물리 오답 5개 다시 풀기');
  await expect(page.getByLabel('전체 분량', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: '오늘에 담기', exact: true }).click();
  await expect(page.locator('.instant-action')).toContainText('남은 5문제 중 하나');
  await page.getByRole('button', { name: '5분만 시작', exact: true }).click();
  await page
    .getByLabel('지금 풀 문제 또는 떠올릴 질문', { exact: true })
    .fill('속력이 두 배가 되면 운동 에너지는?');
  await page.getByLabel('자료 출처 (선택)', { exact: true }).fill('내가 등록한 물리 학습지');
  await page.getByRole('button', { name: '문제 정하고 시작', exact: false }).click();
  await page.getByLabel('내 답을 먼저 써보기', { exact: true }).fill('두 배');
  await page.getByLabel('답에 대한 확신', { exact: true }).selectOption('low');
  await page.getByRole('button', { name: '내 답 저장', exact: false }).click();
  await page.getByLabel('어디에서 막혔나요? (선택)', { exact: true }).selectOption('concept');
  await page.getByRole('button', { name: '다시 풀어야 해', exact: false }).click();
  await page.getByRole('button', { name: '학습량 기록 · 종료', exact: false }).click();
  await page.getByLabel('완료한 문제 수', { exact: true }).fill('1');
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  await expect(page.getByRole('region', { name: '최근 학습 성과 요약' })).toContainText(
    '저장한 답변 1회',
  );
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(
    saved.learningEvents.filter((e: { type: string }) => e.type === 'FirstLearningAttempt'),
  ).toHaveLength(1);
  expect(saved.sessions[0].workspace.attempts[0]).toMatchObject({
    errorTag: 'concept',
    hintUsed: false,
    confidence: 'low',
  });
  expect(saved.tasks[0].quantity.remaining).toBe(4);
  await page.clock.setSystemTime(new Date('2026-10-20T06:01:00Z'));
  await page.reload();
  await nav(page, '기록');
  const queue = page.getByRole('region', { name: '문제별 지연 재시험' });
  await expect(queue).toContainText('오늘 1');
  await queue.getByLabel('다시 푼 내 답', { exact: true }).fill('네 배');
  await queue.getByRole('button', { name: '재시험 답 저장', exact: true }).click();
  await page.reload();
  await nav(page, '기록');
  await expect(queue).toContainText('저장한 내 답: 네 배');
  await queue.getByRole('button', { name: '정답을 직접 확인', exact: true }).click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.problemRetests).toHaveLength(1);
  expect(saved.problemRetests[0]).toMatchObject({
    answer: '네 배',
    selfCheck: 'remembered',
    hintUsed: false,
  });
  expect(saved.sessions).toHaveLength(1);
  expect(saved.tasks[0].submitted).toBe(false);
  await expect(page.getByRole('region', { name: '주간 학습 증거' })).toContainText('1/1회');
});

test('a failed answer save leaves both the typed answer and stored evidence intact',async({page})=>{
 await page.clock.install({time:new Date('2026-10-19T06:00:00Z')});await page.goto('./');
 await page.getByRole('button',{name:'5분만 시작',exact:true}).click();
 await page.getByLabel('지금 풀 문제 또는 떠올릴 질문',{exact:true}).fill('내 질문');
 await page.getByRole('button',{name:'문제 정하고 시작',exact:false}).click();
 const before=await page.evaluate(()=>localStorage.getItem('bkit.study-os.v1'));
 await page.evaluate(()=>{const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='bkit.study-os.v1')throw new DOMException('full','QuotaExceededError');old.call(this,k,v);};});
 await page.getByLabel('내 답을 먼저 써보기',{exact:true}).fill('사라지면 안 되는 내 풀이');
 await page.getByRole('button',{name:'내 답 저장',exact:false}).click();
 await expect(page.getByLabel('내 답을 먼저 써보기',{exact:true})).toHaveValue('사라지면 안 되는 내 풀이');
 expect(await page.evaluate(()=>localStorage.getItem('bkit.study-os.v1'))).toBe(before);
 await expect(page.getByRole('alert').first()).toContainText('저장하지 못했습니다');
});
