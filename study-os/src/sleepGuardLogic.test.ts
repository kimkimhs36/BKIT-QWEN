import { describe, expect, it } from 'vitest';
import { DEFAULT_SLEEP_SETTINGS, formatMinutes, sleepStatus } from './sleepGuardLogic';

const settings = { ...DEFAULT_SLEEP_SETTINGS, enabled: true };
const kst = (iso: string) => sleepStatus(new Date(iso), settings);
describe('Sleep Guard KST schedule', () => {
  it('sets an hour of screen-off preparation before the 8h30 sleep opportunity', () => {
    const at21 = kst('2026-10-19T12:00:00Z');
    expect(at21.bedtime).toBe('22:30');
    expect(at21.screenOffAt).toBe('21:30');
    expect(at21.wakeTomorrow).toBe('07:00');
    expect(at21.showGuard).toBe(false);
  });
  it('detects the wind-down stage without automatically counting it as sleep', () => {
    const state = kst('2026-10-19T12:45:00Z'); // Mon 21:45 KST
    expect(state.windingDown).toBe(true);
    expect(state.minutesToBed).toBe(45);
    expect(state.inSleepWindow).toBe(false);
  });
  it('starts protection precisely at bedtime, even if browser wakes up much later', () => {
    const late = kst('2026-10-19T17:00:00Z'); // Tue 02:00 KST
    expect(late.showGuard).toBe(true);
    expect(late.guardStartedAt).toBe(new Date('2026-10-19T13:30:00Z').getTime());
  });
  it('ends the overnight window at the wake-up time', () => {
    expect(kst('2026-10-19T21:59:00Z').showGuard).toBe(true); // Tue 06:59
    expect(kst('2026-10-19T22:00:00Z').showGuard).toBe(false); // Tue 07:00
  });
  it('uses weekend wake-up times and accepts a 30-minute exception', () => {
    const saturday = new Date('2026-10-17T14:45:00Z'); // Sat 23:45 KST
    const atWeekend = sleepStatus(saturday, settings);
    expect(atWeekend.bedtime).toBe('23:30');
    expect(atWeekend.screenOffAt).toBe('22:30');
    expect(atWeekend.showGuard).toBe(true);
    expect(sleepStatus(saturday, { ...settings, postponeUntil: saturday.getTime() + 30 * 60000 }).showGuard).toBe(false);
  });
  it('supports voluntary rest now, without recording actual sleep', () => {
    const now = new Date('2026-10-19T10:00:00Z').getTime();
    const manual = { ...settings, restStartedAt: now, restUntil: now + 10 * 3600_000 };
    const resting = sleepStatus(new Date(now + 5 * 60000), manual);
    expect(resting.manualRest).toBe(true);
    expect(resting.guardStartedAt).toBe(now);
    expect(resting.showGuard).toBe(true);
    expect(sleepStatus(new Date(now + 11 * 3600_000), manual).manualRest).toBe(false);
  });
  it('does not accidentally shield an entire afternoon for post-midnight schedules', () => {
    const lateRiser = { ...settings, weekdayWake: '13:00', weekendWake: '13:00' };
    expect(sleepStatus(new Date('2026-10-19T11:00:00Z'), lateRiser).showGuard).toBe(false); // Mon 20:00
    expect(sleepStatus(new Date('2026-10-19T20:00:00Z'), lateRiser).showGuard).toBe(true); // Tue 05:00
    expect(sleepStatus(new Date('2026-10-20T04:00:00Z'), lateRiser).showGuard).toBe(false); // Tue 13:00
  });
  it('defaults to disabled to preserve existing users and wraps time correctly', () => {
    expect(sleepStatus(new Date('2026-10-19T17:00:00Z'), DEFAULT_SLEEP_SETTINGS).showGuard).toBe(false);
    expect(formatMinutes(-90)).toBe('22:30');
  });
});
