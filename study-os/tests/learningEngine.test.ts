import { describe, it, expect } from 'vitest';
import { newState, stateSchema } from '../src/model';
import {
  addResource,
  learning,
  resourceProgress,
  moveProblem,
  recordResourceAttempt,
  checkResourceAttempt,
  buildResourceReviews,
  conceptEvidence,
} from '../src/learningEngine';
const now = Date.parse('2026-10-19T10:00:00Z');
function fixture() {
  let s = addResource(
    newState(),
    {
      title: '수학 20문제',
      subject: '수학',
      sourceType: 'academy-sheet',
      linkedTaskId: 'task',
      linkedMediaIds: ['old-photo'],
    },
    Array(20).fill(''),
    now,
  );
  s.tasks = [
    {
      id: 'task',
      title: '숙제',
      subject: '수학',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 30,
      remaining: 30,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
      quantity: { unit: 'problems', total: 20, remaining: 20 },
    },
  ];
  s.active = {
    id: 'session',
    taskId: 'task',
    resourceId: s.learning!.resources[0].id,
    subject: '수학',
    action: '숙제',
    target: 25,
    started: new Date(now).toISOString(),
    segmentStart: null,
    elapsed: 0,
    pauses: [],
  };
  return s;
}
describe('additive resource learning', () => {
  it('supports 1, 5 and 35 real question slots without invented bodies', () => {
    for (const n of [1, 5, 35]) {
      const s = addResource(
        newState(),
        {
          title: '학습지',
          subject: '수학',
          sourceType: 'school-worksheet',
          linkedTaskId: null,
          linkedMediaIds: [],
        },
        Array(n).fill(''),
      );
      expect(s.learning!.problems).toHaveLength(n);
      expect(s.learning!.problems.every((p) => p.body === '')).toBe(true);
      expect(s.learning!.problems.at(-1)!.ordinal).toBe(n);
    }
  });

  it('reads v3 without migrating IDs or photo references', () => {
    const old = newState();
    expect(stateSchema.parse(old)).toEqual(old);
    const s = fixture();
    expect(stateSchema.parse(s).learning?.resources[0].linkedMediaIds).toEqual(['old-photo']);
  });
  it('resumes at 9 after eight self-checked answers and never double counts', () => {
    let s = fixture();
    const r = s.learning!.resources[0],
      problems = s.learning!.problems;
    for (let i = 0; i < 8; i++) {
      s = {
        ...s,
        learning: {
          ...learning(s),
          problems: learning(s).problems.map((p) =>
            p.id === problems[i].id ? { ...p, draft: '내 답' } : p,
          ),
        },
      };
      s = recordResourceAttempt(s, problems[i].id, { hintUsed: false, confidence: 'high' }, now);
      const a = s.learning!.attempts.at(-1)!;
      s = checkResourceAttempt(s, a.id, i === 2 ? 'incorrect' : 'correct', 'calculation', now);
      s = checkResourceAttempt(s, a.id, 'correct', 'unknown', now);
      s = moveProblem(s, r.id, problems[i + 1].id, now);
    }
    s = stateSchema.parse(JSON.parse(JSON.stringify({ ...s, active: null })));
    expect(resourceProgress(learning(s), r.id)).toMatchObject({
      currentProblemId: problems[8].id,
      completedCount: 8,
      remainingCount: 12,
    });
    expect(s.tasks[0].quantity?.remaining).toBe(12);
    expect(s.learning!.attempts[2].selfCheck).toBe('incorrect');
  });
  it('keeps wrong attempts for tomorrow and separates evidence', () => {
    let s = fixture();
    const p = s.learning!.problems[0];
    s.learning!.problems[0] = { ...p, draft: '답', concept: '함수' };
    s = recordResourceAttempt(s, p.id, { hintUsed: false, confidence: 'low' }, now);
    expect(s.tasks[0].quantity?.remaining).toBe(20);
    s = checkResourceAttempt(s, s.learning!.attempts[0].id, 'incorrect', 'concept', now);
    expect(buildResourceReviews(s, '2026-10-19')[0].due).toBe('2026-10-20');
    expect(conceptEvidence(s)[0].inferred).toBe('추가 근거 필요');
  });
  it('rejects orphan records', () => {
    const s = fixture();
    s.learning!.problems[0].resourceId = 'missing';
    expect(stateSchema.safeParse(s).success).toBe(false);
  });
});
