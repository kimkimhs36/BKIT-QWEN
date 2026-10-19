import type { State } from './model';
import { elapsed, closeSegment } from './session';
import { iso } from './time';
import { learning, resourceProblems } from './learningEngine';

/** The exam is a limit on the existing session clock; pauses consume no exam time. */
export function expireMockExam(s: State, now: number): State {
  const a = s.active;
  if (!a?.exam || a.exam.finishedAt || elapsed(a, now) < a.exam.duration) return s;
  const boundary = a.segmentStart
    ? +new Date(a.segmentStart) + Math.max(0, a.exam.duration - a.elapsed) * 1000
    : now;
  return {
    ...s,
    active: { ...closeSegment(a, boundary), exam: { ...a.exam, finishedAt: iso(boundary) } },
  };
}
export function mockExamSummary(s: State) {
  const a = s.active;
  if (!a?.exam) return null;
  const d = learning(s),
    ids = new Set(a.exam.problemIds);
  const attempts = d.attempts.filter((p) => p.sessionId === a.id && ids.has(p.problemId));
  return {
    total: ids.size,
    attempted: new Set(attempts.map((p) => p.problemId)).size,
    skipped: a.questionPace?.skipped?.filter((id) => ids.has(id)).length ?? 0,
    review: a.questionPace?.review.filter((id) => ids.has(id)).length ?? 0,
    questions: resourceProblems(d, a.resourceId ?? '').filter((p) => ids.has(p.id)),
  };
}
