import { useEffect, useState } from 'react';
import { ArrowRight, FastForward } from 'lucide-react';
import './juggernaut-opening.css';

const DREAMS = [
  {
    chapter: 'A FUTURE TO BUILD',
    heading: '언젠가,',
    emphasis: '내 손으로 만든 차가',
    ending: '세상 위를 달릴지도 몰라.',
    kind: 'machine',
    serial: 'FUTURE / 01',
  },
  {
    chapter: 'PLACES TO DISCOVER',
    heading: '아직 가보지 못한',
    emphasis: '도시의 빛과 풍경이',
    ending: '나를 기다리고 있을지도.',
    kind: 'city',
    serial: 'FUTURE / 02',
  },
  {
    chapter: 'A NAME TO LEAVE',
    heading: '내가 만들고 싶은',
    emphasis: '이름과 이야기들이',
    ending: '진짜 세상이 될 수도 있어.',
    kind: 'signal',
    serial: 'FUTURE / 03',
  },
];
type Phase = 'signal' | 'barrel' | 'dream-0' | 'dream-1' | 'dream-2' | 'reality';
const CUES: { phase: Phase; at: number }[] = [
  { phase: 'signal', at: 0 },
  { phase: 'barrel', at: 1150 },
  { phase: 'dream-0', at: 3600 },
  { phase: 'dream-1', at: 5600 },
  { phase: 'dream-2', at: 7600 },
  { phase: 'reality', at: 9700 },
];
export function JuggernautOpening({
  onComplete,
  embedded = false,
}: {
  onComplete: () => void;
  embedded?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('signal');
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = {matches: document.documentElement.dataset.effects === 'none'};
    setReduceMotion(query.matches);
    if (query.matches) {
      setPhase('reality');
      return;
    }
    const timeouts = CUES.slice(1).map((cue) =>
      window.setTimeout(() => setPhase(cue.phase), cue.at),
    );
    const finish = window.setTimeout(onComplete, 13500);
    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [onComplete]);
  const dreamIndex = phase.startsWith('dream-') ? Number(phase.slice(6)) : -1;
  const dream = dreamIndex >= 0 ? DREAMS[dreamIndex] : null;
  return (
    <div
      className={'jg-op jg-op--' + phase}
      role="region"
      aria-label="TOHEŞAR JUGGERNAUT 작전 오프닝"
    >
      <div className="jg-op-vignette" aria-hidden="true" />
      <div className="jg-op-tunnel" aria-hidden="true">
        <div className="jg-op-hollow">
          <div className="jg-op-grooves" />
        </div>
        <span className="jg-op-iris" />
        <div className="jg-op-crosshair">
          <span />
          <span />
        </div>
      </div>
      {phase === 'signal' && (
        <div className="jg-op-signal" aria-live="polite">
          <span className="jg-op-wordmark">TOHEŞAR</span>
          <span className="jg-op-code">A PRIVATE MOTION PICTURE</span>
          <i className="jg-op-radar" />
          <strong>J</strong>
          <p>
            JUGGERNAUT <span>MMXXVIII</span>
          </p>
          <small>ESTABLISHING CONNECTION</small>
        </div>
      )}
      {phase === 'barrel' && (
        <div className="jg-op-breach">
          <span>OPERATION 2028</span>
          <strong>
            미래로 향하는
            <br />
            마지막 관문.
          </strong>
          <small>ACCESS GRANTED / TARGET LOCKED</small>
        </div>
      )}
      {dream && (
        <div className={'jg-op-dream jg-op-dream--' + dream.kind} key={phase}>
          <div className="jg-op-world" aria-hidden="true">
            {dream.kind === 'machine' && (
              <svg
                className="jg-op-car"
                viewBox="0 0 420 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 124C63 115 83 106 115 67C125 56 154 47 194 44L303 49C326 51 340 70 366 107L405 118V140H371C369 117 357 111 339 111C320 111 309 124 307 140H121C118 117 105 111 87 111C67 111 56 125 54 140H15Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                <path
                  d="M118 69L198 53 301 57 338 101 98 101Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity=".65"
                />
                <path
                  d="M204 57L211 100M15 125H400"
                  stroke="currentColor"
                  strokeOpacity=".5"
                  strokeWidth="1.5"
                />
                <circle cx="87" cy="141" r="26" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="339" cy="141" r="26" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="87" cy="141" r="13" stroke="currentColor" strokeOpacity=".7" />
                <circle cx="339" cy="141" r="13" stroke="currentColor" strokeOpacity=".7" />
              </svg>
            )}
            {dream.kind === 'city' && (
              <>
                <div className="jg-op-moon" />
                <div className="jg-op-skyline" />
                <div className="jg-op-cityroad" />
              </>
            )}
            {dream.kind === 'signal' && (
              <>
                <span className="jg-op-future-ring ring-a" />
                <span className="jg-op-future-ring ring-b" />
                <span className="jg-op-future-ring ring-c" />
                <div className="jg-op-future-light" />
              </>
            )}
          </div>
          <div className="jg-op-dream-copy">
            <span className="jg-op-code">
              {dream.chapter} <i /> {dream.serial}
            </span>
            <h2>
              {dream.heading}
              <br />
              <em>{dream.emphasis}</em>
              <br />
              {dream.ending}
            </h2>
            <p>ONE DAY / NOT YET WRITTEN</p>
          </div>
        </div>
      )}
      {phase === 'reality' && (
        <div className="jg-op-reality">
          <span className="jg-op-code">CUT TO REALITY / 2026</span>
          <span className="jg-op-reality-flare" aria-hidden="true" />
          <h2>
            하지만,
            <br />
            <em>그 미래는 아직</em>
            <br />
            오지 않았다.
          </h2>
          <div className="jg-op-line" />
          <p>
            2027. 11. 18. <span>수능</span>
          </p>
          <small>겁먹을 시간이 아니라, 준비할 시간이야.</small>
          {reduceMotion && !embedded && (
            <button className="jg-op-finish" onClick={onComplete}>
              작전 파일 열기 <ArrowRight size={17} />
            </button>
          )}
        </div>
      )}
      <div className="jg-op-topline">
        <span>TOHEŞAR / JUGGERNAUT</span>
        <span>{phase === 'reality' ? 'REALITY CHECK' : 'CHAPTER 00'}</span>
      </div>
      <div className="jg-op-bottomline">
        <div className="jg-op-progress" aria-label="오프닝 진행 중">
          <i
            style={{
              width:
                (phase === 'signal'
                  ? 3
                  : phase === 'barrel'
                    ? 19
                    : dreamIndex === 0
                      ? 35
                      : dreamIndex === 1
                        ? 52
                        : dreamIndex === 2
                          ? 68
                          : 90) + '%',
            }}
          />
        </div>
        {!embedded && (
          <button type="button" onClick={onComplete} aria-label="오프닝 건너뛰기">
            <FastForward size={14} /> SKIP INTRO
          </button>
        )}
      </div>
    </div>
  );
}
