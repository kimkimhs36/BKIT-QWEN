import type { State } from './model';
import { at } from './time';
export type Exam = NonNullable<State['exams']>[number];
export function examScopeStatus(exam: Exam): '확정' | '부분 확인' | '미확인' {
  return exam.confirmedScope.trim()
    ? exam.uncertainScope.trim()
      ? '부분 확인'
      : '확정'
    : '미확인';
}
export function daysUntilExam(exam: Exam, today: string): number | null {
  return exam.date ? Math.round((at(exam.date, '12:00') - at(today, '12:00')) / 86400000) : null;
}
export function examStudyOptions(exam: Exam, state: State) {
  // Show only actual registered materials, never synthesize a school's scope.
  return state.tasks.filter(
    (t) => t.subject === exam.subject && t.status !== 'done' && !!t.attachmentIds?.length,
  );
}
