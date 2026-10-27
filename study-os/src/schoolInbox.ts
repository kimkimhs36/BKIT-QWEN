import { z } from 'zod';
import { uid, type Task, type State } from './model';
import { resourceSchema, learningProblemSchema } from './learningModel';

export const INBOX_KEY = 'bkit.school-inbox.v1';
const materialSchema = z.object({
  photoIds: z.array(z.string().min(1).max(100)).max(12),
  papers: z
    .array(
      z.object({
        resource: resourceSchema,
        problems: z.array(learningProblemSchema),
        name: z.string().max(1000),
      }),
    )
    .max(30),
});
export const inboxSchema = z
  .object({
    version: z.literal(1),
    notices: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          createdAt: z.string().datetime(),
          text: z.string().max(12000),
          ocrText: z.string().max(3000),
          materials: materialSchema,
          reviewed: z.boolean(),
          fullyRegistered: z.boolean().optional(),
          archived: z.boolean(),
          taskIds: z.array(z.string().min(1).max(100)).max(100),
        }),
      )
      .max(1000),
  })
  .refine(
    (data) => new Set(data.notices.map((n) => n.id)).size === data.notices.length,
    '중복된 공지 ID가 있어요.',
  );
export type SchoolInboxData = z.infer<typeof inboxSchema>;
export type SchoolNotice = SchoolInboxData['notices'][number];
export function newNotice(): SchoolNotice {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    text: '',
    ocrText: '',
    materials: { photoIds: [], papers: [] },
    reviewed: false,
    archived: false,
    taskIds: [],
  };
}
export function noticeTasks(notice: SchoolNotice, tasks: Task[]) {
  return tasks.filter(
    (t) => notice.taskIds.includes(t.id) || t.notes.includes(`[학교공지:${notice.id}]`),
  );
}
/** Completion is derived from committed task records, never a separate optimistic flag. */
export function noticeStatus(notice: SchoolNotice, tasks: Task[]) {
  if (notice.archived) return '보관';
  const linked = noticeTasks(notice, tasks);
  if (
    notice.fullyRegistered &&
    linked.length &&
    notice.taskIds.every((id) => linked.some((t) => t.id === id))
  )
    return '과제 등록 완료';
  if (linked.length) return '정리 확인 필요';
  return notice.reviewed || notice.ocrText ? '정리 확인 필요' : '받은 공지';
}
export function attachNoticeResources(state: State, notice: SchoolNotice, task: Task): State {
  const existing = state.learning ?? {
    version: 1 as const,
    resources: [],
    problems: [],
    attempts: [],
  };
  return {
    ...state,
    tasks: [...state.tasks, task],
    learning: {
      ...existing,
      resources: [
        ...existing.resources,
        ...notice.materials.papers
          .filter((p) => !existing.resources.some((r) => r.id === p.resource.id))
          .map((p) => ({ ...p.resource, subject: task.subject, linkedTaskId: task.id })),
      ],
      problems: [
        ...existing.problems,
        ...notice.materials.papers
          .flatMap((p) => p.problems)
          .filter((p) => !existing.problems.some((x) => x.id === p.id)),
      ],
    },
  };
}
