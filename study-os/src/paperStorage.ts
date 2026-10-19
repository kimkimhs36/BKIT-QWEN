import { sha256 } from './localZip';
import { documentSchema, type PaperDocument } from './paperModel';
export const PAPER_DB = 'bkit-digital-paper-v1';
export type PaperFile = { id: string; bytes: ArrayBuffer };
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(PAPER_DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('documents', { keyPath: 'id' });
      r.result.createObjectStore('originals', { keyPath: 'id' });
      r.result.createObjectStore('recovery', { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = r.onblocked = () =>
      reject(new Error('디지털 종이 보관함을 열지 못했습니다. 다른 탭과 저장 공간을 확인하세요.'));
  });
}
export async function paperSnapshot(): Promise<{ documents: PaperDocument[]; files: PaperFile[] }> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents', 'originals'], 'readonly');
    const docs = tx.objectStore('documents').getAll(),
      files = tx.objectStore('originals').getAll();
    tx.oncomplete = () => {
      db.close();
      try {
        resolve({
          documents: docs.result.map((x) => documentSchema.parse(x)),
          files: files.result,
        });
      } catch (e) {
        reject(e);
      }
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error('문서 보관함 읽기 실패'));
    };
  });
}
export async function listPaperDocuments(): Promise<PaperDocument[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly'),
      r = tx.objectStore('documents').getAll();
    tx.oncomplete = () => {
      db.close();
      try {
        resolve(r.result.map((d) => documentSchema.parse(d)));
      } catch (e) {
        reject(e);
      }
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error('문서 목록 읽기 실패'));
    };
  });
}
export async function readPaperFile(id: string): Promise<ArrayBuffer> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('originals', 'readonly'),
      r = tx.objectStore('originals').get(id);
    tx.oncomplete = () => {
      db.close();
      r.result
        ? resolve(r.result.bytes)
        : reject(new Error('원본 파일이 없습니다. 백업에서 복원하세요.'));
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error('원본 읽기 실패'));
    };
  });
}
/** Optimistic revision check in the same transaction: a stale tab never overwrites ink. */
export async function savePaperDocument(
  input: PaperDocument,
  original?: ArrayBuffer,
): Promise<PaperDocument> {
  const value = documentSchema.parse(input);
  if (
    original &&
    (original.byteLength !== value.size || (await sha256(new Blob([original]))) !== value.digest)
  )
    throw new Error('원본 무결성 검사가 실패했습니다. 문서를 저장하지 않았습니다.');
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents', 'originals'], 'readwrite');
    const store = tx.objectStore('documents'),
      r = store.get(value.id);
    let result: PaperDocument,
      reason = '필기를 저장하지 못했습니다. 저장 공간을 확인하고 저장 재시도를 누르세요.';
    r.onsuccess = () => {
      const old = r.result as PaperDocument | undefined;
      if ((old && old.revision !== value.revision) || (!old && !original)) {
        reason =
          '다른 탭에서 문서가 바뀌었습니다. 현재 미저장 필기를 구조 JSON으로 내려받고 다른 탭을 닫으세요.';
        tx.abort();
        return;
      }
      if (
        old &&
        (old.fileId !== value.fileId ||
          old.digest !== value.digest ||
          old.mime !== value.mime ||
          old.size !== value.size ||
          old.pages.length !== value.pages.length ||
          old.pages.some((p, i) => {
            const n = value.pages[i];
            return (
              p.id !== n.id || p.index !== n.index || p.width !== n.width || p.height !== n.height
            );
          }))
      ) {
        reason = '원본 파일과 페이지 좌표는 변경할 수 없습니다. 새 문서로 가져오세요.';
        tx.abort();
        return;
      }
      if (original) tx.objectStore('originals').add({ id: value.fileId, bytes: original });
      result = { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() };
      store.put(result);
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result!);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error(reason));
    };
  });
}
/** Recovery and all imported document records are committed atomically. Originals are add-only. */
export async function restorePaperSnapshot(
  incoming: PaperDocument[],
  files: PaperFile[],
  baseline: PaperDocument[],
  mode: 'merge' | 'replace',
  recoveryId: string,
) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['documents', 'originals', 'recovery'], 'readwrite');
    const store = tx.objectStore('documents'),
      r = store.getAll();
    let reason = '문서 복원 실패. 기존 필기는 보존됩니다.';
    r.onsuccess = () => {
      if (JSON.stringify(r.result) !== JSON.stringify(baseline)) {
        reason = '검사 후 PDF·필기가 변경되었습니다. 백업을 다시 검사하세요.';
        tx.abort();
        return;
      }
      tx.objectStore('recovery').add({ id: recoveryId, documents: r.result });
      const ids = new Set(baseline.map((d) => d.id));
      for (const d of incoming)
        if (mode === 'replace' || !ids.has(d.id)) store.put(documentSchema.parse(d));
      for (const f of files) {
        const check = tx.objectStore('originals').get(f.id);
        check.onsuccess = () => {
          if (!check.result) tx.objectStore('originals').add(f);
          else {
            const a = new Uint8Array(check.result.bytes),
              b = new Uint8Array(f.bytes);
            if (a.length !== b.length || a.some((n, i) => n !== b[i])) {
              reason =
                '동일 원본 ID의 내용이 다릅니다. 기존 원본을 보호하기 위해 복원을 중단합니다.';
              tx.abort();
            }
          }
        };
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error(reason));
    };
  });
}
export async function rollbackPaperSnapshot(recoveryId: string, imported: PaperDocument[]) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['documents', 'recovery'], 'readwrite'),
      store = tx.objectStore('documents'),
      r = tx.objectStore('recovery').get(recoveryId);
    r.onsuccess = () => {
      if (!r.result) {
        tx.abort();
        return;
      }
      const old = r.result.documents as PaperDocument[],
        oldMap = new Map(old.map((d) => [d.id, d]));
      for (const expected of imported) {
        const q = store.get(expected.id);
        q.onsuccess = () => {
          // Never roll a concurrently edited record back over another tab's new ink.
          if (JSON.stringify(q.result) !== JSON.stringify(expected)) {
            tx.abort();
            return;
          }
          const previous = oldMap.get(expected.id);
          if (previous) store.put(previous);
          else store.delete(expected.id);
        };
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error('필기 원본 복구본은 보관함 recovery에 남아 있습니다. 앱을 닫지 마세요.'));
    };
  });
}
