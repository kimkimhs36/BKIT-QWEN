import { describe, it, expect } from 'vitest';
import { newState } from '../src/model';
import { addResource } from '../src/learningEngine';
import { newGarage, rewardLearning, purchase, garageSchema } from '../src/drive/garage';
const t = Date.parse('2026-10-19T12:00:00Z');
function answered(count = 1) {
  const s = addResource(
    newState(),
    {
      title: '학습지',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    Array.from({ length: count }, (_, i) => '문제 ' + i),
  );
  s.learning!.attempts = s.learning!.problems.map((p, i) => ({
    id: 'a' + i,
    problemId: p.id,
    sessionId: 'focus',
    learnerAnswer: '내 풀이',
    fields: {},
    hintUsed: false,
    confidence: 'medium',
    selfCheck: 'incorrect',
    errorTag: 'concept',
    submittedAt: new Date(t + 1000).toISOString(),
    checkedAt: new Date(t + 2000).toISOString(),
  }));
  return s;
}
describe('local learning rewards', () => {
  it('never pays for an unattended timer or imported history, and leaves study bytes untouched', () => {
    const s = answered();
    const bytes = JSON.stringify(s);
    expect(rewardLearning(newGarage(t + 3000), s, t + 4000).credits).toBe(0);
    const empty = newState();
    empty.quickTimer = {
      id: 'idle',
      mode: 'stopwatch',
      targetMinutes: 480,
      started: new Date(t).toISOString(),
      segmentStart: new Date(t).toISOString(),
      elapsed: 0,
      segments: [],
    };
    expect(rewardLearning(newGarage(t), empty, t + 480 * 60000).credits).toBe(0);
    expect(JSON.stringify(s)).toBe(bytes);
  });
  it('pays checked effort including wrong answers once per problem across retests', () => {
    const s = answered();
    const first = rewardLearning(newGarage(t), s, t + 4000);
    expect(first.credits).toBe(5);
    s.learning!.attempts.push({ ...s.learning!.attempts[0], id: 'retry' });
    expect(rewardLearning(first, s, t + 5000).credits).toBe(5);
  });
  it('caps daily earnings, consumes capped events, and refuses backward clocks', () => {
    const s = answered(30);
    const g = rewardLearning(newGarage(t), s, t + 4000);
    expect(g.credits).toBe(100);
    expect(g.claimed).toHaveLength(30);
    expect(rewardLearning(g, s, t + 86400000).credits).toBe(100);
    expect(rewardLearning(g, s, t - 86400000)).toBe(g);
  });
  it('does not pay unreviewed or future answers', () => {
    const s = answered();
    s.learning!.attempts[0].selfCheck = 'unreviewed';
    expect(rewardLearning(newGarage(t), s, t + 4000).credits).toBe(0);
    s.learning!.attempts[0].selfCheck = 'correct';
    expect(rewardLearning(newGarage(t), s, t + 1000).credits).toBe(0);
  });
  it('requires sufficient credits, charges once, and validates part ownership', () => {
    const g = newGarage(t);
    expect(purchase(g, 'aero')).toBe(g);
    const unlocked = purchase({ ...g, credits: 20 }, 'aero');
    expect(unlocked.credits).toBe(5);
    expect(purchase(unlocked, 'aero')).toBe(unlocked);
    expect(garageSchema.safeParse({ ...g, car: { ...g.car, wheels: 'aero' } }).success).toBe(false);
  });
});
