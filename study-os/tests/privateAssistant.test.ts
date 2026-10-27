import { describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import { createPrivateApi } from '../server/privateApi';

const env = {
  BKIT_OWNER_EMAIL: 'owner@example.com',
  BKIT_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
  AI_API_KEY: 'synthetic-secret-not-a-real-key',
  BKIT_AI_LIVE: 'true',
  BKIT_ASSISTANT_LIVE: 'true',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-redis',
};
const headers = {
  Authorization: 'Bearer test-google-access-token',
  'Content-Type': 'application/json',
  Origin: 'https://teambkit.com',
};
const payload = JSON.stringify({ question: '오늘 무엇부터 공부해야 할까?' });
const response = (content: unknown, finish_reason = 'stop') =>
  new Response(JSON.stringify({
    choices: [{ finish_reason, message: { content: JSON.stringify(content) } }],
  }));
async function withServer(app: Express, run: (root: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const addr = server.address();
  try {
    await run('http://127.0.0.1:' + (typeof addr === 'object' && addr ? addr.port : 0));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('opt-in BKIT live AI assistant', () => {
  it('is disabled by default, without changing briefing availability or charging money', async () => {
    const reserve = vi.fn(), fetcher = vi.fn();
    const app = createPrivateApi({ ...env, BKIT_ASSISTANT_LIVE: undefined }, {
      budget: { reserve }, verify: async () => true, fetcher,
    });
    await withServer(app, async (root) => {
      const health = await (await fetch(root + '/api/health')).json();
      expect(health.features).toMatchObject({ briefing: true, assistant: false });
      expect((await (await fetch(root + '/api/config')).json()).assistantEnabled).toBe(false);
      expect((await fetch(root + '/api/assistant', { method: 'POST', headers, body: payload })).status).toBe(503);
    });
    expect(reserve).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires owner authentication and approved origin before any AI usage', async () => {
    const reserve = vi.fn(), fetcher = vi.fn();
    const app = createPrivateApi(env, {
      budget: { reserve }, fetcher, verify: async () => false,
    });
    await withServer(app, async (root) => {
      const health = await (await fetch(root + '/api/health')).json();
      expect(health.features.assistant).toBe(true);
      expect((await fetch(root + '/api/assistant', { method: 'POST', headers, body: payload })).status).toBe(401);
      expect((await fetch(root + '/api/assistant', { method: 'POST', headers: { ...headers, Origin: 'https://bad.example' }, body: payload })).status).toBe(403);
    });
    expect(reserve).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects extra/private fields, invalid context and empty questions before charging', async () => {
    const reserve = vi.fn(), fetcher = vi.fn();
    await withServer(createPrivateApi(env, {
      budget: { reserve }, fetcher, verify: async () => true,
    }), async root => {
      for (const input of [
        { question: '' },
        { question: '안녕', notes: 'should never be sent' },
        { question: '안녕', context: { tasks: [{ secret: 'x' }] } },
      ]) {
        expect((await fetch(root + '/api/assistant', {
          method: 'POST', headers, body: JSON.stringify(input),
        })).status).toBe(400);
      }
    });
    expect(reserve).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reserves budget first and makes one read-only DeepSeek request with no silent writes', async () => {
    const reserve = vi.fn(async () => ({ calls: 1, reservedKRW: 2 }));
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      expect(reserve).toHaveBeenCalledOnce();
      expect(String(_url)).toContain('api.deepseek.com/chat/completions');
      const body = JSON.parse(options.body as string);
      expect(body).toMatchObject({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        max_tokens: 900,
      });
      expect(body.messages[1].content).toContain('오늘 무엇부터');
      expect(body.messages[1].content).not.toContain('private info');
      return response({ answer: '가장 가까운 마감의 과제부터 5분 시작하자.' });
    }) as unknown as typeof fetch;
    await withServer(createPrivateApi(env, {
      budget: { reserve }, fetcher, verify: async () => true,
    }), async root => {
      const res = await fetch(root + '/api/assistant', { method: 'POST', headers, body: payload });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        mode: 'live', model: 'deepseek-flash', answer: '가장 가까운 마감의 과제부터 5분 시작하자.',
      });
    });
    expect(reserve).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails closed when shared budget is exhausted, without provider calls', async () => {
    const fetcher = vi.fn(), reserve = vi.fn(async () => { throw new Error('Daily cap'); });
    await withServer(createPrivateApi(env, {
      budget: { reserve }, fetcher, verify: async () => true,
    }), async root => {
      expect((await fetch(root + '/api/assistant', { method: 'POST', headers, body: payload })).status).toBe(503);
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects unfinished or malformed model responses without leaking provider data or credentials', async () => {
    for (const provider of [
      async () => response({ answer: 'bad' }, 'length'),
      async () => response({ notAnAnswer: 'bad' }),
      async () => new Response('secret-provider-content', { status: 401 }),
    ]) {
      const app = createPrivateApi(env, {
        budget: { reserve: async () => ({ calls: 1, reservedKRW: 1 }) },
        verify: async () => true, fetcher: provider,
      });
      await withServer(app, async root => {
        const res = await fetch(root + '/api/assistant', { method: 'POST', headers, body: payload });
        expect(res.status).toBe(503);
        const bodyText = await res.text();
        expect(bodyText).not.toContain('secret-provider-content');
        expect(bodyText).not.toContain('synthetic-secret');
      });
    }
  });
});
