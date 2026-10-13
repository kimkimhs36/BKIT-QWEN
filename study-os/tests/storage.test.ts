import { describe, it, expect } from 'vitest';
import { KEY, readState, writeState, parseBackup, type StoragePort } from '../src/storage';
import { newState } from '../src/model';
import { elapsed, studySeconds, todayOutput } from '../src/session';
import { at, MIN, iso } from '../src/time';
const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
};
describe('durable data boundary', () => {
  it('persists records across app restart and keeps legacy data untouched', () => {
    const store = memory();
    store.setItem('crashweek.v3', 'legacy');
    const s = newState();
    s.settings.goal = '나의 목표';
    writeState(store, s);
    expect(readState(store).state.settings.goal).toBe('나의 목표');
    expect(store.getItem('crashweek.v3')).toBe('legacy');
  });
  it('preserves corrupt original without automatically overwriting', () => {
    const store = memory();
    store.setItem(KEY, 'invalid json');
    expect(readState(store).error).not.toBe('');
    expect(store.getItem(KEY)).toBe('invalid json');
  });
  it('surfaces quota failures and rejects incompatible imports', () => {
    const store: StoragePort = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => writeState(store, newState())).toThrow();
    expect(() => parseBackup('{"version":2}')).toThrow();
    expect(() => parseBackup('x'.repeat(5_000_001))).toThrow();
  });
  it('accepts valid export/import roundtrip', () => {
    expect(parseBackup(JSON.stringify(newState()))).toEqual(newState());
  });
  it('rejects impossible dates and submission before completion', () => {
    const s = newState();
    s.grades = [
      { id: 'g', subject: '수학', exam: '시험', date: '2026-02-30', target: null, score: null },
    ];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
  it('continues active elapsed time accurately after reload and excludes pauses', () => {
    const s = newState();
    s.active = {
      id: 'a',
      taskId: null,
      subject: '수학',
      action: '문제',
      target: 25,
      started: iso(at('2026-10-12', '15:00')),
      segmentStart: iso(at('2026-10-12', '15:10')),
      elapsed: 300,
      pauses: [],
    };
    const store = memory();
    writeState(store, s);
    expect(elapsed(readState(store).state.active!, at('2026-10-12', '15:15'))).toBe(600);
    s.active.segmentStart = null;
    expect(elapsed(s.active, at('2026-10-12', '19:00'))).toBe(300);
  });
  it('allocates midnight timer record to both dates without inventing output', () => {
    const session = {
      id: 'a',
      taskId: null,
      subject: '수학',
      action: '문제',
      started: iso(at('2026-10-12', '23:50')),
      ended: iso(at('2026-10-13', '00:10')),
      seconds: 20 * 60,
      target: 25,
      problems: 3,
      concepts: '',
      rating: '보통' as const,
      reason: '',
      pauses: [],
      mistake: '',
      reviewDate: null,
    };
    expect(studySeconds([session], '2026-10-12')).toBe(600);
    expect(studySeconds([session], '2026-10-13')).toBe(600);
    expect(todayOutput([session], at('2026-10-12', '23:55'))).toBe(0);
    expect(todayOutput([session], at('2026-10-13', '00:11'))).toBe(3);
  });
});
