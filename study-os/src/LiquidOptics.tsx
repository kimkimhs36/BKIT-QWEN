import { useEffect, useState } from 'react';
import { makeLensBytes } from './liquidMath';

/**
 * The optical layer is separate from content. Focus labels, links, and buttons
 * remain sharp, editable and screen-reader friendly.
 *
 * Chromium can use our SVG displacement maps in backdrop-filter.
 * Safari/iOS uses the same map on its light-field layer with a native
 * frosted backdrop (WebKit does not reliably displace the live backdrop).
 */
function pngMap(w: number, h: number, radius: number) {
  const surface = document.createElement('canvas');
  surface.width = w;
  surface.height = h;
  const ctx = surface.getContext('2d');
  if (!ctx) return '';
  const pixels = makeLensBytes(w, h, radius);
  const rgba = ctx.createImageData(w, h);
  rgba.data.set(pixels);
  ctx.putImageData(rgba, 0, 0);
  return surface.toDataURL('image/png');
}

export function LiquidOptics() {
  const [map, setMap] = useState({ dock: '', panel: '' });
  useEffect(() => {
    try {
      setMap({
        dock: pngMap(400, 96, 38),
        panel: pngMap(340, 228, 34),
      });
    } catch {
      // No canvas or a restricted context: layered CSS is the safe fallback.
    }
    const root = document.documentElement;
    // All iOS browsers use WebKit. SVG filters on CSS backdrop-filter have no
    // dependable WebKit path: never disable the native blur fallback there.
    const isBlink = /(?:Chrome\/|Chromium\/|Edg\/)/.test(navigator.userAgent) &&
      !/(?:CriOS|EdgiOS|FxiOS|OPiOS)/.test(navigator.userAgent);
    root.dataset.bkitGlassEngine = isBlink ? 'svg-backdrop' : 'layered';

    const targets = '.orbit-nav, .home-primary .command-stage, .primary, .secondary, .material-specimen-touch';
    let frame = 0;
    let recent: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const event = recent;
      if (!event || root.dataset.effects === 'none') return;
      const node = event.target instanceof Element ? event.target.closest(targets) : null;
      if (!(node instanceof HTMLElement)) return;
      const r = node.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      node.style.setProperty('--liquid-x', ((event.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      node.style.setProperty('--liquid-y', ((event.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || root.dataset.effects === 'none') return;
      recent = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const down = (event: PointerEvent) => {
      if (root.dataset.effects === 'none') return;
      const node = event.target instanceof Element ? event.target.closest(targets) : null;
      if (node instanceof HTMLElement) {
        node.classList.add('liquid-pressed');
        const r = node.getBoundingClientRect();
        node.style.setProperty('--liquid-x', ((event.clientX - r.left) / Math.max(1, r.width) * 100).toFixed(1) + '%');
        node.style.setProperty('--liquid-y', ((event.clientY - r.top) / Math.max(1, r.height) * 100).toFixed(1) + '%');
      }
    };
    const release = () => document.querySelectorAll('.liquid-pressed').forEach((node) => {
      node.classList.remove('liquid-pressed');
    });
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      recent = null;
      release();
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', reset, { passive: true });
    window.addEventListener('blur', reset);
    return () => {
      release();
      cancelAnimationFrame(frame);
      root.removeAttribute('data-bkit-glass-engine');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
  return (
    <svg
      className="bkit-liquid-filters"
      width="0" height="0" aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="bkit-liquid-dock" x="-5%" y="-25%" width="110%" height="150%" colorInterpolationFilters="sRGB">
          {map.dock && <feImage href={map.dock} result="lens" preserveAspectRatio="none" />}
          <feDisplacementMap in="SourceGraphic" in2="lens" scale="38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="bkit-liquid-panel" x="-8%" y="-12%" width="116%" height="124%" colorInterpolationFilters="sRGB">
          {map.panel && <feImage href={map.panel} result="lens" preserveAspectRatio="none" />}
          <feDisplacementMap in="SourceGraphic" in2="lens" scale="30" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
