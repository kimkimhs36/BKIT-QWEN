import { useState } from 'react';
import type { State, Task } from './model';
import { formatTaskDeadline } from './capture';
import { resourceProgress } from './learningEngine';
// Ignore surrounding whitespace/case only: elective subjects are never merged.
const key = (s: string) => s.trim().toLocaleLowerCase();
export function SubjectWorkspace({
  state,
  onEdit,
  onResource,
}: {
  state: State;
  onEdit: (task: Task) => void;
  onResource: (id: string) => void;
}) {
  const subjects = [
    ...new Set([
      ...state.tasks.map((t) => t.subject),
      ...(state.learning?.resources ?? []).map((r) => r.subject),
      ...state.sessions.map((s) => s.subject),
    ]),
  ];
  const [subject, setSubject] = useState(subjects[0] ?? '');
  const tasks = state.tasks.filter((t) => key(t.subject) === key(subject));
  const resources = (state.learning?.resources ?? []).filter(
    (r) => key(r.subject) === key(subject) && !r.archived,
  );
  const sessions = state.sessions.filter((s) => key(s.subject) === key(subject));
  return (
    <section className="daily-panel" aria-label="과목 학습 공간">
      <h2>과목 학습 공간</h2>
      <label>
        공부할 과목
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {!subjects.length && <p>과제나 학습지를 등록하면 과목별로 함께 볼 수 있어요.</p>}
      <p>
        기록한 공부 {Math.floor(sessions.reduce((sum, s) => sum + s.seconds, 0) / 60)}분 · 문제에
        답한 공부 {sessions.filter((s) => s.workspace?.attempts.length).length}회
      </p>
      <h3>숙제 · 수행평가</h3>
      {tasks.map((t) => (
        <div className="daily-linked" key={t.id}>
          <button onClick={() => onEdit(t)}>
            {t.title} · {formatTaskDeadline(t)}
          </button>
          <p>
            학습 {t.status === 'done' ? '완료' : '미완료'} · 제출 {t.submitted ? '완료' : '미확인'}{' '}
            · 이 기기 사진 {t.attachmentIds?.length ?? 0}장
          </p>
        </div>
      ))}
      <h3>연결된 학습 자료 · 복습</h3>
      {resources.map((r) => {
        const p = resourceProgress(state.learning!, r.id);
        return (
          <div className="daily-linked" key={r.id}>
            <strong>{r.title}</strong>
            <p>
              미완료 {p.remainingCount} · 직접 풀이 확인 {p.completedCount}/{p.total}
            </p>
            <button onClick={() => onResource(r.id)}>자료 이어하기</button>
          </div>
        );
      })}
      <p className="hint">
        사진·PDF·풀이와 자료는 저장한 기기에 있어요. 공지 원본은 학교 공지 받은함, 문제별 복습은
        기록의 ‘과목별 분석 · 오답 복습’에서 확인하세요.
      </p>
    </section>
  );
}
