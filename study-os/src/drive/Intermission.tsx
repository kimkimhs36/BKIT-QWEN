import { useState } from 'react';
import type { GarageState } from './garage';
import { useBreakDialog } from './useBreakDialog';
import { quickClock } from '../quickTimer';
import { AmbientControl } from './AmbientControl';
import { useDriveMotion } from './useDriveMotion';
import { Car } from './Car';
import './drive.css';

const rooms = [
  ['forest', '숲'],
  ['sea', '바다'],
  ['rain', '비 오는 도시'],
  ['river', '잔잔한 강'],
  ['meadow', '초원'],
  ['night', '별이 보이는 밤'],
  ['window', 'TOHEŞAR WINDOW'],
] as const;
export function Intermission({
  garage,
  until,
  returnLabel,
  onReturn,
  onRace,
  onWake,
  onDuration,
}: {
  garage: GarageState;
  until: number;
  returnLabel?: string;
  onReturn: () => void;
  onRace: () => void;
  onWake: () => void;
  onDuration: (seconds: number) => void;
}) {
  const { dialog, seconds } = useBreakDialog(until, onReturn);
  const quiet = useDriveMotion(garage);
  const [room, setRoom] = useState<(typeof rooms)[number][0]>('forest');
  return (
    <dialog
      ref={dialog}
      className="tohesar race-dialog intermission"
      aria-label="INTERMISSION"
      onCancel={(e) => {
        e.preventDefault();
        onReturn();
      }}
      data-motion={quiet ? 'none' : 'auto'}
    >
      <header className="race-heading">
        <div>
          <span className="eyebrow">REST / RETURN</span>
          <h2>INTERMISSION</h2>
        </div>
        <span role="timer" aria-label="남은 휴식 시간">
          {quickClock(seconds)}
        </span>
      </header>
      <p>학습 타이머는 일시정지했어요. 잠깐 쉬고, 준비되면 다시 시작해요.</p>
      <div
        className={'nature-room nature-' + room}
        role="img"
        aria-label={rooms.find((r) => r[0] === room)?.[1] + ' · 자체 제작 일러스트'}
      >
        <div className="nature-horizon" />
        <div className="nature-orb" />
        {room === 'window' && (
          <>
            <div className="window-skyline" />
            <Car car={garage.car} />
          </>
        )}
        <span>{room === 'window' ? 'TOHEŞAR / CITY STUDY' : '잠시, 눈과 어깨를 쉬어 주세요'}</span>
      </div>
      <div className="garage-options" role="group" aria-label="휴식 공간 선택">
        {rooms.map(([id, label]) => (
          <button key={id} aria-pressed={room === id} onClick={() => setRoom(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="race-help">
        오리지널 CSS 풍경 · 실제 장소의 사진·영상이 아닙니다. 환경음은 아래에서 선택해서 재생해요.
      </p>
      <AmbientControl />
      <details>
        <summary>지금부터 쉴 시간 선택</summary>
        <div className="garage-actions">
          {[3, 5, 10].map((m) => (
            <button key={m} onClick={() => onDuration(m * 60)}>
              지금부터 {m}분 쉬기
            </button>
          ))}
        </div>
      </details>
      <div className="garage-actions">
        <button onClick={onRace}>MINI ARCADE · DRAG RACE</button>
        <button className="wake-bomb-trigger" onClick={onWake}>
          WAKE BOMB · 30초 리셋
        </button>
      </div>
      <p>게임으로 이동해도 남은 휴식 시간은 유지해요. 휴식은 공부 시간에 합산하지 않아요.</p>
      <button className="primary" onClick={onReturn}>
        {returnLabel || '학습으로 돌아가기'}
      </button>
      <p className="race-help">
        화면이 꺼졌거나 앱을 떠나면 알림을 보장할 수 없어요. 돌아오면 마감 시간을 확인해요.
      </p>
    </dialog>
  );
}
