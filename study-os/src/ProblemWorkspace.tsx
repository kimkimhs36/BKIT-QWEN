import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, Check, RotateCcw } from 'lucide-react';
import type { State } from './model';

type Active = NonNullable<State['active']>;
type Workspace = NonNullable<Active['workspace']>;
type Attempt = Workspace['attempts'][number];

export function ProblemWorkspace({
  active,
  onSetProblem,
  onRecordAttempt,
  onSelfCheck,
}: {
  active: Active;
  onSetProblem: (problem: string, source: string) => void;
  onRecordAttempt: (answer: string) => void;
  onSelfCheck: (attemptId: string, outcome: 'remembered' | 'retry') => void;
}) {
  const [draft, setDraft] = useState('');
  const workspace = active.workspace;
  const attempts = workspace?.attempts || [];
  const last = attempts[attempts.length - 1];
  const canRetry = !!last && last.selfCheck !== 'unreviewed' && attempts.length < 20;
  function submitProblem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const problem = String(f.get('problem') || '').trim();
    if (!problem) return;
    onSetProblem(problem, String(f.get('source') || '').trim());
  }
  function submitAnswer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = draft.trim();
    if (!value || attempts.length >= 20) return;
    onRecordAttempt(value);
    setDraft('');
  }
  return (
    <section className="problem-workspace" aria-label="실제 문제 풀이">
      <div className="problem-workspace-heading">
        <div><span>LEARN / ATTEMPT</span><h3>첫 문제부터 풀어보자.</h3></div>
        <span className="problem-workspace-count">{attempts.length ? `내 답 ${attempts.length}회` : '아직 시도 전'}</span>
      </div>
      {!workspace ? (
        <form className="problem-setup" onSubmit={submitProblem}>
          <label htmlFor="learn-problem">지금 풀 문제 또는 떠올릴 질문</label>
          <textarea id="learn-problem" name="problem" rows={3} maxLength={3000}
            required placeholder="예: 함수의 극한에서 왼쪽과 오른쪽 극한이 다르면 전체 극한은?"
            autoComplete="off" />
          <label htmlFor="learn-source">자료 출처 (선택)</label>
          <input id="learn-source" name="source" maxLength={200}
            placeholder="예: 학교 수학 학습지 4쪽 2번" />
          <button type="submit" className="primary problem-cta">
            문제 정하고 시작 <ArrowRight size={16} />
          </button>
          <p>문제를 저장해도 정답을 제출한 것으로 집계하지 않아. 타이머와 별개로 실제 풀이를 기록해.</p>
        </form>
      ) : (
        <div className="problem-live">
          {workspace.source && <p className="problem-source"><BookOpenCheck size={15}/> {workspace.source}</p>}
          <p className="problem-text">{workspace.problem}</p>
          {attempts.length > 0 && (
            <details className="problem-previous-answers">
              <summary>이전 답변 {attempts.length}개 보기</summary>
              <ol>
                {attempts.map((attempt: Attempt, i: number) => (
                  <li key={attempt.id}>
                    <span>{i+1}차 시도 · {attempt.selfCheck==='remembered' ? '맞았다고 직접 확인' : attempt.selfCheck==='retry' ? '다시 풀기 선택' : '자가 확인 전'}</span>
                    <p>{attempt.answer}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {last?.selfCheck==='unreviewed' ? (
            <div className="problem-selfcheck" role="group" aria-label="직접 확인한 답">
              <p>내 답을 저장했어. 교과서나 해설을 확인한 다음 결과를 선택해.</p>
              <div className="problem-selfcheck-actions">
                <button type="button" className="secondary" onClick={()=>onSelfCheck(last.id,'retry')}>
                  <RotateCcw size={15} /> 다시 풀어야 해
                </button>
                <button type="button" className="primary" onClick={()=>onSelfCheck(last.id,'remembered')}>
                  <Check size={15} /> 내가 확인했어
                </button>
              </div>
              <small>BKIT가 정답을 채점한 것은 아니야.</small>
            </div>
          ) : !last || canRetry ? (
            <form key={attempts.length} onSubmit={submitAnswer} className="problem-answer">
              <label htmlFor="learn-answer">{last ? '다시 풀고 내 답 남기기' : '내 답을 먼저 써보기'}</label>
              <textarea id="learn-answer" rows={3} maxLength={3000} required
                placeholder="해설이나 AI 정답을 보기 전에 내 생각을 적어봐."
                value={draft} onChange={e=>setDraft(e.target.value)} />
              <button type="submit" className="primary problem-cta" disabled={!draft.trim()}>
                내 답 저장 <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <p className="problem-success"><Check size={16}/> 답을 확인했어. 종료할 때 이 문제 기록도 함께 저장돼.</p>
          )}
        </div>
      )}
    </section>
  );
}
