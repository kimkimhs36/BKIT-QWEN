import type { GarageController } from './useGarage';
import { Car } from './Car';
import { quickClock } from '../quickTimer';
import type { State } from '../model';
import { learning, resourceProblems, isCompleted } from '../learningEngine';
import './drive.css';
export function DriveSwitch({ controller }: { controller: GarageController }) {
  return (
    <div className="drive-switch" role="group" aria-label="집중 화면 선택">
      <button
        aria-pressed={controller.garage.display === 'classic'}
        onClick={() => controller.update((g) => ({ ...g, display: 'classic' }))}
      >
        기본 타이머
      </button>
      <button
        aria-pressed={controller.garage.display === 'drive'}
        onClick={() => controller.update((g) => ({ ...g, display: 'drive' }))}
      >
        DRIVE MODE
      </button>
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
  const data = state ? learning(state) : null;
  const problems =
    data && state?.active?.resourceId ? resourceProblems(data, state.active.resourceId) : [];
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
          <small>ELAPSED / 경과</small>
          <strong role="timer" aria-label="DRIVE 경과 시간">
            {quickClock(seconds)}
          </strong>
          <span>{stopwatch ? '스톱워치' : `${target} MIN ROUTE`}</span>
        </div>
        <div className="drive-dial drive-dial-secondary">
          <small>REMAINING / 남은 시간</small>
          <strong>{stopwatch ? '—' : quickClock(remaining)}</strong>
          <span>
            {stopwatch
              ? '목표 제한 없음'
              : remaining === 0
                ? '목표에 도착했어요'
                : '천천히, 끝까지'}
          </span>
        </div>
      </div>
      <div className={'drive-road scene-' + g.car.scene} aria-hidden="true">
        <div
          className={running ? 'drive-car cruising' : 'drive-car'}
          style={{ left: `${p * 72}%` }}
        >
          <Car car={g.car} />
        </div>
        <div className="drive-road-line" />
      </div>
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
      {problems.length > 0 && data && (
        <div className="drive-problems" aria-label="문제별 자동차 진행">
          {problems.map((problem) => {
            const done = isCompleted(data, problem.id);
            const current =
              problem.id ===
              state?.learning?.resources.find((r) => r.id === problem.resourceId)?.currentProblemId;
            return (
              <div className={'drive-problem ' + (current ? 'current' : '')} key={problem.id}>
                <span>
                  {problem.ordinal}번 {done ? '· 확인 완료' : current ? '· 현재 문제' : '· 대기'}
                </span>
                <div className="drive-mini-road">
                  <div style={{ marginLeft: done ? 'calc(100% - 42px)' : '0' }}>
                    <Car car={g.car} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <details className="drive-options">
        <summary>모션 설정</summary>
        <label>
          <input
            type="checkbox"
            checked={g.reduceMotion}
            onChange={(e) => controller.update((v) => ({ ...v, reduceMotion: e.target.checked }))}
          />{' '}
          모션 감소
        </label>
        <label>
          <input
            type="checkbox"
            checked={g.hideAnimations}
            onChange={(e) => controller.update((v) => ({ ...v, hideAnimations: e.target.checked }))}
          />{' '}
          애니메이션 숨기기
        </label>
      </details>
      {controller.error && <p role="alert">{controller.error}</p>}
    </section>
  );
}
