import { useState } from 'react';
import type { GarageState } from './garage';
import { useBreakDialog } from './useBreakDialog';
import './drive.css';

const modes = {
  caffeine: {
    title: 'CAFFEINE SHOT',
    steps: [
      '시선을 화면 밖으로 옮겨요',
      '어깨를 편안하게 내려요',
      '다시 풀 문제의 첫 행동을 떠올려요',
    ],
  },
  ice: {
    title: 'ICE RESET',
    steps: ['손과 턱의 힘을 풀어요', '자세를 편하게 정리해요', '원한다면 물 한 모금 마셔요'],
  },
  engine: {
    title: 'ENGINE START',
    steps: ['잠깐 주차. 손을 쉬어요', '천천히 한 번 숨을 쉬어요', '다음 한 문제를 준비해요'],
  },
  story: {
    title: 'STORY SHOCK',
    steps: [
      '자동차 이야기 하나',
      '변속기는 엔진의 회전을 바퀴에 맞게 바꿔 줘요. 자전거 기어와 비슷한 역할이에요.',
      '이제, 공부도 작은 기어 하나부터',
    ],
  },
  physical: {
    title: 'PHYSICAL RESET',
    steps: [
      '가능하면 잠시 자세를 바꿔요',
      '불편하지 않은 만큼 어깨와 손을 풀어요',
      '피곤함이 계속되면 공부보다 휴식과 수면을 선택해요',
    ],
  },
} as const;
export function WakeBomb({
  garage,
  until,
  returnLabel,
  onReturn,
  onDuration,
}: {
  garage: GarageState;
  until: number;
  returnLabel?: string;
  onReturn: () => void;
  onDuration: (seconds: number) => void;
}) {
  const { dialog, seconds } = useBreakDialog(until, onReturn);
  const [mode, setMode] = useState<keyof typeof modes>('physical');
  const [started] = useState(Date.now());
  const total = Math.max(1, (until - started) / 1000);
  const step = Math.min(2, Math.floor((1 - seconds / total) * 3));
  return (
    <dialog
      ref={dialog}
      className={'tohesar race-dialog wake-bomb wake-' + mode}
      aria-label="WAKE BOMB"
      data-motion={garage.reduceMotion || garage.hideAnimations ? 'none' : 'auto'}
      onCancel={(e) => {
        e.preventDefault();
        onReturn();
      }}
    >
      <span className="eyebrow">BKIT / A SMALL RESET</span>
      <h2>WAKE BOMB</h2>
      <p>학습 타이머 일시정지 · 종료해도 자동 재개하지 않아요</p>
      <div className="wake-orbit" aria-hidden="true">
        <span>{seconds}</span>
      </div>
      <h3>{modes[mode].title}</h3>
      <p className="wake-instruction" role="status">
        {modes[mode].steps[Math.max(0, step)]}
      </p>
      <div className="garage-options" role="group" aria-label="리셋 모드">
        {Object.entries(modes).map(([id, item]) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => setMode(id as keyof typeof modes)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <details>
        <summary>리셋 길이 선택</summary>
        <div className="garage-actions">
          {[20, 30, 40].map((n) => (
            <button key={n} onClick={() => onDuration(n)}>
              지금부터 {n}초
            </button>
          ))}
        </div>
      </details>
      <p className="race-help">
        짧은 자세·주의 전환 안내예요. 카페인 효과나 졸음 해소를 보장하지 않아요. 졸리면 충분히
        쉬거나 자는 편이 좋아요.
      </p>
      <button className="primary" onClick={onReturn}>
        {returnLabel || '학습으로 돌아가기'}
      </button>
    </dialog>
  );
}
