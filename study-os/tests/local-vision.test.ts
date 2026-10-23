import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { localVisionOnly, LOGGER_INIT } from '../localVision';
describe('local-only MediaPipe build boundary', () => {
  it('removes exactly the usage logger initialization in the pinned engine', () => {
    const engine = readFileSync('node_modules/@mediapipe/tasks-vision/vision_bundle.mjs', 'utf8');
    expect(engine).toContain('https://odml.pa.googleapis.com/v1/log');
    const patched = localVisionOnly(engine);
    expect(patched).not.toContain(LOGGER_INIT);
    expect(patched.length).toBe(engine.length - LOGGER_INIT.length);
  });
  it('rejects unreviewed upstream formats and double patches', () => {
    expect(() => localVisionOnly('different engine')).toThrow('requires review');
    expect(() => localVisionOnly(LOGGER_INIT + LOGGER_INIT)).toThrow('requires review');
  });
});
