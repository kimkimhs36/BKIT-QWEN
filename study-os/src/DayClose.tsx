import type { State } from './model';
import type { GarageState } from './drive/garage';
import { dayKey, addDays, at } from './time';
import { juggernautProgress } from './juggernautProgress';
import { nextSchedule } from './engine';
import { quickClock } from './quickTimer';
import { Car } from './drive/Car';
export function DayClose({
  state,
  garage,
  now,
  onStart,
}: {
  state: State;
  garage: GarageState;
  now: number;
  onStart: () => void;
}) {
  const today = dayKey(now),
    data = juggernautProgress(state, now),
    next = nextSchedule(state, at(addDays(today, 1), '00:00'));
  const tasks = state.tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === today),
    pending = state.tasks.filter(
      (t) =>
        t.status === 'done' &&
        !t.submitted &&
        (t.submissionRequired || t.kind === '숙제' || t.kind === '수행평가'),
    );
  const transactions = garage.transactions.filter((t) => dayKey(t.at) === today),
    earned = transactions.filter((t) => t.amount > 0).reduce((n, t) => n + t.amount, 0),
    parts = transactions.filter((t) => t.reason === 'purchase').length;
  const nextTask = state.tasks.find((t) => t.status !== 'done');
  return (
    <details className="day-close panel">
      <summary>오늘을 마치며 · 다음 한 걸음</summary>
      <p>
        {data.todaySeconds > 0
          ? '오늘 남긴 공부를 천천히 살펴봐요.'
          : '공부가 어려운 날도 있어요. 다음 한 걸음은 작아도 괜찮아요.'}
      </p>
      <dl>
        <div>
          <dt>실제 공부</dt>
          <dd>{quickClock(data.todaySeconds)}</dd>
        </div>
        <div>
          <dt>오늘 완료한 과제</dt>
          <dd>{tasks.length}개</dd>
        </div>
        <div>
          <dt>오늘 직접 확인한 자료 문제</dt>
          <dd>
            {
              new Set(
                state.learning?.attempts
                  .filter((a) => a.checkedAt && dayKey(a.checkedAt) === today)
                  .map((a) => a.problemId),
              ).size
            }
            개
          </dd>
        </div>
        <div>
          <dt>제출 확인이 남은 과제</dt>
          <dd>{pending.length}개</dd>
        </div>
      </dl>
      {next && dayKey(next.start) === addDays(today, 1) && <p>내일의 다음 일정 · {next.title}</p>}
      <p>
        오늘 +{earned} CR · 차고에 추가한 부품 {parts}개
      </p>
      <div className="day-close-car">
        <Car car={garage.car} />
      </div>
      <p>
        다음 작은 행동 ·{' '}
        {nextTask
          ? nextTask.subject + ' ' + nextTask.title + '의 첫 문제'
          : '개념 하나 떠올리고 한 줄 적기'}
      </p>
      <button className="secondary" onClick={onStart}>
        다음 5분 시작
      </button>
    </details>
  );
}
