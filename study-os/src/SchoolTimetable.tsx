import { activation } from './activation';
import { useState, useEffect } from 'react';
import { entriesForDay } from './calendar';
import { addDays, clock, dayKey, fullDate } from './time';
import { parseTimetable } from './timetable';
import type { State, Schedule } from './model';

export function SchoolTimetable({
  state,
  now,
  onSave,
  onEdit,
}: {
  state: State;
  now: number;
  onSave: (items: Schedule[]) => boolean;
  onEdit: (item: Schedule, date: string) => void;
}) {
  const [tomorrow, setTomorrow] = useState(false),
    [text, setText] = useState(''),
    [error, setError] = useState('');
  const [preview, setPreview] = useState<Schedule[]>([]);
  const day = addDays(dayKey(now), tomorrow ? 1 : 0);
  const classes = entriesForDay(state, day)
    .filter((e) => e.schedule?.kind === 'school')
    .sort((a, b) => a.sort.localeCompare(b.sort));
  useEffect(() => {
    if (state.schedules.some((s) => s.kind === 'school')) activation('timetableNextDay');
  }, [state.schedules, dayKey(now)]);
  return (
    <section className="daily-panel" aria-label="학교 시간표">
      <div className="section-head">
        <h2>학교 시간표</h2>
        <button onClick={() => setTomorrow((v) => !v)}>
          {tomorrow ? '오늘 시간표' : '내일 시간표'}
        </button>
      </div>
      <p>{fullDate(new Date(day + 'T12:00:00+09:00'))} · 한국 시간 기준</p>
      {classes.length ? (
        <ol className="timetable-classes">
          {classes.map((e) => {
            const start = new Date(day + 'T' + e.schedule!.start + ':00+09:00').getTime();
            const end = new Date(day + 'T' + e.schedule!.end + ':00+09:00').getTime();
            return (
              <li key={e.id}>
                <strong>{e.schedule!.title}</strong> {clock(start)}–{clock(end)}{' '}
                {now >= start && now < end
                  ? ' · 지금 수업'
                  : !tomorrow &&
                      now < start &&
                      !classes.some(
                        (x) =>
                          x !== e &&
                          x.schedule!.start < e.schedule!.start &&
                          new Date(day + 'T' + x.schedule!.start + ':00+09:00').getTime() > now,
                      )
                    ? ' · 다음 수업'
                    : ''}
                <small>{e.schedule!.materials}</small>
                <button onClick={() => onEdit(e.schedule!, day)}>이 날짜 수업 변경</button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p>이 날짜에 등록된 학교 수업이 없어요. 실제 시간표를 확인해 등록하세요.</p>
      )}
      <details>
        <summary>시간표 한 번에 등록 · 표 붙여넣기</summary>
        <p>
          스프레드시트에서 요일 / 시작 / 종료 / 과목 / 교실(선택) 열을 복사하세요. 교시는 입력한
          시각 순서로 표시해요. 점심·휴업일·선택과목을 추측하지 않아요.
        </p>
        <pre>
          월{'\t'}09:00{'\t'}09:50{'\t'}수학{'\t'}2-1
        </pre>
        <label>
          시간표 표 붙여넣기
          <textarea
            aria-label="시간표 표 붙여넣기"
            rows={6}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview([]);
            }}
          />
        </label>
        <button
          onClick={() => {
            try {
              setPreview(parseTimetable(text, state.schedules));
              setError('');
            } catch (e) {
              setError(e instanceof Error ? e.message : '시간표를 확인해 주세요.');
            }
          }}
        >
          입력 시간표 확인
        </button>
        {error && <p role="alert">{error}</p>}
        {preview.length > 0 && (
          <>
            <ul>
              {preview.map((s) => (
                <li key={s.id}>
                  {['일', '월', '화', '수', '목', '금', '토'][s.days[0]]} {s.start}–{s.end}{' '}
                  {s.subject} {s.materials}
                </li>
              ))}
            </ul>
            <button
              className="primary"
              onClick={() => {
                if (onSave(preview)) {
                  setText('');
                  setPreview([]);
                  setError('');
                } else setError('시간표 저장 실패 · 입력은 유지돼요.');
              }}
            >
              확인한 시간표 저장
            </button>
          </>
        )}
      </details>
    </section>
  );
}
