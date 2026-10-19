import type { State } from '../model';
import { elapsed } from '../session';

type Active = NonNullable<State['active']>;
export function questionSeconds(a: Active, problemId: string, total: number): number {
  const pace = a.questionPace;
  if (!pace) return 0;
  return (
    (pace.seconds[problemId] ?? 0) +
    (pace.current === problemId ? Math.max(0, total - pace.anchor) : 0)
  );
}
export function switchQuestion(a: Active, problemId: string, now: number): Active {
  if (a.questionPace?.current === problemId) return a;
  const total = elapsed(a, now);
  const previous = a.questionPace;
  return {
    ...a,
    questionPace: {
      current: problemId,
      anchor: total,
      seconds: previous
        ? { ...previous.seconds, [previous.current]: questionSeconds(a, previous.current, total) }
        : {},
      target: previous?.target ?? 240,
      review: previous?.review ?? [],
    },
  };
}
