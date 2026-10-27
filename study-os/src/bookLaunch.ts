import type { Book, BookMaterialLink } from './books';
import type { PaperDocument } from './paperModel';
import type { LearningData } from './learningModel';
import type { Task } from './model';

export type BookLaunch =
  | { kind: 'resource'; resourceId: string }
  | { kind: 'document'; documentId: string; materialId: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'timer' };

/**
 * In the current chapter, a linked real question bank outranks PDF reading.
 * A PDF's automatically created empty scaffold is NEVER a real problem.
 * Missing links cannot be opened; they remain visible separately in BOOKS.
 */
export function bookLaunch(
  book: Book,
  chapterId: string | null,
  documents: readonly Pick<PaperDocument, 'id'>[],
  learning: Pick<LearningData, 'resources'>,
  tasks: readonly Pick<Task, 'id' | 'status'>[],
): BookLaunch {
  const chapters: BookMaterialLink[][] = [
    book.materials.filter((link) => link.chapterId === chapterId),
    ...(chapterId === null ? [] : [book.materials.filter((link) => link.chapterId === null)]),
  ];
  // Chapter-local originals outrank book-wide suggestions.
  // Inside the same scope only, a separately authored question outranks a PDF.
  for (const scope of chapters) {
    for (const link of scope) {
      if (link.kind !== 'resource') continue;
      if (learning.resources.some((r) => r.id === link.targetId && !r.archived))
        return { kind: 'resource', resourceId: link.targetId };
    }
    for (const link of scope) {
      if (link.kind !== 'document') continue;
      if (documents.some((d) => d.id === link.targetId))
        return { kind: 'document', documentId: link.targetId, materialId: link.id };
    }
    for (const link of scope) {
      if (link.kind !== 'task') continue;
      if (tasks.some((t) => t.id === link.targetId && t.status !== 'done'))
        return { kind: 'task', taskId: link.targetId };
    }
  }
  return { kind: 'timer' };
}
