import type { Task } from './model';
import { dayKey, addDays, clock } from './time';

/**
 * Keeps the home honest: every pending task is not necessarily due TODAY.
 * State is never modified, and a missing/ambiguous deadline remains unknown.
 */
export type DailyTriage = {
  overdue: Task[];
  today: Task[];
  soon: Task[];
  later: Task[];
  unknown: Task[];
  spotlight: Task[];
  total: number;
};

export const taskDueDay = (task: Task): string | null =>
  task.deadline?.date || (task.due ? dayKey(task.due) : null);

export function dailyTriage(tasks: readonly Task[], now: number): DailyTriage {
  const today = dayKey(now);
  const near = addDays(today, 2);
  const result: DailyTriage = {
    overdue: [], today: [], soon: [], later: [], unknown: [], spotlight: [], total: 0,
  };
  for (const task of tasks) {
    // 'Done' is not 'submitted', but the submission queue handles that separately.
    if (task.status === 'done') continue;
    result.total++;
    const due = taskDueDay(task);
    if (!due) result.unknown.push(task);
    else if (due < today) result.overdue.push(task);
    else if (due === today) result.today.push(task);
    else if (due <= near) result.soon.push(task);
    else result.later.push(task);
  }
  const order = (a: Task, b: Task) =>
    (taskDueDay(a) || '9999-12-31').localeCompare(taskDueDay(b) || '9999-12-31') ||
    b.priority - a.priority || a.id.localeCompare(b.id);
  for (const group of [result.overdue, result.today, result.soon, result.later, result.unknown])
    group.sort(order);
  // A clear deadline outranks speculation; undated work is still visible and counted.
  result.spotlight = [
    ...result.overdue, ...result.today, ...result.soon, ...result.later, ...result.unknown,
  ];
  return result;
}

export function taskUrgencyLabel(task: Task, now: number): string {
  const due = taskDueDay(task);
  if (!due) return '마감 확인 필요';
  const today = dayKey(now);
  if (due < today) return '기한 지남 · 제출 가능 여부 확인';
  const hasConfirmedTime = task.deadline?.precision === 'exact-time';
  const legacyExact = !!task.due && !task.deadline;
  const time = (hasConfirmedTime || legacyExact) && task.due ? ' ' + clock(task.due) : ' · 시각 미확인';
  if (due === today) return '오늘 마감' + time;
  if (due === addDays(today, 1)) return '내일 마감' + time;
  return due + ' 마감' + time;
}
