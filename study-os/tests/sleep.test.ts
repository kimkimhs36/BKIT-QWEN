import { describe, expect, it } from 'vitest';
import {
  defaultSleep,
  readSleep,
  SLEEP_KEY,
  sleepSchema,
  sleepStatus,
  sleepWindow,
  updateSleepRecord,
  sleepLocalInput,
  sleepFromInput,
} from '../src/sleep';
const at = (s: string) => +new Date(s);
describe('Sleep Guard calendar windows and privacy boundary', () => {
  it('prepares one hour before a bedtime across midnight and retains the same night after midnight', () => {
    const s = defaultSleep();
    s.enabled = true;
    s.schedule = s.schedule.map(() => ({ bed: '00:30', wake: '08:00' }));
    const before = sleepStatus(at('2026-10-18T23:45:00'), s);
    expect(before.key).toBe('2026-10-19');
    expect(before.phase).toBe('prepare');
    const night = sleepStatus(at('2026-10-19T01:00:00'), s);
    expect(night.key).toBe(before.key);
    expect(night.night).toBe(true);
    expect(night.wake - night.bed).toBe(7.5 * 3600000);
  });
  it('anchors the previous night until wake, then selects the next bedtime', () => {
    const s = defaultSleep();
    s.enabled = true;
    expect(sleepStatus(at('2026-10-19T06:59:00'), s).key).toBe('2026-10-18');
    expect(sleepStatus(at('2026-10-19T07:00:00'), s).key).toBe('2026-10-19');
    expect(sleepStatus(at('2026-10-19T07:00:00'), s).night).toBe(false);
  });
  it('supports per-day schedules, sleep past midnight, and daytime sleep', () => {
    const s = defaultSleep();
    s.enabled = true;
    s.schedule[1] = { bed: '01:00', wake: '09:00' };
    const monday = sleepStatus(at('2026-10-19T02:00:00'), s);
    expect(new Date(monday.bed).getHours()).toBe(1);
    s.schedule = s.schedule.map(() => ({ bed: '09:00', wake: '16:00' }));
    expect(sleepStatus(at('2026-10-19T12:00:00'), s).night).toBe(true);
  });
  it('never interrupts a study session or a disabled, skipped, paused, or dismissed night', () => {
    const s = defaultSleep();
    s.enabled = true;
    const now = at('2026-10-18T23:10:00');
    const key = sleepStatus(now, s).key;
    expect(sleepStatus(now, s, true).night).toBe(false);
    for (const patch of [
      { enabled: false },
      { skipped: [key] },
      { pausedUntil: now + 60000 },
      { dismissedNight: key },
    ])
      expect(sleepStatus(now, { ...s, ...patch }).night).toBe(false);
    expect(sleepStatus(now, { ...s, pausedUntil: now - 1 }).night).toBe(true);
  });
  it('freezes target times and keeps checks, actual timestamps and photo references after schedule edits', () => {
    let s = defaultSleep();
    const now = at('2026-10-18T22:15:00');
    const w = sleepWindow(now, s.schedule);
    s = updateSleepRecord(s, w, (r) => ({
      ...r,
      checks: [true, true, false, false],
      photoIds: ['device-only-id'],
    }));
    const original = s.records[0].targetBed;
    s.schedule = s.schedule.map(() => ({ bed: '23:30', wake: '08:00' }));
    s = updateSleepRecord(s, sleepWindow(now, s.schedule), (r) => ({
      ...r,
      reflection: '잘 쉬기',
    }));
    const restored = readSleep({
      getItem: (k) => (k === SLEEP_KEY ? JSON.stringify(s) : null),
    }).state;
    expect(restored.records).toHaveLength(1);
    expect(restored.records[0]).toMatchObject({
      targetBed: original,
      checks: [true, true, false, false],
      photoIds: ['device-only-id'],
      reflection: '잘 쉬기',
    });
  });
  it('keeps corrupt data intact and rejects invalid times, duplicate records and reversed actual times', () => {
    const corrupt = '{broken';
    const writes: string[] = [];
    const store = { getItem: () => corrupt, setItem: (_: string, v: string) => writes.push(v) };
    expect(readSleep(store).error).not.toBe('');
    expect(writes).toEqual([]);
    const s = defaultSleep();
    s.schedule[0].bed = '24:00';
    expect(sleepSchema.safeParse(s).success).toBe(false);
    const ok = defaultSleep();
    const w = sleepWindow(Date.now(), ok.schedule);
    const recorded = updateSleepRecord(ok, w, (r) => ({
      ...r,
      actualBed: '2026-10-19T01:00:00Z',
      actualWake: '2026-10-18T23:00:00Z',
    }));
    expect(sleepSchema.safeParse(recorded).success).toBe(false);
    expect(
      sleepSchema.safeParse({ ...recorded, records: [recorded.records[0], recorded.records[0]] })
        .success,
    ).toBe(false);
  });
  it('uses device local dates and reversible manual datetime inputs', () => {
    const instant = '2026-10-18T23:45:00.000Z';
    expect(sleepFromInput(sleepLocalInput(instant))).toBe(instant);
  });
});
