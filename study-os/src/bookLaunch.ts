import type { Book, BookMaterialLink } from './books';
import type { PaperDocument } from './paperModel';
import type { LearningData } from './learningModel';
import type { Task } from './model';

export type BookLaunch =
  | { kind: 'resource'; resourceId: string }
  | { kind: 'document'; documentId: string; materialId: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'timer' };

type Original = Pick<PaperDocument, 'id'> & Partial<Pick<PaperDocument, 'resourceId' | 'regions'>>;

export function hasPracticeQuestions(
  learning: Pick<LearningData, 'problems'>,
  resourceId: string,
  documents: readonly Original[],
): boolean {
  return learning.problems.some(
    (p) =>
      p.resourceId === resourceId &&
      (!!p.body.trim() ||
        !!p.mediaId ||
        documents.some(
          (d) =>
            d.resourceId === resourceId && d.regions?.some((region) => region.problemId === p.id),
        )),
  );
}

/**
 * In the current chapter, a linked real question bank outranks PDF reading.
 * A PDF's automatically created empty scaffold is NEVER a real problem.
 * Missing links cannot be opened; they remain visible separately in BOOKS.
 */
export function bookLaunch(
  book: Book,
  chapterId: string | null,
  documents: readonly Original[],
  learning: Pick<LearningData, 'resources' | 'problems'>,
  tasks: readonly Pick<Task, 'id' | 'status'>[],
): BookLaunch {
  const chapters: BookMaterialLink[][] = [
    book.materials.filter((link) => link.chapterId === chapterId),
    ...(chapterId === null ? [] : [book.materials.filter((link) => link.chapterId === null)]),
  ];
  function resolve(link: BookMaterialLink): BookLaunch | null {
    if (link.kind === 'resource') {
      const resource = learning.resources.find((r) => r.id === link.targetId && !r.archived);
      if (!resource) return null;
      if (hasPracticeQuestions(learning, resource.id, documents))
        return { kind: 'resource', resourceId: resource.id };
      // Older imports may link a blank PDF scaffold as a resource. Open its original;
      // never erase that scaffold or any historical answers while repairing navigation.
      const original = documents.find((d) => d.resourceId === resource.id);
      return original ? { kind: 'document', documentId: original.id, materialId: link.id } : null;
    }
    if (link.kind === 'document' && documents.some((d) => d.id === link.targetId))
      return { kind: 'document', documentId: link.targetId, materialId: link.id };
    if (link.kind === 'task' && tasks.some((t) => t.id === link.targetId && t.status !== 'done'))
      return { kind: 'task', taskId: link.targetId };
    return null;
  }
  // Chapter-local originals outrank book-wide suggestions.
  // Inside the same scope only, a separately authored question outranks a PDF.
  for (const scope of chapters) {
    const bookmark = scope.find((link) => link.id === book.bookmark.materialId);
    const continued = bookmark && resolve(bookmark);
    if (continued) return continued;
    for (const kind of ['resource', 'document', 'task'] as const) {
      for (const link of scope.filter((link) => link.kind === kind)) {
        const result = resolve(link);
        if (result) return result;
      }
    }
  }
  return { kind: 'timer' };
}
