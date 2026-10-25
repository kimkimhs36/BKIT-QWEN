/** BKIT sync-only credential. Never stores a Google token or learning content. */
export type RememberedLogin = { token: string; expiresAt: number };
const database = 'bkit-auth-v1';
async function access<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(database, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('credentials');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('credentials', mode);
      const request = run(tx.objectStore('credentials'));
      tx.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
export async function savedLogin(): Promise<RememberedLogin | null> {
  const value = await access('readonly', (store) => store.get('sync'));
  if (!value) return null;
  if (
    !/^bkit_sync_[a-f0-9]{64}$/.test(value.token) ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= Date.now()
  ) {
    await forgetLogin();
    return null;
  }
  return value;
}
export const rememberLogin = (value: RememberedLogin) =>
  access('readwrite', (store) => store.put(value, 'sync'));
export const forgetLogin = () => access('readwrite', (store) => store.delete('sync'));
