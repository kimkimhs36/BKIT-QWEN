import { test, expect, type Page } from './local-fixture';
import { newState } from '../../src/model';
import { PDFDocument } from 'pdf-lib';
test.setTimeout(60000);
const state = (page:Page) => page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
async function seed(page:Page) {
  await page.clock.install({time:new Date('2026-10-19T05:00:00Z')});
  await page.addInitScript(s => {
    if(!localStorage.getItem('bkit.study-os.v1')) localStorage.setItem('bkit.study-os.v1',JSON.stringify(s));
  },newState());
  await page.goto('./');
}
async function nav(page:Page,name:string) {
  await page.getByRole('navigation').getByRole('button',{name,exact:true}).filter({visible:true}).first().click();
}
async function task(page:Page) {
  await page.getByRole('region',{name:'수행평가 및 제출 준비'}).getByRole('button',{name:'수행 등록'}).click();
  const dialog = page.getByRole('dialog',{name:'새 과제'});
  await dialog.locator('[name="subject"]').fill('영어');
  await dialog.locator('[name="title"]').fill('학교 발표 준비');
  return dialog;
}
test('photo notice → failed save → retry → paused stopwatch attachment → durable completion and explicit submission',async ({page}) => {
  await seed(page);
  const dialog = await task(page);
  await expect(dialog.getByLabel('카메라로 과제 촬영')).toHaveAttribute('capture','environment');
  await dialog.getByLabel('갤러리 사진 첨부').setInputFiles('tests/fixtures/printed-homework.png');
  await expect(dialog.locator('.atelier-photos img')).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as {restore:()=>void}).restore = () => {Storage.prototype.setItem = original;};
    Storage.prototype.setItem = function(k,v) {if(k==='bkit.study-os.v1') throw new DOMException('full','QuotaExceededError'); original.call(this,k,v);};
  });
  await dialog.getByRole('button',{name:'과제 저장',exact:true}).click();
  await expect(dialog.getByRole('alert').first()).toBeVisible();
  await expect(dialog.locator('[name="title"]')).toHaveValue('학교 발표 준비');
  await expect(dialog.locator('.atelier-photos img')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
  await page.evaluate(() => (window as unknown as {restore:()=>void}).restore());
  await dialog.getByRole('button',{name:'과제 저장',exact:true}).click();
  const originalTask = (await state(page)).tasks[0];
  expect(originalTask).toMatchObject({due:null, submitted:false, kind:'수행평가'});
  expect(originalTask.attachmentIds).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('region',{name:'수행평가 및 제출 준비'})).toContainText('마감 미확인');
  await page.getByRole('button',{name:'스톱워치 바로 시작',exact:true}).click();
  const id = (await state(page)).quickTimer.id;
  await page.clock.fastForward(65000);
  await page.getByRole('region',{name:'바로 시작 타이머'}).getByRole('button',{name:'일시정지',exact:true}).click();
  const paused = (await state(page)).quickTimer;
  await page.reload();
  await page.getByLabel('진행 중인 스톱워치 과제 연결').selectOption(originalTask.id);
  expect((await state(page)).active).toMatchObject({id, elapsed:paused.elapsed,segmentStart:null,taskId:originalTask.id});
  await page.getByRole('button',{name:'다시 시작',exact:true}).click();
  await page.clock.fastForward(35000);
  // Quiet focus intentionally hides chrome; reveal the controls before finishing.
  const reveal = page.getByRole('button',{name:'조작 표시',exact:true});
  if (await reveal.isVisible()) await reveal.click();
  await page.getByRole('button',{name:'학습량 기록 · 종료',exact:true}).click();
  const saved = (await state(page)).sessions.find((s:{id:string})=>s.id===id);
  expect(saved.taskId).toBe(originalTask.id);
  expect(saved.seconds).toBeGreaterThanOrEqual(paused.elapsed + 35);
  await nav(page,'과제');
  await page.getByRole('button',{name:'학교 발표 준비 학습 완료로 변경',exact:true}).click();
  expect((await state(page)).tasks[0].submitted).toBe(false);
  await nav(page,'오늘');
  await expect(page.getByRole('region',{name:'수행평가 및 제출 준비'})).toContainText('학습 완료 · 제출 기록 확인 필요');
  await nav(page,'과제');
  await page.getByRole('button',{name:'학교 발표 준비 제출 완료 기록',exact:true}).click();
  expect((await state(page)).tasks[0].submitted).toBe(true);
  await page.reload();
  expect((await state(page)).sessions.find((s:{id:string})=>s.id===id).seconds).toBe(saved.seconds);
  expect((await state(page)).tasks[0].attachmentIds).toEqual(originalTask.attachmentIds);
});

test('PDF original is linked to the saved assessment and survives reopening',async ({page}) => {
  await seed(page);
  const dialog = await task(page);
  const pdf = await PDFDocument.create(); pdf.addPage([600,800]);
  const bytes = Buffer.from(await pdf.save());
  await dialog.getByLabel('과제 PDF 첨부', {exact:true}).setInputFiles({name:'school-notice.pdf',mimeType:'application/pdf',buffer:bytes});
  await expect(dialog.getByText('PDF 원본 보관됨 · school-notice.pdf')).toBeVisible();
  await dialog.locator('[name="dueDate"]').fill('2026-10-20');
  await dialog.getByRole('button',{name:'과제 저장',exact:true}).click();
  const saved = await state(page), resource=saved.learning.resources[0];
  expect(resource).toMatchObject({linkedTaskId:saved.tasks[0].id,subject:'영어'});
  await nav(page,'집중');
  await expect(page.locator('.paper-document-list strong').filter({hasText:'school-notice.pdf'})).toBeVisible();
  await page.getByRole('button',{name:'종이 열기',exact:true}).click();
  await expect(page.getByTestId('ink-canvas')).toBeVisible();
  await expect(page.getByTestId('ink-save-status')).toHaveText('저장됨');
  await page.reload();
  await nav(page,'집중');
  await expect(page.getByRole('button',{name:'종이 열기',exact:true})).toBeVisible();
});

test('API configuration failure leaves manual assessment intake usable',async ({page}) => {
  await seed(page);
  await page.route('**/api/config',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.getByRole('button',{name:'오늘 할 일 정리'}).click();
  await page.getByText('AI로 할 일 정리 · 선택',{exact:true}).click();
  await expect(page.getByText('AI 서버에 연결하지 못했어요. 직접 정리는 계속 사용할 수 있어요.')).toBeVisible();
  await page.getByRole('button',{name:'작성 보관하고 BKIT으로',exact:true}).click();
  const dialog = await task(page);
  await dialog.getByRole('button',{name:'과제 저장',exact:true}).click();
  expect((await state(page)).tasks).toHaveLength(1);
});
