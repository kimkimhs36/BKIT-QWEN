import type { State, Task } from './model';
import { uid } from './model';
import {
  emptyLearning,
  type LearningData,
  type LearningResource,
  type LearningProblem,
  type ResourceAttempt,
} from './learningModel';
import { addDays, dayKey, iso } from './time';
export const SOURCE_LABELS = {
  'school-worksheet': '학교 학습지',
  'academy-sheet': '학원 프린트',
  textbook: '교과서',
  'user-note': '개인 노트·직접 입력',
  'official-resource': '공개 교육 자료',
};
export const learning = (s: State) => s.learning ?? emptyLearning();
export const resourceProblems = (d: LearningData, resourceId: string) =>
  d.problems.filter((p) => p.resourceId === resourceId).sort((a, b) => a.ordinal - b.ordinal);
export const problemAttempts = (d: LearningData, problemId: string) =>
  d.attempts.filter((a) => a.problemId === problemId);
export const isCompleted = (d: LearningData, id: string) =>
  d.attempts.some((a) => a.problemId === id && a.selfCheck !== 'unreviewed');
export function resourceProgress(d: LearningData, id: string) {
  const problems = resourceProblems(d, id);
  const completedCount = problems.filter((p) => isCompleted(d, p.id)).length;
  const attemptedCount = problems.filter((p) =>
    d.attempts.some((a) => a.problemId === p.id),
  ).length;
  const current = d.resources.find((r) => r.id === id)?.currentProblemId;
  return {
    attemptedCount,
    completedCount,
    remainingCount: problems.length - completedCount,
    total: problems.length,
    currentProblemId:
      problems.find((p) => p.id === current)?.id ??
      problems.find((p) => !isCompleted(d, p.id))?.id ??
      problems[0]?.id ??
      null,
  };
}
export function makeProblem(
  resourceId: string,
  ordinal: number,
  body = '',
  now = Date.now(),
): LearningProblem {
  return {
    id: uid(),
    resourceId,
    ordinal,
    title: `${ordinal}번`,
    body,
    sourceReference: '',
    mediaId: null,
    concept: '',
    referenceAnswer: '',
    example: '',
    draft: '',
    draftFields: {},
    createdAt: iso(now),
    updatedAt: iso(now),
  };
}
export function addResource(
  s: State,
  input: Pick<
    LearningResource,
    'title' | 'subject' | 'sourceType' | 'linkedTaskId' | 'linkedMediaIds'
  >,
  bodies: string[],
  now = Date.now(),
): State {
  const d = learning(s),
    id = uid();
  const problems = bodies.map((body, i) => makeProblem(id, i + 1, body, now));
  const resource: LearningResource = {
    ...input,
    id,
    currentProblemId: problems[0]?.id ?? null,
    lastOpenedAt: null,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  return {
    ...s,
    learning: {
      ...d,
      resources: [...d.resources, resource],
      problems: [...d.problems, ...problems],
    },
  };
}
/** Count distinct, self-checked problems once. Retests never consume task quantity again. */
export function checkResourceAttempt(
  s: State,
  id: string,
  result: 'correct' | 'incorrect',
  errorTag: ResourceAttempt['errorTag'],
  now = Date.now(),
): State {
  const d = learning(s),
    attempt = d.attempts.find((a) => a.id === id);
  if (!attempt || attempt.selfCheck !== 'unreviewed') return s;
  const p = d.problems.find((p) => p.id === attempt.problemId)!;
  const r = d.resources.find((r) => r.id === p.resourceId)!;
  const first = !isCompleted(d, p.id);
  const data = {
    ...d,
    attempts: d.attempts.map((a) =>
      a.id === id ? { ...a, selfCheck: result, errorTag, checkedAt: iso(now) } : a,
    ),
  };
  return {
    ...s,
    learning: data,
    tasks: s.tasks.map((t) =>
      t.id === r.linkedTaskId && first
        ? {
            ...t,
            status: t.status === 'done' ? 'done' : 'doing',
            quantity:
              t.quantity?.unit === 'problems'
                ? { ...t.quantity, remaining: Math.max(0, t.quantity.remaining - 1) }
                : t.quantity,
          }
        : t,
    ),
  };
}
export function recordResourceAttempt(
  s: State,
  problemId: string,
  meta: Pick<ResourceAttempt, 'hintUsed' | 'confidence'>,
  now = Date.now(),
): State {
  const d = learning(s),
    p = d.problems.find((p) => p.id === problemId);
  if (!p || !s.active || s.active.resourceId !== p.resourceId || !p.draft.trim()) return s;
  const attempts = problemAttempts(d, p.id);
  if (attempts.at(-1)?.selfCheck === 'unreviewed') return s;
  const event = {
    id: uid(),
    type: 'FirstLearningAttempt' as const,
    at: iso(now),
    foregroundAt:
      s.learningEvents
        ?.filter((e) => e.sessionId === s.active!.id && e.type === 'StudyStarted')
        .at(-1)?.foregroundAt ?? s.active.started,
    taskId: s.active.taskId,
    sessionId: s.active.id,
    action: s.active.action,
  };
  const events = s.learningEvents ?? [];
  return {
    ...s,
    learningEvents:
      events.some((e) => e.type === 'FirstLearningAttempt' && e.sessionId === s.active!.id) ||
      events.length >= 50000
        ? events
        : [...events, event],
    learning: {
      ...d,
      problems: d.problems.map((x) =>
        x.id === p.id ? { ...x, draft: '', draftFields: {}, updatedAt: iso(now) } : x,
      ),
      attempts: [
        ...d.attempts,
        {
          id: uid(),
          problemId,
          sessionId: s.active.id,
          learnerAnswer: p.draft.trim(),
          fields: p.draftFields,
          ...meta,
          selfCheck: 'unreviewed',
          errorTag: 'unknown',
          submittedAt: iso(now),
          checkedAt: null,
        },
      ],
    },
  };
}
export function moveProblem(
  s: State,
  resourceId: string,
  problemId: string,
  now = Date.now(),
): State {
  const d = learning(s);
  if (!d.problems.some((p) => p.id === problemId && p.resourceId === resourceId)) return s;
  return {
    ...s,
    learning: {
      ...d,
      resources: d.resources.map((r) =>
        r.id === resourceId ? { ...r, currentProblemId: problemId, lastOpenedAt: iso(now) } : r,
      ),
    },
  };
}
export function linkedTaskProgress(s: State, taskId: string) {
  const d = learning(s),
    resources = d.resources.filter((r) => r.linkedTaskId === taskId);
  return resources.map((r) => ({ resource: r, ...resourceProgress(d, r.id) }));
}
export function protectResourceTask(s: State, task: Task) {
  const progress = linkedTaskProgress(s, task.id);
  if (progress.some((p) => p.remainingCount > 0) && task.status === 'done')
    throw new Error('연결 자료에 풀지 않은 문제가 있습니다. 실제 문제를 먼저 확인하세요.');
  return task;
}
export function buildResourceReviews(s: State, today: string) {
  const d = learning(s);
  return d.problems
    .flatMap((p) => {
      const attempts = problemAttempts(d, p.id),
        last = attempts.at(-1);
      if (!last) return [];
      const resource = d.resources.find((r) => r.id === p.resourceId)!;
      let reset = -1;
      attempts.forEach((a, i) => {
        if (a.selfCheck === 'incorrect' || a.hintUsed || a.confidence === 'low') reset = i;
      });
      const successes = new Set(
        attempts
          .slice(reset + 1)
          .filter((a) => a.selfCheck === 'correct' && !a.hintUsed && a.confidence !== 'low')
          .map((a) => dayKey(a.submittedAt)),
      ).size;
      const interval =
        last.selfCheck === 'incorrect' || last.hintUsed
          ? 1
          : last.confidence === 'low'
            ? [1, 3, 7][Math.min(successes, 2)]
            : [3, 7, 14, 30][Math.min(Math.max(0, successes - 1), 3)];
      const normalDue =
        last.selfCheck === 'unreviewed'
          ? today
          : addDays(dayKey(last.checkedAt ?? last.submittedAt), interval);
      // Only explicitly linked upcoming exams adjust a long interval, and only once per day.
      const exam = (s.exams ?? [])
        .filter((e) => e.linkedResourceIds?.includes(resource.id) && e.date && e.date >= today)
        .sort((a, b) => a.date!.localeCompare(b.date!))[0];
      const examDue = exam?.date ? addDays(exam.date, -2) : null;
      const due =
        examDue && examDue < normalDue && examDue > dayKey(last.submittedAt) ? examDue : normalDue;
      const category =
        last.selfCheck === 'incorrect'
          ? 'incorrect'
          : last.hintUsed
            ? 'hint'
            : last.confidence === 'low'
              ? 'low'
              : 'independent';
      return [
        {
          problem: p,
          resource,
          attempts,
          last,
          due,
          normalDue,
          exam,
          category,
          independentSuccesses: successes,
        },
      ];
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.problem.ordinal - b.problem.ordinal);
}
export function conceptEvidence(s: State) {
  const d = learning(s),
    groups = new Map<string, LearningProblem[]>();
  for (const p of d.problems)
    if (p.concept.trim()) {
      const subject = d.resources.find((r) => r.id === p.resourceId)?.subject ?? '';
      const key = subject + ' · ' + p.concept.trim();
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
  return [...groups].map(([concept, problems]) => {
    const ids = new Set(problems.map((p) => p.id)),
      attempts = d.attempts.filter((a) => ids.has(a.problemId));
    const independent = attempts.filter(
      (a) => a.selfCheck === 'correct' && !a.hintUsed && a.confidence !== 'low',
    );
    const distinctProblems = new Set(independent.map((a) => a.problemId)).size;
    const distinctSessions = new Set(independent.map((a) => a.sessionId)).size;
    const errors = attempts.filter((a) => a.selfCheck === 'incorrect');
    return {
      concept,
      observed: {
        answers: attempts.length,
        independent: independent.length,
        distinctProblems,
        distinctSessions,
        errors,
      },
      inferred:
        distinctProblems >= 2 && distinctSessions >= 2
          ? '여러 문제·세션에서 독립 정답 관찰'
          : '추가 근거 필요',
    };
  });
}

/** Resume unfinished material first when a task has several linked worksheets. */
export function resourceForTask(s: State, taskId: string | undefined) {
  if (!taskId) return undefined;
  const data = learning(s);
  return data.resources
    .filter((r) => !r.archived && r.linkedTaskId === taskId)
    .sort(
      (a, b) =>
        Number(resourceProgress(data, b.id).remainingCount > 0) -
          Number(resourceProgress(data, a.id).remainingCount > 0) ||
        (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''),
    )[0];
}
