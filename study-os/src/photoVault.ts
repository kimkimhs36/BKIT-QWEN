import { guardedTransaction } from './indexedDb';
export type Vault = 'study' | 'sleep';
export type VaultPhoto = {
  id: string;
  bytes: ArrayBuffer;
  mime: string;
  name: string;
  size: number;
  digest: string;
};
async function database(vault: Vault) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      vault === 'study' ? 'bkit-private-materials-v1' : 'bkit-sleep-photos-v3',
      1,
    );
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('사진 보관함을 열지 못했습니다.'));
    request.onblocked = () => reject(new Error('다른 탭을 닫고 다시 시도하세요.'));
  });
}
async function run<T>(
  vault: Vault,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await database(vault);
  return new Promise<T>((resolve, reject) => {
    const tx = guardedTransaction(db, 'photos', mode),
      req = fn(tx.objectStore('photos'));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error('사진 보관함 작업에 실패했습니다. 저장 공간을 확인하세요.'));
    };
  });
}
export async function photoIds(vault: Vault) {
  return (await run(vault, 'readonly', (store) => store.getAllKeys())).map(String);
}
export async function readVaultPhoto(vault: Vault, id: string): Promise<VaultPhoto | undefined> {
  const p = await run(vault, 'readonly', (store) => store.get(id));
  if (!p) return undefined;
  return 'bytes' in p
    ? p
    : {
        id: p.id,
        bytes: await p.blob.arrayBuffer(),
        mime: p.blob.type,
        name: p.name,
        size: p.size,
        digest: p.digest,
      };
}
/** add() never overwrites an existing photo; conflicts are remapped by the restorer. */
export async function addVaultPhoto(vault: Vault, photo: VaultPhoto) {
  await run(vault, 'readwrite', (store) => store.add(photo));
}
