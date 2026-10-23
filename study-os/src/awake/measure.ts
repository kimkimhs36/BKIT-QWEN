import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { AwakeSignal } from '../awakeSignals';
type Point = { x: number; y: number; z: number };
function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function ear(p: Point[], ids: number[]) {
  if (ids.some((i) => !p[i])) return null;
  const width = distance(p[ids[0]], p[ids[3]]);
  return width > 0.012
    ? (distance(p[ids[1]], p[ids[5]]) + distance(p[ids[2]], p[ids[4]])) / (2 * width)
    : null;
}
/** Geometric visibility checks are quality gates, not calibrated confidence probabilities. */
export function measureFace(
  result: FaceLandmarkerResult,
  at: number,
  luminance: number,
  inferenceMs: number,
): AwakeSignal {
  const p = result.faceLandmarks[0],
    shapes = result.faceBlendshapes[0]?.categories;
  const score = (name: string) => shapes?.find((x) => x.categoryName === name)?.score ?? null;
  if (!p?.[263]) return { at, face: false, left: null, right: null, angled: false, confidence: 0 };
  const eyeWidth = distance(p[33], p[263]),
    centerX = (p[33].x + p[263].x) / 2;
  const yaw = Math.abs(p[1].x - centerX) / Math.max(0.001, eyeWidth);
  const roll = Math.abs(p[33].y - p[263].y) / Math.max(0.001, eyeWidth);
  const pitch = (p[1].y - (p[33].y + p[263].y) / 2) / Math.max(0.001, eyeWidth);
  const inside = [33, 263, 1, 152].every(
    (i) => p[i].x > 0.025 && p[i].x < 0.975 && p[i].y > 0.025 && p[i].y < 0.975,
  );
  const angled = yaw > 0.34 || roll > 0.42 || pitch > 0.95 || pitch < -0.18;
  const confidence =
    !inside || eyeWidth < 0.09 || luminance < 24 || luminance > 237 ? 0.35 : angled ? 0.5 : 0.9;
  return {
    at,
    face: true,
    left: score('eyeBlinkLeft'),
    right: score('eyeBlinkRight'),
    angled,
    confidence,
    earLeft: ear(p, [33, 160, 158, 133, 153, 144]),
    earRight: ear(p, [362, 385, 387, 263, 373, 380]),
    pitch,
    inferenceMs,
  };
}
