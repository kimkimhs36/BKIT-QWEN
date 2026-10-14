import {describe,it,expect} from 'vitest';
import {newState,taskSchema,scheduleSchema,stateSchema} from '../src/model';
import {at,iso} from '../src/time';
import {TASK_COLUMNS,SCHEDULE_COLUMNS,exportStudySheets,readStudySheets,
 cloudSignature,localSignature,remoteIsEmpty} from '../src/cloudSheet';
import {parseSheetId} from '../src/cloudClient';

describe('BKIT Cloud data protocol',()=>{
 it('roundtrips task quantities, deadlines and timetable without private data',()=>{
  const state=newState();
  state.tasks=[taskSchema.parse({
   id:'task-a',subject:'수학',title:'금요일 숙제 20문제',kind:'숙제',
   due:iso(at('2026-10-16','23:59')),
   deadline:{date:'2026-10-16',precision:'date-only',provenance:'explicit'},
   quantity:{unit:'problems',total:20,remaining:13},
   minutes:35,remaining:20,priority:2,status:'doing',submitted:false,
   optional:false,notes:'학습지 4쪽',link:'',
  })];
  state.schedules=[scheduleSchema.parse({
   id:'fixed-a',title:'수학학원',subject:'수학',kind:'academy',days:[3,5],
   start:'18:00',end:'22:00',prep:10,travel:20,buffer:5,materials:'학습지',
   date:null,excluded:[],
  })];
  state.settings.goal='미적분 기초';
  const data=exportStudySheets(state);
  expect(data.tasks[0]).toEqual([...TASK_COLUMNS]);
  expect(data.schedules[0]).toEqual([...SCHEDULE_COLUMNS]);
  const got=readStudySheets(data);
  expect(got.tasks[0]).toMatchObject({
   title:'금요일 숙제 20문제',
   deadline:{date:'2026-10-16',precision:'date-only'},
   quantity:{unit:'problems',total:20,remaining:13},
  });
  expect(got.tasks[0].due).toBe(iso(at('2026-10-16','23:59')));
  expect(got.schedules[0]).toMatchObject({days:[3,5],kind:'academy'});
  expect(got.goal).toBe('미적분 기초');
  expect(cloudSignature(got)).toBe(localSignature(state));
 });
 it('does not upload grades, answers, exam scores or private focus sessions',()=>{
  const state=newState(),t=iso(at('2026-10-15','15:00'));
  state.grades.push({id:'private-grade',subject:'수학',exam:'내신',date:null,target:80,score:50});
  state.active={id:'now',taskId:null,subject:'수학',action:'공부',target:5,
   started:t,segmentStart:null,elapsed:0,pauses:[],
   workspace:{problem:'개인 문제',source:'학교',
    attempts:[{id:'attempt',answer:'기록할 수 없는 개인 풀이',selfCheck:'unreviewed',submittedAt:t}]}};
  const output=JSON.stringify(exportStudySheets(state));
  expect(output).not.toContain('private-grade');
  expect(output).not.toContain('개인 풀이');
  expect(output).not.toContain('attempt');
  expect(stateSchema.parse(state).active?.workspace?.attempts).toHaveLength(1);
 });
 it('reads human-authored edits and rejects invalid deadline precision or duplicate IDs',()=>{
  const state=newState();
  const data=exportStudySheets(state);
  data.tasks.push(['test1','경제','경제 수행평가','수행평가','2026-10-16','16:00','exact-time',
   'pages','2','1','25','25','todo','false','1','','','false','']);
  const r=readStudySheets(data);
  expect(r.tasks[0].due).toBe(iso(at('2026-10-16','16:00')));
  const bad=exportStudySheets(state);
  bad.tasks.push(['test1','경제','수행평가','수행평가','2026-10-16','','exact-time']);
  expect(()=>readStudySheets(bad)).toThrow(/확정된 마감 시각/);
  const repeated=exportStudySheets(state);
  repeated.tasks.push([...data.tasks[1]],[...data.tasks[1]]);
  expect(()=>readStudySheets(repeated)).toThrow(/중복 ID/);
  expect(remoteIsEmpty(readStudySheets(exportStudySheets(newState())))).toBe(false);
 });
 it('parses Google Sheet URL or ID without embedding private sheet identifiers in code',()=>{
  const fake='BKIT_TEST_SHEET_ID_SAMPLE_1234567890';
  expect(parseSheetId('https://docs.google.com/spreadsheets/d/'+fake+'/edit')).toBe(fake);
  expect(parseSheetId(fake)).toBe(fake);
  expect(()=>parseSheetId('https://attacker.example')).toThrow();
 });
});
