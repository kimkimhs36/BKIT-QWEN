import { describe, it, expect } from 'vitest';
import { newRace, stageRace, launchRace, shiftRace, tickRace } from '../src/drive/race';
import { restoreBreak, BREAK_KEY } from '../src/drive/break';
function run(tune: 'balanced' | 'sprint') {
  let r = launchRace(stageRace(0), 3200);
  for (let t = 3233; t < 28000 && r.phase === 'racing'; t += 33) {
    r = tickRace(r, t, true, tune);
    if (r.speed / [0, 12, 22, 32, 44, 57][r.gear] > 0.83) r = shiftRace(r);
  }
  return r;
}
describe('isolated drag race', () => {
  it('requires a staged start and measures reaction without random outcomes', () => {
    expect(launchRace(newRace(), 0).phase).toBe('ready');
    expect(launchRace(stageRace(0), 2999).result).toBe('false-start');
    expect(launchRace(stageRace(0), 3100).reaction).toBe(0.1);
    expect(tickRace(stageRace(0), 5001, false, 'balanced').result).toBe('late-start');
  });
  it('finishes using throttle and gears, with a measurable tuning difference', () => {
    const base = run('balanced'),
      sprint = run('sprint');
    expect(base.result).toBe('finish');
    expect(base.distance).toBe(200);
    expect(base.perfect).toBeGreaterThan(0);
    expect(sprint.result).toBe('finish');
    expect(sprint.elapsed).toBeLessThan(base.elapsed);
  });
  it('penalizes poor shifts and cannot move while idle or through suspension', () => {
    const r = launchRace(stageRace(0), 3000);
    expect(shiftRace({ ...r, speed: 3 }).speed).toBeLessThan(3);
    expect(tickRace(r, 3033, false, 'balanced').distance).toBe(0);
    expect(tickRace(r, 9000, true, 'balanced').result).toBe('interrupted');
  });
  it('validates the persisted break deadline without granting time on reload', () => {
    const raw = JSON.stringify({ until: 5000, scroll: 400, route: 'study' });
    const store = { getItem: (key: string) => (key === BREAK_KEY ? raw : null) };
    expect(restoreBreak(store, 2000)?.until).toBe(5000);
    expect(restoreBreak(store, 5000)).toBeNull();
    expect(restoreBreak({ getItem: () => '{broken' }, 2000)).toBeNull();
    expect(
      restoreBreak(
        { getItem: () => JSON.stringify({ until: 99999999, scroll: 0, route: 'study' }) },
        2000,
      ),
    ).toBeNull();
  });
});
