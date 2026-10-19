export const BREAK_KEY = 'bkit.drive-break.v1';
export type BreakActivity = 'race' | 'intermission' | 'wake';
export type StudyBreak = {
  until: number;
  scroll: number;
  route: 'today' | 'study';
  activity?: BreakActivity;
  returnLabel?: string;
};
export function restoreBreak(
  storage: Pick<Storage, 'getItem'>,
  now = Date.now(),
  includeExpired = false,
): StudyBreak | null {
  try {
    const b = JSON.parse(storage.getItem(BREAK_KEY) || 'null');
    return b &&
      Number.isFinite(b.until) &&
      b.until > (includeExpired ? now - 86400000 : now) &&
      b.until <= now + 600000 &&
      (b.activity === undefined || ['race', 'intermission', 'wake'].includes(b.activity)) &&
      (b.returnLabel === undefined ||
        (typeof b.returnLabel === 'string' && b.returnLabel.length <= 400)) &&
      Number.isFinite(b.scroll) &&
      b.scroll >= 0 &&
      ['today', 'study'].includes(b.route)
      ? b
      : null;
  } catch {
    return null;
  }
}

/** Property access itself can throw when Safari blocks session storage. */
export function restoreBrowserBreak(): StudyBreak | null {
  try {
    return restoreBreak(window.sessionStorage, Date.now(), true);
  } catch {
    return null;
  }
}
