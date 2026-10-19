import { useEffect, useRef, useState } from 'react';
import type { MaterialPreferences } from './material';
import './materials.css';
/** Optional decoration only. No answer field or study content is transformed. */
export function MaterialEffects({
  prefs,
  studying,
}: {
  prefs: MaterialPreferences;
  studying: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [sensor, setSensor] = useState(false),
    [message, setMessage] = useState('');
  const [hidden, setHidden] = useState(document.hidden);
  const [reduce, setReduce] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [performanceQuiet, setPerformanceQuiet] = useState(false);
  const quiet =
    performanceQuiet || hidden || reduce || studying || prefs.lowPower || prefs.motion !== 'auto';
  useEffect(() => {
    if (quiet) return;
    let previous = performance.now(),
      count = 0,
      slow = 0,
      frame = 0;
    const check = (now: number) => {
      if (now - previous > 80) slow++;
      previous = now;
      count++;
      if (count >= 90) {
        if (slow >= 12) setPerformanceQuiet(true);
        return;
      }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [quiet]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) setSensor(false);
    };
    const change = () => setReduce(media.matches);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', change);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', change);
    };
  }, []);
  useEffect(() => {
    if (!sensor || quiet) return;
    let x = 0,
      y = 0,
      vx = 0,
      vy = 0,
      tx = 0,
      ty = 0,
      frame = 0,
      last = 0;
    const move = (e: DeviceOrientationEvent) => {
      tx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 25));
      ty = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 35) / 35));
    };
    const tick = (now: number) => {
      if (now - last >= 32) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        vx += (Math.abs(tx) < 0.06 ? 0 : tx) * dt * 14 - x * dt * 14 - vx * dt * 7;
        vy += (Math.abs(ty) < 0.06 ? 0 : ty) * dt * 14 - y * dt * 14 - vy * dt * 7;
        x = Math.max(-1, Math.min(1, x + vx * dt));
        y = Math.max(-1, Math.min(1, y + vy * dt));
        root.current?.style.setProperty('--tilt-x', `${x * 12 * prefs.intensity}px`);
        root.current?.style.setProperty('--tilt-y', `${y * 10 * prefs.intensity}px`);
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('deviceorientation', move, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('deviceorientation', move);
      cancelAnimationFrame(frame);
      root.current?.style.setProperty('--tilt-x', '0px');
      root.current?.style.setProperty('--tilt-y', '0px');
    };
  }, [sensor, quiet, prefs.intensity]);
  async function enable() {
    if (sensor) {
      setSensor(false);
      setMessage('센서 반응을 껐어요.');
      return;
    }
    const ctor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    if (!ctor) {
      setMessage('센서를 지원하지 않아요. 물방울을 터치해 보세요.');
      return;
    }
    try {
      if (ctor.requestPermission && (await ctor.requestPermission()) !== 'granted') {
        setMessage('센서 권한 없이도 테마와 공부를 사용할 수 있어요.');
        return;
      }
      setSensor(true);
      setMessage('장식만 기울기에 반응해요. 권한을 취소하려면 브라우저 사이트 설정을 이용하세요.');
    } catch {
      setMessage('센서를 연결하지 못했어요. 터치로 사용할 수 있어요.');
    }
  }
  return (
    <>
      <div
        ref={root}
        className="material-ambience"
        data-motion={quiet ? 'none' : 'auto'}
        style={{ opacity: prefs.intensity }}
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
      </div>
      {prefs.id === 'droplets' && !studying && !hidden && (
        <aside className="droplet-control" aria-label="장식 물방울 제어">
          <button
            className="droplet-touch"
            aria-label="물방울 터치"
            onPointerDown={(e) => {
              if (!quiet)
                e.currentTarget.animate(
                  [
                    { transform: 'scale(.92,1.08)' },
                    { transform: 'scale(1.07,.95)' },
                    { transform: 'scale(1)' },
                  ],
                  { duration: 650, easing: 'ease-out' },
                );
            }}
          >
            ◌
          </button>
          <button onClick={() => void enable()} disabled={quiet}>
            {sensor ? '센서 반응 끄기' : '기울기 반응 켜기'}
          </button>
          {message && <small role="status">{message}</small>}
        </aside>
      )}
    </>
  );
}
