import type { State } from './model';
import { addDays, dayKey } from './time';

type Attempt = NonNullable<NonNullable<State['active']>['workspace']>['attempts'][number];
export const ERROR_LABELS = {
  concept: '개념',
  procedure: '풀이 절차',
  calculation: '계산',
  interpretation: '문제 해석',
  unit: '단위·부호',
  vocabulary: '어휘·독해',
  attention: '주의',
  unknown: '아직 모름',
} as const;
export type ErrorTag = keyof typeof ERROR_LABELS;
export type ProblemSourceMeta = Pick<
  NonNullable<NonNullable<State['active']>['workspace']>,
  'sourceType' | 'problemNumber'
>;
export type AttemptMeta = Pick<Attempt, 'hintUsed' | 'confidence' | 'errorTag'>;
export function reviewInterval(attempt: Attempt, independentSuccesses = 0): number {
  if (attempt.selfCheck === 'retry') return 1;
  if (attempt.hintUsed || attempt.confidence === 'low') return 1;
  return [3, 7, 14, 30][Math.min(independentSuccesses, 3)];
}
/** Observed self-checks are preserved; intervals are product defaults, not mastery claims. */
export function buildProblemReviews(s: State, today: string) {
  const bySession = new Map<string, NonNullable<State['problemRetests']>>();
  for (const attempt of s.problemRetests ?? []) {
    const group = bySession.get(attempt.sessionId) ?? [];
    group.push(attempt);
    bySession.set(attempt.sessionId, group);
  }
  const cards = s.sessions
    .flatMap((session) => {
      const w = session.workspace;
      if (!w?.attempts.length) return [];
      const retests = bySession.get(session.id) ?? [];
      const all = [...w.attempts, ...retests];
      const last = all[all.length - 1];
      let lastReset = -1;
      all.forEach((attempt, index) => {
        if (attempt.selfCheck === 'retry' || attempt.hintUsed || attempt.confidence === 'low')
          lastReset = index;
      });
      const afterReset = retests.slice(Math.max(0, lastReset - w.attempts.length + 1));
      const independentSuccesses = new Set(
        afterReset
          .filter(
            (a) => a.selfCheck === 'remembered' && a.hintUsed === false && a.confidence !== 'low',
          )
          .map((a) => dayKey(a.submittedAt)),
      ).size;
      const step = Math.max(0, independentSuccesses - (lastReset >= 0 ? 1 : 0));
      const interval = !retests.length && lastReset >= 0 ? 1 : reviewInterval(last, step);
      const due =
        last.selfCheck === 'unreviewed' ? today : addDays(dayKey(last.submittedAt), interval);
      return [
        {
          sessionId: session.id,
          subject: session.subject,
          problem: w.problem,
          source: w.source,
          due,
          last,
          previous: w.attempts,
          retests: retests,
          independentSuccesses,
        },
      ];
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.sessionId.localeCompare(b.sessionId));
  return {
    overdue: cards.filter((c) => c.due < today),
    today: cards.filter((c) => c.due === today),
    upcoming: cards.filter((c) => c.due > today),
  };
}
export function addProblemRetest(
  s: State,
  sessionId: string,
  attempt: Attempt,
  now: number,
): State {
  const queue = buildProblemReviews(s, dayKey(now));
  const card = [...queue.overdue, ...queue.today].find((c) => c.sessionId === sessionId);
  if (
    !card ||
    card.last.selfCheck === 'unreviewed' ||
    (s.problemRetests?.length ?? 0) >= 50000 ||
    !attempt.answer.trim() ||
    s.problemRetests?.some((a) => a.id === attempt.id)
  )
    return s;
  return { ...s, problemRetests: [...(s.problemRetests ?? []), { ...attempt, sessionId }] };
}
