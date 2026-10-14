import { useState } from 'react';
import { CalendarDays, Check, Eye, RotateCcw } from 'lucide-react';
import type { ReviewOutcome, ReviewQueue } from './review';

export function ReviewDeck({
  queue,
  onReview,
}: {
  queue: ReviewQueue;
  onReview: (id: string, result: ReviewOutcome) => boolean;
}) {
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="panel review-deck" aria-label="오답 재시험">
      <div className="section-head">
        <h2>기억을 다시 꺼내기</h2>
        <span className="chip">DUE {queue.due.length}</span>
      </div>
      <p className="review-deck-summary">
        지난번에 막힌 문제나 개념을 기록 없이 먼저 떠올려 봐요.
        그다음 메모를 확인하고 스스로 평가하세요.
      </p>
      {queue.due.length ? (
        <div className="review-deck-stack">
          {(expanded ? queue.due : queue.due.slice(0, 4)).map((card) => {
            const revealed = revealedIds.includes(card.sessionId);
            return (
              <article className="review-deck-card" key={card.sessionId}>
                <div className="review-deck-meta">
                  <span>{card.subject}</span>
                  <span>{card.due} · {card.stage + 1}/3 단계</span>
                </div>
                <h3>{card.action}</h3>
                {revealed ? (
                  <div className="review-deck-answer">
                    <span>지난번에 막혔던 내용</span>
                    <p>{card.mistake}</p>
                    <div className="review-deck-choices">
                      <button className="secondary" onClick={() => {
                        if (onReview(card.sessionId, 'retry'))
                          setRevealedIds((ids) => ids.filter((v) => v !== card.sessionId));
                      }}>
                        <RotateCcw size={16} /> 아직 어려워
                      </button>
                      <button className="primary" onClick={() => {
                        if (onReview(card.sessionId, 'remembered'))
                          setRevealedIds((ids) => ids.filter((v) => v !== card.sessionId));
                      }}>
                        <Check size={16} /> 스스로 떠올렸어
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="secondary review-deck-reveal" onClick={() =>
                    setRevealedIds((ids) => [...ids, card.sessionId])
                  }>
                    <Eye size={16} /> 오답 메모 확인
                  </button>
                )}
              </article>
            );
          })}
          {queue.due.length > 4 && (
            <button className="text-button" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '접기' : '남은 복습 ' + (queue.due.length - 4) + '개 보기'}
            </button>
          )}
        </div>
      ) : (
        <div className="review-deck-clear"><Check size={18} /> 오늘까지의 복습을 끝냈어요.</div>
      )}
      {queue.upcoming.length > 0 && (
        <div className="review-deck-upcoming">
          <CalendarDays size={16} /> 다음 복습 {queue.upcoming[0].due} · {queue.upcoming[0].subject}
          {queue.upcoming.length > 1 ? ' 외 ' + (queue.upcoming.length - 1) + '개' : ''}
        </div>
      )}
      <p className="review-deck-disclaimer">
        자가평가로 복습 날짜만 조절합니다. 정답 채점이나 실제 이해도 판단은 하지 않아요.
      </p>
    </section>
  );
}
