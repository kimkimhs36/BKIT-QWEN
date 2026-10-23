import { useEffect, useRef, useState } from 'react';
import { newObservation, shouldNotify, type AwakePhase, type Sensitivity } from './awakeSignals';
import { AwakeSession, type Snapshot } from './awake/session';
import './awake/awake.css';
const labels: Record<AwakePhase, string> = {
  IDLE: '꺼짐',
  INITIALIZING: '준비 중',
  CALIBRATING: '눈 기준 보정 중',
  OBSERVING: '관찰 중',
  FATIGUE_SIGNAL: '피로 가능성',
  REPEATED_CLOSURE: '긴 눈 감김 반복',
  REST_RECOMMENDED: '휴식 권장',
  UNCERTAIN: '관찰 불가 · 신뢰도 낮음',
  PAUSED: '일시중지 · 카메라 OFF',
};
export function AwakeAssist({
  onRest,
  onShortRest,
}: {
  onRest: () => void;
  onShortRest?: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    session = useRef<AwakeSession | null>(null);
  const [s, setS] = useState<Snapshot>({
    phase: 'IDLE',
    camera: false,
    message: '',
    observation: newObservation(),
    slow: false,
  });
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced'),
    [preview, setPreview] = useState(false),
    [sound, setSound] = useState(false),
    [vibrate, setVibrate] = useState(false),
    [restGuide, setRestGuide] = useState(true),
    [ack, setAck] = useState(false);
  const audio = useRef<AudioContext | null>(null),
    lastNotice = useRef({ level: 0, at: -Infinity });
  const live = s.camera || s.phase === 'INITIALIZING';
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 18;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const load = (active: boolean) => {
      document.documentElement.dataset.awakeCamera = String(active);
      window.dispatchEvent(new Event('bkit:camera-load'));
    };
    const controller = new AwakeSession(
      video.current!,
      setS,
      {
        camera: () =>
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 320 },
              height: { ideal: 240 },
              frameRate: { ideal: 12, max: 15 },
            },
            audio: false,
          }),
        model: async () => (await import('./awake/engine')).createFaceEngine(),
        now: () => performance.now(),
        schedule: (f, ms) => setTimeout(f, ms),
        cancel: (id) => clearTimeout(id),
        luminance: (v) => {
          if (!ctx) return 0;
          ctx.drawImage(v, 0, 0, 24, 18);
          const data = ctx.getImageData(0, 0, 24, 18).data;
          let total = 0;
          for (let i = 0; i < data.length; i += 4)
            total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          return total / (data.length / 4);
        },
      },
      load,
    );
    session.current = controller;
    const policy = () => {
      controller.lowPower = document.documentElement.dataset.motion === 'off';
    };
    policy();
    const hidden = () => {
      if (document.hidden)
        controller.stop(
          'IDLE',
          '탭을 떠나 카메라를 종료했어요. 다시 시작하려면 버튼을 눌러 주세요.',
        );
    };
    const exit = () => controller.stop();
    const collapsed = (event: Event) => {
      if (
        event.target instanceof HTMLDetailsElement &&
        !event.target.open &&
        event.target.contains(video.current)
      )
        controller.stop();
    };
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('toggle', collapsed, true);
    window.addEventListener('pagehide', exit);
    window.addEventListener('bkit:effects', policy);
    return () => {
      controller.stop();
      session.current = null;
      void audio.current?.close();
      audio.current = null;
      document.removeEventListener('visibilitychange', hidden);
      document.removeEventListener('toggle', collapsed, true);
      window.removeEventListener('pagehide', exit);
      window.removeEventListener('bkit:effects', policy);
    };
  }, []);
  useEffect(() => {
    if (!s.camera || !shouldNotify(s.phase, performance.now(), lastNotice.current, ack)) return;
    lastNotice.current = { level: s.phase === 'REST_RECOMMENDED' ? 3 : 2, at: performance.now() };
    if (sound && audio.current?.state === 'running') {
      const a = audio.current,
        osc = a.createOscillator(),
        gain = a.createGain();
      osc.type = 'sine';
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0, a.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, a.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + 0.4);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
    if (vibrate && typeof navigator.vibrate === 'function' && !navigator.vibrate(70)) {
      setVibrate(false);
      setS((v) => ({
        ...v,
        message: '이 기기에서 진동 요청을 받지 못했어요. 화면 안내를 사용해요.',
      }));
    }
  }, [s.phase, s.camera, sound, vibrate, ack]);
  async function start() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setS((v) => ({
        ...v,
        message:
          '이 브라우저에서 카메라를 사용할 수 없어요. 기본 공부와 휴식은 그대로 사용할 수 있어요.',
      }));
      return;
    }
    setAck(false);
    lastNotice.current = { level: 0, at: -Infinity };
    if (sound && audio.current?.state === 'suspended') void audio.current.resume();
    session.current!.sensitivity = sensitivity;
    await session.current!.start();
  }
  const stop = () => {
    session.current?.stop();
    void audio.current?.suspend().catch(() => {});
    navigator.vibrate?.(0);
  };
  function chooseRest(short: boolean) {
    stop();
    if (short && onShortRest) onShortRest();
    else onRest();
  }
  return (
    <details
      className="awake-assist"
      onToggle={(e) => {
        if (!e.currentTarget.open) stop();
      }}
    >
      <summary>
        Awake Assist <span>카메라 · {s.camera ? 'ON' : 'OFF'}</span>
      </summary>
      <p>
        눈 감김 패턴을 기기 안에서만 살펴봐요. 조명·안경·자세에 따라 부정확할 수 있으며 실제 수면을
        진단하지 않아요.
      </p>
      <div className="awake-status">
        <span>
          카메라 <b>{s.camera ? 'ON' : s.phase === 'INITIALIZING' ? '준비 중' : 'OFF'}</b>
        </span>
        <span>
          관찰 상태 <b>{labels[s.phase]}</b>
        </span>
        <span>
          감도{' '}
          <b>
            {sensitivity === 'balanced' ? '기본' : sensitivity === 'sensitive' ? '민감' : '보수적'}
          </b>
        </span>
      </div>
      <video
        ref={video}
        playsInline
        muted
        aria-label="기기 내 카메라 미리보기"
        className={preview && s.camera ? '' : 'awake-video-concealed'}
      />
      <div className="awake-actions">
        {!live && <button onClick={() => void start()}>졸음 신호 감지 시작</button>}
        {s.camera && (
          <button
            onClick={() => session.current?.stop('PAUSED', '일시중지했어요. 카메라도 종료됐어요.')}
          >
            일시중지
          </button>
        )}
        {live && <button onClick={stop}>즉시 종료</button>}
      </div>
      {s.phase === 'CALIBRATING' && (
        <div className="awake-calibration">
          <p>정면을 편하게 바라보고 자연스럽게 깜빡여 주세요. 약 4초가 걸려요.</p>
          <button
            onClick={() => {
              session.current?.skip();
              setSensitivity('conservative');
            }}
          >
            보정 건너뛰고 기본 모드
          </button>
        </div>
      )}
      {restGuide &&
        ['FATIGUE_SIGNAL', 'REPEATED_CLOSURE', 'REST_RECOMMENDED'].includes(s.phase) && (
          <div className="awake-guidance" data-stage={s.phase} role="status">
            <strong>
              {s.phase === 'REST_RECOMMENDED'
                ? '긴 눈 감김 신호가 반복됐어요. 휴식이나 충분한 수면을 권해요.'
                : s.phase === 'REPEATED_CLOSURE'
                  ? '눈을 오래 감는 신호가 반복돼요. 잠깐 쉬어 볼까요?'
                  : '조금 피곤해 보일 수 있어요. 잠시 눈을 쉬어 볼까요?'}
            </strong>
            <div className="awake-actions">
              {onShortRest && (
                <button onClick={() => chooseRest(true)}>일시정지하고 WAKE BOMB 휴식</button>
              )}
              <button onClick={() => chooseRest(false)}>카메라 끄고 휴식·수면 보기</button>
              <button disabled={ack} onClick={() => setAck(true)}>
                {ack ? '확인했어요 · 알림 중지' : '확인 · 추가 알림 중지'}
              </button>
            </div>
          </div>
        )}
      <details className="awake-advanced">
        <summary>고급 설정</summary>
        <label>
          감지 민감도{' '}
          <select
            aria-label="감지 민감도"
            value={sensitivity}
            onChange={(e) => {
              const v = e.target.value as Sensitivity;
              setSensitivity(v);
              if (session.current) {
                session.current.sensitivity = v;
                if (s.camera) session.current.calibrate();
              }
            }}
          >
            <option value="conservative">보수적</option>
            <option value="balanced">기본</option>
            <option value="sensitive">민감</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              setSound(e.target.checked);
              if (e.target.checked) {
                try {
                  audio.current ??= new AudioContext();
                  void audio.current.resume();
                } catch {
                  setSound(false);
                }
              }
            }}
          />
          짧은 알림음 · 작은 음량
        </label>
        <label>
          <input
            type="checkbox"
            checked={vibrate}
            disabled={typeof navigator.vibrate !== 'function'}
            onChange={(e) => setVibrate(e.target.checked)}
          />
          짧은 진동{' '}
          {typeof navigator.vibrate !== 'function'
            ? '· 이 브라우저 미지원'
            : '· 기기 설정에 따라 달라요'}
        </label>
        <label>
          <input
            type="checkbox"
            checked={restGuide}
            onChange={(e) => setRestGuide(e.target.checked)}
          />
          휴식 안내
        </label>
        <label>
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
          카메라 미리보기 표시
        </label>
        {s.camera && (
          <>
            <button
              onClick={() => {
                session.current?.calibrate();
                setAck(false);
              }}
            >
              눈 기준 다시 보정
            </button>
            {s.phase === 'UNCERTAIN' && (
              <button
                onClick={() => {
                  session.current?.skip();
                  setSensitivity('conservative');
                }}
              >
                보수적인 기본 모드 사용
              </button>
            )}
            <small>
              관찰 가능한 시간 {Math.round(s.observation.observedMs / 1000)}초 · 긴 눈 감김{' '}
              {s.observation.episodes.length}회 ·{' '}
              {s.observation.confidence >= 0.72 ? '입력 확인' : '신뢰도 낮음'}
              <br />
              수치는 진단 기준이나 정확도 점수가 아니에요. 절전 시 분석 빈도를 줄여요.
            </small>
          </>
        )}
      </details>
      <p role="status">{s.message || '기본 OFF · 카메라 권한은 시작 버튼을 누를 때만 요청해요.'}</p>
      <small>
        모델 파일만 이 사이트에서 내려받아요. 영상·얼굴 특징은 저장하거나 서버로 보내지 않아요. 탭
        이동·패널 닫기·종료 시 카메라를 해제하고 자동 재시작하지 않아요.
      </small>
    </details>
  );
}
