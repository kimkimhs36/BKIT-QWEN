import {describe,it,expect} from 'vitest';
import {newState,stateSchema,problemWorkspaceSchema,learningAttemptSchema} from '../src/model';
import {at,iso} from '../src/time';

describe('Output-first learner evidence / backward compatibility',()=>{
 it('accepts old v1 backups without any problem workspace',()=>{
  const legacy=newState(); delete (legacy as Partial<typeof legacy>).reviewProgress;
  expect(stateSchema.parse(JSON.parse(JSON.stringify(legacy))).active).toBe(null);
 });
 it('stores a question and independently submitted answer, without claiming automatic correctness',()=>{
  const start=iso(at('2026-10-15','15:00'));
  const evidence=problemWorkspaceSchema.parse({
    problem:'극한이 존재하려면 좌우 극한이?',source:'수학 학습지 4쪽',
    attempts:[{id:'answer1',answer:'같아야 한다',submittedAt:start,selfCheck:'unreviewed'}]
  });
  const s=newState();s.active={id:'active1',taskId:null,subject:'수학',action:'학습지 풀이',
    target:25,started:start,segmentStart:null,elapsed:12,pauses:[],workspace:evidence};
  expect(stateSchema.parse(JSON.parse(JSON.stringify(s))).active?.workspace).toEqual(evidence);
  const a=learningAttemptSchema.parse({...evidence.attempts[0],selfCheck:'retry'});
  expect(a.selfCheck).toBe('retry');
  expect(()=>learningAttemptSchema.parse({...a,answer:''})).toThrow();
  expect(()=>problemWorkspaceSchema.parse({...evidence,attempts:Array.from({length:21},(_,i)=>({...a,id:String(i)}))})).toThrow();
 });
 it('preserves learning evidence after session finish using current v1 envelope',()=>{
  const s=newState(),moment=iso(at('2026-10-15','16:00'));
  const evidence=problemWorkspaceSchema.parse({problem:'2 + 2',source:'직접 문제',
    attempts:[{id:'answer2',answer:'4',submittedAt:moment,selfCheck:'remembered'}]});
  s.sessions.push({id:'s1',taskId:null,subject:'수학',action:'문제 1',
    started:moment,ended:iso(at('2026-10-15','16:10')),seconds:600,target:10,
    problems:1,concepts:'',rating:'보통',reason:'',pauses:[],mistake:'',
    reviewDate:null,workspace:evidence});
  expect(stateSchema.parse(s).sessions[0].workspace?.attempts[0].answer).toBe('4');
 });
});
