import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { newObservation, observeEyes } from './awakeSignals';
import './awake/awake.css';
const labels = {
  uncertain: '얼굴·눈 상태를 확실히 확인하기 어려워요. 졸음으로 판단하지 않아요.',
  observing: '기기에서 관찰 중 · 졸음 여부는 확정할 수 없어요.',
  'eyes-closed': '눈 감김이 이어질 가능성이 있어요. 편한 자세와 휴식을 확인하세요.',
  rest: '비슷한 신호가 반복됐어요. 공부보다 휴식이나 수면을 선택해도 좋아요.',
};
export function AwakeAssist({ onRest }: { onRest: () => void }) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    engine = useRef<FaceLandmarker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    observation = useRef(newObservation());
  const [busy, setBusy] = useState(false),
    [running, setRunning] = useState(false),
    [message, setMessage] = useState(''),
    [status, setStatus] = useState<keyof typeof labels>('uncertain');
  function stop() {
    generation.current++;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const active = stream.current;
    stream.current = null;
    active?.getTracks().forEach((t) => t.stop());
    engine.current?.close();
    engine.current = null;
    if (video.current) video.current.srcObject = null;
    observation.current = newObservation();
    setRunning(false);
    setBusy(false);
    setMessage('카메라를 종료했어요.');
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      stop();
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  async function start() {
    if (busy || running) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMessage(
        '이 브라우저에서 카메라를 사용할 수 없어요. 기본 공부와 휴식은 그대로 사용할 수 있어요.',
      );
      return;
    }
    const ticket = ++generation.current;
    setBusy(true);
    setMessage('카메라 권한 확인 후 기기 내 분석 모델을 준비해요. 처음에는 약 18MB를 내려받아요.');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });
      if (ticket !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      media.getVideoTracks().forEach((t) => {
        t.onended = () => stop();
      });
      const v = video.current!;
      v.srcObject = media;
      await v.play();
      const { createFaceEngine } = await import('./awake/engine');
      if (ticket !== generation.current) return;
      const model = await createFaceEngine();
      if (ticket !== generation.current) {
        model.close();
        return;
      }
      engine.current = model;
      setRunning(true);
      setBusy(false);
      setMessage('카메라 ON · 영상·얼굴 특징은 저장하거나 서버로 보내지 않아요.');
      let lastVideoTime = -1,
        slow = 0;
      const read = () => {
        if (ticket !== generation.current || !engine.current || !video.current) return;
        try {
          const started = performance.now();
          if (v.readyState >= 2 && v.currentTime !== lastVideoTime) {
            lastVideoTime = v.currentTime;
            const result = model.detectForVideo(v, started),
              shapes = result.faceBlendshapes[0]?.categories,
              landmarks = result.faceLandmarks[0];
            const left = shapes?.find((s) => s.categoryName === 'eyeBlinkLeft')?.score ?? null,
              right = shapes?.find((s) => s.categoryName === 'eyeBlinkRight')?.score ?? null;
            const angled =
              !!landmarks &&
              Math.abs(landmarks[1].x - (landmarks[33].x + landmarks[263].x) / 2) >
                Math.abs(landmarks[33].x - landmarks[263].x) * 0.35;
            observation.current = observeEyes(observation.current, {
              at: Date.now(),
              face: !!landmarks,
              left,
              right,
              angled,
            });
            setStatus(observation.current.status);
            slow = performance.now() - started > 250 ? slow + 1 : 0;
            if (slow >= 3) {
              stop();
              setMessage('분석이 느려 카메라를 종료했어요. 카메라 없이 공부를 이어가세요.');
              return;
            }
          }
          timer.current = setTimeout(read, 250);
        } catch {
          stop();
          setMessage(
            '분석을 계속할 수 없어 카메라를 종료했어요. 기본 공부는 계속 사용할 수 있어요.',
          );
        }
      };
      read();
    } catch (e) {
      if (ticket !== generation.current) return;
      stop();
      setMessage(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? '카메라 권한을 허용하지 않았어요. 기본 공부와 휴식은 그대로 사용할 수 있어요.'
          : '카메라·분석 모델을 준비하지 못했어요. 기본 공부는 그대로 사용할 수 있어요.',
      );
    }
  }
  return (
    <details className="awake-assist">
      <summary>실험 · AWAKE ASSIST</summary>
      <p>
        카메라로 눈 감김의 가능성만 살펴보는 실험이에요. 조명·안경·자세에 따라 부정확하며, 실제 기기
        정확도는 검증하지 않았어요. 수면 부족을 해결하거나 졸음을 진단하지 않아요.
      </p>
      <video
        ref={video}
        playsInline
        muted
        aria-label="기기 내 카메라 미리보기"
        hidden={!running && !busy}
      />
      <div className="awake-actions">
        <button disabled={busy || running} onClick={() => void start()}>
          카메라 켜고 기기 내 분석 시작
        </button>
        {(busy || running) && <button onClick={stop}>즉시 종료</button>}
        <button
          onClick={() => {
            stop();
            onRest();
          }}
        >
          카메라 끄고 쉬기
        </button>
      </div>
      <p role="status">{message || '기본 OFF · 카메라 권한은 시작 버튼을 누를 때만 요청해요.'}</p>
      {running && <p role="status">{labels[status]}</p>}
      <small>
        영상·특징 저장 없음 · 영상 서버 전송 없음 · 탭을 떠나면 종료 · 권한 취소는 브라우저 사이트
        설정에서 할 수 있어요.
      </small>
    </details>
  );
}
