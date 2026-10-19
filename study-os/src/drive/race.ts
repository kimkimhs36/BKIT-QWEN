export type RaceDistance = 200 | 400;
export type ShiftRecord = {
  gear: number;
  rpm: number;
  at: number;
  quality: 'perfect' | 'early' | 'late';
};
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
  targetDistance: RaceDistance;
  topSpeed: number;
  shiftUntil: number;
  shiftLog: ShiftRecord[];
  result: 'finish' | 'false-start' | 'late-start' | 'timeout' | 'interrupted' | null;
};
export const newRace = (targetDistance: RaceDistance = 200): Race => ({
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
  targetDistance,
  topSpeed: 0,
  shiftUntil: 0,
  shiftLog: [],
});
export const stageRace = (now: number, distance: RaceDistance = 200): Race => ({
  ...newRace(distance),
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
// Speed at redline in each gear (m/s). Final drive and wheel radius are folded into these ratios.
export const gearSpeeds = [0, 12, 22, 32, 44, 57];
export const vehiclePhysics = { mass: 1180, power: 108000, grip: 0.92, drag: 0.39, rolling: 145 };
export const revs = (r: Race) => Math.min(1.1, Math.max(0.12, r.speed / gearSpeeds[r.gear]));
export function shiftRace(r: Race): Race {
  if (r.phase !== 'racing' || r.gear >= 5 || r.lastAt < r.shiftUntil) return r;
  const rpm = revs(r),
    good = rpm >= 0.72 && rpm <= 0.94;
  return {
    ...r,
    gear: r.gear + 1,
    speed: r.speed * (good ? 1 : 0.82),
    shifts: r.shifts + 1,
    perfect: r.perfect + Number(good),
    shiftUntil: r.lastAt + (good ? 140 : 300),
    shiftLog: [
      ...r.shiftLog,
      {
        gear: r.gear + 1,
        rpm,
        at: r.elapsed,
        quality: good ? 'perfect' : rpm < 0.72 ? 'early' : 'late',
      },
    ],
  };
}
/** Integrates all foreground time in <=5ms substeps. Same inputs do not lose time at 10Hz. */
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
  let speed = r.speed,
    distance = r.distance,
    topSpeed = r.topSpeed,
    t = r.lastAt;
  while (t < now) {
    const dt = Math.min(0.005, (now - t) / 1000),
      rpm = Math.max(0.16, speed / gearSpeeds[r.gear]);
    const curve = Math.max(0.35, 1 - 1.8 * (rpm - 0.77) ** 2);
    const power = vehiclePhysics.power * (tune === 'sprint' ? 1.12 : 1) * curve;
    const force =
      throttle && t >= r.shiftUntil
        ? Math.min(vehiclePhysics.mass * 9.81 * vehiclePhysics.grip, power / Math.max(8, speed))
        : 0;
    const resistance =
      vehiclePhysics.rolling +
      vehiclePhysics.drag * speed * speed +
      (throttle ? 0 : vehiclePhysics.mass * 2.8);
    const nextSpeed = Math.max(
      0,
      Math.min(gearSpeeds[r.gear], speed + ((force - resistance) / vehiclePhysics.mass) * dt),
    );
    const traveled = (speed + nextSpeed) * 0.5 * dt;
    if (distance + traveled >= r.targetDistance) {
      const fraction = (r.targetDistance - distance) / Math.max(0.000001, traveled);
      return {
        ...r,
        phase: 'result',
        result: 'finish',
        distance: r.targetDistance,
        speed: nextSpeed,
        topSpeed: Math.max(topSpeed, nextSpeed),
        lastAt: now,
        elapsed: (t - r.launchedAt) / 1000 + dt * fraction,
      };
    }
    distance += traveled;
    speed = nextSpeed;
    topSpeed = Math.max(topSpeed, speed);
    t += dt * 1000;
  }
  const elapsed = (now - r.launchedAt) / 1000;
  return {
    ...r,
    speed,
    distance,
    topSpeed,
    lastAt: now,
    elapsed,
    phase: elapsed >= 45 ? 'result' : 'racing',
    result: elapsed >= 45 ? 'timeout' : null,
  };
}
