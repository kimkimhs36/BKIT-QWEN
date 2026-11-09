import { describe, expect, it } from 'vitest';
import { newState, stateSchema, type Session } from '../src/model';
import { buildProblemReviews } from '../src/problemReview';
import { firstUpcomingCheckedReview } from '../src/homeUpcomingReview';
import { firstDueReview } from '../src/homeDueReview';

const submittedAt = '2026-11-08T13:00:00+09:00';
const checkedAt = '2026-11-09T13:00:00+09:00';
const session: Session = {
  id: 'checked-later', taskId: null, quick: true, subject: '수학',
  action: '자가 확인', started: '2026-11-08T12:55:00+09:00',
  ended: submittedAt, seconds: 300, target: 5, problems: 1,
  concepts: '', rating: '보통', reason: '', pauses: [], mistake: '', reviewDate: null,
  workspace: { problem: '어제 작성한 수학 문제', source: '',
    attempts: [{
      id: 'original-answer', answer: '내가 어제 작성한 답',
      submittedAt, checkedAt, selfCheck: 'retry',
    }],
  },
};

describe('review after explicit delayed self-check', () => {
  it('uses the day of the human confirmation rather than silently changing the answer submission date', () => {
    const state = stateSchema.parse({ ...newState(), sessions: [session] });
    expect(state.sessions[0].workspace?.attempts[0].submittedAt).toBe(submittedAt);
    expect(state.sessions[0].workspace?.attempts[0].checkedAt).toBe(checkedAt);
    const queue = buildProblemReviews(state, '2026-11-09');
    expect(queue.today).toHaveLength(0);
    expect(queue.upcoming).toHaveLength(1);
    expect(queue.upcoming[0].due).toBe('2026-11-10');
    expect(firstDueReview(state, '2026-11-09')).toBeNull();
    expect(firstUpcomingCheckedReview(state, '2026-11-09')?.due).toBe('2026-11-10');
  });
  it('uses the same optional field for a directly checked correct answer (three day cadence)', () => {
    const revised = { ...session, workspace: {
      ...session.workspace!, attempts: [{ ...session.workspace!.attempts[0], selfCheck: 'remembered' as const }],
    } };
    const state = stateSchema.parse({ ...newState(), sessions: [revised] });
    expect(buildProblemReviews(state, '2026-11-09').upcoming[0].due).toBe('2026-11-12');
  });
  it('continues to accept older stored attempts with no check timestamp', () => {
    const legacy = { ...session, workspace: {
      ...session.workspace!, attempts: [{ ...session.workspace!.attempts[0], checkedAt: undefined }],
    } };
    const state = stateSchema.parse({ ...newState(), sessions: [legacy] });
    expect(buildProblemReviews(state, '2026-11-09').today).toHaveLength(1);
  });
});
