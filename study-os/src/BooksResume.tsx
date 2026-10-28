import { BookOpen } from 'lucide-react';
import { useBooks } from './useBooks';
import './books.css';
export function BooksResume({ onOpen }: { onOpen: () => void }) {
  const { data } = useBooks();
  const book = data.books
    .filter((b) => !b.archived && !b.deletedAt && b.lastOpenedAt)
    .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))[0];
  if (!book) return null;
  return (
    <button
      className="books-resume"
      onClick={() => {
        try {
          sessionStorage.setItem('bkit.books.selected', book.id);
        } catch {
          /* navigation only */
        }
        onOpen();
      }}
    >
      <BookOpen size={18} aria-hidden="true" />
      <span>
        <small>최근 공부한 책</small>
        <strong>
          {book.title}
          {book.bookmark.chapterId
            ? ' · ' + book.chapters.find((c) => c.id === book.bookmark.chapterId)?.title
            : ''}
        </strong>
      </span>
      <span>이어서 공부 →</span>
    </button>
  );
}
