import { describe, expect, it } from 'vitest';
import { BOOK_STUDY_ORIGIN, readBookStudyOrigin, storeBookStudyOrigin } from '../src/bookStudyOrigin';

function port() {
  const values = new Map<string,string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('BOOKS post-study return navigation', () => {
  it('stores only a bounded opaque book identifier in session-only storage', () => {
    const storage = port();
    storeBookStudyOrigin(storage, 'book-id-123');
    expect(readBookStudyOrigin(storage)).toBe('book-id-123');
    expect(storage.getItem(BOOK_STUDY_ORIGIN)).toBe('book-id-123');
    storeBookStudyOrigin(storage, null);
    expect(readBookStudyOrigin(storage)).toBe('');
    expect(storage.getItem(BOOK_STUDY_ORIGIN)).toBeNull();
  });
  it('refuses an invalid oversized ID', () => {
    const storage = port();
    storeBookStudyOrigin(storage, 'x'.repeat(101));
    expect(storage.getItem(BOOK_STUDY_ORIGIN)).toBeNull();
  });
  it('continues app navigation when private browsing blocks session storage', () => {
    const blocked = {
      getItem: (_: string) => { throw Error('denied'); },
      setItem: (_: string, __: string) => { throw Error('denied'); },
      removeItem: (_: string) => { throw Error('denied'); },
    };
    expect(readBookStudyOrigin(blocked)).toBe('');
    expect(() => storeBookStudyOrigin(blocked, 'foo')).not.toThrow();
    expect(() => storeBookStudyOrigin(blocked, null)).not.toThrow();
  });
});
