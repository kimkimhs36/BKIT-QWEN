import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { addResource } from '../src/learningEngine';
import { newState } from '../src/model';
import { sha256 } from '../src/localZip';
import { addVaultPhoto } from '../src/photoVault';
import { auditStudyStorage } from '../src/storageReadiness';
import { savePaperDocument } from '../src/paperStorage';
import type { PaperDocument } from '../src/paperModel';

function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    key: (index: number) => [...map.keys()][index] ?? null,
    clear: () => map.clear(),
    get length() { return map.size; },
  } as Storage;
}
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

describe('daily-use storage readiness', () => {
  it('audits an intact worksheet, its original PDF and linked study photo without changing study JSON', async () => {
    const state = addResource(
      newState(),
      {
        title: '수학 실전',
        subject: '수학',
        sourceType: 'school-worksheet',
        linkedTaskId: null,
        linkedMediaIds: ['photo-1'],
      },
      ['문제 1'],
    );
    const s = storage({ 'bkit.study-os.v1': JSON.stringify(state) });
    const before = s.getItem('bkit.study-os.v1');
    const image = new Blob(['worksheet image']);
    await addVaultPhoto('study', {
      id: 'photo-1', bytes: await image.arrayBuffer(), name: 'image.png',
      mime: 'image/png', size: image.size, digest: await sha256(image),
    });
    const original = new Blob(['test original PDF bytes']);
    const doc: PaperDocument = {
      version: 1, id: 'doc-1', fileId: 'pdf-1',
      resourceId: state.learning!.resources[0].id,
      name: 'test.pdf', mime: 'application/pdf',
      digest: await sha256(original), size: original.size, revision: 0,
      pages: [{ id: 'page-1', index: 0, width: 600, height: 800, rotation: 0, bookmarked: false }],
      layers: [], regions: [], inkHistory: [],
      cursor: { pageId: 'page-1', zoom: 1, scrollLeft: 0, scrollTop: 0 },
      provenance: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await savePaperDocument(doc, await original.arrayBuffer());
    const result = await auditStudyStorage(s);
    expect(result.findings.filter((f) => f.level === 'error')).toEqual([]);
    expect(result.paperDocuments).toBe(1);
    expect(result.verifiedOriginals).toBe(1);
    expect(result.studyPhotos).toBe(1);
    expect(result.verifiedStudyPhotos).toBe(1);
    expect(result.verifiedSleepPhotos).toBe(0);
    expect(s.getItem('bkit.study-os.v1')).toBe(before);
    expect(s.length).toBe(1); // Disposable write probe was removed.
  });

  it('reports malformed original records without overwriting the corrupt bytes', async () => {
    const s = storage({ 'bkit.study-os.v1': '{invalid' });
    const result = await auditStudyStorage(s);
    expect(result.findings.some((f) => f.level === 'error' && f.message.includes('학습 기록'))).toBe(true);
    expect(s.getItem('bkit.study-os.v1')).toBe('{invalid');
  });

  it('detects a missing original photo referenced by a resource', async () => {
    const state = addResource(
      newState(),
      { title: '학습지', subject: '물리', sourceType: 'school-worksheet',
        linkedTaskId: null, linkedMediaIds: ['lost-photo'] },
      ['1번'],
    );
    const result = await auditStudyStorage(storage({ 'bkit.study-os.v1': JSON.stringify(state) }));
    expect(result.findings.some((f) => f.level === 'error' && f.message.includes('학습 사진'))).toBe(true);
  });

  it('detects a study photo whose record exists but whose original bytes changed', async () => {
    const state = addResource(
      newState(),
      { title: '손상된 학습지', subject: '수학', sourceType: 'school-worksheet',
        linkedTaskId: null, linkedMediaIds: ['photo-corrupt'] },
      ['1번'],
    );
    const original = new Blob(['original photo bytes']);
    const damaged = new Blob(['different photo bytes']);
    await addVaultPhoto('study', {
      id: 'photo-corrupt', bytes: await damaged.arrayBuffer(), name: 'worksheet.png',
      mime: 'image/png', size: damaged.size, digest: await sha256(original),
    });
    const result = await auditStudyStorage(storage({ 'bkit.study-os.v1': JSON.stringify(state) }));
    expect(result.studyPhotos).toBe(1);
    expect(result.verifiedStudyPhotos).toBe(0);
    expect(result.findings.some((f) => f.level === 'error' && f.message.includes('체크섬'))).toBe(true);
  });

  it('detects a sleep photo whose stored size differs from its actual bytes', async () => {
    const blob = new Blob(['sleep photo']);
    await addVaultPhoto('sleep', {
      id: 'sleep-corrupt', bytes: await blob.arrayBuffer(), name: 'sleep.png',
      mime: 'image/png', size: blob.size + 1, digest: await sha256(blob),
    });
    const result = await auditStudyStorage(storage());
    expect(result.sleepPhotos).toBe(1);
    expect(result.verifiedSleepPhotos).toBe(0);
    expect(result.findings.some((f) => f.level === 'error' && f.message.includes('수면 사진 원본'))).toBe(true);
  });

  it('reports a failed write probe instead of claiming storage health', async () => {
    const s = storage({ 'bkit.study-os.v1': JSON.stringify(newState()) });
    s.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    const result = await auditStudyStorage(s);
    expect(result.findings.some((f) => f.level === 'error' && f.message.includes('저장 쓰기'))).toBe(true);
  });
});
