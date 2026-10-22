import { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Schedule, State, Task } from './model';
import { addDays, at, clock, dayKey, fullDate, weekday } from './time';
import { entriesForDay, monthDays, shiftMonth, type CalendarEntry } from './calendar';
import { Modal } from './Modal';
const WEEK = ['월', '화', '수', '목', '금', '토', '일'];
const LABELS = {
  school: '학교',
  academy: '학원',
  fixed: '일정',
  task: '과제',
  assessment: '수행평가',
  study: '공부 계획',
};
const number = (day: string) => Number(day.slice(-2));
export function CalendarPeek({
  state,
  now,
  onOpen,
  selectedDay,
}: {
  state: State;
  now: number;
  onOpen: () => void;
  selectedDay?: string;
}) {
  const today = dayKey(now);
  const start = addDays(today, -((weekday(today) + 6) % 7));
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        return { day, events: entriesForDay(state, day) };
      }),
    [state, start],
  );
  return (
    <motion.button layoutId="bkit-calendar-surface" className="calendar-peek" onClick={onOpen}>
      <span className="calendar-peek-heading">
        <span>
          <CalendarDays size={16} />
          {Number(today.slice(5, 7))}월의 흐름
        </span>
        <ArrowUpRight size={16} />
      </span>
      <span className="calendar-peek-week">
        {week.map(({ day, events }, i) => {
          return (
            <span
              className={[
                day === today ? 'is-today' : '',
                day === selectedDay ? 'is-selected' : '',
              ].join(' ')}
              key={day}
            >
              <small>{WEEK[i]}</small>
              <b>{number(day)}</b>
              <span className="calendar-day-marks" aria-hidden="true">
                <i
                  className={
                    events.some((e) => ['task', 'assessment'].includes(e.kind))
                      ? 'has-deadline'
                      : ''
                  }
                />
                <i
                  className={
                    events.some((e) => ['school', 'academy', 'fixed', 'study'].includes(e.kind))
                      ? 'has-schedule'
                      : ''
                  }
                />
              </span>
            </span>
          );
        })}
      </span>
      <span className="calendar-peek-foot">
        <span>전체 달력 열기</span>
        <span>● 마감 · ━ 수업과 일정</span>
        <ChevronRight size={14} />
      </span>
    </motion.button>
  );
}
export function StudyCalendar({
  state,
  now,
  onClose,
  onTask,
  onSchedule,
  onAdd,
  onCancel,
  selectedDay,
  onSelectedDay,
}: {
  state: State;
  now: number;
  onClose: () => void;
  onTask: (task: Task) => void;
  onSchedule: (schedule: Schedule, day: string) => void;
  onAdd: (day: string) => void;
  onCancel: (schedule: Schedule, day: string) => void;
  selectedDay?: string;
  onSelectedDay?: (day: string) => void;
}) {
  const today = dayKey(now);
  const [selected, setSelected] = useState(selectedDay || today),
    [cursor, setCursor] = useState(selectedDay || today);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year' | 'years'>('month');
  const touch = useRef<number | null>(null);
  const events = useMemo(() => entriesForDay(state, selected), [state, selected]);
  const days = useMemo(() => monthDays(cursor), [cursor]);
  const monthEntries = useMemo(
    () => new Map(days.map((day) => [day, entriesForDay(state, day)])),
    [state, days],
  );
  const weekStart = addDays(selected, -((weekday(selected) + 6) % 7));
  const year = Number(cursor.slice(0, 4));
  function choose(day: string) {
    setSelected(day);
    setCursor(day);
    onSelectedDay?.(day);
  }
  function move(amount: number) {
    if (view === 'day' || view === 'week') {
      const day = addDays(selected, amount * (view === 'week' ? 7 : 1));
      choose(day);
    } else {
      const day = shiftMonth(cursor, amount * (view === 'years' ? 144 : view === 'year' ? 12 : 1));
      if (Number(day.slice(0, 4)) >= 1900 && Number(day.slice(0, 4)) <= 2199) choose(day);
    }
  }
  function entryClick(entry: CalendarEntry) {
    if (['task', 'assessment', 'study'].includes(entry.kind)) {
      const task = state.tasks.find((t) => t.id === entry.sourceId);
      if (task) onTask(task);
    } else {
      const schedule = state.schedules.find((s) => s.id === entry.sourceId);
      if (schedule) onSchedule(schedule, entry.day);
    }
  }
  const title =
    view === 'years'
      ? `${year}–${year + 11}년`
      : view === 'year'
        ? `${year}년`
        : view === 'day'
          ? fullDate(at(selected, '12:00'))
          : `${year}년 ${Number(cursor.slice(5, 7))}월`;
  return (
    <Modal title="나의 달력" onClose={onClose} className="calendar-dialog">
      <motion.div
        layoutId="bkit-calendar-surface"
        className="calendar-expanded"
        transition={{ type: 'spring', stiffness: 330, damping: 36 }}
      >
        <div
          className="calendar-grip"
          aria-hidden="true"
          onTouchStart={(e) => {
            touch.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (touch.current !== null && e.changedTouches[0].clientY - touch.current > 80)
              onClose();
            touch.current = null;
          }}
        >
          <i />
        </div>
        <div className="calendar-toolbar">
          <h2 aria-live="polite">{title}</h2>
          <div>
            <button onClick={() => move(-1)} aria-label="이전 기간">
              <ChevronLeft size={19} />
            </button>
            <button
              onClick={() => {
                choose(today);
              }}
              className="calendar-today"
            >
              오늘
            </button>
            <button onClick={() => move(1)} aria-label="다음 기간">
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="calendar-views" role="group" aria-label="달력 보기">
          {(['day', 'week', 'month', 'year', 'years'] as const).map((key, i) => (
            <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>
              {['일', '주', '월', '연도', '여러 해'][i]}
            </button>
          ))}
        </div>
        <div className={'calendar-workspace view-' + view}>
          <div className="calendar-primary">
            {view === 'month' && (
              <div className="calendar-month">
                <div className="calendar-weekdays">
                  {WEEK.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="calendar-days">
                  {days.map((day) => {
                    const items = monthEntries.get(day)!,
                      kinds = [...new Set(items.map((e) => e.kind))].slice(0, 3);
                    return (
                      <button
                        key={day}
                        className={[
                          day === selected ? 'is-selected' : '',
                          day === today ? 'is-today' : '',
                          day.slice(0, 7) !== cursor.slice(0, 7) ? 'is-outside' : '',
                        ].join(' ')}
                        aria-label={`${day}, 일정 ${items.length}개`}
                        aria-pressed={day === selected}
                        aria-current={day === today ? 'date' : undefined}
                        onClick={() => choose(day)}
                      >
                        <span>{number(day)}</span>
                        <small>
                          {kinds.map((k) => (
                            <i className={'event-dot ' + k} key={k} />
                          ))}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {view === 'week' && (
              <div className="calendar-week-view">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = addDays(weekStart, i),
                    items = entriesForDay(state, day);
                  return (
                    <button
                      key={day}
                      className={selected === day ? 'is-selected' : ''}
                      onClick={() => choose(day)}
                      aria-pressed={selected === day}
                    >
                      <span>
                        {WEEK[i]}
                        <b
                          className={[
                            day === today ? 'is-today' : '',
                            day === selectedDay ? 'is-selected' : '',
                          ].join(' ')}
                        >
                          {number(day)}
                        </b>
                      </span>
                      <div>
                        {items.slice(0, 4).map((e) => (
                          <small key={e.id} className={'week-event ' + e.kind}>
                            {e.start ? clock(e.start) + ' ' : ''}
                            {e.title}
                          </small>
                        ))}
                        {items.length > 4 && <small>+{items.length - 4}개</small>}
                        {!items.length && <small className="calendar-free">여유</small>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {view === 'day' && (
              <div className="calendar-day-flow">
                <span className="calendar-flow-caption">오늘의 시간 · 한국 표준시</span>
                {events
                  .filter((e) => e.start !== undefined)
                  .map((e) => (
                    <button
                      key={e.id}
                      onClick={() => entryClick(e)}
                      className={'calendar-flow-item ' + e.kind}
                    >
                      <time>{clock(e.start!)}</time>
                      <span>
                        <b>{e.title}</b>
                        <small>
                          {LABELS[e.kind]}
                          {e.end ? ' · ' + clock(e.end) + '까지' : ''}
                        </small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                {!events.some((e) => e.start !== undefined) && (
                  <p className="calendar-empty">시간이 정해진 일정이 없어요.</p>
                )}
              </div>
            )}
            {view === 'year' && (
              <div className="calendar-year-grid">
                {Array.from({ length: 12 }, (_, i) => {
                  const month = `${year}-${String(i + 1).padStart(2, '0')}-01`;
                  return (
                    <button
                      key={month}
                      aria-label={`${year}년 ${i + 1}월 열기`}
                      onClick={() => {
                        choose(month);
                        setView('month');
                      }}
                    >
                      <strong>
                        {i + 1}
                        <small>월</small>
                      </strong>
                      <span className="mini-month">
                        {monthDays(month).map((day) => (
                          <i
                            key={day}
                            className={`${day === today ? 'is-today' : ''} ${day.slice(0, 7) !== month.slice(0, 7) ? 'is-outside' : ''}`}
                          >
                            {number(day)}
                          </i>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {view === 'years' && (
              <div className="calendar-years-grid">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      choose(`${year + i}-01-01`);
                      setView('year');
                    }}
                  >
                    {year + i}
                    <small>년</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <section className="calendar-detail" aria-label="선택 날짜 일정">
            <div className="calendar-detail-heading">
              <div>
                <small>{selected === today ? 'TODAY' : 'SELECTED DAY'}</small>
                <h3>{fullDate(at(selected, '12:00'))}</h3>
              </div>
              <button aria-label="선택 날짜에 등록" onClick={() => onAdd(selected)}>
                <Plus size={20} />
              </button>
            </div>
            <div className="calendar-detail-list">
              {events.map((e) => (
                <div key={e.id} className={'calendar-entry ' + e.kind + (e.done ? ' is-done' : '')}>
                  <button onClick={() => entryClick(e)}>
                    <i className={'event-dot ' + e.kind} />
                    <span>
                      <small>
                        {LABELS[e.kind]} ·{' '}
                        {e.start ? clock(e.start) + (e.end ? '–' + clock(e.end) : '') : '날짜 마감'}
                        {e.done ? ' · 완료' : ''}
                        {e.submitted ? ' · 제출' : ''}
                      </small>
                      <strong>{e.title}</strong>
                      {e.subject && <em>{e.subject}</em>}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  {['school', 'academy', 'fixed'].includes(e.kind) && (
                    <button
                      className="calendar-cancel"
                      onClick={() => {
                        const s = state.schedules.find((s) => s.id === e.sourceId);
                        if (s) onCancel(s, e.day);
                      }}
                    >
                      이날 취소
                    </button>
                  )}
                </div>
              ))}
              {!events.length && (
                <div className="calendar-empty">
                  <CalendarDays size={25} />
                  <p>비어 있는 하루예요.</p>
                  <button onClick={() => onAdd(selected)}>일정이나 과제 등록</button>
                </div>
              )}
            </div>
          </section>
        </div>
        <p className="calendar-legend">
          <span>
            <i className="event-dot school" />
            학교
          </span>
          <span>
            <i className="event-dot academy" />
            학원
          </span>
          <span>
            <i className="event-dot assessment" />
            수행평가
          </span>
          <span>
            <i className="event-dot task" />
            과제
          </span>
        </p>
      </motion.div>
    </Modal>
  );
}
