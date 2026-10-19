export type Race = {
  phase: 'ready' | 'countdown' | 'racing' | 'result';
  goAt: number;
  launchedAt: number;
  lastAt: number;
  reaction: number | null;
  speed: number;
  distance: number;
  gear: number;
  shifts: number;
  perfect: number;
  elapsed: number;
  result: 'finish' | 'false-start' | 'late-start' | 'timeout' | 'interrupted' | null;
};
export const newRace = (): Race => ({
  phase: 'ready',
  goAt: 0,
  launchedAt: 0,
  lastAt: 0,
  reaction: null,
  speed: 0,
  distance: 0,
  gear: 1,
  shifts: 0,
  perfect: 0,
  elapsed: 0,
  result: null,
});
export const stageRace = (now: number): Race => ({
  ...newRace(),
  phase: 'countdown',
  goAt: now + 3000,
  lastAt: now,
});
export function launchRace(r: Race, now: number): Race {
  if (r.phase !== 'countdown') return r;
  if (now < r.goAt) return { ...r, phase: 'result', result: 'false-start' };
  if (now - r.goAt > 2000) return { ...r, phase: 'result', result: 'late-start' };
  return { ...r, phase: 'racing', launchedAt: now, lastAt: now, reaction: (now - r.goAt) / 1000 };
}
const ratios = [0, 12, 22, 32, 44, 57];
export function revs(r: Race): number {
  return Math.min(1.1, r.speed / ratios[r.gear]);
}
export function shiftRace(r: Race): Race {
  if (r.phase !== 'racing' || r.gear >= 5) return r;
  const good = revs(r) >= 0.72 && revs(r) <= 0.94;
  return {
    ...r,
    gear: r.gear + 1,
    speed: r.speed * (good ? 1 : 0.82),
    shifts: r.shifts + 1,
    perfect: r.perfect + (good ? 1 : 0),
  };
}
/** A bounded physics step cannot advance through a suspended/background tab. */
export function tickRace(
  r: Race,
  now: number,
  throttle: boolean,
  tune: 'balanced' | 'sprint',
): Race {
  if (r.phase === 'countdown' && now > r.goAt + 2000)
    return { ...r, phase: 'result', result: 'late-start' };
  if (r.phase !== 'racing') return r;
  if (now - r.lastAt > 1000 || now < r.lastAt)
    return { ...r, phase: 'result', result: 'interrupted' };
  const dt = Math.min(0.05, Math.max(0, (now - r.lastAt) / 1000));
  const ceiling = ratios[r.gear];
  const acceleration = throttle
    ? 9 * (tune === 'sprint' ? 1.12 : 1) * (1 - 0.1 * (r.gear - 1))
    : -4;
  const speed = Math.max(0, Math.min(ceiling, r.speed + acceleration * dt));
  const distance = Math.min(200, r.distance + ((r.speed + speed) / 2) * dt);
  const elapsed = (now - r.launchedAt) / 1000;
  return {
    ...r,
    lastAt: now,
    speed,
    distance,
    elapsed,
    phase: distance >= 200 || elapsed >= 25 ? 'result' : 'racing',
    result: distance >= 200 ? 'finish' : elapsed >= 25 ? 'timeout' : null,
  };
}
