import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createJuggernautApi, juggernautWriteScript } from '../server/juggernautApi';
import { emptyDocument } from '../src/juggernaut/engine';
const env = {
  BKIT_OWNER_EMAIL: 'owner@example.test',
  BKIT_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
};
async function fixture(
  run: (url: string, map: Map<string, string>, commands: string[][]) => Promise<void>,
  fault = false,
) {
  const map = new Map<string, string>(),
    commands: string[][] = [];
  const command = async (args: string[]) => {
    commands.push(args);
    if (fault) throw Error('store offline');
    if (args[0] === 'GET') return map.get(args[1]) ?? null;
    if (args[0] === 'EVAL') {
      const current = JSON.parse(map.get(args[3]) || '{"version":0}');
      if (current.version !== Number(args[4])) return [0, current.version];
      const version = current.version + 1;
      map.set(args[3], JSON.stringify({ version, document: JSON.parse(args[5]) }));
      return [1, version];
    }
    throw Error('Unexpected mutation');
  };
  const app = createJuggernautApi(env, { command, verify: async (token) => token === 'owner' }),
    server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, map, commands);
  } finally {
    server.close();
  }
}
const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
describe('additive owner-scoped Juggernaut API', () => {
  it('denies anonymous, other-user, forged userId, and foreign-origin requests', async () =>
    fixture(async (url) => {
      expect((await fetch(url + '/api/juggernaut')).status).toBe(401);
      expect(
        (await fetch(url + '/api/juggernaut', { headers: { Authorization: 'Bearer friend' } }))
          .status,
      ).toBe(401);
      expect(
        (
          await fetch(url + '/api/juggernaut', {
            headers: { ...headers, Origin: 'https://evil.test' },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(url + '/api/juggernaut', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              expectedVersion: 0,
              document: emptyDocument(),
              userId: 'someone',
            }),
          })
        ).status,
      ).toBe(400);
    }));
  it('accepts the existing remembered owner session without issuing another credential', async () =>
    fixture(async (url, map, commands) => {
      const token = 'bkit_sync_' + 'a'.repeat(64);
      const { createHash } = await import('node:crypto');
      const identity = createHash('sha256')
        .update(env.BKIT_OWNER_EMAIL + ':' + env.BKIT_GOOGLE_CLIENT_ID)
        .digest('hex');
      map.set(
        'bkit:sync-session:v1:' + identity + ':' + createHash('sha256').update(token).digest('hex'),
        String(Date.now() + 60000),
      );
      expect(
        (await fetch(url + '/api/juggernaut', { headers: { Authorization: 'Bearer ' + token } }))
          .status,
      ).toBe(200);
      expect(commands.every((c) => c[0] === 'GET')).toBe(true);
    }));
  it('acknowledges writes, rejects duplicate/stale requests, never touches existing study keys', async () =>
    fixture(async (url, map, commands) => {
      const body = JSON.stringify({ expectedVersion: 0, document: emptyDocument() });
      const first = await fetch(url + '/api/juggernaut', { method: 'PUT', headers, body });
      expect(first.status).toBe(200);
      expect((await first.json()).version).toBe(1);
      const duplicate = await fetch(url + '/api/juggernaut', { method: 'PUT', headers, body });
      expect(duplicate.status).toBe(409);
      const get = await fetch(url + '/api/juggernaut', { headers });
      expect((await get.json()).version).toBe(1);
      expect([...map.keys()].every((k) => k.startsWith('bkit:juggernaut:v1:'))).toBe(true);
      expect(commands.filter((c) => c[0] === 'EVAL').every((c) => c[2] === '1')).toBe(true);
      expect(juggernautWriteScript).not.toContain("'DEL'");
    }));
  it('rejects malformed cloud originals and preserves their bytes', async () =>
    fixture(async (url, map) => {
      const { createHash } = await import('node:crypto');
      const key =
        'bkit:juggernaut:v1:' + createHash('sha256').update(env.BKIT_OWNER_EMAIL).digest('hex');
      map.set(key, 'broken');
      expect(
        (
          await fetch(url + '/api/juggernaut', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ expectedVersion: 0, document: emptyDocument() }),
          })
        ).status,
      ).toBe(503);
      expect(map.get(key)).toBe('broken');
    }));
  it('distinguishes a session-store outage from expiry', async () =>
    fixture(async (url) => {
      const r = await fetch(url + '/api/juggernaut', {
        headers: { Authorization: 'Bearer bkit_sync_' + 'a'.repeat(64) },
      });
      expect(r.status).toBe(503);
    }, true));
});
