import { z } from 'zod';
import { createHash } from 'node:crypto';
import { openSync, writeFileSync, fsyncSync, closeSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { stateSchema } from '../src/model.js';

const envelope = z.object({ version: z.number().int().min(0).max(1000000), data: stateSchema });
// Only schema-declared arrays. No unknown, missing, nonempty object or scalar is repaired.
const arrayPath =
  /^(tasks|schedules|sessions|plan|undo|grades|reviewsDone|reviewProgress)$|^schedules\.\d+\.(days|excluded)$|^(sessions\.\d+|active)\.(pauses|segments|workspace\.attempts)$/;
export function planSnapshotRecovery(raw: string) {
  const original: unknown = JSON.parse(raw);
  const candidate = structuredClone(original);
  const result = envelope.safeParse(candidate);
  const repairedPaths: string[] = [];
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path;
      if (
        issue.code !== 'invalid_type' ||
        issue.expected !== 'array' ||
        path[0] !== 'data' ||
        !arrayPath.test(path.slice(1).join('.'))
      )
        throw new Error('Ambiguous snapshot: manual review required');
      let parent = candidate as Record<string | number, unknown>;
      for (const part of path.slice(0, -1)) parent = parent[part] as typeof parent;
      const key = path[path.length - 1];
      const value = parent[key];
      if (
        !value ||
        Array.isArray(value) ||
        typeof value !== 'object' ||
        Object.keys(value).length !== 0
      )
        throw new Error('Nonempty or missing array: manual review required');
      parent[key] = [];
      repairedPaths.push(path.slice(1).join('.'));
    }
  }
  const valid = envelope.parse(candidate);
  // Zod strips unknown fields: refuse any such loss, including nested unknown fields.
  if (!isDeepStrictEqual(valid, candidate))
    throw new Error('Unrecognized fields: manual review required');
  const counts = Object.fromEntries(
    ['tasks', 'schedules', 'sessions', 'plan', 'grades', 'reviewsDone', 'reviewProgress'].map(
      (key) => [key, (valid.data as unknown as Record<string, unknown[]>)[key]?.length ?? null],
    ),
  );
  return {
    version: valid.version,
    repairedPaths,
    counts,
    sha256: createHash('sha256').update(raw).digest('hex'),
    replacement: JSON.stringify(candidate),
  };
}

/** Exclusive private file, durable flush and byte-for-byte readback before any Redis write. */
export function backupSnapshot(raw: string, absolutePath: string) {
  const fd = openSync(absolutePath, 'wx', 0o600);
  try {
    writeFileSync(fd, raw, 'utf8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  if (readFileSync(absolutePath, 'utf8') !== raw) throw new Error('Backup verification failed');
  return createHash('sha256').update(raw).digest('hex');
}

// Use only after independent backup/restore verification and review of a recovery plan.
// Exact original bytes protect against concurrent changes, including same-version edits.
// Advance version so already-open clients cannot silently overwrite a repaired snapshot.
export const recoveryScript = `
local current = redis.call('GET', KEYS[1])
if current ~= ARGV[1] then return {0, 0} end
local ok, record = pcall(cjson.decode, current)
if not ok or type(record) ~= 'table' or record.version ~= tonumber(ARGV[2]) then return {-3, 0} end
local next = record.version + 1
redis.call('SET', KEYS[1], '{"version":' .. string.format('%.0f', next) .. ',"data":' .. ARGV[3] .. '}', 'KEEPTTL')
return {1, next}
`;
