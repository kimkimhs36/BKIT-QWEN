import { describe, expect, it } from 'vitest';
import { DEFAULT_SLEEP_SETTINGS, formatMinutes, sleepStatus } from './sleepGuardLogic';

const settings = { ...DEFAULT_SLEEP_SETTINGS, enabled: true };
describe('Sleep Guard (Asia/Seoul)', () => {
  it('derives 22:30 bedtime from Tuesday 07:00 wake-up and 8h30 sleep', () => {
    const mondayEvening = sleepStatus(new Date('2026-10-19T12:00:00Z'), settings); // Mon 21:00 KST
    expect(mondayEvening.bedtime).toBe('22:30');
    expect(mondayEvening.inSleepWindow).toBe(false);
  });
  it('warns one hour before bedtime', () => {
    const state = sleepStatus(new Date('2026-10-19T12:45:00Z'), settings); // Mon 21:45 KST
    expect(state.windingDown).toBe(true);
    expect(state.minutesToBed).toBe(45);
  });
  it('protects sleep after midnight, including before the school-day wake-up', () => {
    const state = sleepStatus(new Date('2026-10-19T17:00:00Z'), settings); // Tue 02:00 KST
    expect(state.showGuard).toBe(true);
  });
  it('uses weekend wake-up time and allows a temporary override', () => {
    const saturday = new Date('2026-10-17T14:45:00Z'); // Sat 23:45 KST, Sun 08:00 wake-up
    expect(sleepStatus(saturday, settings).bedtime).toBe('23:30');
    expect(sleepStatus(saturday, settings).showGuard).toBe(true);
    expect(sleepStatus(saturday, { ...settings, postponeUntil: saturday.getTime() + 1800000 }).showGuard).toBe(false);
  });
  it('never blocks existing users until they explicitly opt in', () => {
    expect(sleepStatus(new Date('2026-10-19T17:00:00Z'), DEFAULT_SLEEP_SETTINGS).showGuard).toBe(false);
  });
  it('formats overnight times', () => {
    expect(formatMinutes(-90)).toBe('22:30');
  });
});
