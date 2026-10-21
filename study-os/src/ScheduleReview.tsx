import { useMemo, useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import type { State, Block } from './model';
import { scheduleImpact } from './calendar';
import type { Fixed } from './engine';
import { clock, dayKey } from './time';
export function ScheduleReview({
  state,
  description,
  referenceDay,
  extraFixed,
  onApply,
  onBack,
}: {
  state: State;
  description: string;
  referenceDay: string;
  extraFixed: Pick<Fixed, 'start' | 'end'>[];
  onApply: (plan: Block[] | null) => void;
  onBack: () => void;
}) {
  const [replan, setReplan] = useState(false);
  const impact = useMemo(
    () => scheduleImpact(state, Date.now(), extraFixed, referenceDay),
    [state, extraFixed, referenceDay],
  );
  const blocks = impact.proposal.decisions.flatMap((d) => d.blocks);
  return (
    <div className="schedule-review">
      <div className="schedule-review-title">
        <ShieldCheck size={24} />
        <div>
          <h3>변경 후의 하루를 확인하세요.</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="schedule-impact-stats">
        <span>
          <b>{impact.affected.length}</b>영향받는 공부 구간
        </span>
        <span>
          <b>{impact.conflicts.length}</b>고정 일정 충돌
        </span>
        <span>
          <b>{blocks.length}</b>대안 공부 구간
        </span>
      </div>
      {!!impact.conflicts.length && (
        <div role="status" className="warning">
          <strong>시간이 겹치는 일정</strong>
          {impact.conflicts.slice(0, 6).map((x) => (
            <p key={x}>{x}</p>
          ))}
          {impact.conflicts.length > 6 && (
            <p>외 {impact.conflicts.length - 6}건 · 시간표에서 확인하세요.</p>
          )}
        </div>
      )}
      {!!impact.affected.length && (
        <p className="hint">
          새 일정과 겹치는 공부 계획이 있어요. 직접 고정한 공부 시간은 자동으로 옮기지 않아요.
        </p>
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={replan}
          disabled={!!impact.errors.length}
          onChange={(e) => setReplan(e.target.checked)}
        />
        제안된 공부 계획도 함께 적용
      </label>
      {!!impact.errors.length && (
        <p className="hint">
          공부 계획 자동 적용을 보류했어요: {impact.errors.join(' ')} 일정만 저장한 뒤 고정한 계획을
          직접 수정하세요.
        </p>
      )}
      <details open={replan}>
        <summary>공부 계획 변경 미리보기</summary>
        <div className="schedule-plan-preview">
          {impact.proposal.decisions.map((d) => {
            const task = state.tasks.find((t) => t.id === d.taskId),
              before = state.plan.filter(
                (b) => b.taskId === d.taskId && +new Date(b.end) > Date.now(),
              );
            return (
              <div key={d.taskId}>
                <strong>{task?.title}</strong>
                <p>
                  {before.length
                    ? before.map((b) => `${dayKey(b.start).slice(5)} ${clock(b.start)}`).join(', ')
                    : '배치 전'}
                  <ArrowRight size={13} />
                  {d.blocks.length
                    ? d.blocks
                        .map((b) => `${dayKey(b.start).slice(5)} ${clock(b.start)}–${clock(b.end)}`)
                        .join(', ')
                    : '배치 보류'}
                </p>
                <small>{d.reason}</small>
              </div>
            );
          })}
          {!impact.proposal.decisions.length && <p>배치할 과제가 없어요.</p>}
        </div>
      </details>
      <p className="schedule-protection">
        <Check size={14} />
        수면 · 식사 · 이동 · 준비 시간을 보호해 계산합니다.
      </p>
      <div className="modal-actions">
        <button type="button" onClick={onBack}>
          돌아가기
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => onApply(replan && !impact.errors.length ? blocks : null)}
        >
          확인 후 적용
        </button>
      </div>
    </div>
  );
}
