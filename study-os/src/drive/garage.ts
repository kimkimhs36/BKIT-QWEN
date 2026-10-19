import { z } from 'zod';
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
  reason: z.enum(['answer', 'session', 'purchase']),
});
export const stampSchema = z.object({
  id: z.enum(['first-answer', 'first-five-minutes']),
  at: z.number().finite().nonnegative(),
  eventId: z.string().max(220),
});
export const catalog = {
  aero: { label: 'AERO 휠', cost: 15 },
  wing: { label: 'TOURING 스포일러', cost: 10 },
  sprint: { label: 'SPRINT 튜닝', cost: 20 },
} as const;
export type Upgrade = keyof typeof catalog;
export const garageSchema = z
  .object({
    version: z.literal(1),
    since: z.number().finite().nonnegative(),
    credits: z.number().int().min(0).max(1000000),
    claimed: z.array(z.string().max(220)).max(60000),
    day: z.string(),
    earnedToday: z.number().int().min(0).max(DAILY_CAP),
    transactions: z.array(transactionSchema).max(60003).default([]),
    stamps: z.array(stampSchema).max(2).default([]),
    owned: z.array(z.enum(['aero', 'wing', 'sprint'])).max(3),
    car: z.object({
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
  since: now,
  credits: economy.initialCredits,
  transactions: [],
  stamps: [],
  claimed: [],
  day: '',
  earnedToday: 0,
  owned: [],
  car: {
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
  const candidates: { key: string; at: number; amount: number }[] = [];
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
      reason: c.key.startsWith('session:') ? 'session' : 'answer',
    });
    if (sameDay && !c.key.startsWith('session:') && !stamps.some((s) => s.id === 'first-answer'))
      stamps.push({ id: 'first-answer', at: now, eventId: c.key });
    if (
      sameDay &&
      c.key.startsWith('session:') &&
      study.sessions.some((s) => 'session:' + s.id === c.key && s.seconds >= 300) &&
      !stamps.some((s) => s.id === 'first-five-minutes')
    )
      stamps.push({ id: 'first-five-minutes', at: now, eventId: c.key });
    earned += amount;
    credits += amount;
  }
  return seen.size === g.claimed.length
    ? g
    : { ...g, credits, claimed: [...seen], day, earnedToday: earned, transactions, stamps };
}
