import {
  paperManifestSchema,
  exportPaperBackup,
  assertPaperUnchanged,
  inspectPaperBackup,
  restoreInspectedPaper,
  type InspectedPaper,
} from './paperBackup';
import { z } from 'zod';
import { stateSchema, newState, uid, type State } from './model';
import { SLEEP_KEY, sleepSchema, type SleepState } from './sleep';
import { KEY } from './storage';
import { pauseQuick } from './quickTimer';
import { learning } from './learningEngine';
import { closeSegment } from './session';
import { LocalZipWriter, readLocalZip, sha256 } from './localZip';
import { photoIds, readVaultPhoto, addVaultPhoto, type Vault } from './photoVault';
export const BACKUP_KEYS = [
  KEY,
  SLEEP_KEY,
  'crashweek.v3',
  'bkit.landscape.v1',
  'bkit.atelier.draft.v1',
  'bkit.atelier.visited.v1',
  'bkit.juggernaut.skip-intro.v1',
  'bkit.juggernaut.visited.v1',
  'bkit.cloud-settings.v1',
];
export const JOURNAL_PREFIX = 'bkit.complete-backup.recovery.';
const fileMeta = z.object({
  path: z.string(),
  id: z.string().min(1).max(100),
  vault: z.enum(['study', 'sleep']),
  name: z.string().max(1000),
  mime: z.string().max(100),
  size: z
    .number()
    .int()
    .min(1)
    .max(20 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.object({
  format: z.literal('BKIT-COMPLETE-LOCAL'),
  schemaVersion: z.literal(1),
  appVersion: z.enum(['3.1', '3.2', '3.3', '3.4']),
  paper: paperManifestSchema.optional(),
  createdAt: z.string().datetime(),
  dataSha256: z.string().regex(/^[a-f0-9]{64}$/),
  photos: z.array(fileMeta).max(12000),
});
type Manifest = z.infer<typeof manifestSchema>;
type StoredKeys = Record<string, string | null>;
export function snapshotKeys(storage: Storage): StoredKeys {
  return Object.fromEntries(BACKUP_KEYS.map((key) => [key, storage.getItem(key)]));
}
function localStudy(raw: string | null | undefined) {
  try {
    return raw ? stateSchema.parse(JSON.parse(raw)) : newState();
  } catch {
    return null;
  }
}
function validateKeys(keys: StoredKeys) {
  for (const [key, value] of Object.entries(keys)) {
    if (!BACKUP_KEYS.includes(key) || (value !== null && typeof value !== 'string'))
      throw new Error('지원하지 않는 저장 항목입니다.');
  }
  if (keys[KEY]) stateSchema.parse(JSON.parse(keys[KEY]!));
  if (keys[SLEEP_KEY]) sleepSchema.parse(JSON.parse(keys[SLEEP_KEY]!));
}
function assertReferences(keys: StoredKeys, manifest: Manifest) {
  const available = new Set(manifest.photos.map((p) => p.vault + ':' + p.id)),
    missing: string[] = [];
  function scan(value: unknown, vault: Vault) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['attachmentIds', 'linkedMediaIds', 'photoIds'].includes(key) && Array.isArray(child)) {
        for (const id of child)
          if (typeof id === 'string' && !available.has(vault + ':' + id))
            missing.push(vault + ':' + id);
      } else if (
        key === 'mediaId' &&
        typeof child === 'string' &&
        !available.has(vault + ':' + child)
      )
        missing.push(vault + ':' + child);
      else if (typeof child === 'object') scan(child, vault);
    }
  }
  for (const key of [KEY, 'bkit.atelier.draft.v1', SLEEP_KEY])
    if (keys[key]) scan(JSON.parse(keys[key]!), key === SLEEP_KEY ? 'sleep' : 'study');
  if (keys['bkit.landscape.v1'] && !available.has('study:' + keys['bkit.landscape.v1']))
    missing.push('풍경 사진');
  if (missing.length)
    throw new Error(
      `사진 원본 ${missing.length}개가 누락되었습니다: ${missing.slice(0, 3).join(', ')}. 완전한 백업으로 처리할 수 없습니다.`,
    );
}
export async function exportCompleteBackup(
  storage: Storage,
  onProgress: (message: string) => void = () => {},
) {
  const baseline = snapshotKeys(storage),
    keys = { ...baseline };
  validateKeys(keys);
  if (keys[KEY]) {
    const state = stateSchema.parse(JSON.parse(keys[KEY]!));
    const at = Date.now();
    const paused = pauseQuick(state, at);
    const restored = state.active
      ? { ...paused, active: closeSegment(state.active, at) }
      : paused;
    // Export a paused snapshot: an imported quick stopwatch must never accrue
    // hours on a different device while the archive sits unused.
    if (restored !== state) keys[KEY] = JSON.stringify(restored);
  }
  const writer = new LocalZipWriter(),
    manifest: Manifest = {
      format: 'BKIT-COMPLETE-LOCAL',
      schemaVersion: 1,
      appVersion: '3.4',
      createdAt: new Date().toISOString(),
      dataSha256: '',
      photos: [],
    };
  let total = 0;
  for (const vault of ['study', 'sleep'] as const)
    for (const id of await photoIds(vault)) {
      onProgress(`사진 원본 확인 중 · ${manifest.photos.length + 1}장`);
      const photo = await readVaultPhoto(vault, id);
      if (!photo) throw new Error('백업 중 사진이 변경되었습니다. 다시 시도하세요.');
      const blob = new Blob([photo.bytes], { type: photo.mime }),
        digest = await sha256(blob);
      total += blob.size;
      if (blob.size !== photo.size || (photo.digest && photo.digest !== digest))
        throw new Error(`${photo.name}: 사진 원본이 손상되었습니다.`);
      if (total > 250 * 1024 * 1024)
        throw new Error(
          '이 브라우저의 전체 백업 한도는 사진 합계 250MB입니다. 기록은 변경되지 않았습니다.',
        );
      const path = `media/${vault}/${manifest.photos.length}.bin`;
      manifest.photos.push({
        path,
        id,
        vault,
        name: photo.name,
        mime: photo.mime,
        size: blob.size,
        sha256: digest,
      });
      await writer.add(path, blob);
    }
  const paper = await exportPaperBackup(writer, 250 * 1024 * 1024 - total);
  manifest.paper = paper.manifest;
  assertReferences(keys, manifest);
  const data = new Blob([JSON.stringify({ keys })], { type: 'application/json' });
  if (data.size > 20 * 1024 * 1024) throw new Error('학습 JSON 데이터가 20MB를 초과합니다.');
  manifest.dataSha256 = await sha256(data);
  await writer.add('data/local.json', data);
  await writer.add('manifest.json', new Blob([JSON.stringify(manifest, null, 2)]));
  if (JSON.stringify(baseline) !== JSON.stringify(snapshotKeys(storage)))
    throw new Error('백업 중 학습 기록이 바뀌었습니다. 다시 내보내 주세요.');
  await assertPaperUnchanged(paper.baseline);
  const archive = writer.finish();
  if (archive.size > 300 * 1024 * 1024)
    throw new Error('전체 ZIP 300MB 한도 초과: 자료를 제외하지 않고 백업을 중단합니다.');
  return archive;
}
export type InspectedBackup = {
  manifest: Manifest;
  keys: StoredKeys;
  files: Map<string, Blob>;
  baseline: StoredKeys;
  conflicts: string[];
  photoConflicts: string[];
  paper: InspectedPaper;
};
/** Conservative comparison: a verified ZIP is not necessarily a backup of the newest local edits. */
export function backupMatchesCurrent(archive: InspectedBackup) {
  return {
    study: archive.keys[KEY] === archive.baseline[KEY],
    sleep: archive.keys[SLEEP_KEY] === archive.baseline[SLEEP_KEY],
    paper: JSON.stringify(archive.paper.documents) === JSON.stringify(archive.paper.baseline),
  };
}

export async function inspectCompleteBackup(
  file: Blob,
  storage: Storage,
  onProgress: (message: string) => void = () => {},
): Promise<InspectedBackup> {
  onProgress('ZIP 파일과 무결성 검사 중…');
  const files = await readLocalZip(file),
    manifestFile = files.get('manifest.json'),
    data = files.get('data/local.json');
  if (!manifestFile || !data || manifestFile.size > 2 * 1024 * 1024)
    throw new Error('manifest 또는 학습 데이터가 없습니다.');
  const manifest = manifestSchema.parse(JSON.parse(await manifestFile.text()));
  if ((await sha256(data)) !== manifest.dataSha256) throw new Error('학습 기록 무결성 검사 실패');
  const parsed = z
    .object({ keys: z.record(z.string().nullable()) })
    .parse(JSON.parse(await data.text()));
  validateKeys(parsed.keys);
  const used = new Set<string>(),
    identities = new Set<string>();
  let i = 0;
  for (const meta of manifest.photos) {
    if (used.has(meta.path) || identities.has(meta.vault + ':' + meta.id))
      throw new Error('사진 항목이 중복되었습니다.');
    used.add(meta.path);
    identities.add(meta.vault + ':' + meta.id);
    const blob = files.get(meta.path);
    if (!blob || blob.size !== meta.size || (await sha256(blob)) !== meta.sha256)
      throw new Error(`${meta.name}: 사진 누락 또는 손상`);
    onProgress(`사진 무결성 검사 ${++i}/${manifest.photos.length}`);
  }
  const paper = await inspectPaperBackup(manifest.paper, files);
  if (
    files.size !==
    manifest.photos.length + 2 + (manifest.paper ? manifest.paper.originals.length + 1 : 0)
  )
    throw new Error('목록과 다른 파일이 포함되어 있습니다.');
  assertReferences(parsed.keys, manifest);
  const baseline = snapshotKeys(storage),
    conflicts: string[] = [];
  const old = localStudy(baseline[KEY]) ?? newState(),
    incoming = parsed.keys[KEY] ? stateSchema.parse(JSON.parse(parsed.keys[KEY]!)) : newState();
  for (const key of ['tasks', 'schedules', 'sessions', 'grades', 'exams'] as const) {
    const ids = new Set((old[key] ?? []).map((x) => x.id));
    for (const item of incoming[key] ?? [])
      if (ids.has(item.id)) conflicts.push(`${key}: ${item.id}`);
  }
  for (const key of BACKUP_KEYS)
    if (key !== KEY && baseline[key] && parsed.keys[key] && baseline[key] !== parsed.keys[key])
      conflicts.push('저장 항목: ' + key);
  if (baseline[SLEEP_KEY] && parsed.keys[SLEEP_KEY]) {
    try {
      const localSleep = sleepSchema.parse(JSON.parse(baseline[SLEEP_KEY]!)),
        incomingSleep = sleepSchema.parse(JSON.parse(parsed.keys[SLEEP_KEY]!));
      const dates = new Set(localSleep.records.map((r) => r.date));
      for (const r of incomingSleep.records)
        if (dates.has(r.date)) conflicts.push('수면 기록: ' + r.date);
    } catch {
      conflicts.push('현재 수면 JSON 손상 · 교체만 가능 (원본 보존)');
    }
  }
  const oldLearning = learning(old),
    newLearning = learning(incoming);
  for (const key of ['resources', 'problems', 'attempts'] as const) {
    const ids = new Set(oldLearning[key].map((x) => x.id));
    for (const item of newLearning[key]) if (ids.has(item.id)) conflicts.push(`${key}: ${item.id}`);
  }
  if (!localStudy(baseline[KEY])) conflicts.push('현재 학습 JSON 손상 · 교체만 가능 (원본 보존)');
  const photoConflicts: string[] = [];
  for (const meta of manifest.photos) {
    const local = await readVaultPhoto(meta.vault, meta.id);
    if (local && (await sha256(new Blob([local.bytes]))) !== meta.sha256)
      photoConflicts.push(meta.vault + ':' + meta.id);
  }
  return {
    manifest,
    keys: parsed.keys,
    files,
    baseline,
    conflicts: [...conflicts, ...paper.conflicts],
    photoConflicts,
    paper,
  };
}
const union = <T>(a: T[], b: T[], key: (value: T) => string): T[] => {
  const ids = new Set(a.map(key));
  return [...a, ...b.filter((x) => !ids.has(key(x)))];
};
export function mergeStudy(local: State, incoming: State): State {
  const a = learning(local),
    b = learning(incoming);
  return stateSchema.parse({
    ...local,
    tasks: union(local.tasks, incoming.tasks, (x) => x.id),
    schedules: union(local.schedules, incoming.schedules, (x) => x.id),
    sessions: union(local.sessions, incoming.sessions, (x) => x.id),
    grades: union(local.grades, incoming.grades, (x) => x.id),
    exams: union(local.exams ?? [], incoming.exams ?? [], (x) => x.id),
    reviewsDone: [...new Set([...local.reviewsDone, ...incoming.reviewsDone])],
    reviewProgress: union(
      local.reviewProgress ?? [],
      incoming.reviewProgress ?? [],
      (x) => x.sessionId,
    ),
    problemRetests: union(local.problemRetests ?? [], incoming.problemRetests ?? [], (x) => x.id),
    learningEvents: union(local.learningEvents ?? [], incoming.learningEvents ?? [], (x) => x.id),
    learning: {
      version: 1,
      resources: union(a.resources, b.resources, (x) => x.id),
      problems: union(a.problems, b.problems, (x) => x.id),
      attempts: union(a.attempts, b.attempts, (x) => x.id),
    },
  });
}
function remapPhotoRefs(raw: string, vault: Vault, map: Map<string, string>) {
  const scan = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(scan);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          ['attachmentIds', 'linkedMediaIds', 'photoIds'].includes(key) && Array.isArray(child)
            ? child.map((id) => map.get(vault + ':' + id) ?? id)
            : key === 'mediaId' && typeof child === 'string'
              ? (map.get(vault + ':' + child) ?? child)
              : scan(child),
        ]),
      );
    return value;
  };
  return JSON.stringify(scan(JSON.parse(raw)));
}
export async function restoreCompleteBackup(
  backup: InspectedBackup,
  mode: 'merge' | 'replace',
  storage: Storage,
  onProgress: (message: string) => void = () => {},
) {
  if (JSON.stringify(snapshotKeys(storage)) !== JSON.stringify(backup.baseline))
    throw new Error('검사 후 다른 탭 또는 학습 기록이 바뀌었습니다. 파일을 다시 검사하세요.');
  await assertPaperUnchanged(backup.paper.baseline);
  const readLocal = localStudy(backup.baseline[KEY]);
  if (!readLocal && mode === 'merge')
    throw new Error(
      '현재 학습 JSON이 손상되어 병합할 수 없습니다. 원본을 내보낸 뒤 교체를 선택하세요.',
    );
  const local = readLocal ?? newState();
  if (local.active || local.quickTimer) throw new Error('진행 중이거나 일시정지한 타이머를 먼저 종료하세요. 시간 기록은 그대로 유지됩니다.');
  const map = new Map<string, string>();
  // Resolve every conflicting photo to a new ID, preserving both original byte sequences.
  for (const meta of backup.manifest.photos) {
    const old = await readVaultPhoto(meta.vault, meta.id);
    if (old && (await sha256(new Blob([old.bytes]))) !== meta.sha256)
      map.set(meta.vault + ':' + meta.id, uid());
  }
  const incoming = { ...backup.keys };
  for (const key of [KEY, 'bkit.atelier.draft.v1', SLEEP_KEY])
    if (incoming[key])
      incoming[key] = remapPhotoRefs(incoming[key]!, key === SLEEP_KEY ? 'sleep' : 'study', map);
  if (incoming['bkit.landscape.v1'])
    incoming['bkit.landscape.v1'] =
      map.get('study:' + incoming['bkit.landscape.v1']) ?? incoming['bkit.landscape.v1'];
  let next: StoredKeys = { ...backup.baseline };
  for (const key of BACKUP_KEYS) {
    if (incoming[key] === null || incoming[key] === undefined) continue;
    if (key === KEY) {
      let state = stateSchema.parse(JSON.parse(incoming[key]!));
      if (mode === 'merge') state = mergeStudy(local, state);
      state = {
        ...state,
        revision: local.revision + 1,
        active: state.active ? { ...state.active, segmentStart: null } : null,
      };
      next[key] = JSON.stringify(stateSchema.parse(state));
    } else if (key === SLEEP_KEY && mode === 'merge' && next[key]) {
      const old = sleepSchema.parse(JSON.parse(next[key]!)),
        value = sleepSchema.parse(JSON.parse(incoming[key]!));
      const merged: SleepState = {
        ...old,
        records: union(old.records, value.records, (x) => x.date),
      };
      next[key] = JSON.stringify(sleepSchema.parse(merged));
    } else if (mode === 'replace' || next[key] === null) next[key] = incoming[key]!;
  }
  validateKeys(next);
  // Persist exact old JSON before writing any imported photo or live key. Never delete photos.
  const journal = JOURNAL_PREFIX + Date.now() + '.' + uid();
  storage.setItem(
    journal,
    JSON.stringify({
      format: 'BKIT-RESTORE-RECOVERY',
      createdAt: new Date().toISOString(),
      keys: backup.baseline,
    }),
  );
  let i = 0;
  for (const meta of backup.manifest.photos) {
    onProgress(`사진 원본 복원 중 ${++i}/${backup.manifest.photos.length}`);
    const id = map.get(meta.vault + ':' + meta.id) ?? meta.id,
      existing = await readVaultPhoto(meta.vault, id);
    if (existing) {
      if ((await sha256(new Blob([existing.bytes]))) !== meta.sha256)
        throw new Error('사진 보관함에 동시 변경이 발생했습니다. 기존 기록은 유지됩니다.');
      continue;
    }
    const bytes = await backup.files.get(meta.path)!.arrayBuffer();
    await addVaultPhoto(meta.vault, {
      id,
      bytes,
      mime: meta.mime,
      name: meta.name,
      size: meta.size,
      digest: meta.sha256,
    });
  }
  if (JSON.stringify(snapshotKeys(storage)) !== JSON.stringify(backup.baseline))
    throw new Error(
      '사진 복원 중 다른 탭에서 기록이 변경되었습니다. JSON은 변경하지 않았습니다. 파일을 다시 검사하세요.',
    );
  const undoPaper = backup.manifest.paper
    ? await restoreInspectedPaper(backup.paper, mode, journal)
    : async () => {};
  // A second local-key check follows async IndexedDB commit. Roll back metadata on conflict.
  if (JSON.stringify(snapshotKeys(storage)) !== JSON.stringify(backup.baseline)) {
    await undoPaper();
    throw new Error('필기 복원 중 학습 기록이 변경되었습니다. 다시 검사하세요.');
  }
  const changed: string[] = [];
  try {
    for (const key of BACKUP_KEYS) {
      if (next[key] === backup.baseline[key] || next[key] === null) continue;
      storage.setItem(key, next[key]!);
      changed.push(key);
    }
  } catch {
    for (const key of changed.reverse()) {
      if (storage.getItem(key) === next[key]) {
        const previous = backup.baseline[key];
        try {
          if (previous === null) storage.removeItem(key);
          else storage.setItem(key, previous);
        } catch {
          /* Exact original remains in recovery journal. */
        }
      }
    }
    await undoPaper();
    throw new Error(`저장 공간 부족으로 복원을 중단했습니다. 원본 보존 위치: ${journal}`);
  }
  return journal;
}
export function latestRecovery(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)!)
    .filter((k) => k.startsWith(JOURNAL_PREFIX))
    .sort();
  return keys.at(-1);
}
