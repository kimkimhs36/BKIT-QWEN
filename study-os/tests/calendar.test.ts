import { describe, it, expect } from 'vitest';
import { newState, stateSchema, scheduleSchema, taskSchema } from '../src/model';
import {
  entriesForDay,
  changeSchedule,
  cancelOccurrence,
  monthDays,
  shiftMonth,
  scheduleImpact,
} from '../src/calendar';
import { at, iso } from '../src/time';
const day = '2026-10-21';
const schedule = () =>
  scheduleSchema.parse({
    id: 'school',
    title: '수학',
    subject: '수학',
    kind: 'school',
    days: [3],
    start: '09:00',
    end: '09:50',
    prep: 0,
    travel: 0,
    buffer: 0,
    materials: '302호',
    date: null,
    excluded: [],
  });
describe('unified calendar, using existing v1 records', () => {
  it('renders recurring classes, deadline-only assessments and plans from one state', () => {
    const s = newState();
    s.schedules = [schedule()];
    s.tasks = [
      taskSchema.parse({
        id: 'report',
        subject: '과학',
        title: '탐구 보고서',
        kind: '수행평가',
        due: iso(at(day, '23:59')),
        deadline: { date: day, precision: 'date-only', provenance: 'user-confirmed' },
        priority: 2,
        minutes: 25,
        remaining: 25,
        status: 'done',
        submitted: false,
        optional: false,
        notes: '',
        link: '',
      }),
    ];
    const entries = entriesForDay(s, day);
    expect(entries).toHaveLength(2);
    expect(entries[0].start).toBe(at(day, '09:00'));
    expect(entries[1]).toMatchObject({
      kind: 'assessment',
      start: undefined,
      done: true,
      submitted: false,
    });
  });
  it('moves one occurrence atomically while preserving the recurring school timetable', () => {
    const s = newState(),
      original = schedule();
    s.schedules = [original];
    const changed = changeSchedule(
      s,
      { ...original, id: 'makeup', start: '11:00', end: '11:50' },
      original,
      day,
    );
    expect(stateSchema.parse(changed).version).toBe(1);
    expect(entriesForDay(changed, day).map((x) => x.start)).toEqual([at(day, '11:00')]);
    expect(entriesForDay(changed, '2026-10-28').map((x) => x.start)).toEqual([
      at('2026-10-28', '09:00'),
    ]);
    expect(original.excluded).toEqual([]);
    expect(s.schedules).toHaveLength(1);
  });
  it('rejects an exception on a day without a class or one already excluded', () => {
    const s = newState(),
      original = schedule();
    s.schedules = [original];
    expect(() => changeSchedule(s, { ...original, id: 'new' }, original, '2026-10-22')).toThrow();
    expect(() =>
      changeSchedule(s, { ...original, id: 'new' }, { ...original, excluded: [day] }, day),
    ).toThrow();
  });
  it('cancels one occurrence without removing the future series, and permits dated makeup classes', () => {
    const s = newState(),
      original = schedule();
    s.schedules = [original];
    const cancelled = cancelOccurrence(s, original, day);
    expect(entriesForDay(cancelled, day)).toEqual([]);
    expect(entriesForDay(cancelled, '2026-10-28')).toHaveLength(1);
    const makeup = changeSchedule(cancelled, {
      ...original,
      id: 'extra',
      date: '2026-10-22',
      days: [4],
    });
    expect(entriesForDay(makeup, '2026-10-22')).toHaveLength(1);
  });
  it('keeps a cancelled dated event and all tasks out of unrelated records', () => {
    const s = newState(),
      one = { ...schedule(), date: day };
    s.schedules = [one];
    const cancelled = cancelOccurrence(s, one, day);
    expect(cancelled.schedules).toHaveLength(0);
    expect(s.schedules).toHaveLength(1);
  });
  it('detects preparation and meal conflicts and preserves locked learning blocks', () => {
    const s = newState(),
      original = {
        ...schedule(),
        kind: 'academy' as const,
        start: '18:30',
        end: '20:00',
        travel: 30,
      };
    s.schedules = [original];
    const impact = scheduleImpact(s, at(day, '12:00'));
    expect(impact.conflicts.some((x) => x.includes('식사'))).toBe(true);
    expect(s.plan).toEqual([]);
  });
  it('checks far-future exceptional dates, not just the next week', () => {
    const s = newState();
    s.schedules = [{ ...schedule(), date: '2027-02-01', start: '06:00', end: '08:00' }];
    expect(
      scheduleImpact(s, at(day, '12:00'), [], '2027-02-01').conflicts.some((x) =>
        x.includes('수면'),
      ),
    ).toBe(true);
  });
  it('handles leap day and year boundaries with a bounded month grid', () => {
    expect(monthDays('2028-02-01')).toContain('2028-02-29');
    expect(monthDays('2028-02-01')).toHaveLength(42);
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01');
  });
});
