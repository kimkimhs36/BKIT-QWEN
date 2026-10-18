// Independent Sleep Guard photo vault; study photos cannot be removed by sleep-record deletion.
// Local-only photo vault. No network client, public URL or image bytes in localStorage.
export type PrivatePhoto = { id: string; blob: Blob; name: string; size: number; digest: string };
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bkit-sleep-photos-v3', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new Error('사진 보관함을 열지 못했습니다. Safari 저장 공간을 확인해 주세요.'));
    req.onblocked = () => reject(new Error('다른 BKIT 탭을 닫고 사진 첨부를 다시 시도해 주세요.'));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode),
      req = operation(tx.objectStore('photos'));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error('사진을 저장하지 못했습니다. 저장 공간을 확인하고 다시 첨부해 주세요.'));
    };
  });
}
type PhotoRecord = Omit<PrivatePhoto, 'blob'> & { bytes: ArrayBuffer; mime: string };
export async function getSleepPhoto(id: string): Promise<PrivatePhoto | undefined> {
  const stored: PhotoRecord | PrivatePhoto | undefined = await transaction('readonly', (store) =>
    store.get(id),
  );
  if (!stored) return undefined;
  return 'bytes' in stored
    ? { ...stored, blob: new Blob([stored.bytes], { type: stored.mime }) }
    : stored;
}
export async function storeSleepPhoto(file: File, existingIds: string[]): Promise<string> {
  if (
    !/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type) &&
    !(file.type === '' && /\.(heic|heif)$/i.test(file.name))
  )
    throw new Error('사진 파일(JPEG, PNG, HEIC, WebP 등)을 선택해 주세요.');
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error('사진 한 장은 20MB 이하로 선택해 주세요.');
  const existing = (await Promise.all(existingIds.map(getSleepPhoto))).filter(
    (p): p is PrivatePhoto => !!p,
  );
  const bytes = await file.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  const duplicate = existing.find((p) => p.digest === digest);
  if (duplicate) return duplicate.id;
  if (existingIds.length >= 12) throw new Error('한 번에 사진 12장까지 첨부할 수 있습니다.');
  if (existing.reduce((n, p) => n + p.size, 0) + file.size > 60 * 1024 * 1024)
    throw new Error('한 초안의 사진은 합계 60MB 이하로 선택해 주세요.');
  // ArrayBuffer avoids WebKit File/Blob structured-clone failures and detached
  // picker-backed files. Reconstruct a typed Blob only while viewing a photo.
  const photo: PhotoRecord = {
    id: crypto.randomUUID(),
    bytes,
    mime: file.type || 'image/heic',
    name: file.name,
    size: file.size,
    digest,
  };
  await transaction('readwrite', (store) => store.put(photo));
  return photo.id;
}
export function deleteSleepPhoto(id: string) {
  return transaction('readwrite', (store) => store.delete(id));
}
