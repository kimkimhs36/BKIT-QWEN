import { z } from 'zod';
import { dayKey, addDays, weekday, at } from '../time';
import { studySeconds } from '../session';
import type { Race } from './race';
import type { State } from '../model';

export const GARAGE_KEY = 'bkit.drive-garage.v1';
export const economy = {
  dailyCap: 100,
  checkedAnswer: 5,
  completedSession: 10,
  initialCredits: 0,
} as const;
export const DAILY_CAP = economy.dailyCap;
export const transactionSchema = z.object({
  id: z.string().min(1).max(220),
  at: z.number().finite().nonnegative(),
  amount: z.number().int().min(-1000).max(DAILY_CAP),
  reason: z.enum(['answer', 'session', 'purchase', 'task', 'review', 'weekly', 'start']),
});
export const stampSchema = z.object({
  id: z.enum([
    'first-answer',
    'first-five-minutes',
    'first-task',
    'first-review',
    'weekly-goal',
    'first-start',
  ]),
  at: z.number().finite().nonnegative(),
  eventId: z.string().max(220),
});
export const catalog = {
  aero: { label: 'AERO 휠', cost: 15 },
  wing: { label: 'TOURING 스포일러', cost: 10 },
  sprint: { label: 'SPRINT 튜닝', cost: 20 },
} as const;
export type Upgrade = keyof typeof catalog;
export const raceRecordSchema = z.object({
  id: z.string().max(220),
  at: z.number().finite().nonnegative(),
  distance: z.union([z.literal(200), z.literal(400)]),
  elapsed: z.number().positive().max(50),
  topSpeed: z.number().nonnegative().max(300),
  reaction: z.number().min(0).max(2),
  perfect: z.number().int().nonnegative(),
  shifts: z.number().int().nonnegative(),
  tune: z.enum(['balanced', 'sprint']),
});
export const garageSchema = z
  .object({
    version: z.literal(1),
    raceRecords: z.array(raceRecordSchema).max(24).default([]),
    since: z.number().finite().nonnegative(),
    credits: z.number().int().min(0).max(1000000),
    claimed: z.array(z.string().max(220)).max(60000),
    day: z.string(),
    earnedToday: z.number().int().min(0).max(DAILY_CAP),
    transactions: z.array(transactionSchema).max(60003).default([]),
    stamps: z.array(stampSchema).max(6).default([]),
    owned: z.array(z.enum(['aero', 'wing', 'sprint'])).max(3),
    car: z.object({
      name: z.string().trim().min(1).max(32).default('TOURING 36'),
      finish: z.enum(['gloss', 'metallic', 'matte']).default('metallic'),
      tires: z.enum(['street', 'sport']).default('street'),
      bumper: z.enum(['touring', 'sport']).default('touring'),
      skirt: z.boolean().default(false),
      decal: z.enum(['none', 'stripe', 'number']).default('none'),
      lighting: z.enum(['studio', 'warm', 'cool']).default('studio'),
      color: z.enum(['sage', 'cream', 'coral', 'blue']),
      wheels: z.enum(['classic', 'aero']),
      wheelColor: z.enum(['silver', 'graphite', 'bronze']).default('silver'),
      rideHeight: z.enum(['standard', 'low', 'raised']).default('standard'),
      spoiler: z.boolean(),
      scene: z.enum(['atelier', 'dusk', 'coast']),
      tune: z.enum(['balanced', 'sprint']),
    }),
    display: z.enum(['classic', 'mini', 'dashboard', 'drive']),
    reduceMotion: z.boolean(),
    hideAnimations: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (
      new Set(v.raceRecords.map((r) => r.id)).size !== v.raceRecords.length ||
      new Set(v.transactions.map((t) => t.id)).size !== v.transactions.length ||
      new Set(v.stamps.map((t) => t.id)).size !== v.stamps.length ||
      v.credits - v.transactions.reduce((n, t) => n + t.amount, 0) < 0 ||
      new Set(v.claimed).size !== v.claimed.length ||
      new Set(v.owned).size !== v.owned.length ||
      (v.car.wheels === 'aero' && !v.owned.includes('aero')) ||
      (v.car.spoiler && !v.owned.includes('wing')) ||
      (v.car.tune === 'sprint' && !v.owned.includes('sprint'))
    )
      ctx.addIssue({ code: 'custom', message: '차량 보유 항목을 확인하세요.' });
  });
export type GarageState = z.infer<typeof garageSchema>;
export const newGarage = (now = Date.now()): GarageState => ({
  version: 1,
  raceRecords: [],
  since: now,
  credits: economy.initialCredits,
  transactions: [],
  stamps: [],
  claimed: [],
  day: '',
  earnedToday: 0,
  owned: [],
  car: {
    name: 'TOURING 36',
    finish: 'metallic',
    tires: 'street',
    bumper: 'touring',
    skirt: false,
    decal: 'none',
    lighting: 'studio',
    color: 'sage',
    wheels: 'classic',
    wheelColor: 'silver',
    rideHeight: 'standard',
    spoiler: false,
    scene: 'atelier',
    tune: 'balanced',
  },
  display: 'classic',
  reduceMotion: false,
  hideAnimations: false,
});
export function purchase(g: GarageState, item: Upgrade, now = Date.now()): GarageState {
  if (g.owned.includes(item) || g.credits < catalog[item].cost) return g;
  return {
    ...g,
    credits: g.credits - catalog[item].cost,
    owned: [...g.owned, item],
    transactions: [
      ...g.transactions,
      { id: 'purchase:' + item, at: now, amount: -catalog[item].cost, reason: 'purchase' },
    ],
  };
}
/** Rewards require explicit learning output. Timer ticks, idle time and race results never pay. */
export function rewardLearning(g: GarageState, study: State, now: number): GarageState {
  const day = new Date(now).toISOString().slice(0, 10);
  if (day < g.day || now < g.since) return g;
  const candidates: {
    key: string;
    at: number;
    amount: number;
    reason?: 'task' | 'review' | 'weekly' | 'start';
  }[] = [];
  for (const a of study.learning?.attempts ?? []) {
    if (a.selfCheck !== 'unreviewed' && a.learnerAnswer.trim() && a.checkedAt)
      candidates.push({
        key: 'problem:' + a.problemId,
        at: Date.parse(a.checkedAt),
        amount: economy.checkedAnswer,
      });
  }
  for (const s of [...study.sessions, ...(study.active ? [study.active] : [])]) {
    const checked = s.workspace?.attempts.find(
      (a) => a.selfCheck !== 'unreviewed' && a.answer.trim(),
    );
    if (checked)
      candidates.push({
        key: 'workspace:' + s.id,
        at: Date.parse(checked.submittedAt),
        amount: economy.checkedAnswer,
      });
    if ('ended' in s && !s.resourceId && !s.workspace && s.problems > 0 && s.seconds >= 60)
      candidates.push({
        key: 'session:' + s.id,
        at: Date.parse(s.ended),
        amount: economy.completedSession,
      });
  }
  for (const task of study.tasks)
    if (task.status === 'done' && task.completedAt && task.kind !== '개인 일정')
      candidates.push({
        key: 'task:' + task.id,
        at: Date.parse(task.completedAt),
        amount: task.kind === '수행평가' ? 15 : 10,
        reason: 'task',
      });
  for (const item of study.problemRetests ?? [])
    if (item.answer.trim() && item.selfCheck !== 'unreviewed')
      candidates.push({
        key: 'review:' + item.sessionId + ':' + dayKey(item.submittedAt),
        at: Date.parse(item.submittedAt),
        amount: 5,
        reason: 'review',
      });
  const byProblem = new Map<string, NonNullable<State['learning']>['attempts']>();
  for (const item of study.learning?.attempts ?? []) {
    const previous = byProblem.get(item.problemId) ?? [];
    if (
      item.selfCheck !== 'unreviewed' &&
      item.checkedAt &&
      previous.some(
        (a) => a.selfCheck === 'incorrect' && dayKey(a.submittedAt) < dayKey(item.submittedAt),
      )
    )
      candidates.push({
        key: 'review:' + item.problemId + ':' + dayKey(item.checkedAt),
        at: Date.parse(item.checkedAt),
        amount: 5,
        reason: 'review',
      });
    byProblem.set(item.problemId, [...previous, item]);
  }
  const firstStart = study.learningEvents
    ?.filter((e) => e.type === 'StudyStarted')
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  if (firstStart)
    candidates.push({
      key: 'first-start',
      at: Date.parse(firstStart.at),
      amount: 2,
      reason: 'start',
    });
  const monday = addDays(dayKey(now), -((weekday(dayKey(now)) + 6) % 7));
  const weekSeconds = Array.from({ length: 7 }, (_, i) =>
    studySeconds(study.sessions, addDays(monday, i)),
  ).reduce((a, b) => a + b, 0);
  const last = study.sessions
    .filter((s) => s.problems > 0 && Date.parse(s.ended) >= at(monday, '00:00'))
    .sort((a, b) => b.ended.localeCompare(a.ended))[0];
  if (last && weekSeconds >= (study.juggernaut?.weeklyMinutes ?? 300) * 60)
    candidates.push({
      key: 'weekly:' + monday,
      at: Date.parse(last.ended),
      amount: 15,
      reason: 'weekly',
    });
  const seen = new Set(g.claimed);
  let earned = g.day === day ? g.earnedToday : 0;
  let credits = g.credits;
  const transactions = [...g.transactions];
  const stamps = [...g.stamps];
  for (const c of candidates.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key))) {
    if (
      seen.has(c.key) ||
      !Number.isFinite(c.at) ||
      c.at <= g.since ||
      c.at > now ||
      seen.size >= 60000
    )
      continue;
    // Mark capped events too: they cannot be saved up and claimed on another day.
    seen.add(c.key);
    const sameDay = new Date(c.at).toISOString().slice(0, 10) === day;
    const amount = sameDay ? Math.min(c.amount, DAILY_CAP - earned, 1000000 - credits) : 0;
    transactions.push({
      id: c.key,
      at: now,
      amount,
      reason: c.reason ?? (c.key.startsWith('session:') ? 'session' : 'answer'),
    });
    if (
      sameDay &&
      !c.reason &&
      !c.key.startsWith('session:') &&
      !stamps.some((s) => s.id === 'first-answer')
    )
      stamps.push({ id: 'first-answer', at: now, eventId: c.key });
    if (
      sameDay &&
      c.key.startsWith('session:') &&
      study.sessions.some((s) => 'session:' + s.id === c.key && s.seconds >= 300) &&
      !stamps.some((s) => s.id === 'first-five-minutes')
    )
      stamps.push({ id: 'first-five-minutes', at: now, eventId: c.key });
    const milestone =
      c.reason === 'task'
        ? 'first-task'
        : c.reason === 'review'
          ? 'first-review'
          : c.reason === 'weekly'
            ? 'weekly-goal'
            : c.reason === 'start'
              ? 'first-start'
              : null;
    if (sameDay && milestone && !stamps.some((s) => s.id === milestone))
      stamps.push({ id: milestone, at: now, eventId: c.key });
    earned += amount;
    credits += amount;
  }
  return seen.size === g.claimed.length
    ? g
    : { ...g, credits, claimed: [...seen], day, earnedToday: earned, transactions, stamps };
}

/** Records and purchases use the same atomic garage write. No race rewards. */
export function saveRaceRecord(g: GarageState, r: Race, now: number): GarageState {
  if (r.result !== 'finish' || r.reaction === null) return g;
  const id = `race:${r.goAt}:${r.targetDistance}`;
  if (g.raceRecords.some((x) => x.id === id)) return g;
  const next = [
    ...g.raceRecords,
    {
      id,
      at: now,
      distance: r.targetDistance,
      elapsed: r.elapsed + r.reaction,
      topSpeed: r.topSpeed * 3.6,
      reaction: r.reaction,
      perfect: r.perfect,
      shifts: r.shifts,
      tune: g.car.tune,
    },
  ];
  const best = [200, 400].flatMap((d) => {
    const b = next.filter((r) => r.distance === d).sort((a, b) => a.elapsed - b.elapsed)[0];
    return b ? [b] : [];
  });
  const keep = new Map([...next.slice(-20), ...best].map((r) => [r.id, r]));
  return { ...g, raceRecords: [...keep.values()].sort((a, b) => a.at - b.at) };
}

export const stampLabels = {
  'first-answer': '첫 풀이 확인',
  'first-five-minutes': '5분 이상 학습·문제 기록 완료',
  'first-task': '첫 과제 완료',
  'first-review': '첫 오답 복습',
  'weekly-goal': '주간 학습 목표 달성',
  'first-start': '첫 공부 시작',
} as const;
export const transactionLabels = {
  answer: '풀이 확인',
  session: '학습 세션 완료',
  purchase: '부품 구매',
  task: '과제 완료',
  review: '오답 복습',
  weekly: '주간 목표 달성',
  start: '첫 공부 시작',
} as const;
