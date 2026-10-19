import type { Task } from './model';
import { addDays, dayKey } from './time';

/** Ground reminders in recorded deadlines only; do not invent a submission time. */
export type TaskUrgency = 'overdue' | 'today' | 'tomorrow' | 'two-days' | 'later' | 'unknown';
export type AssessmentWatch = {
  critical: Task[];
  upcoming: Task[];
  undated: Task[];
  completedNotSubmitted: Task[];
  totalUnsubmitted: number;
  byId: ReadonlyMap<string, TaskUrgency>;
};

export function assessmentUrgency(task: Task, today: string, now: number): TaskUrgency {
  if (!task.due) return 'unknown';
  const deadlineDay = task.deadline?.date || dayKey(task.due);
  if (deadlineDay < today) return 'overdue';
  if (deadlineDay === today) {
    // Only exact times are overdue within a day. A date-only 23:59 planning
    // boundary must never be presented as a confirmed 23:59 submission time.
    if (task.deadline?.precision !== 'date-only' && Date.parse(task.due) < now)
      return 'overdue';
    return 'today';
  }
  if (deadlineDay === addDays(today, 1)) return 'tomorrow';
  if (deadlineDay === addDays(today, 2)) return 'two-days';
  return 'later';
}

/** Never auto-mark tasks submitted merely because their work status is done. */
export function assessmentWatch(tasks: Task[], now: number): AssessmentWatch {
  const today = dayKey(now), byId = new Map<string, TaskUrgency>();
  const watched = tasks.filter(t =>
    !t.submitted && (t.kind === '수행평가' || t.submissionRequired === true));
  for (const task of watched) byId.set(task.id, assessmentUrgency(task, today, now));
  const rank: Record<TaskUrgency, number> = {
    overdue: 0, today: 1, tomorrow: 2, 'two-days': 3, unknown: 4, later: 5,
  };
  const ordered = [...watched].sort((a, b) =>
    rank[byId.get(a.id)!] - rank[byId.get(b.id)!] ||
    (a.due ?? '').localeCompare(b.due ?? '') ||
    b.priority - a.priority ||
    a.title.localeCompare(b.title, 'ko'));
  return {
    critical: ordered.filter(t => t.status !== 'done' && rank[byId.get(t.id)!] <= 3),
    upcoming: ordered.filter(t => t.status !== 'done' && byId.get(t.id) === 'later'),
    undated: ordered.filter(t => t.status !== 'done' && byId.get(t.id) === 'unknown'),
    completedNotSubmitted: ordered.filter(t => t.status === 'done'),
    totalUnsubmitted: watched.length,
    byId,
  };
}
export function urgencyLabel(value: TaskUrgency): string {
  const labels: Record<TaskUrgency, string> = {
    overdue: '마감 지남 · 날짜 재확인', today: '오늘', tomorrow: '내일',
    'two-days': '모레', later: '이후 마감', unknown: '마감 확인 필요',
  };
  return labels[value];
}
