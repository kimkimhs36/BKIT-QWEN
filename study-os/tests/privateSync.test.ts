import {describe,expect,it} from 'vitest';
import {newState, type Task} from '../src/model';
import {portableStudyState} from '../src/PrivateSync';

const task:Task={
  id:'task-test',subject:'영어',title:'학습지 3장',kind:'숙제',
  due:null,attachmentIds:['local-photo'],
  priority:2,minutes:25,remaining:25,status:'todo',
  submitted:false,optional:false,notes:'',link:'',
};
describe('private multi-device portable state',()=>{
  it('keeps study data while excluding local-only photo references and live timer',()=>{
    const input=newState();
    input.tasks=[task];
    input.settings.goal='매일 공부';
    input.learningEvents=[{id:'private-event',type:'FirstLearningAttempt',at:'2026-10-19T00:00:00.000Z',foregroundAt:'2026-10-19T00:00:00.000Z',taskId:task.id,sessionId:'private-session',action:'나의 로컬 첫 답변'}];
    input.problemRetests=[{id:'private-retest',sessionId:'private-session',answer:'나만의 재시험 답',submittedAt:'2026-10-19T00:00:00.000Z',selfCheck:'unreviewed'}];
    const portable=portableStudyState(input);
    expect(portable.tasks).toEqual([expect.not.objectContaining({attachmentIds:expect.anything()})]);
    expect(portable.tasks[0].title).toBe('학습지 3장');
    expect(portable.settings.goal).toBe('매일 공부');
    expect(portable.active).toBeNull();
    expect(portable.learningEvents).toBeUndefined();
    expect(portable.problemRetests).toBeUndefined();
    expect(JSON.stringify(portable)).not.toContain('나만의 재시험 답');
    expect(input.problemRetests[0].answer).toBe('나만의 재시험 답');
    expect(portable.plan).toEqual([]);
    expect(portable.undo).toBeNull();
    expect(portable.revision).toBe(0);
    expect(input.tasks[0].attachmentIds).toEqual(['local-photo']);
  });
});

it('an older cloud snapshot cannot erase local quick-history editing and material links', async () => {
  const {mergePrivateStudyState} = await import('../src/PrivateSync');
  const {startQuick,finishQuick} = await import('../src/quickTimer');
  const local = finishQuick(startQuick(newState(),'stopwatch',480,1000,'quick'),66000);
  local.sessions[0].resourceId = 'device-paper';
  const remote = structuredClone(local);
  delete remote.sessions[0].quick;
  delete remote.sessions[0].resourceId;
  remote.sessions[0].concepts = '다른 기기 메모';
  const merged = mergePrivateStudyState(local,remote);
  expect(merged.sessions[0]).toMatchObject({quick:true,resourceId:'device-paper',concepts:'다른 기기 메모',seconds:65});
  expect(local.sessions[0].concepts).toBe('');
});
