import { minutesOf } from './sleepGuardLogic';

/**
 * A deliberately bounded blueprint for eventual server-side Web Push.
 *
 * - No sends, permission prompts, subscriptions or hidden polling happen here.
 * - The backend must explicitly authenticate a user, honor opt-in, and dedupe ids.
 * - Only TWO bedtime reminders are permitted. Do not notify after screen-off.
 * - iOS requires a Home Screen web app and gesture-granted permission.
 */
export type ReminderTone = 'gentle' | 'direct';
export type SleepReminder = {
  id: string;
  at: string;
  title: string;
  body: string;
  phase: 'wrap-up' | 'screen-off';
};
const KST_OFFSET_MS = 9 * 60 * 60_000;

export function planSleepReminders(
  wakeDateKST: string,
  wakeHHMM: string,
  targetMinutes: number,
  tone: ReminderTone,
  optedIn: boolean,
): SleepReminder[] {
  if (!optedIn) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wakeDateKST)) throw new Error('Invalid wake date');
  const midnightKST = Date.parse(wakeDateKST + 'T00:00:00Z') - KST_OFFSET_MS;
  if (!Number.isFinite(midnightKST) || new Date(midnightKST + KST_OFFSET_MS).toISOString().slice(0, 10) !== wakeDateKST)
    throw new Error('Invalid wake date');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(wakeHHMM)) throw new Error('Invalid wake time');
  if (targetMinutes < 480 || targetMinutes > 600 || !Number.isFinite(targetMinutes))
    throw new Error('Invalid sleep opportunity');
  const bedAt = midnightKST + (minutesOf(wakeHHMM) - targetMinutes) * 60_000;
  const direct = tone === 'direct';
  return [
    {
      id: wakeDateKST + ':wrap-up',
      phase: 'wrap-up',
      at: new Date(bedAt - 75 * 60_000).toISOString(),
      title: 'BKIT · 오늘 작업 마무리',
      body: direct ? '15분 뒤에는 폰·패드 내려놓자. 오늘은 여기까지!' : '곧 화면을 내려놓을 시간이야. 하던 일을 정리하자.',
    },
    {
      id: wakeDateKST + ':screen-off',
      phase: 'screen-off',
      at: new Date(bedAt - 60 * 60_000).toISOString(),
      title: direct ? 'BKIT · 지금 자는 준비!' : 'BKIT · 화면 종료 시간',
      body: direct ? '지금 자! 💤 폰과 아이패드는 내려놓고 내일 이어서 하자.' : '수면을 위해 오늘 화면 사용은 여기서 마무리하자.',
    },
  ];
}

export function dueSleepReminders(
  plan: SleepReminder[],
  now: Date,
  previouslySentIds: ReadonlySet<string>,
  ttlMinutes = 15,
): SleepReminder[] {
  const current = now.getTime();
  return plan.filter((item) => {
    const due = Date.parse(item.at);
    return !previouslySentIds.has(item.id) && due <= current && current < due + ttlMinutes * 60_000;
  });
}
