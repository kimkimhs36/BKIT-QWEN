import { describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import { createPrivateApi } from '../server/privateApi';
import { RedisBudget } from '../server/redisBudget';

const env = {
  BKIT_OWNER_EMAIL: 'owner@example.com',
  BKIT_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
  AI_API_KEY: 'synthetic-key',
  BKIT_AI_LIVE: 'true',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-token',
};
async function withServer(app: Express, run: (root: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    await run('http://127.0.0.1:' + (typeof address === 'object' && address ? address.port : 0));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
const headers = {
  Authorization: 'Bearer test-token',
  'Content-Type': 'application/json',
  Origin: 'https://teambkit.com',
};
const body = JSON.stringify({ text: '수학 학습지 20문제' });
const task = {
  title: '수학 학습지',
  subject: '수학',
  kind: '숙제',
  due: null,
  dueTime: null,
  quantityUnit: 'problems',
  quantityTotal: 20,
  minutes: null,
  sourceText: '수학 학습지 20문제',
};
const modelResponse = (value: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }],
    }),
  );

describe('private production briefing', () => {
  it('boots without secrets, exposes no secret values, and refuses paid mode without durable budget', async () => {
    const fetcher = vi.fn();
    await withServer(
      createPrivateApi(
        { ...env, UPSTASH_REDIS_REST_TOKEN: undefined },
        { fetcher, verify: async () => true },
      ),
      async (root) => {
        const health = await (await fetch(root + '/api/health')).json();
        expect(health).toMatchObject({
          mode: 'demo',
          budgetConfigured: false,
          dailyKRW: 1000,
          model: 'deepseek-flash',
        });
        const res = await fetch(root + '/api/briefing', { method: 'POST', headers, body });
        expect(res.status).toBe(503);
        expect(fetcher).not.toHaveBeenCalled();
        expect(JSON.stringify(health)).not.toContain('synthetic-key');
      },
    );
  });
  it('rejects missing/incorrect owner authentication and hostile origins before all paid calls', async () => {
    const fetcher = vi.fn(),
      reserve = vi.fn();
    await withServer(
      createPrivateApi(env, { fetcher, budget: { reserve }, verify: async () => false }),
      async (root) => {
        expect(
          (await fetch(root + '/api/briefing', { method: 'POST', headers, body })).status,
        ).toBe(401);
        expect(
          (
            await fetch(root + '/api/briefing', {
              method: 'POST',
              headers: { ...headers, Origin: 'https://other.example' },
              body,
            })
          ).status,
        ).toBe(403);
        expect(reserve).not.toHaveBeenCalled();
        expect(fetcher).not.toHaveBeenCalled();
      },
    );
  });
  it('requires global reservation before a provider call and never bypasses an exhausted ledger', async () => {
    const fetcher = vi.fn(),
      reserve = vi.fn(async () => {
        throw new Error('Daily cap');
      });
    await withServer(
      createPrivateApi(env, { fetcher, budget: { reserve }, verify: async () => true }),
      async (root) => {
        expect(
          (await fetch(root + '/api/briefing', { method: 'POST', headers, body })).status,
        ).toBe(503);
        expect(reserve).toHaveBeenCalledOnce();
        expect(fetcher).not.toHaveBeenCalled();
      },
    );
  });
  it('sends text only, disables thinking, caps output, and returns validated unconfirmed proposals', async () => {
    const reserve = vi.fn(async () => ({ calls: 1, reservedKRW: 10 }));
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      expect(reserve).toHaveBeenCalledOnce();
      const payload = JSON.parse(options.body as string);
      expect(payload).toMatchObject({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        max_tokens: 2200,
      });
      expect(payload.messages[1].content).toBe('수학 학습지 20문제');
      return modelResponse({ missions: [task] });
    }) as unknown as typeof fetch;
    await withServer(
      createPrivateApi(env, { fetcher, budget: { reserve }, verify: async () => true }),
      async (root) => {
        const res = await fetch(root + '/api/briefing', { method: 'POST', headers, body });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ mode: 'live', missions: [task] });
      },
    );
  });
  it('rejects invented evidence and impossible dates without returning usable missions', async () => {
    for (const bad of [
      { ...task, sourceText: 'not in input' },
      { ...task, due: '2026-02-30' },
    ]) {
      await withServer(
        createPrivateApi(env, {
          verify: async () => true,
          budget: { reserve: async () => ({ calls: 1, reservedKRW: 10 }) },
          fetcher: async () => modelResponse({ missions: [bad] }),
        }),
        async (root) => {
          const res = await fetch(root + '/api/briefing', { method: 'POST', headers, body });
          expect(res.status).toBe(503);
          expect((await res.json()).missions).toBeUndefined();
        },
      );
    }
  });
});
describe('shared daily reservation wire protocol', () => {
  it('uses one atomic EVAL, KST day bucket and integer conservative KRW units', async () => {
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      const command = JSON.parse(options.body as string);
      expect(command[0]).toBe('EVAL');
      expect(command[2]).toBe('1');
      expect(command[3]).toMatch(/^bkit:ai-budget:20\d{2}-\d{2}-\d{2}$/);
      expect(command[4]).toBe('10000000');
      expect(command[5]).toBe('1000000000');
      return new Response(JSON.stringify({ result: [1, 10000000] }));
    }) as unknown as typeof fetch;
    expect(
      await new RedisBudget(
        { url: 'https://example.upstash.io', token: 'synthetic', dailyKRW: 1000, calls: 60 },
        fetcher,
      ).reserve(0.005),
    ).toEqual({ calls: 1, reservedKRW: 10 });
  });
  it('fails closed on invalid replies, HTTP errors and exhausted budget', async () => {
    for (const response of [
      new Response('', { status: 500 }),
      new Response(JSON.stringify({ result: 'OK' })),
      new Response(JSON.stringify({ result: [-1, 1000000000] })),
    ]) {
      const budget = new RedisBudget(
        { url: 'https://example.upstash.io', token: 'synthetic', dailyKRW: 1000, calls: 60 },
        async () => response,
      );
      await expect(budget.reserve(0.005)).rejects.toThrow();
    }
  });
});
