import { useState } from 'react';
import type { SleepController } from './useSleepGuard';
import { updateSleepRecord } from './sleep';
import { HOME_SLEEP_STEPS, readHomeSleepSteps, setHomeSleepStep, type HomeSleepStepIndex } from './homeSleepSteps';

type Props = {
  guard: SleepController;
  busy: boolean;
  onOpen: () => void;
};

export function SleepHomeActions({ guard, busy, onOpen }: Props) {
  const [localError, setLocalError] = useState('');
  const record = guard.state.records.find((item) => item.date === guard.status.key);
  const checks = readHomeSleepSteps(record);
  const done = checks.filter(Boolean).length;
  const toggle = (index: HomeSleepStepIndex, checked: boolean) => {
    const saved = guard.commit((state) =>
      updateSleepRecord(state, guard.status, (current) => ({
        ...current,
        checks: setHomeSleepStep(current.checks, index, checked),
      })),
    );
    setLocalError(saved ? '' : '기록을 저장하지 못했어요. 수면 기록을 확인해 주세요.');
  };

  return (
    <fieldset className="bkit-home-sleep-steps">
      <legend>잠들기 전 세 가지 · {done}/3 확인</legend>
      {HOME_SLEEP_STEPS.map((step, index) => (
        <label className="bkit-home-sleep-step" key={step}>
          <input
            type="checkbox"
            disabled={guard.blocked}
            checked={checks[index]}
            onChange={(event) => toggle(index as HomeSleepStepIndex, event.target.checked)}
          />
          <span>{step}</span>
        </label>
      ))}
      {done === 3 && (
        <p role="status">준비 세 가지를 확인했어. 실제로 잠자리에 누웠는지는 따로 확인해 줘.</p>
      )}
      {!guard.state.enabled && (
        <p>수면 보호 알림은 꺼져 있어요. 체크는 기존 수면 기록에만 저장돼요.</p>
      )}
      {(guard.error || localError) && <p role="alert">{guard.error || localError}</p>}
      {busy && <p>진행 중인 공부가 있다면 집중 화면에서 직접 마무리해 줘.</p>}
      <button type="button" onClick={onOpen}>실제 취침 확인 · 수면 기록 열기</button>
      <small>이 단계는 실제 취침·수면 시간을 자동으로 기록하지 않아요.</small>
    </fieldset>
  );
}
