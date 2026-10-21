import type { State, Session } from './model';
import { iso, dayKey } from './time';
import { studySeconds, closeSegment } from './session';
import { learning, moveProblem, resourceProgress } from './learningEngine';

/** Only an explicit tap starts timing. Wall-clock timestamps survive Safari suspension. */
export function quickSeconds(timer: NonNullable<State['quickTimer']>, now: number): number {
  return (
    timer.elapsed +
    (timer.segmentStart ? Math.max(0, (now - Date.parse(timer.segmentStart)) / 1000) : 0)
  );
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
  if (
    state.active ||
    state.quickTimer ||
    !Number.isInteger(targetMinutes) ||
    targetMinutes < 1 ||
    targetMinutes > 480
  )
    return state;
  const started = iso(now);
  return {
    ...state,
    quickTimer: {
      id,
      mode,
      targetMinutes,
      started,
      segmentStart: started,
      elapsed: 0,
      segments: [],
    },
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
      ...timer,
      segmentStart: null,
      elapsed: timer.elapsed + duration,
      segments: [...timer.segments, ...segment],
    },
  };
}
export function resumeQuick(state: State, now: number): State {
  const timer = state.quickTimer;
  if (!timer || timer.segmentStart || timer.segments.length >= 10000) return state;
  return { ...state, quickTimer: { ...timer, segmentStart: iso(now) } };
}
/** Save the session *before* asking what was studied. Skipping the label loses nothing. */
export function finishQuick(state: State, now: number): State {
  const timer = state.quickTimer;
  if (!timer || state.sessions.length >= 5000) return state;
  const stopped = pauseQuick(state, now).quickTimer!;
  const seconds = stopped.segments.reduce(
    (sum, segment) => sum + (Date.parse(segment.end) - Date.parse(segment.start)) / 1000,
    0,
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
    target:
      timer.mode === 'stopwatch'
        ? Math.max(1, Math.min(480, Math.ceil(seconds / 60)))
        : timer.targetMinutes,
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
  linkedTaskId?: string,
): State {
  const current = state.sessions.find((s) => s.id === id && s.quick);
  if (!current) return state;
  const task = linkedTaskId ? state.tasks.find((t) => t.id === linkedTaskId) : undefined;
  const nextSubject = subject.trim().slice(0, 200) || task?.subject || '미분류';
  const nextAction = action.trim().slice(0, 200) || task?.title || '바로 시작한 공부';
  const nextNote = note.trim().slice(0, 200);
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id
        ? {
            ...s,
            taskId: task?.id ?? (linkedTaskId === current.taskId ? current.taskId : null),
            subject: nextSubject,
            action: nextAction,
            concepts: nextNote,
          }
        : s,
    ),
  };
}
export function quickDaySeconds(state: State, now: number): number {
  // Existing study-time accounting splits sessions crossing midnight into the
  // correct local study day; quick sessions follow the same rule.
  return studySeconds(
    state.sessions.filter((session) => session.quick),
    dayKey(now),
  );
}

/** Carry the same wall-clock session into real material, without a second timer. */
export function attachQuickResource(state: State, resourceId: string, problemId?: string, now = Date.now()): State {
  const timer = state.quickTimer;
  const data = learning(state);
  const resource = data.resources.find((r) => r.id === resourceId && !r.archived);
  if (!timer || state.active || !resource) return state;
  const current = problemId ?? resourceProgress(data, resource.id).currentProblemId;
  if (!current || !data.problems.some((p) => p.id === current && p.resourceId === resource.id))
    return state;
  const moved = moveProblem(state, resource.id, current, now);
  return {
    ...moved,
    quickTimer: null,
    active: {
      id: timer.id,
      quick: true,
      quickMode: timer.mode,
      taskId: resource.linkedTaskId,
      resourceId,
      questionPace: { current, enteredAt: iso(now), anchor: quickSeconds(timer, now), seconds: {}, target: 240, review: [] },
      subject: resource.subject,
      action: resource.title,
      target: timer.targetMinutes,
      started: timer.started,
      segmentStart: timer.segmentStart,
      elapsed: timer.elapsed,
      segments: timer.segments,
      pauses: [],
    },
  };
}
/** Link an already running or paused stopwatch without resetting any elapsed time. */
export function attachQuickTask(state: State, taskId: string): State {
  const timer = state.quickTimer;
  const task = state.tasks.find((t) => t.id === taskId && t.status !== 'done');
  if (!timer || state.active || !task) return state;
  return {
    ...state,
    quickTimer: null,
    active: {
      id: timer.id,
      quick: true,
      quickMode: timer.mode,
      taskId: task.id,
      subject: task.subject,
      action: task.title,
      target: timer.targetMinutes,
      started: timer.started,
      segmentStart: timer.segmentStart,
      elapsed: timer.elapsed,
      segments: timer.segments,
      pauses: [],
    },
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: 'doing' } : t)),
  };
}
/** Quick-start material sessions still finish before any optional form. */
export function finishQuickResource(state: State, now: number): State {
  const active = state.active;
  if (!active?.quick || state.quickTimer) return state;
  const finished = finishQuick(
    {
      ...state,
      active: null,
      quickTimer: {
        id: active.id,
        mode: active.quickMode ?? 'countdown',
        targetMinutes: active.target,
        started: active.started,
        segmentStart: active.segmentStart,
        elapsed: active.elapsed,
        segments: active.segments ?? [],
      },
    },
    now,
  );
  if (finished.quickTimer) return state; // capacity failure must preserve the live timer
  return {
    ...finished,
    sessions: finished.sessions.map((session) =>
      session.id === active.id
        ? {
            ...session,
            taskId: active.taskId,
            subject: active.subject,
            action: active.action,
            resourceId: active.resourceId,
            questionPace: active.questionPace,
            exam: active.exam,
            problems: new Set(
              learning(state)
                .attempts.filter((a) => a.sessionId === active.id && a.selfCheck !== 'unreviewed')
                .map((a) => a.problemId),
            ).size,
          }
        : session,
    ),
  };
}

/** Read-only export snapshot. Never alter the running device's state. */
export function pausedStudySnapshot(state: State, now: number): State {
  const paused = pauseQuick(state, now);
  return state.active ? { ...paused, active: closeSegment(state.active, now) } : paused;
}
