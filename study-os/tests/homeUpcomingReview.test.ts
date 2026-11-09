import { describe, expect, it } from 'vitest';
import { newState, type Session, type State } from '../src/model';
import { firstUpcomingCheckedReview } from '../src/homeUpcomingReview';

const at = '2026-11-09T13:10:00+09:00';
const make = (selfCheck: 'remembered' | 'retry' | 'unreviewed', id = 'a1'): Session => ({
  id: 's1', taskId: null, quick: true, subject: '수학', action: '학생 선택 재풀이',
  started: '2026-11-09T13:00:00+09:00', ended: at,
  seconds: 120, target: 5, problems: 1, concepts: '',
  rating: '보통', reason: '', pauses: [], mistake: '', reviewDate: null,
  workspace: {
    problem: '수학 학습지 3쪽 4번', source: '',
    attempts: [{ id, answer: '나의 실제 풀이', submittedAt: at, selfCheck, hintUsed: false }],
  },
});
const state = (session: Session): State => ({ ...newState(), sessions: [session] });

describe('review handoff: actual checked answer to real home', () => {
  it('does not invent an upcoming review for an empty or active-only session', () => {
    expect(firstUpcomingCheckedReview(newState(), '2026-11-09')).toBeNull();
    const s = newState();
    s.active = { id:'a',taskId:null,subject:'수학',action:'공부',target:5,started:at,segmentStart:null,elapsed:0,pauses:[], workspace: make('remembered').workspace };
    expect(firstUpcomingCheckedReview(s,'2026-11-09')).toBeNull();
  });
  it('does not assign a review date until the learner self-checks', () => {
    expect(firstUpcomingCheckedReview(state(make('unreviewed')), '2026-11-09')).toBeNull();
  });
  it('returns the real next-day recommendation for a learner-confirmed retry', () => {
    expect(firstUpcomingCheckedReview(state(make('retry')), '2026-11-09')).toEqual({
      due: '2026-11-10', subject: '수학', problem: '수학 학습지 3쪽 4번', selfCheck: 'retry',
    });
  });
  it('returns a 3-day recommendation for learner-confirmed recall without hint', () => {
    expect(firstUpcomingCheckedReview(state(make('remembered')), '2026-11-09')?.due).toBe('2026-11-12');
  });
  it('stops saying upcoming when a review is already due or past due', () => {
    expect(firstUpcomingCheckedReview(state(make('retry')), '2026-11-10')).toBeNull();
    expect(firstUpcomingCheckedReview(state(make('retry')), '2026-11-11')).toBeNull();
  });
  it('never puts the stored answer into a homepage summary', () => {
    expect(JSON.stringify(firstUpcomingCheckedReview(state(make('remembered')), '2026-11-09')))
      .not.toContain('나의 실제 풀이');
  });
});
