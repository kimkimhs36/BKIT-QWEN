import { useEffect, useState } from 'react';
import { Move3D } from 'lucide-react';
import { materialCharacter, type MaterialId, type MaterialPreferences } from './material';
import './materials.css';
const SENSOR_EVENT = 'bkit:material-sensor',
  STATUS_EVENT = 'bkit:material-sensor-status',
  CALIBRATE_EVENT = 'bkit:material-calibrate';
const clamp = (n: number, limit = 1) => Math.max(-limit, Math.min(limit, n));
type SensorState =
  | 'unsupported'
  | 'permission'
  | 'denied'
  | 'waiting'
  | 'receiving'
  | 'active'
  | 'power'
  | 'reduced'
  | 'study'
  | 'off';
const sensorLabels: Record<SensorState, string> = {
  unsupported: '지원되지 않음',
  permission: '권한 필요',
  denied: '권한 거부',
  waiting: '센서 대기 중',
  receiving: '센서값 수신 중',
  active: '반응 활성화',
  power: '절전으로 일시중지',
  reduced: '모션 감소로 일시중지',
  study: '집중 중 빛 반응 일시중지',
  off: '비활성화',
};
let sensorSnapshot: { enabled: boolean; state: SensorState; message: string } = {
  enabled: false,
  state: 'permission',
  message: '빛과 장식만 반응해요. 센서 정보는 전송하지 않아요.',
};
function reportSensor(enabled: boolean, state: SensorState, message: string) {
  sensorSnapshot = { enabled, state, message };
  document.documentElement.dataset.materialSensor =
    state === 'active' || state === 'receiving' ? 'on' : 'off';
  document.documentElement.dataset.materialSensorStatus = state;
  window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: sensorSnapshot }));
}
/** Permission request is called directly from a tap, never from an effect. */
export function MaterialSensorControl() {
  const [s, setS] = useState(sensorSnapshot);
  useEffect(() => {
    const update = () => setS({ ...sensorSnapshot });
    window.addEventListener(STATUS_EVENT, update);
    return () => window.removeEventListener(STATUS_EVENT, update);
  }, []);
  async function toggle() {
    if (s.enabled) {
      window.dispatchEvent(new CustomEvent(SENSOR_EVENT, { detail: false }));
      reportSensor(false, 'off', '센서 반응을 껐어요. 터치로 빛을 움직일 수 있어요.');
      return;
    }
    const ctor = window.DeviceOrientationEvent as
      (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    if (!ctor || !window.isSecureContext) {
      reportSensor(false, 'unsupported', '이 환경에서는 터치와 포인터로 반응해요.');
      return;
    }
    try {
      if (ctor.requestPermission && (await ctor.requestPermission()) !== 'granted') {
        reportSensor(false, 'denied', '권한 없이도 모든 학습 기능과 터치 반응을 사용할 수 있어요.');
        return;
      }
      reportSensor(true, 'waiting', '센서 신호를 기다리고 있어요. 기기를 가볍게 기울여 보세요.');
      window.dispatchEvent(new CustomEvent(SENSOR_EVENT, { detail: true }));
    } catch {
      reportSensor(false, 'denied', '센서 권한을 확인하지 못했어요. 터치 반응을 이용해 주세요.');
    }
  }
  return (
    <div className="material-sensor-control">
      <div>
        <span>기울기 센서</span>
        <button type="button" aria-pressed={s.enabled} onClick={() => void toggle()}>
          <Move3D size={17} />
          {s.enabled ? '센서 끄기' : '센서 연결'}
        </button>
      </div>
      <div className="material-sensor-diagnostic">
        <dl>
          <dt>상태</dt>
          <dd role="status">{sensorLabels[s.state]}</dd>
          <dt>입력</dt>
          <dd>{s.state === 'active' || s.state === 'receiving' ? '정상' : '미수신 · 터치 가능'}</dd>
          <dt>광원 이동</dt>
          <dd>{s.state === 'active' ? '활성' : '대기'}</dd>
        </dl>
        <div className="material-sensor-preview" role="img" aria-label="기울기 광원 미리보기" />
      </div>
      <div className="material-sensor-actions">
        <button
          disabled={!s.enabled}
          onClick={() => window.dispatchEvent(new Event(CALIBRATE_EVENT))}
        >
          현재 자세로 보정
        </button>
      </div>
      <small>{s.message}</small>
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
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) {
        setSensor(false);
        reportSensor(false, 'off', '탭을 떠나 센서 반응을 종료했어요.');
      }
    };
    const enable = (event: Event) => setSensor(Boolean((event as CustomEvent).detail));
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener(SENSOR_EVENT, enable);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener(SENSOR_EVENT, enable);
    };
  }, []);

  // Only material light coordinates change. No layout node receives a tilt transform.
  useEffect(() => {
    const root = document.documentElement;
    if (quiet) {
      if (sensor)
        reportSensor(
          true,
          prefs.lowPower ? 'power' : reduce || prefs.motion !== 'auto' ? 'reduced' : 'study',
          '터치·기울기 움직임을 쉬고 정적인 재질을 표시해요.',
        );
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
      last = 0,
      lastSignal = 0,
      received = 0;
    let baseline: { beta: number; gamma: number } | null = null;
    const tick = (now: number) => {
      const dt = Math.min(0.025, Math.max(0.001, (now - (last || now - 16)) / 1000));
      last = now;
      const stiffness =
        prefs.id === 'gold' ? 120 : prefs.id === 'forest' ? 45 : prefs.id === 'night' ? 155 : 82;
      const damping = prefs.id === 'droplets' ? 13 : prefs.id === 'forest' ? 14 : 19;
      vx += ((tx - x) * stiffness - vx * damping) * dt;
      vy += ((ty - y) * stiffness - vy * damping) * dt;
      x = clamp(x + vx * dt);
      y = clamp(y + vy * dt);
      root.style.setProperty('--sensor-x', x.toFixed(4));
      root.style.setProperty('--sensor-y', y.toFixed(4));
      root.style.setProperty('--light-x', `${50 + x * 48 * prefs.intensity}%`);
      root.style.setProperty('--light-y', `${35 + y * 46 * prefs.intensity}%`);
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > 0.002)
        frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        last = 0;
      }
    };
    const target = (a: number, b: number) => {
      tx += (clamp(a) - tx) * 0.3;
      ty += (clamp(b) - ty) * 0.3;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const orientation = (e: DeviceOrientationEvent) => {
      if (
        e.beta == null ||
        e.gamma == null ||
        !Number.isFinite(e.beta) ||
        !Number.isFinite(e.gamma) ||
        Math.abs(e.beta) > 180 ||
        Math.abs(e.gamma) > 90
      )
        return;
      baseline ??= { beta: e.beta, gamma: e.gamma };
      const angle = ((screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI) / 180;
      // Avoid wrapping jumps across beta +/-180. Clamp outliers before low-pass filtering.
      const db = ((e.beta - baseline.beta + 540) % 360) - 180;
      if (Math.abs(db) > 85 || Math.abs(e.gamma - baseline.gamma) > 85) return;
      lastSignal = performance.now();
      received++;
      if (received === 1)
        reportSensor(true, 'receiving', '유효한 센서값을 받았어요. 현재 자세를 중립으로 사용해요.');
      if (received === 2 || sensorSnapshot.state === 'waiting')
        reportSensor(true, 'active', '기울이면 소재의 빛이 움직여요. 버튼과 글자는 고정돼요.');
      const a = clamp((e.gamma - baseline.gamma) / 24),
        b = clamp(db / 30);
      target(a * Math.cos(angle) + b * Math.sin(angle), b * Math.cos(angle) - a * Math.sin(angle));
    };
    const pointer = (e: PointerEvent) => {
      if (!sensor || performance.now() - lastSignal > 1500)
        target((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    };
    const center = () => {
      baseline = null;
      target(0, 0);
    };
    const calibrate = () => {
      center();
      received = 0;
      reportSensor(true, 'waiting', '현재 자세로 다시 보정해요. 다음 센서값을 기다려요.');
    };
    if (sensor) {
      reportSensor(true, 'waiting', '실제 센서값을 기다려요. 터치 반응도 사용할 수 있어요.');
      window.addEventListener('deviceorientation', orientation, { passive: true });
    }
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerdown', pointer, { passive: true });
    document.addEventListener('pointerleave', center);
    window.addEventListener('orientationchange', center);
    window.addEventListener('blur', center);
    window.addEventListener(CALIBRATE_EVENT, calibrate);
    const timeout = sensor
      ? window.setInterval(() => {
          if (performance.now() - lastSignal > 2200 && sensorSnapshot.state !== 'waiting') {
            received = 0;
            reportSensor(true, 'waiting', '센서 신호가 없어요. 터치와 포인터로 반응해요.');
          }
        }, 1000)
      : undefined;
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timeout);
      window.removeEventListener('deviceorientation', orientation);
      document.removeEventListener('pointermove', pointer);
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('pointerleave', center);
      window.removeEventListener('orientationchange', center);
      window.removeEventListener('blur', center);
      window.removeEventListener(CALIBRATE_EVENT, calibrate);
      root.style.setProperty('--sensor-x', '0');
      root.style.setProperty('--sensor-y', '0');
    };
  }, [sensor, quiet, prefs.intensity, prefs.id, prefs.lowPower, prefs.motion, reduce]);

  useEffect(() => {
    if (quiet) return;
    const layer = document.createElement('div');
    layer.className = 'material-touch-field';
    layer.setAttribute('aria-hidden', 'true');
    document.querySelector('.app-shell')?.append(layer);
    const down = (e: PointerEvent) => {
      if (
        e.pointerType === 'pen' ||
        document.documentElement.dataset.awakeCamera === 'true' ||
        e.clientX < 0 ||
        e.clientY < 0 ||
        e.clientX > innerWidth ||
        e.clientY > innerHeight
      )
        return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          '.learning-workspace,.problem-workspace,.pdf-reader,.digital-paper,input,textarea,select',
        )
      )
        return;
      while (layer.children.length >= 4) layer.firstChild?.remove();
      const pulse = document.createElement('span');
      pulse.className = 'material-touch';
      pulse.dataset.touch = prefs.id;
      pulse.style.setProperty('--touch-x', `${e.clientX}px`);
      pulse.style.setProperty('--touch-y', `${e.clientY}px`);
      pulse.append(document.createElement('i'), document.createElement('i'));
      pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
      layer.append(pulse);
    };
    document.addEventListener('pointerdown', down, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', down);
      layer.remove();
    };
  }, [quiet, prefs.id]);

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
