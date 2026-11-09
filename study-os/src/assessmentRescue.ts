import type { Task } from './model';
import { dayKey } from './time';
import { taskDueDay } from './dailyTriage';
import { needsAttention, needsSubmission } from './tasks';

/** Only registered schoolwork is displayed. Never infer marks or missing assignments. */
export type AssessmentRescueItem = {
  task: Task;
  status: string;
  sort: number;
};

export type AssessmentRescue = {
  registered: number;
  outstanding: number;
  submissionChecks: number;
  deadlinesToVerify: number;
  top: AssessmentRescueItem[];
};

export function assessmentRescue(tasks: readonly Task[], now: number): AssessmentRescue {
  const today = dayKey(now);
  const registered = tasks.filter((task) => task.kind === '수행평가');
  const outstanding = registered.filter(needsAttention);
  const deadlinesToVerify = outstanding.filter(
    (task) => !taskDueDay(task) || task.deadline?.provenance === 'inferred',
  ).length;

  const priority = (task: Task): AssessmentRescueItem => {
    const due = taskDueDay(task);
    const inferred = task.deadline?.provenance === 'inferred';
    const submission = needsSubmission(task);
    if (inferred) return { task, status: '마감일 추정 · 학교 공지로 확인', sort: 3 };
    if (due && due < today) return {
      task,
      status: submission ? '기한 지남 · 제출 가능 여부 확인' : '기한 지남 · 수행 가능 여부 확인',
      sort: 0,
    };
    if (due === today) return {
      task,
      status: submission ? '오늘 마감 · 제출 확인 필요' : '오늘 마감 · 진행 확인 필요',
      sort: 1,
    };
    if (submission) return { task, status: '학습 완료 · 실제 제출 확인 필요', sort: 2 };
    if (!due) return { task, status: '마감일 미확인 · 공지 확인 필요', sort: 3 };
    return { task, status: '등록한 마감 ' + due, sort: 4 };
  };
  const top = outstanding.map(priority).sort(
    (a, b) => a.sort - b.sort ||
      (taskDueDay(a.task) ?? '9999-12-31').localeCompare(taskDueDay(b.task) ?? '9999-12-31') ||
      a.task.id.localeCompare(b.task.id),
  ).slice(0, 3);

  return {
    registered: registered.length,
    outstanding: outstanding.length,
    submissionChecks: outstanding.filter(needsSubmission).length,
    deadlinesToVerify,
    top,
  };
}
