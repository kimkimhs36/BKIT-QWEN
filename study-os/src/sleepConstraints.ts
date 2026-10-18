import { fixedForDay, type Fixed } from './engine';
import { sleepWindow, type SleepState } from './sleep';
import { dayKey } from './time';

/** Additional constraints only: never change the learner's saved lifestyle or classes. */
export function sleepConstraints(state: SleepState, from: number, until: number): Fixed[] {
  if (!state.enabled || !Number.isFinite(from) || !Number.isFinite(until) || until < from)
    return [];
  const result: Fixed[] = [];
  let cursor = from;
  for (let i = 0; i < 512; i++) {
    const w = sleepWindow(cursor, state.schedule);
    if (w.bed > until) break;
    const start = Math.max(w.bed, state.pausedUntil, state.protectionChangedAt ?? 0);
    if (!state.skipped.includes(w.key) && start < w.wake && w.wake > from)
      result.push({
        id: 'sleep-guard:' + w.key,
        title: 'Sleep Guard 취침',
        kind: 'sleep',
        start,
        end: w.wake,
        classStart: w.bed,
        depart: w.bed,
        arrive: w.bed,
        materials: '',
      });
    if (w.wake + 1 <= cursor) break;
    cursor = w.wake + 1;
  }
  return result;
}
export function studyFixedNow(
  state: Parameters<typeof fixedForDay>[0],
  sleep: SleepState,
  now: number,
): Fixed[] {
  return [...fixedForDay(state, dayKey(now)), ...sleepConstraints(sleep, now, now + 86400000)].sort(
    (a, b) => a.start - b.start,
  );
}
