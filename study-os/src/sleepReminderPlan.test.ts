import { describe, expect, it } from 'vitest';
import { dueSleepReminders, planSleepReminders } from './sleepReminderPlan';

describe('Bedtime push policy (not wired to a sender)', () => {
  it('never plans reminders without explicit opt-in', () => {
    expect(planSleepReminders('2026-10-20', '07:00', 510, 'direct', false)).toEqual([]);
  });
  it('limits direct reminders to two before screen off, never bedtime spam', () => {
    const reminders = planSleepReminders('2026-10-20', '07:00', 510, 'direct', true);
    expect(reminders).toHaveLength(2);
    expect(reminders[0].at).toBe('2026-10-19T12:15:00.000Z'); // 21:15 Korea
    expect(reminders[1].at).toBe('2026-10-19T12:30:00.000Z'); // 21:30 Korea
    expect(reminders[1].body).toContain('지금 자!');
  });
  it('deduplicates and refuses to deliver stale pushes that would wake the learner', () => {
    const reminders = planSleepReminders('2026-10-20', '07:00', 510, 'gentle', true);
    expect(dueSleepReminders(reminders, new Date('2026-10-19T12:18:00Z'), new Set())).toHaveLength(1);
    expect(dueSleepReminders(reminders, new Date('2026-10-19T12:18:00Z'), new Set([reminders[0].id]))).toHaveLength(0);
    expect(dueSleepReminders(reminders, new Date('2026-10-19T13:30:00Z'), new Set())).toHaveLength(0);
  });
});
