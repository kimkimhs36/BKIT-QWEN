import { describe, it, expect } from 'vitest';
import { newState, stateSchema, type Task, type Session } from '../src/model';
import { firstLearningAction, rankInstantTasks, appendLearningEvent } from '../src/now';
import { buildProblemReviews, addProblemRetest, reviewInterval } from '../src/problemReview';
import { weeklyLearningEvidence } from '../src/learningEvidence';
import { parseCapture } from '../src/capture';
import { at, iso } from '../src/time';
const now = at('2026-10-19', '16:00');
const task: Task = {
  id: 't1',
  subject: '수학',
  title: '학습지',
  kind: '숙제',
  due: null,
  minutes: 25,
  remaining: 25,
  priority: 2,
  status: 'todo',
  submitted: false,
  optional: false,
  notes: '',
  link: '',
  attachmentIds: ['original-photo'],
};
const attempt = {
  id: 'a1',
  answer: '내 풀이',
  submittedAt: iso(now),
  selfCheck: 'retry' as const,
  hintUsed: false,
  confidence: 'low' as const,
  errorTag: 'unit' as const,
};
const session: Session = {
  id: 's1',
  taskId: 't1',
  subject: '수학',
  action: '학습지',
  started: iso(now - 300000),
  ended: iso(now),
  target: 5,
  seconds: 300,
  problems: 1,
  concepts: '',
  rating: '보통',
  reason: '',
  pauses: [],
  mistake: '',
  reviewDate: null,
  workspace: {
    problem: '압력과 부피의 관계?',
    source: '직접 등록한 화학 학습지',
    attempts: [attempt],
  },
};
describe('local learning loop', () => {
  it('preserves task, photo refs, sessions, submission and old backups on additive roundtrip', () => {
    const s = newState();
    s.tasks = [task];
    s.sessions = [session];
    const restored = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(restored.tasks).toEqual([task]);
    expect(restored.sessions).toEqual([session]);
    expect(restored.problemRetests).toBeUndefined();
    expect(restored.learningEvents).toBeUndefined();
  });
  it('recommends an actual action without inventing a problem number', () => {
    expect(
      firstLearningAction({ ...task, quantity: { unit: 'problems', total: 20, remaining: 14 } }),
    ).toContain('남은 14문제 중 하나');
    expect(firstLearningAction(task)).not.toContain('1번');
    expect(
      rankInstantTasks(
        [task, { ...task, id: 'done', status: 'done' }, { ...task, id: 'urgent', due: iso(now) }],
        now,
        5,
      )[0].id,
    ).toBe('urgent');
  });
  it('logs first attempts once and never interprets starting the timer as an answer', () => {
    const event = {
      id: 'event1',
      type: 'StudyStarted' as const,
      at: iso(now),
      foregroundAt: iso(now - 10000),
      taskId: task.id,
      sessionId: 's1',
      action: '한 문제',
    };
    let s = appendLearningEvent(newState(), event);
    expect(weeklyLearningEvidence(s, '2026-10-19').attempts).toBe(0);
    s = appendLearningEvent(s, {
      ...event,
      id: 'first',
      type: 'FirstLearningAttempt',
      at: iso(now + 30000),
    });
    s = appendLearningEvent(s, {
      ...event,
      id: 'duplicate',
      type: 'FirstLearningAttempt',
      at: iso(now + 60000),
    });
    expect(s.learningEvents).toHaveLength(2);
    expect(weeklyLearningEvidence(s, '2026-10-19')).toMatchObject({
      starts: 1,
      firstActionSamples: 1,
      medianSeconds: 40,
    });
  });
  it('schedules errors tomorrow, independent answers later, keeps unanswered reviews visible', () => {
    const s = { ...newState(), sessions: [session] };
    expect(buildProblemReviews(s, '2026-10-19').upcoming[0].due).toBe('2026-10-20');
    expect(reviewInterval({ ...attempt, selfCheck: 'remembered', confidence: 'high' })).toBe(3);
    expect(
      reviewInterval({ ...attempt, selfCheck: 'remembered', confidence: 'high', hintUsed: true }),
    ).toBe(1);
    expect(addProblemRetest(s, 's1', { ...attempt, id: 'r1' }, now)).toBe(s);
    const retested = addProblemRetest(
      s,
      's1',
      { ...attempt, id: 'r1', selfCheck: 'unreviewed', submittedAt: iso(now + 86400000) },
      now + 86400000,
    );
    expect(retested.problemRetests).toHaveLength(1);
    expect(buildProblemReviews(retested, '2026-10-21').today[0].last.answer).toBe('내 풀이');
    expect(addProblemRetest(retested, 's1', { ...attempt, id: 'r2' }, now + 86400000)).toBe(
      retested,
    );
    expect(stateSchema.parse(retested).sessions[0]).toEqual(session);
  });
  it('counts delayed independent self-checks, never old unknown hint evidence as independent', () => {
    const s = {
      ...newState(),
      sessions: [session],
      problemRetests: [
        {
          ...attempt,
          id: 'r1',
          sessionId: 's1',
          selfCheck: 'remembered' as const,
          submittedAt: iso(now + 86400000),
        },
      ],
    };
    expect(weeklyLearningEvidence(s, '2026-10-20')).toMatchObject({
      attempts: 2,
      delayedTotal: 1,
      delayedConfirmed: 1,
      confirmed: 1,
    });
    delete (s.sessions[0].workspace!.attempts[0] as Partial<typeof attempt>).hintUsed;
    expect(weeklyLearningEvidence(s, '2026-10-20').independent).toBe(1);
  });
  it('captures all requested examples and does not turn a deadline minute into duration', () => {
    expect(parseCapture('물리 오답 5개 다시 풀기', now)).toMatchObject({
      subject: '물리',
      quantityUnit: 'problems',
      quantityTotal: 5,
      due: '',
    });
    expect(parseCapture('내일까지 수학 학원 숙제 20문제', now)).toMatchObject({
      quantityTotal: 20,
      precision: 'date-only',
      due: '2026-10-20',
    });
    expect(parseCapture('다음 주 금요일 경제 수행평가 제출', at('2026-10-18', '16:00')).due).toBe(
      '2026-10-23',
    );
    expect(parseCapture('내일 오후 4시 30분까지 제출', now)).toMatchObject({
      dueTime: '16:30',
      minutes: 25,
      estimateSource: 'default',
    });
  });
});

describe('capture confirmation and submission intent', () => {
  it('distinguishes an explicit assignment from private recall without inventing a deadline', async () => {
    const { needsSubmission } = await import('../src/tasks');
    expect(parseCapture('금요일 경제 수행평가 제출', now).submissionRequired).toBe(true);
    expect(parseCapture('영어 지문 3개 외우기', now)).toMatchObject({
      submissionRequired: false,
      due: '',
    });
    expect(needsSubmission({ ...task, status: 'done', submissionRequired: false })).toBe(false);
    expect(needsSubmission({ ...task, status: 'done' })).toBe(true);
  });
});

describe('bounded telemetry preserves evidence', () => {
  it('stops adding events at capacity without pruning any recorded event', () => {
    const s = newState();
    s.learningEvents = Array.from({ length: 5000 }, (_, i) => ({
      id: String(i),
      type: 'RecommendationShown' as const,
      at: iso(now),
      foregroundAt: iso(now),
      taskId: null,
      sessionId: null,
      action: '질문 하나',
    }));
    const next = appendLearningEvent(s, { ...s.learningEvents[0], id: 'new' });
    expect(next).toBe(s);
    expect(next.learningEvents).toHaveLength(5000);
    expect(next.learningEvents?.[0].id).toBe('0');
  });
});

describe('error closure requires delayed evidence', () => {
  it('still schedules tomorrow after an immediate successful retry, then expands and resets after another error', () => {
    const s = newState();
    s.sessions = [
      {
        ...session,
        workspace: {
          ...session.workspace!,
          attempts: [
            attempt,
            {
              ...attempt,
              id: 'immediate',
              selfCheck: 'remembered',
              confidence: 'high',
              submittedAt: iso(now + 60000),
            },
          ],
        },
      },
    ];
    expect(buildProblemReviews(s, '2026-10-19').upcoming[0].due).toBe('2026-10-20');
    s.problemRetests = [
      {
        ...attempt,
        id: 'r1',
        sessionId: 's1',
        selfCheck: 'remembered',
        confidence: 'high',
        submittedAt: iso(now + 86400000),
      },
    ];
    expect(buildProblemReviews(s, '2026-10-20').upcoming[0].due).toBe('2026-10-23');
    s.problemRetests.push({
      ...attempt,
      id: 'r2',
      sessionId: 's1',
      submittedAt: iso(now + 4 * 86400000),
    });
    expect(buildProblemReviews(s, '2026-10-23').upcoming[0].due).toBe('2026-10-24');
    s.problemRetests.push({
      ...attempt,
      id: 'r3',
      sessionId: 's1',
      selfCheck: 'remembered',
      confidence: 'high',
      submittedAt: iso(now + 5 * 86400000),
    });
    expect(buildProblemReviews(s, '2026-10-24').upcoming[0].due).toBe('2026-10-27');
  });
});

describe('zero remaining quantity is a confirmation task', () => {
  it('never invents another problem when the learner has reported zero remaining', () => {
    const zero = { ...task, quantity: { unit: 'problems' as const, total: 20, remaining: 0 } };
    expect(firstLearningAction(zero)).toContain('학습 완료와 제출 여부');
    expect(rankInstantTasks([zero], now, 5)).toEqual([]);
    expect(zero.status).toBe('todo');
    expect(zero.submitted).toBe(false);
  });
});
