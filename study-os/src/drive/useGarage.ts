import { useEffect, useState } from 'react';
import type { State } from '../model';
import { GARAGE_KEY, garageSchema, newGarage, rewardLearning, type GarageState } from './garage';

export function useGarage(study: State, blocked: boolean) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(GARAGE_KEY);
      return { value: raw ? garageSchema.parse(JSON.parse(raw)) : newGarage(), error: '' };
    } catch {
      return {
        value: newGarage(),
        error:
          '차고 저장값을 읽지 못했어요. 원본을 보존하고 변경을 잠갔어요. 설정에서 ZIP 백업을 보관해 주세요.',
      };
    }
  });
  const [garage, setGarage] = useState(initial.value);
  const [error, setError] = useState(initial.error);
  async function update(change: (value: GarageState) => GarageState) {
    if (blocked || initial.error) {
      setError(initial.error || '학습 저장 잠금 중에는 차고도 변경할 수 없어요.');
      return false;
    }
    const persist = () => {
      try {
        // Read the latest tab's balance before every purchase/reward. Persist before rendering.
        const raw = localStorage.getItem(GARAGE_KEY);
        const current = raw ? garageSchema.parse(JSON.parse(raw)) : initial.value;
        const next = garageSchema.parse(change(current));
        if (JSON.stringify(next) !== raw) localStorage.setItem(GARAGE_KEY, JSON.stringify(next));
        setGarage(next);
        setError('');
        return true;
      } catch {
        setError(
          '차고를 저장하지 못했어요. 기존 차량과 크레딧을 유지했어요. 저장 공간과 다른 탭을 확인해 주세요.',
        );
        return false;
      }
    };
    // Web Locks serializes simultaneous purchases/rewards across modern Safari tabs.
    try {
      return navigator.locks ? await navigator.locks.request(GARAGE_KEY, persist) : persist();
    } catch {
      setError('차고 저장 잠금을 얻지 못했어요. 다시 시도해 주세요.');
      return false;
    }
  }
  useEffect(() => {
    if (!blocked && !initial.error) update((g) => rewardLearning(g, study, Date.now()));
  }, [study, blocked]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key !== GARAGE_KEY) return;
      try {
        setGarage(e.newValue ? garageSchema.parse(JSON.parse(e.newValue)) : initial.value);
      } catch {
        setError('다른 탭의 차고 저장값을 읽지 못했어요. 원본을 보존했어요.');
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return { garage, error, update };
}
export type GarageController = ReturnType<typeof useGarage>;
