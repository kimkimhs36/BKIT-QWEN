import {describe,it,expect} from 'vitest';
import {parseCapture,captureDeadline,formatTaskDeadline,formatQuantity} from '../src/capture';
import {newState,taskSchema,stateSchema} from '../src/model';
import {at,iso} from '../src/time';
describe('BKIT Capture v2 / research report pp 35-36',()=>{
 const now=at('2026-10-15','14:00');
 it('stores amount and keeps unknown clock time unknown',()=>{
  const p=parseCapture('금요일까지 수학 숙제 20문제',now);
  expect(p).toMatchObject({subject:'수학',due:'2026-10-16',precision:'date-only',quantityUnit:'problems',quantityTotal:20});
  const d=captureDeadline(p);
  expect(d.due).toBe(iso(at('2026-10-16','23:59')));
  expect(d.deadline).toEqual({date:'2026-10-16',precision:'date-only',provenance:'explicit'});
  const t=taskSchema.parse({id:'a',subject:'수학',title:'20문제',kind:'숙제',...d,
   quantity:{unit:'problems',total:20,remaining:20},minutes:25,remaining:25,
   priority:2,status:'todo',submitted:false,optional:false,notes:'',link:''});
  expect(formatTaskDeadline(t)).toContain('시각 미확인');
  expect(formatQuantity(t.quantity)).toBe('20/20문제');
 });
 it('distinguishes exact afternoon time and ambiguous bare four oclock',()=>{
  const p=parseCapture('금요일 오후 4시까지 경제 수행평가 제출',now);
  expect(p).toMatchObject({due:'2026-10-16',precision:'exact-time',dueTime:'16:00'});
  expect(captureDeadline(p).due).toBe(iso(at('2026-10-16','16:00')));
  expect(parseCapture('금요일 4시까지',now).precision).toBe('date-only');
  expect(parseCapture('내일 오전 12시까지',now).dueTime).toBe('00:00');
  expect(parseCapture('내일 오후 12시까지',now).dueTime).toBe('12:00');
  expect(()=>captureDeadline({...p,dueTime:''})).toThrow();
 });
 it('recognizes passages and pages and never creates a missing date',()=>{
  expect(parseCapture('영어 지문 3개 외우기',now)).toMatchObject({precision:'unknown',quantityUnit:'passages',quantityTotal:3});
  expect(parseCapture('화학 학습지 2쪽',now)).toMatchObject({quantityUnit:'pages',quantityTotal:2});
  expect(captureDeadline(parseCapture('경제 공부',now)).due).toBeNull();
 });
 it('supports legacy and optional metadata without losing JSON roundtrip',()=>{
  const state=newState();
  const task=taskSchema.parse({id:'q',subject:'경제',title:'학습지 2쪽',kind:'숙제',due:null,
   quantity:{unit:'pages',total:2,remaining:1},estimate:{minMinutes:20,maxMinutes:40,source:'user'},
   priority:2,minutes:40,remaining:20,status:'doing',submitted:false,optional:false,notes:'',link:''});
  state.tasks.push(task);
  expect(stateSchema.parse(JSON.parse(JSON.stringify(state))).tasks[0]).toEqual(task);
  const legacy=JSON.parse(JSON.stringify(state));delete legacy.tasks[0].quantity;delete legacy.tasks[0].estimate;
  expect(stateSchema.parse(legacy).tasks[0].quantity).toBeUndefined();
  expect(()=>taskSchema.parse({...task,quantity:{unit:'pages',total:2,remaining:3}})).toThrow();
 });
});
