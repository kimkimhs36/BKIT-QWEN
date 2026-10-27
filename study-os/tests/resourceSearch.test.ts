import { describe, expect, it } from 'vitest';
import { matchesResourceSearch } from '../src/resourceSearch';

describe('resource search', () => {
  it('finds subject aliases without modifying stored subject labels', () => {
    expect(matchesResourceSearch('수학', 'Math', '단원 학습지')).toBe(true);
    expect(matchesResourceSearch('english', '영어과', '독해')).toBe(true);
    expect(matchesResourceSearch('국어', '영어', '독해')).toBe(false);
  });
  it('finds titles and problem content case insensitively', () => {
    expect(matchesResourceSearch('reading', '영어', 'Reading worksheet')).toBe(true);
    expect(matchesResourceSearch('  ', '영어', '')).toBe(true);
  });
});
