import type { State } from './model';
import { fixedForDay, overlap } from './engine';
import { dayKey, addDays } from './time';
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
