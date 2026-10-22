import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CarFront,
  ChevronRight,
  Clock3,
  ClipboardList,
  GraduationCap,
  Plus,
} from 'lucide-react';
import type { State, Task } from './model';
import { nextSchedule, type Fixed } from './engine';
import { CalendarPeek } from './StudyCalendar';
import { clock, dayKey } from './time';
import { formatTaskDeadline } from './capture';
import { needsSubmission } from './tasks';
import { studySeconds } from './session';
import { HomeHero } from './HomeHero';

type Props = {
  state: State;
  now: number;
  tasks: Task[];
  recommended?: Task;
  selection: string;
  onSelectionChange: (id: string) => void;
  next?: Fixed;
  nextProtected?: Fixed;
  current?: Fixed;
  resource?: { id: string; title: string } | null;
  onStart: (id?: string) => void;
  onQuick: (minutes?: number) => void;
  onNavigate: (route: string) => void;
  onAdd: () => void;
  onAssessment: () => void;
  onMaterials: () => void;
  onTasks: (kind: 'homework' | 'assessment') => void;
  onCalendar: () => void;
  calendarDay?: string;
  onEdit: (task: Task) => void;
  onSubmissions: () => void;
  onResource: (id: string) => void;
  online: boolean;
};

export function PremiumHome(props: Props) {
  const {
    state,
    now,
    tasks,
    current,
    next,
    resource,
    onNavigate,
    onAdd,
    onAssessment,
    onMaterials,
    onTasks,
    onCalendar,
    onEdit,
    onSubmissions,
    onResource,
    online,
  } = props;
  const pending = tasks.filter((t) => t.status !== 'done');
  const awaiting = state.tasks.filter(needsSubmission);
  const recent = state.sessions.reduce<State['sessions'][number] | undefined>(
    (latest, session) => (!latest || session.ended > latest.ended ? session : latest),
    undefined,
  );
  const today = dayKey(now);
  const minutes = Math.floor(studySeconds(state.sessions, today) / 60);
  const sessions = state.sessions.filter((s) => dayKey(s.ended) === today).length;
  const attempts =
    state.learningEvents?.filter((e) => e.type === 'FirstLearningAttempt' && dayKey(e.at) === today)
      .length ?? 0;
  const completed = state.tasks.filter(
    (t) => t.status === 'done' && t.completedAt && dayKey(t.completedAt) === today,
  ).length;
  const appointment = current && !['sleep', 'meal'].includes(current.kind) ? current : next;
  const following =
    appointment === current && appointment ? nextSchedule(state, appointment.end + 1) : undefined;
  return (
    <div className="study-home home-rebirth">
      {!online && (
        <p className="rebirth-offline" role="status">
          오프라인 · 이 기기의 과제와 공부 기록은 계속 사용할 수 있어요.
        </p>
      )}
      <HomeHero {...props} />
      <div className="rebirth-capture" role="group" aria-label="빠른 등록">
        <button onClick={onAdd}>
          <Plus size={19} aria-hidden="true" />
          <span>과제 등록</span>
        </button>
        <button onClick={onAssessment}>
          <GraduationCap size={19} aria-hidden="true" />
          <span>수행평가 등록</span>
        </button>
        <button onClick={onMaterials}>
          <BookOpen size={19} aria-hidden="true" />
          <span>자료 추가</span>
        </button>
      </div>
      <section className="rebirth-agenda" aria-label="오늘 해야 할 일">
        <div className="rebirth-section-heading">
          <h2>
            오늘 챙길 일 <small>{pending.length}</small>
          </h2>
          <button onClick={() => onNavigate('tasks')}>
            전체 보기 <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <nav className="home-school-shortcuts rebirth-task-tabs" aria-label="학교 할 일 바로가기">
          {(
            [
              ['homework', '과제', ClipboardList],
              ['assessment', '수행평가', GraduationCap],
            ] as const
          ).map(([kind, label, Icon]) => {
            const count = state.tasks.filter(
              (t) =>
                (kind === 'assessment' ? t.kind === '수행평가' : t.kind !== '수행평가') &&
                (t.status !== 'done' || needsSubmission(t)),
            ).length;
            return (
              <button key={kind} onClick={() => onTasks(kind)}>
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
                <small>{count}</small>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            );
          })}
        </nav>
        {pending.length ? (
          <div className="rebirth-task-list">
            {pending.slice(0, 3).map((task) => (
              <button className="rebirth-task" key={task.id} onClick={() => onEdit(task)}>
                <span
                  className={'rebirth-task-marker ' + (task.status === 'doing' ? 'is-doing' : '')}
                  aria-hidden="true"
                />
                <span className="rebirth-task-copy">
                  <small>
                    {task.subject}
                    <span>
                      {task.kind === '수행평가'
                        ? '수행평가'
                        : task.status === 'doing'
                          ? '진행 중'
                          : '과제'}
                    </span>
                  </small>
                  <strong>{task.title}</strong>
                  <span className="rebirth-deadline">
                    {task.due || task.deadline ? formatTaskDeadline(task) : '마감일 미등록'}
                  </span>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rebirth-empty">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>
                {state.tasks.length
                  ? '등록한 공부를 모두 마쳤어요.'
                  : '아직 등록한 할 일이 없어요.'}
              </strong>
              <p>
                {state.tasks.length
                  ? '완료와 제출을 각각 확인해 주세요.'
                  : '위에서 과제를 담아 두면, 여기서 함께 챙겨요.'}
              </p>
            </div>
          </div>
        )}
        {awaiting.length > 0 && (
          <button className="study-submission rebirth-submission" onClick={onSubmissions}>
            <span>
              <i aria-hidden="true" />
              제출 확인 {awaiting.length}개 남았어요
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        )}
      </section>
      <aside className="rebirth-day" aria-label="나의 하루">
        <CalendarPeek state={state} now={now} onOpen={onCalendar} selectedDay={props.calendarDay} />
        <section className="rebirth-schedule" aria-label="다음 일정">
          <div className="rebirth-section-heading">
            <h2>
              {appointment === current && appointment
                ? now < appointment.classStart
                  ? '이동 · 준비'
                  : '지금 일정'
                : '다음 일정'}
            </h2>
            <button onClick={() => onNavigate('school')} aria-label="시간표 보기">
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="rebirth-schedule-content">
            <Clock3 size={18} aria-hidden="true" />
            <div>
              <h3>{appointment?.title || '예정된 수업이 없어요'}</h3>
              <p>
                {appointment
                  ? `${clock(appointment.classStart)}–${clock(appointment.end)}${dayKey(appointment.start) !== today ? ' · ' + dayKey(appointment.start) : ''}`
                  : '학교 · 학원 시간표를 등록해 보세요.'}
              </p>
            </div>
          </div>
          {following && (
            <p className="rebirth-following">
              다음 · {following.title} {clock(following.classStart)}
            </p>
          )}
        </section>
        <section className="rebirth-progress" aria-label="오늘의 학습 기록">
          <div className="rebirth-section-heading">
            <h2>쌓여 가는 오늘</h2>
            <button onClick={() => onNavigate('progress')} aria-label="오늘 기록 보기">
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
          <dl>
            <div>
              <dt>학습 세션</dt>
              <dd>{sessions}</dd>
            </div>
            <div>
              <dt>첫 시도</dt>
              <dd>{attempts}</dd>
            </div>
            <div>
              <dt>완료 과제</dt>
              <dd>{completed}</dd>
            </div>
          </dl>
          <p>첫 시도는 직접 기록한 횟수예요.</p>
          <button className="rebirth-time" onClick={() => onNavigate('progress')}>
            저장한 공부 시간{' '}
            <span>
              {minutes}분 <ChevronRight size={14} aria-hidden="true" />
            </span>
          </button>
        </section>
      </aside>
      {(resource || recent) && (
        <button
          className="rebirth-recent"
          onClick={() => (resource ? onResource(resource.id) : onNavigate('progress'))}
        >
          <BookOpen size={20} aria-hidden="true" />
          <span>
            <small>{resource ? '최근 자료 이어 풀기' : '최근 공부 기록 보기'}</small>
            <strong>{resource?.title || `${recent!.subject} · ${recent!.action}`}</strong>
          </span>
          <ArrowUpRight size={19} aria-hidden="true" />
        </button>
      )}
      <button className="rebirth-garage" onClick={() => onNavigate('garage')}>
        <CarFront size={18} aria-hidden="true" />
        <span>공부로 채워 가는 나의 차</span>
        <span>
          GARAGE <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
