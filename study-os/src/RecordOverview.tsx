import { ArrowRight } from 'lucide-react';
import type { Session } from './model';
import { recentStudyDays } from './studyInsights';
import { addDays, dayKey } from './time';
import { StudyRhythm } from './StudyRhythm';

export function RecordOverview({
  sessions,
  today,
  onStart,
}: {
  sessions: Session[];
  today: string;
  onStart: () => void;
}) {
  if (!sessions.length)
    return (
      <section className="record-first-study" aria-label="첫 공부 시작">
        <p>첫 공부를 기록해 볼까요?</p>
        <button className="primary" onClick={onStart}>
          공부 시작
          <ArrowRight size={18} />
        </button>
      </section>
    );
  const days = recentStudyDays(sessions, today);
  const lastNote = [...sessions].reverse().find((s) => s.learningStep?.note.trim());
  const first = addDays(today, -6);
  const problems = sessions
    .filter((s) => dayKey(s.ended) >= first && dayKey(s.ended) <= today)
    .reduce((n, s) => n + s.problems, 0);
  return (
    <section className="compact-record-overview" aria-label="학습 기록 요약">
      <div className="compact-record-stats">
        <div>
          <span>최근 7일 공부 시간</span>
          <strong>
            {Math.floor(days.reduce((n, d) => n + d.seconds, 0) / 60)}
            <small>분</small>
          </strong>
        </div>
        <div>
          <span>최근 7일 푼 문제</span>
          <strong>
            {problems}
            <small>문제</small>
          </strong>
        </div>
      </div>
      <StudyRhythm sessions={sessions} today={today} />
      {lastNote && (
        <details className="record-learning-note">
          <summary>최근 공부 메모 · {lastNote.subject}</summary>
          <strong>{lastNote.action}</strong>
          <p>{lastNote.learningStep!.note}</p>
          <small>직접 남긴 메모 · 정답 확인과는 별개예요.</small>
        </details>
      )}
    </section>
  );
}
