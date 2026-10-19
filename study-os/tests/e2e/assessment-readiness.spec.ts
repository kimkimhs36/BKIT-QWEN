import { test, expect } from './local-fixture';
import { newState, type Task } from '../../src/model';
import { at, iso } from '../../src/time';

function fixture(id: string, change: Partial<Task> = {}): Task {
  return {
    id, subject:'영어',title:'수행 발표 준비', kind:'수행평가',
    due:iso(at('2026-10-21','23:59')),
    deadline:{ date:'2026-10-21',precision:'date-only',provenance:'explicit' },
    priority:3,minutes:25,remaining:25,status:'todo',submitted:false,
    submissionRequired:true,optional:false,notes:'',link:'',...change,
  };
}
test('sudden performance assessments and completed-but-unsubmitted work are immediately visible',async ({page})=>{
  const state=newState();
  state.tasks=[
    fixture('a1'),
    fixture('a2',{id:'a2',subject:'국어',title:'독서 발표',due:null,deadline:undefined}),
    fixture('a3',{id:'a3',subject:'화학',title:'보고서 제출',status:'done'}),
  ];
  await page.clock.install({time:new Date('2026-10-19T05:00:00Z')});
  await page.addInitScript(s=>{ if(!localStorage.getItem('bkit.study-os.v1')) localStorage.setItem('bkit.study-os.v1',JSON.stringify(s)); },state);
  await page.goto('./');
  const radar=page.getByRole('region',{name:'수행평가 및 제출 준비'});
  await expect(radar).toContainText('영어 · 수행 발표 준비');
  await expect(radar).toContainText('모레');
  await expect(radar).toContainText('국어 · 독서 발표');
  await expect(radar).toContainText('마감 미확인');
  await expect(radar).toContainText('화학 · 보고서 제출');
  await expect(radar).toContainText('학습 완료 · 제출 기록 확인 필요');
  await page.reload();
  await expect(radar).toContainText('국어 · 독서 발표');
});

test('urgent performance button opens a preselected task, then saves without an invented deadline',async ({page})=>{
  await page.clock.install({time:new Date('2026-10-19T05:00:00Z')});
  await page.addInitScript(s=>{ if(!localStorage.getItem('bkit.study-os.v1')) localStorage.setItem('bkit.study-os.v1',JSON.stringify(s)); },newState());
  await page.goto('./');
  const radar=page.getByRole('region',{name:'수행평가 및 제출 준비'});
  await radar.getByRole('button',{name:'수행 등록'}).click();
  const dialog=page.getByRole('dialog',{name:'새 과제'});
  await expect(dialog.locator('select[name="kind"]')).toHaveValue('수행평가');
  await dialog.locator('input[name="subject"]').fill('물리');
  await dialog.locator('input[name="title"]').fill('물리 실험 보고서');
  await dialog.getByRole('button',{name:'과제 저장'}).click();
  await expect(dialog).not.toBeVisible();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.study-os.v1')!).tasks);
  expect(saved).toHaveLength(1);
  expect(saved[0].kind).toBe('수행평가');
  expect(saved[0].due).toBeNull();
  expect(saved[0].submitted).toBe(false);
  await expect(radar).toContainText('물리 · 물리 실험 보고서');
  await page.reload();
  await expect(radar).toContainText('마감 미확인');
});
