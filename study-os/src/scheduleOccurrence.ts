import type { State, Schedule } from './model';
import { weekday } from './time';

/** Use the existing exclusion + dated-class representation, readable by old clients. */
export function changeOccurrence(
  state: State,
  original: Schedule,
  day: string,
  replacement?: Schedule,
): State {
  if (
    (original.date && original.date !== day) ||
    (!original.date && !original.days.includes(weekday(day))) ||
    original.excluded.includes(day)
  )
    throw new Error('선택한 날짜의 일정이 아니에요.');
  if (replacement && replacement.id === original.id)
    throw new Error('하루 변경에는 별도 일정 ID가 필요해요.');
  return {
    ...state,
    schedules: state.schedules
      .map((s) =>
        s.id === original.id
          ? {
              ...s,
              excluded: [...new Set([...s.excluded, day])],
            }
          : s,
      )
      .concat(
        replacement ? [{ ...replacement, date: day, days: [weekday(day)], excluded: [] }] : [],
      ),
    undo: null,
  };
}
