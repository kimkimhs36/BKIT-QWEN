import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, Check, RotateCcw } from 'lucide-react';
import type { State } from './model';
import { useStudyDraft } from './useStudyDraft';
import {
  ERROR_LABELS,
  type AttemptMeta,
  type ErrorTag,
  type ProblemSourceMeta,
} from './problemReview';

type Active = NonNullable<State['active']>;
type Workspace = NonNullable<Active['workspace']>;
type Attempt = Workspace['attempts'][number];

export function ProblemWorkspace({
  active,
  onSetProblem,
  onRecordAttempt,
  onSelfCheck,
  onSaveDraft,
}: {
  active: Active;
  onSaveDraft: (draft: string) => boolean;
  onSetProblem: (problem: string, source: string, meta: ProblemSourceMeta) => void;
  onRecordAttempt: (answer: string, meta: AttemptMeta) => boolean;
  onSelfCheck: (attemptId: string, outcome: 'remembered' | 'retry', errorTag?: ErrorTag) => void;
}) {
  const answerDraft = useStudyDraft(active.workspace?.answerDraft ?? '', onSaveDraft);
  const { value: draft, setValue: setDraft } = answerDraft;
  const [hintUsed, setHintUsed] = useState(false);
  const [confidence, setConfidence] = useState<'' | 'low' | 'medium' | 'high'>('');
  const [errorTag, setErrorTag] = useState<ErrorTag>('unknown');
  const workspace = active.workspace;
  const attempts = workspace?.attempts || [];
  const last = attempts[attempts.length - 1];
  const canRetry = !!last && last.selfCheck !== 'unreviewed' && attempts.length < 20;
  function submitProblem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const problem = String(f.get('problem') || '').trim();
    if (!problem) return;
    onSetProblem(problem, String(f.get('source') || '').trim(), {
      sourceType: (String(f.get('sourceType') || '') ||
        undefined) as ProblemSourceMeta['sourceType'],
      problemNumber: String(f.get('problemNumber') || '').trim(),
    });
  }
  function submitAnswer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = draft.trim();
    if (!value || attempts.length >= 20 || !answerDraft.flush()) return;
    if (onRecordAttempt(value, { hintUsed, confidence: confidence || undefined })) {
      setDraft('');
      setHintUsed(false);
      setConfidence('');
    }
  }
  return (
    <section className="problem-workspace" aria-label="실제 문제 풀이">
      <div className="problem-workspace-heading">
        <div>
          <span>LEARN / ATTEMPT</span>
          <h3>첫 문제부터 풀어보자.</h3>
        </div>
        <span className="problem-workspace-count">
          {attempts.length ? `내 답 ${attempts.length}회` : '아직 시도 전'}
        </span>
      </div>
      {!workspace ? (
        <form className="problem-setup" onSubmit={submitProblem}>
          <label htmlFor="learn-problem">지금 풀 문제 또는 떠올릴 질문</label>
          <textarea
            id="learn-problem"
            name="problem"
            rows={3}
            maxLength={3000}
            required
            placeholder="예: 함수의 극한에서 왼쪽과 오른쪽 극한이 다르면 전체 극한은?"
            autoComplete="off"
          />
          <label htmlFor="learn-source">자료 출처 (선택)</label>
          <input
            id="learn-source"
            name="source"
            maxLength={200}
            placeholder="예: 학교 수학 학습지 4쪽 2번"
          />
          <details>
            <summary>출처 종류·문제 번호 (선택)</summary>
            <label>
              문제 출처 종류
              <select name="sourceType" aria-label="문제 출처 종류" defaultValue="">
                <option value="">미분류</option>
                <option value="school-worksheet">학교 학습지</option>
                <option value="textbook">교과서</option>
                <option value="academy-sheet">학원 자료</option>
                <option value="user-note">직접 만든 질문</option>
                <option value="official-resource">공식 공개 자료</option>
              </select>
            </label>
            <label>
              실제 문제 번호
              <input name="problemNumber" maxLength={200} placeholder="자료에 적힌 번호만 입력" />
            </label>
          </details>
          <button type="submit" className="primary problem-cta">
            문제 정하고 시작 <ArrowRight size={16} />
          </button>
          <p>
            문제를 저장해도 정답을 제출한 것으로 집계하지 않아. 타이머와 별개로 실제 풀이를 기록해.
          </p>
        </form>
      ) : (
        <div className="problem-live">
          {workspace.source && (
            <p className="problem-source">
              <BookOpenCheck size={15} /> {workspace.source}
            </p>
          )}
          <p className="problem-text">{workspace.problem}</p>
          {attempts.length > 0 && (
            <details className="problem-previous-answers">
              <summary>이전 답변 {attempts.length}개 보기</summary>
              <ol>
                {attempts.map((attempt: Attempt, i: number) => (
                  <li key={attempt.id}>
                    <span>
                      {i + 1}차 시도 ·{' '}
                      {attempt.selfCheck === 'remembered'
                        ? '맞았다고 직접 확인'
                        : attempt.selfCheck === 'retry'
                          ? '다시 풀기 선택'
                          : '자가 확인 전'}
                    </span>
                    <p>{attempt.answer}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {last?.selfCheck === 'unreviewed' ? (
            <div className="problem-selfcheck" role="group" aria-label="직접 확인한 답">
              <p>내 답을 저장했어. 교과서나 해설을 확인한 다음 결과를 선택해.</p>
              <label>
                어디에서 막혔나요? (선택)
                <select
                  aria-label="어디에서 막혔나요? (선택)"
                  value={errorTag}
                  onChange={(e) => setErrorTag(e.target.value as ErrorTag)}
                >
                  {Object.entries(ERROR_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="problem-selfcheck-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onSelfCheck(last.id, 'retry', errorTag)}
                >
                  <RotateCcw size={15} /> 다시 풀어야 해
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onSelfCheck(last.id, 'remembered')}
                >
                  <Check size={15} /> 내가 확인했어
                </button>
              </div>
              <small>BKIT가 정답을 채점한 것은 아니야.</small>
            </div>
          ) : !last || canRetry ? (
            <form key={attempts.length} onSubmit={submitAnswer} className="problem-answer">
              <label htmlFor="learn-answer">
                {last ? '다시 풀고 내 답 남기기' : '내 답을 먼저 써보기'}
              </label>
              <textarea
                id="learn-answer"
                rows={3}
                maxLength={3000}
                required
                placeholder="해설이나 AI 정답을 보기 전에 내 생각을 적어봐."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={(e) => {
                  if (!(
                    e.relatedTarget instanceof Element &&
                    e.relatedTarget.closest('[data-draft-retry]')
                  ))
                    answerDraft.flush();
                }}
              />
              <small role="status">
                {answerDraft.status === 'error'
                  ? '초안 저장 실패 · 화면을 닫기 전에 내용을 복사하거나 다시 저장하세요.'
                  : answerDraft.status === 'pending'
                    ? '초안 저장 중…'
                    : '답안 초안은 이 기기에 보관해요.'}
              </small>
              {answerDraft.status === 'error' && (
                <button type="button" data-draft-retry onClick={() => answerDraft.flush()}>
                  초안 다시 저장
                </button>
              )}
              <label className="sleep-check">
                <input
                  type="checkbox"
                  checked={hintUsed}
                  onChange={(e) => setHintUsed(e.target.checked)}
                />
                힌트·해설을 참고했어요
              </label>
              <label>
                답에 대한 확신
                <select
                  aria-label="답에 대한 확신"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value as typeof confidence)}
                >
                  <option value="">선택 안 함</option>
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </label>
              <button type="submit" className="primary problem-cta" disabled={!draft.trim()}>
                내 답 저장 <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <p className="problem-success">
              <Check size={16} /> 답을 확인했어. 종료할 때 이 문제 기록도 함께 저장돼.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
