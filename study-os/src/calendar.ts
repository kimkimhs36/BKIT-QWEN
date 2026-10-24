import type { Schedule, State, Task } from './model';
import { addDays, at, clock, dayKey, weekday } from './time';

export const calendarKinds = {
  school: { label: '학교', symbol: 'S' },
  academy: { label: '학원', symbol: 'A' },
  homework: { label: '과제', symbol: '✓' },
  assessment: { label: '수행평가', symbol: '◇' },
  study: { label: '공부 계획', symbol: '▶' },
  other: { label: '기타', symbol: '·' },
} as const;
export type CalendarKind = keyof typeof calendarKinds;
export type CalendarEntry = {
  id: string;
  title: string;
  kind: CalendarKind;
  time: string;
  sort: string;
  task?: Task;
  schedule?: Schedule;
  blockId?: string;
};
export function taskDay(task: Task) {
  return task.deadline?.date ?? (task.due ? dayKey(task.due) : '');
}
export function entriesForDay(state: State, day: string): CalendarEntry[] {
  const schedules: CalendarEntry[] = state.schedules
    .filter(
      (s) => (s.date ? s.date === day : s.days.includes(weekday(day))) && !s.excluded.includes(day),
    )
    .map((schedule) => ({
      id: 's:' + schedule.id,
      title: schedule.title,
      kind: schedule.kind === 'fixed' ? 'other' : schedule.kind,
      time: `${schedule.start}–${schedule.end}`,
      sort: schedule.start,
      schedule,
    }));
  const tasks: CalendarEntry[] = state.tasks
    .filter((t) => taskDay(t) === day)
    .map((task) => ({
      id: 't:' + task.id,
      title: task.title,
      kind:
        task.kind === '수행평가'
          ? 'assessment'
          : task.kind === '시험공부'
            ? 'study'
            : task.kind === '개인 일정'
              ? 'other'
              : 'homework',
      time:
        task.deadline?.precision === 'date-only'
          ? '날짜 마감 · 시각 미확인'
          : task.due
            ? clock(task.due) + ' 마감'
            : '시간 미정',
      sort: task.deadline?.precision === 'date-only' ? '' : task.due ? clock(task.due) : '',
      task,
    }));
  const blocks: CalendarEntry[] = state.plan
    .filter((b) => dayKey(b.start) === day)
    .flatMap((b) => {
      const task = state.tasks.find((t) => t.id === b.taskId && t.status !== 'done');
      return task
        ? [
            {
              id: 'b:' + b.id,
              title: task.title,
              kind: 'study' as const,
              time: `${clock(b.start)}–${clock(b.end)}`,
              sort: clock(b.start),
              task,
              blockId: b.id,
            },
          ]
        : [];
    });
  return [...schedules, ...tasks, ...blocks].sort(
    (a, b) => a.sort.localeCompare(b.sort) || a.title.localeCompare(b.title),
  );
}
export function monthDays(day: string) {
  const first = day.slice(0, 7) + '-01';
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const nextMonth = shiftMonth(first, 1);
  const last = Number(addDays(nextMonth, -1).slice(-2));
  const count = Math.ceil((((weekday(first) + 6) % 7) + last) / 7) * 7;
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}
export function weekDays(day: string) {
  const first = addDays(day, -((weekday(day) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}
export function shiftMonth(day: string, offset: number) {
  const date = new Date(at(day.slice(0, 7) + '-01', '12:00'));
  date.setUTCMonth(date.getUTCMonth() + offset);
  const first = dayKey(date);
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = Number(addDays(dayKey(next), -1).slice(-2));
  return first.slice(0, 7) + '-' + String(Math.min(Number(day.slice(-2)), last)).padStart(2, '0');
}
