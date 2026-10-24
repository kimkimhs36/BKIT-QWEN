/** Ephemeral heuristics, not clinical thresholds. Nothing here is persisted. */
export type AwakePhase =
  | 'IDLE'
  | 'INITIALIZING'
  | 'CALIBRATING'
  | 'OBSERVING'
  | 'FATIGUE_SIGNAL'
  | 'REPEATED_CLOSURE'
  | 'REST_RECOMMENDED'
  | 'UNCERTAIN'
  | 'PAUSED';
export type Sensitivity = 'conservative' | 'balanced' | 'sensitive';
export type AwakeSignal = {
  at: number;
  face: boolean;
  left: number | null;
  right: number | null;
  angled: boolean;
  confidence?: number;
  earLeft?: number | null;
  earRight?: number | null;
  pitch?: number;
  frameAge?: number;
  inferenceMs?: number;
};
type Interval = { at: number; duration: number; closed: boolean };
export type AwakeObservation = {
  closedSince: number | null;
  episodes: number[];
  latched: boolean;
  status: 'uncertain' | 'observing' | 'eyes-closed' | 'rest';
  phase: AwakePhase;
  at: number | null;
  intervals: Interval[];
  longBlinks: number[];
  reopening: number[];
  reopeningSince: number | null;
  openSince: number | null;
  closureCounted: number;
  confidence: number;
  recoverySince: number | null;
  perclos: number;
  observedMs: number;
  holdUntil: number;
  nods: number[];
  pitch: number | null;
  loweredAt: number | null;
  calibration: {
    started: number | null;
    samples: { left: number; right: number; ear: number | null }[];
    ready: boolean;
    failed: boolean;
    open: number;
    ear: number | null;
  };
};
export const newObservation = (calibrate = false): AwakeObservation => ({
  closedSince: null,
  episodes: [],
  latched: false,
  status: 'uncertain',
  phase: calibrate ? 'CALIBRATING' : 'OBSERVING',
  at: null,
  intervals: [],
  longBlinks: [],
  reopening: [],
  reopeningSince: null,
  openSince: null,
  closureCounted: 0,
  confidence: 0,
  recoverySince: null,
  perclos: 0,
  observedMs: 0,
  holdUntil: 0,
  nods: [],
  pitch: null,
  loweredAt: null,
  calibration: {
    started: null,
    samples: [],
    ready: !calibrate,
    failed: false,
    open: 0.15,
    ear: null,
  },
});
const recent = (values: number[], at: number) => values.filter((t) => at >= t && at - t < 60000);
const quantile = (values: number[], q: number) =>
  [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
const severity = (p: AwakePhase) =>
  p === 'REST_RECOMMENDED' ? 3 : p === 'REPEATED_CLOSURE' ? 2 : p === 'FATIGUE_SIGNAL' ? 1 : 0;
export function skipCalibration(s: AwakeObservation): AwakeObservation {
  return {
    ...newObservation(),
    at: s.at,
    calibration: { ...newObservation().calibration, ready: true },
  };
}
/** Irregular timestamps, stale frames, missing/one-sided/occluded eyes contribute no evidence. */
export function observeEyes(
  previous: AwakeObservation,
  input: AwakeSignal,
  sensitivity: Sensitivity = 'balanced',
): AwakeObservation {
  const s: AwakeObservation = {
    ...previous,
    calibration: { ...previous.calibration, samples: [...previous.calibration.samples] },
    intervals: [...previous.intervals],
    episodes: recent(previous.episodes, input.at),
    longBlinks: recent(previous.longBlinks, input.at),
    reopening: [...previous.reopening],
    nods: recent(previous.nods, input.at),
  };
  if (s.phase === 'IDLE' || s.phase === 'PAUSED') return s;
  const delta = previous.at === null ? 0 : input.at - previous.at;
  const invalidTime = !Number.isFinite(input.at) || delta < 0 || delta > 900;
  const confidence = input.confidence ?? 1;
  const valid =
    !invalidTime &&
    input.face &&
    !input.angled &&
    Number.isFinite(confidence) &&
    confidence >= 0.72 &&
    input.left !== null &&
    input.right !== null &&
    Number.isFinite(input.left) &&
    Number.isFinite(input.right) &&
    input.left >= 0 &&
    input.left <= 1 &&
    input.right >= 0 &&
    input.right <= 1 &&
    (input.frameAge ?? 0) <= 900 &&
    (input.inferenceMs ?? 0) < 350;
  s.at = Number.isFinite(input.at) ? input.at : null;
  s.intervals = s.intervals.filter((x) => input.at - x.at < 60000 && input.at >= x.at);
  if (!valid) {
    // Break continuity immediately. Never stretch an old closed frame across a gap.
    return {
      ...s,
      closedSince: null,
      openSince: null,
      latched: false,
      closureCounted: 0,
      reopeningSince: null,
      phase: 'UNCERTAIN',
      status: 'uncertain',
      confidence: 0,
      recoverySince: null,
      pitch: null,
      loweredAt: null,
    };
  }
  if (previous.at !== null && delta === 0) return previous;
  s.confidence = confidence;
  const left = input.left!,
    right = input.right!;
  const ear =
    input.earLeft != null && input.earRight != null ? (input.earLeft + input.earRight) / 2 : null;
  if (!s.calibration.ready) {
    const c = s.calibration;
    c.started ??= input.at;
    // Retain scalar samples in memory only; no landmarks, images, or identity data.
    if (Math.abs(left - right) < 0.35) c.samples.push({ left, right, ear });
    if (input.at - c.started >= 4000) {
      const openSamples = c.samples.filter(
        (x) => Math.max(x.left, x.right) < 0.5 && (x.ear === null || x.ear > 0.12),
      );
      if (openSamples.length >= 10) {
        c.open = Math.min(
          0.35,
          quantile(
            openSamples.map((x) => (x.left + x.right) / 2),
            0.3,
          ),
        );
        const ears = openSamples.flatMap((x) => (x.ear === null ? [] : [x.ear]));
        c.ear = ears.length >= 10 ? quantile(ears, 0.6) : null;
        c.ready = true;
        c.failed = false;
        c.samples = [];
      } else if (input.at - c.started >= 7000) {
        c.failed = true;
        c.samples = [];
        c.started = input.at;
      }
    }
    return {
      ...s,
      phase: c.failed ? 'UNCERTAIN' : c.ready ? 'OBSERVING' : 'CALIBRATING',
      status: c.failed ? 'uncertain' : 'observing',
    };
  }
  // Loss of visibility is immediate; recovery needs a stable run to avoid label flicker.
  if (previous.phase === 'UNCERTAIN' || previous.recoverySince !== null) {
    const since = previous.recoverySince ?? input.at;
    if (input.at - since < 600)
      return {
        ...s,
        recoverySince: since,
        phase: 'UNCERTAIN',
        status: 'uncertain',
        closedSince: null,
        closureCounted: 0,
      };
    s.recoverySince = null;
  }
  const threshold = Math.max(
    sensitivity === 'conservative' ? 0.74 : sensitivity === 'sensitive' ? 0.6 : 0.65,
    s.calibration.open + 0.32,
  );
  const bothClosed = left >= threshold && right >= threshold;
  const bothOpen = left < threshold - 0.17 && right < threshold - 0.17;
  const oneSided = Math.abs(left - right) > 0.4;
  // EAR corroborates only after an individual open-eye baseline is available.
  const contradiction =
    s.calibration.ear !== null &&
    ear !== null &&
    ((bothClosed && ear > s.calibration.ear * 0.9) || (bothOpen && ear < s.calibration.ear * 0.4));
  if (oneSided || contradiction)
    return {
      ...s,
      phase: 'UNCERTAIN',
      status: 'uncertain',
      confidence: 0.4,
      recoverySince: null,
      closedSince: null,
      closureCounted: 0,
      openSince: null,
      reopeningSince: null,
    };
  const dt = previous.confidence >= 0.72 ? Math.max(0, delta) : 0;
  if (bothClosed || (s.closedSince !== null && !bothOpen)) {
    s.closedSince ??= input.at;
    s.openSince = null;
    const duration = input.at - s.closedSince;
    if (duration >= 500) {
      // A normal brief blink is excluded entirely. Qualifying closure is counted retroactively.
      const amount = duration - s.closureCounted;
      if (amount > 0) s.intervals.push({ at: input.at, duration: amount, closed: true });
      s.closureCounted = duration;
    }
    if (duration >= 2000 && !s.latched) {
      s.episodes.push(input.at);
      s.latched = true;
    }
    if (left < threshold || right < threshold) s.reopeningSince ??= input.at;
  } else {
    if (s.closedSince !== null) {
      const duration = input.at - s.closedSince;
      if (duration >= 500) {
        s.longBlinks.push(input.at);
        s.reopening.push(Math.max(0, input.at - (s.reopeningSince ?? input.at - dt)));
        s.reopening = s.reopening.slice(-12);
      }
    }
    s.closedSince = null;
    s.closureCounted = 0;
    s.reopeningSince = null;
    s.openSince ??= input.at;
    if (input.at - s.openSince >= 400) s.latched = false;
    if (bothOpen && dt > 0 && previous.closedSince === null)
      s.intervals.push({ at: input.at, duration: dt, closed: false });
  }
  // A nod is an auxiliary signal; reading/writing alone cannot raise severity.
  if (input.pitch != null && Number.isFinite(input.pitch)) {
    if (s.pitch !== null && input.pitch - s.pitch > 0.18) s.loweredAt = input.at;
    if (s.loweredAt !== null && s.pitch !== null && s.pitch - input.pitch > 0.12) {
      if (input.at - s.loweredAt < 1800) s.nods.push(input.at);
      s.loweredAt = null;
    }
    s.pitch = input.pitch;
  }
  s.observedMs = s.intervals.reduce((a, x) => a + x.duration, 0);
  s.perclos = s.observedMs
    ? s.intervals.reduce((a, x) => a + (x.closed ? x.duration : 0), 0) / s.observedMs
    : 0;
  const prolonged = s.closedSince !== null && input.at - s.closedSince >= 2000;
  const slowReopening =
    s.reopening.length >= 6 &&
    s.reopening.slice(-3).reduce((a, b) => a + b, 0) >
      s.reopening.slice(0, 3).reduce((a, b) => a + b, 0) * 1.7;
  const elevated =
    s.observedMs >= 20000 &&
    s.perclos > (sensitivity === 'conservative' ? 0.35 : 0.28) &&
    s.longBlinks.length >= 3;
  let phase: AwakePhase =
    s.episodes.length >= 3 && confidence >= 0.8
      ? 'REST_RECOMMENDED'
      : s.episodes.length >= 2 || elevated
        ? 'REPEATED_CLOSURE'
        : prolonged ||
            s.longBlinks.length >= 3 ||
            (s.longBlinks.length >= 2 && (slowReopening || s.nods.length >= 2))
          ? 'FATIGUE_SIGNAL'
          : 'OBSERVING';
  if (severity(phase) > severity(previous.phase)) s.holdUntil = input.at + 5000;
  if (severity(phase) < severity(previous.phase) && input.at < s.holdUntil) phase = previous.phase;
  s.phase = phase;
  s.status = phase === 'REST_RECOMMENDED' ? 'rest' : prolonged ? 'eyes-closed' : 'observing';
  return s;
}
/** One acknowledgement latch per escalation. No repeated notifications until reset/cooldown. */
export function shouldNotify(
  phase: AwakePhase,
  at: number,
  last: { level: number; at: number },
  acknowledged: boolean,
) {
  const level = severity(phase);
  return !acknowledged && level >= 2 && level > last.level && at - last.at >= 30000;
}
