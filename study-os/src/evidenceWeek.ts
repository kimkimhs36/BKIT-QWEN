import type { State } from './model';
import type { SleepState } from './sleep';
import { recentStudyDays } from './studyInsights';
import { dayKey } from './time';

/**
 * Observed actions only. This is NOT a measure of achievement, attention,
 * sleep quality, or improvement against a baseline we do not have.
 */
export type EvidenceDay = {
  day: string;
  studySeconds: number;
  studyRecorded: boolean;
  selfCheckedRetests: number;
  bedtimeChecks: number;
  actualBedEntered: boolean;
  actualWakeEntered: boolean;
  anyEvidence: boolean;
};

export function summarizeEvidenceWeek(state: State, sleep: SleepState, today: string) {
  const sleepByDate = new Map(sleep.records.map((record) => [record.date, record]));
  const retestsByDate = new Map<string, Set<string>>();
  for (const attempt of state.problemRetests ?? []) {
    // Deliberate and explicit: absence of hintUsed does not mean 'no hint'.
    if (attempt.selfCheck !== 'remembered' || attempt.hintUsed !== false) continue;
    const day = dayKey(attempt.submittedAt);
    const attempts = retestsByDate.get(day) ?? new Set<string>();
    attempts.add(attempt.id);
    retestsByDate.set(day, attempts);
  }
  const days: EvidenceDay[] = recentStudyDays(state.sessions, today).map((record) => {
    const sleepRecord = sleepByDate.get(record.day);
    const bedtimeChecks = sleepRecord?.checks.slice(0, 3).filter(Boolean).length ?? 0;
    const actualBedEntered = sleepRecord?.actualBed != null;
    const actualWakeEntered = sleepRecord?.actualWake != null;
    const selfCheckedRetests = retestsByDate.get(record.day)?.size ?? 0;
    const studyRecorded = record.seconds > 0;
    return {
      day: record.day,
      studySeconds: record.seconds,
      studyRecorded,
      selfCheckedRetests,
      bedtimeChecks,
      actualBedEntered,
      actualWakeEntered,
      anyEvidence: studyRecorded || bedtimeChecks > 0 ||
        actualBedEntered || actualWakeEntered || selfCheckedRetests > 0,
    };
  });
  const focusedDays = days.filter((day) => day.studyRecorded).length;
  const checkedPrepDays = days.filter((day) => day.bedtimeChecks === 3).length;
  const retestedDays = days.filter((day) => day.selfCheckedRetests > 0).length;
  const evidenceDays = days.filter((day) => day.anyEvidence).length;
  const focusMinutes = Math.floor(days.reduce((n, day) => n + day.studySeconds, 0) / 60);
  return { days, focusedDays, checkedPrepDays, retestedDays, evidenceDays, focusMinutes };
}
