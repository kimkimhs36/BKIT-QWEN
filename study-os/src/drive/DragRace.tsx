import { useEffect, useRef, useState } from 'react';
import { useDriveMotion } from './useDriveMotion';
import { Car } from './Car';
import { saveRaceRecord } from './garage';
import type { GarageController } from './useGarage';
import { newRace, stageRace, launchRace, tickRace, shiftRace, revs } from './race';
import './drive.css';
const messages = {
  finish: '완주했어요',
  'false-start': '조금 빨랐어요 · 신호 후 출발',
  'late-start': '출발 신호를 놓쳤어요',
  timeout: '이번 주행 종료 · 다음에는 변속도 함께',
  interrupted: '화면 전환으로 주행을 안전하게 종료했어요',
};
export function DragRace({
  controller,
  until,
  onReturn,
  onRoom,
}: {
  controller: GarageController;
  until: number;
  onReturn: () => void;
  onRoom?: () => void;
}) {
  const garage = controller.garage;
  const [race, setRace] = useState(() => newRace());
  const [recordMessage, setRecordMessage] = useState('');
  const live = useRef(race);
  live.current = race;
  const throttle = useRef(false);
  const [now, setNow] = useState(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const returnRef = useRef(onReturn);
  returnRef.current = onReturn;
  const quiet = useDriveMotion(garage);
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
  useEffect(() => {
    if (race.phase === 'result' && race.result === 'finish') {
      void controller
        .update((g) => saveRaceRecord(g, race, Date.now()))
        .then((ok) =>
          setRecordMessage(
            ok ? '레이스 기록 저장됨' : '기록을 저장하지 못했어요. 다시 저장할 수 있어요.',
          ),
        );
    }
  }, [race.phase, race.result]);
  const best = garage.raceRecords
    .filter((r) => r.distance === race.targetDistance)
    .sort((a, b) => a.elapsed - b.elapsed)[0];
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
          <span className="eyebrow">INTERMISSION / {race.targetDistance} M</span>
          <h2 id="race-title">DRAG RACE</h2>
        </div>
        <button onClick={onReturn}>학습으로 돌아가기 ↗</button>
      </header>
      <p className="race-break" role="timer" aria-label="남은 휴식 시간">
        휴식 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} · 종료하면 원래 학습
        위치로 돌아가요
      </p>
      {onRoom && <button onClick={onRoom}>INTERMISSION 공간 선택</button>}
      <div className={'race-track scene-' + garage.car.scene} data-racing={race.phase === 'racing'}>
        <div className="race-skyline" />
        <div className="race-lane" />
        <div className="race-finish" />
        <div
          className={'race-vehicle ' + (race.phase === 'racing' ? 'cruising' : '')}
          style={{
            transform: quiet
              ? 'none'
              : `translateX(${(race.distance / race.targetDistance) * 190}%)`,
          }}
        >
          <Car car={garage.car} />
        </div>
        <span className="race-distance">
          {Math.floor(race.distance)} / {race.targetDistance} m
        </span>
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
            {garage.car.name} · {garage.car.tune.toUpperCase()}
          </p>
          <label>
            레이스 거리
            <select
              value={race.targetDistance}
              onChange={(e) => change(() => newRace(Number(e.target.value) as 200 | 400))}
            >
              <option value="200">200m · 스프린트</option>
              <option value="400">400m · 쿼터</option>
            </select>
          </label>
          <p>
            {best
              ? `이 거리 최고 기록 ${best.elapsed.toFixed(3)}s`
              : '이 거리의 첫 기록을 만들어 보세요.'}
          </p>
          <p>
            차고의 자동차로 잠깐 달려요. 3초 뒤 출발 신호에 맞춰 출발하고, 가속을 누른 채
            변속하세요.
          </p>
          <button
            className="primary"
            onClick={() => change(() => stageRace(Date.now(), race.targetDistance))}
          >
            출발 준비
          </button>
        </div>
      )}
      {race.phase === 'countdown' && (
        <div className="race-start">
          <div className="race-lights" aria-hidden="true">
            {[2, 1, 0].map((n) => (
              <i key={n} data-lit={now >= race.goAt - (n + 1) * 1000} data-go={now >= race.goAt} />
            ))}
          </div>
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
            RPM {Math.round(revs(race) * 7000)} · 변속 구간 5,040–6,580
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
          {race.shiftLog.at(-1) && (
            <p className="race-shift-feedback" role="status">
              {race.shiftLog.at(-1)!.quality === 'perfect'
                ? '좋은 변속'
                : race.shiftLog.at(-1)!.quality === 'early'
                  ? '조금 이른 변속'
                  : '레드라인 · 다음에는 조금 일찍'}
            </p>
          )}
          <p className="race-help">키보드: Space 가속 · ↑ 변속 · {garage.car.tune.toUpperCase()}</p>
        </>
      )}
      {race.phase === 'result' && (
        <section className="race-result" aria-label="레이스 결과">
          <span className="eyebrow">FINISH / NO CREDIT REWARD</span>
          <h3>
            {race.result === 'finish' ? race.targetDistance + 'm 완주' : messages[race.result!]}
          </h3>
          <p>
            반응 {race.reaction === null ? '—' : race.reaction.toFixed(3) + 's'} · 주행{' '}
            {race.elapsed.toFixed(2)}s · 좋은 변속 {race.perfect}/{race.shifts}
          </p>
          <p>
            최고 속도 {(race.topSpeed * 3.6).toFixed(1)} km/h · 총 기록{' '}
            {(race.elapsed + (race.reaction ?? 0)).toFixed(3)}s
          </p>
          {best && (
            <p>
              {race.targetDistance}m 최고 기록 {best.elapsed.toFixed(3)}s
            </p>
          )}
          <details>
            <summary>변속 기록</summary>
            {race.shiftLog.map((s, i) => (
              <p key={i}>
                {s.gear}단 · {s.at.toFixed(2)}s · {Math.round(s.rpm * 7000)} RPM · {s.quality}
              </p>
            ))}
          </details>
          <p role="status">{recordMessage}</p>
          {recordMessage.includes('못했') && (
            <button
              onClick={() =>
                void controller
                  .update((g) => saveRaceRecord(g, race, Date.now()))
                  .then((ok) =>
                    setRecordMessage(ok ? '레이스 기록 저장됨' : '저장 공간을 확인해 주세요.'),
                  )
              }
            >
              기록 저장 재시도
            </button>
          )}
          <p>레이스는 학습 기록과 크레딧에 영향을 주지 않아요.</p>
          <div className="garage-actions">
            <button className="primary" onClick={onReturn}>
              학습으로 복귀
            </button>
            <button
              onClick={() => {
                throttle.current = false;
                setRecordMessage('');
                change(() => newRace(race.targetDistance));
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
