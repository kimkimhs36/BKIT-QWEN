import type { State } from './model';

/** Never send a live focus timer or device-only photo references to the cloud. */
export function portableStudyState(state: State): State {
  return {
    ...state,
    learningEvents: undefined,
    problemRetests: undefined,
    exams: undefined,
    learning: undefined,
    juggernaut: undefined,
    revision: 0,
    tasks: state.tasks.map(({ attachmentIds: _privatePhotos, ...task }) => task),
    // Device-only identities must not create endless differences with the portable server schema.
    sessions: state.sessions.map(
      ({ resourceId: _resource, questionPace: _pace, exam: _exam, ...session }) => ({
        ...session,
        workspace: session.workspace
          ? {
              problem: session.workspace.problem,
              source: session.workspace.source,
              attempts: session.workspace.attempts.map(
                ({ id, answer, submittedAt, selfCheck }) => ({
                  id,
                  answer,
                  submittedAt,
                  selfCheck,
                }),
              ),
            }
          : undefined,
      }),
    ),
    active: null,
    quickTimer: null, // device-only live stopwatch must not sync or leak timer metadata
    plan: [],
    undo: null,
  };
}
/** Older production schemas omit local learning metadata; never erase it on download. */
export function mergePrivateStudyState(local: State, incoming: State): State {
  return {
    ...incoming,
    active: local.active,
    quickTimer: local.quickTimer,
    learningEvents: local.learningEvents,
    problemRetests: local.problemRetests,
    exams: local.exams,
    learning: local.learning,
    juggernaut: local.juggernaut,
    tasks: incoming.tasks.map((task) => {
      const existing = local.tasks.find((t) => t.id === task.id);
      return {
        ...task,
        attachmentIds: existing?.attachmentIds,
        submissionRequired: task.submissionRequired ?? existing?.submissionRequired,
        capture: task.capture ?? existing?.capture,
      };
    }),
    sessions: incoming.sessions.map((session) => {
      const existing = local.sessions.find((s) => s.id === session.id);
      return {
        ...session,
        quick: session.quick ?? existing?.quick,
        questionPace: existing?.questionPace,
        exam: existing?.exam,
        resourceId: existing?.resourceId,
        workspace: session.workspace
          ? {
              ...existing?.workspace,
              ...session.workspace,
              attempts: session.workspace.attempts.map((attempt) => ({
                ...existing?.workspace?.attempts.find((item) => item.id === attempt.id),
                ...attempt,
              })),
            }
          : undefined,
      };
    }),
    plan: [],
    undo: null,
  };
}
