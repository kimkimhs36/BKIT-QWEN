import { expect, it } from 'vitest';
import { newState, scheduleSchema, stateSchema } from '../src/model';
import { changeOccurrence } from '../src/scheduleOccurrence';
import { fixedForDay } from '../src/engine';
it('one Friday changes/cancels without altering the recurring timetable or future Friday', () => {
  const state = newState();
  const original = scheduleSchema.parse({
    id: 'weekly',
    title: '수학',
    subject: '수학',
    kind: 'school',
    days: [5],
    date: null,
    start: '09:00',
    end: '09:50',
    prep: 0,
    travel: 0,
    buffer: 0,
    materials: '노트',
    excluded: [],
  });
  state.schedules = [original];
  const changed = stateSchema.parse(
    changeOccurrence(state, original, '2026-10-23', {
      ...original,
      id: 'one-day',
      start: '10:00',
      end: '10:50',
    }),
  );
  expect(changed.schedules[0]).toEqual({ ...original, excluded: ['2026-10-23'] });
  expect(
    fixedForDay(changed, '2026-10-23')
      .filter((f) => f.kind === 'school')
      .map((f) => f.id),
  ).toEqual(['one-day']);
  expect(
    fixedForDay(changed, '2026-10-30')
      .filter((f) => f.kind === 'school')
      .map((f) => f.id),
  ).toEqual(['weekly']);
  const cancelled = changeOccurrence(changed, changed.schedules[1], '2026-10-23');
  expect(fixedForDay(cancelled, '2026-10-23').filter((f) => f.kind === 'school')).toHaveLength(0);
  expect(cancelled.schedules).toHaveLength(2);
  expect(() => changeOccurrence(state, original, '2026-10-24')).toThrow();
});
