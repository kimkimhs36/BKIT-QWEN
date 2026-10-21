import type { State, Schedule } from './model';
import { fixedForDay, overlap, recover, validateRecovery, type Fixed } from './engine';
import { addDays, at, dayKey, weekday } from './time';

export type CalendarEntry = {
  id: string;
  sourceId: string;
  day: string;
  title: string;
  subject: string;
  kind: 'school' | 'academy' | 'fixed' | 'task' | 'assessment' | 'study';
  start?: number;
  end?: number;
  done?: boolean;
  submitted?: boolean;
};
/** A projection of the existing v1 state, never another calendar store. */
export function entriesForDay(state: State, day: string): CalendarEntry[] {
  const entries: CalendarEntry[] = fixedForDay(state, day)
    .filter((e) => ['school', 'academy', 'fixed'].includes(e.kind) && dayKey(e.classStart) === day)
    .map((e) => ({
      id: `schedule:${e.id}:${day}`,
      sourceId: e.id,
      day,
      title: e.title,
      subject: state.schedules.find((s) => s.id === e.id)?.subject || '',
      kind: e.kind as 'school' | 'academy' | 'fixed',
      start: e.classStart,
      end: e.end,
    }));
  for (const task of state.tasks) {
    const dueDay = task.deadline?.date || (task.due ? dayKey(task.due) : null);
    if (dueDay !== day) continue;
    entries.push({
      id: `task:${task.id}`,
      sourceId: task.id,
      day,
      title: task.title,
      subject: task.subject,
      kind: task.kind === '수행평가' ? 'assessment' : 'task',
      start:
        task.deadline?.precision === 'date-only' || !task.due ? undefined : +new Date(task.due),
      done: task.status === 'done',
      submitted: task.submitted,
    });
  }
  for (const block of state.plan.filter((b) => dayKey(b.start) === day)) {
    const task = state.tasks.find((t) => t.id === block.taskId);
    if (task && task.status !== 'done')
      entries.push({
        id: `block:${block.id}`,
        sourceId: task.id,
        day,
        title: task.title,
        subject: task.subject,
        kind: 'study',
        start: +new Date(block.start),
        end: +new Date(block.end),
      });
  }
  return entries.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity));
}
export function monthDays(month: string) {
  const first = month.slice(0, 7) + '-01';
  const start = addDays(first, -((weekday(first) + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function shiftMonth(day: string, amount: number) {
  const date = new Date(at(day.slice(0, 7) + '-01', '12:00'));
  date.setUTCMonth(date.getUTCMonth() + amount);
  return dayKey(date);
}
/** One-day overrides remain compatible with old clients: exclude + dated replacement. */
export function changeSchedule(
  state: State,
  replacement: Schedule,
  original?: Schedule | null,
  exceptionDay?: string,
): State {
  if (original && !original.date && exceptionDay) {
    if (!original.days.includes(weekday(exceptionDay)) || original.excluded.includes(exceptionDay))
      throw new Error('이 날짜에는 변경할 반복 수업이 없어요. 보충수업은 새 일정으로 추가하세요.');
    if (replacement.id === original.id) throw new Error('하루 변경에는 새 일정 ID가 필요해요.');
    return {
      ...state,
      schedules: state.schedules
        .map((s) =>
          s.id === original.id
            ? { ...s, excluded: [...new Set([...s.excluded, exceptionDay])] }
            : s,
        )
        .concat({
          ...replacement,
          date: exceptionDay,
          days: [weekday(exceptionDay)],
          excluded: [],
        }),
    };
  }
  return {
    ...state,
    schedules: original
      ? state.schedules.map((s) => (s.id === original.id ? replacement : s))
      : [...state.schedules, replacement],
  };
}
export function cancelOccurrence(state: State, schedule: Schedule, day: string): State {
  if (schedule.date)
    return { ...state, schedules: state.schedules.filter((s) => s.id !== schedule.id) };
  if (!schedule.days.includes(weekday(day))) throw new Error('선택한 날짜의 수업이 아니에요.');
  return {
    ...state,
    schedules: state.schedules.map((s) =>
      s.id === schedule.id ? { ...s, excluded: [...new Set([...s.excluded, day])] } : s,
    ),
  };
}
export function scheduleImpact(
  state: State,
  now: number,
  extraFixed: Pick<Fixed, 'start' | 'end'>[] = [],
  referenceDay = dayKey(now),
) {
  const proposal = recover(state, now, extraFixed);
  const errors = validateRecovery(state, proposal, now, extraFixed);
  const conflicts: string[] = [];
  // Check the edited date as well as the coming week, including sleep, prep and meals.
  const days = new Set([
    referenceDay,
    ...Array.from({ length: 8 }, (_, i) => addDays(dayKey(now), i)),
  ]);
  for (const day of days) {
    const fixed = fixedForDay(state, day);
    for (let i = 0; i < fixed.length; i++)
      for (let j = i + 1; j < fixed.length; j++)
        if (
          overlap(fixed[i], fixed[j]) &&
          !(['sleep', 'meal'].includes(fixed[i].kind) && ['sleep', 'meal'].includes(fixed[j].kind))
        )
          conflicts.push(`${day} · ${fixed[i].title} ↔ ${fixed[j].title}`);
  }
  const affected = state.plan.filter(
    (b) =>
      +new Date(b.end) > now &&
      [...fixedForDay(state, dayKey(b.start)), ...extraFixed].some((f) =>
        overlap({ start: +new Date(b.start), end: +new Date(b.end) }, f),
      ),
  );
  return { proposal, errors: [...new Set(errors)], conflicts: [...new Set(conflicts)], affected };
}
