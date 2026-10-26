import { describe, it, expect } from 'vitest';
import { performance } from '../src/juggernaut/performance';
import { emptyDocument, DAY, type Attempt } from '../src/juggernaut/engine';
const at = Date.parse('2026-10-25T15:01:00Z');
const row = (patch: Partial<Attempt> = {}): Attempt => ({
  id: crypto.randomUUID(),
  sessionId: 'test',
  questionId: 'balance-0',
  answer: '2',
  reasoning: '검산',
  hints: 0,
  guessed: false,
  durationMs: 2000,
  at,
  updatedAt: at,
  kind: 'training',
  error: null,
  deleted: false,
  ...patch,
});
describe('evidence-only performance', () => {
  it('has no invented rate with no eligible observations', () => {
    expect(performance(emptyDocument())).toMatchObject({
      total: 0,
      independent: 0,
      eligible: 0,
      successful: 0,
      days: [],
    });
  });
  it('excludes early/same-item/deleted/future reviews and preserves Korea day boundaries', () => {
    const d = {
      ...emptyDocument(),
      attempts: [
        row(),
        row({ at: at + DAY / 2, kind: 'review', questionId: 'balance-1', answer: '-2' }),
        row({ at: at + 2 * DAY, kind: 'review', questionId: 'balance-1', answer: '-2' }),
        row({ at: at + 4 * DAY, kind: 'review', questionId: 'balance-2', answer: '4' }),
        row({
          deleted: true,
          at: at + 7 * DAY,
          kind: 'review',
          questionId: 'balance-3',
          answer: '-4',
        }),
        row({ at: at + 100 * DAY, kind: 'review' }),
      ],
    };
    const p = performance(d, at + 8 * DAY);
    expect(p).toMatchObject({ total: 4, independent: 4, eligible: 1, successful: 1 });
    expect(p.days[0][0]).toBe('2026-10-26');
  });
  it('counts hint/guess failures in eligible denominator and error frequencies, keeps source unchanged', () => {
    const d = {
      ...emptyDocument(),
      attempts: [
        row(),
        row({
          at: at + DAY,
          kind: 'review',
          questionId: 'balance-1',
          answer: '-2',
          hints: 1,
          error: 'C',
        }),
        row({
          at: at + 2 * DAY,
          kind: 'review',
          questionId: 'balance-2',
          answer: '4',
          guessed: true,
          error: 'G',
        }),
        row({ at: at + 3 * DAY, kind: 'review', questionId: 'balance-3', answer: '-4' }),
      ],
    };
    const before = JSON.stringify(d);
    expect(performance(d, at + 4 * DAY)).toMatchObject({
      total: 4,
      independent: 2,
      eligible: 3,
      successful: 1,
      errors: [
        { id: 'C', count: 1 },
        { id: 'G', count: 1 },
      ],
    });
    expect(JSON.stringify(d)).toBe(before);
  });
});
