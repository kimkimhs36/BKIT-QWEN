import { describe, expect, it } from 'vitest';
import { readHomeSleepSteps, setHomeSleepStep } from '../src/homeSleepSteps';

describe('home bedtime preparation', () => {
  it('starts with unchecked steps without inventing bedtime records', () => {
    expect(readHomeSleepSteps()).toEqual([false, false, false]);
  });
  it('reflects the existing Sleep Guard record', () => {
    expect(readHomeSleepSteps({ checks: [true, false, true, false] })).toEqual([true, false, true]);
  });
  it('changes only the explicitly checked preparation step', () => {
    const original = [true, false, true, false];
    const next = setHomeSleepStep(original, 1, true);
    expect(next).toEqual([true, true, true, false]);
    expect(original).toEqual([true, false, true, false]);
  });
  it('does not silently set the fourth "actually in bed" check', () => {
    expect(setHomeSleepStep([false, false, false, false], 2, true)).toEqual([false, false, true, false]);
  });
  it('preserves a previously confirmed in-bed check when unchecking preparation', () => {
    expect(setHomeSleepStep([true, true, true, true], 0, false)).toEqual([false, true, true, true]);
  });
  it('will not accept an invalid home step index', () => {
    expect(setHomeSleepStep([true, false, false, false], 3 as 0, true)).toEqual([true, false, false, false]);
  });
});
