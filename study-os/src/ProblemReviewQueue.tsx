import { useState } from 'react';
import type { State } from './model';
import { buildProblemReviews, type AttemptMeta } from './problemReview';

export function ProblemReviewQueue({
  state,
  today,
  onAttempt,
  onCheck,
}: {
  state: State;
  today: string;
  onAttempt: (sessionId: string, answer: string, meta: AttemptMeta) => boolean;
  onCheck: (id: string, outcome: 'remembered' | 'retry') => void;
}) {
  const queue = buildProblemReviews(state, today);
  const cards = [...queue.overdue, ...queue.today];
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, boolean>>({});
  if (!cards.length && !queue.upcoming.length) return null;
  return (
    <section className="panel problem-review-queue" aria-label="문제별 지연 재시험">
      <div className="section-head">
        <h2>답을 가리고 다시 풀기</h2>
        <span className="chip">{cards.length}문제</span>
      </div>
      <p>
        기한 지남 {queue.overdue.length} · 오늘 {queue.today.length} · 예정 {queue.upcoming.length}
      </p>
      {cards.slice(0, 4).map((card) => (
        <article className="problem-review-card" key={card.sessionId}>
          <small>
            {card.subject} · {card.due < today ? '기한 지남' : '오늘'} · {card.due}
          </small>
          <h3>{card.problem}</h3>
          {card.source && <p>출처: {card.source}</p>}
          {card.last.selfCheck === 'unreviewed' ? (
            <>
              <p>저장한 내 답: {card.last.answer}</p>
              <details>
                <summary>이전 시도와 비교하기 (정답 아님)</summary>
                <p>{card.previous.map((a) => a.answer).join(' / ')}</p>
              </details>
              <p>자료의 정답·해설과 직접 비교해 주세요. 자동 채점은 하지 않습니다.</p>
              <div className="sleep-actions">
                <button className="secondary" onClick={() => onCheck(card.last.id, 'retry')}>
                  다시 연습 필요
                </button>
                <button className="primary" onClick={() => onCheck(card.last.id, 'remembered')}>
                  정답을 직접 확인
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  onAttempt(card.sessionId, drafts[card.sessionId] ?? '', {
                    hintUsed: !!hints[card.sessionId],
                  })
                )
                  setDrafts((d) => ({ ...d, [card.sessionId]: '' }));
              }}
            >
              <label>
                다시 푼 내 답
                <textarea
                  required
                  maxLength={3000}
                  value={drafts[card.sessionId] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [card.sessionId]: e.target.value }))}
                />
              </label>
              <label className="sleep-check">
                <input
                  type="checkbox"
                  checked={!!hints[card.sessionId]}
                  onChange={(e) => setHints((h) => ({ ...h, [card.sessionId]: e.target.checked }))}
                />
                힌트·해설을 참고했어요
              </label>
              <button className="primary" type="submit">
                재시험 답 저장
              </button>
            </form>
          )}
        </article>
      ))}
      {cards.length > 4 && <p>위 문제를 마치면 나머지 {cards.length - 4}개가 이어집니다.</p>}
      {queue.upcoming.length > 0 && (
        <details>
          <summary>
            다음 복습 {queue.upcoming[0].due} · 예정 {queue.upcoming.length}개
          </summary>
          <ul>
            {queue.upcoming.map((c) => (
              <li key={c.sessionId}>
                {c.due} · {c.subject} · {c.problem.slice(0, 80)}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="muted">
        자가 확인 기록에 따라 날짜를 조절합니다. 한 번의 정답으로 숙달을 판정하지 않습니다.
      </p>
    </section>
  );
}
