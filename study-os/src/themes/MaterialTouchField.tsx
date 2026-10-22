import { useEffect, useRef } from 'react';
import type { MaterialId, MaterialPreferences } from './material';
import './material-touch-field.css';

// Each material has its own gesture and decay. A fixed pool bounds paint and memory.
const gestures: Record<MaterialId, { duration: number; from: string; to: string }> = {
  classic: { duration: 1600, from: 'scale(.45) rotate(-12deg)', to: 'scale(1.1) rotate(-4deg)' },
  forest: {
    duration: 2100,
    from: 'scale(.55,.35) rotate(-32deg)',
    to: 'scale(1.1,.9) rotate(-18deg)',
  },
  glass: {
    duration: 1700,
    from: 'scale(.32,.45) rotate(-18deg)',
    to: 'scale(1.15,.9) rotate(8deg)',
  },
  peach: { duration: 2200, from: 'scale(.45,.5) rotate(-8deg)', to: 'scale(1.15,1) rotate(10deg)' },
  diamond: { duration: 1450, from: 'scale(.35) rotate(-25deg)', to: 'scale(1.05) rotate(5deg)' },
  gold: {
    duration: 1700,
    from: 'translateX(-16%) scale(.5,.8) rotate(-24deg)',
    to: 'translateX(12%) scale(1.15,1) rotate(-24deg)',
  },
  jelly: {
    duration: 1900,
    from: 'scale(.4,.55) rotate(-12deg)',
    to: 'scale(1.05,.95) rotate(12deg)',
  },
  droplets: { duration: 1800, from: 'scale(.2)', to: 'scale(1.2)' },
  night: {
    duration: 1900,
    from: 'scale(.35,.18) rotate(-20deg)',
    to: 'scale(1.15,.7) rotate(-8deg)',
  },
};
const protectedTargets =
  'input,textarea,select,label,[contenteditable],dialog,[role="dialog"],nav,header,.learning-workspace,.digital-paper,.problem-workspace,.pdf-reader,.focus-card,.quick-timer';

/** Passive, decorative feedback. No per-frame React updates, canvas or gesture capture. */
export function MaterialTouchField({
  prefs,
  studying,
}: {
  prefs: MaterialPreferences;
  studying: boolean;
}) {
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const nodes = Array.from(field.current?.children || []) as HTMLElement[];
    let next = 0;
    let last = 0;
    const reset = () =>
      nodes.forEach((node) => {
        node.getAnimations().forEach((animation) => animation.cancel());
        node.removeAttribute('data-live');
      });
    const touch = (event: PointerEvent) => {
      if (
        media.matches ||
        prefs.motion !== 'auto' ||
        prefs.lowPower ||
        prefs.intensity <= 0 ||
        studying ||
        document.hidden ||
        !event.isPrimary
      )
        return;
      if (!(event.target instanceof Element) || event.target.closest(protectedTargets)) return;
      if (
        document.querySelector(
          '[role="dialog"],dialog[open],.digital-paper,.problem-workspace,.pdf-reader',
        )
      )
        return;
      const now = performance.now();
      if (now - last < 100) return;
      last = now;
      const node = nodes[next++ % nodes.length];
      if (!node) return;
      node.getAnimations().forEach((animation) => animation.cancel());
      node.style.left = `${event.clientX}px`;
      node.style.top = `${event.clientY}px`;
      node.dataset.live = prefs.id;
      const { duration, from, to } = gestures[prefs.id];
      const peak = 0.2 + prefs.intensity * 0.45;
      const animation = node.animate(
        [
          { opacity: 0, transform: from, offset: 0 },
          {
            opacity: peak,
            transform: prefs.id === 'jelly' ? 'scale(.88,1.02) rotate(-3deg)' : undefined,
            offset: 0.22,
          },
          { opacity: peak * 0.5, offset: 0.55 },
          { opacity: 0, transform: to, offset: 1 },
        ],
        { duration, easing: 'cubic-bezier(.16,.65,.3,1)', fill: 'none' },
      );
      animation.onfinish = () => {
        node.removeAttribute('data-live');
        animation.cancel();
      };
    };
    document.addEventListener('pointerdown', touch, { passive: true });
    document.addEventListener('visibilitychange', reset);
    document.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('blur', reset);
    media.addEventListener('change', reset);
    return () => {
      reset();
      document.removeEventListener('pointerdown', touch);
      document.removeEventListener('visibilitychange', reset);
      document.removeEventListener('scroll', reset);
      window.removeEventListener('blur', reset);
      media.removeEventListener('change', reset);
    };
  }, [prefs.id, prefs.motion, prefs.lowPower, prefs.intensity, studying]);
  return (
    <div ref={field} className="material-touch-field" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span key={index} className="material-touch-pulse">
          <i />
          <i />
          <i />
        </span>
      ))}
    </div>
  );
}
