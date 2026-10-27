import { z } from 'zod';
import { uid } from './model';
import type { StoragePort } from './storage';
export const BOOKS_KEY = 'bkit.books.v1';
const id = z.string().min(1).max(100);
const name = z.string().trim().min(1).max(200);
export const chapterSchema = z.object({
  id,
  parentId: id.nullable(),
  title: name,
  note: z.string().max(5000),
  status: z.enum(['todo', 'studying', 'review', 'done']),
});
export const materialLinkSchema = z.object({
  id,
  chapterId: id.nullable(),
  kind: z.enum(['document', 'resource', 'task']),
  targetId: id,
});
export const bookSchema = z.object({
  id,
  title: name,
  subject: name,
  grade: z.string().max(100),
  curriculum: z.string().max(100),
  publisher: z.string().max(100),
  cover: z
    .string()
    .max(180000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .nullable(),
  archived: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime().nullable(),
  chapters: z.array(chapterSchema).max(1000),
  materials: z.array(materialLinkSchema).max(3000),
  // This is navigation and self-reported progress, never a correctness/understanding score.
  bookmark: z.object({ chapterId: id.nullable(), materialId: id.nullable() }),
  catalog: z
    .object({ id, revision: z.number().int().nonnegative(), verifiedAt: z.string().datetime() })
    .nullable(),
});
export const booksSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    books: z.array(bookSchema).max(300),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const b of data.books) {
      if (ids.has(b.id)) ctx.addIssue({ code: 'custom', message: '중복된 책 ID' });
      ids.add(b.id);
      const chapters = new Map(b.chapters.map((c) => [c.id, c]));
      if (
        chapters.size !== b.chapters.length ||
        new Set(b.materials.map((m) => m.id)).size !== b.materials.length
      )
        ctx.addIssue({ code: 'custom', message: '중복된 단원 또는 연결 ID' });
      for (const c of b.chapters)
        if (
          c.parentId &&
          (!chapters.has(c.parentId) || chapters.get(c.parentId)?.parentId !== null)
        )
          ctx.addIssue({ code: 'custom', message: '대단원·소단원 구조가 올바르지 않습니다.' });
      for (const m of b.materials)
        if (m.chapterId && !chapters.has(m.chapterId))
          ctx.addIssue({ code: 'custom', message: '자료의 단원이 없습니다.' });
      if (b.bookmark.chapterId && !chapters.has(b.bookmark.chapterId))
        ctx.addIssue({ code: 'custom', message: '책갈피 단원이 없습니다.' });
    }
  });
export type Book = z.infer<typeof bookSchema>;
export type BookChapter = z.infer<typeof chapterSchema>;
export type BookMaterialLink = z.infer<typeof materialLinkSchema>;
export type BooksData = z.infer<typeof booksSchema>;
export const emptyBooks = (): BooksData => ({ version: 1, revision: 0, books: [] });
export function readBooks(storage: StoragePort) {
  const raw = storage.getItem(BOOKS_KEY);
  return { raw, data: raw ? booksSchema.parse(JSON.parse(raw)) : emptyBooks() };
}
export function writeBooks(storage: StoragePort, data: BooksData, expectedRaw: string | null) {
  const raw = JSON.stringify(booksSchema.parse(data));
  if (storage.getItem(BOOKS_KEY) !== expectedRaw)
    throw new Error(
      '다른 화면에서 서재가 변경되었습니다. 입력을 복사한 뒤 서재를 다시 열어 주세요.',
    );
  storage.setItem(BOOKS_KEY, raw);
  return raw;
}
export function newBook(title: string, subject: string): Book {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title,
    subject,
    grade: '',
    curriculum: '',
    publisher: '',
    cover: null,
    archived: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    chapters: [],
    materials: [],
    bookmark: { chapterId: null, materialId: null },
    catalog: null,
  };
}
export function linkMaterial(book: Book, input: Omit<BookMaterialLink, 'id'>): Book {
  if (
    book.materials.some(
      (m) =>
        m.kind === input.kind && m.targetId === input.targetId && m.chapterId === input.chapterId,
    )
  )
    return book;
  return { ...book, materials: [...book.materials, { ...input, id: uid() }] };
}
export function moveChapter(book: Book, id: string, delta: number): Book {
  const c = book.chapters.find((c) => c.id === id);
  if (!c) return book;
  const siblings = book.chapters.filter((x) => x.parentId === c.parentId);
  const other = siblings[siblings.indexOf(c) + delta];
  if (!other) return book;
  return {
    ...book,
    chapters: book.chapters.map((x) => (x.id === id ? other : x.id === other.id ? c : x)),
  };
}
/** Merge retains both versions on an ID collision; remap navigation along with book ID. */
export function mergeBooks(local: BooksData, incoming: BooksData): BooksData {
  const ids = new Set(local.books.map((b) => b.id));
  return booksSchema.parse({
    version: 1,
    revision: local.revision + 1,
    books: [
      ...local.books,
      ...incoming.books
        .filter((b) => !local.books.some((x) => JSON.stringify(x) === JSON.stringify(b)))
        .map((b) => ({ ...b, id: ids.has(b.id) ? uid() : b.id })),
    ],
  });
}
export const BOOK_SUBJECTS = [
  '미적분Ⅰ',
  '영어Ⅱ',
  '국어',
  '경제',
  '역학과 에너지',
  '물질과 에너지',
  '미술 감상과 비평',
  '로봇과 공학',
  '소프트웨어 기초',
];
