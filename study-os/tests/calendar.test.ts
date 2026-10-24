import { describe, expect, it } from 'vitest';
import { entriesForDay, monthDays, shiftMonth, weekDays } from '../src/calendar';
import { newState, scheduleSchema, taskSchema } from '../src/model';
import { changeOccurrence } from '../src/scheduleOccurrence';

describe('calendar dates and preserved learner records', () => {
  it('clamps month navigation through February and year boundaries without skipping months', () => {
    expect(shiftMonth('2028-01-31', 1)).toBe('2028-02-29');
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-31');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-31');
    expect(monthDays('2026-11-01')).toHaveLength(42);
    expect(weekDays('2026-11-01')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });
  it('shows an untimed deadline as a date, never the internal scheduling boundary', () => {
    const s = newState();
    s.tasks = [
      taskSchema.parse({
        id: 't',
        subject: '수학',
        title: '학습지',
        kind: '숙제',
        due: '2026-10-25T14:59:00Z',
        deadline: { date: '2026-10-25', precision: 'date-only', provenance: 'explicit' },
        priority: 2,
        minutes: 25,
        remaining: 25,
        status: 'todo',
        submitted: false,
        optional: false,
        notes: '',
        link: '',
      }),
    ];
    const before = JSON.stringify(s);
    expect(entriesForDay(s, '2026-10-25')[0]).toMatchObject({
      kind: 'homework',
      time: '날짜 마감 · 시각 미확인',
      sort: '',
    });
    expect(entriesForDay(s, '2026-10-24')).toEqual([]);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('a one-day replacement appears once, with the original still on the following week', () => {
    const s = newState();
    const original = scheduleSchema.parse({
      id: 'weekly',
      title: '수학',
      subject: '수학',
      kind: 'school',
      days: [1],
      date: null,
      start: '09:00',
      end: '09:50',
      prep: 0,
      travel: 0,
      buffer: 0,
      materials: '',
      excluded: [],
    });
    s.schedules = [original];
    const changed = changeOccurrence(s, original, '2026-10-26', {
      ...original,
      id: 'exception',
      start: '10:00',
      end: '10:50',
    });
    expect(entriesForDay(changed, '2026-10-26').map((e) => e.time)).toEqual(['10:00–10:50']);
    expect(entriesForDay(changed, '2026-11-02').map((e) => e.time)).toEqual(['09:00–09:50']);
  });
});
