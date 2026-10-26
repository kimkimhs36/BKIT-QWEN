import { learningConcepts } from './catalogue';
import { questionById, errorLabels } from './content';
import { activeAttempts, DAY, independent, type StudyDocument } from './engine';
/** Delayed rate counts only a due, different-item review; denominator never includes an early rehearsal. */
export function performance(document: StudyDocument, now = Date.now()) {
  const rows = activeAttempts(document).filter((a) => a.at <= now);
  let eligible = 0,
    successful = 0;
  const history = new Map<string, { due: number; last: string; interval: number }>();
  rows.forEach((a) => {
    const concept = questionById(a.questionId).concept,
      prior = history.get(concept);
    const valid = a.kind === 'review' && prior && a.at >= prior.due && prior.last !== a.questionId;
    const solved = independent(a);
    if (valid) {
      eligible++;
      if (solved) successful++;
    }
    const interval = !solved
      ? 1
      : valid
        ? Math.min(30, (prior?.interval || 1) * 2)
        : prior?.interval || 1;
    history.set(concept, { due: a.at + interval * DAY, last: a.questionId, interval });
  });
  const errors = Object.entries(errorLabels)
    .map(([id, label]) => ({ id, label, count: rows.filter((a) => a.error === id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const days = new Map<string, { total: number; independent: number }>();
  rows.forEach((a) => {
    const day = new Date(a.at + 9 * 3600000).toISOString().slice(0, 10);
    const d = days.get(day) || { total: 0, independent: 0 };
    d.total++;
    if (independent(a)) d.independent++;
    days.set(day, d);
  });
  return {
    changes: learningConcepts
      .map((c) => {
        const history = rows.filter((a) => questionById(a.questionId).concept === c.id);
        const first = history[0],
          last = history.at(-1);
        return {
          concept: c,
          count: history.length,
          recovered: !!first && !independent(first) && !!last && independent(last),
          hintsReduced: history.length >= 2 && first.hints > last!.hints && independent(last!),
          firstAt: first?.at,
          lastAt: last?.at,
        };
      })
      .filter((c) => c.count > 0),
    total: rows.length,
    independent: rows.filter(independent).length,
    eligible,
    successful,
    errors,
    days: [...days].slice(-14),
  };
}
