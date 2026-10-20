import { useEffect, useState } from 'react';
import type { GarageState } from './garage';

export function useDriveMotion(g: GarageState) {
  const [suppressed, setSuppressed] = useState(
    () =>
      document.hidden ||
      document.documentElement.dataset.effects === 'none',
  );
  useEffect(() => {
    const update = () =>
      setSuppressed(
        document.hidden || document.documentElement.dataset.effects === 'none',
      );
    document.addEventListener('visibilitychange', update);
    window.addEventListener('bkit:effects', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('bkit:effects', update);
    };
  }, []);
  return suppressed || g.reduceMotion || g.hideAnimations;
}
