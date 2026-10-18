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
    const portable=portableStudyState(input);
    expect(portable.tasks).toEqual([expect.not.objectContaining({attachmentIds:expect.anything()})]);
    expect(portable.tasks[0].title).toBe('학습지 3장');
    expect(portable.settings.goal).toBe('매일 공부');
    expect(portable.active).toBeNull();
    expect(portable.plan).toEqual([]);
    expect(portable.undo).toBeNull();
    expect(portable.revision).toBe(0);
    expect(input.tasks[0].attachmentIds).toEqual(['local-photo']);
  });
});
