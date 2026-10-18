import { ArrowUpRight, Clock3, LockKeyhole, Play } from 'lucide-react';
import type { Fixed } from './engine';
import type { State, Task } from './model';
import { clock } from './time';
import { canStartSprint, firstLearningAction, recommendationReason } from './now';
import { formatQuantity } from './capture';

type Props = {
  now: number;
  current: Fixed | undefined;
  nextFixed: Fixed | undefined;
  active: State['active'];
  seconds: number;
  tasks: Task[];
  recommended: Task | undefined;
  selection: string;
  onSelectionChange: (id: string) => void;
  onStart: (taskId: string | null) => void;
  onFocus: () => void;
  onSchedule: () => void;
  energy: 'low' | 'normal';
  onEnergyChange: (value: 'low' | 'normal') => void;
};

export function NowFocus({
  now,
  current,
  nextFixed,
  active,
  seconds,
  tasks,
  recommended,
  selection,
  onSelectionChange,
  onStart,
  onFocus,
  onSchedule,
  energy,
  onEnergyChange,
}: Props) {
  const ready = canStartSprint(now, Boolean(current), nextFixed?.start ?? null);
  const chosen =
    selection === '__free__'
      ? undefined
      : (tasks.find((task) => task.id === selection) ?? recommended);
  const secondsLeft = active ? Math.max(0, Math.ceil(active.target * 60 - seconds)) : 300;
  const progress = active ? Math.min(100, (seconds / (active.target * 60)) * 100) : 0;
  const stateLabel = active
    ? active.segmentStart
      ? '집중 중'
      : '일시정지'
    : current
      ? '일정 · 휴식 중'
      : ready
        ? '시작 가능'
        : '다음 일정 준비';
  const headline = active
    ? active.action
    : current
      ? current.kind === 'sleep'
        ? '지금은 충분히 쉬어갈 시간.'
        : current.title + ' 시간이에요.'
      : !ready
        ? '다음 일정까지, 잠시 준비해요.'
        : (chosen?.title ?? '5분만, 가볍게.');
  const explanation = active
    ? active.subject + ' · 타이머 기록 중'
    : current
      ? clock(current.end) + '까지 일정 보호 중'
      : !ready
        ? '곧 ' + (nextFixed?.title ?? '고정 일정') + '이 시작돼.'
        : chosen
          ? chosen.subject +
            (chosen.quantity ? ' · ' + formatQuantity(chosen.quantity) : '') +
            ' · 예상 ' +
            chosen.remaining +
            '분'
          : '과제 없이도 가볍게 시작해요.';

  return (
    <section className="now-action now-focus" aria-label="지금 할 일과 5분 집중">
      <div className="now-focus-top">
        <span className="now-focus-label">집중 시작</span>
        {(active || !ready) && (
          <span className="now-focus-status">
            <span className="now-focus-dot" aria-hidden="true" /> {stateLabel}
          </span>
        )}
      </div>
      <h2>{headline}</h2>
      <p className="now-focus-description">{explanation}</p>
      {!active && ready && (
        <div className="instant-action">
          <strong>{firstLearningAction(chosen, energy === 'low')}</strong>
          {chosen && <p>{recommendationReason(chosen, now)}</p>}
          <small>문제 번호와 자료 내용은 직접 확인해 주세요.</small>
        </div>
      )}
      {active ? (
        <div className="now-focus-running">
          <div className="now-focus-running-head">
            <span>{active.segmentStart ? '공부 중' : '일시정지 중'}</span>
            <strong>
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </strong>
          </div>
          <div
            className="now-focus-track"
            role="progressbar"
            aria-label="목표 집중 시간"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: progress + '%' }} />
          </div>
        </div>
      ) : ready ? (
        <div className="now-focus-ready">
          {tasks.length > 0 ? (
            <details className="now-task-options">
              <summary>과제 바꾸기</summary>
              <label className="now-focus-picker">
                <span>시작할 과제</span>
                <select
                  aria-label="시작할 과제"
                  value={selection}
                  onChange={(e) => onSelectionChange(e.target.value)}
                >
                  <option value="">추천 · {recommended?.title ?? '자율 학습'}</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.subject} · {task.title}
                    </option>
                  ))}
                  <option value="__free__">자율 학습 · 과제 연결 없음</option>
                </select>
              </label>
            </details>
          ) : null}
        </div>
      ) : (
        <div className="now-focus-guard">
          <LockKeyhole size={17} />
          <span>
            {current
              ? '보호된 일정이 끝난 뒤 시작할 수 있어요.'
              : nextFixed
                ? clock(nextFixed.start) + '부터 보호된 일정이에요.'
                : '지금 시작할 수 없습니다.'}
          </span>
        </div>
      )}
      <div className="command-actions now-focus-actions">
        {active ? (
          <button className="primary now-focus-primary" onClick={onFocus}>
            집중 화면으로 <ArrowUpRight size={17} />
          </button>
        ) : (
          <button
            className="primary now-focus-primary"
            disabled={!ready}
            onClick={() => onStart(chosen?.id ?? null)}
          >
            <Play size={17} fill="currentColor" />{' '}
            {chosen?.quantity?.remaining === 0 ? '완료·제출 확인' : '5분만 시작'}
          </button>
        )}
        {(current || !ready) && (
          <button className="text-button" onClick={onSchedule}>
            <Clock3 size={16} /> 일정 보기
          </button>
        )}
      </div>
      {!active && ready && !!chosen && (
        <details className="now-energy-options">
          <summary>오늘 에너지 (선택)</summary>
          <label className="now-focus-picker">
            <span>지금 에너지</span>
            <select
              aria-label="지금 에너지"
              value={energy}
              onChange={(e) => onEnergyChange(e.target.value as 'low' | 'normal')}
            >
              <option value="normal">괜찮아요</option>
              <option value="low">피곤해요 · 첫 단계만</option>
            </select>
          </label>
        </details>
      )}
    </section>
  );
}
