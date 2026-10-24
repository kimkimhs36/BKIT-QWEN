import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, RotateCcw, Search, Trash2, X } from 'lucide-react';
import type { Session, Task } from './model';
import { QuickSessionEditor } from './QuickSessionEditor';
import type { SessionEdits } from './studyRecordOps';
import { clock, dayKey } from './time';
import { quickClock } from './quickTimer';
import './study-record-manager.css';

type Props = {
  sessions: Session[];
  tasks: Task[];
  onQuickLabel: (id: string, subject: string, action: string, note: string, taskId?: string) => boolean;
  canUndo: boolean;
  onEdit: (id: string, edits: SessionEdits) => boolean;
  onDelete: (ids: string[]) => boolean;
  onUndo: () => boolean;
};

export function StudyRecordManager({ sessions, tasks, onQuickLabel, canUndo, onEdit, onDelete, onUndo }: Props) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'quick' | 'focus'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionEdits | null>(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(15);
  const filtered = useMemo(
    () =>
      [...sessions]
        .reverse()
        .filter((s) => (kind === 'all' || (kind === 'quick' ? !!s.quick : !s.quick)))
        .filter((s) =>
          [s.subject, s.action, s.concepts, dayKey(s.ended)]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        ),
    [sessions, kind, query],
  );
  const visible = filtered.slice(0, limit);
  const selectedValid = selected.filter((id) => sessions.some((s) => s.id === id));

  function edit(s: Session) {
    setEditing(s.id);
    setError('');
    setDraft({
      subject: s.subject,
      action: s.action,
      concepts: s.concepts,
      rating: s.rating,
      mistake: s.mistake,
    });
  }
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || !draft) return;
    if (!draft.subject.trim() || !draft.action.trim()) {
      setError('과목과 공부 내용은 비울 수 없어요.');
      return;
    }
    if (!onEdit(editing, draft)) {
      setError('변경을 저장하지 못했어요. 입력한 내용은 유지돼요.');
      return;
    }
    setEditing(null);
    setDraft(null);
    setError('');
  }
  function remove() {
    if (!pending?.length) return;
    if (!onDelete(pending)) {
      setError('삭제하지 못했어요. 기존 기록은 유지돼요.');
      return;
    }
    setSelected((old) => old.filter((id) => !pending.includes(id)));
    if (editing && pending.includes(editing)) {
      setEditing(null);
      setDraft(null);
    }
    if (linking && pending.includes(linking)) setLinking(null);
    setPending(null);
    setError('');
  }
  const everyVisibleSelected =
    visible.length > 0 && visible.every((s) => selectedValid.includes(s.id));

  return (
    <section className="study-record-manager" aria-label="학습 기록 관리">
      <header className="record-manager-heading">
        <div>
          <h2>학습 기록 관리</h2>
          <p>{sessions.length}개 기록 · 검색하고 필요한 것만 남겨요.</p>
        </div>
        {canUndo && (
          <button type="button" className="record-manager-undo" onClick={onUndo}>
            <RotateCcw size={15} /> 삭제 취소
          </button>
        )}
      </header>
      {sessions.length > 0 && (
        <>
          <div className="record-manager-tools">
            <label className="record-manager-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="학습 기록 검색"
                type="search"
                placeholder="과목 · 공부 내용 · 날짜 검색"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(15);
                  setSelected([]);
                  setPending(null);
                }}
              />
            </label>
            <select
              aria-label="학습 기록 유형"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setSelected([]);
                setPending(null);
              }}
            >
              <option value="all">전체 기록</option>
              <option value="quick">빠른 타이머</option>
              <option value="focus">집중 공부</option>
            </select>
          </div>
          {filtered.length > 0 && (
            <div className="record-manager-bulk">
              <label>
                <input
                  type="checkbox"
                  aria-label="보이는 기록 모두 선택"
                  checked={everyVisibleSelected}
                  onChange={(e) => {
                    const shown = new Set(visible.map((s) => s.id));
                    setSelected((old) =>
                      e.target.checked
                        ? [...new Set([...old, ...shown])]
                        : old.filter((id) => !shown.has(id)),
                    );
                  }}
                />
                보이는 기록 선택
              </label>
              {selectedValid.length > 0 && (
                <button
                  type="button"
                  className="record-manager-delete"
                  onClick={() => setPending(selectedValid)}
                >
                  <Trash2 size={15} /> {selectedValid.length}개 삭제
                </button>
              )}
            </div>
          )}
          {pending && (
            <div className="record-manager-confirm" role="alertdialog" aria-label="학습 기록 삭제 확인">
              <p>
                <strong>{pending.length}개 기록을 삭제할까요?</strong>
                <span>공부 시간 통계에서 제외돼요. 과제·자료·별도 저장 답안은 그대로 남아요.</span>
              </p>
              <div>
                <button type="button" className="record-manager-delete" onClick={remove}>
                  삭제하기
                </button>
                <button type="button" className="secondary" onClick={() => setPending(null)}>
                  취소
                </button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="record-manager-error">{error}</p>}
          <div className="record-manager-list">
            {visible.map((session) => (
              <article className="record-manager-item" key={session.id}>
                <input
                  type="checkbox"
                  aria-label={session.action + ' 기록 선택'}
                  checked={selectedValid.includes(session.id)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked
                        ? [...new Set([...old, session.id])]
                        : old.filter((id) => id !== session.id),
                    )
                  }
                />
                <div className="record-manager-item-body">
                  <span className="record-manager-meta">
                    {dayKey(session.ended)} · {clock(session.started)}–{clock(session.ended)}
                    {' · '}{session.quick ? '빠른 타이머' : '집중 공부'}
                  </span>
                  <strong>{session.subject} · {session.action}</strong>
                  <p>{quickClock(session.seconds)} · {session.problems}문제 · {session.rating}</p>
                  {session.concepts && <p className="record-manager-note">{session.concepts}</p>}
                  {session.reason && <p className="record-manager-note">종료 사유: {session.reason}</p>}
                  {session.mistake && <p className="record-manager-note">다시 볼 개념: {session.mistake}</p>}
                  {session.pauses.length > 0 && (
                    <details>
                      <summary>일시정지 내역 {session.pauses.length}개</summary>
                      {session.pauses.map((p, i) => <p key={i}>{clock(p.at)} · {p.reason}</p>)}
                    </details>
                  )}
                  {session.exam && (
                    <details>
                      <summary>모의시험 · {session.exam.problemIds.length}문항 결과</summary>
                      <p>{session.exam.finishedAt ? '시험 시간 종료' : '직접 종료'} · {quickClock(session.seconds)} / {quickClock(session.exam.duration)}</p>
                      <p>검토 {session.questionPace?.review.length ?? 0} · 건너뜀 {session.questionPace?.skipped?.length ?? 0}</p>
                      {session.questionPace && session.exam.problemIds.map((id, i) => (
                        <p key={id}>{i + 1}번 · {quickClock(
                          (session.questionPace!.seconds[id] ?? 0) +
                          (session.questionPace!.current === id
                            ? Math.max(0, session.seconds - session.questionPace!.anchor)
                            : 0),
                        )}</p>
                      ))}
                    </details>
                  )}
                  {editing === session.id && draft && (
                    <form className="record-manager-editor" onSubmit={save}>
                      <label>과목
                        <input required maxLength={200} value={draft.subject}
                          onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                      </label>
                      <label>공부 내용
                        <input required maxLength={200} value={draft.action}
                          onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
                      </label>
                      <label>짧은 메모
                        <input maxLength={200} value={draft.concepts}
                          onChange={(e) => setDraft({ ...draft, concepts: e.target.value })} />
                      </label>
                      <label>자가 평가
                        <select value={draft.rating}
                          onChange={(e) => setDraft({ ...draft, rating: e.target.value as SessionEdits['rating'] })}>
                          <option>어려움</option><option>보통</option><option>이해함</option>
                        </select>
                      </label>
                      <label>오답 · 복습 메모
                        <textarea rows={2} maxLength={3000} value={draft.mistake}
                          onChange={(e) => setDraft({ ...draft, mistake: e.target.value })} />
                      </label>
                      <div className="record-manager-actions">
                        <button className="primary" type="submit">변경 저장</button>
                        <button className="secondary" type="button" onClick={() => { setEditing(null); setDraft(null); setError(''); }}>취소</button>
                      </div>
                    </form>
                  )}
                  <div className="record-manager-actions">
                    <button type="button" onClick={() => editing === session.id ? (setEditing(null), setDraft(null)) : edit(session)}>
                      {editing === session.id ? '수정 닫기' : '수정'}
                    </button>
                    {session.quick && (
                      <button
                        type="button"
                        onClick={() => setLinking(linking === session.id ? null : session.id)}
                        aria-expanded={linking === session.id}
                      >과제 연결</button>
                    )}
                    <button type="button" onClick={() => setPending([session.id])}>
                      <Trash2 size={14} /> 삭제
                    </button>
                  </div>
                  {session.quick && linking === session.id && (
                    <QuickSessionEditor
                      key={session.id}
                      session={session}
                      tasks={tasks}
                      onSave={onQuickLabel}
                      onClose={() => setLinking(null)}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && <p className="record-manager-empty">검색 결과가 없어요.</p>}
          {filtered.length > limit && (
            <button
              className="record-manager-more"
              type="button"
              onClick={() => setLimit((n) => n + 20)}
            >
              기록 더 보기 ({filtered.length - limit}개 남음) <ChevronDown size={15} />
            </button>
          )}
        </>
      )}
      {!sessions.length && <p className="record-manager-empty">아직 저장한 공부 기록이 없어요. 테스트 타이머는 저장하지 않고 종료할 수 있어요.</p>}
      <p className="record-manager-footnote">
        삭제는 공부 세션 기록에만 적용돼요. 별도로 저장한 문제 답안·과제·자료는 삭제하지 않아요.
      </p>
    </section>
  );
}
