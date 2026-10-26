import { learningConcepts as concepts } from './catalogue';
import { ArrowRight, ChevronRight, Play } from 'lucide-react';
import { MaterialObject } from '../themes/MaterialObject';
import type { MaterialId } from '../themes/material';
import { curriculum, type Concept } from './content';
import {
  activeAttempts,
  dueReviews,
  evidence,
  independent,
  recommendation,
  type Session,
  type StudyDocument,
} from './engine';

export function Portal({ material }: { material: MaterialId }) {
  return (
    <div className="jg-portal" aria-hidden="true">
      <div className="jg-orbits">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ '--orbit': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="jg-portal-core">
        <MaterialObject id={material} />
      </div>
      <span className="jg-portal-coordinate">37° N / A FUTURE IN MOTION</span>
      <span className="jg-portal-label">
        THE ONLY WAY
        <br />
        <b>IS THROUGH.</b>
      </span>
    </div>
  );
}
export function CommandCenter({
  document,
  session,
  now,
  days,
  material,
  begin,
  resume,
  navigate,
}: {
  document: StudyDocument;
  session: Session | null;
  now: number;
  days: number;
  material: MaterialId;
  begin: (kind: Session['kind'], free?: boolean, concept?: Concept) => void;
  resume: (s: Session) => void;
  navigate: (page: string) => void;
}) {
  const attempts = activeAttempts(document),
    due = dueReviews(document, now),
    next = recommendation(document, now);
  const observed = concepts.filter((c) => evidence(document, c.id, now).count > 0).length;
  const paused = session && session.phase !== 'complete';
  return (
    <>
      {!attempts.length && !session && (
        <div className="jg-arrival-invitation">
          <span>처음이라면, 이 여정의 시작부터.</span>
          <button onClick={() => navigate('arrival')}>
            THE ARRIVAL · 오프닝 보기 <Play size={12} />
          </button>
        </div>
      )}
      <div className="jg-command-mast">
        <p className="jg-eyebrow">OPERATION 2028 / COMMAND CENTER</p>
        <span>개인의 가능성은, 아직 기밀이다.</span>
      </div>
      <section className="jg-command-hero">
        <div className="jg-command-copy">
          <p className="jg-eyebrow">YOUR FUTURE IS NOT YET WRITTEN</p>
          <h1 tabIndex={-1}>
            아직 쓰이지 않은
            <br />
            미래를 향해.
          </h1>
          <p className="jg-command-lede">
            거대한 목표를 움직이는 건,
            <br />
            오늘 스스로 풀어낸 한 문제.
          </p>
          <div className="jg-next-action">
            <span className="jg-eyebrow">
              TODAY’S PRIORITY / {concepts.find((c) => c.id === next.concept)!.name}
            </span>
            <h2>
              {paused
                ? '멈춘 곳에서 이어가세요.'
                : due.length
                  ? '기억을 다시 꺼낼 시간.'
                  : attempts.length
                    ? '어제의 답이 오늘의 출발점.'
                    : '지금, 첫 문제를 풀어보세요.'}
            </h2>
            <p>{paused ? '답안과 힌트 사용 기록을 이어갑니다.' : next.reason}</p>
            <button
              className="jg-primary"
              onClick={() => (paused ? resume(session) : begin(next.kind, false, next.concept))}
            >
              {paused
                ? '이전 학습 이어서 하기'
                : attempts.length
                  ? '오늘의 학습 시작'
                  : '지금 첫 문제 시작'}
              <ArrowRight size={18} />
            </button>
            <small>수학 · 문자식과 일차방정식 선수개념 · 한 번에 한 문제</small>
          </div>
        </div>
        <Portal material={material} />
        <div className="jg-countdown">
          <span>THE DAY / 2027.11.18</span>
          <strong>D−{Math.max(0, days)}</strong>
          <small>2028학년도 수능 · 설계 기준 일정</small>
        </div>
      </section>
      <div className="jg-mission-strip">
        <div>
          <span>현재 작전</span>
          <b>01 — 출발점 발견</b>
          <small>
            {observed}/{concepts.length}개 기초 개념 관찰 · 수능 등급과 무관
          </small>
        </div>
        <button onClick={() => navigate('map')}>
          개념의 연결을 따라가기 <ArrowRight size={17} />
        </button>
        <button className="jg-film-link" onClick={() => navigate('arrival')}>
          <Play size={13} /> THE ARRIVAL · 시네마틱 진입 / 다시 보기
        </button>
      </div>
      <div className="jg-command-lower">
        <section className="jg-priority-list">
          <div className="jg-section-heading">
            <h2>다음 한 걸음</h2>
            <span>SMALL STEPS. REAL EVIDENCE.</span>
          </div>
          <button onClick={() => begin('ignition')}>
            <span>01</span>
            <div>
              <b>5분 시동 모드</b>
              <small>오늘의 최소 학습 · 한 문제면 충분해요</small>
            </div>
            <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate('diagnosis')}>
            <span>02</span>
            <div>
              <b>기초 진단 시작</b>
              <small>수학 한 과목부터 · 3개 개념</small>
            </div>
            <ArrowRight size={18} />
          </button>
          <button onClick={() => begin('training', true)}>
            <span>03</span>
            <div>
              <b>저장 없는 자유 연습</b>
              <small>기록 부담 없이 풀기</small>
            </div>
            <ArrowRight size={18} />
          </button>
        </section>
        <section className="jg-evidence-sheet">
          <div className="jg-section-heading">
            <h2>관찰된 학습</h2>
            <button onClick={() => navigate('progress')} aria-label="Performance Studio 열기">
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="jg-metrics">
            <div>
              <b>{attempts.length}</b>
              <span>첫 답변</span>
            </div>
            <div>
              <b>{attempts.filter(independent).length}</b>
              <span>독립 정답 관찰</span>
            </div>
            <div>
              <b>{concepts.filter((c) => evidence(document, c.id, now).delayed >= 2).length}</b>
              <span>지연 검증 안정</span>
            </div>
          </div>
          <p>
            {attempts.length
              ? '풀이 설명은 자동 검증하지 않습니다. 정답·힌트·추측 여부를 구분해 관찰합니다.'
              : '아직 학습 기록이 없어요. 성장 수치는 첫 답변 후 쌓입니다.'}
          </p>
          <div className="jg-section-heading jg-review-heading">
            <h2>오늘의 복습 대기열</h2>
            <span>
              {due.length}개 / 하루 상한 {document.budget.value}개
            </span>
          </div>
          {due.length ? (
            due.map((e) => (
              <button
                className="jg-row"
                key={e.concept}
                onClick={() => begin('review', false, e.concept)}
              >
                {concepts.find((c) => c.id === e.concept)!.name}
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <p>지금 밀린 복습은 없어요. 첫 답변 후 재검증 일정이 생깁니다.</p>
          )}
        </section>
      </div>
      <section className="jg-subject-ledger">
        <div className="jg-section-heading">
          <h2>과목별 작전 현황</h2>
          <span>검증된 범위부터, 정직하게.</span>
        </div>
        <div>
          {curriculum.subjects.map((s) => (
            <div key={s.name}>
              <b>{s.name}</b>
              <span>
                {s.name === '수학'
                  ? `${observed}/${concepts.length} 선수개념 관찰`
                  : '콘텐츠 검수 대기'}
              </span>
            </div>
          ))}
        </div>
        <small>
          수학 36개 자체 제작 문항의 수치 검증 완료 · 교사 검수 및 공식 수능 범위 전체 진단은 미완료
        </small>
      </section>
    </>
  );
}
