import { type State, type Session } from './model';
import { dayKey, at, addDays, iso } from './time';
export const elapsed = (a: NonNullable<State['active']>, now: number) => {
  const seconds =
    a.elapsed + (a.segmentStart ? Math.max(0, (now - +new Date(a.segmentStart)) / 1000) : 0);
  return a.exam ? Math.min(a.exam.duration, seconds) : seconds;
};
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
  // A tap after the deadline can arrive before the next UI tick. Close the shared
  // segment at the exam boundary too, so recorded spans still equal the clock.
  const end =
    a.exam && a.segmentStart
      ? Math.min(now, +new Date(a.segmentStart) + Math.max(0, a.exam.duration - a.elapsed) * 1000)
      : now;
  return {
    ...a,
    elapsed: elapsed(a, end),
    segmentStart: null,
    segments:
      a.segments === undefined
        ? undefined
        : [
            ...a.segments,
            ...(a.segmentStart && end > +new Date(a.segmentStart)
              ? [{ start: a.segmentStart, end: iso(end) }]
              : []),
          ],
  };
}
