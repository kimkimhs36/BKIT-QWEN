/** Sleep-friendly scheduling helper. Times are displayed in Asia/Seoul. */
export type SleepSettings = {
  enabled: boolean;
  weekdayWake: string;
  weekendWake: string;
  targetMinutes: number;
  postponeUntil: number;
};

export const SLEEP_STORAGE_KEY = 'bkit.sleep-guard.v1';
export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  enabled: false, // Explicit opt-in: never surprise-lock an existing learner.
  weekdayWake: '07:00',
  weekendWake: '08:00',
  targetMinutes: 510, // 8h 30m; configurable within teen 8–10h range.
  postponeUntil: 0,
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
export function sleepStatus(date: Date, settings: SleepSettings) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', weekday: 'short', hour: '2-digit',
    minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value || '';
  const hour = Number(part('hour')) % 24;
  const minute = Number(part('minute'));
  const weekday = WEEKDAYS.indexOf(part('weekday'));
  const nowMinutes = hour * 60 + minute;
  const isWeekend = (day: number) => day === 0 || day === 6;
  const wakeToday = minutesOf(isWeekend(weekday) ? settings.weekendWake : settings.weekdayWake);
  const wakeTomorrow = minutesOf(isWeekend((weekday + 1) % 7) ? settings.weekendWake : settings.weekdayWake);
  // Bedtime is assigned to the day before the target wake-up.
  const bedtimeTonight = (wakeTomorrow - settings.targetMinutes + 1440) % 1440;
  const inSleepWindow = nowMinutes >= bedtimeTonight || nowMinutes < wakeToday;
  const minutesToBed = (bedtimeTonight - nowMinutes + 1440) % 1440;
  const windingDown = !inSleepWindow && minutesToBed > 0 && minutesToBed <= 60;
  const postponed = settings.postponeUntil > date.getTime();
  return {
    bedtime: formatMinutes(bedtimeTonight),
    wakeTomorrow: formatMinutes(wakeTomorrow),
    inSleepWindow,
    windingDown,
    minutesToBed,
    showGuard: settings.enabled && inSleepWindow && !postponed,
    postponed,
  };
}
