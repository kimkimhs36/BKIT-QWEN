import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  ChevronRight,
  Clock3,
  FileText,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { State, Task } from './model';
import type { Fixed } from './engine';
import { clock, dayKey } from './time';
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
  timer: ReactNode;
  onStart: (id?: string) => void;
  onQuick: (minutes?: number) => void;
  onNavigate: (route: string) => void;
  onAdd: () => void;
  onAssessment: () => void;
  onMaterials: () => void;
  onEdit: (task: Task) => void;
  onSubmissions: () => void;
  onResource: (id: string) => void;
};
export function PremiumHome({
  state,
  now,
  tasks,
  next,
  current,
  resource,
  timer,
  onStart,
  onQuick,
  onNavigate,
  onAdd,
  onAssessment,
  onMaterials,
  onEdit,
  onSubmissions,
  onResource,
}: Props) {
  const pending = tasks.filter((t) => t.status !== 'done'),
    awaiting = state.tasks.filter(needsSubmission),
    recent = state.sessions.at(-1),
    active = state.active,
    quick = state.quickTimer,
    busy = !!active || !!quick;
  const minutes = Math.floor(studySeconds(state.sessions, dayKey(now)) / 60),
    todayDone = state.tasks.filter(
      (t) => t.completedAt && dayKey(t.completedAt) === dayKey(now),
    ).length;
  const activeSeconds = active ? elapsed(active, now) : quick ? quickSeconds(quick, now) : 0;
  return (
    <div className="study-home">
      <section className="study-start" aria-label="바로 공부 시작">
        <div className="study-start-meta">
          <span>
            <i /> YOUR STUDY SPACE
          </span>
          <span>{busy ? '공부의 흐름을 이어가요' : '작게 시작해도 충분해요'}</span>
        </div>
        <div className="study-start-copy">
          <span className="study-kicker">
            {busy ? active?.subject || '나의 집중 시간' : '지금, 한 가지에 집중'}
          </span>
          <h2>{busy ? '좋은 흐름을\n이어가세요.' : '시작하면,\n몰입은 따라와요.'}</h2>
          <p>
            {busy
              ? active?.action || '타이머가 공부 시간을 차곡차곡 기록하고 있어요.'
              : pending[0]
                ? `${pending[0].subject} · ${pending[0].title}`
                : '과목을 고르지 않아도 괜찮아요. 지금 시작해 보세요.'}
          </p>
        </div>
        <div className="study-start-actions">
          <button
            className="study-start-primary"
            onClick={() => (busy ? onNavigate('study') : onQuick())}
          >
            <Play size={17} fill="currentColor" />
            {busy ? '공부 이어가기' : '지금 공부 시작'}
            <ArrowRight size={18} />
          </button>
          {!busy && (
            <button className="study-start-five" onClick={() => onQuick(5)}>
              5분만 시작하기 <ArrowUpRight size={16} />
            </button>
          )}
        </div>
        <div className="study-start-foot">
          <Clock3 size={14} />
          <span>
            {busy
              ? `${quickClock(activeSeconds)} · ${active?.segmentStart || quick?.segmentStart ? '집중 중' : '잠시 멈춤'}`
              : '설정 없이 바로 시작 · 끝나면 시간 저장'}
          </span>
        </div>
        <div className="study-arc" aria-hidden="true">
          <span />
          <span />
          <span />
          <div>
            {busy ? 'FOCUS' : 'A LITTLE'}
            <b>{busy ? '지금' : '매일'}</b>
            {busy ? 'AT YOUR PACE' : 'GOES A LONG WAY'}
          </div>
        </div>
      </section>
      <section className="study-agenda" aria-label="오늘 해야 할 일">
        <div className="study-section-heading">
          <div>
            <span className="study-kicker">TODAY’S PRIORITIES</span>
            <h2>
              오늘의 할 일 <span>{pending.length}</span>
            </h2>
          </div>
          <button className="study-icon" onClick={onAdd} aria-label="오늘 과제 추가">
            <Plus size={20} />
          </button>
        </div>
        {pending.length ? (
          <div className="study-task-list">
            {pending.slice(0, 3).map((task, i) => (
              <div className="study-task" key={task.id}>
                <span className="study-task-index">{String(i + 1).padStart(2, '0')}</span>
                <button className="study-task-copy" onClick={() => onEdit(task)}>
                  <small>
                    {task.subject}
                    <span>{task.due ? formatTaskDeadline(task) : `${task.remaining}분 예상`}</span>
                  </small>
                  <strong>{task.title}</strong>
                </button>
                <button
                  className="study-icon"
                  aria-label={`${task.title} 5분 시작`}
                  onClick={() => onStart(task.id)}
                >
                  <ArrowUpRight size={20} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="study-agenda-empty">
            <CheckCheck size={25} />
            <h3>가벼운 마음으로 시작해요.</h3>
            <p>오늘 해야 할 숙제나 공부를 적어 두세요.</p>
            <button onClick={onAdd}>
              첫 할 일 추가 <Plus size={15} />
            </button>
          </div>
        )}
        <button
          className={'study-submission ' + (awaiting.length ? 'has-pending' : '')}
          onClick={onSubmissions}
        >
          <CheckCheck size={17} />
          <span>
            제출 확인 {awaiting.length ? `${awaiting.length}개 남았어요` : '모두 확인했어요'}
          </span>
          <ChevronRight size={16} />
        </button>
        <button className="study-assessment-add" onClick={onAssessment}>
          <Plus size={14} /> 수행 등록
        </button>
        <button className="study-text-link" onClick={() => onNavigate('tasks')}>
          할 일 전체 보기 <ArrowRight size={15} />
        </button>
      </section>
      <section className="study-next" aria-label="다음 일정">
        <span className="study-small-icon">
          <Clock3 size={20} />
        </span>
        <div>
          <span className="study-kicker">{current ? '지금 일정' : '다음 일정'}</span>
          <h3>{(current || next)?.title || '아직 예정된 일정이 없어요'}</h3>
          <p>
            {current
              ? `${clock(current.start)}–${clock(current.end)} · 진행 중`
              : next
                ? `${clock(next.start)}–${clock(next.end)}${dayKey(next.start) !== dayKey(now) ? ' · ' + dayKey(next.start) : ''}`
                : '학교·학원 시간을 등록해 두세요.'}
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
      <section className="study-recent" aria-label="최근 공부 이어하기">
        <span className="study-small-icon">
          <BookOpen size={20} />
        </span>
        <div>
          <span className="study-kicker">{resource ? '마지막 자료 이어서' : '최근 공부'}</span>
          <h3>
            {resource?.title ||
              (recent ? `${recent.subject} · ${recent.action}` : '다음 공부는 여기에서 이어가요')}
          </h3>
          <p>
            {resource
              ? '마지막으로 풀던 위치가 저장돼 있어요.'
              : recent
                ? `${Math.floor(recent.seconds / 60)}분 공부 · ${dayKey(recent.ended)}`
                : '공부를 마치면 최근 기록이 나타나요.'}
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
      {(quick || recent?.quick) && (
        <div className="study-home-timer">
          {quick ? (
            timer
          ) : (
            <details>
              <summary>
                최근 타이머 기록 정리 <ChevronRight size={16} />
              </summary>
              {timer}
            </details>
          )}
        </div>
      )}
      <div className="study-bottom-line">
        <button className="study-day-summary" onClick={() => onNavigate('progress')}>
          <span className="study-kicker">오늘 쌓인 시간</span>
          <strong>
            <motion.span
              key={minutes}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              {minutes}
            </motion.span>
            <small>분</small>
          </strong>
          <span>
            완료한 과제 {todayDone}개 <ArrowUpRight size={14} />
          </span>
        </button>
        <section className="study-tool-shelf" aria-label="학습 도구">
          <span className="study-kicker">필요할 때, 가까이에</span>
          <div>
            <button onClick={onMaterials}>
              <FileText size={18} />
              <span>자료 추가</span>
              <ArrowUpRight size={14} />
            </button>
            <button onClick={() => onNavigate('sites')}>
              <BookOpen size={18} />
              <span>공부 사이트</span>
              <ArrowUpRight size={14} />
            </button>
            <button onClick={() => onNavigate('ai-zone')}>
              <Sparkles size={18} />
              <span>AI ZONE</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
