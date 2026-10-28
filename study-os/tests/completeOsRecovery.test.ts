import { beforeEach, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDFDocument } from 'pdf-lib';
import { newState, stateSchema, taskSchema } from '../src/model';
import { addResource } from '../src/learningEngine';
import { KEY } from '../src/storage';
import { newBook, linkMaterial, BOOKS_KEY, readBooks } from '../src/books';
import { bookLaunch } from '../src/bookLaunch';
import { newNotice, INBOX_KEY, inboxSchema } from '../src/schoolInbox';
import { findNotices } from '../src/noticeIndex';
import { sha256 } from '../src/localZip';
import { savePaperDocument, listPaperDocuments, readPaperFile } from '../src/paperStorage';
import { addVaultPhoto, readVaultPhoto } from '../src/photoVault';
import { documentSchema } from '../src/paperModel';
import {
  readDocument,
  saveDocument,
  startSession,
  submit,
  emptyDocument,
} from '../src/juggernaut/engine';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
} from '../src/completeBackup';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    get length() {
      return values.size;
    },
  } as Storage;
}
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

it('reopens a linked notice, editable original, book bookmark and both exam partitions on a fresh device after ZIP recovery', async () => {
  const source = storage();
  const photo = new Blob(['synthetic original photo']);
  await addVaultPhoto('study', {
    id: 'photo',
    name: 'notice.png',
    mime: 'image/png',
    size: photo.size,
    digest: await sha256(photo),
    bytes: await photo.arrayBuffer(),
  });
  let state = addResource(
    newState(),
    {
      title: '에너지 학습지',
      subject: '물질과 에너지',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    [],
  );
  const resource = state.learning!.resources[0];
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  pdf.addPage([300, 400]);
  const bytes = (await pdf.save()).buffer as ArrayBuffer;
  const pages = [0, 1].map((i) => ({
    id: 'page' + i,
    index: i,
    width: 300,
    height: 400,
    rotation: 0,
    bookmarked: i === 1,
  }));
  let doc = await savePaperDocument(
    documentSchema.parse({
      version: 1,
      id: 'document',
      fileId: 'original',
      resourceId: resource.id,
      name: 'energy.pdf',
      mime: 'application/pdf',
      digest: await sha256(new Blob([bytes])),
      size: bytes.byteLength,
      revision: 0,
      pages,
      layers: [],
      regions: [],
      cursor: { pageId: 'page1', zoom: 1.5, scrollLeft: 0, scrollTop: 40 },
      provenance: null,
      createdAt: '2026-10-28T01:00:00Z',
      updatedAt: '2026-10-28T01:00:00Z',
    }),
    bytes,
  );
  // Reopen, edit and save genuine editable metadata before export.
  doc = await savePaperDocument({
    ...doc,
    layers: [
      {
        id: 'layer',
        pageId: 'page1',
        problemId: null,
        strokes: [
          {
            id: 'stroke',
            pageId: 'page1',
            layerId: 'layer',
            tool: 'ballpoint',
            color: '#123456',
            width: 2,
            points: [
              { x: 10, y: 10, pressure: 0.5, tiltX: 0, tiltY: 0, time: 1 },
              { x: 50, y: 50, pressure: 0.7, tiltX: 0, tiltY: 0, time: 2 },
            ],
          },
        ],
      },
    ],
  });
  const notice = newNotice();
  notice.text = '에너지 실험 원본';
  notice.materials.photoIds = ['photo'];
  notice.materials.papers = [{ resource, problems: [], name: doc.name }];
  notice.taskIds = ['task'];
  notice.fullyRegistered = true;
  state.tasks = [
    taskSchema.parse({
      id: 'task',
      subject: resource.subject,
      title: '실험 보고서',
      kind: '수행평가',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'done',
      submitted: false,
      optional: false,
      notes: `[학교공지:${notice.id}]`,
      link: '',
      attachmentIds: ['photo'],
    }),
  ];
  let book = newBook('에너지 서재', resource.subject);
  book.chapters = [
    { id: 'chapter', parentId: null, title: '실험', note: '준비물 확인', status: 'review' },
  ];
  book = linkMaterial(book, { kind: 'document', targetId: doc.id, chapterId: 'chapter' });
  book.bookmark = { chapterId: 'chapter', materialId: book.materials[0].id };
  source.setItem(KEY, JSON.stringify(state));
  source.setItem(BOOKS_KEY, JSON.stringify({ version: 1, revision: 1, books: [book] }));
  source.setItem(INBOX_KEY, JSON.stringify({ version: 1, notices: [notice] }));
  source.setItem(
    'bkit.material.v1',
    JSON.stringify({ id: 'jelly', motion: 'reduced', intensity: 0.5, lowPower: false }),
  );
  const now = Date.parse('2026-10-28T01:00:00Z');
  for (const concept of ['balance', 'm28-substitution'] as const) {
    const history = readDocument(source).document;
    const session = { ...startSession(history, 'training', now, concept), answer: '99999' };
    saveDocument(source, submit(history, session, now + 1000).document);
  }
  const originalExam = readDocument(source).document.attempts;
  expect(originalExam).toHaveLength(2);
  const zip = await exportCompleteBackup(source);
  globalThis.indexedDB = new IDBFactory();
  const target = storage();
  await restoreCompleteBackup(await inspectCompleteBackup(zip, target), 'replace', target);
  const restoredState = stateSchema.parse(JSON.parse(target.getItem(KEY)!));
  const restoredBook = readBooks(target).data.books[0];
  const originals = await listPaperDocuments();
  expect(
    bookLaunch(restoredBook, 'chapter', originals, restoredState.learning!, restoredState.tasks),
  ).toEqual({ kind: 'document', documentId: doc.id, materialId: book.materials[0].id });
  expect(originals[0].cursor).toEqual(doc.cursor);
  expect(originals[0].layers).toEqual(doc.layers);
  expect(await readPaperFile(originals[0].fileId)).toEqual(bytes);
  expect(await new Blob([(await readVaultPhoto('study', 'photo'))!.bytes]).text()).toBe(
    await photo.text(),
  );
  const restoredInbox = inboxSchema.parse(JSON.parse(target.getItem(INBOX_KEY)!));
  expect(
    findNotices(restoredInbox.notices, restoredState.tasks, '에너지', 'submission'),
  ).toHaveLength(1);
  expect(restoredState.tasks[0].submitted).toBe(false);
  expect(restoredBook.chapters[0].status).toBe('review');
  expect(readDocument(target).document.attempts).toEqual(originalExam);
  expect(target.getItem('bkit.material.v1')).toBe(source.getItem('bkit.material.v1'));
});

it('refuses a complete-backup success when a linked book original is already missing', async () => {
  const source = storage();
  const book = linkMaterial(newBook('원본 누락', '수학'), {
    kind: 'document',
    targetId: 'missing',
    chapterId: null,
  });
  const raw = JSON.stringify({ version: 1, revision: 1, books: [book] });
  source.setItem(BOOKS_KEY, raw);
  await expect(exportCompleteBackup(source)).rejects.toThrow('원본이 누락');
  expect(source.getItem(BOOKS_KEY)).toBe(raw);
  expect(readDocument(source).document).toEqual(emptyDocument());
});
