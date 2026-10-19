import { useEffect, useState } from 'react';
import type { State } from './model';
import type { LearningProblem, ResourceAttempt } from './learningModel';
import {
  learning,
  resourceProblems,
  resourceProgress,
  problemAttempts,
  moveProblem,
  recordResourceAttempt,
  checkResourceAttempt,
  isCompleted,
} from './learningEngine';
import { ERROR_LABELS } from './problemReview';
import { subjectTemplate } from './subjectTemplates';
import { PrivatePhotoCard } from './StudyAtelier';
import { iso } from './time';
export function MultiProblemWorkspace({
  state,
  onChange,
  onFinish,
  onSleep,
}: {
  state: State;
  onChange: (fn: (s: State) => State) => boolean;
  onFinish: () => void;
  onSleep: () => void;
}) {
  const d = learning(state),
    r = d.resources.find((r) => r.id === state.active?.resourceId);
  if (!r)
    return (
      <p role="alert">
        자료 연결을 찾지 못했습니다. 기존 기록은 유지됩니다. 자료 라이브러리를 확인하세요.
      </p>
    );
  const progress = resourceProgress(d, r.id),
    p = d.problems.find((p) => p.id === progress.currentProblemId);
  if (!p) return <p>자료에 문제를 추가해 주세요.</p>;
  return (
    <Problem
      key={p.id}
      state={state}
      problem={p}
      onChange={onChange}
      onFinish={onFinish}
      onSleep={onSleep}
    />
  );
}
function Problem({
  state,
  problem: p,
  onChange,
  onFinish,
  onSleep,
}: {
  state: State;
  problem: LearningProblem;
  onChange: (fn: (s: State) => State) => boolean;
  onFinish: () => void;
  onSleep: () => void;
}) {
  const d = learning(state),
    r = d.resources.find((r) => r.id === p.resourceId)!;
  const list = resourceProblems(d, r.id),
    index = list.findIndex((x) => x.id === p.id),
    progress = resourceProgress(d, r.id);
  const attempts = problemAttempts(d, p.id),
    last = attempts.at(-1),
    template = subjectTemplate(r.subject);
  const [draft, setDraft] = useState(p.draft),
    [fields, setFields] = useState(p.draftFields);
  const [retry, setRetry] = useState(
      !!last && last.selfCheck !== 'unreviewed' && last.sessionId !== state.active?.id,
    ),
    [showAnswer, setShowAnswer] = useState(false),
    [showExample, setShowExample] = useState(false),
    [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(''),
    [tag, setTag] = useState<ResourceAttempt['errorTag']>(last?.errorTag ?? 'unknown');
  const hint = fields.__hint === 'true',
    confidence = (fields.__confidence ?? 'medium') as ResourceAttempt['confidence'];
  function patch(patch: Partial<LearningProblem>) {
    const ok = onChange((s) => ({
      ...s,
      learning: {
        ...learning(s),
        problems: learning(s).problems.map((x) =>
          x.id === p.id ? { ...x, ...patch, updatedAt: iso(Date.now()) } : x,
        ),
      },
    }));
    setError(ok ? '' : '저장하지 못했습니다. 저장 공간 또는 다른 탭 충돌을 확인하세요.');
    return ok;
  }
  function field(key: string, value: string) {
    const next = { ...fields, [key]: value };
    setFields(next);
    return patch({ draftFields: next });
  }
  function markHint() {
    return hint || field('__hint', 'true');
  }
  const unsaved = draft !== p.draft || JSON.stringify(fields) !== JSON.stringify(p.draftFields);
  function flush() {
    return !unsaved || patch({ draft, draftFields: fields });
  }
  function go(problemId: string) {
    if (flush()) onChange((s) => moveProblem(s, r.id, problemId));
  }
  useEffect(() => {
    const save = (event: Event) => {
      if (!flush()) event.preventDefault();
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    document.addEventListener('bkit:flush-learning-draft', save);
    window.addEventListener('beforeunload', warn);
    return () => {
      document.removeEventListener('bkit:flush-learning-draft', save);
      window.removeEventListener('beforeunload', warn);
    };
  }, [draft, fields, p.draft, p.draftFields, onChange]);
  const answerStage = !last || retry;
  return (
    <section className="multi-workspace" aria-label="다중 문제 학습실">
      <div className="section-head">
        <span className="eyebrow">
          {template.name} · {r.title}
        </span>
        <span className="chip">
          {index + 1} / {list.length} 문제
        </span>
      </div>
      <p className="muted">
        풀이 확인 {progress.completedCount} · 남은 {progress.remainingCount} · 정답은 직접 확인
      </p>
      <progress
        value={progress.completedCount}
        max={Math.max(1, list.length)}
        aria-label="자료 학습 진행도"
      />
      <nav className="problem-navigation" aria-label="문제 이동">
        <button disabled={!index} onClick={() => go(list[index - 1].id)}>
          이전 문제
        </button>
        <label>
          문제 목록
          <select aria-label="문제 목록" value={p.id} onChange={(e) => go(e.target.value)}>
            {list.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ordinal}번 ·{' '}
                {isCompleted(d, x.id)
                  ? '풀이 확인'
                  : problemAttempts(d, x.id).length
                    ? '확인 전'
                    : '미완료'}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary"
          disabled={index === list.length - 1}
          onClick={() => go(list[index + 1].id)}
        >
          다음 문제
        </button>
      </nav>
      <h3 className="learning-problem-title">
        {p.ordinal}번 · {p.title.replace(/^\d+번$/, r.subject + ' 문제')}
      </h3>
      {p.sourceReference && <p className="muted">출처: {p.sourceReference}</p>}
      {p.body ? (
        <p className="learning-problem-body">{p.body}</p>
      ) : (
        <p className="learning-problem-body">
          원본 자료의 {p.sourceReference || p.ordinal + '번 문제'}를 보고 풀어 주세요.
        </p>
      )}
      {(p.mediaId || r.linkedMediaIds.length > 0) && (
        <details className="learning-source">
          <summary>원본 자료 보기</summary>
          {p.mediaId ? (
            <PrivatePhotoCard id={p.mediaId} large />
          ) : (
            r.linkedMediaIds.map((id) => <PrivatePhotoCard key={id} id={id} large />)
          )}
        </details>
      )}
      <details>
        <summary>{template.name} 학습 순서</summary>
        <ol>
          {template.steps.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </details>
      {answerStage ? (
        <form
          className="learning-answer-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              onChange((s) =>
                recordResourceAttempt(
                  {
                    ...s,
                    learning: {
                      ...learning(s),
                      problems: learning(s).problems.map((x) =>
                        x.id === p.id ? { ...x, draft, draftFields: fields } : x,
                      ),
                    },
                  },
                  p.id,
                  { hintUsed: hint, confidence },
                ),
              )
            ) {
              setDraft('');
              setFields({});
              setRetry(false);
              setShowHistory(false);
              setShowAnswer(false);
              setShowExample(false);
            } else setError('답을 저장하지 못했습니다. 입력 내용을 확인하세요.');
          }}
        >
          <label className="main-answer">
            {template.answerLabel}
            <textarea
              aria-label={template.answerLabel}
              autoComplete="off"
              required
              rows={5}
              maxLength={3000}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                patch({ draft: e.target.value });
              }}
              placeholder="먼저 내 힘으로 시도해 보세요."
            />
          </label>
          <details className="subject-fields">
            <summary>풀이 단계·회상 기록</summary>
            {template.fields.map((f) => (
              <label key={f.key}>
                {f.label}
                <textarea
                  aria-label={f.label}
                  rows={2}
                  maxLength={1000}
                  value={fields[f.key] ?? ''}
                  onChange={(e) => field(f.key, e.target.value)}
                />
              </label>
            ))}
          </details>
          <div className="form-grid">
            <label className="sleep-check">
              <input
                type="checkbox"
                checked={hint}
                onChange={(e) => field('__hint', String(e.target.checked))}
              />
              힌트·해설을 참고했어요
            </label>
            <label>
              답의 확신
              <select
                aria-label="답의 확신"
                value={confidence}
                onChange={(e) => field('__confidence', e.target.value)}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </label>
          </div>
          <button className="primary large" type="submit" disabled={!draft.trim()}>
            내 답 저장 · 직접 확인하기
          </button>
          <small>작성 중인 답과 풀이 단계는 이 기기에 저장됩니다.</small>
        </form>
      ) : last?.selfCheck === 'unreviewed' ? (
        <div className="problem-selfcheck">
          <h4>저장한 내 답</h4>
          <p className="learning-problem-body">{last.learnerAnswer}</p>
          <p>교과서·원본 해설과 비교한 뒤 직접 확인하세요.</p>
          {p.referenceAnswer && (
            <button onClick={() => setShowAnswer(!showAnswer)}>
              참고 정답·번역 {showAnswer ? '가리기' : '확인'}
            </button>
          )}
          {showAnswer && <p className="learning-reference">{p.referenceAnswer}</p>}
          <label>
            오류 유형
            <select
              aria-label="오류 유형"
              value={tag}
              onChange={(e) => setTag(e.target.value as typeof tag)}
            >
              {Object.entries(ERROR_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="learning-actions">
            <button
              onClick={() => onChange((s) => checkResourceAttempt(s, last.id, 'incorrect', tag))}
            >
              오답 · 다시 연습
            </button>
            <button
              className="primary"
              onClick={() =>
                onChange((s) => checkResourceAttempt(s, last.id, 'correct', 'unknown'))
              }
            >
              정답 · 직접 확인했어요
            </button>
          </div>
        </div>
      ) : (
        <div className="learning-result" role="status">
          <p>
            {last?.selfCheck === 'correct'
              ? '정답으로 직접 확인했어요.'
              : '오답으로 기록했어요. 빠른 재시도와 내일 복습이 준비됩니다.'}
          </p>
          <div className="learning-actions">
            <button
              onClick={() => {
                setRetry(true);
                setShowAnswer(false);
                setShowHistory(false);
              }}
            >
              답을 가리고 재시도
            </button>
            {index < list.length - 1 ? (
              <button className="primary" onClick={() => go(list[index + 1].id)}>
                다음 문제로 계속
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => {
                  if (flush()) onFinish();
                }}
              >
                학습 종료 · 기록 확인
              </button>
            )}
          </div>
        </div>
      )}
      {answerStage && (
        <div className="learning-help">
          <button
            onClick={() => {
              if (!showExample && markHint()) setShowExample(true);
              else setShowExample(false);
            }}
          >
            예제·풀이 방법 {showExample ? '가리기' : '보기'}
          </button>
          {showExample && <p className="learning-reference">{p.example || template.example}</p>}
          {p.referenceAnswer && (
            <>
              <button
                onClick={() => {
                  if (!showAnswer && markHint()) setShowAnswer(true);
                  else setShowAnswer(false);
                }}
              >
                참고 정답·번역 {showAnswer ? '가리기' : '보기 (힌트 기록)'}
              </button>
              {showAnswer && <p className="learning-reference">{p.referenceAnswer}</p>}
            </>
          )}
        </div>
      )}
      {attempts.length > 0 && (
        <details
          open={showHistory}
          onToggle={(e) => {
            const open = e.currentTarget.open;
            if (open && answerStage && !markHint()) {
              e.currentTarget.open = false;
              return;
            }
            setShowHistory(open);
          }}
        >
          <summary>
            이 문제 풀이 이력 {attempts.length}회 {answerStage ? '(참고 시 힌트 기록)' : ''}
          </summary>
          <ol>
            {attempts.map((a) => (
              <li key={a.id}>
                <small>
                  {new Date(a.submittedAt).toLocaleString()} ·{' '}
                  {a.selfCheck === 'correct'
                    ? '직접 정답 확인'
                    : a.selfCheck === 'incorrect'
                      ? '오답'
                      : '확인 전'}{' '}
                  · {a.hintUsed ? '힌트 사용' : '독립 시도'} · 확신 {a.confidence}
                </small>
                <p className="learning-problem-body">{a.learnerAnswer}</p>
                {Object.entries(a.fields)
                  .filter(([key]) => !key.startsWith('__'))
                  .map(([key, value]) => (
                    <p key={key}>
                      {template.fields.find((f) => f.key === key)?.label ?? key}: {value}
                    </p>
                  ))}
                {a.selfCheck === 'incorrect' && (
                  <label>
                    오류 분류 수정
                    <select
                      value={a.errorTag}
                      onChange={(e) =>
                        onChange((s) => ({
                          ...s,
                          learning: {
                            ...learning(s),
                            attempts: learning(s).attempts.map((x) =>
                              x.id === a.id
                                ? { ...x, errorTag: e.target.value as ResourceAttempt['errorTag'] }
                                : x,
                            ),
                          },
                        }))
                      }
                    >
                      {Object.entries(ERROR_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="learning-actions learning-end">
        <button
          onClick={() => {
            if (flush()) onFinish();
          }}
        >
          저장하고 학습 종료
        </button>
        <button
          onClick={() => {
            if (flush()) onSleep();
          }}
        >
          답안 저장 상태로 취침 준비
        </button>
      </div>
    </section>
  );
}
