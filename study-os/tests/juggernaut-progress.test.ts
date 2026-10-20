import { it, expect } from 'vitest';
import { newState, stateSchema } from '../src/model';
import { startQuick, finishQuick } from '../src/quickTimer';
import { juggernautProgress } from '../src/juggernautProgress';

it('reads the shared clock without adding break time or double-counting a saved session', () => {
  const t = Date.parse('2026-10-19T12:00:00Z');
  let s = startQuick(newState(), 'stopwatch', 5, t, 'one');
  expect(juggernautProgress(s, t + 300000).todaySeconds).toBe(300);
  expect(juggernautProgress(s, t + 300000).starts).toBe(1);
  s = finishQuick(s, t + 300000);
  expect(juggernautProgress(s, t + 900000).todaySeconds).toBe(300);
  expect(juggernautProgress(s, t + 900000).weekSeconds).toBe(300);
  expect(juggernautProgress(s, t + 900000).subjects[0].seconds).toBe(300);
  expect(juggernautProgress(s, t + 900000).solved).toBe(0);
  s.juggernaut = { examDate: null, weeklyMinutes: 300 };
  expect(stateSchema.parse(JSON.parse(JSON.stringify(s))).juggernaut?.examDate).toBeNull();
  expect(stateSchema.safeParse({ ...s, juggernaut: { examDate: '2026-02-30', weeklyMinutes: 300 } }).success).toBe(false);
});
