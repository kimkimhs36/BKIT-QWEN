import { MIN } from './time';

// Display-layer guard only. App.start() repeats the authoritative fixed-schedule check.
export function canStartSprint(
  now: number,
  occupied: boolean,
  nextFixedStart: number | null,
  minutes = 5,
): boolean {
  if (!Number.isFinite(now) || !Number.isFinite(minutes) || minutes <= 0 || occupied)
    return false;
  return nextFixedStart === null || nextFixedStart - now >= minutes * MIN;
}
