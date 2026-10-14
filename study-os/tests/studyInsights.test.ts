import { describe, expect, it } from 'vitest';
import { deadlineDigest, recentStudyDays, weeklySubjectMinutes } from '../src/studyInsights';
import { at, iso } from '../src/time';
import { newState, type Session, type Task } from '../src/model';
const session=(day:string,seconds:number,subject='수학'):Session=>({
 id:day,taskId:null,subject,action:'문제',started:iso(at(day,'18:00')),ended:iso(at(day,'19:00')),
 seconds,target:25,problems:3,concepts:'',rating:'보통',reason:'',mistake:'',reviewDate:null,pauses:[]
});
const task=(due:string|null,id:string,status:Task['status']='todo'):Task=>({
 id,subject:'국어',title:'학습지',kind:'숙제',due:due?iso(at(due,'23:00')):null,status,
 submitted:false,optional:false,priority:2,minutes:25,remaining:25,notes:'',link:''
});
describe('real-data overview',()=>{
 it('returns seven chronological days with zeros',()=>{
   const d=recentStudyDays([session('2026-10-13',1200)],'2026-10-14');
   expect(d).toHaveLength(7);expect(d[6].day).toBe('2026-10-14');
   expect(d[6].minutes).toBe(0);expect(d[5].minutes).toBe(20);
 });
 it('totals minutes per subject using completed sessions only',()=>{
   expect(weeklySubjectMinutes([session('2026-10-12',600,'영어'),session('2026-10-13',1200,'국어')],'2026-10-14'))
     .toEqual([{subject:'국어',minutes:20},{subject:'영어',minutes:10}]);
 });
 it('separates overdue, imminent, unknown, done',()=>{
   expect(deadlineDigest([task('2026-10-13','old'),task('2026-10-15','soon'),task(null,'unknown'),{...task('2026-10-13','done','done'),submitted:true}],at('2026-10-14','15:00')))
     .toMatchObject({total:3,overdue:1,soon:1,unknown:1,earliest:{id:'old'}});
 });
 it('does not invent completed study or near deadlines',()=>{
   expect(recentStudyDays(newState().sessions,'2026-10-14').every(x=>x.seconds===0)).toBe(true);
   expect(deadlineDigest([task('2026-11-15','future')],at('2026-10-14','15:00')).soon).toBe(0);
 });
});

describe('completed but unsubmitted homework is still urgent', () => {
  it('is an obligation until submission is recorded', () => {
    const unsubmitted = task('2026-10-14','unsubmitted','done');
    const now = at('2026-10-14','14:00');
    expect(deadlineDigest([unsubmitted],now).total).toBe(1);
    expect(deadlineDigest([{...unsubmitted,submitted:true}],now).total).toBe(0);
  });
});
