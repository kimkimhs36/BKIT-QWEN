import { activation } from './activation';
import { NoticePdf } from './NoticePdf';
import { useRef, useState } from 'react';
import { TaskMaterials } from './TaskMaterials';
import { PhotoText } from './PhotoText';
import {
  INBOX_KEY,
  inboxSchema,
  newNotice,
  noticeStatus,
  noticeTasks,
  type SchoolNotice,
  type SchoolInboxData,
} from './schoolInbox';
import { taskSchema, uid, type State, type Task } from './model';
import { captureDeadline } from './capture';
import { sameMission } from './atelier';
import { formatTaskDeadline } from './capture';

export function SchoolInbox({
  state,
  noticeId,
  onRegister,
  onEdit,
  onCalendar,
  onStart,
  onPaper,
}: {
  state: State;
  noticeId?: string;
  onRegister: (notice: SchoolNotice, task: Task) => boolean;
  onEdit: (task: Task) => void;
  onCalendar: (task: Task) => void;
  onStart: (id: string) => void;
  onPaper: (id: string) => void;
}) {
  const [initial] = useState(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(INBOX_KEY);
      return {
        raw,
        data: raw ? inboxSchema.parse(JSON.parse(raw)) : { version: 1 as const, notices: [] },
        error: '',
      };
    } catch {
      return {
        raw,
        data: { version: 1 as const, notices: [] },
        error:
          '공지 보관함을 읽지 못했어요. 원본을 덮어쓰지 않습니다. 아래에서 공지 원본 JSON을 먼저 내보내 주세요.',
      };
    }
  });
  const [data, setData] = useState<SchoolInboxData>(initial.data);
  const savedRaw = useRef(initial.raw);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [selected, setSelected] = useState(
    noticeId ?? initial.data.notices.find((n) => !n.archived)?.id ?? '',
  );
  const [error, setError] = useState(initial.error),
    [busy, setBusy] = useState(false);
  const notice = data.notices.find((n) => n.id === selected);
  const linked = notice ? noticeTasks(notice, state.tasks) : [];
  const [confirmed, setConfirmed] = useState(false);
  function persist(next: SchoolInboxData) {
    dataRef.current = next;
    setData(next); // Keep typed content available for retry when storage fails.
    try {
      if (initial.error) throw new Error(initial.error);
      if (localStorage.getItem(INBOX_KEY) !== savedRaw.current)
        throw new Error('다른 탭의 공지가 변경됐어요. 현재 글을 복사한 뒤 새로고침하세요.');
      const raw = JSON.stringify(inboxSchema.parse(next));
      localStorage.setItem(INBOX_KEY, raw);
      savedRaw.current = raw;
      setError('');
      window.dispatchEvent(new Event('bkit:inbox'));
      return true;
    } catch (e) {
      activation('storageFailure');
      setError(
        e instanceof Error ? e.message : '공지 저장 실패 · 현재 글을 복사하고 다시 시도해 주세요.',
      );
      return false;
    }
  }
  function update(patch: Partial<SchoolNotice>) {
    if (!notice) return false;
    return persist({
      ...dataRef.current,
      notices: dataRef.current.notices.map((n) => (n.id === notice.id ? { ...n, ...patch } : n)),
    });
  }
  function create() {
    const next = newNotice();
    if (persist({ ...data, notices: [next, ...data.notices] })) {
      setSelected(next.id);
      setConfirmed(false);
    }
  }
  return (
    <section className="daily-panel school-inbox" aria-label="학교 공지 받은함">
      <div className="section-head">
        <div>
          <h2>학교 공지 받은함</h2>
          <p>사진부터 보관하고, 확인한 과제만 등록해요.</p>
        </div>
        <button className="primary" onClick={create} disabled={busy || !!initial.error}>
          새 공지 보관
        </button>
      </div>
      <p className="hint">
        공지 글·사진·PDF 원본은 이 기기에만 보관돼요. 과제 정보는 Cloud v2 연결 시 동기화되지만
        원본은 전송되지 않아요. 다른 기기로 옮길 때 설정의 완전한 ZIP 백업을 이용하세요.
      </p>
      {initial.error && (
        <button
          disabled={initial.raw === null}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([initial.raw!], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bkit-school-inbox-original.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }}
        >
          공지 보관함 원본 JSON 내보내기
        </button>
      )}
      {error && (
        <div role="alert" className="warning">
          저장 확인 필요: {error}
          <button onClick={() => persist(data)}>공지 저장 재시도</button>
        </div>
      )}
      <div className="inbox-list" aria-label="보관한 공지">
        {data.notices.map((n) => (
          <button
            key={n.id}
            disabled={busy}
            aria-pressed={selected === n.id}
            onClick={() => {
              setSelected(n.id);
              setConfirmed(false);
            }}
          >
            <span>{noticeStatus(n, state.tasks)}</span>
            <strong>
              {n.text.slice(0, 45) ||
                (n.materials.photoIds.length
                  ? '사진 공지'
                  : n.materials.papers[0]?.name || '내용을 추가할 공지')}
            </strong>
          </button>
        ))}
      </div>
      {noticeId && !notice && (
        <p role="status">
          연결된 공지 원본이 이 기기에 없어요. 등록한 기기에서 확인하거나 그 기기의 완전한 ZIP
          백업을 가져오세요.
        </p>
      )}
      {!notice && (
        <p>
          새 공지 보관을 누르고 글을 붙여넣거나 사진·PDF를 첨부하세요. 모든 생활 정보를 입력할
          필요는 없어요.
        </p>
      )}
      {notice && (
        <div key={notice.id}>
          <label>
            원본 공지 · ChatGPT에서 복사한 글도 가능
            <textarea
              aria-label="원본 공지"
              rows={5}
              maxLength={12000}
              value={notice.text}
              onChange={(e) => update({ text: e.target.value })}
            />
          </label>
          <TaskMaterials
            taskId={notice.id}
            value={notice.materials}
            onChange={(materials) => update({ materials })}
            onBusy={setBusy}
          />
          {!!notice.materials.photoIds.length && (
            <PhotoText
              photoIds={notice.materials.photoIds}
              disabled={busy}
              onUse={(text) => {
                if (update({ ocrText: text, reviewed: true })) setConfirmed(false);
              }}
            />
          )}
          {notice.ocrText && (
            <label>
              OCR로 읽은 글 · 원본과 대조하세요
              <textarea
                aria-label="공지에서 읽은 글"
                rows={5}
                maxLength={3000}
                value={notice.ocrText}
                onChange={(e) => update({ ocrText: e.target.value, reviewed: true })}
              />
            </label>
          )}
          {notice.materials.papers.map((p) => (
            <div className="daily-linked" key={p.resource.id}>
              {p.name} · PDF는 원본을 열어 내용을 직접 확인하세요.
              <NoticePdf resourceId={p.resource.id} name={p.name} />
              {state.learning?.resources.some((r) => r.id === p.resource.id) && (
                <button onClick={() => onPaper(p.resource.id)}>연결 PDF 열기</button>
              )}
            </div>
          ))}
          <p role="status">
            {error ? '현재 변경은 저장되지 않았을 수 있어요.' : '이 기기에 저장됨'} ·{' '}
            {noticeStatus(notice, state.tasks)}
          </p>
          <form
            className="daily-confirm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!confirmed || busy || !persist(data)) return;
              const f = new FormData(e.currentTarget);
              try {
                const date = String(f.get('date') || '');
                const task = taskSchema.parse({
                  id: uid(),
                  subject: String(f.get('subject') || '').trim() || '미분류',
                  title: String(f.get('title') || '').trim(),
                  kind: f.get('kind'),
                  ...captureDeadline({
                    due: date,
                    precision: date ? 'date-only' : 'unknown',
                    dueTime: '',
                    provenance: 'user-confirmed',
                  }),
                  attachmentIds: notice.materials.photoIds,
                  priority: 2,
                  minutes: 25,
                  remaining: 25,
                  status: 'todo',
                  submitted: false,
                  submissionRequired: f.has('submission'),
                  optional: false,
                  notes: `[학교공지:${notice.id}] 원본은 등록한 기기의 학교 공지 받은함에 보관됩니다.`,
                  link: '',
                  capture: {
                    source: notice.materials.photoIds.length ? 'photo' : 'text',
                    confirmedByUser: true,
                  },
                });
                const duplicate = state.tasks.find((t) => sameMission(t, task));
                if (duplicate) {
                  setError('같은 과제가 이미 있어요. 아래 기존 과제 연결을 이용하세요.');
                  return;
                }
                if (onRegister(notice, task)) {
                  update({ reviewed: true, taskIds: [...notice.taskIds, task.id] });
                  setConfirmed(false);
                } else
                  setError('과제를 저장하지 못했어요. 공지 원본은 유지됩니다. 다시 시도하세요.');
              } catch {
                setError('과제 이름·날짜를 확인해 주세요. 원본은 그대로예요.');
              }
            }}
          >
            <h3>원본을 보며 과제 하나씩 확인</h3>
            <p>
              여러 과제가 있으면 항목별로 등록하세요. OCR은 틀릴 수 있고, 날짜·과목·분량을 자동
              확정하지 않아요. 사진 인식은 기기 OCR이며 서버 AI가 아닙니다.
            </p>
            <label>
              확인한 과제 이름
              <input name="title" required maxLength={200} />
            </label>
            <div className="form-grid">
              <label>
                확인한 과목
                <input name="subject" maxLength={200} placeholder="모르면 비우기" />
              </label>
              <label>
                종류
                <select name="kind" defaultValue="수행평가">
                  <option>수행평가</option>
                  <option>숙제</option>
                </select>
              </label>
              <label>
                확인한 마감 날짜
                <input name="date" type="date" />
              </label>
            </div>
            <label className="checkbox">
              <input type="checkbox" name="submission" defaultChecked />
              학습 완료 후 제출 확인 필요
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              원본의 이 과제와 마감을 대조했어요
            </label>
            <small>
              날짜를 비우면 마감 미확인 · 예상 시간 25분은 기본값이며 과제에서 수정할 수 있어요.
            </small>
            <button className="primary" disabled={!confirmed || busy || !!initial.error}>
              확인한 과제 등록
            </button>
          </form>
          <details>
            <summary>이미 등록한 과제와 연결</summary>
            {state.tasks
              .filter((t) => !linked.some((x) => x.id === t.id))
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => update({ reviewed: true, taskIds: [...notice.taskIds, t.id] })}
                >
                  {t.subject} · {t.title} 연결
                </button>
              ))}
          </details>
          {linked.length > 0 && (
            <section aria-label="공지에서 등록한 과제">
              <h3>등록한 과제 {linked.length}개</h3>
              {linked.map((t) => (
                <div className="daily-linked" key={t.id}>
                  <strong>
                    {t.subject} · {t.title}
                  </strong>
                  <p>
                    {formatTaskDeadline(t)} · 학습 {t.status === 'done' ? '완료' : '미완료'} · 제출{' '}
                    {t.submitted ? '완료' : '미확인'}
                  </p>
                  <button onClick={() => onEdit(t)}>과제 확인</button>
                  <button onClick={() => onCalendar(t)}>달력에서 보기</button>
                  {t.status !== 'done' && (
                    <button onClick={() => onStart(t.id)}>이 과제 5분 시작</button>
                  )}
                </div>
              ))}
            </section>
          )}
          <button
            disabled={busy || !linked.length}
            onClick={() => update({ fullyRegistered: !notice.fullyRegistered, reviewed: true })}
          >
            {notice.fullyRegistered
              ? '추가 확인 필요로 돌리기'
              : '이 공지의 과제를 모두 확인했어요'}
          </button>
          <button disabled={busy} onClick={() => update({ archived: !notice.archived })}>
            {notice.archived ? '받은함으로 이동' : '공지 보관 처리'}
          </button>
        </div>
      )}
    </section>
  );
}
