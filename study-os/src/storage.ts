import { stateSchema, newState, type State } from './model';
export const KEY = 'bkit.study-os.v1';
export interface StoragePort {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export function readState(storage: StoragePort): { state: State; error: string } {
  try {
    const raw = storage.getItem(KEY);
    return { state: raw ? stateSchema.parse(JSON.parse(raw)) : newState(), error: '' };
  } catch {
    return {
      state: newState(),
      error:
        '저장 데이터를 읽지 못했습니다. 기존 저장본을 덮어쓰지 않습니다. 설정에서 원본을 내보내거나 검증된 백업을 가져오세요.',
    };
  }
}
export function writeState(storage: StoragePort, state: State) {
  storage.setItem(KEY, JSON.stringify(stateSchema.parse(state)));
}
export function parseBackup(raw: string) {
  if (raw.length > 5_000_000) throw new Error('백업이 너무 큽니다.');
  return stateSchema.parse(JSON.parse(raw));
}
