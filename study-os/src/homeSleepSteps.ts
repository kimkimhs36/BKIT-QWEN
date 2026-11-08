/**
 * Sleep preparation is user-confirmed, never inferred from the clock.
 * The fourth existing Sleep Guard check means "actually in bed" and must not be
 * toggled by a quick home-screen preparation shortcut.
 */
import { CHECKS } from './sleep';

// Mirror the existing Sleep Guard labels so a home check means exactly the
// same thing when the user opens the full sleep screen.
export const HOME_SLEEP_STEPS = CHECKS.slice(0, 3);

export type HomeSleepStepIndex = 0 | 1 | 2;

export function readHomeSleepSteps(record?: { checks: readonly boolean[] } | null): [boolean, boolean, boolean] {
  return [
    record?.checks[0] === true,
    record?.checks[1] === true,
    record?.checks[2] === true,
  ];
}

export function setHomeSleepStep(
  checks: readonly boolean[],
  index: HomeSleepStepIndex,
  value: boolean,
): boolean[] {
  // Preserve the full record, including the separately confirmed "in bed" step.
  if (!Number.isInteger(index) || index < 0 || index >= HOME_SLEEP_STEPS.length)
    return [...checks];
  return checks.map((checked, i) => (i === index ? value : checked));
}
