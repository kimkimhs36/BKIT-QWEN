import { type State, type Session } from './model';
import { dayKey, at, addDays, iso } from './time';
export const elapsed = (a: NonNullable<State['active']>, now: number) =>
  a.elapsed + (a.segmentStart ? Math.max(0, (now - +new Date(a.segmentStart)) / 1000) : 0);
export function studySeconds(sessions: Session[], day: string) {
  const start = at(day, '00:00'),
    end = at(addDays(day, 1), '00:00');
  return sessions.reduce((sum, s) => {
    if (s.segments)
      return (
        sum +
        s.segments.reduce(
          (n, v) =>
            n +
            Math.max(0, Math.min(+new Date(v.end), end) - Math.max(+new Date(v.start), start)) /
              1000,
          0,
        )
      );
    const a = +new Date(s.started),
      b = +new Date(s.ended),
      duration = Math.max(1, b - a),
      shared = Math.max(0, Math.min(b, end) - Math.max(a, start));
    return sum + (s.seconds * shared) / duration;
  }, 0);
}
export function todayOutput(sessions: Session[], now: number) {
  return sessions
    .filter((s) => dayKey(s.ended) === dayKey(now))
    .reduce((n, s) => n + s.problems, 0);
}
// A suspended browser can resume late; cap the timer at the first protected period.

export function closeSegment(a: NonNullable<State['active']>, now: number) {
  return {
    ...a,
    elapsed: elapsed(a, now),
    segmentStart: null,
    segments:
      a.segments === undefined
        ? undefined
        : [
            ...a.segments,
            ...(a.segmentStart && now > +new Date(a.segmentStart)
              ? [{ start: a.segmentStart, end: iso(now) }]
              : []),
          ],
  };
}
