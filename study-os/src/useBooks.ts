import { useEffect, useRef, useState } from 'react';
import { readBooks, writeBooks, emptyBooks, type BooksData, type Book } from './books';
export function useBooks() {
  const [initial] = useState(() => {
    try {
      return { ...readBooks(localStorage), error: '' };
    } catch {
      return {
        raw: null,
        data: emptyBooks(),
        error:
          '서재 데이터를 읽지 못했습니다. 원본을 덮어쓰지 않습니다. 설정의 전체 ZIP 백업 또는 원본 내보내기로 복구하세요.',
      };
    }
  });
  const [data, setData] = useState(initial.data),
    [error, setError] = useState(initial.error);
  const baseline = useRef(initial.raw),
    current = useRef(data),
    blocked = useRef(!!initial.error);
  useEffect(() => {
    const changed = () => {
      try {
        const v = readBooks(localStorage);
        baseline.current = v.raw;
        current.current = v.data;
        setData(v.data);
        blocked.current = false;
        setError('');
      } catch {
        blocked.current = true;
        setError('서재 변경을 읽지 못했습니다. 기존 원본은 유지됩니다.');
      }
    };
    window.addEventListener('storage', changed);
    window.addEventListener('bkit-books', changed);
    return () => {
      window.removeEventListener('storage', changed);
      window.removeEventListener('bkit-books', changed);
    };
  }, []);
  function save(change: (data: BooksData) => BooksData) {
    if (blocked.current) return false;
    try {
      const next = { ...change(current.current), revision: current.current.revision + 1 };
      baseline.current = writeBooks(localStorage, next, baseline.current);
      current.current = next;
      setData(next);
      setError('');
      window.dispatchEvent(new Event('bkit-books'));
      return true;
    } catch (e) {
      setError('저장하지 못했습니다. 입력과 원본은 유지됩니다. ' + (e as Error).message);
      return false;
    }
  }
  function update(id: string, change: (book: Book) => Book) {
    return save((d) => ({
      ...d,
      books: d.books.map((b) =>
        b.id === id ? { ...change(b), updatedAt: new Date().toISOString() } : b,
      ),
    }));
  }
  return { data, error, save, update, blocked: blocked.current };
}
