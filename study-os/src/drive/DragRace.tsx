import { useEffect, useRef, useState } from 'react';
import { Car } from './Car';
import type { GarageState } from './garage';
import { newRace, stageRace, launchRace, tickRace, shiftRace, revs } from './race';
import './drive.css';
const messages = {
  finish: '200m 완주',
  'false-start': '조금 빨랐어요 · 신호 후 출발',
  'late-start': '출발 신호를 놓쳤어요',
  timeout: '이번 주행 종료 · 다음에는 변속도 함께',
  interrupted: '화면 전환으로 주행을 안전하게 종료했어요',
};
export function DragRace({
  garage,
  until,
  onReturn,
}: {
  garage: GarageState;
  until: number;
  onReturn: () => void;
}) {
  const [race, setRace] = useState(newRace);
  const live = useRef(race);
  live.current = race;
  const throttle = useRef(false);
  const [now, setNow] = useState(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const returnRef = useRef(onReturn);
  returnRef.current = onReturn;
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(m.matches);
    m.addEventListener('change', changed);
    return () => m.removeEventListener('change', changed);
  }, []);
  const quiet = garage.reduceMotion || garage.hideAnimations || reduced;
  function change(fn: (r: typeof race) => typeof race) {
    const next = fn(live.current);
    live.current = next;
    setRace(next);
  }
  function launch() {
    change((r) => launchRace(r, Date.now()));
  }
  function shift() {
    change(shiftRace);
  }
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const stop = () => {
      throttle.current = false;
    };
    const hidden = () => {
      stop();
      if (document.hidden)
        change((r) =>
          r.phase === 'racing' || r.phase === 'countdown'
            ? { ...r, phase: 'result', result: 'interrupted' }
            : r,
        );
    };
    const down = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        (live.current.phase === 'countdown' || live.current.phase === 'racing')
      ) {
        e.preventDefault();
        if (!e.repeat) {
          if (live.current.phase === 'countdown') launch();
          throttle.current = true;
        }
      }
      if (e.code === 'ArrowUp' && !e.repeat) {
        e.preventDefault();
        shift();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') stop();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      d?.close();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  useEffect(() => {
    // 30Hz gameplay, or 10Hz readout without movement. No work survives closing the game.
    const id = setInterval(
      () => {
        const time = Date.now();
        setNow(time);
        if (time >= until) {
          throttle.current = false;
          returnRef.current();
          return;
        }
        // Fixed physics substeps preserve the same tuning in reduced motion mode.
        change((r) => {
          let next = r;
          const start = r.lastAt;
          if (r.phase === 'racing' && time - start <= 1000) {
            for (let t = start + Math.min(50, time - start); t < time; t += 50)
              next = tickRace(next, t, throttle.current, garage.car.tune);
          }
          return tickRace(next, time, throttle.current, garage.car.tune);
        });
      },
      race.phase === 'racing' ? (quiet ? 100 : 33) : 250,
    );
    return () => clearInterval(id);
  }, [until, garage.car.tune, quiet, race.phase]);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <dialog
      ref={dialog}
      className="tohesar race-dialog"
      aria-labelledby="race-title"
      onCancel={(e) => {
        e.preventDefault();
        onReturn();
      }}
      data-motion={quiet ? 'none' : 'auto'}
    >
      <header className="race-heading">
        <div>
          <span className="eyebrow">INTERMISSION / 200 M</span>
          <h2 id="race-title">DRAG RACE</h2>
        </div>
        <button onClick={onReturn}>학습으로 돌아가기 ↗</button>
      </header>
      <p className="race-break" role="timer" aria-label="남은 휴식 시간">
        휴식 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} · 종료하면 원래 학습
        위치로 돌아가요
      </p>
      <div className={'race-track scene-' + garage.car.scene}>
        <div className="race-lane" />
        <div className="race-finish" />
        <div
          className={'race-vehicle ' + (race.phase === 'racing' ? 'cruising' : '')}
          style={{ transform: quiet ? 'none' : `translateX(${(race.distance / 200) * 190}%)` }}
        >
          <Car car={garage.car} />
        </div>
        <span className="race-distance">{Math.floor(race.distance)} / 200 m</span>
      </div>
      <div className="race-instruments">
        <div>
          <small>SPEED</small>
          <strong>
            {Math.round(race.speed * 3.6)} <span>km/h</span>
          </strong>
        </div>
        <div>
          <small>GEAR</small>
          <strong>
            {race.gear} <span>/ 5</span>
          </strong>
        </div>
        <div>
          <small>TIME</small>
          <strong>
            {race.elapsed.toFixed(2)} <span>s</span>
          </strong>
        </div>
      </div>
      {race.phase === 'ready' && (
        <div className="race-intro">
          <p>
            차고의 자동차로 잠깐 달려요. 3초 뒤 출발 신호에 맞춰 출발하고, 가속을 누른 채
            변속하세요.
          </p>
          <button className="primary" onClick={() => change(() => stageRace(Date.now()))}>
            출발 준비
          </button>
        </div>
      )}
      {race.phase === 'countdown' && (
        <div className="race-start">
          <p role="status">
            {now < race.goAt
              ? `${Math.ceil((race.goAt - now) / 1000)} · 신호를 기다려요`
              : 'GO · 지금 출발!'}
          </p>
          <button className="primary" onClick={launch}>
            출발
          </button>
        </div>
      )}
      {race.phase === 'racing' && (
        <>
          <label className="race-revs">
            변속 구간 · 72–94%
            <meter value={revs(race)} min={0} max={1.1} low={0.72} high={0.94} optimum={0.84} />
          </label>
          <div className="race-controls">
            <button
              className="race-throttle"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                throttle.current = true;
              }}
              onPointerUp={() => {
                throttle.current = false;
              }}
              onPointerCancel={() => {
                throttle.current = false;
              }}
              onLostPointerCapture={() => {
                throttle.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  throttle.current = true;
                }
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter') throttle.current = false;
              }}
            >
              가속 · 누르고 있기
            </button>
            <button onClick={shift} disabled={race.gear >= 5}>
              기어 ↑ 변속
            </button>
          </div>
          <p className="race-help">키보드: Space 가속 · ↑ 변속 · {garage.car.tune.toUpperCase()}</p>
        </>
      )}
      {race.phase === 'result' && (
        <section className="race-result" aria-label="레이스 결과">
          <span className="eyebrow">FINISH / NO CREDIT REWARD</span>
          <h3>{messages[race.result!]}</h3>
          <p>
            반응 {race.reaction === null ? '—' : race.reaction.toFixed(3) + 's'} · 주행{' '}
            {race.elapsed.toFixed(2)}s · 좋은 변속 {race.perfect}/{race.shifts}
          </p>
          <p>레이스는 학습 기록과 크레딧에 영향을 주지 않아요.</p>
          <div className="garage-actions">
            <button className="primary" onClick={onReturn}>
              학습으로 복귀
            </button>
            <button
              onClick={() => {
                throttle.current = false;
                change(newRace);
              }}
            >
              다시 달리기 · 남은 휴식 안에서
            </button>
          </div>
        </section>
      )}
    </dialog>
  );
}
