import type { Task } from './model';
import { addDays, at, clock, dayKey, iso, weekday } from './time';
export type CaptureUnit = NonNullable<Task['quantity']>['unit'];
export type CapturePrecision = 'unknown' | 'date-only' | 'exact-time';
export type CaptureFields = {
  submissionRequired: boolean;
  subject: string;
  kind: Task['kind'];
  due: string;
  precision: CapturePrecision;
  dueTime: string;
  provenance: 'explicit' | 'inferred' | 'user-confirmed';
  quantityUnit: CaptureUnit | '';
  quantityTotal: number | null;
  minutes: number;
  estimateSource: 'default' | 'user';
};
const subjects =
  /수학|영어|국어|경제|물리|화학|생명과학|지구과학|과학|사회|한국사|역사|정보|일본어|중국어|한문|기술가정/;
// Longest/specific school course names first. Never assume that general chemistry,
// physics or math automatically means one of the separate elective courses.
const specificSubjects: ReadonlyArray<readonly [RegExp, string]> = [
  [/미술\s*감상\s*과\s*비평/, '미술 감상과 비평'],
  [/로봇\s*[·및과]\s*소프트웨어\s*공학/, '로봇·소프트웨어 공학'],
  [/소프트웨어\s*기초/, '소프트웨어 기초'],
  [/물질\s*과\s*에너지/, '물질과 에너지'],
  [/역학\s*과\s*에너지/, '역학과 에너지'],
  [/사회\s*와\s*문화|사문\s*수행/, '사회와 문화'],
  [/스포츠\s*생활/, '스포츠 생활'],
  [/미적분\s*(?:Ⅱ|II|2)(?!\d)/i, '미적분Ⅱ'],
  [/미적분\s*(?:Ⅰ|I|1)(?!\d)/i, '미적분Ⅰ'],
  [/미적분(?!\s*[ⅠⅡI12])/i, '미적분'],
  [/영어\s*(?:Ⅱ|II|2)(?!\d)/i, '영어Ⅱ'],
  [/문학/, '문학'],
  [/대수/, '대수'],
];
const unitMap: Record<string, CaptureUnit> = {
  문제: 'problems',
  문항: 'problems',
  쪽: 'pages',
  페이지: 'pages',
  장: 'pages',
  지문: 'passages',
  단원: 'chapters',
};
function validDay(y: number, m: number, d: number): string {
  const dateText = [y, String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
  const dateObj = new Date(dateText + 'T00:00:00Z');
  return !isNaN(+dateObj) && dateObj.toISOString().slice(0, 10) === dateText ? dateText : '';
}
export function parseCapture(text: string, now = Date.now()): CaptureFields {
  const today = dayKey(now),
    subject = specificSubjects.find(([pattern]) => pattern.test(text))?.[1] ||
      text.match(subjects)?.[0] || '기타';
  const kind: Task['kind'] = /수행평가/.test(text)
    ? '수행평가'
    : /시험|시험공부/.test(text)
      ? '시험공부'
      : /약속|예약|개인 일정/.test(text)
        ? '개인 일정'
        : '숙제';
  let due = '',
    provenance: CaptureFields['provenance'] = 'explicit';
  const fullDate = text.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  const monthDay = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (fullDate) due = validDay(+fullDate[1], +fullDate[2], +fullDate[3]);
  else if (monthDay) {
    const y = +today.slice(0, 4),
      first = validDay(y, +monthDay[1], +monthDay[2]);
    due = first && first >= today ? first : validDay(y + 1, +monthDay[1], +monthDay[2]);
    provenance = 'inferred';
  } else if (/모레/.test(text)) due = addDays(today, 2);
  else if (/내일/.test(text)) due = addDays(today, 1);
  else if (/오늘/.test(text)) due = today;
  else {
    const match = text.match(/(일|월|화|수|목|금|토)요일/);
    if (match) {
      let delta = ('일월화수목금토'.indexOf(match[1]) - weekday(today) + 7) % 7;
      if (/다음\s*주/.test(text))
        delta = 7 - ((weekday(today) + 6) % 7) + (('일월화수목금토'.indexOf(match[1]) + 6) % 7);
      due = addDays(today, delta);
    }
  }
  let dueTime = '';
  const meridian = text.match(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  const hhmm = text.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|까지|마감)/);
  const hour24 = text.match(/(?:^|\s)(1[3-9]|2[0-3])\s*시(?:\s*(\d{1,2})\s*분)?/);
  if (meridian) {
    const h = +meridian[2],
      m = +(meridian[3] || 0);
    if (h >= 1 && h <= 12 && m <= 59) {
      dueTime =
        String((h % 12) + (meridian[1] === '오후' ? 12 : 0)).padStart(2, '0') +
        ':' +
        String(m).padStart(2, '0');
    }
  } else if (hhmm) dueTime = String(+hhmm[1]).padStart(2, '0') + ':' + hhmm[2];
  else if (hour24 && +(hour24[2] || 0) <= 59)
    dueTime = hour24[1] + ':' + String(+(hour24[2] || 0)).padStart(2, '0');
  const qty1 = text.match(/(\d{1,4})\s*(문제|문항|쪽|페이지|장|지문|단원)/);
  const qty2 = text.match(/(지문|문제|문항|페이지|쪽|장|단원)\s*(\d{1,4})\s*개?/);
  const errors = text.match(/오답\s*(\d{1,4})\s*개/);
  const quantityUnit = qty1 ? unitMap[qty1[2]] : qty2 ? unitMap[qty2[1]] : errors ? 'problems' : '';
  const quantityTotal = qty1 ? +qty1[1] : qty2 ? +qty2[2] : errors ? +errors[1] : null;
  const minuteMatch = text
    .replace(/(?:오전|오후)?\s*\d{1,2}\s*시\s*\d{1,2}\s*분/g, '')
    .match(/(\d{1,3})\s*분(?:\s*동안|\s*예상|\s*정도)?/);
  return {
    submissionRequired: /제출|숙제|수행평가/.test(text),
    subject,
    kind,
    due,
    precision: due ? (dueTime ? 'exact-time' : 'date-only') : 'unknown',
    dueTime: due ? dueTime : '',
    provenance,
    quantityUnit,
    quantityTotal,
    minutes: Math.max(1, Math.min(480, minuteMatch ? +minuteMatch[1] : 25)),
    estimateSource: minuteMatch ? 'user' : 'default',
  };
}
export function captureDeadline(
  input: Pick<CaptureFields, 'due' | 'precision' | 'dueTime' | 'provenance'>,
) {
  if (!input.due || input.precision === 'unknown') return { due: null, deadline: undefined };
  if (input.precision === 'exact-time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.dueTime))
    throw new Error('정확한 마감 시각을 입력해주세요.');
  // The legacy scheduler requires an instant; precision/date remain the stored fact.
  // 23:59 is only a date-only planning bound and must never be shown as confirmed.
  return {
    due: iso(at(input.due, input.precision === 'date-only' ? '23:59' : input.dueTime)),
    deadline: { date: input.due, precision: input.precision, provenance: input.provenance },
  };
}
export function formatTaskDeadline(task: Task) {
  if (!task.due) return '마감 확인 필요';
  if (task.deadline?.precision === 'date-only') return task.deadline.date + ' · 시각 미확인';
  return dayKey(task.due) + ' ' + clock(task.due);
}
export function formatQuantity(q: Task['quantity']) {
  if (!q) return '';
  const name = { problems: '문제', pages: '쪽', passages: '지문', chapters: '단원' }[q.unit];
  return q.remaining + '/' + q.total + name;
}
