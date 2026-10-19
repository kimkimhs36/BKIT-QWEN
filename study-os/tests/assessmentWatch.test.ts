import { describe, expect, it } from 'vitest';
import { assessmentWatch, assessmentUrgency } from '../src/assessmentWatch';
import { at, iso } from '../src/time';
import type { Task } from '../src/model';

const now = at('2026-10-19', '10:30');
function task(id: string, opts: Partial<Task> = {}): Task {
  return {
    id, subject: '영어', title: '발표 수행 준비', kind: '수행평가',
    due: iso(at('2026-10-20', '23:59')),
    deadline: { date: '2026-10-20', precision: 'date-only', provenance: 'explicit' },
    priority: 2, minutes: 25, remaining: 25, status: 'todo', submitted: false,
    submissionRequired: true, optional: false, notes: '', link: '',
    ...opts,
  };
}
describe('performance readiness without invented deadlines', () => {
  it('groups overdue, today, tomorrow, after tomorrow and uncertain assessment dates', () => {
    const tasks=[
      task('overdue', { due: iso(at('2026-10-18', '23:59')), deadline:{date:'2026-10-18',precision:'date-only',provenance:'explicit'} }),
      task('today', { due: iso(at('2026-10-19', '23:59')), deadline:{date:'2026-10-19',precision:'date-only',provenance:'explicit'} }),
      task('tomorrow'),
      task('two', {due: iso(at('2026-10-21','23:59')), deadline:{date:'2026-10-21',precision:'date-only',provenance:'explicit'}}),
      task('unknown', {due:null,deadline:undefined}),
      task('future', {due:iso(at('2026-11-03','23:59')),deadline:{date:'2026-11-03',precision:'date-only',provenance:'explicit'}}),
    ];
    const watch=assessmentWatch(tasks,now);
    expect(watch.critical.map(t=>t.id)).toEqual(['overdue','today','tomorrow','two']);
    expect(watch.undated.map(t=>t.id)).toEqual(['unknown']);
    expect(watch.upcoming.map(t=>t.id)).toEqual(['future']);
    expect(watch.byId.get('today')).toBe('today');
  });
  it('shows completed but not submitted tasks separately, even when the deadline has passed', () => {
    const completed=task('complete',{status:'done',due:null,deadline:undefined});
    const submitted=task('submitted',{status:'done',submitted:true});
    const watch=assessmentWatch([completed,submitted],now);
    expect(watch.completedNotSubmitted.map(t=>t.id)).toEqual(['complete']);
    expect(watch.totalUnsubmitted).toBe(1);
    expect(watch.critical).toHaveLength(0);
  });
  it('does not convert an unknown or date-only deadline into a confirmed clock time', () => {
    expect(assessmentUrgency(task('none',{due:null,deadline:undefined}),'2026-10-19',now)).toBe('unknown');
    expect(assessmentUrgency(task('date',{due:iso(at('2026-10-19','23:59')),deadline:{date:'2026-10-19',precision:'date-only',provenance:'explicit'}}),'2026-10-19',at('2026-10-19','23:59')+1000)).toBe('today');
    expect(assessmentUrgency(task('timed',{due:iso(at('2026-10-19','10:00')),deadline:{date:'2026-10-19',precision:'exact-time',provenance:'user-confirmed'}}),'2026-10-19',now)).toBe('overdue');
  });
  it('includes active submission-required homework but not unrelated personal tasks',()=>{
    const watch=assessmentWatch([
      task('homework',{kind:'숙제',submissionRequired:true}),
      task('personal',{kind:'개인 일정',submissionRequired:false}),
      task('done-assessment',{kind:'수행평가',submissionRequired:false,status:'doing'}),
    ],now);
    expect(watch.critical.map(t=>t.id)).toEqual(['homework','done-assessment']);
  });
});
