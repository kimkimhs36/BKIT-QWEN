import { describe, expect, it } from 'vitest';
import { roundedRectDistance, sampleLens, makeLensBytes } from '../src/liquidMath';

describe('Liquid 06 signed-distance-field optical map', () => {
  it('keeps the centre neutral while moving only the curved rim', () => {
    const w = 400, h = 96, r = 38;
    const center = sampleLens(200,48,w,h,r);
    const upper = sampleLens(200,1,w,h,r);
    const lower = sampleLens(200,94,w,h,r);
    expect(center.r).toBe(128);
    expect(center.g).toBe(128);
    expect(upper.g).toBeLessThan(128);
    expect(lower.g).toBeGreaterThan(128);
    expect(Math.abs(upper.g-128)).toBeGreaterThan(35);
  });
  it('returns a neutral displacement outside a rounded corner', () => {
    expect(roundedRectDistance(0,0,400,96,38)).toBeGreaterThan(0);
    expect(sampleLens(0,0,400,96,38)).toEqual({r:128,g:128,b:128,a:255});
  });
  it('produces valid unsigned eight-bit RGBA data for mobile and hero shapes', () => {
    for (const [w,h,r] of [[400,96,38],[340,228,34]]) {
      const bytes = makeLensBytes(w,h,r);
      expect(bytes).toHaveLength(w*h*4);
      expect(bytes[(Math.floor(h/2)*w + Math.floor(w/2))*4+3]).toBe(255);
    }
    expect(() => makeLensBytes(1,96,38)).toThrow();
    expect(() => makeLensBytes(5000,96,38)).toThrow();
  });
});
