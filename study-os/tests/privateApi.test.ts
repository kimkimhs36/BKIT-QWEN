import { describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import { createPrivateApi } from '../server/privateApi';
import { RedisBudget } from '../server/redisBudget';
import { newState } from '../src/model';

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
  it('reports actionable provider status without exposing its body or key', async () => {
    for (const status of [400, 401, 402, 404, 429, 500]) {
      await withServer(
        createPrivateApi(env, {
          verify: async () => true,
          budget: { reserve: async () => ({ calls: 1, reservedKRW: 10 }) },
          fetcher: async () => new Response('sensitive-provider-body', { status }),
        }),
        async (root) => {
          const response = await fetch(root + '/api/briefing', { method: 'POST', headers, body });
          expect(response.status).toBe(503);
          const result = await response.json();
          expect(result.error).toContain('(' + status + ')');
          expect(JSON.stringify(result)).not.toContain('sensitive-provider-body');
          expect(JSON.stringify(result)).not.toContain('synthetic-key');
        },
      );
    }
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

describe('owner-only multi-device study snapshots', () => {
  const trial = async (perform: (root: string, inspect: () => string | null) => Promise<void>) => {
    let current: string | null = null;
    const fetcher = (async (_url: string | URL | Request, options?: RequestInit) => {
      const args = JSON.parse(String(options?.body)) as unknown[];
      if (args[0] === 'GET')
        return new Response(JSON.stringify({ result: current }), { status: 200 });
      if (args[0] === 'EVAL') {
        const expected = Number(args[4]);
        const previous: { version: number; data: unknown } | null =
          current ? JSON.parse(current) : null;
        const version = previous?.version ?? 0;
        if (expected !== version)
          return new Response(JSON.stringify({ result: [0, version] }), { status: 200 });
        current = JSON.stringify({ version: version + 1, data: JSON.parse(String(args[5])) });
        return new Response(JSON.stringify({ result: [1, version + 1] }), { status: 200 });
      }
      throw new Error('Unexpected remote command');
    }) as typeof fetch;
    await withServer(
      createPrivateApi(env, { fetcher, verify: async () => true }),
      (root) => perform(root, () => current),
    );
  };
  it('permits browser PUT preflight only for the BKIT origin', async () => {
    const fetcher = vi.fn();
    await withServer(createPrivateApi(env, {fetcher, verify: async () => true}), async root => {
      const allowed = await fetch(root+'/api/sync',{
        method:'OPTIONS',
        headers:{Origin:'https://teambkit.com','Access-Control-Request-Method':'PUT',
          'Access-Control-Request-Headers':'Authorization,Content-Type'},
      });
      expect(allowed.status).toBe(204);
      expect(allowed.headers.get('access-control-allow-methods')).toContain('PUT');
      const blocked = await fetch(root+'/api/sync',{method:'OPTIONS',headers:{Origin:'https://other.example'}});
      expect(blocked.status).toBe(403);
      expect(fetcher).not.toHaveBeenCalled();
    });
  });
  it('keeps records behind authentication and origin checks', async () => {
    const fetcher = vi.fn();
    await withServer(createPrivateApi(env, { fetcher, verify: async () => false }), async (root) => {
      expect((await fetch(root + '/api/sync', {headers})).status).toBe(401);
      expect((await fetch(root + '/api/sync', {headers: {...headers, Origin:'https://other.example'}})).status).toBe(403);
      expect(fetcher).not.toHaveBeenCalled();
    });
  });
  it('round-trips an owner snapshot and prevents stale device overwrites', async () => {
    await trial(async (root, inspect) => {
      const state = newState();
      state.settings.goal = '매일 20분 공부';
      const empty = await (await fetch(root + '/api/sync',{headers})).json();
      expect(empty).toEqual({version: 0, state: null});
      const first = await fetch(root + '/api/sync', {
        method:'PUT',headers,body:JSON.stringify({expectedVersion:0,state}),
      });
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({version:1});
      expect(inspect()).toContain('매일 20분 공부');
      const remote = await (await fetch(root+'/api/sync',{headers})).json();
      expect(remote.version).toBe(1);
      expect(remote.state.settings.goal).toBe('매일 20분 공부');
      const stale = await fetch(root+'/api/sync',{
        method:'PUT',headers,body:JSON.stringify({expectedVersion:0,state}),
      });
      expect(stale.status).toBe(409);
      expect((await stale.json()).version).toBe(1);
    });
  });
  it('rejects sync payloads that contain active timers, private photos or invalid state', async () => {
    await trial(async (root) => {
      const state = newState();
      const invalid = await fetch(root+'/api/sync',{
        method:'PUT',headers,body:JSON.stringify({expectedVersion:0,state:{...state,version:42}}),
      });
      expect(invalid.status).toBe(400);
      const bad = await fetch(root+'/api/sync',{
        method:'PUT',headers,body:JSON.stringify({expectedVersion:0,state:{...state,plan:[{id:'missing',taskId:'none',start:'2026-10-18T01:00:00Z',end:'2026-10-18T02:00:00Z',locked:false}]}}),
      });
      expect(bad.status).toBe(400);
    });
  });
});

describe('remembered sync sessions', () => {
  it('issues only after Google verification, stores hashes, restores sync, blocks AI and revokes', async () => {
    const records = new Map<string,string>();
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body)) as string[];
      let result: unknown = null;
      if (args[0] === 'SET') { records.set(args[1],args[2]); result='OK'; expect(args.slice(3)).toEqual(['EX','2592000']); }
      if (args[0] === 'GET') result=records.get(args[1]) ?? null;
      if (args[0] === 'DEL') result=Number(records.delete(args[1]));
      return new Response(JSON.stringify({result}));
    });
    await withServer(createPrivateApi(env,{fetcher:fetcher as typeof fetch,verify:async t=>t==='google-verified'}), async root => {
      expect((await fetch(root+'/api/session',{method:'POST',headers})).status).toBe(401);
      const issued = await fetch(root+'/api/session',{method:'POST',headers:{...headers,Authorization:'Bearer google-verified'}});
      expect(issued.status).toBe(200);
      const credential = await issued.json();
      expect(credential.token).toMatch(/^bkit_sync_[a-f0-9]{64}$/);
      expect([...records.keys()].join('')).not.toContain(credential.token);
      const remembered = {...headers,Authorization:'Bearer '+credential.token};
      expect((await fetch(root+'/api/sync',{headers:remembered})).status).toBe(200);
      expect((await fetch(root+'/api/briefing',{method:'POST',headers:remembered,body})).status).toBe(401);
      expect((await fetch(root+'/api/session',{method:'POST',headers:remembered})).status).toBe(401);
      expect((await fetch(root+'/api/sync',{headers:{...remembered,Origin:'https://other.example'}})).status).toBe(403);
      expect((await fetch(root+'/api/session',{method:'DELETE',headers:remembered})).status).toBe(204);
      expect((await fetch(root+'/api/sync',{headers:remembered})).status).toBe(401);
    });
  });
  it('fails closed if persistent storage is unavailable', async () => {
    await withServer(createPrivateApi(env,{fetcher:async()=>{throw Error('unavailable');},verify:async()=>true}), async root => {
      const token='bkit_sync_'+'a'.repeat(64);
      expect((await fetch(root+'/api/sync',{headers:{...headers,Authorization:'Bearer '+token}})).status).toBe(401);
      expect((await fetch(root+'/api/session',{method:'POST',headers})).status).toBe(503);
    });
  });
});
