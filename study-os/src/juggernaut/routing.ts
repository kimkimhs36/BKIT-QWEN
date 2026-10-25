import { useEffect, useState } from 'react';
export const root =
  (import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')) +
  '/juggernaut';
export function isJuggernautPath() {
  return location.pathname === root || location.pathname.startsWith(root + '/');
}
export function useJuggernautPath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const change = () => setPath(location.pathname);
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, []);
  return path;
}
