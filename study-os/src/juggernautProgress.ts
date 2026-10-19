import { fixedForDay, overlap } from './engine';
import type { State, Session } from './model';
import { dayKey, addDays, weekday, at } from './time';
import { closeSegment } from './session';
import { studySeconds } from './session';
import { quickSeconds } from './quickTimer';
import { learning } from './learningEngine';

/** The dashboard reads the existing ledger. Resource answers are never counted again as session output. */
export function juggernautProgress(s: State, now: number) {
  const today = dayKey(now);
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const start = at(monday, '00:00');
  const entries = [...s.sessions];
  const live = s.active
    ? closeSegment(s.active, now)
    : s.quickTimer
      ? {
          ...s.quickTimer,
          subject: '미분류',
          action: '바로 시작',
          elapsed: quickSeconds(s.quickTimer, now),
          segments: [
            ...s.quickTimer.segments,
            ...(s.quickTimer.segmentStart && now > Date.parse(s.quickTimer.segmentStart)
              ? [{ start: s.quickTimer.segmentStart, end: new Date(now).toISOString() }]
              : []),
          ],
        }
      : null;
  if (live && !entries.some((e) => e.id === live.id))
    entries.push({
      ...live,
      taskId: 'taskId' in live ? live.taskId : null,
      ended: new Date(now).toISOString(),
      seconds: live.elapsed,
      target: 5,
      problems: 0,
      concepts: '',
      rating: '보통',
      reason: '',
      mistake: '',
      reviewDate: null,
      pauses: [],
    } as Session);
  // Defensive against a malformed caller; validated stored states also reject duplicate IDs.
  const unique = [...new Map(entries.map((e) => [e.id, e])).values()];
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekSeconds = days.reduce((n, d) => n + studySeconds(unique, d), 0);
  const subjects = [...new Set(unique.map((s) => s.subject || '미분류'))]
    .map((subject) => ({
      subject,
      seconds: unique
        .filter((s) => (s.subject || '미분류') === subject)
        .reduce((n, s) => n + s.seconds, 0),
    }))
    .sort((a, b) => b.seconds - a.seconds);
  const starts = new Set(
    unique
      .filter((s) => Date.parse(s.started) >= start && Date.parse(s.started) <= now)
      .map((s) => s.id),
  );
  for (const event of s.learningEvents ?? [])
    if (
      event.type === 'StudyStarted' &&
      event.sessionId &&
      Date.parse(event.at) >= start &&
      Date.parse(event.at) <= now
    )
      starts.add(event.sessionId);
  const d = learning(s);
  const solved = new Set(
    d.attempts
      .filter(
        (a) =>
          a.selfCheck !== 'unreviewed' &&
          a.checkedAt &&
          Date.parse(a.checkedAt) >= start &&
          Date.parse(a.checkedAt) <= now,
      )
      .map((a) => a.problemId),
  );
  const manual = s.sessions
    .filter((s) => !s.resourceId && Date.parse(s.ended) >= start && Date.parse(s.ended) <= now)
    .reduce((n, s) => n + s.problems, 0);
  const latest = new Map<string, (typeof d.attempts)[number]>();
  for (const a of [...d.attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)))
    latest.set(a.problemId, a);
  const review = [...latest.values()].filter((a) => a.selfCheck === 'incorrect').length;
  const resume = d.resources
    .filter((r) => !r.archived && r.currentProblemId)
    .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))[0];
  const dueTasks = s.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.due &&
      Date.parse(t.due) >= now &&
      Date.parse(t.due) < now + 3 * 86400000,
  );
  const plannedMinutes = s.plan
    .filter((b) => Date.parse(b.start) >= now && Date.parse(b.start) < now + 3 * 86400000)
    .reduce((n, b) => n + (Date.parse(b.end) - Date.parse(b.start)) / 60000, 0);
  const conflicts:{id:string;title:string;start:number;end:number}[]=[];
  const plans=s.plan.filter(b=>Date.parse(b.end)>now && Date.parse(b.start)<now+7*86400000);
  const fixed=[...new Map(Array.from({length:8},(_,i)=>fixedForDay(s,addDays(today,i))).flat().map(f=>[f.id+':'+f.start,f])).values()];
  for(let i=0;i<plans.length;i++) {
    const p=plans[i],span={start:Date.parse(p.start),end:Date.parse(p.end)},title=s.tasks.find(t=>t.id===p.taskId)?.title??'학습 계획';
    for(const f of fixed)if(overlap(span,f))conflicts.push({id:p.id+':'+f.id,title:title+' ↔ '+f.title,start:Math.max(span.start,f.start),end:Math.min(span.end,f.end)});
    for(const other of plans.slice(i+1)){const o={start:Date.parse(other.start),end:Date.parse(other.end)};if(overlap(span,o))conflicts.push({id:p.id+':'+other.id,title:title+' ↔ '+(s.tasks.find(t=>t.id===other.taskId)?.title??'학습 계획'),start:Math.max(span.start,o.start),end:Math.min(span.end,o.end)});}
  }
  return {
    conflicts,
    todaySeconds: studySeconds(unique, today),
    weekSeconds,
    subjects,
    starts: starts.size,
    solved: solved.size + manual,
    review,
    resume,
    dueTasks,
    plannedMinutes,
  };
}
