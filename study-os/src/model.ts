import { z } from 'zod';
import { learningSchema } from './learningModel';
const id = z.string().min(1).max(100),
  text = z.string().max(200),
  note = z.string().max(3000);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + 'T00:00:00Z');
    return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
  }, '유효한 날짜를 입력하세요');
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const instant = z.string().datetime({ offset: true });
const minutes = z.number().int().min(1).max(480);
export const taskDeadlineSchema = z.object({
  date,
  precision: z.enum(['date-only', 'exact-time']),
  provenance: z.enum(['explicit', 'inferred', 'user-confirmed']),
});
export const taskQuantitySchema = z
  .object({
    unit: z.enum(['problems', 'pages', 'passages', 'chapters']),
    total: z.number().int().min(1).max(10000),
    remaining: z.number().int().min(0).max(10000),
  })
  .refine((q) => q.remaining <= q.total, '남은 분량은 총량 이하여야 합니다');
export const taskEstimateSchema = z
  .object({
    minMinutes: minutes,
    maxMinutes: minutes,
    source: z.enum(['default', 'user', 'history']),
  })
  .refine((e) => e.minMinutes <= e.maxMinutes);
export const taskSchema = z
  .object({
    id,
    subject: text.min(1),
    title: text.min(1),
    kind: z.enum(['숙제', '수행평가', '시험공부', '개인 일정']),
    due: instant.nullable(),
    // Device-local private photo references; bytes never enter shared study data.
    attachmentIds: z.array(id).max(12).optional(),
    // Optional provenance preserves all existing v1 records.
    deadline: taskDeadlineSchema.optional(),
    quantity: taskQuantitySchema.optional(),
    estimate: taskEstimateSchema.optional(),
    priority: z.number().int().min(1).max(3),
    minutes,
    remaining: minutes,
    status: z.enum(['todo', 'doing', 'done']),
    submitted: z.boolean(),
    completedAt: instant.optional(),
    submissionRequired: z.boolean().optional(),
    capture: z.object({source:z.enum(['text','photo','manual']),confirmedByUser:z.boolean()}).optional(),
    optional: z.boolean(),
    notes: note,
    link: z
      .string()
      .max(1000)
      .refine((v) => !v || /^https?:\/\//.test(v), 'http(s) 링크만 사용할 수 있습니다'),
  })
  .refine((t) => !t.submitted || t.status === 'done', '제출은 완료 후 기록하세요');
export const scheduleSchema = z
  .object({
    id,
    title: text.min(1),
    subject: text,
    kind: z.enum(['school', 'academy', 'fixed']),
    days: z.array(z.number().int().min(0).max(6)).min(1),
    start: time,
    end: time,
    prep: z.number().int().min(0).max(180),
    travel: z.number().int().min(0).max(180),
    buffer: z.number().int().min(0).max(120),
    materials: text,
    date: date.nullable(),
    excluded: z.array(date).max(366),
  })
  .refine((s) => s.end > s.start, '종료는 시작보다 늦어야 합니다');
export const blockSchema = z
  .object({ id, taskId: id, start: instant, end: instant, locked: z.boolean() })
  .refine((b) => b.end > b.start);
export const segmentSchema = z
  .object({ start: instant, end: instant })
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), '집중 구간 종료 시각을 확인하세요');
/** A learner's own response; never presented as AI-verified correctness. */
export const learningAttemptSchema = z.object({
  id,
  answer: note.min(1),
  submittedAt: instant,
  selfCheck: z.enum(['unreviewed', 'remembered', 'retry']),
  hintUsed: z.boolean().optional(),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
  errorTag: z
    .enum([
      'concept',
      'procedure',
      'calculation',
      'interpretation',
      'unit',
      'vocabulary',
      'attention',
      'unknown',
    ])
    .optional(),
});
export const problemWorkspaceSchema = z.object({
  problem: note.min(1),
  source: text,
  sourceType: z
    .enum(['school-worksheet', 'textbook', 'academy-sheet', 'user-note', 'official-resource'])
    .optional(),
  problemNumber: text.optional(),
  attempts: z.array(learningAttemptSchema).max(20),
});
/** Zero-friction timer starts before the learner chooses any task or subject. */
export const quickTimerSchema = z.object({
  id,
  mode: z.enum(['stopwatch', 'countdown']),
  targetMinutes: minutes,
  started: instant,
  segmentStart: instant.nullable(),
  elapsed: z.number().finite().min(0),
  segments: z.array(segmentSchema).max(10000),
});
/** Per-question pace is an allocation of the shared study clock, never a second timer. */
export const questionPaceSchema = z.object({
  current: id,
  anchor: z.number().finite().nonnegative(),
  seconds: z.record(z.number().finite().nonnegative()).refine(v => Object.keys(v).length <= 10000),
  target: z.number().int().min(15).max(3600),
  review: z.array(id).max(10000),
  skipped: z.array(id).max(10000).optional(),
  targets: z.record(z.number().int().min(15).max(3600)).optional(),
  enteredAt: instant.optional(),
});
export const mockExamSchema = z.object({
  duration: z.number().int().min(60).max(28800),
  problemIds: z.array(id).min(1).max(10000).refine(ids=>new Set(ids).size===ids.length,'시험 문항이 중복됐어요.'),
  finishedAt: instant.nullable(),
});
export const activeSchema = z.object({
  id,
  quick: z.boolean().optional(),
  quickMode: z.enum(['stopwatch', 'countdown']).optional(),
  taskId: id.nullable(),
  subject: text,
  action: text.min(1),
  target: minutes,
  started: instant,
  workspace: problemWorkspaceSchema.optional(),
  resourceId: id.optional(),
  questionPace: questionPaceSchema.optional(),
  exam: mockExamSchema.optional(),
  segmentStart: instant.nullable(),
  elapsed: z.number().finite().min(0),
  pauses: z.array(z.object({ at: instant, reason: text })).max(100),
  segments: z.array(segmentSchema).max(10000).optional(),
});
export const sessionSchema = z.object({
  id,
  quick: z.boolean().optional(),
  taskId: id.nullable(),
  subject: text,
  action: text,
  started: instant,
  ended: instant,
  workspace: problemWorkspaceSchema.optional(),
  resourceId: id.optional(),
  questionPace: questionPaceSchema.optional(),
  exam: mockExamSchema.optional(),
  seconds: z.number().finite().min(0),
  target: minutes,
  problems: z.number().int().min(0).max(10000),
  concepts: text,
  rating: z.enum(['어려움', '보통', '이해함']),
  reason: text,
  pauses: z.array(z.object({ at: instant, reason: text })),
  mistake: note,
  reviewDate: date.nullable(),
  segments: z.array(segmentSchema).max(10000).optional(),
});
export const settingsSchema = z
  .object({
    wake: time,
    bed: time,
    minSleep: z.number().min(7).max(12),
    focus: minutes,
    mealStart: time,
    mealMinutes: z.number().int().min(15).max(120),
    breakMinutes: z.number().int().min(5).max(30),
    goal: text,
  })
  .refine((s) => s.wake < s.bed, '기상은 취침보다 앞서야 합니다 (자정 전 취침 기준)');
export const gradeSchema = z.object({
  id,
  subject: text.min(1),
  exam: text.min(1),
  date: date.nullable(),
  target: z.number().min(0).max(100).nullable(),
  score: z.number().min(0).max(100).nullable(),
});
export const examSchema = z
  .object({
    id,
    subject: text.min(1),
    title: text.min(1),
    date: date.nullable(),
    confirmedScope: note,
    uncertainScope: note,
    source: note,
    availableMaterials: note,
    missingMaterials: note,
    weakConcepts: note,
    linkedResourceIds: z.array(id).max(1000).optional(),
    updatedAt: instant,
  })
  .refine(
    (e) => !e.confirmedScope.trim() || !!e.source.trim(),
    '확인한 시험 범위의 출처를 적어 주세요.',
  );
export const stateSchema = z
  .object({
    version: z.literal(1),
    learning: learningSchema.optional(),
    juggernaut: z.object({
      examDate: date.nullable(), weeklyMinutes: z.number().int().min(5).max(3000),
      subjects:z.array(z.object({subject:text.min(1),target:note,scope:note,review:note,weekly:note})).max(12).optional(),
      preparation:z.array(z.object({id,text:text.min(1),done:z.boolean()})).max(20).optional(),
    }).optional(),
    revision: z.number().int().min(0),
    tasks: z.array(taskSchema).max(500),
    schedules: z.array(scheduleSchema).max(300),
    sessions: z.array(sessionSchema).max(5000),
    active: activeSchema.nullable(),
    quickTimer: quickTimerSchema.nullable().optional(),
    plan: z.array(blockSchema).max(500),
    undo: z.array(blockSchema).max(500).nullable(),
    settings: settingsSchema,
    grades: z.array(gradeSchema).max(500),
    exams: z.array(examSchema).max(500).optional(),
    reviewsDone: z.array(id).max(5000),
    learningEvents: z
      .array(
        z.object({
          id,
          type: z.enum(['RecommendationShown', 'StudyStarted', 'FirstLearningAttempt']),
          at: instant,
          foregroundAt: instant,
          taskId: id.nullable(),
          sessionId: id.nullable(),
          action: text,
        }),
      )
      .max(50000)
      .optional(),
    problemRetests: z
      .array(learningAttemptSchema.extend({ sessionId: id }))
      .max(50000)
      .optional(),
    // Optional to preserve existing v1 backups and local records.
    reviewProgress: z
      .array(
        z.object({
          sessionId: id,
          stage: z.number().int().min(0).max(2),
          due: date,
          updatedAt: instant,
        }),
      )
      .max(5000)
      .optional(),
  })
  .superRefine((s, ctx) => {
    for (const key of ['tasks', 'schedules', 'sessions', 'plan', 'grades'] as const)
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        ctx.addIssue({ code: 'custom', message: `${key}: 중복 ID` });
    const clocks = [s.active, s.quickTimer].filter((v) => v != null);
    if (clocks.length > 1 || clocks.some((v) => s.sessions.some((x) => x.id === v.id)))
      ctx.addIssue({ code: 'custom', message: '진행 중인 타이머 또는 완료 기록 ID가 중복되었습니다' });
    // Compare instants, not their textual timezone notation. Legacy sessions
    // without segment metadata remain readable; provided metadata must agree.
    const checkSegments = (
      started: string,
      segments: z.infer<typeof segmentSchema>[] | undefined,
      seconds: number,
      end?: string | null,
    ) => {
      const lower = Date.parse(started);
      const upper = end ? Date.parse(end) : Infinity;
      if (upper < lower) return false;
      if (!segments) return true;
      let previousEnd = lower;
      let duration = 0;
      for (const segment of segments) {
        const a = Date.parse(segment.start), b = Date.parse(segment.end);
        if (a < previousEnd || b > upper) return false;
        duration += (b - a) / 1000;
        previousEnd = b;
      }
      return Math.abs(duration - seconds) <= 0.01;
    };
    for (const session of s.sessions)
      if (!checkSegments(session.started, session.segments, session.seconds, session.ended))
        ctx.addIssue({ code: 'custom', message: '집중 구간과 타이머 합계가 일치하지 않습니다' });
    for (const timer of clocks)
      if (!checkSegments(timer.started, timer.segments, timer.elapsed, timer.segmentStart))
        ctx.addIssue({ code: 'custom', message: '진행 중인 집중 구간과 누적 시간이 일치하지 않습니다' });
    if(s.active?.exam) {
      const a=s.active,exam=a.exam!;
      if(!a.resourceId || exam.problemIds.some(id=>!s.learning?.problems.some(p=>p.id===id&&p.resourceId===a.resourceId)) || (a.questionPace && !exam.problemIds.includes(a.questionPace.current)) || (exam.finishedAt && a.segmentStart))
        ctx.addIssue({code:'custom',message:'모의시험의 자료·문항 또는 종료 상태를 확인하세요.'});
    }
    if (s.plan.some((b) => !s.tasks.some((t) => t.id === b.taskId)))
      ctx.addIssue({ code: 'custom', message: '계획의 과제를 찾을 수 없습니다' });
  });
export type State = z.infer<typeof stateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Session = z.infer<typeof sessionSchema>;
export const newState = (): State => ({
  version: 1,
  revision: 0,
  tasks: [],
  schedules: [],
  sessions: [],
  active: null,
  quickTimer: null,
  plan: [],
  undo: null,
  grades: [],
  reviewsDone: [],
  reviewProgress: [],
  settings: {
    wake: '07:00',
    bed: '23:00',
    minSleep: 8,
    focus: 25,
    mealStart: '18:00',
    mealMinutes: 45,
    breakMinutes: 5,
    goal: '오늘의 작은 학습을 차분히 완성하기',
  },
});
export const uid = () => crypto.randomUUID();
