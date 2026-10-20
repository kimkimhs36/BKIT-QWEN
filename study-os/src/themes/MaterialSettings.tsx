import { useState } from 'react';
import { Check, ArrowRight, Play } from 'lucide-react';
import { materials, type MaterialPreferences } from './material';
const PRIMARY = ['classic', 'forest', 'glass', 'jelly'];
export function MaterialSettings({
  prefs,
  onChange,
}: {
  prefs: MaterialPreferences;
  onChange: (p: MaterialPreferences) => void;
}) {
  const [draft, setDraft] = useState(prefs);
  const selected = materials.find((m) => m.id === draft.id)!;
  const dirty = JSON.stringify(draft) !== JSON.stringify(prefs);
  return (
    <section className="panel study-appearance" aria-label="재질 테마 설정">
      <div className="study-section-heading">
        <div>
          <span className="study-kicker">MAKE ROOM FOR FOCUS</span>
          <h2>나에게 편안한 공부 공간</h2>
          <p>네 가지 표면, 같은 차분함. 마음에 드는 빛을 골라보세요.</p>
        </div>
      </div>
      <div className="study-appearance-grid">
        <div className="study-theme-options" role="group" aria-label="테마 미리보기 선택">
          {PRIMARY.map((id) => {
            const m = materials.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                data-swatch={id}
                aria-pressed={draft.id === id}
                onClick={() => setDraft({ ...draft, id: m.id })}
              >
                <span className="study-theme-chip" data-preview={id}>
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.description}</small>
                </span>
                <span className="study-theme-check">{draft.id === id && <Check size={16} />}</span>
              </button>
            );
          })}
          <details className="study-legacy-themes">
            <summary>이전 테마 · 추후 개선 예정</summary>
            <p>기존 설정은 계속 사용할 수 있어요.</p>
            {materials
              .filter((m) => !PRIMARY.includes(m.id))
              .map((m) => (
                <button
                  key={m.id}
                  aria-pressed={draft.id === m.id}
                  onClick={() => setDraft({ ...draft, id: m.id })}
                >
                  {m.name}
                  {draft.id === m.id && <Check size={15} />}
                </button>
              ))}
          </details>
        </div>
        <div
          className="study-theme-preview"
          data-preview={draft.id}
          aria-label={selected.name + ' 미리보기'}
        >
          <span className="study-kicker">MY STUDY SPACE / {selected.name}</span>
          <h3>
            {{
              classic: '생각이 머무는 자리.',
              forest: '깊은 숲처럼, 고요하게.',
              glass: '빛은 투명하게, 생각은 선명하게.',
              jelly: '조금 더 부드러운 하루.',
            }[draft.id as 'classic' | 'forest' | 'glass' | 'jelly'] ?? '나만의 공부 공간.'}
          </h3>
          <div className="study-preview-focus">
            <span>지금, 한 가지에 집중</span>
            <b>
              05<span>:</span>00
            </b>
            <small>나를 위한 다섯 분</small>
            <span className="study-preview-button">
              <Play size={14} fill="currentColor" />
              공부 시작
            </span>
          </div>
          <div className="study-preview-nav">
            <span>오늘</span>
            <span>집중</span>
            <span>할 일</span>
            <span>기록</span>
          </div>
          <small>적용 전 미리보기</small>
        </div>
      </div>
      <div className="study-appearance-controls">
        <label>
          <span>
            앱 움직임<small>기기 설정과 별개로 선택해요</small>
          </span>
          <select
            aria-label="테마 움직임"
            value={draft.motion}
            onChange={(e) =>
              setDraft({ ...draft, motion: e.target.value as MaterialPreferences['motion'] })
            }
          >
            <option value="auto">부드럽게</option>
            <option value="reduced">최소한으로</option>
            <option value="off">사용 안 함</option>
          </select>
        </label>
        <label>
          <span>
            배터리 절약<small>투명 효과와 움직임 줄이기</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={draft.lowPower}
            onChange={(e) => setDraft({ ...draft, lowPower: e.target.checked })}
          />
        </label>
      </div>
      <div className="study-theme-apply">
        <span role="status">
          {dirty ? '선택한 테마를 미리 보고 있어요.' : `${selected.name} 적용 중`}
        </span>
        <button className="primary" disabled={!dirty} onClick={() => onChange(draft)}>
          {dirty ? '이 테마 적용' : '적용 중'}
          {dirty ? <ArrowRight size={16} /> : <Check size={16} />}
        </button>
      </div>
    </section>
  );
}
