import { describe, expect, it } from 'vitest';
import { newState, stateSchema } from '../src/model';
import { startQuick, pauseQuick, resumeQuick, finishQuick, labelQuick, quickSeconds, quickClock, quickDaySeconds } from '../src/quickTimer';
const t = (s: string) => Date.parse(s);
describe('start first, record later', () => {
  it('starts without any subject or task, survives JSON reload, and records a stopwatch before labeling', () => {
    let s = startQuick(newState(), 'stopwatch', 480, t('2026-10-19T01:00:00Z'), 'free-1');
    expect(s.quickTimer?.id).toBe('free-1');
    s = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(quickSeconds(s.quickTimer!, t('2026-10-19T01:02:30Z'))).toBe(150);
    s = finishQuick(s, t('2026-10-19T01:02:30Z'));
    expect(s.quickTimer).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].seconds).toBe(150);
    expect(s.sessions[0].subject).toBe('미분류');
    s = labelQuick(s, 'free-1', '수학', '미적분 학습지 3쪽', '절댓값 좌극한');
    expect(stateSchema.parse(s).sessions[0].action).toBe('미적분 학습지 3쪽');
    expect(s.sessions[0].concepts).toBe('절댓값 좌극한');
    expect(quickDaySeconds(s, t('2026-10-19T12:00:00Z'))).toBe(150);
  });
  it('supports pause, reload, resume, and exact segment totals', () => {
    const began = t('2026-10-19T04:00:00Z');
    let s = startQuick(newState(), 'countdown', 25, began, 'free-2');
    s = pauseQuick(s, began + 3 * 60_000);
    s = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(quickSeconds(s.quickTimer!, began + 15 * 60_000)).toBe(180);
    s = resumeQuick(s, began + 20 * 60_000);
    s = finishQuick(s, began + 23 * 60_000);
    expect(s.sessions[0].seconds).toBe(360);
    expect(s.sessions[0].segments).toHaveLength(2);
    expect(stateSchema.safeParse(s).success).toBe(true);
  });
  it('does not overwrite running old-style focus or launch two quick timers', () => {
    const start = t('2026-10-19T04:00:00Z');
    const s = startQuick(newState(), 'stopwatch', 480, start, 'first');
    expect(startQuick(s, 'countdown', 5, start, 'second')).toBe(s);
    expect(startQuick(newState(), 'countdown', 0, start, 'invalid').quickTimer).toBeNull();
  });
  it('does not erase existing study history when a quick session finishes', () => {
    let s = startQuick(newState(), 'stopwatch', 480, t('2026-10-19T00:00:00Z'), 'keep-1');
    s = finishQuick(s, t('2026-10-19T00:01:01Z'));
    expect(s.sessions[0].seconds).toBe(61);
    const before = JSON.stringify(s.sessions[0]);
    s = startQuick(s, 'countdown', 10, t('2026-10-19T00:02:00Z'), 'keep-2');
    s = finishQuick(s, t('2026-10-19T00:03:00Z'));
    expect(JSON.stringify(s.sessions[0])).toBe(before);
    expect(s.sessions).toHaveLength(2);
  });
  it('formats stopwatch and countdown readouts', () => {
    expect(quickClock(0)).toBe('00:00');
    expect(quickClock(65)).toBe('01:05');
    expect(quickClock(3661)).toBe('1:01:01');
  });
});
