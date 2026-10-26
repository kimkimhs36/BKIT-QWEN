import { useState } from 'react';
import { learningConcepts, subjectEngines } from './catalogue';
import { dueReviews, evidence, recommendation, type Session, type StudyDocument } from './engine';
import type { Concept } from './content';
export function DailyRoad({
  document,
  begin,
  now,
}: {
  document: StudyDocument;
  now: number;
  begin: (kind: Session['kind'], free?: boolean, concept?: Concept) => void;
}) {
  // Per-visit planning intentionally creates no new durable learning or mastery data.
  const [minutes, setMinutes] = useState(15),
    [examWeek, setExamWeek] = useState(false);
  const next = recommendation(document, now),
    reviews = dueReviews(document, now);
  const limit = examWeek || minutes === 5 ? 1 : minutes === 15 ? 2 : 3;
  const plan = reviews.slice(0, limit);
  const weak = learningConcepts.filter((c) => {
    const e = evidence(document, c.id, now);
    return e.count && (e.state === '선수개념 복구' || e.state === '도움 후 해결');
  });
  return (
    <section className="jg-card jg-daily-road">
      <p className="jg-eyebrow">TODAY’S CAPACITY / 오늘의 여유</p>
      <h2>오늘 가능한 만큼만.</h2>
      <div className="jg-capacity-controls">
        <label className="jg-field">
          오늘 가능한 시간
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            <option value={5}>5분 · 최소 한 문제</option>
            <option value={15}>15분 · 짧은 복습</option>
            <option value={30}>30분 · 복습과 적용</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={examWeek}
            onChange={(e) => setExamWeek(e.target.checked)}
          />{' '}
          학교 시험 기간 · 한 문제에 집중
        </label>
      </div>
      <p>
        이번 방문의 제안입니다. 하루를 쉬어도 다음날 학습량을 두 배로 늘리지 않아요. 시간은 예상이며
        제한 타이머가 아닙니다.
      </p>
      <ol>
        {plan.length ? (
          plan.map((e) => (
            <li key={e.concept}>
              <button onClick={() => begin('review', false, e.concept)}>
                지연 확인 · {learningConcepts.find((c) => c.id === e.concept)!.name}
              </button>
            </li>
          ))
        ) : (
          <li>
            <button
              onClick={() =>
                begin(minutes === 5 || examWeek ? 'ignition' : next.kind, false, next.concept)
              }
            >
              오늘의 최소 한 문제 · {learningConcepts.find((c) => c.id === next.concept)!.name}
            </button>
          </li>
        )}
      </ol>
      <p>
        {weak.length
          ? '도움이 필요했던 개념: ' + weak.map((c) => c.name).join(', ')
          : '선수개념 부족 여부는 실제 답변이 쌓인 뒤 판단합니다.'}
      </p>
      <details>
        <summary>과목별 다음 학습 형식과 제공 상태</summary>
        {subjectEngines.map((s) => (
          <p key={s.subject}>
            <b>{s.subject}</b> · {s.tasks} ·{' '}
            {s.available ? '기초 선수학습 제공' : '콘텐츠 검수 대기 / 진단·숙달도 없음'}
          </p>
        ))}
      </details>
    </section>
  );
}
