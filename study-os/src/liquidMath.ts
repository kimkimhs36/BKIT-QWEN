/**
 * Shape-aware refraction map.
 * Adapted in spirit from the signed-distance-field optics described by
 * MIT-licensed samasante/liquid-glass and dpawlikowski/liquid-glass.
 * Independently authored for BKIT; see THIRD_PARTY_NOTICES.md.
 *
 * R/G = displacement direction; [128,128] is neutral; B = soft edge gleam.
 * All functions are pure and testable without a browser or GPU.
 */
export type LensPixel = { r: number; g: number; b: number; a: number };

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const toByte = (x: number) => Math.round(clamp(x, 0, 255));

export function roundedRectDistance(
  x: number, y: number, width: number, height: number, radius: number,
): number {
  const r = clamp(radius, 0, Math.min(width, height) / 2);
  const px = Math.abs(x - width / 2) - (width / 2 - r);
  const py = Math.abs(y - height / 2) - (height / 2 - r);
  return Math.hypot(Math.max(px, 0), Math.max(py, 0)) + Math.min(Math.max(px, py), 0) - r;
}

export function sampleLens(
  x: number, y: number, width: number, height: number, radius: number,
): LensPixel {
  const distance = roundedRectDistance(x, y, width, height, radius);
  if (distance > 0) return { r: 128, g: 128, b: 128, a: 255 };

  // A convex lens bends light mostly near its edge, rather than shearing
  // the entire surface. The centre stays near neutral.
  const bevelWidth = Math.max(4, Math.min(width, height) * 0.26);
  const depth = clamp(1 + distance / bevelWidth, 0, 1);
  const falloff = Math.pow(depth, 1.75);
  const eps = 0.65;
  const gx = roundedRectDistance(x + eps, y, width, height, radius) -
    roundedRectDistance(x - eps, y, width, height, radius);
  const gy = roundedRectDistance(x, y + eps, width, height, radius) -
    roundedRectDistance(x, y - eps, width, height, radius);
  const magnitude = Math.hypot(gx, gy) || 1;
  const outwardX = gx / magnitude;
  const outwardY = gy / magnitude;
  // Eight-bit map, sRGB; 0.5 is the displacement's neutral point.
  const bend = falloff * 84;
  const dome = clamp((-distance - bevelWidth) / Math.max(width, height), 0, 1) * 9;
  const centreX = (x - width / 2) / Math.max(width, 1);
  const centreY = (y - height / 2) / Math.max(height, 1);
  return {
    r: toByte(128 + outwardX * bend + dome * centreX),
    g: toByte(128 + outwardY * bend + dome * centreY),
    b: toByte(128 + falloff * 115),
    a: 255,
  };
}

export function makeLensBytes(width: number, height: number, radius: number): Uint8ClampedArray {
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 4 || height < 4 || width > 1024 || height > 1024 ||
      !Number.isFinite(radius)) throw new Error('Invalid lens dimensions');
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = sampleLens(x + .5, y + .5, width, height, radius);
      const i = (y * width + x) * 4;
      pixels[i] = p.r;
      pixels[i + 1] = p.g;
      pixels[i + 2] = p.b;
      pixels[i + 3] = p.a;
    }
  }
  return pixels;
}
