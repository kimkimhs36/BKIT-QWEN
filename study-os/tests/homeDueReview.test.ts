import { describe, expect, it } from 'vitest';
import { newState, type Session } from '../src/model';
import { firstDueReview } from '../src/homeDueReview';

const ended = '2026-11-08T16:05:00+09:00';
const sample: Session = {
  id: 's1', taskId: null, subject: '수학', action: '도함수 부호',
  started: '2026-11-08T16:00:00+09:00', ended,
  seconds: 300, target: 5, problems: 1, concepts: '',
  rating: '어려움', reason: '', pauses: [], mistake: '부호를 반대로 판단함',
  reviewDate: '2026-11-09',
};
describe('one truthful home review action', () => {
  it('shows nothing if the student has not recorded a real error', () => {
    expect(firstDueReview(newState(), '2026-11-09')).toBeNull();
  });
  it('only recommends a review after it is due', () => {
    const state = { ...newState(), sessions: [sample] };
    expect(firstDueReview(state, '2026-11-08')).toBeNull();
    expect(firstDueReview(state, '2026-11-09')).toEqual({
      kind: 'session', subject: '수학', title: '도함수 부호', due: '2026-11-09',
    });
  });
  it('does not display the answer or mistake text in the home card', () => {
    const state = { ...newState(), sessions: [sample] };
    expect(JSON.stringify(firstDueReview(state, '2026-11-09'))).not.toContain('부호를 반대로');
  });
  it('does not fabricate a review after its user-confirmed completion', () => {
    const state = { ...newState(), sessions: [sample], reviewsDone: ['s1'] };
    expect(firstDueReview(state, '2026-11-09')).toBeNull();
  });
  it('does not call an unchecked saved answer a mistake or skip its self-check', () => {
    const s = { ...newState(), sessions: [{
      ...sample, mistake: '', reviewDate: null,
      workspace: { problem: '직접 확인하지 않은 풀이', source: '',
        attempts: [{ id: 'saved-answer', answer: '미확인 답안', submittedAt: ended,
          selfCheck: 'unreviewed' as const }] },
    }] };
    expect(firstDueReview(s, '2026-11-09')).toMatchObject({
      kind: 'problem', sessionId: 's1', needsCheck: true,
      title: '직접 확인하지 않은 풀이',
    });
    expect(JSON.stringify(firstDueReview(s, '2026-11-09'))).not.toContain('미확인 답안');
  });
  it('picks a due problem retest rather than a session prompt on the same day', () => {
    const state = { ...newState(), sessions: [
      sample,
      {
        ...sample, id: 's2', mistake: '', action: '개념 이해',
        workspace: {
          problem: '다음 함수를 미분해 봐', source: '학생 입력',
          attempts: [{ id:'a1', answer:'f(x)=x', submittedAt:ended, selfCheck:'retry' as const }],
        },
      },
    ] };
    expect(firstDueReview(state, '2026-11-09')).toEqual({
      kind: 'problem', sessionId: 's2', needsCheck: false, subject: '수학', title: '다음 함수를 미분해 봐', due: '2026-11-09',
    });
  });
});
