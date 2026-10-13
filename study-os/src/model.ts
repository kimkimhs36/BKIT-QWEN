import { z } from 'zod';
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
export const taskSchema = z
  .object({
    id,
    subject: text.min(1),
    title: text.min(1),
    kind: z.enum(['숙제', '수행평가', '시험공부', '개인 일정']),
    due: instant.nullable(),
    priority: z.number().int().min(1).max(3),
    minutes,
    remaining: minutes,
    status: z.enum(['todo', 'doing', 'done']),
    submitted: z.boolean(),
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
export const activeSchema = z.object({
  id,
  taskId: id.nullable(),
  subject: text,
  action: text.min(1),
  target: minutes,
  started: instant,
  segmentStart: instant.nullable(),
  elapsed: z.number().min(0),
  pauses: z.array(z.object({ at: instant, reason: text })).max(100),
});
export const sessionSchema = z.object({
  id,
  taskId: id.nullable(),
  subject: text,
  action: text,
  started: instant,
  ended: instant,
  seconds: z.number().min(0),
  target: minutes,
  problems: z.number().int().min(0).max(10000),
  concepts: text,
  rating: z.enum(['어려움', '보통', '이해함']),
  reason: text,
  pauses: z.array(z.object({ at: instant, reason: text })),
  mistake: note,
  reviewDate: date.nullable(),
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
export const stateSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().min(0),
    tasks: z.array(taskSchema).max(500),
    schedules: z.array(scheduleSchema).max(300),
    sessions: z.array(sessionSchema).max(5000),
    active: activeSchema.nullable(),
    plan: z.array(blockSchema).max(500),
    undo: z.array(blockSchema).max(500).nullable(),
    settings: settingsSchema,
    grades: z.array(gradeSchema).max(500),
    reviewsDone: z.array(id).max(5000),
  })
  .superRefine((s, ctx) => {
    for (const key of ['tasks', 'schedules', 'sessions', 'plan', 'grades'] as const)
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        ctx.addIssue({ code: 'custom', message: `${key}: 중복 ID` });
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
  plan: [],
  undo: null,
  grades: [],
  reviewsDone: [],
  settings: {
    wake: '07:00',
    bed: '23:00',
    minSleep: 8,
    focus: 25,
    mealStart: '18:00',
    mealMinutes: 45,
    breakMinutes: 5,
    goal: '가천대학교 조기취업형 미래자동차 관련 학과 진학 — 공식 모집요강 확인 필요',
  },
});
export const uid = () => crypto.randomUUID();
