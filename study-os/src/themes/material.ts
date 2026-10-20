import type { BkitTheme } from '../theme';
export const MATERIAL_KEY = 'bkit.material.v1';
export const materials = [
  {
    id: 'classic',
    name: 'Classic Light',
    base: 'light',
    description: '정돈된 종이와 세이지',
    color: '#e9eddf',
  },
  {
    id: 'forest',
    name: 'Forest Dark',
    base: 'dark',
    description: '깊은 숲, 편안한 대비',
    color: '#243e32',
  },
  {
    id: 'glass',
    name: 'Liquid Glass',
    base: 'light',
    description: '서리 유리와 맑은 반사',
    color: '#d8e8ec',
  },
  {
    id: 'peach',
    name: 'Peach Flow',
    base: 'light',
    description: '피치·코랄·크림의 느린 흐름',
    color: '#f1ccbb',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    base: 'light',
    description: '정밀한 모서리와 프리즘',
    color: '#dce1ef',
  },
  {
    id: 'gold',
    name: 'Champagne Gold',
    base: 'light',
    description: '은은한 금빛과 새틴',
    color: '#e8d9b7',
  },
  {
    id: 'jelly',
    name: 'Soft Jelly',
    base: 'light',
    description: '부드러운 표면과 탄성',
    color: '#e5dcef',
  },
  {
    id: 'droplets',
    name: 'Living Droplets',
    base: 'light',
    description: '물결과 표면 장력',
    color: '#cfe8e3',
  },
  {
    id: 'night',
    name: 'Night Sprint',
    base: 'dark',
    description: '차분한 야간 주행',
    color: '#202a3b',
  },
] as const;
export type MaterialId = (typeof materials)[number]['id'];
export type MaterialPreferences = {
  id: MaterialId;
  motion: 'auto' | 'reduced' | 'off';
  intensity: number;
  lowPower: boolean;
};
export function restoreMaterial(
  storage: Pick<Storage, 'getItem'>,
  base: BkitTheme,
): MaterialPreferences {
  const fallback: MaterialPreferences = {
    id: base === 'dark' ? 'forest' : 'classic',
    motion: 'auto',
    intensity: 0.5,
    lowPower: false,
  };
  try {
    const raw = JSON.parse(storage.getItem(MATERIAL_KEY) || 'null');
    if (
      !raw ||
      !materials.some((m) => m.id === raw.id) ||
      !['auto', 'reduced', 'off'].includes(raw.motion) ||
      !Number.isFinite(raw.intensity) ||
      raw.intensity < 0 ||
      raw.intensity > 1 ||
      typeof raw.lowPower !== 'boolean'
    )
      return fallback;
    // The longstanding light/dark preference remains authoritative.
    return {
      ...raw,
      id: materials.find((m) => m.id === raw.id)!.base === base ? raw.id : fallback.id,
    };
  } catch {
    return fallback;
  }
}
export function saveMaterial(storage: Pick<Storage, 'setItem'>, prefs: MaterialPreferences) {
  try {
    storage.setItem(MATERIAL_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}
