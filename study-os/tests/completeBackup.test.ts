import { beforeEach, describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { newState, stateSchema } from '../src/model';
import { KEY } from '../src/storage';
import { SLEEP_KEY, defaultSleep } from '../src/sleep';
import { addResource } from '../src/learningEngine';
import { sha256, LocalZipWriter, readLocalZip } from '../src/localZip';
import { addVaultPhoto, readVaultPhoto } from '../src/photoVault';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
  JOURNAL_PREFIX,
  mergeStudy,
} from '../src/completeBackup';
function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}
async function photo(vault: 'study' | 'sleep', id: string, text: string) {
  const blob = new Blob([text]);
  await addVaultPhoto(vault, {
    id,
    name: id + '.png',
    mime: 'image/png',
    size: blob.size,
    digest: await sha256(blob),
    bytes: await blob.arrayBuffer(),
  });
}
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
async function fixture() {
  await photo('study', 'study-image', 'school worksheet');
  await photo('sleep', 'sleep-image', 'bedtime');
  const s = addResource(
    newState(),
    {
      title: '실제 자료',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: ['study-image'],
    },
    ['문제'],
  );
  s.learning!.problems[0].mediaId = 'study-image';
  const sleep = defaultSleep();
  sleep.records = [
    {
      date: '2026-10-19',
      targetBed: '2026-10-19T23:00:00Z',
      targetWake: '2026-10-20T07:00:00Z',
      checks: [true, false, false, false],
      actualBed: null,
      actualWake: null,
      reflection: '',
      photoIds: ['sleep-image'],
    },
  ];
  return storage({
    [KEY]: JSON.stringify(s),
    [SLEEP_KEY]: JSON.stringify(sleep),
    'crashweek.v3': 'original crash bytes',
    'bkit.landscape.v1': 'study-image',
  });
}
describe('complete local archive preservation', () => {
  it('roundtrips both photo vaults and resources into a separate storage environment', async () => {
    const source = await fixture(),
      zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const target = storage();
    const preview = await inspectCompleteBackup(zip, target);
    expect(preview.manifest.photos).toHaveLength(2);
    await restoreCompleteBackup(preview, 'replace', target);
    const state = stateSchema.parse(JSON.parse(target.getItem(KEY)!));
    expect(state.learning!.resources[0].linkedMediaIds).toEqual(['study-image']);
    expect(await new Blob([(await readVaultPhoto('study', 'study-image'))!.bytes]).text()).toBe(
      'school worksheet',
    );
    expect(await new Blob([(await readVaultPhoto('sleep', 'sleep-image'))!.bytes]).text()).toBe(
      'bedtime',
    );
    expect(target.getItem('crashweek.v3')).toBe('original crash bytes');
    expect(target.getItem(SLEEP_KEY)).toBe(source.getItem(SLEEP_KEY));
  });
  it('rejects missing referenced photos without producing a success archive', async () => {
    const source = await fixture();
    const s = JSON.parse(source.getItem(KEY)!);
    s.learning.resources[0].linkedMediaIds.push('missing');
    source.setItem(KEY, JSON.stringify(s));
    await expect(exportCompleteBackup(source)).rejects.toThrow('누락');
  });
  it('detects byte corruption before any writes', async () => {
    const source = await fixture(),
      zip = await exportCompleteBackup(source),
      bytes = new Uint8Array(await zip.arrayBuffer());
    bytes[60] ^= 1;
    await expect(inspectCompleteBackup(new Blob([bytes]), storage())).rejects.toThrow();
  });
  it('preserves conflicting photos and remaps incoming references', async () => {
    const source = await fixture(),
      zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    await photo('study', 'study-image', 'different original');
    const target = storage({ [KEY]: JSON.stringify(newState()) });
    const preview = await inspectCompleteBackup(zip, target);
    expect(preview.photoConflicts).toEqual(['study:study-image']);
    await restoreCompleteBackup(preview, 'replace', target);
    const s = JSON.parse(target.getItem(KEY)!),
      newId = s.learning.resources[0].linkedMediaIds[0];
    expect(newId).not.toBe('study-image');
    expect(s.learning.problems[0].mediaId).toBe(newId);
    expect(target.getItem('bkit.landscape.v1')).toBe(newId);
    expect(await new Blob([(await readVaultPhoto('study', 'study-image'))!.bytes]).text()).toBe(
      'different original',
    );
    expect(await new Blob([(await readVaultPhoto('study', newId))!.bytes]).text()).toBe(
      'school worksheet',
    );
  });
  it('rolls back live keys on quota failure and keeps exact recovery bytes', async () => {
    const source = await fixture(),
      zip = await exportCompleteBackup(source),
      original = JSON.stringify(newState()),
      target = storage({ [KEY]: original, [SLEEP_KEY]: JSON.stringify(defaultSleep()) }),
      preview = await inspectCompleteBackup(zip, target),
      set = target.setItem.bind(target);
    target.setItem = (k, v) => {
      if (k === SLEEP_KEY && v !== target.getItem(k)) throw new Error('quota');
      set(k, v);
    };
    await expect(restoreCompleteBackup(preview, 'replace', target)).rejects.toThrow('저장 공간');
    expect(target.getItem(KEY)).toBe(original);
    const journal = Array.from({ length: target.length }, (_, i) => target.key(i)!).find((k) =>
      k.startsWith(JOURNAL_PREFIX),
    )!;
    expect(JSON.parse(target.getItem(journal)!).keys[KEY]).toBe(original);
  });
  it('refuses stale preview and preserves concurrent changes', async () => {
    const source = await fixture(),
      zip = await exportCompleteBackup(source),
      target = storage(),
      preview = await inspectCompleteBackup(zip, target);
    target.setItem(KEY, JSON.stringify({ ...newState(), revision: 50 }));
    await expect(restoreCompleteBackup(preview, 'replace', target)).rejects.toThrow('바뀌었습니다');
    expect(JSON.parse(target.getItem(KEY)!).revision).toBe(50);
  });
  it('allows explicit replacement of corrupt JSON with exact original recovery', async () => {
    const source = await fixture(),
      zip = await exportCompleteBackup(source),
      target = storage({ [KEY]: '{corrupt' }),
      preview = await inspectCompleteBackup(zip, target);
    await expect(restoreCompleteBackup(preview, 'merge', target)).rejects.toThrow('손상');
    const key = await restoreCompleteBackup(preview, 'replace', target);
    expect(JSON.parse(target.getItem(key)!).keys[KEY]).toBe('{corrupt');
    expect(stateSchema.safeParse(JSON.parse(target.getItem(KEY)!)).success).toBe(true);
  });
  it('merges new entity IDs while preserving current settings and conflicting versions', () => {
    const a = newState(),
      b = newState();
    a.settings.goal = 'my current goal';
    b.settings.goal = 'old goal';
    b.grades = [
      { id: 'grade', subject: '수학', exam: '중간', date: null, target: 90, score: null },
    ];
    const result = mergeStudy(a, b);
    expect(result.settings.goal).toBe('my current goal');
    expect(result.grades).toHaveLength(1);
  });
  it('writes standard uncompressed ZIP and bounds malformed archives', async () => {
    const writer = new LocalZipWriter();
    await writer.add('data/local.json', new Blob(['hello']));
    const zip = writer.finish(),
      files = await readLocalZip(zip);
    expect(await files.get('data/local.json')!.text()).toBe('hello');
    await expect(readLocalZip(new Blob(['bad']))).rejects.toThrow();
  });
});
