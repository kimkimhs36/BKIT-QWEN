import { useMemo } from 'react';
import type { State } from './model';
import { weeklyLearningEvidence } from './learningEvidence';
import { needsSubmission } from './tasks';
import { buildResourceReviews } from './learningEngine';
import { buildProblemReviews } from './problemReview';

export function LearningEvidence({ state, today }: { state: State; today: string }) {
  const e = useMemo(() => weeklyLearningEvidence(state, today), [state, today]);
  const last = state.sessions[state.sessions.length - 1];
  const queue = useMemo(() => buildProblemReviews(state, today), [state, today]);
  const resourceAnswers = (state.learning?.attempts ?? []).filter((a) => a.sessionId === last?.id);
  const resourceNext = buildResourceReviews(state, today).find((c) =>
    c.attempts.some((a) => a.sessionId === last?.id),
  );
  const next = last
    ? [...queue.overdue, ...queue.today, ...queue.upcoming].find((c) => c.sessionId === last.id)
    : null;
  return (
    <>
      <section className="panel learning-evidence" aria-label="주간 학습 증거">
        <div className="section-head">
          <h2>이번 주, 실제로 남긴 증거</h2>
          <span className="chip">최근 7일</span>
        </div>
        {(state.learningEvents?.length ?? 0) >= 5000 && (
          <p role="status">
            시작 이벤트 저장 한도에 도달했습니다. 기존 기록은 유지하며 새 시작 통계는 누적하지
            않습니다. 답변과 세션 저장은 별개입니다.
          </p>
        )}
        <dl className="evidence-grid">
          <div>
            <dt>공부 시작</dt>
            <dd>{e.starts}회</dd>
          </div>
          <div>
            <dt>직접 쓴 답변</dt>
            <dd>{e.attempts}회</dd>
          </div>
          <div>
            <dt>힌트 없이 시도</dt>
            <dd>{e.independent}회</dd>
          </div>
          <div>
            <dt>힌트 없이 정답 자가 확인</dt>
            <dd>{e.confirmed}회</dd>
          </div>
          <div>
            <dt>첫 답변까지 경과시간 중앙값</dt>
            <dd>{e.medianSeconds === null ? '기록 부족' : Math.round(e.medianSeconds) + '초'}</dd>
          </div>
          <div>
            <dt>지연 재시험 정답 자가 확인</dt>
            <dd>
              {e.delayedTotal
                ? `${e.delayedConfirmed}/${e.delayedTotal}회`
                : '아직 지연 복습 데이터가 부족합니다.'}
            </dd>
          </div>
        </dl>
        <p className="muted">
          첫 답변 시간은 앱을 연 시점 또는 전경 복귀부터 저장까지 {e.firstActionSamples}건
          기준입니다. 타이머·자가 보고 문제 수와 답변 기록은 별개입니다. 정답은 사용자가 확인하며
          성적·숙달을 자동 판정하지 않습니다.
        </p>
      </section>
      {last && (
        <section className="panel evidence-receipt" aria-label="최근 학습 성과 요약">
          <span className="eyebrow">LEARNING EVIDENCE RECEIPT</span>
          <h2>{last.action}</h2>
          <p>
            실제 집중 기록 {Math.floor(last.seconds / 60)}분 {Math.floor(last.seconds % 60)}초 ·
            {last.resourceId ? '직접 답을 확인한 문제 수' : '완료한 문제 수 (직접 입력)'}{' '}
            {last.problems}개
          </p>
          <p>
            저장한 답변 {(last.workspace?.attempts.length ?? 0) + resourceAnswers.length}회 · 정답
            자가 확인{' '}
            {(last.workspace?.attempts.filter((a) => a.selfCheck === 'remembered').length ?? 0) +
              resourceAnswers.filter((a) => a.selfCheck === 'correct').length}
            회 · 다시 풀기{' '}
            {(last.workspace?.attempts.filter((a) => a.selfCheck === 'retry').length ?? 0) +
              resourceAnswers.filter((a) => a.selfCheck === 'incorrect').length}
            회
          </p>
          <p>
            {resourceNext
              ? `다음 복습 ${resourceNext.due} · ${resourceNext.resource.title} ${resourceNext.problem.ordinal}번`
              : next
                ? `다음 복습 ${next.due} · ${next.problem.slice(0, 100)}`
                : '문제를 기록하면 다음 복습도 이곳에서 확인할 수 있어요.'}
          </p>
          <p>
            남은 학습 과제 {state.tasks.filter((t) => t.status !== 'done').length}개 · 완료 후 제출
            미확인 {state.tasks.filter(needsSubmission).length}개
          </p>
        </section>
      )}
    </>
  );
}
