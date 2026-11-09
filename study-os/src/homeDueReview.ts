import type { State } from './model';
import { buildProblemReviews } from './problemReview';
import { buildReviewQueue } from './review';

/**
 * A next action grounded in due, user-recorded mistakes.
 * Never invent a missed problem, claim mastery, or expose an answer on the home screen.
 */
export type HomeDueReview = {
  kind: 'problem' | 'session';
  subject: string;
  title: string;
  due: string;
};

export function firstDueReview(state: State, today: string): HomeDueReview | null {
  const problemQueue = buildProblemReviews(state, today);
  const problem = [...problemQueue.overdue, ...problemQueue.today][0];
  const session = buildReviewQueue(state, today).due[0];
  if (!problem && !session) return null;

  // Earlier dates first, and explicit problem-answer retests before session recall on ties.
  if (problem && (!session || problem.due <= session.due)) {
    return {
      kind: 'problem',
      subject: problem.subject,
      title: problem.problem.slice(0, 90),
      due: problem.due,
    };
  }
  return {
    kind: 'session',
    subject: session.subject,
    title: session.action.slice(0, 90),
    due: session.due,
  };
}
