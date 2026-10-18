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
  it('preserves a study task, in-progress session and old namespace across backup and restart', () => {
    const store = memory();
    store.setItem('crashweek.v3', 'do-not-delete');
    const s = newState();
    s.tasks.push({
      id: 'homework',
      subject: '수학',
      title: '극한 학습지 1번',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 15,
      status: 'doing',
      submitted: false,
      optional: false,
      notes: '기존 메모',
      link: '',
    });
    s.active = {
      id: 'active',
      taskId: 'homework',
      subject: '수학',
      action: '극한 학습지 1번',
      target: 25,
      started: iso(at('2026-10-15', '15:00')),
      segmentStart: null,
      elapsed: 300,
      pauses: [],
    };
    s.reviewProgress = [
      {
        sessionId: 'old-session',
        stage: 1,
        due: '2026-10-17',
        updatedAt: iso(at('2026-10-15', '15:01')),
      },
    ];
    writeState(store, s);
    const raw = store.getItem(KEY)!;
    expect(readState(store).state).toEqual(s);
    expect(parseBackup(raw)).toEqual(s);
    expect(store.getItem(KEY)).toBe(raw);
    expect(store.getItem('crashweek.v3')).toBe('do-not-delete');
    const legacy = JSON.parse(raw);
    delete legacy.reviewProgress;
    expect(parseBackup(JSON.stringify(legacy)).reviewProgress).toBeUndefined();
    expect(store.getItem(KEY)).toBe(raw);
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

describe('learning upgrade preservation and concurrent writes', () => {
  it('backs up exact original bytes once before writing additive learning data', async () => {
    const { LEARNING_BACKUP_KEY } = await import('../src/storage');
    const store = memory(),
      legacy = JSON.stringify(newState(), null, 2);
    store.setItem(KEY, legacy);
    const s = newState();
    s.learningEvents = [];
    writeState(store, s, legacy);
    expect(store.getItem(LEARNING_BACKUP_KEY)).toBe(legacy);
    const raw = store.getItem(KEY)!;
    s.settings.goal = '다음 목표';
    writeState(store, s, raw);
    expect(store.getItem(LEARNING_BACKUP_KEY)).toBe(legacy);
    expect(parseBackup(store.getItem(LEARNING_BACKUP_KEY)!)).toEqual(newState());
  });
  it('rejects a stale tab even before the storage event is delivered', () => {
    const store = memory(),
      legacy = JSON.stringify(newState());
    store.setItem(KEY, legacy);
    const remote = { ...newState(), revision: 2 };
    const newer = JSON.stringify(remote);
    store.setItem(KEY, newer);
    expect(() => writeState(store, newState(), legacy)).toThrow('다른 탭');
    expect(store.getItem(KEY)).toBe(newer);
  });
  it('cannot replace original data when the safety backup write fails', () => {
    const legacy = JSON.stringify(newState());
    let value = legacy;
    const store = {
      getItem: (key: string) => (key === KEY ? value : null),
      setItem: (key: string, v: string) => {
        if (key !== KEY) throw new DOMException('full', 'QuotaExceededError');
        value = v;
      },
    };
    expect(() => writeState(store, { ...newState(), revision: 1 }, legacy)).toThrow();
    expect(value).toBe(legacy);
  });
});

describe('explicit restore recovery', () => {
  it('keeps the latest exact original separately from the initial upgrade backup', () => {
    const store = memory(),
      original = JSON.stringify({ ...newState(), revision: 17 }, null, 2);
    store.setItem(KEY, original);
    store.setItem(KEY + '.before-learning-v3', 'older-checkpoint');
    writeState(store, newState(), undefined, KEY + '.before-restore.test');
    expect(store.getItem(KEY + '.before-restore.test')).toBe(original);
    expect(store.getItem(KEY + '.before-learning-v3')).toBe('older-checkpoint');
    expect(parseBackup(store.getItem(KEY + '.before-restore.test')!).revision).toBe(17);
  });
});
