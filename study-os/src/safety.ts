import type { State } from './model';
import { fixedForDay, overlap } from './engine';
import { dayKey, addDays } from './time';
import { closeSegment } from './session';
import { iso } from './time';

/** Enforce protected periods in event handlers as well as periodic UI ticks. */
export function settleProtectedStudy(
  state: State,
  wallTime: number,
  studyTime = wallTime,
  extraFixed: { start: number; end: number; title: string }[] = [],
): State {
  const active = state.active;
  if (!active?.segmentStart) return state;
  const offset = studyTime - wallTime;
  const boundary = protectedBoundary(state, Date.parse(active.segmentStart) - offset, wallTime, extraFixed);
  if (!boundary) return state;
  const timestamp = boundary.at + offset;
  return {
    ...state,
    active: {
      ...closeSegment(active, timestamp),
      pauses: active.pauses.length < 100
        ? [...active.pauses, { at: iso(timestamp), reason: boundary.title + ' 시작 · 자동 일시정지' }]
        : active.pauses,
    },
  };
}
export function protectedBoundary(
  s: State,
  start: number,
  now: number,
  extraFixed: { start: number; end: number; title: string }[] = [],
) {
  const blocks = [
    ...fixedForDay(s, dayKey(start)),
    ...fixedForDay(s, addDays(dayKey(start), 1)),
    ...extraFixed,
  ];
  return blocks
    .filter((b) => b.end > start && b.start <= now)
    .map((b) => ({ at: Math.max(start, b.start), title: b.title }))
    .sort((a, b) => a.at - b.at)[0];
}
export function fixedConflicts(s: State, day: string) {
  const f = fixedForDay(s, day),
    out: string[] = [];
  for (let i = 0; i < f.length; i++)
    for (let j = i + 1; j < f.length; j++)
      if (overlap(f[i], f[j])) out.push(`${f[i].title} ↔ ${f[j].title}`);
  return [...new Set(out)];
}
