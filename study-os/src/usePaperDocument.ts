import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaperDocument } from './paperModel';
import { savePaperDocument } from './paperStorage';
export function usePaperDocument(initial: PaperDocument) {
  const [doc, setDoc] = useState(initial),
    [status, setStatus] = useState('저장됨'),
    [error, setError] = useState('');
  const pendingResume = useRef<(() => void) | undefined>(undefined);
  const current = useRef(initial),
    dirty = useRef(false),
    running = useRef(false),
    generation = useRef(0),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (running.current || !dirty.current) return;
    running.current = true;
    const g = generation.current,
      snapshot = current.current;
    if (mounted.current) setStatus('저장 중…');
    try {
      const saved = await savePaperDocument(snapshot);
      current.current = {
        ...current.current,
        revision: saved.revision,
        updatedAt: saved.updatedAt,
      };
      dirty.current = g !== generation.current;
      if (mounted.current) {
        setDoc(current.current);
        setError('');
        setStatus(dirty.current ? '저장 대기' : '저장됨');
        if (!dirty.current && pendingResume.current) {
          const resume = pendingResume.current;
          pendingResume.current = undefined;
          queueMicrotask(resume);
        }
      }
    } catch (e) {
      if (mounted.current) {
        setError((e as Error).message);
        setStatus('미저장 필기 있음');
      }
    } finally {
      running.current = false;
    }
    if (dirty.current && g !== generation.current)
      timer.current = setTimeout(() => void save(), 100);
  }, []);
  const edit = useCallback(
    (fn: (d: PaperDocument) => PaperDocument) => {
      const next = fn(current.current);
      if (next === current.current) return;
      current.current = next;
      dirty.current = true;
      generation.current++;
      setDoc(current.current);
      setStatus('저장 대기');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 220);
    },
    [save],
  );
  useEffect(() => {
    mounted.current = true;
    const guard = (e: Event) => {
      if (dirty.current) {
        e.preventDefault();
        const resume = (e as CustomEvent<{ resume?: () => void }>).detail?.resume;
        if (resume) pendingResume.current = resume;
        void save();
        setStatus('필기 저장 후 이동합니다…');
      }
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
        void save();
      }
    };
    const hide = () => {
      if (document.visibilityState === 'hidden') void save();
    };
    document.addEventListener('bkit:flush-learning-draft', guard);
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', hide);
    return () => {
      mounted.current = false;
      document.removeEventListener('bkit:flush-learning-draft', guard);
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', hide);
      void save();
    };
  }, [save]);
  return { doc, edit, save, status, error, isDirty: () => dirty.current };
}
