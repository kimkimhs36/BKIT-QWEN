import { useEffect, useState } from 'react';
import { TaskMaterials, emptyTaskMaterials } from './TaskMaterials';
import { PhotoText } from './PhotoText';
import { ArrowUpRight, Check, CornerDownLeft, Plus } from 'lucide-react';
import { type Task, uid } from './model';
import {
  parseCapture,
  captureDeadline,
  type CaptureFields,
  type CapturePrecision,
  type CaptureUnit,
} from './capture';
export { parseCapture } from './capture';
export function QuickCapture({
  onSave,
  onDetailed,
  onSchedule,
  onBusy,
  initialDay,
}: {
  onSave: (task: Task) => boolean;
  onDetailed: (task: Task) => void;
  onSchedule: () => void;
  onBusy: (busy: boolean) => void;
  initialDay?: string;
}) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState(emptyTaskMaterials);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftId] = useState(uid);
  useEffect(() => () => onBusy(false), [onBusy]);
  const [overrides, setOverrides] = useState<Partial<CaptureFields>>(
    initialDay ? { due: initialDay, precision: 'date-only', provenance: 'user-confirmed' } : {},
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const parsed = { ...parseCapture(text), ...overrides };
  const dated = !!parsed.due && parsed.precision !== 'unknown';
  function change<K extends keyof CaptureFields>(field: K, value: CaptureFields[K]) {
    setOverrides((old) => ({
      ...old,
      [field]: value,
      ...(['due', 'dueTime', 'precision'].includes(field)
        ? { provenance: 'user-confirmed' as const }
        : {}),
    }));
    setError('');
  }
  function draftTask(): Task {
    return {
      id: draftId,
      attachmentIds: media.photoIds,
      title: text.trim(),
      subject: parsed.subject.trim() || '기타',
      kind: parsed.kind,
      ...captureDeadline(parsed),
      quantity:
        parsed.quantityUnit && parsed.quantityTotal !== null && parsed.quantityTotal > 0
          ? {
              unit: parsed.quantityUnit,
              total: parsed.quantityTotal,
              remaining: parsed.quantityTotal,
            }
          : undefined,
      estimate: {
        minMinutes: parsed.minutes,
        maxMinutes: parsed.minutes,
        source: parsed.estimateSource,
      },
      minutes: parsed.minutes,
      remaining: parsed.minutes,
      priority: 2,
      status: 'todo',
      submitted: false,
      submissionRequired: parsed.submissionRequired,
      capture: { source: media.photoIds.length ? 'photo' : 'text', confirmedByUser: true },
      optional: false,
      notes: '',
      link: '',
    };
  }
  return (
    <form
      className={'quick-capture ' + (saved ? 'capture-saved' : '')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || saved || busy) return;
        try {
          const task = draftTask();
          if (onSave(task)) setSaved(true);
        } catch {
          setError('마감 날짜·시각·분량을 다시 확인해 주세요.');
        }
      }}
    >
      <div className="capture-types" role="group" aria-label="등록 종류">
        <button
          type="button"
          aria-pressed={parsed.kind === '숙제'}
          onClick={() => change('kind', '숙제')}
        >
          과제
        </button>
        <button
          type="button"
          aria-pressed={parsed.kind === '수행평가'}
          onClick={() => {
            change('kind', '수행평가');
            change('submissionRequired', true);
          }}
        >
          수행평가
        </button>
        <button type="button" onClick={onSchedule}>
          일정
        </button>
      </div>
      <label className="capture-input">
        <span className="sr-only">할 일을 한 문장으로</span>
        <textarea
          autoFocus
          rows={2}
          maxLength={200}
          required
          placeholder="내일 수학 숙제 20문제"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOverrides((old) => ({
              ...(old.kind ? { kind: old.kind } : {}),
              ...(old.submissionRequired !== undefined
                ? { submissionRequired: old.submissionRequired }
                : {}),
              ...(initialDay
                ? {
                    due: initialDay,
                    precision: 'date-only' as const,
                    provenance: 'user-confirmed' as const,
                  }
                : {}),
            }));
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </label>
      <div className="capture-media-entry">
        <button type="button" aria-expanded={mediaOpen} onClick={() => setMediaOpen(!mediaOpen)}>
          사진 촬영 · 보관함에서 가져오기 <Plus size={15} />
        </button>
      </div>
      {mediaOpen && (
        <TaskMaterials
          taskId={draftId}
          value={media}
          onChange={setMedia}
          onBusy={(value) => {
            setBusy(value);
            onBusy(value);
          }}
          photosOnly
        />
      )}
      {!!media.photoIds.length && (
        <PhotoText
          photoIds={media.photoIds}
          disabled={busy}
          onUse={(value) => {
            setText(value.slice(0, 200));
            setOverrides((old) => ({ ...old, ...parseCapture(value.slice(0, 200)) }));
            setError(
              value.length > 200 ? '앞 200자를 가져왔어요. 제목과 마감을 확인해 주세요.' : '',
            );
          }}
        />
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={parsed.submissionRequired}
          onChange={(e) => change('submissionRequired', e.target.checked)}
        />
        완료 후 제출 확인이 필요한 과제
      </label>
      <div className="capture-v2-indicators" aria-live="polite">
        <span>
          {parsed.quantityUnit && parsed.quantityTotal ? '분량 인식 완료' : '분량 확인 필요'}
        </span>
        <span>
          {!dated
            ? '마감 미확인'
            : parsed.precision === 'date-only'
              ? '날짜만 확인'
              : '시각까지 확인'}
        </span>
      </div>
      <div className="capture-chips capture-essential">
        <label>
          <span>과목</span>
          <input
            aria-label="빠른 등록 과목"
            value={parsed.subject}
            maxLength={200}
            onChange={(e) => change('subject', e.target.value)}
          />
        </label>
        <label>
          <span>마감 날짜 (모르면 비우기)</span>
          <input
            aria-label="빠른 등록 마감"
            type="date"
            value={dated ? parsed.due : ''}
            onChange={(e) => {
              setOverrides((old) => ({
                ...old,
                due: e.target.value,
                precision: e.target.value ? 'date-only' : 'unknown',
                dueTime: '',
                provenance: 'user-confirmed',
              }));
              setError('');
            }}
          />
        </label>
      </div>
      <details className="capture-options">
        <summary>분량 · 시간 · 마감 상세 설정</summary>
        <div className="capture-chips">
          <label>
            <span>마감 확실성</span>
            <select
              aria-label="마감 확실성"
              value={dated ? parsed.precision : 'unknown'}
              onChange={(e) => {
                const precision = e.target.value as CapturePrecision;
                setOverrides((old) => ({
                  ...old,
                  precision: !parsed.due ? 'unknown' : precision,
                  dueTime: precision === 'exact-time' ? (old.dueTime ?? parsed.dueTime) : '',
                  provenance: 'user-confirmed',
                }));
                setError('');
              }}
            >
              <option value="unknown">미확인</option>
              <option value="date-only" disabled={!parsed.due}>
                날짜만 확인
              </option>
              <option value="exact-time" disabled={!parsed.due}>
                시각까지 확인
              </option>
            </select>
          </label>
          {dated && parsed.precision === 'exact-time' && (
            <label>
              <span>확정된 마감 시각 (KST)</span>
              <input
                type="time"
                aria-label="정확한 마감 시각"
                value={parsed.dueTime}
                onChange={(e) => change('dueTime', e.target.value)}
              />
            </label>
          )}
          <label>
            <span>종류</span>
            <select
              aria-label="빠른 등록 종류"
              value={parsed.kind}
              onChange={(e) => change('kind', e.target.value as Task['kind'])}
            >
              {['숙제', '수행평가', '시험공부', '개인 일정'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span>분량 단위</span>
            <select
              aria-label="분량 단위"
              value={parsed.quantityUnit}
              onChange={(e) => change('quantityUnit', e.target.value as CaptureUnit | '')}
            >
              <option value="">미확인</option>
              <option value="problems">문제</option>
              <option value="pages">쪽</option>
              <option value="passages">지문</option>
              <option value="chapters">단원</option>
            </select>
          </label>
          {parsed.quantityUnit && (
            <label>
              <span>전체 분량</span>
              <input
                type="number"
                aria-label="전체 분량"
                min={1}
                max={10000}
                required
                value={parsed.quantityTotal ?? ''}
                onChange={(e) =>
                  change('quantityTotal', e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
          )}
          <label>
            <span>예상 시간 · 분</span>
            <input
              aria-label="빠른 등록 예상 시간"
              type="number"
              min={1}
              max={480}
              required
              value={parsed.minutes}
              onChange={(e) =>
                setOverrides((old) => ({
                  ...old,
                  minutes: Number(e.target.value),
                  estimateSource: 'user',
                }))
              }
            />
          </label>
        </div>
      </details>
      <p className="capture-note">
        {dated && parsed.precision === 'date-only'
          ? '날짜만 확인됐어요. 내부 계획 계산과 달리 실제 마감 시각은 미확인으로 표시됩니다.'
          : dated
            ? '정확한 시각을 확인하고 저장하세요.'
            : '마감을 모르면 미확인으로 저장됩니다.'}{' '}
        25분은 기본 예상값이며, 실제 필요한 시간에 맞게 수정할 수 있어요.
      </p>
      {!text && (
        <div className="capture-examples">
          {[
            '금요일까지 수학 학원 숙제 20문제',
            '내일 영어 수행평가 준비',
            '경제 학습지 3장 풀기',
          ].map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => {
                setText(x);
                setOverrides({});
              }}
            >
              {x}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      <div className="capture-bottom">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            try {
              onDetailed(draftTask());
            } catch {
              setError('마감 날짜와 시각을 확인해 주세요.');
            }
          }}
        >
          상세 입력 <Plus size={14} />
        </button>
        <button className="primary" type="submit" disabled={!text.trim() || saved || busy}>
          {saved ? (
            <>
              <Check size={17} /> 저장 완료
            </>
          ) : (
            <>
              오늘에 담기 <CornerDownLeft size={17} />
            </>
          )}
        </button>
      </div>
      <small className="capture-method">읽어 온 과목과 마감을 확인한 뒤 저장하세요.</small>
    </form>
  );
}
