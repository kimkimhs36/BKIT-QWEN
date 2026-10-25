import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Download,
  Ellipsis,
  Pencil,
  Play,
  Plus,
  Target,
} from 'lucide-react';
import {
  calendarKinds,
  entriesForDay,
  monthDays,
  shiftMonth,
  weekDays,
  type CalendarKind,
} from './calendar';
import { Modal } from './Modal';
import type { Schedule, State, Task } from './model';
import { addDays, at, clock, fullDate } from './time';
import { fixedConflicts } from './safety';
import { needsSubmission } from './tasks';
const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
type Props = {
  state: State;
  day: string;
  today: string;
  onDay: (d: string) => void;
  onSchedule: (s: Schedule | null, d?: string, occurrence?: string) => void;
  onTask: (kind: Task['kind'], day: string) => void;
  onEdit: (t: Task) => void;
  onStart: (id: string) => void;
  onExport: () => void;
  onRemoveBlock: (id: string) => void;
  onPlan: (taskId: string, day: string, blockId?: string) => void;
};
export function StudyCalendar({
  state,
  day,
  today,
  onDay,
  onSchedule,
  onTask,
  onEdit,
  onStart,
  onExport,
  onRemoveBlock,
  onPlan,
}: Props) {
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [filter, setFilter] = useState<CalendarKind | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const dates = useMemo(
    () => (view === 'month' ? monthDays(day) : view === 'week' ? weekDays(day) : [day]),
    [day, view],
  );
  const byDay = useMemo(
    () =>
      new Map(
        dates.map((d) => [
          d,
          entriesForDay(state, d).filter((e) => filter === 'all' || e.kind === filter),
        ]),
      ),
    [state, dates, filter],
  );
  const selected = byDay.get(day) ?? [];
  const conflicts = fixedConflicts(state, day);
  function move(n: number) {
    onDay(
      view === 'year'
        ? shiftMonth(day, n * 12)
        : view === 'month'
          ? shiftMonth(day, n)
          : addDays(day, n * (view === 'week' ? 7 : 1)),
    );
  }
  function select(d: string) {
    onDay(d);
    if (matchMedia('(max-width:759px)').matches)
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        }),
      );
  }
  function add(kind: Task['kind'] | 'schedule') {
    setAdding(false);
    if (kind === 'schedule') onSchedule(null, day);
    else onTask(kind, day);
  }
  return (
    <div className="planner">
      <div className="planner-heading">
        <div className="planner-month">
          <h2 aria-live="polite">
            {Number(day.slice(0, 4))}
            <span>년</span>{' '}
            {view !== 'year' && (
              <>
                {Number(day.slice(5, 7))}
                <span>월</span>
              </>
            )}
          </h2>
          <div>
            <button className="planner-icon" aria-label="이전 기간" onClick={() => move(-1)}>
              <ArrowLeft size={18} />
            </button>
            <button className="planner-icon" aria-label="다음 기간" onClick={() => move(1)}>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="planner-views" role="group" aria-label="달력 보기">
          {(['day', 'week', 'month', 'year'] as const).map((v) => (
            <button
              key={v}
              aria-label={{ day: '일간', week: '주간', month: '월간', year: '연간' }[v]}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {{ day: '일', week: '주', month: '월', year: '연' }[v]}
              <span className="planner-sr">간</span>
            </button>
          ))}
        </div>
      </div>
      <div className="planner-controls">
        <button className="planner-today" onClick={() => onDay(today)}>
          오늘
        </button>
        <button className="planner-tomorrow" onClick={() => onDay(addDays(today, 1))}>
          내일
        </button>
        <input
          className="planner-date"
          type="date"
          aria-label="조회 날짜"
          value={day}
          onChange={(e) => e.target.validity.valid && e.target.value && onDay(e.target.value)}
        />
        <details className="planner-options">
          <summary aria-label="달력 설정">
            <Ellipsis size={20} />
          </summary>
          <div className="planner-options-body">
            <label>
              표시할 일정
              <select
                aria-label="일정 종류"
                value={filter}
                onChange={(e) => setFilter(e.target.value as CalendarKind | 'all')}
              >
                <option value="all">모든 일정</option>
                {Object.entries(calendarKinds).map(([id, k]) => (
                  <option key={id} value={id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => setWeeklyOpen(true)}>
              <CalendarDays size={16} /> 반복 시간표
            </button>
            <button aria-label="14일 캘린더 내보내기" onClick={onExport}>
              <Download size={16} /> 캘린더 내보내기
            </button>
          </div>
        </details>
      </div>
      {filter !== 'all' && (
        <button className="planner-filter" onClick={() => setFilter('all')}>
          {calendarKinds[filter].label}만 표시 중 · 전체 보기
        </button>
      )}
      <div className={'planner-layout planner-view-' + view}>
        {view === 'year' && (
          <section className="planner-year" aria-label="연간 달력" key={day.slice(0, 4)}>
            {Array.from({ length: 12 }, (_, i) => {
              const month = `${day.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`;
              const due = state.tasks.filter(
                (t) => t.status !== 'done' && (t.deadline?.date || t.due || '').startsWith(month),
              ).length;
              return (
                <button
                  type="button"
                  key={month}
                  aria-label={`${month} 월간 보기`}
                  aria-current={today.startsWith(month) ? 'date' : undefined}
                  onClick={() => {
                    onDay(month + '-01');
                    setView('month');
                  }}
                  data-icon-feedback
                >
                  <strong data-touch-icon>
                    {i + 1}
                    <small>월</small>
                  </strong>
                  <span>{due ? `남은 마감 ${due}개` : '월간 보기'}</span>
                </button>
              );
            })}
          </section>
        )}
        {view !== 'day' && view !== 'year' && (
          <section
            className="planner-board"
            ref={boardRef}
            aria-label={view === 'month' ? '월간 달력' : '주간 달력'}
          >
            <div className="planner-weekdays">
              {weekdays.map((d, i) => (
                <span key={d} className={i > 4 ? 'weekend' : ''}>
                  {d}
                </span>
              ))}
            </div>
            <div
              className="planner-grid"
              key={view + day.slice(0, 7)}
              onKeyDown={(e) => {
                const offsets: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -7,
                  ArrowDown: 7,
                };
                if (!(e.target instanceof HTMLButtonElement) || !(e.key in offsets)) return;
                e.preventDefault();
                const next = addDays(e.target.dataset.day!, offsets[e.key]);
                onDay(next);
                requestAnimationFrame(() =>
                  document.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus(),
                );
              }}
            >
              {dates.map((d) => {
                const entries = byDay.get(d) ?? [];
                return (
                  <button
                    className={
                      'planner-date-cell' + (d.slice(0, 7) !== day.slice(0, 7) ? ' outside' : '')
                    }
                    data-icon-feedback
                    data-day={d}
                    key={d}
                    aria-label={`${d} · 일정 ${entries.length}개`}
                    aria-pressed={d === day}
                    aria-current={d === today ? 'date' : undefined}
                    onClick={() => select(d)}
                  >
                    <span className="planner-number" data-touch-icon>
                      {Number(d.slice(-2))}
                    </span>
                    <span className="planner-markers">
                      {[...new Set(entries.map((e) => e.kind))].slice(0, 3).map((k) => (
                        <i key={k} data-kind={k} />
                      ))}
                    </span>
                    <span className="planner-previews">
                      {entries.slice(0, view === 'week' ? 3 : 2).map((e) => (
                        <span key={e.id} data-kind={e.kind}>
                          {e.title}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        <section ref={detailRef} className="planner-day" aria-label="선택 날짜 일정과 마감">
          <div className="planner-day-heading">
            <div>
              {view !== 'day' && (
                <button
                  className="planner-return"
                  onClick={() =>
                    boardRef.current?.scrollIntoView({
                      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'instant'
                        : 'smooth',
                      block: 'start',
                    })
                  }
                >
                  <ArrowLeft size={13} /> 달력
                </button>
              )}
              <h2>{fullDate(at(day, '12:00'))}</h2>
              <p>
                {day === today ? '오늘' : day === addDays(today, 1) ? '내일' : '선택한 하루'}
                {selected.length > 0 ? ` · ${selected.length}개` : ''}
              </p>
            </div>
            <button
              className="planner-add"
              aria-label="선택 날짜에 추가"
              onClick={() => setAdding(true)}
            >
              <Plus size={19} />
            </button>
          </div>
          {conflicts.length > 0 && (
            <p className="planner-warning" role="status">
              시간이 겹치는 일정이 있어요. {conflicts.join(', ')}
            </p>
          )}
          {selected.length === 0 && (
            <div className="planner-empty">
              <p>아직 일정이 없어요.</p>
              <span>새로운 계획이 생기면 여기에 담아두세요.</span>
            </div>
          )}
          <div className="planner-entries" key={day}>
            {selected.filter((e) => e.schedule).length > 0 && (
              <section aria-label="선택 날짜 일정">
                {selected
                  .filter((e) => e.schedule)
                  .map((e) => (
                    <article className="planner-entry schedule-row" data-kind={e.kind} key={e.id}>
                      <div className="planner-entry-top">
                        <span className="planner-kind">
                          <i />
                          {calendarKinds[e.kind].label}
                        </span>
                        <time>{e.time}</time>
                      </div>
                      <h3>{e.title}</h3>
                      {e.schedule!.materials && <p>준비물 · {e.schedule!.materials}</p>}
                      {e.schedule!.prep + e.schedule!.travel + e.schedule!.buffer > 0 && (
                        <p>
                          준비{' '}
                          {clock(
                            at(day, e.schedule!.start) -
                              (e.schedule!.prep + e.schedule!.travel + e.schedule!.buffer) * 60000,
                          )}{' '}
                          · 이동 {e.schedule!.travel}분
                        </p>
                      )}
                      <div className="planner-entry-actions">
                        <button
                          aria-label={e.title + ' 이 날짜만 수정'}
                          onClick={() => onSchedule(e.schedule!, day, day)}
                        >
                          이 날짜만 수정
                        </button>
                        <button
                          aria-label={e.title + ' 수정'}
                          onClick={() => onSchedule(e.schedule!)}
                        >
                          <Pencil size={14} /> {e.schedule!.date ? '수정' : '반복 수정'}
                        </button>
                      </div>
                    </article>
                  ))}
              </section>
            )}
            {selected.filter((e) => e.task).length > 0 && (
              <section aria-label="선택 날짜 과제 마감">
                {selected
                  .filter((e) => e.task)
                  .map((e) => (
                    <article
                      className={'planner-entry' + (e.task!.status === 'done' ? ' is-done' : '')}
                      data-kind={e.kind}
                      key={e.id}
                    >
                      <div className="planner-entry-top">
                        <span className="planner-kind">
                          <i />
                          {calendarKinds[e.kind].label}
                        </span>
                        <time>{e.time}</time>
                      </div>
                      <button className="planner-entry-title" onClick={() => onEdit(e.task!)}>
                        {e.task!.subject} · {e.title}
                      </button>
                      <p>
                        {e.task!.status === 'done' ? '학습 완료' : '미완료'}
                        {e.task!.submitted
                          ? ' · 제출 완료'
                          : needsSubmission(e.task!)
                            ? ' · 제출 확인 필요'
                            : ''}
                      </p>
                      <div className="planner-entry-actions">
                        <button onClick={() => onEdit(e.task!)}>
                          상세 · 수정{needsSubmission(e.task!) ? ' · 제출 확인' : ''}
                        </button>
                        {e.task!.status !== 'done' && e.task!.quantity?.remaining !== 0 && (
                          <button
                            className="planner-start"
                            aria-label={e.title + (e.blockId ? ' 계획에서' : '') + ' 5분 공부 시작'}
                            onClick={() => onStart(e.task!.id)}
                          >
                            <Play size={13} />
                            5분 시작
                          </button>
                        )}
                        {e.task!.status !== 'done' && (
                          <button onClick={() => onPlan(e.task!.id, day, e.blockId)}>
                            {e.blockId ? '계획 시간 수정' : '공부 시간 배치'}
                          </button>
                        )}
                        {e.blockId && (
                          <button onClick={() => onRemoveBlock(e.blockId!)}>계획 취소</button>
                        )}
                      </div>
                    </article>
                  ))}
              </section>
            )}
          </div>
        </section>
      </div>
      {adding && (
        <Modal
          title={fullDate(at(day, '12:00')) + '에 추가'}
          onClose={() => setAdding(false)}
          className="planner-add-dialog"
        >
          <div role="group" aria-label="선택 날짜에 추가" className="planner-add-options">
            {(
              [
                {
                  kind: 'schedule',
                  title: '일정 등록',
                  detail: '학교 · 학원 · 기타 일정',
                  icon: CalendarDays,
                },
                { kind: '숙제', title: '과제', detail: '숙제와 날짜 마감', icon: CheckSquare },
                { kind: '수행평가', title: '수행평가', detail: '준비부터 제출까지', icon: Target },
                {
                  kind: '시험공부',
                  title: '공부 계획',
                  detail: '하고 싶은 공부와 시간 배치',
                  icon: BookOpen,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.kind}
                aria-label={item.title}
                aria-description={item.detail}
                onClick={() => add(item.kind)}
              >
                <item.icon size={21} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {weeklyOpen && (
        <Modal
          title="반복 시간표"
          onClose={() => setWeeklyOpen(false)}
          className="planner-weekly-dialog"
        >
          <div className="planner-weekly-grid">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <section key={d}>
                <h3>{weekdays[(d + 6) % 7]}요일</h3>
                {state.schedules
                  .filter((s) => !s.date && s.days.includes(d))
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setWeeklyOpen(false);
                        onSchedule(s);
                      }}
                    >
                      <small>
                        {s.start}–{s.end}
                      </small>
                      <strong>{s.title}</strong>
                    </button>
                  ))}
                {!state.schedules.some((s) => !s.date && s.days.includes(d)) && (
                  <p>등록된 수업 없음</p>
                )}
              </section>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
