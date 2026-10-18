/** Sleep-friendly scheduling helper. Times are displayed in Asia/Seoul. */
export type SleepSettings = {
  enabled: boolean;
  weekdayWake: string;
  weekendWake: string;
  targetMinutes: number;
  postponeUntil: number;
  restUntil: number;
  restStartedAt: number;
};

export const SLEEP_STORAGE_KEY = 'bkit.sleep-guard.v1';
export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  enabled: false, // Explicit opt-in: never surprise-lock an existing learner.
  weekdayWake: '07:00',
  weekendWake: '08:00',
  targetMinutes: 510, // 8h 30m; configurable within teen 8–10h range.
  postponeUntil: 0,
  restUntil: 0,
  restStartedAt: 0,
};

const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DURATION_OPTIONS = [480, 510, 540, 600];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function readSleepSettings(): SleepSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SLEEP_SETTINGS };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SLEEP_STORAGE_KEY) || '{}') as Partial<SleepSettings>;
    return {
      enabled: parsed.enabled === true,
      weekdayWake: typeof parsed.weekdayWake === 'string' && VALID_TIME.test(parsed.weekdayWake) ? parsed.weekdayWake : DEFAULT_SLEEP_SETTINGS.weekdayWake,
      weekendWake: typeof parsed.weekendWake === 'string' && VALID_TIME.test(parsed.weekendWake) ? parsed.weekendWake : DEFAULT_SLEEP_SETTINGS.weekendWake,
      targetMinutes: typeof parsed.targetMinutes === 'number' && DURATION_OPTIONS.includes(parsed.targetMinutes) ? parsed.targetMinutes : DEFAULT_SLEEP_SETTINGS.targetMinutes,
      postponeUntil: typeof parsed.postponeUntil === 'number' && Number.isFinite(parsed.postponeUntil) ? parsed.postponeUntil : 0,
      restUntil: typeof parsed.restUntil === 'number' && Number.isFinite(parsed.restUntil) ? parsed.restUntil : 0,
      restStartedAt: typeof parsed.restStartedAt === 'number' && Number.isFinite(parsed.restStartedAt) ? parsed.restStartedAt : 0,
    };
  } catch {
    return { ...DEFAULT_SLEEP_SETTINGS };
  }
}
export function minutesOf(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
export function formatMinutes(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}
/**
 * Calculate two actual sleep windows anchored to their wake-up dates. Using
 * absolute Korea timestamps also supports unusual schedules whose bedtime is
 * after midnight, without covering the entire day by accident.
 */
export function sleepStatus(date: Date, settings: SleepSettings) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  const weekday = WEEKDAYS.indexOf(part('weekday'));
  const dayStart = Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))) - 9 * 60 * 60_000;
  const weekend = (day: number) => day === 0 || day === 6;
  const wakeToday = minutesOf(weekend(weekday) ? settings.weekendWake : settings.weekdayWake);
  const wakeTomorrow = minutesOf(weekend((weekday + 1) % 7) ? settings.weekendWake : settings.weekdayWake);

  const todayWakeAt = dayStart + wakeToday * 60_000;
  const tomorrowWakeAt = dayStart + 24 * 60 * 60_000 + wakeTomorrow * 60_000;
  const previousBedAt = todayWakeAt - settings.targetMinutes * 60_000;
  const tonightBedAt = tomorrowWakeAt - settings.targetMinutes * 60_000;
  const withinPrevious = date.getTime() >= previousBedAt && date.getTime() < todayWakeAt;
  const withinTonight = date.getTime() >= tonightBedAt && date.getTime() < tomorrowWakeAt;
  const inSleepWindow = withinPrevious || withinTonight;
  const minutesToBed = Math.max(0, Math.ceil((tonightBedAt - date.getTime()) / 60_000));
  const windingDown = !inSleepWindow && date.getTime() >= tonightBedAt - 60 * 60_000 && date.getTime() < tonightBedAt;
  const postponed = settings.postponeUntil > date.getTime();
  const manualRest = settings.restUntil > date.getTime() && settings.restStartedAt > 0;
  const automaticStart = withinPrevious ? previousBedAt : withinTonight ? tonightBedAt : null;
  const guardStartedAt = manualRest && automaticStart !== null
    ? Math.min(settings.restStartedAt, automaticStart)
    : manualRest ? settings.restStartedAt : automaticStart;
  return {
    bedtime: formatMinutes(wakeTomorrow - settings.targetMinutes),
    screenOffAt: formatMinutes(wakeTomorrow - settings.targetMinutes - 60),
    wakeTomorrow: formatMinutes(wakeTomorrow),
    inSleepWindow,
    windingDown,
    minutesToBed,
    manualRest,
    guardStartedAt,
    showGuard: settings.enabled && (inSleepWindow || manualRest) && !postponed,
    postponed,
  };
}

/** Exact focus-stop boundary, excluding a deliberately granted 30-minute extension. */
export function guardPauseBoundary(nowMs: number, activeStartedMs: number, settings: SleepSettings): number | null {
  const status = sleepStatus(new Date(nowMs), settings);
  if (!status.showGuard || status.guardStartedAt === null) return null;
  return Math.min(nowMs, Math.max(activeStartedMs, status.guardStartedAt, settings.postponeUntil));
}
