import { ArrowRight, CalendarClock } from 'lucide-react';
import type { Task } from './model';
import { deadlineDigest } from './studyInsights';
import { dayKey, clock } from './time';

export function DeadlinePulse({
  tasks, now, onTasks, onAdd,
}: {
  tasks: Task[];
  now: number;
  onTasks: () => void;
  onAdd: () => void;
}) {
  const d = deadlineDigest(tasks, now);
  const title = d.overdue > 0
    ? '기한 지난 과제 ' + d.overdue + '개'
    : d.soon > 0 ? '48시간 안에 마감 ' + d.soon + '개'
    : d.unknown > 0 ? '마감일 확인 ' + d.unknown + '개'
    : d.total > 0 ? '가까운 마감은 없어' : '과제를 등록해 봐';
  const next = d.earliest
    ? d.earliest.subject + ' · ' + d.earliest.title + ' · ' + dayKey(d.earliest.due!) + ' ' + clock(d.earliest.due!)
    : d.total ? '등록된 과제 ' + d.total + '개' : '과제를 기록하면 마감을 알려줄게';
  return (
    <section className="deadline-pulse" aria-label="마감 확인">
      <div className="deadline-pulse-intro">
        <span className="deadline-pulse-kicker"><CalendarClock size={16} /> 마감 확인</span>
        <h2>{title}</h2>
        <p>{next}</p>
      </div>
      <button className="deadline-pulse-action" onClick={d.total ? onTasks : onAdd}>
        {d.total ? '과제 보기' : '추가하기'} <ArrowRight size={17} />
      </button>
    </section>
  );
}
