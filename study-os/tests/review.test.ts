import { describe, expect, it } from 'vitest';
import { newState, stateSchema, type Session } from '../src/model';
import { buildReviewQueue, recordReviewOutcome } from '../src/review';
import { at, iso } from '../src/time';

const session: Session = {
  id: 'review-example', taskId: null, subject: '수학', action: '극한 한 문제 풀기',
  started: iso(at('2026-10-12', '20:00')),
  ended: iso(at('2026-10-12', '20:05')),
  seconds: 300, target: 5, problems: 1, concepts: '극한',
  rating: '어려움', reason: '', pauses: [], mistake: '좌극한 부호 판단',
  reviewDate: '2026-10-13',
};

describe('offline three-step self-review', () => {
  it('can load legacy backups with no reviewProgress', () => {
    const legacy = { ...newState(), sessions: [session] };
    delete (legacy as Partial<typeof legacy>).reviewProgress;
    const loaded = stateSchema.parse(legacy);
    expect(buildReviewQueue(loaded, '2026-10-12').due).toHaveLength(0);
    expect(buildReviewQueue(loaded, '2026-10-13').due).toHaveLength(1);
  });

  it('schedules 3 then 7 days after success, and archives after 3 successes', () => {
    let state = { ...newState(), sessions: [session] };
    state = recordReviewOutcome(state, session.id, 'remembered', at('2026-10-13', '11:00'));
    expect(state.reviewProgress?.[0]).toMatchObject({ stage: 1, due: '2026-10-16' });
    expect(buildReviewQueue(state, '2026-10-15').due).toHaveLength(0);
    state = recordReviewOutcome(state, session.id, 'remembered', at('2026-10-16', '11:00'));
    expect(state.reviewProgress?.[0]).toMatchObject({ stage: 2, due: '2026-10-23' });
    state = recordReviewOutcome(state, session.id, 'remembered', at('2026-10-23', '11:00'));
    expect(state.reviewsDone).toEqual([session.id]);
    expect(buildReviewQueue(state, '2026-10-24').due).toHaveLength(0);
    expect(stateSchema.parse(state).reviewsDone).toEqual([session.id]);
  });

  it('retries next day after difficulty and resets stage', () => {
    let state = { ...newState(), sessions: [session] };
    state = recordReviewOutcome(state, session.id, 'remembered', at('2026-10-13', '11:00'));
    state = recordReviewOutcome(state, session.id, 'retry', at('2026-10-16', '11:00'));
    expect(state.reviewProgress?.[0]).toMatchObject({ stage: 0, due: '2026-10-17' });
    expect(state.reviewsDone).toHaveLength(0);
  });

  it('cannot mark not-yet-due review completed', () => {
    const state = { ...newState(), sessions: [session] };
    expect(recordReviewOutcome(state, session.id, 'remembered', at('2026-10-12', '11:00'))).toBe(state);
  });
});
