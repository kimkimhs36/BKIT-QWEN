import { useState } from 'react';
import { materials, type MaterialPreferences } from './material';
import './materials.css';
export function MaterialSettings({
  prefs,
  onChange,
}: {
  prefs: MaterialPreferences;
  onChange: (p: MaterialPreferences) => void;
}) {
  const [preview, setPreview] = useState(prefs.id);
  const item = materials.find((m) => m.id === preview)!;
  return (
    <section className="panel material-settings" aria-label="재질 테마 설정">
      <span className="eyebrow">SURFACE / MOTION</span>
      <h2>내 공부 공간의 재질</h2>
      <p>미리 보고 선택하세요. 학습 기록은 그대로 유지돼요.</p>
      <div className="material-comparison">
        <div className="material-choices" role="group" aria-label="테마 미리보기 선택">
          {materials.map((m) => (
            <button key={m.id} aria-pressed={preview === m.id} onClick={() => setPreview(m.id)}>
              <i style={{ background: m.color }} />
              {m.name}
              {prefs.id === m.id && <small>적용 중</small>}
            </button>
          ))}
        </div>
        <div className="material-preview-column">
          <div
            className="material-preview"
            role="region"
            data-preview={preview}
            aria-label={item.name + ' 미리보기'}
          >
            <span className="eyebrow">{item.name}</span>
            <h3>다음 한 문제, 가볍게.</h3>
            <p>{item.description}</p>
            <div className="material-sample-card">
              <span>오늘의 공부</span>
              <strong>5분부터 시작해요</strong>
              <div className="material-sample-dial">
                <span>◴</span>
                <b>05:00</b>
                <small>DRIVE · READY</small>
              </div>
              <label>
                오늘의 한 문장
                <input readOnly value="한 문제에 집중하기" tabIndex={-1} />
              </label>
              <button type="button" tabIndex={-1}>
                공부 시작 · 예시
              </button>
            </div>
            <div className="material-sample-nav" aria-hidden="true">
              오늘　 ·　 과제　 ·　 집중　 ·　 기록
            </div>
          </div>
          <button
            className="primary material-apply"
            disabled={prefs.id === preview}
            onClick={() => onChange({ ...prefs, id: preview })}
          >
            {prefs.id === preview ? '적용된 테마' : item.name + ' 적용'}
          </button>
        </div>
      </div>
      <div className="material-controls">
        <label>
          움직임
          <select
            value={prefs.motion}
            onChange={(e) =>
              onChange({ ...prefs, motion: e.target.value as MaterialPreferences['motion'] })
            }
          >
            <option value="auto">기기 설정 따르기</option>
            <option value="reduced">모션 감소</option>
            <option value="off">애니메이션 OFF</option>
          </select>
        </label>
        <label>
          효과 강도 · {Math.round(prefs.intensity * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={prefs.intensity}
            onChange={(e) => onChange({ ...prefs, intensity: Number(e.target.value) })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.lowPower}
            onChange={(e) => onChange({ ...prefs, lowPower: e.target.checked })}
          />
          배터리 절약 · 정적 재질
        </label>
      </div>
      <p className="muted">
        기기의 모션 감소를 우선해요. 집중 중·비활성 탭에서는 배경 움직임을 줄여요.
      </p>
    </section>
  );
}
