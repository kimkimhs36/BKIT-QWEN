import { Check } from 'lucide-react';
import { materials, type MaterialPreferences } from './material';
import { MaterialSensorControl } from './MaterialEffects';
export const materialLabels: Record<MaterialPreferences['id'], string> = {
  classic: '클래식 라이트',
  forest: '포레스트 다크',
  glass: '리퀴드 글래스',
  peach: '피치 플로우',
  diamond: '다이아몬드',
  gold: '샴페인 골드',
  jelly: '소프트 젤리',
  droplets: '리빙 드롭렛',
  night: '나이트 스프린트',
};
/** Apply display preferences immediately, independently of learning storage. */
export function MaterialSettings({
  prefs,
  onChange,
}: {
  prefs: MaterialPreferences;
  onChange: (p: MaterialPreferences) => void;
}) {
  return (
    <section className="theme-picker" aria-label="재질 테마 설정">
      <p className="theme-picker-caption">지금의 기분에 어울리는 빛을 골라보세요.</p>
      <div className="theme-picker-grid" role="group" aria-label="테마 선택">
        {materials.map((m) => (
          <button
            key={m.id}
            className="theme-choice"
            data-swatch={m.id}
            aria-label={m.name}
            aria-pressed={prefs.id === m.id}
            onClick={() => onChange({ ...prefs, id: m.id })}
          >
            <span className="theme-swatch" data-preview={m.id} aria-hidden="true">
              <i />
              <i />
              {prefs.id === m.id && (
                <span className="theme-selected">
                  <Check size={14} />
                </span>
              )}
            </span>
            <strong>{materialLabels[m.id]}</strong>
          </button>
        ))}
      </div>
      <div className="theme-picker-controls">
        <label>
          <span>움직임</span>
          <select
            aria-label="테마 움직임"
            value={prefs.motion}
            onChange={(e) =>
              onChange({ ...prefs, motion: e.target.value as MaterialPreferences['motion'] })
            }
          >
            <option value="auto">부드럽게</option>
            <option value="reduced">최소한으로</option>
            <option value="off">사용 안 함</option>
          </select>
        </label>
        <label>
          <span>빛과 물결의 강도</span>
          <input
            aria-label="테마 효과 강도"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={prefs.intensity}
            onChange={(e) => onChange({ ...prefs, intensity: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>배터리 절약</span>
          <input
            type="checkbox"
            role="switch"
            aria-label="배터리 절약"
            checked={prefs.lowPower}
            onChange={(e) => onChange({ ...prefs, lowPower: e.target.checked })}
          />
        </label>
      </div>
      <MaterialSensorControl />
      <p className="theme-picker-status" role="status">
        {materialLabels[prefs.id]} 적용 중 · 자동 저장
      </p>
    </section>
  );
}
