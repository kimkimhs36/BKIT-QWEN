import type { Session, State } from './model';

export type SessionEdits = Pick<Session, 'subject' | 'action' | 'concepts' | 'rating' | 'mistake'>;

/** Abandon only the clock. Keep tasks, resources, answers and saved sessions intact. */
export function discardUnsavedTimer(state: State): State {
  const id = state.active?.id ?? state.quickTimer?.id;
  if (!id) return state;
  return {
    ...state,
    active: null,
    quickTimer: null,
    // An abandoned test timer must not count as a study-start event.
    learningEvents: state.learningEvents?.filter(
      (event) => event.sessionId !== id || event.type !== 'StudyStarted',
    ),
  };
}

export function editStudySession(state: State, id: string, edits: SessionEdits): State {
  const subject = edits.subject.trim().slice(0, 200);
  const action = edits.action.trim().slice(0, 200);
  if (!subject || !action || !state.sessions.some((s) => s.id === id)) return state;
  return {
    ...state,
    sessions: state.sessions.map((session) =>
      session.id === id
        ? {
            ...session,
            subject,
            action,
            concepts: edits.concepts.trim().slice(0, 200),
            rating: edits.rating,
            mistake: edits.mistake.trim().slice(0, 3000),
            reviewDate:
              edits.mistake.trim() ? session.reviewDate : null,
          }
        : session,
    ),
  };
}

/** Delete only chosen study sessions. Never cascade into tasks, evidence or photos. */
export function deleteStudySessions(state: State, ids: readonly string[]): State {
  const selected = new Set(ids);
  if (!state.sessions.some((s) => selected.has(s.id))) return state;
  return { ...state, sessions: state.sessions.filter((s) => !selected.has(s.id)) };
}

/** Merge rather than replace current data: a new study after deletion must survive undo. */
export function restoreStudySessions(state: State, deleted: readonly Session[]): State {
  const existing = new Set(state.sessions.map((s) => s.id));
  const recover = deleted.filter((s) => !existing.has(s.id));
  if (!recover.length || state.sessions.length + recover.length > 5000) return state;
  return {
    ...state,
    sessions: [...state.sessions, ...recover].sort(
      (a, b) => Date.parse(a.ended) - Date.parse(b.ended),
    ),
  };
}
