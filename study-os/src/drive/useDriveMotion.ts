import { useEffect, useState } from 'react';
import type { GarageState } from './garage';

export function useDriveMotion(g: GarageState) {
  const [suppressed, setSuppressed] = useState(
    () => document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSuppressed(document.hidden || media.matches);
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      media.removeEventListener('change', update);
    };
  }, []);
  return suppressed || g.reduceMotion || g.hideAnimations;
}
