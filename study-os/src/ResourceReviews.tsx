import { useMemo, useState } from 'react';
import type { State } from './model';
import { buildResourceReviews, conceptEvidence } from './learningEngine';
import { ERROR_LABELS } from './problemReview';
export function ResourceReviews({
  state,
  today,
  onOpen,
}: {
  state: State;
  today: string;
  onOpen: (resourceId: string, problemId?: string) => void;
}) {
  const cards = useMemo(() => buildResourceReviews(state, today), [state, today]);
  const concepts = useMemo(() => conceptEvidence(state), [state]);
  const [filter, setFilter] = useState('due');
  if (!cards.length) return null;
  const due = cards.filter((c) => c.due <= today),
    upcoming = cards.filter((c) => c.due > today),
    overdue = due.filter((c) => c.due < today);
  const filtered = cards.filter(
    (c) =>
      filter === 'all' ||
      (filter === 'due' && c.due <= today) ||
      (filter === 'overdue' && c.due < today) ||
      (filter === 'upcoming' && c.due > today) ||
      filter === c.category,
  );
  return (
    <section className="panel resource-reviews" aria-label="자료 문제 복습">
      <div className="section-head">
        <h2>내 문제, 다시 맞히기</h2>
        <span className="chip">
          오늘 {due.length - overdue.length} · 기한 지남 {overdue.length}
        </span>
      </div>
      <label>
        복습 분류
        <select aria-label="복습 분류" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {[
            ['due', '오늘·기한 지난 복습'],
            ['overdue', '기한 지난 복습'],
            ['upcoming', '앞으로 복습'],
            ['incorrect', '오답 문제'],
            ['hint', '힌트 사용'],
            ['low', '낮은 확신'],
            ['independent', '독립 정답'],
            ['all', '전체 문제'],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {filtered.slice(0, 20).map((c) => (
        <article className="resource-review-card" key={c.problem.id}>
          <small>
            {c.resource.subject} · {c.due}{' '}
            {c.exam && c.due !== c.normalDue ? '· 연결 시험 전 복습' : ''}
          </small>
          <h3>
            {c.resource.title} · {c.problem.ordinal}번
          </h3>
          <p>{c.problem.concept || c.problem.body.slice(0, 100) || '원본 자료 문제'}</p>
          <p className="muted">
            {c.last.selfCheck === 'incorrect'
              ? ERROR_LABELS[c.last.errorTag] + ' 오류'
              : c.last.hintUsed
                ? '힌트 사용'
                : c.last.confidence === 'low'
                  ? '낮은 확신'
                  : '독립 시도'}{' '}
            · 실제 답변 {c.attempts.length}회
          </p>
          <button className="primary" onClick={() => onOpen(c.resource.id, c.problem.id)}>
            {c.last.selfCheck === 'unreviewed' ? '저장한 답 직접 확인' : '답을 가리고 재시험'}
          </button>
        </article>
      ))}
      {filtered.length > 20 && (
        <p>
          앞의 문제를 복습하면 다음 문제가 이어집니다. 전체 문제는 라이브러리에서도 열 수 있어요.
        </p>
      )}
      {!filtered.length && <p>선택한 분류에 문제가 없습니다. 앞으로 복습 {upcoming.length}개</p>}
      {concepts.length > 0 && (
        <details>
          <summary>개념별 실제 근거와 추정</summary>
          {concepts.map((c) => (
            <article key={c.concept}>
              <h3>{c.concept}</h3>
              <p>
                관찰한 기록 (ObservedEvidence): 답변 {c.observed.answers}회 · 독립 정답{' '}
                {c.observed.independent}회 · {c.observed.distinctProblems}문제 ·{' '}
                {c.observed.distinctSessions}세션
              </p>
              <p>추정 상태 (InferredState): {c.inferred}</p>
              <p>
                반복 오류:{' '}
                {c.observed.errors.map((a) => ERROR_LABELS[a.errorTag]).join(', ') || '기록 없음'}
              </p>
            </article>
          ))}
        </details>
      )}
      <p className="muted">
        간격은 초기 규칙이며 숙달 판정이 아닙니다. 고정 일정·마감·수면 보호를 유지한 채 시작합니다.
      </p>
    </section>
  );
}
