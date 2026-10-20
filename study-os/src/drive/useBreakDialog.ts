import { useEffect, useRef, useState } from 'react';

/** One short break deadline supplied by the host; switching activities never restarts it. */
export function useBreakDialog(until: number, onReturn: () => void) {
  const dialog = useRef<HTMLDialogElement>(null);
  const exit = useRef(onReturn);
  exit.current = onReturn;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const d = dialog.current;
    const overflow = document.body.style.overflow;
    d?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      d?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    const check = () => {
      const t = Date.now();
      setNow(t);
      if (t >= until) exit.current();
    };
    check();
    const timer = setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [until]);
  return { dialog, seconds: Math.max(0, Math.ceil((until - now) / 1000)) };
}
