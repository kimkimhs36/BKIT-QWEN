import { useEffect, useRef, useState } from 'react';
import { startAmbience } from './ambientSound';
export function AmbientControl() {
  const audio = useRef<Awaited<ReturnType<typeof startAmbience>> | null>(null),
    alive = useRef(true);
  const [kind, setKind] = useState<'rain' | 'sea' | 'forest' | 'wind'>('rain'),
    [playing, setPlaying] = useState(false),
    [volume, setVolume] = useState(0.12),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const stop = () => {
    void audio.current?.stop();
    audio.current = null;
    setPlaying(false);
  };
  useEffect(() => {
    alive.current = true;
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      alive.current = false;
      document.removeEventListener('visibilitychange', hidden);
      void audio.current?.stop();
    };
  }, []);
  async function toggle() {
    if (playing) {
      stop();
      return;
    }
    setBusy(true);
    try {
      if (!alive.current) return;
      const instance = startAmbience(kind, volume);
      audio.current = instance;
      await instance.ready;
      if (!alive.current || document.hidden) {
        void instance.stop();
        return;
      }
      audio.current = instance;
      setPlaying(true);
      setMessage('');
    } catch {
      void audio.current?.stop();
      audio.current = null;
      if (!alive.current) return;
      setMessage('소리를 시작하지 못했어요. 브라우저 음소거·오디오 설정을 확인하세요.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <details className="ambient-control">
      <summary>선택 · 합성 환경음</summary>
      <p>직접 만든 합성 소리예요. 현장 녹음이 아니며, 이 버튼을 누를 때만 재생해요.</p>
      <label>
        환경음
        <select
          value={kind}
          onChange={(e) => {
            stop();
            setKind(e.target.value as typeof kind);
          }}
        >
          <option value="rain">빗소리</option>
          <option value="sea">느린 파도</option>
          <option value="forest">숲의 바람</option>
          <option value="wind">잔잔한 바람</option>
        </select>
      </label>
      <button disabled={busy} onClick={() => void toggle()}>
        {busy ? '소리 준비 중…' : playing ? '환경음 중지' : '환경음 재생'}
      </button>
      <label>
        환경음 크기
        <input
          type="range"
          min={0}
          max={0.3}
          step={0.01}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            audio.current?.volume(v);
          }}
        />
      </label>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
