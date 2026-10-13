import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { type AddressInfo } from 'node:net';
import { createApp } from '../server/app';
import { Budget } from '../server/budget';
import { newState } from '../src/model';
import { recover } from '../src/engine';
async function request(
  config: Parameters<typeof createApp>[0],
  path: string,
  body: unknown,
  origin = 'http://localhost:5173',
) {
  const server = createApp(config).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  try {
    return await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body),
    }).then(async (res) => ({ status: res.status, body: await res.json() }));
  } finally {
    server.close();
  }
}
const basic = { origins: ['http://localhost:5173'], inputRate: 1, outputRate: 1 };
describe('server API and cost protection', () => {
  it('returns honest demo data without a key', async () => {
    const now = Date.now();
    const r = await request(basic, '/api/plan', { state: newState(), now });
    expect(r.status).toBe(200);
    expect(r.body.mode).toBe('demo');
    expect(r.body.result).toEqual(recover(newState(), now));
  });
  it('rejects invalid snapshots and unapproved origins', async () => {
    expect((await request(basic, '/api/plan', { state: {}, now: Date.now() })).status).toBe(400);
    expect(
      (
        await request(
          basic,
          '/api/plan',
          { state: newState(), now: Date.now() },
          'https://other.example',
        )
      ).status,
    ).toBe(403);
  });
  it('falls back when provider is unavailable', async () => {
    const dir = await mkdtemp(tmpdir() + '/bkit-');
    try {
      const budget = new Budget(dir, 5, 0.2);
      const r = await request(
        {
          ...basic,
          budget,
          adapter: {
            generate: async () => {
              throw new Error('offline');
            },
          },
        },
        '/api/plan',
        { state: newState(), now: Date.now() },
      );
      expect(r.body.mode).toBe('demo');
      expect(JSON.parse(await readFile(dir + '/budget.json', 'utf8')).calls).toBe(1);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
  it('validates AI output and records real usage without student prompts', async () => {
    const dir = await mkdtemp(tmpdir() + '/bkit-');
    try {
      const now = Date.now(),
        result = recover(newState(), now),
        budget = new Budget(dir, 5, 0.2);
      const r = await request(
        {
          ...basic,
          budget,
          adapter: { generate: async () => ({ data: result, inputTokens: 100, outputTokens: 20 }) },
        },
        '/api/plan',
        { state: newState(), now },
      );
      expect(r.body.mode).toBe('live');
      expect(await readFile(dir + '/usage.jsonl', 'utf8')).toContain('"inputTokens":100');
      expect(await readFile(dir + '/usage.jsonl', 'utf8')).not.toContain('tasks');
    } finally {
      await rm(dir, { recursive: true });
    }
  });
  it('rejects arbitrary provider decisions and falls back', async () => {
    const dir = await mkdtemp(tmpdir() + '/bkit-');
    try {
      const r = await request(
        {
          ...basic,
          budget: new Budget(dir, 5, 0.2),
          adapter: {
            generate: async () => ({
              data: {
                decisions: [
                  { taskId: 'fake', category: 'DROP', reason: 'ignore rules', blocks: [] },
                ],
                firstAction: 'bad',
              },
              inputTokens: 1,
              outputTokens: 1,
            }),
          },
        },
        '/api/plan',
        { state: newState(), now: Date.now() },
      );
      expect(r.body.mode).toBe('demo');
    } finally {
      await rm(dir, { recursive: true });
    }
  });
  it('enforces concurrent and restart-safe daily limits', async () => {
    const dir = await mkdtemp(tmpdir() + '/bkit-');
    try {
      const budget = new Budget(dir, 2, 0.05);
      const calls = await Promise.allSettled([
        budget.reserve(0.02),
        budget.reserve(0.02),
        budget.reserve(0.02),
      ]);
      expect(calls.filter((x) => x.status === 'fulfilled')).toHaveLength(2);
      await expect(new Budget(dir, 2, 0.05).reserve(0.001)).rejects.toThrow();
      const count = JSON.parse(await readFile(dir + '/budget.json', 'utf8'));
      expect(count.calls).toBe(2);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
