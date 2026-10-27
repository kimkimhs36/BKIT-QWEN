import { beforeEach, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  BOOKS_KEY,
  booksSchema,
  emptyBooks,
  newBook,
  readBooks,
  writeBooks,
  linkMaterial,
  moveChapter,
  mergeBooks,
} from '../src/books';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
} from '../src/completeBackup';
function storage() {
  const map = new Map<string, string>();
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
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
it('roundtrips books and chapters without adding them to the Cloud v2 study state', () => {
  const s = storage(),
    b = newBook('미적분Ⅰ', '미적분Ⅰ');
  b.chapters = [{ id: 'c', parentId: null, title: '함수의 극한', note: '복습', status: 'review' }];
  b.bookmark.chapterId = 'c';
  writeBooks(s, { ...emptyBooks(), books: [b] }, null);
  expect(readBooks(s).data.books[0]).toEqual(b);
  expect(s.getItem('bkit.study-os.v1')).toBeNull();
});
it('refuses conflicts, quota failures and corrupt data without overwriting originals', () => {
  const s = storage();
  s.setItem(BOOKS_KEY, 'broken');
  expect(() => readBooks(s)).toThrow();
  expect(() => writeBooks(s, emptyBooks(), null)).toThrow();
  expect(s.getItem(BOOKS_KEY)).toBe('broken');
  const quota = {
    getItem: () => null,
    setItem: () => {
      throw Error('QuotaExceededError');
    },
  };
  expect(() => writeBooks(quota, emptyBooks(), null)).toThrow('QuotaExceededError');
});
it('links IDs idempotently and reorders siblings while preserving parents and progress', () => {
  let b = newBook('수학', '수학');
  b.chapters = [
    { id: 'a', parentId: null, title: 'A', note: '', status: 'done' },
    { id: 'b', parentId: null, title: 'B', note: '', status: 'todo' },
    { id: 'c', parentId: 'a', title: 'C', note: '', status: 'review' },
  ];
  const m = { kind: 'document' as const, targetId: 'pdf', chapterId: 'c' };
  b = linkMaterial(linkMaterial(b, m), m);
  expect(b.materials).toHaveLength(1);
  b = moveChapter(b, 'b', -1);
  expect(b.chapters.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  expect(b.chapters[2].parentId).toBe('a');
  expect(
    booksSchema.safeParse({
      ...emptyBooks(),
      books: [{ ...b, chapters: [{ ...b.chapters[2], parentId: 'missing' }] }],
    }).success,
  ).toBe(false);
});
it('trash and archive preserve links and can be reversed; merge keeps conflicting versions', () => {
  const b = linkMaterial(newBook('국어', '국어'), {
    kind: 'resource',
    targetId: 'r',
    chapterId: null,
  });
  const trash = { ...b, deletedAt: new Date().toISOString(), archived: true };
  expect(booksSchema.parse({ ...emptyBooks(), books: [trash] }).books[0].materials).toEqual(
    b.materials,
  );
  expect(
    mergeBooks(
      { ...emptyBooks(), books: [b] },
      { ...emptyBooks(), books: [{ ...b, title: '변경' }] },
    ).books,
  ).toHaveLength(2);
});
it('includes Books in complete ZIP export, inspection, merge and restore', async () => {
  const s = storage(),
    b = newBook('미적분Ⅰ', '미적분Ⅰ');
  writeBooks(s, { ...emptyBooks(), books: [b] }, null);
  const zip = await exportCompleteBackup(s);
  const dest = storage();
  const inspected = await inspectCompleteBackup(zip, dest);
  await restoreCompleteBackup(inspected, 'replace', dest);
  expect(readBooks(dest).data.books).toEqual([b]);
  const inspectedAgain = await inspectCompleteBackup(zip, dest);
  await restoreCompleteBackup(inspectedAgain, 'merge', dest);
  expect(readBooks(dest).data.books).toHaveLength(1);
});
