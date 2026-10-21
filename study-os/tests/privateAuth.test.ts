import { describe, expect, it, vi } from 'vitest';
import { checkPrivateIdentity } from '../src/privateAuth';
describe('private AI authorization after Google sign-in', () => {
  it('sends the memory-only Bearer token to the auth endpoint and requires a positive server result', async () => {
    const fetcher = vi.fn(async () => new Response('{"authenticated":true}'));
    await checkPrivateIdentity('https://bkit-api.vercel.app', 'synthetic-token', fetcher);
    expect(fetcher).toHaveBeenCalledWith(
      'https://bkit-api.vercel.app/api/auth-check',
      expect.objectContaining({
        headers: { Authorization: 'Bearer synthetic-token' },
        cache: 'no-store',
      }),
    );
  });
  it('never labels a Google login as BKIT authorization on rejected, unavailable or malformed responses', async () => {
    for (const response of [
      new Response('{}', { status: 401 }),
      new Response('{}', { status: 403 }),
      new Response('{}', { status: 503 }),
      new Response('{"authenticated":false}'),
      new Response('<html>'),
    ]) {
      await expect(
        checkPrivateIdentity(
          'https://bkit-api.vercel.app',
          'synthetic-token',
          async () => response,
        ),
      ).rejects.toThrow();
    }
  });
});
