import { useState } from 'react';
import { ArrowRight, Check, RotateCcw, BookOpen } from 'lucide-react';
import type { State } from './model';
import { useStudyDraft } from './useStudyDraft';
type Step = NonNullable<NonNullable<State['active']>['learningStep']>;
const moves = [
  ['continue', '다음 문제', ArrowRight, '자료에서 다음 질문을 직접 고르고, 내 답을 적어 보세요.'],
  ['retry', '다시 풀기', RotateCcw, '방금 푼 문제의 해설을 가리고, 막혔던 단계부터 다시 써보세요.'],
  [
    'concept',
    '개념 확인',
    BookOpen,
    '교과서에서 막힌 개념을 확인한 뒤, 내 말로 한 줄 정리해 보세요.',
  ],
] as const;

export function FirstLearningStep({
  action,
  attempted,
  step,
  onSave,
  onAttempt,
}: {
  action: string;
  attempted: boolean;
  step?: Step;
  onSave: (step: Step) => boolean;
  onAttempt: () => boolean;
}) {
  const draft = useStudyDraft(step?.note ?? '', (note) => onSave({ ...step, note }));
  const [error, setError] = useState('');
  return (
    <section className="focus-first-move" aria-label="지금 할 첫 학습 행동">
      <span>{attempted ? '첫 시도 다음에는' : '지금 할 작은 행동'}</span>
      <strong>
        {attempted && step?.next ? moves.find((m) => m[0] === step.next)?.[3] : action}
      </strong>
      {!attempted ? (
        <>
          <small>종이나 학습지에 먼저 풀어 보세요. 타이머를 켜는 것과 문제 시도는 별개예요.</small>
          <button
            type="button"
            className="focus-first-attempt"
            onClick={() => {
              if (!draft.flush()) return;
              if (!onAttempt())
                setError('시도를 저장하지 못했어요. 저장 상태나 기록 한도를 확인해 주세요.');
            }}
          >
            <Check size={16} aria-hidden="true" /> 첫 문제 시도했어요
          </button>
        </>
      ) : (
        <>
          <p className="focus-first-done" role="status">
            첫 시도 기록 완료 · 직접 남긴 기록이며 정답·이해를 뜻하지 않아요.
          </p>
          <div className="learning-next-actions" role="group" aria-label="첫 시도 다음 행동">
            {moves.map(([next, label, Icon]) => (
              <button
                key={next}
                type="button"
                aria-pressed={step?.next === next}
                onClick={() => {
                  if (draft.flush() && onSave({ note: draft.value, next })) setError('');
                }}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      <details className="learning-step-note" open={!!draft.value || undefined}>
        <summary>내 답 · 막힌 부분 메모 (선택)</summary>
        <label>
          지금 문제와 내 생각
          <textarea
            rows={3}
            maxLength={3000}
            value={draft.value}
            onChange={(e) => draft.setValue(e.target.value)}
            onBlur={(e) => {
              if (!(
                e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-draft-retry]')
              ))
                draft.flush();
            }}
            placeholder="실제 문제 번호나 내 답을 짧게 남겨도 좋아요."
          />
        </label>
        <small role="status">
          {draft.status === 'error'
            ? '저장하지 못했어요. 이 화면에서 내용을 복사하거나 다시 저장하세요.'
            : draft.status === 'pending'
              ? '이 기기에 저장 중…'
              : '이 기기에 저장 · 외부 전송 없음'}
        </small>
        {draft.status === 'error' && (
          <button type="button" data-draft-retry onClick={() => draft.flush()}>
            메모 다시 저장
          </button>
        )}
      </details>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
