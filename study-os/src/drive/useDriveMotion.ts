import { useEffect, useState } from 'react';
import type { GarageState } from './garage';

export function useDriveMotion(g: GarageState) {
  const [suppressed, setSuppressed] = useState(
    () =>
      document.hidden ||
      document.documentElement.dataset.effects === 'none' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      setSuppressed(
        document.hidden || media.matches || document.documentElement.dataset.effects === 'none',
      );
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', update);
    window.addEventListener('bkit:effects', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      media.removeEventListener('change', update);
      window.removeEventListener('bkit:effects', update);
    };
  }, []);
  return suppressed || g.reduceMotion || g.hideAnimations;
}
