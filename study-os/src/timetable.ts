import { scheduleSchema, uid, type Schedule } from './model';
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** Explicit TSV only; no inferred lesson times, days or merged elective names. */
export function parseTimetable(text: string, existing: Schedule[]): Schedule[] {
  const lines = text
    .trim()
    .split('\n')
    .filter((x) => x.trim());
  if (!lines.length || lines.length > 80) throw new Error('1~80개 수업을 입력하세요.');
  const result: Schedule[] = [];
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split('\t').map((x) => x.trim());
    const [day, start, end, subject, room = ''] = row;
    const weekday = DAYS.indexOf(day?.replace(/요일$/, ''));
    if (row.length < 4 || row.length > 5 || weekday < 0 || !subject)
      throw new Error(`${i + 1}행: 요일, 시작, 종료, 과목을 탭으로 구분하세요.`);
    const schedule = scheduleSchema.parse({
      id: uid(),
      title: subject,
      subject,
      kind: 'school',
      days: [weekday],
      start,
      end,
      prep: 0,
      travel: 0,
      buffer: 0,
      materials: room ? `교실: ${room}` : '',
      date: null,
      excluded: [],
    });
    if (
      [...existing, ...result].some(
        (s) =>
          s.kind === 'school' &&
          !s.date &&
          s.days.includes(weekday) &&
          s.start < schedule.end &&
          s.end > schedule.start,
      )
    )
      throw new Error(
        `${i + 1}행: 기존 또는 입력한 학교 수업과 시간이 겹쳐요. 기존 수업은 달력에서 수정하세요.`,
      );
    result.push(schedule);
  }
  return result;
}
