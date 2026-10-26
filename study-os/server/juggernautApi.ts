import express from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { verifyBkitOwner } from './auth.js';
import { rememberSessions, isStudySession } from './rememberSession.js';
import { legacyDocumentSchema as documentSchema, evidence } from '../src/juggernaut/engine.js';
import { concepts } from '../src/juggernaut/content.js';

// One additive key, no reads/writes/deletes of existing study snapshots.
export const juggernautWriteScript = `
local raw = redis.call('GET', KEYS[1])
local actual = 0
if raw then
  local ok, decoded = pcall(cjson.decode, raw)
  if not ok or type(decoded) ~= 'table' then return {-1,0} end
  actual = tonumber(decoded.version) or -1
end
if actual ~= tonumber(ARGV[1]) then return {0,actual} end
local next = actual + 1
redis.call('SET', KEYS[1], '{"version":' .. next .. ',"document":' .. ARGV[2] .. '}')
return {1,next}
`;
export function createJuggernautApi(
  env: Record<string, string | undefined>,
  deps: {
    fetcher?: typeof fetch;
    verify?: typeof verifyBkitOwner;
    command?: (args: string[]) => Promise<unknown>;
  } = {},
) {
  const app = express(),
    fetcher = deps.fetcher || fetch;
  app.disable('x-powered-by');
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const ready = !!env.BKIT_OWNER_EMAIL && !!env.BKIT_GOOGLE_CLIENT_ID && !!url && !!token;
  const command =
    deps.command ||
    (async (args: string[]) => {
      if (!url?.startsWith('https://') || !token) throw Error('Store unavailable');
      const r = await fetcher(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r.ok) throw Error('Store unavailable');
      const data = await r.json();
      if (!data || !('result' in data) || data.error) throw Error('Invalid store response');
      return data.result as unknown;
    });
  const sessions = rememberSessions(
    command,
    env.BKIT_OWNER_EMAIL || '',
    env.BKIT_GOOGLE_CLIENT_ID || '',
  );
  const key =
    'bkit:juggernaut:v1:' +
    (env.VERCEL_ENV === 'preview' ? 'preview:' : '') +
    createHash('sha256')
      .update((env.BKIT_OWNER_EMAIL || '').trim().toLowerCase())
      .digest('hex');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    const allowed = [
      'https://teambkit.com',
      ...(env.VERCEL_ENV === 'preview'
        ? [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter(Boolean).map((v) => 'https://' + v)
        : []),
      ...(env.BKIT_JUGGERNAUT_PREVIEW_ORIGINS || '').split(',').filter(Boolean),
    ];
    if (origin && !allowed.includes(origin))
      return void res.status(403).json({ error: 'Origin rejected' });
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return void res.status(204).end();
    next();
  });
  app.get('/api/juggernaut/health', (_req, res) =>
    res.json({
      service: 'bkit-juggernaut',
      sourceCommit: env.VERCEL_GIT_COMMIT_SHA || null,
      configured: ready,
      storage: 'isolated-v1',
      auth: 'existing-owner-session',
    }),
  );
  app.use(async (req, res, next) => {
    if (!ready && !deps.command)
      return void res.status(503).json({ error: '수능관 클라우드 연결 준비 중' });
    const credential = /^Bearer ([^\s]+)$/.exec(req.get('Authorization') || '')?.[1];
    try {
      const valid =
        credential &&
        (isStudySession(credential)
          ? await sessions.valid(credential)
          : await (deps.verify || verifyBkitOwner)(
              credential,
              env.BKIT_OWNER_EMAIL!,
              env.BKIT_GOOGLE_CLIENT_ID!,
              fetcher,
            ));
      if (!valid) return void res.status(401).json({ error: '기존 BKIT 본인 계정 연결 필요' });
      next();
    } catch {
      res.status(503).json({ error: '로그인 확인 저장소 연결 실패' });
    }
  });
  const envelope = z
    .object({ version: z.number().int().nonnegative(), document: documentSchema })
    .strict();
  app.get('/api/juggernaut', async (_req, res) => {
    try {
      const raw = await command(['GET', key]);
      res.json(
        raw === null ? { version: 0, document: null } : envelope.parse(JSON.parse(String(raw))),
      );
    } catch {
      res.status(503).json({ error: '수능관 원본 읽기 실패' });
    }
  });
  app.put('/api/juggernaut', express.json({ limit: '2mb' }), async (req, res) => {
    const body = z
      .object({
        expectedVersion: z.number().int().nonnegative().max(1e9),
        document: documentSchema,
      })
      .strict()
      .safeParse(req.body);
    if (!body.success) return void res.status(400).json({ error: 'Invalid learning data' });
    if (body.data.document.attempts.some((a) => a.at > Date.now() + 300000 || a.updatedAt < a.at))
      return void res.status(400).json({ error: 'Invalid timestamps' });
    try {
      const raw = await command(['GET', key]);
      if (raw !== null) envelope.parse(JSON.parse(String(raw))); // Fail closed on corrupt/unknown data.
      const result = await command([
        'EVAL',
        juggernautWriteScript,
        '1',
        key,
        String(body.data.expectedVersion),
        JSON.stringify(body.data.document),
      ]);
      if (!Array.isArray(result) || result.length !== 2 || !result.every(Number.isSafeInteger))
        throw Error();
      if (result[0] === 0) return void res.status(409).json({ error: 'Version conflict' });
      if (result[0] !== 1) throw Error();
      // Correctness/readiness are recomputed from answers, never client-provided grades.
      res.json({
        version: result[1],
        evidence: concepts.map((c) => evidence(body.data.document, c.id)),
      });
    } catch {
      res.status(503).json({ error: '수능관 저장 확인 실패' });
    }
  });
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(400).json({ error: 'Invalid request' }),
  );
  return app;
}
