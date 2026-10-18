import { useState } from 'react';
import { BedDouble, Camera, Check, Droplets, Moon, Smartphone } from 'lucide-react';

type Steps = { washed: boolean; bedReady: boolean; devicesAway: boolean };
type Props = { nightMode: boolean; onFinish: () => void };

/**
 * An optional, self-reported preparation checklist — never proof of sleep.
 * The selected image is intentionally NOT read, previewed, uploaded or stored.
 */
export function BedtimeRoutine({ nightMode, onFinish }: Props) {
  const [steps, setSteps] = useState<Steps>({
    washed: false, bedReady: false, devicesAway: false,
  });
  const [photoNote, setPhotoNote] = useState('');

  const setStep = (name: keyof Steps, checked: boolean) =>
    setSteps((previous) => ({ ...previous, [name]: checked }));

  return (
    <section className="bkit-sleep-routine" aria-label="수면 준비 체크리스트">
      <p className="bkit-sleep-routine-intro">
        잠들었다는 인증이 아니야. 준비를 확인한 뒤 기기를 내려놓자.
      </p>
      <label className="bkit-sleep-routine-step">
        <Droplets size={18} aria-hidden="true" />
        <span>씻고 나와서 준비했어</span>
        <input type="checkbox" checked={steps.washed} onChange={(event) => setStep('washed', event.target.checked)} />
      </label>
      <label className="bkit-sleep-routine-step">
        <BedDouble size={18} aria-hidden="true" />
        <span>침대와 조명을 정리했어</span>
        <input type="checkbox" checked={steps.bedReady} onChange={(event) => setStep('bedReady', event.target.checked)} />
      </label>
      <label className="bkit-sleep-routine-step">
        <Smartphone size={18} aria-hidden="true" />
        <span>iPhone·iPad를 침대 밖에 둘 거야</span>
        <input type="checkbox" checked={steps.devicesAway} onChange={(event) => setStep('devicesAway', event.target.checked)} />
      </label>
      {!nightMode && (
        <div className="bkit-sleep-photo">
          <label className="bkit-sleep-photo-label">
            <Camera size={17} aria-hidden="true" />
            <span>선택: 비어 있는 침대 사진 확인</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="비어 있는 침대 사진 선택 또는 촬영"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) {
                  setPhotoNote('이미지 파일만 선택해줘. 15MB 이하여야 해.');
                } else {
                  setPhotoNote('사진을 선택했어. 파일은 업로드·저장하지 않았고, 내용도 자동 검증하지 않아.');
                }
                event.currentTarget.value = '';
              }}
            />
          </label>
          <p className="bkit-sleep-photo-note" role="status">{photoNote || '얼굴·몸·욕실은 촬영하지 말고, 사진 없이 넘어가도 돼.'}</p>
        </div>
      )}
      <button type="button" className="bkit-sleep-primary" onClick={onFinish}>
        {nightMode ? <Moon size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
        확인 끝 · 화면 내려놓기
      </button>
      <p className="bkit-sleep-routine-foot">체크하지 않아도 괜찮아. 오늘은 더 오래 화면을 보지 않는 게 목표야.</p>
    </section>
  );
}
