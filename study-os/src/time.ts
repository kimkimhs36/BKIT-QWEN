export const MIN = 60000;
export function dayKey(d: Date | number | string = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(d));
}
export const at = (day: string, time: string) => new Date(`${day}T${time}:00+09:00`).getTime();
export function addDays(day: string, n: number) {
  return dayKey(at(day, '12:00') + n * 86400000);
}
export const weekday = (day: string) => new Date(day + 'T12:00:00+09:00').getUTCDay();
export const clock = (d: number | string | Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(d));
export const fullDate = (d: number | Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(d));
export const iso = (n: number) => new Date(n).toISOString();
export const localInput = (d: string) => `${dayKey(d)}T${clock(d)}`;
export const fromInput = (v: string) => new Date(v + ':00+09:00').toISOString();
