import { useMemo } from 'react';
import type { GarageController } from './useGarage';
import { Car } from './Car';
import { quickClock } from '../quickTimer';
import type { State } from '../model';
import { learning, resourceProblems } from '../learningEngine';
import './drive.css';
export function DriveSwitch({ controller }: { controller: GarageController }) {
  return (
    <div className="drive-switch" role="group" aria-label="집중 화면 선택">
      {(
        [
          ['classic', '기본 타이머'],
          ['mini', 'MINI'],
          ['dashboard', 'DASHBOARD'],
          ['drive', 'DRIVE MODE'],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          aria-pressed={controller.garage.display === id}
          onClick={() => controller.update((g) => ({ ...g, display: id }))}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
export function DriveDashboard({
  controller,
  seconds,
  target,
  running,
  stopwatch = false,
  state,
}: {
  controller: GarageController;
  seconds: number;
  target: number;
  running: boolean;
  stopwatch?: boolean;
  state?: State;
}) {
  const { garage: g } = controller;
  const p = Math.min(1, Math.max(0, seconds / Math.max(1, target * 60)));
  const remaining = Math.max(0, target * 60 - seconds);
  const summary = useMemo(() => {
    const data = state ? learning(state) : null;
    const all =
      data && state?.active?.resourceId ? resourceProblems(data, state.active.resourceId) : [];
    const ids = new Set(all.map((p) => p.id));
    const completed = new Set(
      data?.attempts
        .filter((a) => ids.has(a.problemId) && a.selfCheck !== 'unreviewed')
        .map((a) => a.problemId),
    );
    return { total: all.length, completed: completed.size, ordinal: all.find(p => p.id === state?.active?.questionPace?.current)?.ordinal }; 
  }, [state?.learning, state?.active?.resourceId]);
  return (
    <section
      className="tohesar drive-dashboard"
      aria-label="DRIVE 집중 계기판"
      data-motion={g.reduceMotion || g.hideAnimations ? 'none' : 'auto'}
    >
      <div className="drive-status">
        <span>BKIT / DRIVE 36</span>
        <span>{running ? 'CRUISING · 집중 중' : 'PARKED · 일시정지'}</span>
      </div>
      <div className="drive-dials">
        <div
          className="drive-dial"
          style={{ '--drive-angle': `${p * 270}deg` } as React.CSSProperties}
        >
          <Dial ratio={stopwatch ? (seconds % 60) / 60 : p} />
          <small>ELAPSED / 경과</small>
          <strong role="timer" aria-label="DRIVE 경과 시간">
            {quickClock(seconds)}
          </strong>
          <span>{stopwatch ? '스톱워치' : `${target} MIN ROUTE`}</span>
        </div>
        <div className="drive-dial drive-dial-secondary">
          <Dial ratio={stopwatch ? 0 : 1 - p} />
          <small>REMAINING / 남은 시간</small>
          <strong>{stopwatch ? '—' : quickClock(Math.ceil(remaining))}</strong>
          <span>
            {stopwatch
              ? '목표 제한 없음'
              : remaining === 0
                ? '목표에 도착했어요'
                : '천천히, 끝까지'}
          </span>
        </div>
      </div>
      {g.display === 'drive' && (
        <div className={'drive-road scene-' + g.car.scene} aria-hidden="true">
          <div
            className={running ? 'drive-car cruising' : 'drive-car'}
            style={{ left: `${p * 72}%` }}
          >
            <Car car={g.car} />
          </div>
          <div className="drive-road-line" />
        </div>
      )}
      {!stopwatch && (
        <>
          <progress
            value={Math.min(seconds, target * 60)}
            max={target * 60}
            aria-label="전체 모의고사·집중 시간 진행"
          />
          <p className="drive-route-label">
            전체 시간 {Math.floor(p * 100)}% · {target}분 코스
          </p>
        </>
      )}
      {state?.active && (
        <div className="drive-center">
          <strong>{state.active.subject}</strong>
          <span>{state.active.action}</span>
          {summary.total > 0 && (
            <small aria-label="문제별 자동차 진행">
              {summary.ordinal ? summary.ordinal + '번 · ' : ''}풀이 확인 {summary.completed} · 미완료 {summary.total - summary.completed} · 검토{' '}
              {state.active.questionPace?.review.length ?? 0}
            </small>
          )}
        </div>
      )}
      <details className="drive-options">
        <summary>모션 설정</summary>
        <label>
          <input
            type="checkbox"
            checked={g.reduceMotion}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              controller.update((v) => ({ ...v, reduceMotion: checked }));
            }}
          />{' '}
          모션 감소
        </label>
        <label>
          <input
            type="checkbox"
            checked={g.hideAnimations}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              controller.update((v) => ({ ...v, hideAnimations: checked }));
            }}
          />{' '}
          애니메이션 숨기기
        </label>
      </details>
      {controller.error && <p role="alert">{controller.error}</p>}
    </section>
  );
}

/** Original SVG instrument: calibrated ticks and a restrained, readable needle. */
function Dial({ ratio }: { ratio: number }) {
  return (
    <svg className="drive-calibration" viewBox="0 0 200 200" aria-hidden="true">
      {Array.from({ length: 37 }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1="15"
          x2="100"
          y2={i % 3 === 0 ? 26 : 20}
          transform={`rotate(${-135 + i * 7.5} 100 100)`}
          stroke="currentColor"
          opacity={i % 3 === 0 ? 0.7 : 0.3}
          strokeWidth={i % 3 === 0 ? 1.4 : 0.8}
        />
      ))}
      <g
        className="drive-needle"
        style={{ transform: `rotate(${-135 + Math.max(0, Math.min(1, ratio)) * 270}deg)` }}
      >
        <path d="M98 32h4l-1 17h-2Z" fill="currentColor" />
      </g>
    </svg>
  );
}
