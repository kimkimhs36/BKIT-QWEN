import { describe, it, expect } from 'vitest';
import {
  syncResponse,
  SyncFailure,
  retryDelay,
  MAX_SYNC_RETRIES,
} from '../src/privateSyncProtocol';
describe('sync recovery protocol', () => {
  it.each([
    [401, 'expired'],
    [403, 'forbidden'],
    [409, 'conflict'],
    [429, 'rate-limit'],
    [500, 'server'],
    [503, 'server'],
  ])('classifies HTTP %s independently from Google login', async (status, kind) => {
    await expect(
      syncResponse(new Response('{}', { status: Number(status) })),
    ).rejects.toMatchObject({ kind, httpStatus: status });
  });
  it('caps exponential retries and respects Retry-After without exposing server content', async () => {
    expect(Array.from({ length: MAX_SYNC_RETRIES }, (_, i) => retryDelay(i + 1))).toEqual([
      1000, 2000, 4000, 8000, 16000,
    ]);
    expect(retryDelay(2, 60000)).toBe(60000);
    try {
      await syncResponse(
        new Response('{"error":"private server content"}', {
          status: 503,
          headers: { 'Retry-After': '7', 'X-Bkit-Request-Id': 'safe-request' },
        }),
      );
    } catch (e) {
      expect(e).toBeInstanceOf(SyncFailure);
      expect(e).toMatchObject({ kind: 'server', retryAfterMs: 7000, requestId: 'safe-request' });
      expect((e as Error).message).not.toContain('private server content');
    }
  });
  it('does not interpret malformed successful data as authentication expiry', async () => {
    await expect(syncResponse(new Response('broken'))).rejects.toMatchObject({
      kind: 'invalid-data',
    });
  });
});
