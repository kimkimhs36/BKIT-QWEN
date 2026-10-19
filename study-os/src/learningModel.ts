import { z } from 'zod';
const id = z.string().min(1).max(100);
const stamp = z.string().datetime({ offset: true });
const short = z.string().max(200);
const note = z.string().max(3000);
export const resourceSchema = z.object({
  id,
  title: short.min(1),
  subject: short.min(1),
  sourceType: z.enum([
    'school-worksheet',
    'academy-sheet',
    'textbook',
    'user-note',
    'official-resource',
  ]),
  linkedTaskId: id.nullable(),
  linkedMediaIds: z.array(id).max(120),
  currentProblemId: id.nullable(),
  lastOpenedAt: stamp.nullable(),
  archived: z.boolean().optional(),
  createdAt: stamp,
  updatedAt: stamp,
});
export const learningProblemSchema = z.object({
  id,
  resourceId: id,
  ordinal: z.number().int().min(1).max(10000),
  title: short,
  body: note,
  sourceReference: short,
  mediaId: id.nullable(),
  concept: short,
  referenceAnswer: note,
  example: note,
  draft: note,
  draftFields: z.record(z.string().max(1000)),
  createdAt: stamp,
  updatedAt: stamp,
});
export const resourceAttemptSchema = z.object({
  id,
  problemId: id,
  sessionId: id,
  learnerAnswer: note.min(1),
  fields: z.record(z.string().max(1000)),
  hintUsed: z.boolean(),
  confidence: z.enum(['low', 'medium', 'high']),
  selfCheck: z.enum(['unreviewed', 'correct', 'incorrect']),
  errorTag: z.enum([
    'concept',
    'procedure',
    'calculation',
    'unit',
    'interpretation',
    'vocabulary',
    'attention',
    'unknown',
  ]),
  submittedAt: stamp,
  checkedAt: stamp.nullable(),
});
export const learningSchema = z
  .object({
    version: z.literal(1),
    resources: z.array(resourceSchema).max(1000),
    problems: z.array(learningProblemSchema).max(10000),
    attempts: z.array(resourceAttemptSchema).max(50000),
  })
  .superRefine((v, ctx) => {
    for (const key of ['resources', 'problems', 'attempts'] as const)
      if (new Set(v[key].map((x) => x.id)).size !== v[key].length)
        ctx.addIssue({ code: 'custom', message: `${key}: 중복 ID` });
    const resources = new Set(v.resources.map((r) => r.id));
    const problems = new Map(v.problems.map((p) => [p.id, p]));
    if (
      v.problems.some((p) => !resources.has(p.resourceId)) ||
      v.attempts.some((a) => !problems.has(a.problemId))
    )
      ctx.addIssue({ code: 'custom', message: '학습 자료 또는 문제 참조를 찾을 수 없습니다' });
    if (
      v.resources.some(
        (r) => r.currentProblemId && problems.get(r.currentProblemId)?.resourceId !== r.id,
      )
    )
      ctx.addIssue({ code: 'custom', message: '이어 풀 문제의 자료가 일치하지 않습니다' });
    for (const r of v.resources) {
      const ordinals = v.problems.filter((p) => p.resourceId === r.id).map((p) => p.ordinal);
      if (new Set(ordinals).size !== ordinals.length)
        ctx.addIssue({ code: 'custom', message: '자료 내 문제 번호가 중복되었습니다' });
    }
  });
export type LearningData = z.infer<typeof learningSchema>;
export type LearningResource = z.infer<typeof resourceSchema>;
export type LearningProblem = z.infer<typeof learningProblemSchema>;
export type ResourceAttempt = z.infer<typeof resourceAttemptSchema>;
export const emptyLearning = (): LearningData => ({
  version: 1,
  resources: [],
  problems: [],
  attempts: [],
});
