import { type State, type Session } from './model';
import { dayKey, at, addDays } from './time';
export const elapsed = (a: NonNullable<State['active']>, now: number) =>
  a.elapsed + (a.segmentStart ? Math.max(0, (now - +new Date(a.segmentStart)) / 1000) : 0);
export function studySeconds(sessions: Session[], day: string) {
  const start = at(day, '00:00'),
    end = at(addDays(day, 1), '00:00');
  return sessions.reduce((sum, s) => {
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
