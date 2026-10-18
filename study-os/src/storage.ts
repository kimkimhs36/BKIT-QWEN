import { stateSchema, newState, type State } from './model';
export const KEY = 'bkit.study-os.v1';
export const LEARNING_BACKUP_KEY = KEY + '.before-learning-v3';
export class StorageConflict extends Error {}
export interface StoragePort {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export function readState(storage: StoragePort): {
  state: State;
  error: string;
  raw: string | null;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(KEY);
    return { state: raw ? stateSchema.parse(JSON.parse(raw)) : newState(), error: '', raw };
  } catch {
    return {
      state: newState(),
      raw,
      error:
        '저장 데이터를 읽지 못했습니다. 기존 저장본을 덮어쓰지 않습니다. 설정에서 원본을 내보내거나 검증된 백업을 가져오세요.',
    };
  }
}
export function writeState(storage: StoragePort, state: State, expectedRaw?: string | null) {
  const serialized = JSON.stringify(stateSchema.parse(state));
  const previous = storage.getItem(KEY);
  if (expectedRaw !== undefined && previous !== expectedRaw)
    throw new StorageConflict(
      '다른 탭에서 데이터가 변경되었습니다. 새로고침 전에 현재 기록을 내보내세요.',
    );
  // Preserve exact pre-upgrade bytes once; failure leaves the original untouched.
  if (previous !== null && storage.getItem(LEARNING_BACKUP_KEY) === null)
    storage.setItem(LEARNING_BACKUP_KEY, previous);
  storage.setItem(KEY, serialized);
  return serialized;
}
export function parseBackup(raw: string) {
  if (raw.length > 5_000_000) throw new Error('백업이 너무 큽니다.');
  return stateSchema.parse(JSON.parse(raw));
}
