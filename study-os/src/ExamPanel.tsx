import { learning, resourceProgress, buildResourceReviews } from './learningEngine';
import { useState, type FormEvent } from 'react';
import { uid, type State } from './model';
import { iso } from './time';
import { daysUntilExam, examScopeStatus, examStudyOptions, type Exam } from './exams';

export function ExamPanel({
  state,
  today,
  onSave,
  onStart,
  onOpenResource,
}: {
  state: State;
  today: string;
  onSave: (exam: Exam) => boolean;
  onStart: (taskId: string) => void;
  onOpenResource?: (resourceId: string, problemId?: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const exams = [...(state.exams ?? [])].sort(
    (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id),
  );
  const current = exams.find((e) => e.id === editing);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();
    if (value('confirmedScope') && !value('source')) {
      setError('확인한 범위의 출처를 적어 주세요.');
      return;
    }
    const exam: Exam = {
      id: current?.id ?? uid(),
      subject: value('subject'),
      title: value('title'),
      date: value('date') || null,
      confirmedScope: value('confirmedScope'),
      uncertainScope: value('uncertainScope'),
      source: value('source'),
      availableMaterials: value('availableMaterials'),
      missingMaterials: value('missingMaterials'),
      weakConcepts: value('weakConcepts'),
      linkedResourceIds: form.getAll('linkedResourceIds').map(String),
      updatedAt: iso(Date.now()),
    };
    if (onSave(exam)) {
      setEditing(null);
      setError('');
    } else setError('저장하지 못했습니다. 입력 내용은 유지됩니다.');
  }
  return (
    <section className="panel exam-panel" aria-label="시험 범위 관리">
      <div className="section-head">
        <h2>시험 준비, 확인된 것부터</h2>
        <button
          className="secondary"
          onClick={() => {
            setEditing('new');
            setError('');
          }}
        >
          시험 추가
        </button>
      </div>
      <p>시험 날짜·범위를 추측하지 않아요. 확정된 범위와 확인이 필요한 내용을 나눠 보관하세요.</p>
      {!exams.length && editing === null && <p className="muted">아직 등록한 시험이 없습니다.</p>}
      {editing !== null && (
        <form className="exam-form" key={editing} onSubmit={submit}>
          <div className="form-grid">
            <label>
              시험 과목
              <input
                name="subject"
                required
                maxLength={200}
                defaultValue={current?.subject ?? ''}
              />
            </label>
            <label>
              시험 이름
              <input name="title" required maxLength={200} defaultValue={current?.title ?? ''} />
            </label>
            <label>
              확인된 시험 날짜 (모르면 비우기)
              <input name="date" type="date" defaultValue={current?.date ?? ''} />
            </label>
          </div>
          {[
            ['confirmedScope', '확인된 시험 범위'],
            ['uncertainScope', '포함 여부를 확인할 범위'],
            ['source', '시험 범위 출처'],
            ['availableMaterials', '확보한 자료 (직접 확인)'],
            ['missingMaterials', '부족한 자료'],
            ['weakConcepts', '더 연습할 개념'],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <textarea
                name={name}
                rows={2}
                maxLength={3000}
                defaultValue={current?.[name as keyof Exam] ?? ''}
              />
            </label>
          ))}
          <fieldset>
            <legend>시험 범위로 직접 확인한 자료 연결</legend>
            {learning(state).resources.map((r) => (
              <label className="sleep-check" key={r.id}>
                <input
                  type="checkbox"
                  name="linkedResourceIds"
                  value={r.id}
                  defaultChecked={current?.linkedResourceIds?.includes(r.id)}
                />
                {r.subject} · {r.title}
              </label>
            ))}
            <p className="muted">
              체크한 자료만 시험 연계 복습에 사용합니다. 과목만 같다는 이유로 범위에 포함하지
              않습니다.
            </p>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <div className="sleep-actions">
            <button className="primary" type="submit">
              시험 정보 저장
            </button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>
              편집 닫기
            </button>
          </div>
        </form>
      )}
      {exams.map((exam) => {
        const days = daysUntilExam(exam, today),
          materials = examStudyOptions(exam, state);
        return (
          <article key={exam.id} className="exam-card">
            <div className="section-head">
              <h3>
                {exam.subject} · {exam.title}
              </h3>
              <span className="chip">범위 {examScopeStatus(exam)}</span>
            </div>
            <p>
              {exam.date ?? '시험 날짜 미확인'}
              {days === null
                ? ''
                : days < 0
                  ? ' · 시험일 지남'
                  : days === 0
                    ? ' · 오늘'
                    : ` · ${days}일 남음`}
            </p>
            <dl>
              <dt>확인된 범위</dt>
              <dd>{exam.confirmedScope || '아직 미확인'}</dd>
              <dt>미확인 범위</dt>
              <dd>{exam.uncertainScope || '별도 기록 없음'}</dd>
              <dt>출처</dt>
              <dd>{exam.source || '미확인'}</dd>
            </dl>
            {(exam.linkedResourceIds ?? []).map((id) => {
              const resource = learning(state).resources.find((r) => r.id === id);
              if (!resource) return <p key={id}>이전 자료 연결 보존: {id}</p>;
              const progress = resourceProgress(learning(state), id),
                reviews = buildResourceReviews(state, today).filter((c) => c.resource.id === id);
              return (
                <div key={id} className="resource-review-card">
                  <strong>{resource.title}</strong>
                  <p>
                    남은 문제 {progress.remainingCount}/{progress.total} · 복습 대상{' '}
                    {reviews.length} · 실제 답변{' '}
                    {
                      learning(state).attempts.filter((a) =>
                        learning(state).problems.some(
                          (p) => p.id === a.problemId && p.resourceId === id,
                        ),
                      ).length
                    }
                    회
                  </p>
                  <button onClick={() => onOpenResource?.(id)}>시험 연결 자료 이어 풀기</button>
                </div>
              );
            })}
            <details>
              <summary>자료와 취약 개념 확인</summary>
              <p>확보한 자료: {exam.availableMaterials || '미등록'}</p>
              <p>부족한 자료: {exam.missingMaterials || '미등록'}</p>
              <p>연습할 개념: {exam.weakConcepts || '미등록'}</p>
              {materials.length > 0 ? (
                <>
                  <p>이 과목으로 등록한 실제 자료 · 시험 범위와의 일치는 직접 확인해 주세요.</p>
                  {materials.map((task) => (
                    <button className="secondary" key={task.id} onClick={() => onStart(task.id)}>
                      {task.title} · 자료로 5분 시작
                    </button>
                  ))}
                </>
              ) : (
                <p>연결된 과제 사진이 없습니다. 자료 추가에서 직접 등록할 수 있어요.</p>
              )}
            </details>
            <button
              className="text-button"
              onClick={() => {
                setEditing(exam.id);
                setError('');
              }}
            >
              이 시험 수정
            </button>
          </article>
        );
      })}
    </section>
  );
}
