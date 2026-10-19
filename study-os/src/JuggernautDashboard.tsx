import { useState } from 'react';
import type { State } from './model';
import { juggernautProgress } from './juggernautProgress';
import { dayKey, at } from './time';
import { quickClock } from './quickTimer';

export function JuggernautDashboard({
  state,
  now,
  onChange,
  onResumeResource,
}: {
  state: State;
  now: number;
  onChange: (fn: (s: State) => State) => boolean;
  onResumeResource: (id: string) => void;
}) {
  const data = juggernautProgress(state, now);
  const goal = state.juggernaut?.weeklyMinutes ?? 300;
  const [date, setDate] = useState(state.juggernaut?.examDate ?? '');
  const [minutes, setMinutes] = useState(goal);
  const [message, setMessage] = useState('');
  const days = state.juggernaut?.examDate
    ? Math.ceil((at(state.juggernaut.examDate, '00:00') - at(dayKey(now), '00:00')) / 86400000)
    : null;
  return (
    <section className="jg-progress" aria-label="JUGGERNAUT 실제 학습 현황">
      <span className="eyebrow">BKIT / LONG ROUTE</span>
      <h3>다음 5분을 위한 기록</h3>
      <p>
        {days === null
          ? '시험 날짜를 직접 확인해 설정하세요.'
          : days >= 0
            ? `나의 시험 D-${days}`
            : '설정한 시험 날짜가 지났어요. 다음 날짜를 확인하세요.'}
      </p>
      <dl className="jg-progress-grid">
        <div>
          <dt>오늘 실제 학습</dt>
          <dd>{quickClock(data.todaySeconds)}</dd>
        </div>
        <div>
          <dt>이번 주 공부 시작</dt>
          <dd>{data.starts}회</dd>
        </div>
        <div>
          <dt>이번 주 풀이 기록</dt>
          <dd>{data.solved}문제</dd>
        </div>
        <div>
          <dt>다시 확인할 자료 문제</dt>
          <dd>{data.review}문제</dd>
        </div>
      </dl>
      <label>
        주간 시간 목표 · {Math.floor(data.weekSeconds / 60)} / {goal}분
        <progress
          value={Math.min(data.weekSeconds, goal * 60)}
          max={goal * 60}
          aria-label="주간 학습 시간 목표"
        />
      </label>
      <p>시간 목표의 달성도예요. 점수나 실력을 나타내지 않아요.</p>
      {data.resume && (
        <button className="jg-primary" onClick={() => onResumeResource(data.resume!.id)}>
          {data.resume.subject} · {data.resume.title} 이어 풀기
        </button>
      )}
      <details>
        <summary>과목별 누적 시간·다가오는 마감</summary>
        {data.subjects.length ? (
          data.subjects.map((s) => (
            <p key={s.subject}>
              {s.subject} · {quickClock(s.seconds)}
            </p>
          ))
        ) : (
          <p>첫 학습 기록을 기다리고 있어요.</p>
        )}
        <p>
          앞으로 3일 내 마감 {data.dueTasks.length}개 · 등록된 학습 계획{' '}
          {Math.round(data.plannedMinutes)}분
        </p>
        {data.dueTasks.map((t) => (
          <p key={t.id}>
            {t.subject} · {t.title} · {t.deadline?.date ?? (t.due ? dayKey(t.due) : '날짜 미설정')}
          </p>
        ))}
        <p>마감과 수능 공부 시간을 함께 살펴보세요. 자동 충돌 판정이나 성적 예측은 하지 않아요.</p>
      </details>
      <details>
        <summary>나의 시험 날짜·주간 목표 설정</summary>
        <label>
          확인한 시험 날짜
          <input type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} />
        </label>
        <label>
          주간 학습 목표 (분)
          <input
            type="number"
            min={5}
            max={3000}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.currentTarget.value))}
          />
        </label>
        <button
          disabled={!Number.isInteger(minutes) || minutes < 5 || minutes > 3000}
          onClick={() => {
            const ok = onChange((s) => ({
              ...s,
              juggernaut: { examDate: date || null, weeklyMinutes: minutes },
            }));
            setMessage(
              ok ? '시험 날짜와 목표를 저장했어요.' : '저장하지 못했어요. 기존 설정을 유지했어요.',
            );
          }}
        >
          나의 목표 저장
        </button>
        <p role="status">{message}</p>
      </details>
    </section>
  );
}
