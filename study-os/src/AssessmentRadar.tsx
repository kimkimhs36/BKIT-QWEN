import { ClipboardCheck, CalendarClock, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Task } from './model';
import { assessmentWatch, urgencyLabel } from './assessmentWatch';
import './assessment-radar.css';

export function AssessmentRadar({
  tasks, now, onAdd, onEdit, onAll,
}: {
  tasks: Task[];
  now: number;
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onAll: () => void;
}) {
  const watch = assessmentWatch(tasks, now);
  const urgent = watch.critical.slice(0, 4);
  const submittedPending = watch.completedNotSubmitted.slice(0, 3);
  return (
    <section className="assessment-radar" aria-label="수행평가 및 제출 준비">
      <header className="assessment-radar-head">
        <div>
          <span className="assessment-radar-kicker"><ClipboardCheck size={16} aria-hidden="true"/> PERFORMANCE / INBOX</span>
          <h2>다가오는 수행·제출</h2>
          <p>완료와 제출은 따로 확인해. 확실하지 않은 마감은 추측하지 않아.</p>
        </div>
        <button type="button" className="assessment-radar-add" onClick={onAdd}>
          <Plus size={17} aria-hidden="true" /> 수행 등록
        </button>
      </header>
      <div className="assessment-radar-counts" aria-label="제출 준비 요약">
        <span><strong>{watch.critical.length}</strong>개 · 2일 내 확인</span>
        <span><strong>{watch.completedNotSubmitted.length}</strong>개 · 완료 후 제출 확인</span>
        <span><strong>{watch.undated.length}</strong>개 · 날짜 미확인</span>
      </div>
      {urgent.length === 0 && submittedPending.length === 0 && watch.undated.length === 0 ? (
        <p className="assessment-radar-empty">급한 수행평가가 등록되지 않았어. 새 과제가 나오면 제목과 마감일만 적어도 돼.</p>
      ) : (
        <div className="assessment-radar-list">
          {urgent.map(task => <button type="button" className="assessment-radar-item" key={task.id} onClick={() => onEdit(task)}>
            <CalendarClock size={17} aria-hidden="true" />
            <span className="assessment-radar-detail"><strong>{task.subject} · {task.title}</strong>
              <small>{urgencyLabel(watch.byId.get(task.id)!)}{task.deadline?.precision === 'date-only' ? ' · 시각 미확인' : ''} · {task.kind}</small></span>
            <ArrowRight size={16} aria-hidden="true"/>
          </button>)}
          {submittedPending.map(task => <button type="button" className="assessment-radar-item assessment-radar-unsent" key={task.id} onClick={() => onEdit(task)}>
            <CheckCircle2 size={17} aria-hidden="true" />
            <span className="assessment-radar-detail"><strong>{task.subject} · {task.title}</strong>
              <small>학습 완료 · 제출 기록 확인 필요</small></span>
            <ArrowRight size={16} aria-hidden="true"/>
          </button>)}
          {watch.undated.slice(0, 2).map(task => <button type="button" className="assessment-radar-item" key={task.id} onClick={() => onEdit(task)}>
            <CalendarClock size={17} aria-hidden="true" />
            <span className="assessment-radar-detail"><strong>{task.subject} · {task.title}</strong>
              <small>마감 미확인 · 선생님 공지 확인 필요</small></span>
            <ArrowRight size={16} aria-hidden="true"/>
          </button>)}
        </div>
      )}
      {watch.totalUnsubmitted > urgent.length + submittedPending.length && (
        <button type="button" className="assessment-radar-all" onClick={onAll}>
          나머지 제출·수행 과제 보기 <ArrowRight size={15} aria-hidden="true"/>
        </button>
      )}
    </section>
  );
}
