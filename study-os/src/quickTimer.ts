import type { State, Session } from './model';
import { iso, dayKey } from './time';

/** Only an explicit tap starts timing. Wall-clock timestamps survive Safari suspension. */
export function quickSeconds(timer: NonNullable<State['quickTimer']>, now: number): number {
  return timer.elapsed + (timer.segmentStart ? Math.max(0, (now - Date.parse(timer.segmentStart)) / 1000) : 0);
}
export function quickClock(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds));
  const h = Math.floor(n / 3600);
  const m = String(Math.floor((n % 3600) / 60)).padStart(2, '0');
  const s = String(n % 60).padStart(2, '0');
  return h ? h + ':' + m + ':' + s : m + ':' + s;
}
export function startQuick(
  state: State,
  mode: 'stopwatch' | 'countdown',
  targetMinutes: number,
  now: number,
  id: string,
): State {
  if (state.active || state.quickTimer || !Number.isInteger(targetMinutes) ||
      targetMinutes < 1 || targetMinutes > 480) return state;
  const started = iso(now);
  return {
    ...state,
    quickTimer: { id, mode, targetMinutes, started, segmentStart: started, elapsed: 0, segments: [] },
  };
}
export function pauseQuick(state: State, now: number): State {
  const timer = state.quickTimer;
  if (!timer?.segmentStart) return state;
  const duration = Math.max(0, now - Date.parse(timer.segmentStart)) / 1000;
  const segment = duration > 0 ? [{ start: timer.segmentStart, end: iso(now) }] : [];
  return {
    ...state,
    quickTimer: {
      ...timer, segmentStart: null, elapsed: timer.elapsed + duration,
      segments: [...timer.segments, ...segment],
    },
  };
}
export function resumeQuick(state: State, now: number): State {
  const timer = state.quickTimer;
  if (!timer || timer.segmentStart) return state;
  return { ...state, quickTimer: { ...timer, segmentStart: iso(now) } };
}
/** Save the session *before* asking what was studied. Skipping the label loses nothing. */
export function finishQuick(state: State, now: number): State {
  const timer = state.quickTimer;
  if (!timer || state.sessions.length >= 5000) return state;
  const stopped = pauseQuick(state, now).quickTimer!;
  const seconds = stopped.segments.reduce(
    (sum, segment) => sum + (Date.parse(segment.end) - Date.parse(segment.start)) / 1000, 0,
  );
  const result: Session = {
    id: timer.id,
    quick: true,
    taskId: null,
    subject: '미분류',
    action: '바로 시작한 공부',
    started: timer.started,
    ended: iso(now),
    seconds,
    target: timer.targetMinutes,
    problems: 0,
    concepts: '',
    rating: '보통',
    reason: '',
    pauses: [],
    mistake: '',
    reviewDate: null,
    segments: stopped.segments,
  };
  return { ...state, quickTimer: null, sessions: [...state.sessions, result] };
}
export function labelQuick(
  state: State,
  id: string,
  subject: string,
  action: string,
  note: string,
): State {
  const current = state.sessions.find(s => s.id === id && s.quick);
  if (!current) return state;
  const nextSubject = subject.trim().slice(0, 200) || '미분류';
  const nextAction = action.trim().slice(0, 200) || '바로 시작한 공부';
  const nextNote = note.trim().slice(0, 200);
  return {
    ...state,
    sessions: state.sessions.map(s => s.id === id
      ? { ...s, subject: nextSubject, action: nextAction, concepts: nextNote }
      : s),
  };
}
export function quickDaySeconds(state: State, now: number): number {
  const day = dayKey(now);
  return state.sessions.filter(s => s.quick && dayKey(s.ended) === day)
    .reduce((sum, session) => sum + session.seconds, 0);
}
