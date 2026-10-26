import { ArrowRight } from 'lucide-react';
import type { StudyDocument } from './engine';
import { performance } from './performance';
export function PerformanceStudio({
  document,
  onNext,
}: {
  document: StudyDocument;
  onNext: () => void;
}) {
  const p = performance(document);
  return (
    <>
      <div className="jg-studio-intro">
        <p className="jg-eyebrow">PERFORMANCE STUDIO / 04</p>
        <h1 tabIndex={-1}>성장은, 증거를 남긴다.</h1>
        <p>몇 시간을 앉아 있었는지보다, 스스로 무엇을 풀어냈는지.</p>
      </div>
      <section className="jg-studio-stats" aria-label="학습 증거 지표">
        <div>
          <span>INDEPENDENT SOLVES</span>
          <strong>
            {p.independent}
            <small> / {p.total}</small>
          </strong>
          <b>독립 정답 관찰 / 첫 답변</b>
          <p>
            정답 + 힌트 없음 + 추측 아님 + 풀이 작성.
            <br />
            풀이의 논리적 타당성은 자동 검증하지 않습니다.
          </p>
        </div>
        <div>
          <span>DELAYED VERIFICATION</span>
          <strong>{p.eligible ? Math.round((p.successful / p.eligible) * 100) + '%' : '—'}</strong>
          <b>지연 복습 독립 성공률</b>
          <p>
            {p.successful}회 성공 / {p.eligible}회 유효 검증
            <br />
            예정 시각 이후, 직전과 다른 문제만 집계합니다.
          </p>
        </div>
      </section>
      <section className="jg-card jg-evidence-changes">
        <h2>처음과 지금의 차이</h2>
        <p>
          서로 다른 시점의 실제 답변 관찰입니다. 수능 점수·성적 상승이나 장기 숙달을 뜻하지
          않습니다.
        </p>
        {p.changes.length ? (
          p.changes.map((c) => (
            <div key={c.concept.id} className="jg-row">
              <b>{c.concept.name}</b>
              <span>
                {c.recovered ? '첫 독립 실패 → 최근 독립 정답' : '독립 해결 변화 확인 중'}
                {c.hintsReduced ? ' · 힌트 사용 감소 관찰' : ''} · {c.count}개 답변
              </span>
            </div>
          ))
        ) : (
          <p>비교할 학습 기록이 아직 없습니다.</p>
        )}
      </section>
      <div className="jg-studio-ledger">
        <section>
          <div className="jg-section-heading">
            <h2>독립 해결의 흔적</h2>
            <span>최근 학습일 14일 · 한국 시간</span>
          </div>
          {p.days.length ? (
            <div className="jg-growth-table">
              <div>
                <b>학습일</b>
                <b>독립 정답</b>
                <b>첫 답변</b>
              </div>
              {p.days.map(([date, d]) => (
                <div key={date}>
                  <span>{date}</span>
                  <span>{d.independent}</span>
                  <span>{d.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="jg-empty-evidence">
              <span>NO EVIDENCE YET</span>
              <h3>첫 점은, 직접 남기는 것.</h3>
              <p>학습을 마치면 실제 답변이 여기에 쌓입니다.</p>
            </div>
          )}
        </section>
        <section>
          <div className="jg-section-heading">
            <h2>다시 살펴볼 오류</h2>
            <span>직접 수정 가능한 분류</span>
          </div>
          {p.errors.length ? (
            p.errors.map((e) => (
              <div className="jg-error-frequency" key={e.id}>
                <span>
                  {e.id} / {e.label}
                </span>
                <b>{e.count}회</b>
              </div>
            ))
          ) : (
            <p>분류된 오류가 없습니다. 답변 후 오류 원인을 확인해 주세요.</p>
          )}
          <button className="jg-text-action" onClick={onNext}>
            다음 학습으로 연결
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
