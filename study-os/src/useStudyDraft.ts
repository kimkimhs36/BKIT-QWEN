import { useEffect, useRef, useState } from 'react';

/** Small text drafts share the existing state transaction and navigation guard. */
export function useStudyDraft(initial: string, onSave: (value: string) => boolean) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<'saved' | 'pending' | 'error'>('saved');
  const latest = useRef({ value, saved: initial, onSave });
  latest.current.value = value;
  latest.current.onSave = onSave;
  const flush = () => {
    const draft = latest.current;
    if (draft.value === draft.saved) return true;
    if (!draft.onSave(draft.value)) {
      setStatus('error');
      return false;
    }
    draft.saved = draft.value;
    setStatus('saved');
    return true;
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    if (value === latest.current.saved) return;
    setStatus('pending');
    const timer = window.setTimeout(() => flushRef.current(), 400);
    return () => clearTimeout(timer);
  }, [value]);
  useEffect(() => {
    const guard = (event: Event) => {
      if (!flushRef.current()) event.preventDefault();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (!flushRef.current()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const hide = () => {
      if (document.visibilityState === 'hidden') flushRef.current();
    };
    document.addEventListener('bkit:flush-learning-draft', guard);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', guard);
    window.addEventListener('beforeunload', unload);
    return () => {
      document.removeEventListener('bkit:flush-learning-draft', guard);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', guard);
      window.removeEventListener('beforeunload', unload);
    };
  }, []);
  return { value, setValue, flush, status };
}
