/**
 * Sleep preparation is user-confirmed, never inferred from the clock.
 * The fourth existing Sleep Guard check means "actually in bed" and must not be
 * toggled by a quick home-screen preparation shortcut.
 */
export const HOME_SLEEP_STEPS = [
  '공부 자료 정리',
  '씻기',
  '휴대폰 내려놓고 취침 준비',
] as const;

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
