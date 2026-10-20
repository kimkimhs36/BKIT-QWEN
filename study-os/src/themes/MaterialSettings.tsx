import { useState } from 'react';
import { ArrowRight, Check, MoveUpRight, Pause, Play } from 'lucide-react';
import { materials, materialCharacter, type MaterialPreferences } from './material';
import { MaterialObject } from './MaterialObject';
import { MaterialSensorControl } from './MaterialEffects';
import './materials.css';

export function MaterialSettings({
  prefs,
  onChange,
}: {
  prefs: MaterialPreferences;
  onChange: (p: MaterialPreferences) => void;
}) {
  const [draft, setDraft] = useState(prefs);
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);
  const item = materials.find((m) => m.id === draft.id)!;
  const character = materialCharacter[draft.id];
  const dirty =
    draft.id !== prefs.id ||
    draft.motion !== prefs.motion ||
    draft.intensity !== prefs.intensity ||
    draft.lowPower !== prefs.lowPower;
  return (
    <section className="panel material-settings" aria-label="재질 테마 설정">
      <div className="material-showroom-head">
        <div>
          <span className="eyebrow">THE MATERIAL COLLECTION / 01—09</span>
          <h2>집중에도, 취향이 있으니까.</h2>
          <p>아홉 가지 소재로 완성하는 나의 공부 공간.</p>
        </div>
        <span className="material-edition">
          BKIT
          <br />
          ATELIER ©26
        </span>
      </div>
      <div className="material-comparison">
        <div className="material-choices" role="group" aria-label="테마 미리보기 선택">
          {materials.map((m) => (
            <button
              key={m.id}
              data-swatch={m.id}
              aria-pressed={draft.id === m.id}
              onClick={() => {
                setDraft({ ...draft, id: m.id });
                setTouched(false);
              }}
            >
              <span className="material-swatch" data-preview={m.id}>
                <MaterialObject id={m.id} compact />
              </span>
              <span className="material-choice-copy">
                <small>
                  {materialCharacter[m.id].index} / {materialCharacter[m.id].finish}
                </small>
                <strong>{m.name}</strong>
              </span>
              {prefs.id === m.id ? (
                <Check size={15} aria-label="적용 중" />
              ) : (
                <MoveUpRight size={14} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <div className="material-preview-column">
          <div
            className="material-preview"
            role="region"
            data-preview={draft.id}
            data-preview-motion={draft.motion === 'auto' && !draft.lowPower ? 'auto' : 'none'}
            style={{ '--material-intensity': draft.intensity } as React.CSSProperties}
            aria-label={item.name + ' 미리보기'}
          >
            <div className="material-preview-meta">
              <span>{character.finish}</span>
              <span>N° {character.index}</span>
            </div>
            <button
              className="material-specimen-touch"
              type="button"
              aria-label={item.name + ' 재질 터치 미리보기'}
              onPointerDown={() => setTouched(true)}
              onClick={() => setTouched(true)}
            >
              <MaterialObject id={draft.id} />
              <span className="material-touch-hint">
                {touched ? '이 감각으로, 나의 공간을.' : 'TOUCH THE MATERIAL'}
              </span>
            </button>
            <div className="material-preview-title">
              <h3>{item.name}</h3>
              <p>{character.story}</p>
            </div>
            <div className="material-sample-card">
              <div className="material-sample-top">
                <span>지금, 한 가지에 집중</span>
                <span className="material-live-dot">{playing ? 'FOCUS' : 'READY'}</span>
              </div>
              <div className="material-sample-dial">
                <b>
                  05<span>:</span>00
                </b>
                <small>나를 위한 다섯 분</small>
              </div>
              <button
                type="button"
                className="material-sample-start"
                aria-pressed={playing}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
                {playing ? '미리보기 일시정지' : '터치 반응 느껴보기'}
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="material-sample-nav" aria-hidden="true">
              <span className="active">오늘</span>
              <span>할 일</span>
              <span>집중</span>
              <span>기록</span>
              <span>더보기</span>
            </div>
            <p className="material-preview-note">
              소재·버튼 미리보기 · 실제 타이머는 시작하지 않아요
            </p>
          </div>
          <div className="material-controls">
            <label>
              <span>
                움직임<small>기기의 모션 감소 설정을 우선해요</small>
              </span>
              <select
                value={draft.motion}
                onChange={(e) =>
                  setDraft({ ...draft, motion: e.target.value as MaterialPreferences['motion'] })
                }
              >
                <option value="auto">자연스럽게</option>
                <option value="reduced">모션 감소</option>
                <option value="off">움직임 끄기</option>
              </select>
            </label>
            <label className="material-intensity">
              <span>
                빛과 반응의 강도<small>{Math.round(draft.intensity * 100)}%</small>
              </span>
              <input
                aria-label="효과 강도"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={draft.intensity}
                onChange={(e) => setDraft({ ...draft, intensity: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>
                배터리 절약<small>움직임과 광학 효과를 가볍게</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.lowPower}
                onChange={(e) => setDraft({ ...draft, lowPower: e.target.checked })}
              />
            </label>
            <MaterialSensorControl />
          </div>
          <div className="material-apply-bar">
            <span>
              {dirty ? '아직 적용하지 않은 미리보기' : '현재 나의 공부 공간'}
              <strong>{item.name}</strong>
            </span>
            <button
              className="primary material-apply"
              disabled={!dirty}
              onClick={() => onChange(draft)}
            >
              {dirty ? '이 재질 적용' : '적용 중'}{' '}
              {dirty ? <ArrowRight size={16} /> : <Check size={16} />}
            </button>
          </div>
          <p className="material-settings-note" role="status">
            적용할 때만 설정을 저장해요. 집중 중에는 장식 움직임이 조용히 멈춰요.
          </p>
        </div>
      </div>
    </section>
  );
}
