import { studySeconds } from './session';
import { addDays } from './time';
import type { Session, Task } from './model';
export function recentStudyDays(sessions: Session[], today: string) {
  return Array.from({length:7},(_,i)=>{
    const day=addDays(today,i-6), seconds=studySeconds(sessions,day);
    return {day,seconds,minutes:Math.floor(seconds/60)};
  });
}
export function deadlineDigest(tasks: Task[], now: number) {
  const pending=tasks.filter(x=>x.status!=='done');
  const overdue=pending.filter(x=>x.due && +new Date(x.due)<now);
  const soon=pending.filter(x=>x.due && +new Date(x.due)>=now && +new Date(x.due)<=now+48*3600000);
  const unknown=pending.filter(x=>!x.due).length;
  const earliest=[...overdue,...soon].sort((a,b)=>+new Date(a.due!)-+new Date(b.due!))[0]??null;
  return {total:pending.length,overdue:overdue.length,soon:soon.length,unknown,earliest};
}
export function weeklySubjectMinutes(sessions: Session[],today:string) {
  const days=Array.from({length:7},(_,i)=>addDays(today,-i));
  return [...new Set(sessions.map(x=>x.subject))].map(subject=>({
    subject,
    minutes:Math.floor(days.reduce((acc,day)=>acc+studySeconds(sessions.filter(x=>x.subject===subject),day),0)/60)
  })).sort((a,b)=>b.minutes-a.minutes||a.subject.localeCompare(b.subject,'ko'));
}
