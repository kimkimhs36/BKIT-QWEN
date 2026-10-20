import { useEffect, useRef, useState } from 'react';
import { KEY } from './storage';

/** One study writer per origin. localStorage's read/check/write is not atomic
 * across renderer processes; the existing raw-value check still protects
 * against older clients and browsers without Web Locks. No user data is stored
 * in the lock, and a closed/crashed page releases ownership automatically. */
export function useStudyWriter() {
  const supported = typeof navigator.locks?.request === 'function';
  const [ready, setReady] = useState(!supported);
  const writable = useRef(!supported);
  useEffect(() => {
    if (!supported) return;
    let disposed = false;
    let request: AbortController | undefined;
    let release: (() => void) | undefined;
    const stop = () => {
      writable.current = false;
      setReady(false);
      request?.abort();
      release?.();
    };
    const acquire = () => {
      if (disposed || (request && !request.signal.aborted)) return;
      const controller = new AbortController();
      request = controller;
      void navigator.locks.request(KEY + '.writer', { signal: controller.signal }, async () => {
        if (disposed || controller.signal.aborted) return;
        writable.current = true;
        setReady(true);
        await new Promise<void>((resolve) => {
          release = resolve;
          controller.signal.addEventListener('abort', () => resolve(), { once: true });
        });
        if (request === controller) writable.current = false;
      }).catch(() => {
        // Fail closed: a failed lock request must never enable concurrent writes.
        if (!disposed && request === controller) { writable.current = false; setReady(false); }
      });
    };
    acquire();
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', acquire);
    return () => {
      disposed = true;
      stop();
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('pageshow', acquire);
    };
  }, [supported]);
  return { ready, canWrite: () => writable.current };
}
