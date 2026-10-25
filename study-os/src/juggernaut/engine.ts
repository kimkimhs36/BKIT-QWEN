import { z } from 'zod';
import { concepts, questionById, questions, score, type Concept } from './content';
export const DAY = 86400000;
export const KEY = 'bkit.juggernaut.v1.device';
const stamp = z.number().finite().nonnegative();
const id = z.string().min(1).max(100);
export const attemptSchema = z
  .object({
    id,
    sessionId: id,
    questionId: z.enum(questions.map((q) => q.id) as [string, ...string[]]),
    answer: z.string().max(100),
    reasoning: z.string().max(2000),
    hints: z.number().int().min(0).max(2),
    guessed: z.boolean(),
    durationMs: stamp.max(24 * DAY),
    at: stamp,
    updatedAt: stamp,
    kind: z.enum(['diagnosis', 'training', 'review', 'ignition']),
    error: z.enum(['C', 'M', 'R', 'I', 'K', 'A', 'T', 'F', 'G']).nullable(),
    deleted: z.boolean(),
  })
  .strict();
export type Attempt = z.infer<typeof attemptSchema>;
export const sessionSchema = z
  .object({
    id,
    kind: z.enum(['diagnosis', 'training', 'review', 'ignition']),
    questionId: id,
    answer: z.string().max(100),
    reasoning: z.string().max(2000),
    hints: z.number().int().min(0).max(2),
    guessed: z.boolean(),
    elapsedMs: stamp,
    tickAt: stamp,
    phase: z.enum(['question', 'feedback', 'complete']),
    submittedId: id.nullable(),
    visited: z.array(id).max(200),
    updatedAt: stamp,
  })
  .strict()
  .refine((s) => !!questionById(s.questionId), 'Unknown question');
export type Session = z.infer<typeof sessionSchema>;
export const documentSchema = z
  .object({
    schema: z.literal(1),
    curriculum: z.literal('project-2028.v1'),
    attempts: z.array(attemptSchema).max(5000),
    sessions: z.array(sessionSchema).max(500),
    budget: z.object({ value: z.number().int().min(1).max(5), updatedAt: stamp }).strict(),
  })
  .strict()
  .superRefine((d, ctx) => {
    for (const rows of [d.attempts, d.sessions])
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        ctx.addIssue({ code: 'custom', message: 'Duplicate ids' });
  });
export type StudyDocument = z.infer<typeof documentSchema>;
export const emptyDocument = (): StudyDocument => ({
  schema: 1,
  curriculum: 'project-2028.v1',
  attempts: [],
  sessions: [],
  budget: { value: 3, updatedAt: 0 },
});
export const activeAttempts = (d: StudyDocument) =>
  d.attempts.filter((a) => !a.deleted).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
export const independent = (a: Attempt) =>
  score(a.questionId, a.answer) && a.hints === 0 && !a.guessed && a.reasoning.trim().length > 0;
export function evidence(d: StudyDocument, concept: Concept, now = Date.now()) {
  const rows = activeAttempts(d).filter(
    (a) => questionById(a.questionId).concept === concept && a.at <= now,
  );
  let interval = 1,
    due: number | null = null,
    delayed = 0;
  let last: Attempt | undefined;
  for (const a of rows) {
    const validDelayed =
      a.kind === 'review' &&
      due !== null &&
      a.at >= due &&
      last &&
      a.questionId !== last.questionId;
    if (validDelayed && independent(a)) {
      delayed++;
      interval = Math.min(30, interval * 2);
    } else if (!independent(a)) {
      delayed = 0;
      interval = 1;
    }
    due = a.at + interval * DAY;
    last = a;
  }
  const recentIndependent = rows.slice(-2).filter(independent).length;
  return {
    concept,
    count: rows.length,
    due,
    interval,
    delayed,
    last,
    confidence: rows.length < 3 ? '낮음' : '보통',
    state: !last
      ? '미진단'
      : !score(last.questionId, last.answer)
        ? '선수개념 복구'
        : !independent(last)
          ? '도움 후 해결'
          : delayed >= 2
            ? '지연 검증 안정'
            : recentIndependent >= 2
              ? '독립 해결 관찰'
              : '추가 확인 필요',
  };
}
export function dueReviews(d: StudyDocument, now = Date.now()) {
  const day = (time: number) => new Date(time + 9 * 3600000).toISOString().slice(0, 10);
  const used = new Set(
    activeAttempts(d)
      .filter((a) => a.kind === 'review' && day(a.at) === day(now))
      .map((a) => questionById(a.questionId).concept),
  ).size;
  return concepts
    .map((c) => evidence(d, c.id, now))
    .filter((e) => e.due !== null && e.due <= now)
    .sort((a, b) => a.due! - b.due!)
    .slice(0, Math.max(0, d.budget.value - used));
}
export function chooseQuestion(d: StudyDocument, concept: Concept, exclude: string[] = []) {
  const e = evidence(d, concept),
    level = e.last && independent(e.last) ? 2 : 1;
  const seen = new Set(activeAttempts(d).map((a) => a.questionId));
  const candidates = questions.filter((q) => q.concept === concept && !exclude.includes(q.id));
  return (
    candidates.find((q) => q.level === level && !seen.has(q.id)) ||
    candidates.find((q) => !seen.has(q.id)) ||
    candidates.find((q) => q.id !== e.last?.questionId) ||
    questions.find((q) => q.concept === concept)!
  );
}
export function recommendation(d: StudyDocument, now = Date.now()) {
  const due = dueReviews(d, now)[0];
  if (due)
    return {
      concept: due.concept,
      reason: '복습 시각이 되었어요. 새 문제로 기억을 확인해요.',
      kind: 'review' as const,
    };
  const states = concepts.map((c) => evidence(d, c.id, now));
  const weak = states.find((e) => e.last && !independent(e.last));
  const next =
    weak || states.find((e) => !e.count) || states.slice().sort((a, b) => a.count - b.count)[0];
  return {
    concept: next.concept,
    reason: weak
      ? '최근에 도움이 필요했던 개념부터 복구해요.'
      : '아직 충분히 확인하지 않은 개념을 살펴봐요.',
    kind: 'training' as const,
  };
}
export function startSession(
  d: StudyDocument,
  kind: Session['kind'],
  now = Date.now(),
  concept?: Concept,
): Session {
  const target =
    concept ||
    (kind === 'diagnosis'
      ? concepts.find((c) => !evidence(d, c.id, now).count)?.id || 'balance'
      : recommendation(d, now).concept);
  return {
    id: crypto.randomUUID(),
    kind,
    questionId: chooseQuestion(d, target).id,
    answer: '',
    reasoning: '',
    hints: 0,
    guessed: false,
    elapsedMs: 0,
    tickAt: now,
    phase: 'question',
    submittedId: null,
    visited: [],
    updatedAt: now,
  };
}
export function submit(
  d: StudyDocument,
  s: Session,
  now = Date.now(),
): { document: StudyDocument; session: Session } {
  if (s.phase !== 'question' || !s.answer.trim()) return { document: d, session: s };
  const attemptId = s.id + ':' + s.questionId + ':' + s.visited.length;
  const exists = d.attempts.find((a) => a.id === attemptId);
  const a: Attempt = exists || {
    id: attemptId,
    sessionId: s.id,
    questionId: s.questionId,
    answer: s.answer.trim(),
    reasoning: s.reasoning.trim(),
    hints: s.hints,
    guessed: s.guessed,
    durationMs: Math.min(24 * DAY, s.elapsedMs + Math.max(0, now - s.tickAt)),
    at: now,
    updatedAt: now,
    kind: s.kind,
    error: s.guessed ? 'G' : score(s.questionId, s.answer) ? null : 'C',
    deleted: false,
  };
  const session: Session = {
    ...s,
    phase: 'feedback',
    submittedId: attemptId,
    elapsedMs: a.durationMs,
    updatedAt: now,
  };
  return { document: { ...d, attempts: exists ? d.attempts : [...d.attempts, a] }, session };
}
export function advance(d: StudyDocument, s: Session, now = Date.now()): Session {
  const q = questionById(s.questionId),
    a = d.attempts.find((a) => a.id === s.submittedId);
  const visited = [...s.visited, s.questionId];
  const tested = new Set(
    d.attempts
      .filter((a) => a.sessionId === s.id && !a.deleted)
      .map((a) => questionById(a.questionId).concept),
  );
  const target = s.kind === 'diagnosis' ? concepts.find((c) => !tested.has(c.id))?.id : q.concept;
  const done = s.kind === 'ignition' || (s.kind === 'diagnosis' ? !target : !!a && independent(a));
  if (done) return { ...s, phase: 'complete', updatedAt: now };
  return {
    ...s,
    questionId: chooseQuestion(d, target || q.concept, visited).id,
    answer: '',
    reasoning: '',
    hints: 0,
    guessed: false,
    elapsedMs: 0,
    tickAt: now,
    phase: 'question',
    submittedId: null,
    visited,
    updatedAt: now,
  };
}
export function mergeDocuments(a: StudyDocument, b: StudyDocument): StudyDocument {
  function merge<T extends { id: string; updatedAt: number }>(x: T[], y: T[]) {
    const map = new Map(x.map((v) => [v.id, v]));
    for (const v of y) {
      const old = map.get(v.id);
      if (
        !old ||
        v.updatedAt > old.updatedAt ||
        (v.updatedAt === old.updatedAt && JSON.stringify(v) > JSON.stringify(old))
      )
        map.set(v.id, v);
    }
    return [...map.values()].sort((x, y) => x.id.localeCompare(y.id));
  }
  return documentSchema.parse({
    ...a,
    attempts: merge(a.attempts, b.attempts),
    sessions: merge(a.sessions, b.sessions),
    budget: a.budget.updatedAt > b.budget.updatedAt ? a.budget : b.budget,
  });
}
export function putSession(d: StudyDocument, s: Session): StudyDocument {
  return { ...d, sessions: [...d.sessions.filter((v) => v.id !== s.id), s] };
}
export function readDocument(storage: Pick<Storage, 'getItem'>) {
  try {
    const raw = storage.getItem(KEY);
    return { document: raw ? documentSchema.parse(JSON.parse(raw)) : emptyDocument(), error: '' };
  } catch {
    return {
      document: emptyDocument(),
      error:
        '기존 수능관 저장본을 읽지 못했어요. 원본을 보호하고 저장을 중단했어요. 원본 내보내기를 이용해 주세요.',
    };
  }
}
export function saveDocument(storage: Pick<Storage, 'getItem' | 'setItem'>, d: StudyDocument) {
  const raw = storage.getItem(KEY);
  const merged = raw
    ? mergeDocuments(documentSchema.parse(JSON.parse(raw)), d)
    : documentSchema.parse(d);
  if (raw) storage.setItem(KEY + '.backup', raw);
  storage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
