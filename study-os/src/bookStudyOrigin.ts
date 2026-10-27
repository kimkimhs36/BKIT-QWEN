/** Only the book's opaque ID is kept in session storage.
 * Never copy worksheets, attachments, answers or personal details into navigation state.
 */
export const BOOK_STUDY_ORIGIN = 'bkit.books.study-origin.v1';

export function readBookStudyOrigin(port: Pick<Storage, 'getItem'>): string {
  try {
    const value = port.getItem(BOOK_STUDY_ORIGIN) ?? '';
    return value.length > 0 && value.length <= 100 ? value : '';
  } catch {
    return '';
  }
}
export function storeBookStudyOrigin(port: Pick<Storage, 'setItem' | 'removeItem'>, bookId: string | null) {
  try {
    if (!bookId) port.removeItem(BOOK_STUDY_ORIGIN);
    else if (bookId.length <= 100) port.setItem(BOOK_STUDY_ORIGIN, bookId);
  } catch {
    // Navigation still works in private browsing where sessionStorage is blocked.
  }
}
