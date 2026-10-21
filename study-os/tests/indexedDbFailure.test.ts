import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory, IDBDatabase } from 'fake-indexeddb';
import { paperSnapshot } from '../src/paperStorage';
import { photoIds } from '../src/photoVault';
import { getPhoto } from '../src/atelierMedia';

beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });
afterEach(() => vi.restoreAllMocks());

it.each([
  ['PDF and ink', () => paperSnapshot()],
  ['backup photos', () => photoIds('study')],
  ['task attachment', () => getPhoto('missing')],
] as const)('closes the %s connection if transaction creation fails synchronously', async (_, operation) => {
  await operation(); // Create the actual database before injecting a quota/closed-DB failure.
  const close = vi.spyOn(IDBDatabase.prototype, 'close');
  vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(() => {
    throw new DOMException('Simulated transaction failure', 'QuotaExceededError');
  });
  await expect(operation()).rejects.toThrow('Simulated transaction failure');
  expect(close).toHaveBeenCalledTimes(1);
});
