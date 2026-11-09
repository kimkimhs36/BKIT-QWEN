import type { State } from './model';
import { buildProblemReviews } from './problemReview';

/** An upcoming retry is shown ONLY after the learner explicitly self-checks a saved answer.
 *  Its date comes from BKIT's existing, optional review-spacing policy, not a deadline.
 */
export type HomeUpcomingReview = {
  subject: string;
  problem: string;
  due: string;
  selfCheck: 'remembered' | 'retry';
};
export function firstUpcomingCheckedReview(state: State, today: string): HomeUpcomingReview | null {
  const candidate = buildProblemReviews(state, today).upcoming.find(
    (card) => card.last.selfCheck === 'remembered' || card.last.selfCheck === 'retry',
  );
  if (!candidate || (candidate.last.selfCheck !== 'remembered' && candidate.last.selfCheck !== 'retry'))
    return null;
  return {
    subject: candidate.subject,
    problem: candidate.problem.slice(0, 100),
    due: candidate.due,
    selfCheck: candidate.last.selfCheck,
  };
}
