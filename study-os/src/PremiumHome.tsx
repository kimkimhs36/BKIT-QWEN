import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Clock3, Play, Plus } from 'lucide-react';
import type { State, Task } from './model';
import type { Fixed } from './engine';
import { entriesForDay } from './calendar';
import { recommendationReason } from './now';
import { clock, dayKey, addDays } from './time';
import { formatTaskDeadline } from './capture';
import { needsSubmission } from './tasks';
import { quickClock, quickSeconds } from './quickTimer';
import { studySeconds, elapsed } from './session';

type Props = {
  state: State;
  now: number;
  tasks: Task[];
  next?: Fixed;
  current?: Fixed;
  resource?: { id: string; title: string } | null;
  onStart: (id?: string) => void;
  onQuick: (minutes?: number) => void;
  onNavigate: (route: string) => void;
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onSubmissions: () => void;
  onResource: (id: string) => void;
  onHelp: () => void;
};
export function PremiumHome({
  state,
  now,
  tasks,
  next,
  current,
  resource,
  onStart,
  onQuick,
  onNavigate,
  onAdd,
  onEdit,
  onSubmissions,
  onResource,
  onHelp,
}: Props) {
  const pending = tasks.filter((t) => t.status !== 'done');
  const awaiting = state.tasks.filter(needsSubmission);
  const recent = state.sessions.at(-1);
  const active = state.active,
    quick = state.quickTimer,
    busy = !!active || !!quick;
  const seconds = active ? elapsed(active, now) : quick ? quickSeconds(quick, now) : 0;
  const minutes = Math.floor(studySeconds(state.sessions, dayKey(now)) / 60);
  // Default sleep/meal boundaries protect timers, but are not learner appointments.
  const appointment = current && !['sleep', 'meal'].includes(current.kind) ? current : next;
  const todayEntries = entriesForDay(state, dayKey(now));
  const tomorrowEntries = entriesForDay(state, addDays(dayKey(now), 1));
  const deadlineCount = (entries: typeof todayEntries) =>
    entries.filter((e) => e.task && e.task.status !== 'done').length;
  return (
    <div className="study-home">
      <section className="study-start" aria-label="바로 공부 시작">
        <div className="study-start-copy">
          <h2>{busy ? '공부 이어하기' : '공부 시작'}</h2>
          <p>
            {busy
              ? `${active?.subject || '자율 학습'} · ${quickClock(seconds)}`
              : pending[0]
                ? `${pending[0].subject} · ${pending[0].title}`
                : '타이머를 켜고, 가볍게 시작해요.'}
          </p>
          {!busy && pending[0] && (
            <small className="study-recommendation-reason">
              {recommendationReason(pending[0], now)}
            </small>
          )}
        </div>
        <div className="study-start-actions">
          <button
            className="study-start-primary"
            onClick={() =>
              busy ? onNavigate('study') : pending[0] ? onStart(pending[0].id) : onQuick()
            }
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            {busy ? '공부 이어가기' : '지금 공부 시작'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          {!busy && (
            <button className="study-start-five" onClick={() => onQuick(5)}>
              5분만 시작하기
            </button>
          )}
        </div>
      </section>
      <section className="study-agenda" aria-label="오늘 해야 할 일">
        {pending.length > 0 && (
          <div className="study-section-heading">
            <h2>
              오늘 할 일<span>{pending.length}</span>
            </h2>
            <button className="study-icon" onClick={onAdd} aria-label="오늘 과제 추가">
              <Plus size={20} />
            </button>
          </div>
        )}
        {pending.length ? (
          <>
            <div className="study-task-list">
              {pending.slice(0, 3).map((task) => (
                <div className="study-task" key={task.id}>
                  <button className="study-task-copy" onClick={() => onEdit(task)}>
                    <small>
                      {task.subject}
                      <span>
                        {task.due || task.deadline ? formatTaskDeadline(task) : '마감일 없음'}
                      </span>
                    </small>
                    <strong>{task.title}</strong>
                  </button>
                  <button
                    className="study-icon"
                    aria-label={`${task.title} 5분 시작`}
                    onClick={() => onStart(task.id)}
                  >
                    <Play size={17} />
                  </button>
                </div>
              ))}
            </div>
            <button className="study-text-link" onClick={() => onNavigate('tasks')}>
              {pending.length > 3 ? `${pending.length}개 전체 보기` : '할 일 전체 보기'}
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <div className="study-empty-agenda">
            <p>오늘 할 일을 추가해 보세요.</p>
            <button className="study-icon" onClick={onAdd} aria-label="오늘 과제 추가">
              <Plus size={20} />
            </button>
          </div>
        )}
        {awaiting.length > 0 && (
          <button className="study-submission has-pending" onClick={onSubmissions}>
            <span>제출 확인 {awaiting.length}개 남았어요</span>
            <ChevronRight size={17} />
          </button>
        )}
      </section>
      <button
        className="study-day-summary"
        onClick={() => onNavigate('progress')}
        aria-label={`오늘 공부 ${minutes}분, 기록 보기`}
      >
        <span>
          <Clock3 size={19} />
          오늘 공부 시간
        </span>
        <strong>
          {minutes}
          <small>분</small>
          <ChevronRight size={17} />
        </strong>
      </button>
      <section className="study-calendar-summary" aria-label="오늘과 내일 일정 요약">
        <button
          className="study-calendar-link"
          data-icon-feedback
          onClick={() => onNavigate('school')}
          aria-label={`오늘 일정 ${todayEntries.filter((e) => e.schedule).length} · 오늘 마감 ${deadlineCount(todayEntries)} · 내일 마감 ${deadlineCount(tomorrowEntries)} 달력 열기`}
        >
          <span className="study-calendar-stamp" data-touch-icon aria-hidden="true">
            <small>{Number(dayKey(now).slice(5, 7))}월</small>
            <strong>{Number(dayKey(now).slice(-2))}</strong>
          </span>
          <span className="study-calendar-copy">
            <strong>나의 달력</strong>
            <small>
              오늘 일정 {todayEntries.filter((e) => e.schedule).length} · 오늘 마감{' '}
              {deadlineCount(todayEntries)} · 내일 마감 {deadlineCount(tomorrowEntries)}
            </small>
          </span>
          <span className="study-calendar-open">
            달력 열기 <ChevronRight size={16} />
          </span>
        </button>
        {appointment && (
          <section className="study-next" aria-label="다음 일정">
            <Clock3 size={20} />
            <div>
              <span className="study-kicker">
                {appointment === current ? '지금 일정' : '다음 일정'}
              </span>
              <h3>{appointment.title}</h3>
              <p>
                {clock(appointment.start)}–{clock(appointment.end)}
                {dayKey(appointment.start) !== dayKey(now) && ` · ${dayKey(appointment.start)}`}
              </p>
            </div>
            <button
              className="study-icon"
              onClick={() => onNavigate('school')}
              aria-label="시간표 보기"
            >
              <ArrowUpRight size={20} />
            </button>
          </section>
        )}
      </section>
      {(resource || recent) && (
        <section className="study-recent" aria-label="최근 공부 이어하기">
          <BookOpen size={20} />
          <div>
            <span className="study-kicker">{resource ? '최근 자료' : '최근 공부'}</span>
            <h3>{resource?.title || `${recent!.subject} · ${recent!.action}`}</h3>
            <p>
              {resource
                ? '마지막으로 공부한 위치에서 이어가요.'
                : `${Math.floor(recent!.seconds / 60)}분 · ${dayKey(recent!.ended)}`}
            </p>
          </div>
          <button
            className="study-icon"
            onClick={() => (resource ? onResource(resource.id) : onNavigate('progress'))}
            aria-label={resource ? '최근 자료 이어 풀기' : '최근 공부 기록 보기'}
          >
            <ArrowUpRight size={20} />
          </button>
        </section>
      )}
      <button className="study-help-link" onClick={onHelp}>
        처음이라면 · 30초 사용 가이드 <ArrowRight size={15} />
      </button>
    </div>
  );
}
