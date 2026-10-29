import { parseCapture } from './capture';
import { scheduleSchema, uid, type Schedule } from './model';
import { dayKey, addDays, weekday } from './time';

export type SpokenSchedule =
  | { kind: 'draft'; schedule: Schedule; detail: string }
  | { kind: 'incomplete'; answer: string }
  | { kind: 'invalid'; answer: string };

/** Deliberately narrow: never treat an ordinary academy discussion as a write request. */
export function isScheduleCommand(text: string): boolean {
  if (/(?:숙제|학습지|과제|수행평가|문제)/.test(text) && !/(?:시간표|수업\s*일정|학원\s*일정)/.test(text)) return false;
  return /(?:학원|과외|수업|고정\s*일정|시간표)/.test(text) &&
    /(?:등록|추가|넣어|저장|만들어)/.test(text) &&
    !/(?:삭제|제거|취소|수정|변경|옮겨|미루)/.test(text);
}

function requestedDays(input: string): number[] {
  const order = '일월화수목금토';
  const set = new Set<number>();
  for (const match of input.matchAll(/([일월화수목금토])요일/g)) set.add(order.indexOf(match[1]));
  // Compact or separated abbreviations only after '매주' (or with explicit separators).
  const compact = input.match(/매주\s*([월화수목금토일]{1,7})(?![가-힣])/);
  const separated = input.match(/([월화수목금토일](?:\s*[/,·]\s*[월화수목금토일])+)/);
  for (const group of [compact?.[1], separated?.[1]]) {
    for (const ch of group || '') if (order.includes(ch)) set.add(order.indexOf(ch));
  }
  return [...set].sort((a, b) => a - b);
}

type ClockPart = { part: string | undefined; hour: string; mm1?: string; mm2?: string };
function parseClock(part: ClockPart, inherited: string | undefined): string | null {
  const h = Number(part.hour), m = Number(part.mm1 ?? part.mm2 ?? '0');
  if (!Number.isInteger(h) || !Number.isInteger(m) || m > 59) return null;
  let hour: number;
  const meridian = part.part || inherited;
  if (meridian) {
    if (h < 1 || h > 12) return null;
    hour = h % 12 + (meridian === '오후' ? 12 : 0);
  } else {
    if (h < 13 || h > 23) return null; // bare 1~12 is ambiguous
    hour = h;
  }
  return String(hour).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
const TIME = '(오전|오후)?\\s*(\\d{1,2})(?:\\s*:\\s*([0-5]\\d)|\\s*시(?:\\s*(\\d{1,2})\\s*분)?)';
const RANGE = new RegExp(TIME + '\\s*(?:부터\\s*|[~～\\-–—]\\s*)' + TIME + '\\s*(?:까지)?');

function extractTime(input: string): { start: string; end: string } | null {
  const match = RANGE.exec(input);
  if (!match) return null;
  const start = parseClock({part: match[1], hour: match[2], mm1: match[3], mm2: match[4]}, undefined);
  const end = parseClock({part: match[5], hour: match[6], mm1: match[7], mm2: match[8]}, match[1]);
  return start && end ? { start, end } : null;
}

export function parseSpokenSchedule(input: string, now = Date.now()): SpokenSchedule {
  const question = input.trim().slice(0, 1000);
  const weekly = /매주|매\s*주|매주마다|요일마다/.test(question);
  const dateWords = /오늘|내일|모레|이번\s*주|다음\s*주|20\d{2}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일/.test(question);
  const days = requestedDays(question);
  if (weekly && dateWords) return {
    kind: 'invalid', answer: '매주 반복과 특정 날짜가 함께 적혀 있어. 한 번만 등록할지, 매주 반복할지 구분해 줘.',
  };
  const time = extractTime(question);
  if (!time) return {kind:'incomplete', answer:'시간이 모호해. 시작과 종료를 오전/오후까지 알려줘. 예: 매주 화요일 오후 6시부터 8시까지 수학 학원 추가해줘.'};
  if (time.end <= time.start) return {
    kind: 'invalid', answer:'종료 시간이 시작 시간보다 늦어야 해. 자정을 넘는 일정은 시간표에서 직접 등록해 줘.',
  };
  if (weekly && !days.length) return {
    kind:'incomplete', answer:'매주 무슨 요일인지 알려줘. 예: 매주 월수금 오후 6시부터 8시까지.',
  };
  if (!weekly && !dateWords) return {
    kind:'incomplete', answer:'이 일정은 한 번만 있는 수업이야, 매주 반복되는 수업이야? 예: 이번 주 금요일 / 매주 금요일.',
  };
  let date = weekly ? null : parseCapture(question, now).due || null;
  if (!weekly && /이번\s*주/.test(question)) {
    const specifiedDay = question.match(/([일월화수목금토])요일/);
    if (specifiedDay) {
      const today = dayKey(now);
      const monday = addDays(today, -((weekday(today) + 6) % 7));
      const targetWeekday = '일월화수목금토'.indexOf(specifiedDay[1]);
      date = addDays(monday, (targetWeekday + 6) % 7);
      if (date < today) return {
        kind: 'invalid', answer: '이번 주 해당 요일은 이미 지났어. 다음 주 수업이라면 "다음 주"라고 말해 줘.',
      };
    }
  }
  if (!weekly && !date) return {kind:'incomplete', answer:'날짜를 확인할 수 없어. 예: 10월 30일 오후 6시부터 8시까지.'};
  const name = question.match(/([가-힣A-Za-z0-9]{1,24})\s*(학원|과외)/);
  const ignored = new Set(['까지', '부터', '오전', '오후', '오늘', '내일', '모레', '이번', '다음', '매주', '시간', '수업']);
  const isRealName = !!name && !ignored.has(name[1]) && !/(?:요일|까지|부터)$/.test(name[1]);
  const title = isRealName ? name![1] + ' ' + name![2] : '수업';
  if (title === '수업') return {
    kind: 'incomplete', answer:'어떤 수업인지 이름을 알려줘. 예: 매주 화요일 오후 6시부터 8시까지 수학 학원 등록해줘.',
  };
  const daySet = weekly ? days : [new Date(date + 'T00:00:00Z').getUTCDay()];
  const field = parseCapture(question, now);
  const schedule = scheduleSchema.parse({
    id: uid(), title, subject: field.subject === '기타' ? '' : field.subject,
    kind: 'academy', days: daySet, start: time.start, end: time.end,
    prep: 0, travel: 0, buffer: 0, materials: '', date,
    excluded: [],
  });
  const label = weekly
    ? '매주 ' + daySet.map((d) => '일월화수목금토'[d]).join('·') + '요일'
    : date;
  return {
    kind: 'draft',
    schedule,
    detail: schedule.title + ' · ' + label + ' · ' + time.start + '~' + time.end +
      ' (준비·이동 시간은 미입력, 0분으로 임시 저장)',
  };
}

/** One follow-up is permitted only for the immediately preceding unresolved command.
 * The assistant may explain the composite interpretation, but never saves it silently.
 */
export function recoverScheduleQuestion(
  question: string,
  recent: Array<{role:'user'|'assistant';text:string}>,
): string {
  if (isScheduleCommand(question)) return question;
  const last = recent.slice(-3);
  if (last.length < 2) return question;
  const assistant = last[last.length - 1];
  const prior = last[last.length - 2];
  if (assistant.role !== 'assistant' || prior.role !== 'user' ||
      !isScheduleCommand(prior.text) ||
      !/시간이 모호|요일인지|한 번만|이름을 알려줘|날짜를 확인/.test(assistant.text)) return question;
  // Only explicit follow-up details, not casual agreement, can complete a draft.
  if (!/(?:시|:\d{2}|요일|매주|오늘|내일|모레|이번\s*주|다음\s*주|학원|과외|10월|\d{1,2}\s*월)/.test(question)) return question;
  return prior.text + ' ' + question;
}
