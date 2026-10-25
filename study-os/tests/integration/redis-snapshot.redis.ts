import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newState, stateSchema } from '../../src/model';

const bin = process.env.REDIS_BIN || '';
const dir = mkdtempSync(join(tmpdir(), 'bkit-redis-'));
const socket = join(dir, 'redis.sock');
let server: ChildProcess;
const command = (...args: string[]) =>
  JSON.parse(
    execFileSync(join(bin, 'redis-cli'), ['-s', socket, '--json', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
const script = readFileSync(new URL('../../server/privateApi.ts', import.meta.url), 'utf8').match(
  /const syncScript = `([\s\S]*?)`;/,
)![1];
const save = (version: number, data: unknown) =>
  command('EVAL', script, '2', 'synthetic-owner', 'synthetic-owner-legacy', String(version), JSON.stringify(data));
beforeAll(async () => {
  server = spawn(
    join(bin, 'redis-server'),
    ['--port', '0', '--unixsocket', socket, '--save', '', '--appendonly', 'no'],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if (command('PING') === 'PONG') return;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Isolated Redis failed to start');
});
afterAll(async () => {
  if (server?.exitCode === null) {
    const exited = new Promise((r) => server.once('exit', r));
    server.kill();
    await exited;
  }
  rmSync(dir, { recursive: true, force: true });
});
it('clears only legacy owner snapshot after a successful new-namespace write', () => {
  command('DEL', 'synthetic-owner', 'synthetic-owner-legacy');
  command('SET', 'synthetic-owner-legacy', '{"version":3,"data":{"tasks":{}}}');
  command('SET', 'unrelated-session', 'private-session-placeholder');
  expect(save(1, newState())).toEqual([0, 0]);
  expect(command('EXISTS', 'synthetic-owner-legacy')).toBe(1);
  expect(save(0, newState())).toEqual([1, 1]);
  expect(command('EXISTS', 'synthetic-owner-legacy')).toBe(0);
  expect(command('GET', 'unrelated-session')).toBe('private-session-placeholder');
  command('DEL', 'synthetic-owner');
});

it('preserves an empty learning state through the actual production Lua EVAL', () => {
  const state = newState();
  state.plan = [];
  state.active = null;
  state.undo = null;
  expect(save(0, state)).toEqual([1, 1]);
  const raw = command('GET', 'synthetic-owner');
  const record = JSON.parse(raw);
  expect(record.data).toEqual(state);
  expect(stateSchema.safeParse(record.data).success).toBe(true);
});
it('preserves JSON types, nested arrays and null and enforces CAS after lost responses', () => {
  command('DEL', 'synthetic-owner');
  const data = { empty: [], object: {}, nested: [[], {}, null, [1, 2]], null: null };
  expect(save(0, data)).toEqual([1, 1]);
  expect(JSON.parse(command('GET', 'synthetic-owner')).data).toEqual(data);
  // A committed write whose response was lost must not overwrite another device.
  expect(save(0, { otherDevice: true })).toEqual([0, 1]);
  const before = command('GET', 'synthetic-owner');
  for (let i = 0; i < 10; i++) expect(command('GET', 'synthetic-owner')).toBe(before);
  expect(save(1, data)).toEqual([1, 2]);
});

it('round trips populated records and repairs only proven empty array fields with a verified backup', async () => {
  const { planSnapshotRecovery, backupSnapshot, recoveryScript } =
    await import('../../server/snapshotRecovery');
  const state = newState();
  state.plan = [];
  state.active = null;
  state.undo = null;
  state.tasks = [
    {
      id: 'task-1',
      subject: 'math',
      title: 'Synthetic',
      kind: '숙제',
      due: null,
      priority: 1,
      minutes: 30,
      remaining: 30,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    },
  ];
  state.schedules = [
    {
      id: 'schedule-1',
      title: 'Synthetic',
      subject: 'math',
      kind: 'school',
      days: [1],
      start: '09:00',
      end: '10:00',
      prep: 0,
      travel: 0,
      buffer: 0,
      materials: '',
      date: null,
      excluded: [],
    },
  ];
  state.sessions = [
    {
      id: 'session-1',
      taskId: 'task-1',
      subject: 'math',
      action: 'Synthetic',
      started: '2026-10-25T00:00:00Z',
      ended: '2026-10-25T00:01:00Z',
      seconds: 60,
      target: 1,
      problems: 1,
      concepts: '',
      rating: '보통',
      reason: '',
      pauses: [],
      mistake: '',
      reviewDate: null,
      workspace: { problem: 'Synthetic', source: '', attempts: [] },
    },
  ];
  stateSchema.parse(state);
  command('DEL', 'synthetic-owner');
  expect(save(0, state)).toEqual([1, 1]);
  expect(JSON.parse(command('GET', 'synthetic-owner')).data).toEqual(state);
  const legacy =
    "redis.call('SET', KEYS[1], cjson.encode({version=2, data=cjson.decode(ARGV[1])})) return 1";
  command('EVAL', legacy, '1', 'synthetic-owner', JSON.stringify(state));
  const raw = command('GET', 'synthetic-owner');
  expect(stateSchema.safeParse(JSON.parse(raw).data).success).toBe(false);
  const plan = planSnapshotRecovery(raw);
  expect(plan.counts).toMatchObject({ tasks: 1, schedules: 1, sessions: 1 });
  expect(plan.repairedPaths).toContain('sessions.0.workspace.attempts');
  const backup = join(dir, 'original.json');
  expect(backupSnapshot(raw, backup)).toBe(plan.sha256);
  expect(() => backupSnapshot(raw, backup)).toThrow();
  // Restore original bytes to a different isolated key before allowing repair.
  command('SET', 'synthetic-restore', readFileSync(backup, 'utf8'));
  expect(command('GET', 'synthetic-restore')).toBe(raw);
  expect(
    command(
      'EVAL',
      recoveryScript,
      '1',
      'synthetic-owner',
      raw,
      '2',
      JSON.stringify(JSON.parse(plan.replacement).data),
    ),
  ).toEqual([1, 3]);
  expect(JSON.parse(command('GET', 'synthetic-owner')).data).toEqual(state);
  expect(command('GET', 'synthetic-restore')).toBe(raw);
  expect(
    command('EVAL', recoveryScript, '1', 'synthetic-owner', raw, '2', JSON.stringify(state)),
  ).toEqual([0, 0]);
  for (const changed of [
    { ...JSON.parse(raw), data: { ...JSON.parse(raw).data, tasks: { lost: 'record' } } },
    { ...JSON.parse(raw), data: { ...JSON.parse(raw).data, unknown: 'preserve me' } },
    { ...JSON.parse(raw), data: { ...JSON.parse(raw).data, tasks: undefined } },
  ]) {
    expect(() => planSnapshotRecovery(JSON.stringify(changed))).toThrow();
  }
});

it('uses real Redis for API conflicts, outages, lost responses and remembered login after 10 seconds and server restart', async () => {
  const { createPrivateApi } = await import('../../server/privateApi');
  let failure: 'none' | 'before' | 'after' = 'none';
  const fetcher: typeof fetch = async (_url, init) => {
    const args = JSON.parse(init!.body as string) as string[];
    if (args[0] === 'EVAL' && failure === 'before') {
      failure = 'none';
      throw new Error('Synthetic connection failure');
    }
    const result = command(...args);
    if (args[0] === 'EVAL' && failure === 'after') {
      failure = 'none';
      throw new Error('Synthetic lost response');
    }
    return new Response(JSON.stringify({ result }));
  };
  const env = {
    BKIT_OWNER_EMAIL: 'synthetic@example.com',
    BKIT_GOOGLE_CLIENT_ID: 'synthetic-client',
    UPSTASH_REDIS_REST_URL: 'https://synthetic.invalid',
    UPSTASH_REDIS_REST_TOKEN: 'synthetic',
  };
  const start = async () => {
    const app = createPrivateApi(env, {
      fetcher,
      verify: async (token) => token === 'synthetic-google',
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    const address = server.address() as { port: number };
    return {
      root: `http://127.0.0.1:${address.port}`,
      close: async () => {
        server.closeAllConnections();
        await new Promise<void>((r) => server.close(() => r()));
      },
    };
  };
  let api = await start();
  const google = { Authorization: 'Bearer synthetic-google', 'Content-Type': 'application/json' };
  const state = newState();
  state.active = null;
  state.undo = null;
  state.plan = [];
  try {
    expect((await fetch(api.root + '/api/sync')).status).toBe(401);
    const issued = await (
      await fetch(api.root + '/api/session', { method: 'POST', headers: google })
    ).json();
    const remembered = {
      Authorization: 'Bearer ' + issued.token,
      'Content-Type': 'application/json',
    };
    const put = (expectedVersion: number) =>
      fetch(api.root + '/api/sync', {
        method: 'PUT',
        headers: remembered,
        body: JSON.stringify({ expectedVersion, state }),
      });
    const get = async () => (await fetch(api.root + '/api/sync', { headers: remembered })).json();
    failure = 'before';
    expect((await put(0)).status).toBe(503);
    expect(await get()).toEqual({ version: 0, state: null });
    failure = 'after';
    expect((await put(0)).status).toBe(503);
    expect(await get()).toEqual({ version: 1, state });
    expect((await put(0)).status).toBe(409);
    const concurrent = await Promise.all([put(1), put(1)]);
    expect(concurrent.map((r) => r.status).sort()).toEqual([200, 409]);
    const before = await get();
    expect(before).toEqual({ version: 2, state });
    await api.close();
    await new Promise((r) => setTimeout(r, 10000));
    api = await start();
    // The client reuses its saved sync credential; no new Google sign-in is needed.
    expect(await get()).toEqual(before);
    expect(
      (await fetch(api.root + '/api/briefing', { method: 'POST', headers: remembered, body: '{}' }))
        .status,
    ).toBe(401);
    for (let i = 0; i < 3; i++) expect(await get()).toEqual(before);
  } finally {
    await api.close();
  }
}, 20000);
