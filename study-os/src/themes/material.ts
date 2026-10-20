import { THEME_KEY, type BkitTheme } from '../theme';
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
    description: '살아 있는 피치 세계 위, 맑고 투명한 유리',
    color: '#f5c7ae',
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
    id: base === 'dark' ? 'forest' : 'glass',
    motion: 'auto',
    intensity: 0.5,
    lowPower: false,
  };
  try {
    // An explicit legacy light/dark choice counts as an existing preference.
    // Only a person with no saved theme choice receives the new glass default.
    if (base === 'light' && storage.getItem(THEME_KEY) !== null) fallback.id = 'classic';
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

/** Presentation and physics are independent of the preserved preference schema. */
export const materialCharacter: Record<
  MaterialId,
  {
    finish: string;
    story: string;
    index: string;
    stiffness: number;
    damping: number;
  }
> = {
  classic: {
    finish: 'PAPER / SAGE',
    story: '빛이 내려앉은 종이, 생각을 위한 여백.',
    index: '01',
    stiffness: 420,
    damping: 36,
  },
  forest: {
    finish: 'MATTE / VELVET',
    story: '깊은 숲의 고요를 책상 위에.',
    index: '02',
    stiffness: 360,
    damping: 34,
  },
  glass: {
    finish: 'OPTICAL / CLEAR',
    story: '빛은 통과하고, 생각은 선명하게.',
    index: '03',
    stiffness: 390,
    damping: 26,
  },
  peach: {
    finish: 'CERAMIC / SATIN',
    story: '따뜻한 빛을 머금은 세라믹.',
    index: '04',
    stiffness: 300,
    damping: 28,
  },
  diamond: {
    finish: 'FACET / PRISM',
    story: '정밀한 면 사이로 스미는 빛.',
    index: '05',
    stiffness: 520,
    damping: 34,
  },
  gold: {
    finish: 'BRUSHED / CHAMPAGNE',
    story: '시간을 들여 가공한, 차분한 금속.',
    index: '06',
    stiffness: 560,
    damping: 38,
  },
  jelly: {
    finish: 'SOFT / ELASTIC',
    story: '누르면 부드럽게, 놓으면 가볍게.',
    index: '07',
    stiffness: 235,
    damping: 13,
  },
  droplets: {
    finish: 'WATER / TENSION',
    story: '작은 물방울에 담긴 맑은 집중.',
    index: '08',
    stiffness: 190,
    damping: 16,
  },
  night: {
    finish: 'INSTRUMENT / PRECISION',
    story: '조용한 밤, 나만의 속도로.',
    index: '09',
    stiffness: 640,
    damping: 40,
  },
};
