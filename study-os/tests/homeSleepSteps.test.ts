import { describe, expect, it } from 'vitest';
import { HOME_SLEEP_STEPS, readHomeSleepSteps, setHomeSleepStep } from '../src/homeSleepSteps';
import { CHECKS, defaultSleep, sleepSchema, sleepStatus, updateSleepRecord } from '../src/sleep';

describe('home bedtime preparation', () => {
  it('shows the exact existing Sleep Guard steps rather than mismatched labels', () => {
    expect(HOME_SLEEP_STEPS).toEqual(CHECKS.slice(0, 3));
  });
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


describe('home-to-Sleep-Guard record integration', () => {
  const at = new Date(2026, 10, 9, 22, 30).getTime();

  it('persists a home check in the canonical sleep record and reads it back', () => {
    const original = defaultSleep();
    const window = sleepStatus(at, original);
    const saved = updateSleepRecord(original, window, (record) => ({
      ...record,
      checks: setHomeSleepStep(record.checks, 1, true),
    }));
    const roundTrip = sleepSchema.parse(JSON.parse(JSON.stringify(saved)));
    expect(readHomeSleepSteps(roundTrip.records.find((record) => record.date === window.key)))
      .toEqual([false, true, false]);
    expect(original.records).toHaveLength(0);
    expect(roundTrip.records).toHaveLength(1);
  });

  it('preserves bedtime, wake, reflections and existing fourth check when updating home', () => {
    const original = defaultSleep();
    const window = sleepStatus(at, original);
    const withBedtime = updateSleepRecord(original, window, (record) => ({
      ...record,
      checks: [false, false, false, true],
      actualBed: new Date(window.bed + 60000).toISOString(),
      reflection: '직접 작성한 기록',
    }));
    const saved = updateSleepRecord(withBedtime, window, (record) => ({
      ...record,
      checks: setHomeSleepStep(record.checks, 0, true),
    }));
    expect(saved.records).toHaveLength(1);
    expect(saved.records[0].checks).toEqual([true, false, false, true]);
    expect(saved.records[0].actualBed).toEqual(withBedtime.records[0].actualBed);
    expect(saved.records[0].reflection).toBe('직접 작성한 기록');
    expect(sleepSchema.safeParse(saved).success).toBe(true);
  });

  it('does not modify an unrelated date record', () => {
    const original = defaultSleep();
    const first = sleepStatus(at, original);
    const previous = updateSleepRecord(original, first, (record) => ({
      ...record,
      reflection: '전날 기록',
    }));
    const later = sleepStatus(at + 86400000, previous);
    const saved = updateSleepRecord(previous, later, (record) => ({
      ...record,
      checks: setHomeSleepStep(record.checks, 2, true),
    }));
    expect(saved.records.find((record) => record.date === first.key)?.reflection).toBe('전날 기록');
    expect(saved.records).toHaveLength(2);
  });
});
