import type { State } from './model';
import { addDays, dayKey } from './time';

export function weeklyLearningEvidence(s: State, today: string) {
  const since = addDays(today, -6),
    inWeek = (at: string) => dayKey(at) >= since && dayKey(at) <= today;
  const events = (s.learningEvents ?? []).filter((e) => inWeek(e.at));
  const sessions = [...s.sessions, ...(s.active ? [s.active] : [])];
  const attempts = sessions
    .flatMap((session) => session.workspace?.attempts ?? [])
    .filter((a) => inWeek(a.submittedAt));
  const retests = (s.problemRetests ?? []).filter((a) => inWeek(a.submittedAt));
  const delays = events
    .filter((e) => e.type === 'FirstLearningAttempt')
    .map((e) => (Date.parse(e.at) - Date.parse(e.foregroundAt)) / 1000)
    .filter((n) => n >= 0)
    .sort((a, b) => a - b);
  const delayed = retests.filter(
    (a) =>
      a.selfCheck !== 'unreviewed' &&
      a.hintUsed === false &&
      Date.parse(a.submittedAt) -
        Date.parse(s.sessions.find((s) => s.id === a.sessionId)?.ended ?? a.submittedAt) >=
        86400000,
  );
  return {
    starts: events.filter((e) => e.type === 'StudyStarted').length,
    attempts: attempts.length + retests.length,
    independent:
      attempts.filter((a) => a.hintUsed === false).length +
      retests.filter((a) => a.hintUsed === false).length,
    confirmed:
      attempts.filter((a) => a.selfCheck === 'remembered' && a.hintUsed === false).length +
      retests.filter((a) => a.selfCheck === 'remembered' && a.hintUsed === false).length,
    retries: attempts.filter((a) => a.selfCheck === 'retry').length,
    delayedTotal: delayed.length,
    delayedConfirmed: delayed.filter((a) => a.selfCheck === 'remembered').length,
    firstActionSamples: delays.length,
    medianSeconds: delays.length
      ? (delays[Math.floor((delays.length - 1) / 2)] + delays[Math.floor(delays.length / 2)]) / 2
      : null,
  };
}
