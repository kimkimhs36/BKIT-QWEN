/** Existing v1 auth database; learning databases and Google tokens are never touched. */
export type RememberedLogin = {
  token: string;
  expiresAt: number;
  checkpoint?: { digest: string; version: number };
};
const database = 'bkit-auth-v1';
async function access<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(database, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('credentials');
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('로그인 저장소가 다른 탭에서 사용 중이에요.'));
    open.onsuccess = () => {
      const db = open.result;
      try {
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
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}
export async function loginRecord(): Promise<RememberedLogin | null> {
  const value = await access('readonly', (store) => store.get('sync'));
  if (!value) return null;
  if (!/^bkit_sync_[a-f0-9]{64}$/.test(value.token) || !Number.isFinite(value.expiresAt)) {
    await forgetLogin(value.token);
    return null;
  }
  return value;
}
export async function savedLogin(): Promise<RememberedLogin | null> {
  const value = await loginRecord();
  if (value && value.expiresAt <= Date.now()) {
    await forgetLogin(value.token);
    return null;
  }
  return value;
}
export const rememberLogin = (value: RememberedLogin) =>
  access('readwrite', (store) => store.put(value, 'sync'));
export async function forgetLogin(expectedToken?: string) {
  if (expectedToken === undefined) {
    await access('readwrite', (store) => store.delete('sync'));
    return;
  }
  await access('readwrite', (store) => {
    const request = store.get('sync');
    request.onsuccess = () => {
      if (request.result?.token === expectedToken) store.delete('sync');
    };
    return request;
  });
}
/** Atomic conditional update: an in-flight response cannot resurrect a logged-out session. */
export async function saveLoginCheckpoint(
  token: string,
  checkpoint: NonNullable<RememberedLogin['checkpoint']>,
) {
  await access('readwrite', (store) => {
    const request = store.get('sync');
    request.onsuccess = () => {
      if (request.result?.token === token) store.put({ ...request.result, checkpoint }, 'sync');
    };
    return request;
  });
}
