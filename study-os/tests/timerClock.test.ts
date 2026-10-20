import { describe, expect, it } from 'vitest';
import { StudyClock } from '../src/timerClock';
import { elapsed, resumeSegment } from '../src/session';
import type { State } from '../src/model';

describe('session timestamp calibration', () => {
  it('keeps elapsed time through foreground clock changes in both directions', () => {
    const clock = new StudyClock(10_000, 100);
    expect(clock.read(40_000, 30_100).time).toBe(40_000);
    expect(clock.read(-3_550_000, 40_100)).toEqual({ time: 50_000, adjusted: true });
    expect(clock.read(7_260_000, 50_100)).toEqual({ time: 60_000, adjusted: true });
    expect(clock.read(7_261_000, 51_100)).toEqual({ time: 61_000, adjusted: false });
  });

  it('accounts for suspension when WebKit stops monotonic ticks during device sleep', () => {
    const clock = new StudyClock(0, 0);
    clock.read(10_000, 10_000);
    clock.suspend();
    expect(clock.read(3_610_000, 10_000)).toEqual({ time: 3_610_000, adjusted: false });
    expect(clock.read(3_611_000, 11_000).time).toBe(3_611_000);
  });

  it('never rewinds a restored session behind already saved segment boundaries', () => {
    const clock = new StudyClock(5_000, 0, 60_000);
    expect(clock.read(6_000, 1_000).time).toBe(61_000);
    expect(clock.read(7_000, 2_000).time).toBe(62_000);
  });

  it('does not depend on how often the UI renders', () => {
    const frequent = new StudyClock(0, 0), rare = new StudyClock(0, 0);
    for (let i = 1; i <= 10_000; i++) frequent.read(i, i);
    expect(frequent.read(1_000_000, 1_000_000).time).toBe(rare.read(1_000_000, 1_000_000).time);
  });
});

it('repeated resume actions do not restart an active segment or overlap committed time', () => {
  const active: NonNullable<State['active']> = {
    id: 'resume', taskId: null, subject: '수학', action: '복습', target: 5,
    started: new Date(10_000).toISOString(), segmentStart: null, elapsed: 10, pauses: [],
    segments: [{ start: new Date(10_000).toISOString(), end: new Date(20_000).toISOString() }],
  };
  const running = resumeSegment(active, 30_000);
  expect(resumeSegment(running, 40_000)).toBe(running);
  expect(elapsed(running, 50_000)).toBe(30);
  expect(resumeSegment(active, 15_000).segmentStart).toBe(new Date(20_000).toISOString());
});
