import { ArrowUpRight, Clock3, LockKeyhole, Play, Plus } from 'lucide-react';
import type { Fixed } from './engine';
import type { State, Task } from './model';
import { clock } from './time';
import { canStartSprint } from './now';

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
  onAddTask: () => void;
  onSchedule: () => void;
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
  onAddTask,
  onSchedule,
}: Props) {
  const ready = canStartSprint(now, Boolean(current), nextFixed?.start ?? null);
  const chosen =
    selection === '__free__'
      ? undefined
      : tasks.find((task) => task.id === selection) ?? recommended;
  const secondsLeft = active ? Math.max(0, Math.ceil(active.target * 60 - seconds)) : 300;
  const progress = active ? Math.min(100, (seconds / (active.target * 60)) * 100) : 0;
  const stateLabel = active
    ? active.segmentStart
      ? 'FOCUS IN PROGRESS'
      : 'FOCUS PAUSED'
    : current
      ? 'PROTECTED TIME'
      : ready
        ? 'READY FOR FIVE'
        : 'UPCOMING SCHEDULE';
  const headline = active
    ? active.action
    : current
      ? current.kind === 'sleep'
        ? '지금은 충분히 쉬어갈 시간.'
        : current.title + ' 시간이에요.'
      : !ready
        ? '다음 일정까지, 잠시 준비해요.'
        : chosen?.title ?? '첫 행동 하나, 지금.';
  const explanation = active
    ? active.subject + ' · 시작한 집중 기록이 유지되고 있어요.'
    : current
      ? clock(current.end) + '까지 보호된 시간입니다. 공부보다 이 일정을 먼저 지켜요.'
      : !ready
        ? '곧 ' + (nextFixed?.title ?? '고정 일정') + '이 시작됩니다. 5분 세션은 건너뛰어요.'
        : chosen
          ? chosen.subject + ' · 남은 ' + chosen.remaining + '분 중 첫 5분'
          : '과제가 없어도 자율 학습으로 시작할 수 있어요.';

  return (
    <section className="now-action now-focus" aria-label="지금 할 일과 5분 집중">
      <div className="section-number">
        01 <span>NOW / THE NEXT FIVE MINUTES</span>
      </div>
      <div className="now-focus-status">
        <span className="now-focus-dot" aria-hidden="true" />
        {stateLabel}
        <span className="now-focus-serial">BKIT / 05</span>
      </div>
      <h2>{headline}</h2>
      <p className="now-focus-description">{explanation}</p>
      {active ? (
        <div className="now-focus-running">
          <div className="now-focus-running-head">
            <span>{active.segmentStart ? '공부 중' : '일시정지 중'}</span>
            <strong>
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </strong>
          </div>
          <div className="now-focus-track" role="progressbar" aria-label="목표 집중 시간" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <span style={{ width: progress + '%' }} />
          </div>
        </div>
      ) : ready ? (
        <div className="now-focus-ready">
          {tasks.length > 0 ? (
            <label className="now-focus-picker">
              <span>지금 시작할 과제</span>
              <select value={selection} onChange={(e) => onSelectionChange(e.target.value)}>
                <option value="">추천 · {recommended?.title ?? '자율 학습'}</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.subject} · {task.title}
                  </option>
                ))}
                <option value="__free__">자율 학습 · 과제 연결 없음</option>
              </select>
            </label>
          ) : (
            <div className="now-focus-empty">등록된 과제가 없어요. 자율 학습으로 바로 시작합니다.</div>
          )}
          <div className="now-focus-steps" aria-label="첫 5분 행동">
            <span>01 / 자료 열기</span>
            <span>02 / 첫 문제 또는 첫 행동</span>
          </div>
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
            <Play size={17} fill="currentColor" /> 5분만 시작
          </button>
        )}
        <button
          className="text-button"
          onClick={current || !ready ? onSchedule : onAddTask}
        >
          {current || !ready ? (
            <>
              <Clock3 size={15} /> 일정 보기
            </>
          ) : (
            <>
              <Plus size={15} /> 과제 추가
            </>
          )}
        </button>
      </div>
    </section>
  );
}
