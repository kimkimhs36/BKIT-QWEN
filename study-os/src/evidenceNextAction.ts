import type { State } from './model';
import type { SleepState } from './sleep';
import { studyFixedNow } from './sleepConstraints';
import { MIN } from './time';

export type EvidenceNextAction =
  | { kind: 'finish' }
  | { kind: 'sleep' }
  | { kind: 'schedule'; title: string; upcoming: boolean }
  | { kind: 'start' };

/**
 * One safe next action for the weekly record screen.
 * Keep an existing study reachable for explicit saving even if a protected
 * period has begun; never start a NEW focus during the protected period.
 */
export function chooseEvidenceNextAction(
  state: State,
  sleep: SleepState,
  now: number,
  studying: boolean,
  sleepProtected: boolean,
): EvidenceNextAction {
  if (studying) return { kind: 'finish' };
  if (sleepProtected) return { kind: 'sleep' };
  const fixed = studyFixedNow(state, sleep, now);
  const current = fixed.find((item) => item.start <= now && now < item.end);
  if (current) return { kind: 'schedule', title: current.title, upcoming: false };
  const upcoming = fixed.find((item) => now < item.start && item.start < now + 5 * MIN);
  if (upcoming) return { kind: 'schedule', title: upcoming.title, upcoming: true };
  return { kind: 'start' };
}
