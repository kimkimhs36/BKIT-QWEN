import { useEffect, useState } from 'react';
import { Move3D } from 'lucide-react';
import { materialCharacter, type MaterialId, type MaterialPreferences } from './material';
import './materials.css';

const SENSOR_EVENT = 'bkit:material-sensor';
const STATUS_EVENT = 'bkit:material-sensor-status';
const clamp = (n: number, limit = 1) => Math.max(-limit, Math.min(limit, n));
function reportSensor(enabled: boolean, message: string) {
  document.documentElement.dataset.materialSensor = enabled ? 'on' : 'off';
  window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: { enabled, message } }));
}

/** iOS requests permission synchronously from this user gesture; never at startup. */
export function MaterialSensorControl() {
  const [enabled, setEnabled] = useState(document.documentElement.dataset.materialSensor === 'on');
  const [message, setMessage] = useState('빛과 장식만 반응해요. 센서 정보는 전송하지 않아요.');
  useEffect(() => {
    const status = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean; message: string }>).detail;
      setEnabled(detail.enabled);
      setMessage(detail.message);
    };
    window.addEventListener(STATUS_EVENT, status);
    return () => window.removeEventListener(STATUS_EVENT, status);
  }, []);
  async function toggle() {
    if (enabled) {
      window.dispatchEvent(new CustomEvent(SENSOR_EVENT, { detail: false }));
      reportSensor(false, '센서 반응을 껐어요. 터치로 빛을 움직일 수 있어요.');
      return;
    }
    const ctor = window.DeviceOrientationEvent as
      (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    if (!ctor || !window.isSecureContext) {
      setMessage('이 환경에서는 터치와 포인터로 반응해요.');
      return;
    }
    try {
      if (ctor.requestPermission && (await ctor.requestPermission()) !== 'granted') {
        setMessage('권한 없이도 모든 학습 기능과 터치 반응을 사용할 수 있어요.');
        return;
      }
      reportSensor(true, '센서 신호를 기다리고 있어요. 기기를 가볍게 기울여 보세요.');
      window.dispatchEvent(new CustomEvent(SENSOR_EVENT, { detail: true }));
    } catch {
      setMessage('센서에 연결하지 못했어요. 터치 반응을 이용해 주세요.');
    }
  }
  return (
    <div className="material-sensor-control">
      <div>
        <span>기울기에 반응하는 빛</span>
        <button type="button" aria-pressed={enabled} onClick={() => void toggle()}>
          <Move3D size={17} />
          {enabled ? '센서 끄기' : '센서 연결'}
        </button>
      </div>
      <small role="status">{message}</small>
    </div>
  );
}

type Press = {
  element: HTMLElement;
  value: number;
  velocity: number;
  target: number;
  x: number;
  y: number;
  stiffness: number;
  damping: number;
  id: MaterialId;
  intensity: number;
  specimen: boolean;
};

/** One event-driven spring loop. No React state is updated per frame. */
export function MaterialEffects({
  prefs,
  studying,
}: {
  prefs: MaterialPreferences;
  studying: boolean;
}) {
  const [sensor, setSensor] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reduce, setReduce] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const quiet = hidden || reduce || studying || prefs.lowPower || prefs.motion !== 'auto';
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.effects = quiet ? 'none' : 'auto';
    root.dataset.materialStudying = String(studying);
    root.style.setProperty('--material-intensity', String(prefs.intensity));
    window.dispatchEvent(new Event('bkit:effects'));
  }, [quiet, studying, prefs.intensity]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    const enable = (event: Event) => setSensor(Boolean((event as CustomEvent).detail));
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener(SENSOR_EVENT, enable);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener(SENSOR_EVENT, enable);
    };
  }, []);

  // Directional lighting: low-pass the input, then integrate a damped spring.
  useEffect(() => {
    const root = document.documentElement;
    if (quiet) {
      if (sensor)
        reportSensor(true, '센서 연결은 유지하고, 집중·절전·모션 감소 중에는 반응을 쉬어요.');
      root.style.setProperty('--sensor-x', '0');
      root.style.setProperty('--sensor-y', '0');
      root.style.setProperty('--light-x', '32%');
      root.style.setProperty('--light-y', '12%');
      return;
    }
    let x = 0,
      y = 0,
      vx = 0,
      vy = 0,
      tx = 0,
      ty = 0,
      frame = 0,
      last = 0;
    let baseline: { beta: number; gamma: number } | null = null;
    let received = false;
    const tick = (now: number) => {
      const dt = Math.min(0.025, Math.max(0.001, (now - (last || now - 16)) / 1000));
      last = now;
      vx += ((tx - x) * 82 - vx * 15) * dt;
      vy += ((ty - y) * 82 - vy * 15) * dt;
      x = clamp(x + vx * dt);
      y = clamp(y + vy * dt);
      root.style.setProperty('--sensor-x', x.toFixed(4));
      root.style.setProperty('--sensor-y', y.toFixed(4));
      root.style.setProperty('--light-x', `${32 + x * 36 * prefs.intensity}%`);
      root.style.setProperty('--light-y', `${12 + y * 32 * prefs.intensity}%`);
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > 0.002)
        frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        last = 0;
      }
    };
    const target = (a: number, b: number) => {
      const nx = Math.abs(a) < 0.02 ? 0 : clamp(a);
      const ny = Math.abs(b) < 0.02 ? 0 : clamp(b);
      if (Math.abs(nx - tx) + Math.abs(ny - ty) < 0.002) return;
      tx += (nx - tx) * 0.22;
      ty += (ny - ty) * 0.22;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const orientation = (e: DeviceOrientationEvent) => {
      if (
        e.beta == null ||
        e.gamma == null ||
        !Number.isFinite(e.beta) ||
        !Number.isFinite(e.gamma)
      )
        return;
      if (!received) {
        received = true;
        reportSensor(true, '연결됐어요. 기울이면 소재의 빛과 장식이 반응해요.');
      }
      if (!baseline) baseline = { beta: e.beta, gamma: e.gamma };
      const angle = ((screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI) / 180;
      const a = clamp((e.gamma - baseline.gamma) / 24),
        b = clamp((e.beta - baseline.beta) / 30);
      target(a * Math.cos(angle) + b * Math.sin(angle), b * Math.cos(angle) - a * Math.sin(angle));
    };
    const pointer = (e: PointerEvent) => {
      if (!sensor) target((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    };
    const center = () => {
      baseline = null;
      target(0, 0);
    };
    if (sensor) window.addEventListener('deviceorientation', orientation, { passive: true });
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerdown', pointer, { passive: true });
    document.addEventListener('pointerleave', center);
    window.addEventListener('orientationchange', center);
    window.addEventListener('blur', center);
    const timeout = sensor
      ? window.setTimeout(() => {
          if (!received) {
            setSensor(false);
            reportSensor(false, '센서 신호가 없어요. 터치와 포인터로 반응해요.');
          }
        }, 3500)
      : undefined;
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      window.removeEventListener('deviceorientation', orientation);
      document.removeEventListener('pointermove', pointer);
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('pointerleave', center);
      window.removeEventListener('orientationchange', center);
      window.removeEventListener('blur', center);
      root.style.setProperty('--sensor-x', '0');
      root.style.setProperty('--sensor-y', '0');
    };
  }, [sensor, quiet, prefs.intensity]);

  useEffect(() => {
    if (hidden || reduce || studying) return;
    const presses = new Map<HTMLElement, Press>();
    let frame = 0,
      last = 0;
    const clear = (p: Press) => {
      p.element.style.removeProperty('transform');
      p.element.style.removeProperty('transform-origin');
      p.element.style.removeProperty('--material-press');
      p.element.classList.remove('material-pressing');
    };
    const tick = (now: number) => {
      let moving = false;
      const dt = Math.min(0.022, Math.max(0.001, (now - (last || now - 16)) / 1000));
      last = now;
      for (const [el, p] of presses) {
        if (!el.isConnected) {
          presses.delete(el);
          continue;
        }
        p.velocity += ((p.target - p.value) * p.stiffness - p.velocity * p.damping) * dt;
        p.value += p.velocity * dt;
        const v = p.value * p.intensity;
        el.style.setProperty('--material-press', v.toFixed(4));
        if (p.id === 'jelly' || p.id === 'droplets' || p.specimen) {
          const stretch = p.specimen ? 0.075 : 0.023;
          el.style.transformOrigin = `${50 + p.x * 25}% ${50 + p.y * 25}%`;
          el.style.transform = `translateY(${v * 1.5}px) scale(${1 - v * stretch * (0.65 + Math.abs(p.x) * 0.35)},${1 - v * stretch}) skew(${v * p.x * (p.specimen ? 2.5 : 0.6)}deg,${v * p.y * 0.3}deg) rotate(${v * p.x * (p.specimen ? 1.8 : 0.25)}deg)`;
        } else el.style.transform = `translateY(${v * (p.id === 'gold' ? 1.5 : 1)}px)`;
        if (Math.abs(p.target - p.value) + Math.abs(p.velocity) > 0.004) moving = true;
        if (!p.target && Math.abs(p.value) + Math.abs(p.velocity) < 0.004) {
          clear(p);
          presses.delete(el);
        }
      }
      if (moving) frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        last = 0;
      }
    };
    const down = (event: PointerEvent) => {
      const el =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('button, .material-specimen-touch')
          : null;
      if (
        !el ||
        el.matches(':disabled') ||
        el.closest(
          '.learning-workspace, .digital-paper, .problem-workspace, .pdf-reader, .race-dialog',
        )
      )
        return;
      const preview = el.closest<HTMLElement>('[data-preview]');
      if (preview ? preview.dataset.previewMotion === 'none' : quiet) return;
      const id = (preview?.dataset.preview || prefs.id) as MaterialId;
      const profile = materialCharacter[id];
      if (!profile) return;
      const r = el.getBoundingClientRect();
      const x = clamp(((event.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1);
      const y = clamp(((event.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1);
      const previous = presses.get(el);
      const intensity = preview
        ? Number(preview.style.getPropertyValue('--material-intensity') || 0.5)
        : prefs.intensity;
      presses.set(el, {
        element: el,
        value: previous?.value ?? 0,
        velocity: previous?.velocity ?? 0,
        target: 0.8 + Math.min(event.pressure || 0.5, 1) * 0.4,
        x,
        y,
        stiffness: profile.stiffness,
        damping: profile.damping,
        id,
        intensity,
        specimen: el.classList.contains('material-specimen-touch'),
      });
      el.style.setProperty('--liquid-x', `${(x + 1) * 50}%`);
      el.style.setProperty('--liquid-y', `${(y + 1) * 50}%`);
      el.classList.add('material-pressing');
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const release = () => {
      for (const p of presses.values()) p.target = 0;
      if (presses.size && !frame) frame = requestAnimationFrame(tick);
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      presses.forEach(clear);
      presses.clear();
    };
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', reset, { passive: true });
    window.addEventListener('blur', reset);
    return () => {
      reset();
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
    };
  }, [prefs.id, prefs.intensity, quiet, hidden, reduce, studying]);

  return null;
}
