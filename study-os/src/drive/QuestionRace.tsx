import { useDriveMotion } from './useDriveMotion';
import { useEffect } from 'react';
import type { State } from '../model';
import type { LearningProblem } from '../learningModel';
import type { GarageController } from './useGarage';
import { moveProblem, learning, isCompleted } from '../learningEngine';
import { questionSeconds } from './questionPace';
import { quickClock } from '../quickTimer';
import { Car } from './Car';

export function QuestionRace({
  state,
  controller,
  totalSeconds,
  problem,
  onChange,
  onNext,
}: {
  state: State;
  controller: GarageController;
  totalSeconds: number;
  problem: LearningProblem;
  onChange: (fn: (s: State) => State) => boolean;
  onNext?: () => void;
}) {
  const a = state.active;
  const quiet = useDriveMotion(controller.garage);
  useEffect(() => {
    if (a && a.questionPace?.current !== problem.id)
      onChange((s) => moveProblem(s, problem.resourceId, problem.id));
  }, [a?.id, a?.questionPace?.current, problem.id]);
  if (!a) return null;
  const pace = a.questionPace;
  const seconds = questionSeconds(a, problem.id, totalSeconds);
  const target = pace?.target ?? 240;
  const reached = seconds >= target;
  const marked = pace?.review.includes(problem.id) ?? false;
  const done = isCompleted(learning(state), problem.id);
  const g = controller.garage;
  const visible = g.display !== 'classic';
  const cinematic = g.display === 'drive';
  return (
    <section
      className="tohesar question-race"
      aria-label="문제별 시간 진행"
      data-motion={quiet || !a.segmentStart ? 'none' : 'auto'}
    >
      <div className="question-race-heading">
        <strong>
          {problem.ordinal}번 · {done ? '풀이 확인' : marked ? '검토 예정' : '풀이 중'}
        </strong>
        <span role="timer" aria-label="현재 문제 경과 시간">
          {quickClock(seconds)}
        </span>
        <span>
          / 목표 {quickClock(target)} · {a.segmentStart ? '측정 중' : '일시정지'}
        </span>
      </div>
      {visible && (
        <div className={'question-track ' + (cinematic ? 'cinematic scene-' + g.car.scene : '')}>
          <div
            className={a.segmentStart && cinematic ? 'question-car cruising' : 'question-car'}
            style={{
              left: `calc(${Math.min(1, seconds / target) * 100}% - ${Math.min(1, seconds / target) * (cinematic ? 110 : 48)}px)`,
            }}
          >
            <Car car={g.car} />
          </div>
          <span className="question-finish" aria-hidden="true">
            ▥
          </span>
        </div>
      )}
      <progress
        value={Math.min(seconds, target)}
        max={target}
        aria-label="현재 문제 목표 시간 진행"
      />
      {reached && !done && (
        <p>목표 시간에 도착했어요. 실패가 아니에요. 계속 풀거나 검토 표시 후 이동하세요.</p>
      )}
      <details>
        <summary>문제 페이스·검토</summary>
        <label>
          문제 목표 시간{' '}
          <select
            value={target}
            onChange={(e) => {
              const value = Number(e.currentTarget.value);
              onChange((s) =>
                s.active?.questionPace
                  ? {
                      ...s,
                      active: {
                        ...s.active,
                        questionPace: { ...s.active.questionPace, target: value },
                      },
                    }
                  : s,
              );
            }}
          >
            {[60, 120, 180, 240, 300, 600].map((n) => (
              <option key={n} value={n}>
                {n / 60}분
              </option>
            ))}
          </select>
        </label>
        <button
          aria-pressed={marked}
          onClick={() =>
            onChange((s) => {
              if (!s.active?.questionPace) return s;
              const p = s.active.questionPace;
              return {
                ...s,
                active: {
                  ...s.active,
                  questionPace: {
                    ...p,
                    review: p.review.includes(problem.id)
                      ? p.review.filter((id) => id !== problem.id)
                      : [...p.review, problem.id],
                  },
                },
              };
            })
          }
        >
          {marked ? '검토 표시 해제' : '나중에 검토 표시'}
        </button>
        {onNext && <button onClick={onNext}>풀이를 유지하고 넘어가기</button>}
        <p>시간 진행과 풀이 완료는 별개예요. 목표를 넘어도 타이머는 계속 측정해요.</p>
      </details>
    </section>
  );
}
