import { describe, it, expect } from 'vitest';
import {
  newObservation,
  observeEyes,
  shouldNotify,
  skipCalibration,
  type AwakeSignal,
} from '../src/awakeSignals';
import { measureFace } from '../src/awake/measure';
const open = (at: number, extra: Partial<AwakeSignal> = {}): AwakeSignal => ({
  at,
  face: true,
  left: 0.1,
  right: 0.1,
  angled: false,
  confidence: 0.9,
  ...extra,
});
const closed = (at: number, extra: Partial<AwakeSignal> = {}) =>
  open(at, { left: 0.92, right: 0.92, ...extra });
function harness(calibrate = false) {
  let s = newObservation(calibrate),
    at = 0;
  return {
    get s() {
      return s;
    },
    get at() {
      return at;
    },
    step(ms: number, close = false, extra: Partial<AwakeSignal> = {}) {
      for (let i = 0; i < ms; i += 100) {
        s = observeEyes(s, close ? closed(at, extra) : open(at, extra));
        at += 100;
      }
      return s;
    },
    input(input: AwakeSignal) {
      s = observeEyes(s, input);
      return s;
    },
  };
}
describe('Awake temporal evidence (heuristics, not a sleep diagnosis)', () => {
  it('excludes ordinary brief blinks from closed-time evidence', () => {
    const h = harness();
    for (let i = 0; i < 20; i++) {
      h.step(1500);
      h.step(200, true);
    }
    expect(h.s.episodes).toHaveLength(0);
    expect(h.s.longBlinks).toHaveLength(0);
    expect(h.s.perclos).toBe(0);
    expect(h.s.phase).toBe('OBSERVING');
  });
  it('one intentional one-second closure does not escalate', () => {
    const h = harness();
    h.step(2000);
    h.step(1000, true);
    h.step(1000);
    expect(h.s.phase).toBe('OBSERVING');
    expect(h.s.episodes).toHaveLength(0);
  });
  it('a single several-second closure offers only a gentle reminder', () => {
    const h = harness();
    h.step(2000);
    h.step(5000, true);
    expect(h.s.phase).toBe('FATIGUE_SIGNAL');
    expect(h.s.episodes).toHaveLength(1);
  });
  it('requires separate repeated closures for rest recommendation', () => {
    const h = harness();
    for (let i = 0; i < 3; i++) {
      h.step(1000);
      h.step(2400, true);
      h.step(600);
    }
    expect(h.s.phase).toBe('REST_RECOMMENDED');
    expect(h.s.episodes).toHaveLength(3);
  });
  it.each([
    { left: 0.99, right: 0.05 },
    { face: false },
    { angled: true },
    { confidence: 0.3 },
    { left: null },
    { right: NaN },
    { left: 1.3 },
    { frameAge: 1400 },
    { inferenceMs: 500 },
  ])('unobservable input cannot accumulate closure: %j', (extra) => {
    const h = harness();
    h.step(20000, true, extra);
    expect(h.s.phase).toBe('UNCERTAIN');
    expect(h.s.episodes).toHaveLength(0);
    expect(h.s.observedMs).toBe(0);
  });
  it('eye rubbing with inconsistent one-sided signals stays uncertain', () => {
    const h = harness();
    for (let i = 0; i < 40; i++)
      h.step(100, true, i % 2 ? { left: 0.95, right: 0.2 } : { left: 0.2, right: 0.95 });
    expect(h.s.phase).toBe('UNCERTAIN');
    expect(h.s.episodes).toHaveLength(0);
  });
  it('writing, gaze changes, and repeated head nods without eye evidence never escalate', () => {
    const h = harness();
    for (let i = 0; i < 50; i++) {
      h.step(300, false, { pitch: 0.1 });
      h.step(300, false, { pitch: 0.4 });
      h.step(300, false, { pitch: 0.1 });
    }
    expect(h.s.nods.length).toBeGreaterThan(1);
    expect(h.s.phase).toBe('OBSERVING');
  });
  it('occlusion interrupts continuity instead of stretching a closed frame', () => {
    const h = harness();
    h.step(1900, true);
    h.step(3000, true, { face: false });
    h.step(1800, true);
    expect(h.s.episodes).toHaveLength(0);
  });
  it('rejects delayed, duplicate, reversed and nonfinite timestamps', () => {
    const h = harness();
    h.step(1500, true);
    h.input(closed(5000));
    expect(h.s.phase).toBe('UNCERTAIN');
    expect(h.s.closedSince).toBeNull();
    h.input(closed(4900));
    expect(h.s.phase).toBe('UNCERTAIN');
    h.input(closed(NaN));
    expect(h.s.phase).toBe('UNCERTAIN');
    const s = h.input(open(6000));
    expect(h.input(closed(6000))).toBe(s);
  });
  it('expires evidence after gaps and requires new observations', () => {
    const h = harness();
    h.step(2600, true);
    h.input(open(90000));
    expect(h.s.episodes).toHaveLength(0);
    expect(h.s.phase).toBe('UNCERTAIN');
  });
  it('PERCLOS uses observed valid time, excluding missing intervals', () => {
    const h = harness();
    h.step(10000);
    h.step(10000, true, { face: false });
    h.step(3000, true);
    expect(h.s.observedMs).toBeLessThan(14000);
    expect(h.s.perclos).toBeGreaterThan(0.15);
    expect(h.s.phase).not.toBe('REST_RECOMMENDED');
  });
  it('calibrates from sufficient open-eye observations and keeps no samples afterward', () => {
    const h = harness(true);
    h.step(4500);
    expect(h.s.calibration.ready).toBe(true);
    expect(h.s.calibration.samples).toHaveLength(0);
    expect(h.s.phase).toBe('OBSERVING');
  });
  it('failed calibration does not invent a baseline; skip enables conservative defaults', () => {
    const h = harness(true);
    h.step(7500, true);
    expect(h.s.calibration.failed).toBe(true);
    expect(h.s.phase).toBe('UNCERTAIN');
    expect(skipCalibration(h.s).calibration.ready).toBe(true);
  });
  it('calibrated EAR disagreement reduces confidence', () => {
    let s = newObservation();
    s.calibration.ear = 0.3;
    s = observeEyes(s, closed(100, { earLeft: 0.32, earRight: 0.3 }));
    expect(s.phase).toBe('UNCERTAIN');
    expect(s.episodes).toHaveLength(0);
  });
  it('OFF and PAUSED ignore evidence; restart clears prior alerts', () => {
    for (const phase of ['IDLE', 'PAUSED'] as const) {
      let s = { ...newObservation(), phase };
      for (let at = 0; at < 10000; at += 100) s = observeEyes(s, closed(at)) as typeof s;
      expect(s.episodes).toHaveLength(0);
    }
    expect(newObservation().episodes).toHaveLength(0);
  });
  it('notification acknowledgement and cooldown prevent repeat bursts', () => {
    expect(shouldNotify('FATIGUE_SIGNAL', 100, { level: 0, at: -Infinity }, false)).toBe(false);
    expect(shouldNotify('REPEATED_CLOSURE', 100, { level: 0, at: -Infinity }, false)).toBe(true);
    expect(shouldNotify('REST_RECOMMENDED', 1000, { level: 2, at: 100 }, false)).toBe(false);
    expect(shouldNotify('REST_RECOMMENDED', 31000, { level: 2, at: 100 }, false)).toBe(true);
    expect(shouldNotify('REST_RECOMMENDED', 100000, { level: 3, at: 100 }, false)).toBe(false);
    expect(shouldNotify('REST_RECOMMENDED', 100000, { level: 0, at: 0 }, true)).toBe(false);
  });
  it('pose gates reject low light, backlight, offscreen and missing face', () => {
    const result = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
    expect(measureFace(result, 0, 120, 20).confidence).toBe(0);
  });
});
