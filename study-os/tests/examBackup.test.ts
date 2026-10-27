import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  KEY, EXT_KEY, readDocument, saveDocument, startSession, putSession, emptyDocument,
} from '../src/juggernaut/engine';
import {
  exportCompleteBackup, inspectCompleteBackup, restoreCompleteBackup,
} from '../src/completeBackup';

function storage() {
  const data = new Map<string,string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => data.delete(key),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
  } as Storage;
}
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

describe('BKIT integrated BOOKS + exam lab complete ZIP recovery', () => {
  it('retains original and extension math sessions after export/replace/merge', async () => {
    const source = storage();
    const now = Date.parse('2026-10-28T08:00:00+09:00');
    const legacy = startSession(emptyDocument(), 'training', now, 'balance');
    const extension = startSession(emptyDocument(), 'training', now + 1000, 'm28-substitution');
    saveDocument(source, putSession(emptyDocument(), legacy));
    saveDocument(source, putSession(readDocument(source).document, extension));
    expect(source.getItem(KEY)).toBeTruthy();
    expect(source.getItem(EXT_KEY)).toBeTruthy();
    const original = readDocument(source).document.sessions.map(s => s.id).sort();
    expect(original).toHaveLength(2);
    const zip = await exportCompleteBackup(source);
    const destination = storage();
    const plan = await inspectCompleteBackup(zip, destination);
    await restoreCompleteBackup(plan, 'replace', destination);
    expect(readDocument(destination).document.sessions.map(s => s.id).sort()).toEqual(original);
    const secondPlan = await inspectCompleteBackup(zip, destination);
    await restoreCompleteBackup(secondPlan, 'merge', destination);
    expect(readDocument(destination).document.sessions.map(s => s.id).sort()).toEqual(original);
  });

  it('does not overwrite a corrupt original when verifying the local math partitions', async () => {
    const original = storage();
    original.setItem(KEY, '{corrupt');
    expect(readDocument(original).error).toBeTruthy();
    await expect(exportCompleteBackup(original)).rejects.toThrow();
    expect(original.getItem(KEY)).toBe('{corrupt');
  });
});
