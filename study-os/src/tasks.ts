import type { Task } from './model';
export const needsSubmission = (t: Task) =>
  t.status === 'done' && !t.submitted && (t.kind === '숙제' || t.kind === '수행평가');
export const needsAttention = (t: Task) => t.status !== 'done' || needsSubmission(t);
export function filteredTasks(tasks: Task[], filter: string) {
  return tasks.filter(
    (t) =>
      filter === 'all' ||
      (filter === 'submission' && needsSubmission(t)) ||
      (filter === 'done' && t.status === 'done') ||
      (filter === 'pending' && t.status !== 'done'),
  );
}
