import type { Task } from './model';
/** Only user-reported output changes quantity. A running timer never infers pages read. */
export function applyStudyProgress(
  task: Task,
  output: {
    complete: boolean;
    remainingMinutes: number;
    completedProblems: number;
    quantityRemaining?: number;
  },
): Task {
  const quantity = task.quantity
    ? {
        ...task.quantity,
        remaining: output.complete
          ? 0
          : (output.quantityRemaining ??
            (task.quantity.unit === 'problems'
              ? Math.max(0, task.quantity.remaining - output.completedProblems)
              : task.quantity.remaining)),
      }
    : undefined;
  return {
    ...task,
    status: output.complete ? 'done' : 'doing',
    quantity,
    remaining: output.complete ? task.remaining : output.remainingMinutes,
  };
}
