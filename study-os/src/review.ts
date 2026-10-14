import type { State } from './model';
import { addDays, dayKey, iso } from './time';

export type ReviewOutcome = 'remembered' | 'retry';
export type ReviewCard = {
  sessionId: string;
  subject: string;
  action: string;
  mistake: string;
  due: string;
  stage: number;
};
export type ReviewQueue = { due: ReviewCard[]; upcoming: ReviewCard[] };

// Local, deterministic self-checks, not automated grading or proof of mastery.
export function buildReviewQueue(s: State, today: string): ReviewQueue {
  const progress = new Map((s.reviewProgress ?? []).map((p) => [p.sessionId, p]));
  const cards = s.sessions
    .filter((session) => !!session.mistake.trim() && !s.reviewsDone.includes(session.id))
    .map((session): ReviewCard => {
      const item = progress.get(session.id);
      return {
        sessionId: session.id,
        subject: session.subject,
        action: session.action,
        mistake: session.mistake,
        due: item?.due ?? session.reviewDate ?? addDays(dayKey(session.ended), 1),
        stage: item?.stage ?? 0,
      };
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.sessionId.localeCompare(b.sessionId));
  return { due: cards.filter((v) => v.due <= today), upcoming: cards.filter((v) => v.due > today) };
}

export function recordReviewOutcome(
  s: State,
  sessionId: string,
  outcome: ReviewOutcome,
  time: number,
): State {
  if (!Number.isFinite(time) || (outcome !== 'remembered' && outcome !== 'retry')) return s;
  const today = dayKey(time);
  if (!buildReviewQueue(s, today).due.some((c) => c.sessionId === sessionId)) return s;
  const previous = (s.reviewProgress ?? []).find((x) => x.sessionId === sessionId);
  const nextStage = outcome === 'remembered' ? (previous?.stage ?? 0) + 1 : 0;
  const remaining = (s.reviewProgress ?? []).filter((x) => x.sessionId !== sessionId);
  if (nextStage === 3)
    return { ...s, reviewsDone: [...s.reviewsDone, sessionId], reviewProgress: remaining };
  return {
    ...s,
    reviewProgress: [
      ...remaining,
      {
        sessionId,
        stage: nextStage,
        due: addDays(today, outcome === 'retry' ? 1 : nextStage === 1 ? 3 : 7),
        updatedAt: iso(time),
      },
    ],
  };
}
