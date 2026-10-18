import { useEffect, useRef, useState } from 'react';
import { SLEEP_KEY, readSleep, sleepSchema, sleepStatus, type SleepState } from './sleep';

export function useSleepGuard(now: number, studying: boolean) {
  const [initial] = useState(() => readSleep(localStorage));
  const [state, setState] = useState(initial.state);
  const [error, setError] = useState(initial.error);
  const [blocked, setBlocked] = useState(!!initial.error);
  const memory = useRef(state),
    raw = useRef(initial.raw);
  const status = sleepStatus(now, state, studying);
  function commit(change: (previous: SleepState) => SleepState) {
    if (blocked) return false;
    try {
      if (localStorage.getItem(SLEEP_KEY) !== raw.current) {
        setBlocked(true);
        setError('다른 탭에서 수면 기록이 바뀌었습니다. 새로고침하여 최신 기록을 확인해 주세요.');
        return false;
      }
      const next = sleepSchema.parse(change(memory.current));
      const serialized = JSON.stringify(next);
      localStorage.setItem(SLEEP_KEY, serialized);
      raw.current = serialized;
      memory.current = next;
      setState(next);
      setError('');
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes('기상 시각')
          ? '기상 시각은 취침 시각보다 뒤여야 합니다.'
          : '수면 기록을 저장하지 못했습니다. 입력값 또는 기기 저장 공간을 확인해 주세요. 기존 기록은 유지됩니다.',
      );
      return false;
    }
  }
  function restore(incoming: SleepState) {
    try {
      const validated = sleepSchema.parse(incoming);
      const previous = localStorage.getItem(SLEEP_KEY);
      // Recovery is explicit. Keep the exact previous bytes even when parsing failed.
      if (previous !== null) localStorage.setItem(SLEEP_KEY + '.recovery.' + Date.now(), previous);
      const serialized = JSON.stringify(validated);
      localStorage.setItem(SLEEP_KEY, serialized);
      raw.current = serialized;
      memory.current = validated;
      setState(validated);
      setBlocked(false);
      setError('');
      return true;
    } catch {
      setError('복구하지 못했습니다. 백업 파일과 기기 저장 공간을 확인해 주세요.');
      return false;
    }
  }
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SLEEP_KEY) return;
      const next = readSleep(localStorage);
      raw.current = next.raw;
      memory.current = next.state;
      setState(next.state);
      setBlocked(!!next.error);
      setError(next.error);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.sleepNight = String(status.night);
    return () => {
      delete document.documentElement.dataset.sleepNight;
    };
  }, [status.night]);
  useEffect(() => {
    if (
      !status.available ||
      studying ||
      !state.reminders ||
      status.phase === 'day' ||
      document.visibilityState !== 'visible'
    )
      return;
    const id = status.key + ':' + status.phase;
    if (state.notified.includes(id)) return;
    // One reminder per phase, never a delayed burst when returning to the app.
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!commit((s) => ({ ...s, notified: [...s.notified.slice(-99), id] }))) return;
    void (async () => {
      const title =
        status.phase === 'prepare' ? 'Sleep Guard · 취침 준비' : 'Sleep Guard · 오늘은 여기까지';
      const options = {
        body: '공부 정리와 취침 준비를 직접 확인해 주세요.',
        tag: 'bkit-sleep-' + id,
      };
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) await registration.showNotification(title, options);
        else new Notification(title, options);
      } catch {
        /* The in-app status remains usable if OS delivery fails. */
      }
    })();
  }, [status.key, status.phase, status.available, studying, state.reminders, state.notified]);
  return { state, status, commit, restore, error, blocked };
}
export type SleepController = ReturnType<typeof useSleepGuard>;
