import { z } from 'zod';
import { date, instant, time } from './model';
export function sleepDateKey(value: Date | number) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function sleepLocalInput(value: string) {
  const d = new Date(value);
  return `${sleepDateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const sleepFromInput = (value: string) => new Date(value).toISOString();

// Independent namespace. v1 Sleep Guard experiments and all study data remain untouched.
export const SLEEP_KEY = 'bkit.sleep-guard.v3';
export const CHECKS = ['공부 정리', '씻기', '취침 준비', '누웠음 확인'] as const;
export const sleepDaySchema = z.object({ bed: time, wake: time }).refine(({ bed, wake }) => {
  const length = (minutes(wake) - minutes(bed) + 1440) % 1440;
  return length >= 60 && length <= 960;
}, '수면 일정은 1시간 이상 16시간 이하로 설정해 주세요.');
export const sleepRecordSchema = z.object({
  date,
  targetBed: instant,
  targetWake: instant,
  checks: z.array(z.boolean()).length(4),
  actualBed: instant.nullable(),
  actualWake: instant.nullable(),
  reflection: z.string().max(1000),
  photoIds: z.array(z.string().min(1).max(100)).max(2),
});
export const sleepSchema = z
  .object({
    version: z.literal(3),
    enabled: z.boolean(),
    protectionChangedAt: z.number().finite().min(0).optional(),
    schedule: z.array(sleepDaySchema).length(7),
    pausedUntil: z.number().finite().min(0),
    skipped: z.array(date).max(366),
    dismissedNight: date.nullable(),
    manualUntil: z.number().finite().min(0),
    reminders: z.boolean(),
    notified: z.array(z.string().max(40)).max(100),
    records: z.array(sleepRecordSchema).max(1500),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.records.map((r) => r.date)).size !== s.records.length)
      ctx.addIssue({ code: 'custom', message: '수면 기록 날짜가 중복되었습니다.' });
    for (const r of s.records) {
      if (
        r.targetWake <= r.targetBed ||
        (r.actualBed && r.actualWake && r.actualWake <= r.actualBed)
      )
        ctx.addIssue({ code: 'custom', message: '기상 시각은 취침 시각보다 뒤여야 합니다.' });
    }
  });
export type SleepState = z.infer<typeof sleepSchema>;
export type SleepRecord = z.infer<typeof sleepRecordSchema>;
export type SleepDay = z.infer<typeof sleepDaySchema>;
export const defaultSleep = (): SleepState => ({
  version: 3,
  enabled: false,
  schedule: Array.from({ length: 7 }, (_, d) => ({
    bed: '23:00',
    wake: d === 5 || d === 6 ? '08:00' : '07:00',
  })),
  pausedUntil: 0,
  skipped: [],
  dismissedNight: null,
  manualUntil: 0,
  reminders: false,
  notified: [],
  records: [],
});
export function minutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function readSleep(storage: Pick<Storage, 'getItem'>) {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SLEEP_KEY);
    return { state: raw ? sleepSchema.parse(JSON.parse(raw)) : defaultSleep(), raw, error: '' };
  } catch {
    return {
      state: defaultSleep(),
      raw,
      error:
        '수면 저장본을 읽지 못했습니다. 원본은 덮어쓰지 않습니다. 원본 백업을 보관한 뒤 복구해 주세요.',
    };
  }
}
export type SleepWindow = { key: string; bed: number; wake: number; prepare: number };
/** Anchor to the local bedtime date, using calendar arithmetic (including DST).
 * A 00:30 bedtime starts preparing at 23:30 on the previous date.
 */
export function sleepWindow(now: number, schedule: SleepDay[]): SleepWindow {
  const windows = [-1, 0, 1, 2]
    .map((offset) => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + offset);
      const key = sleepDateKey(d),
        { bed, wake } = schedule[d.getDay()];
      const [bh, bm] = bed.split(':').map(Number),
        [wh, wm] = wake.split(':').map(Number);
      const bedtime = new Date(d);
      bedtime.setHours(bh, bm, 0, 0);
      const waking = new Date(d);
      waking.setHours(wh, wm, 0, 0);
      if (+waking <= +bedtime) waking.setDate(waking.getDate() + 1);
      return { key, bed: +bedtime, wake: +waking, prepare: +bedtime - 3600000 };
    })
    .sort((a, b) => a.bed - b.bed);
  return (
    [...windows].reverse().find((w) => w.prepare <= now && now < w.wake) ||
    windows.find((w) => w.prepare > now)!
  );
}
export function sleepStatus(now: number, state: SleepState, studying = false) {
  const window = sleepWindow(now, state.schedule);
  const skipped = state.skipped.includes(window.key);
  const paused = state.pausedUntil > now;
  const available = state.enabled && !skipped && !paused;
  const phase =
    now >= window.bed && now < window.wake
      ? 'night'
      : now >= window.prepare && now < window.bed
        ? 'prepare'
        : 'day';
  const night =
    available &&
    !studying &&
    state.dismissedNight !== window.key &&
    (phase === 'night' || state.manualUntil > now);
  return { ...window, phase, night, available, skipped, paused, studying };
}
export function createSleepRecord(w: SleepWindow): SleepRecord {
  return {
    date: w.key,
    targetBed: new Date(w.bed).toISOString(),
    targetWake: new Date(w.wake).toISOString(),
    checks: [false, false, false, false],
    actualBed: null,
    actualWake: null,
    reflection: '',
    photoIds: [],
  };
}
export function updateSleepRecord(
  state: SleepState,
  w: SleepWindow,
  change: (record: SleepRecord) => SleepRecord,
) {
  const existing = state.records.find((r) => r.date === w.key);
  // Targets freeze at the first explicit check-in; later schedule edits never rewrite history.
  const next = change(existing || createSleepRecord(w));
  return {
    ...state,
    records: [...state.records.filter((r) => r.date !== w.key), next].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}
