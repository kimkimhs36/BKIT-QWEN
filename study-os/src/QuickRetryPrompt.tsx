import { useState } from 'react';
import { Play } from 'lucide-react';
import { quickClock } from './quickTimer';
import './quick-timer.css';

type Props = {
  initialProblem?: string;
  savedSeconds?: number;
  onStart: (problem?: string) => void;
  className?: string;
};

/** Reuse the actual 5-minute study + problem-workspace action in focus and on Home. */
export function QuickRetryPrompt({ initialProblem = '', savedSeconds, onStart, className = '' }: Props) {
  // Keep draft local until the learner explicitly starts, never alter saved records on typing.
  const [problem, setProblem] = useState(initialProblem);
  return (
    <section className={['quick-timer-retry', className].filter(Boolean).join(' ')} aria-label="저장한 공부 다음 행동">
      <span className="quick-timer-retry-step">NEXT · 한 문제만</span>
      {savedSeconds !== undefined && (
        <strong role="status" className="quick-timer-retry-saved">최근 집중 {quickClock(savedSeconds)} 저장됨</strong>
      )}
      <p>시간은 저장됐어요. 문제 하나를 해설 없이 다시 풀어볼까요?</p>
      <label className="quick-timer-retry-problem">
        <span>다시 풀 문제 (선택)</span>
        <input
          aria-label="다시 풀 문제 (선택)"
          type="text"
          maxLength={200}
          autoComplete="off"
          placeholder="예: 수학 학습지 3쪽 4번"
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
        />
      </label>
      <button type="button" className="primary" onClick={() => onStart(problem.trim() || undefined)}>
        <Play size={16} aria-hidden="true" /> 혼자 다시 풀기 · 5분
      </button>
      <small>입력한 문제만 기존 문제 풀이 공간에 연결해요. 비워 두면 자유 재풀이로 시작하며, 정답·완료·제출은 스스로 확인해야 해요.</small>
    </section>
  );
}
