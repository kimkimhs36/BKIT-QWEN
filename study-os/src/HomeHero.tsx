import { ArrowRight, ChevronDown, Pause, Play } from 'lucide-react';
import type { State, Task } from './model';
import type { Fixed } from './engine';
import { clock } from './time';
import { quickClock, quickSeconds } from './quickTimer';
import { elapsed } from './session';
import { canStartSprint, firstLearningAction, recommendationReason } from './now';

type Props = {
  state: State;
  now: number;
  tasks: Task[];
  recommended?: Task;
  selection: string;
  current?: Fixed;
  nextProtected?: Fixed;
  onSelectionChange: (id: string) => void;
  onStart: (id?: string) => void;
  onQuick: (minutes?: number) => void;
  onNavigate: (route: string) => void;
};

/** Presentation only: the existing App start guard and store remain authoritative. */
export function HomeHero({
  state,
  now,
  tasks,
  recommended: task,
  selection,
  current,
  nextProtected,
  onSelectionChange,
  onStart,
  onQuick,
  onNavigate,
}: Props) {
  const active = state.active;
  const quick = state.quickTimer;
  const busy = !!active || !!quick;
  const running = !!(active?.segmentStart || quick?.segmentStart);
  const ready = canStartSprint(now, !!current, nextProtected?.start ?? null);
  const actionable = tasks.filter((t) => t.status !== 'done' && t.quantity?.remaining !== 0);
  const completed =
    !task && state.tasks.length > 0 && state.tasks.every((t) => t.status === 'done');
  const seconds = active ? elapsed(active, now) : quick ? quickSeconds(quick, now) : 0;
  const step = active?.learningStep || quick?.learningStep;
  const hasAttempt =
    busy &&
    state.learningEvents?.some(
      (event) =>
        event.type === 'FirstLearningAttempt' && event.sessionId === (active?.id || quick?.id),
    );
  const title = busy
    ? state.tasks.find((t) => t.id === active?.taskId)?.title || active?.action || '나의 자유 학습'
    : task?.title || (completed ? '한 가지를 마쳤어요.' : '가볍게, 5분부터.');
  const action = busy
    ? step?.next === 'retry'
      ? '해설을 가리고, 방금 문제를 다시 풀어 보세요.'
      : step?.next === 'concept'
        ? '막힌 개념을 내 말로 한 줄 정리해 보세요.'
        : step?.next === 'continue'
          ? '다음 질문 하나를 골라, 내 답을 적어 보세요.'
          : active?.action || firstLearningAction()
    : ready
      ? firstLearningAction(task)
      : current
        ? `${current.title} · ${clock(current.end)}까지 일정을 지켜요.`
        : `${clock(nextProtected!.start)} ${nextProtected!.title} 전에 자료를 준비해요.`;
  return (
    <section
      className="study-start rebirth-hero"
      aria-label="바로 공부 시작"
      data-state={
        busy
          ? running
            ? 'active'
            : 'paused'
          : !ready
            ? 'protected'
            : task
              ? 'ready'
              : completed
                ? 'completed'
                : 'empty'
      }
    >
      <div className="rebirth-hero-top">
        <span className="rebirth-state">
          <i aria-hidden="true" />
          {busy
            ? running
              ? '공부 중'
              : '일시정지 중'
            : !ready
              ? '일정을 지키는 시간'
              : task
                ? '오늘의 시작'
                : completed
                  ? '다음 걸음'
                  : '나의 첫 공부'}
        </span>
        <span className="rebirth-duration">
          {busy ? quickClock(seconds) : ready ? '5분으로 시작' : '일정 보호 중'}
        </span>
      </div>
      <div className="study-start-copy">
        <p className="rebirth-subject">
          {busy
            ? active?.subject || '자유 학습'
            : task
              ? `${task.subject} · ${task.kind === '수행평가' ? '수행평가' : '과제'}`
              : '내 자료로, 나의 속도로'}
        </p>
        <h2>{title}</h2>
        <p className="rebirth-context">
          {busy
            ? running
              ? '잠깐 돌아와도, 공부의 흐름은 그대로예요.'
              : '멈춘 지점에서 다시 이어갈 수 있어요.'
            : task
              ? recommendationReason(task, now)
              : completed
                ? '제출할 것이 남았는지 확인하고, 내 공부를 이어가요.'
                : '준비가 완벽하지 않아도 괜찮아요. 질문 하나만 골라요.'}
        </p>
      </div>
      <div className="study-start-next" aria-label="첫 학습 행동">
        <span className="rebirth-step-index" aria-hidden="true">
          {busy && !running ? <Pause size={18} /> : '01'}
        </span>
        <div>
          <span>
            {!ready && !busy
              ? '지금 할 수 있는 일'
              : hasAttempt
                ? '이어서 할 행동'
                : '지금 할 첫 행동'}
          </span>
          <strong>{action}</strong>
        </div>
      </div>
      <div className="rebirth-hero-bottom">
        <button
          className="study-start-primary"
          onClick={() =>
            busy
              ? onNavigate('study')
              : !ready
                ? onNavigate('school')
                : task
                  ? onStart(task.id)
                  : onQuick(5)
          }
        >
          <Play size={16} fill="currentColor" aria-hidden="true" />
          <span>{busy ? '공부 이어가기' : ready ? '지금 공부 시작' : '시간표 확인하기'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        {!busy && ready && actionable.length > 0 && (
          <details className="home-task-choice">
            <summary>
              과제 바꾸기 <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <label>
              <span>지금 공부할 과제</span>
              <select
                aria-label="지금 공부할 과제"
                value={selection}
                onChange={(event) => onSelectionChange(event.target.value)}
              >
                <option value="">추천 과제</option>
                {actionable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subject} · {t.title}
                  </option>
                ))}
                <option value="__free__">자율 학습 · 과제 연결 없음</option>
              </select>
            </label>
            <small>선택한 과제로 5분 학습을 시작해요.</small>
          </details>
        )}
      </div>
    </section>
  );
}
