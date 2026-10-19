import { useState, useEffect, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { Session, Task } from './model';

export type QuickLabelSave = (
  id: string,
  subject: string,
  action: string,
  note: string,
  taskId?: string,
) => boolean;
/** Mount with key=session.id so switching records never carries another record's draft. */
export function QuickSessionEditor({
  session,
  tasks,
  onSave,
  onClose,
}: {
  session: Session;
  tasks: Task[];
  onSave: QuickLabelSave;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(session.subject === '미분류' ? '' : session.subject);
  const [activity, setActivity] = useState(
    session.action === '바로 시작한 공부' ? '' : session.action,
  );
  const [note, setNote] = useState(session.concepts);
  const [taskId, setTaskId] = useState(session.taskId ?? '');
  const [error, setError] = useState('');
  const subjects = [
    ...new Set([
      '국어',
      '영어',
      '수학',
      '물리',
      '화학',
      '경제',
      '기타',
      ...(subject ? [subject] : []),
    ]),
  ];
  const dirty =
    subject !== (session.subject === '미분류' ? '' : session.subject) ||
    activity !== (session.action === '바로 시작한 공부' ? '' : session.action) ||
    note !== session.concepts ||
    taskId !== (session.taskId ?? '');
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: Event) => {
      event.preventDefault();
      setError('수정한 내용이 있어요. 내용 저장 또는 나중에 적기를 누른 뒤 이동해 주세요.');
    };
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    document.addEventListener('bkit:flush-learning-draft', guard);
    window.addEventListener('beforeunload', warn);
    return () => {
      document.removeEventListener('bkit:flush-learning-draft', guard);
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSave(session.id, subject, activity, note, taskId || undefined)) {
      setError('기록을 저장하지 못했어요. 입력을 유지했으니 다시 시도해 주세요.');
      return;
    }
    onClose();
  }
  return (
    <form onSubmit={save} className="quick-timer-form" aria-label="공부 기록 내용 수정">
      <p>시간은 이미 저장했어요. 과목과 메모는 선택이에요.</p>
      {(tasks.length > 0 || taskId) && (
        <label>
          기존 과제와 연결 (선택)
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">과제 연결 없이 기록</option>
            {taskId && !tasks.some((t) => t.id === taskId) && (
              <option value={taskId}>이전에 연결한 과제 (현재 목록에 없음)</option>
            )}
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.subject} · {task.title}
                {task.status === 'done' ? ' (완료)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        과목 (선택)
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">나중에 선택</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        무엇을 공부했어? (선택)
        <input
          placeholder="예: 미적분 학습지 3쪽"
          maxLength={200}
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
      </label>
      <label>
        짧은 메모 (선택)
        <textarea rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="quick-timer-actions">
        <button type="submit" className="primary">
          <Check size={16} /> 내용 저장
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          나중에 적기
        </button>
      </div>
    </form>
  );
}
