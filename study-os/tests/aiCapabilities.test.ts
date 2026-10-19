import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
it('never sends a token or study context to an unsupported API route even if enabled', async () => {
  vi.stubEnv('VITE_AI_API_ENABLED', 'true');
  vi.stubGlobal('navigator', { onLine: true });
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          service: 'bkit-api',
          mode: 'configured',
          features: { briefing: true, plan: false, coach: false, assistant: false },
        }),
      ),
  );
  vi.stubGlobal('fetch', fetcher);
  const { requestAI } = await import('../src/ai');
  for (const path of ['plan', 'coach', 'assistant'] as const)
    await expect(
      requestAI(path, { question: 'private homework' }, 'private-token'),
    ).rejects.toThrow('지원하지');
  expect(fetcher).toHaveBeenCalledTimes(3);
  for (const [url, options] of fetcher.mock.calls as unknown as [string, RequestInit][]) {
    expect(url).toMatch(/\/api\/health$/);
    expect(options.body).toBeUndefined();
    expect(options.headers).toEqual({ Accept: 'application/json' });
  }
});
