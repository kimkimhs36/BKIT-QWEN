import { describe, expect, it } from 'vitest';
import { canStartSprint } from '../src/now';
import { MIN } from '../src/time';

describe('NOW / five-minute entry', () => {
  const now = Date.parse('2026-10-14T18:00:00+09:00');

  it('allows free study when no fixed event follows', () => {
    expect(canStartSprint(now, false, null)).toBe(true);
  });

  it('protects currently occupied time', () => {
    expect(canStartSprint(now, true, null)).toBe(false);
  });

  it('rejects a sprint when less than five minutes remain', () => {
    expect(canStartSprint(now, false, now + 4 * MIN + 59_000)).toBe(false);
  });

  it('allows exactly five minutes and refuses a longer sprint', () => {
    expect(canStartSprint(now, false, now + 5 * MIN)).toBe(true);
    expect(canStartSprint(now, false, now + 5 * MIN, 15)).toBe(false);
  });

  it('rejects invalid duration or time', () => {
    expect(canStartSprint(now, false, null, 0)).toBe(false);
    expect(canStartSprint(Number.NaN, false, null)).toBe(false);
  });
});
