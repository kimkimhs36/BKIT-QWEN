import { useState, lazy, Suspense, type FormEvent } from 'react';
import type { State } from './model';
import type { LearningResource, LearningProblem } from './learningModel';
import {
  addResource,
  learning,
  SOURCE_LABELS,
  resourceProblems,
  resourceProgress,
  makeProblem,
  isCompleted,
} from './learningEngine';
import { storePhoto } from './atelierMedia';
import { PrivatePhotoCard } from './StudyAtelier';
import { iso } from './time';
import { matchesResourceSearch } from './resourceSearch';
const DigitalLibrary = lazy(() =>
  import('./DigitalLibrary').then((m) => ({ default: m.DigitalLibrary })),
);
const PhotoText = lazy(() => import('./PhotoText').then((m) => ({ default: m.PhotoText })));
type Commit = (change: (s: State) => State) => boolean;
export function ResourceLibrary({
  state,
  onChange,
  onOpen,
}: {
  state: State;
  onChange: Commit;
  onOpen: (id: string, problemId?: string) => void;
}) {
  const d = learning(state);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState(''),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const current = d.resources.find((r) => r.id === editing);
  const [taskId, setTaskId] = useState(''),
    [photos, setPhotos] = useState<string[]>([]),
    [text, setText] = useState(''),
    [count, setCount] = useState(1);
  const task = state.tasks.find((t) => t.id === taskId);
  const [problemEditor, setProblemEditor] = useState<string | null>(null);
  const [batch, setBatch] = useState(''),
    [batchCount, setBatchCount] = useState(1);
  function edit(r?: LearningResource) {
    setEditing(r?.id ?? 'new');
    setTaskId(r?.linkedTaskId ?? '');
    setPhotos(r?.linkedMediaIds ?? []);
    setText('');
    setCount(1);
    setError('');
    setProblemEditor(null);
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      title: String(f.get('title')).trim(),
      subject: String(f.get('subject')).trim(),
      sourceType: String(f.get('sourceType')) as LearningResource['sourceType'],
      linkedTaskId: taskId || null,
      linkedMediaIds: photos,
    };
    const saved = onChange((s) =>
      current
        ? {
            ...s,
            learning: {
              ...learning(s),
              resources: learning(s).resources.map((r) =>
                r.id === current.id ? { ...r, ...input, updatedAt: iso(Date.now()) } : r,
              ),
            },
          }
        : addResource(
            s,
            input,
            text.trim()
              ? text
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean)
              : Array(count).fill(''),
          ),
    );
    if (saved) {
      if (!current) setEditing(null);
      setError('');
    } else setError('저장하지 못했습니다. 입력과 기존 기록은 유지됩니다.');
  }
  function patchProblem(p: LearningProblem, patch: Partial<LearningProblem>) {
    return onChange((s) => ({
      ...s,
      learning: {
        ...learning(s),
        problems: learning(s).problems.map((x) =>
          x.id === p.id ? { ...x, ...patch, updatedAt: iso(Date.now()) } : x,
        ),
      },
    }));
  }
  function reorder(p: LearningProblem, delta: number) {
    const list = resourceProblems(d, p.resourceId),
      index = list.findIndex((x) => x.id === p.id),
      other = list[index + delta];
    if (!other) return;
    onChange((s) => ({
      ...s,
      learning: {
        ...learning(s),
        problems: learning(s).problems.map((x) =>
          x.id === p.id
            ? { ...x, ordinal: other.ordinal }
            : x.id === other.id
              ? { ...x, ordinal: p.ordinal }
              : x,
        ),
      },
    }));
  }
  return (
    <section className="panel resource-library" aria-label="자료 라이브러리">
      <div className="section-head">
        <div>
          <h2>자료 라이브러리</h2>
        </div>
        <button className="primary" onClick={() => edit()}>
          자료 추가
        </button>
      </div>
      <label>
        자료 검색
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·과목·문제·개념"
        />
      </label>
      <details className="compact-section compact-paper-tools">
        <summary>PDF · 사진 학습지 열기와 필기</summary>
        <Suspense fallback={<p>필기 도구를 여는 중…</p>}>
          <DigitalLibrary state={state} onChange={onChange} query={query} />
        </Suspense>
      </details>
      <label className="sleep-check">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        보관한 자료 포함
      </label>
      {editing !== null && (
        <div className="resource-editor">
          <form key={editing} onSubmit={submit}>
            <label>
              자료 제목
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={current?.title ?? task?.title ?? ''}
              />
            </label>
            <div className="form-grid">
              <label>
                자료 과목
                <input
                  key={taskId + editing}
                  name="subject"
                  required
                  maxLength={200}
                  list="resource-subjects"
                  defaultValue={current?.subject ?? task?.subject ?? '수학'}
                />
                <datalist id="resource-subjects">
                  {['수학', '영어', '국어', '과학', '사회', '물리', '화학', '경제'].map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </label>
              <label>
                자료 종류
                <select
                  aria-label="자료 종류"
                  name="sourceType"
                  defaultValue={current?.sourceType ?? 'school-worksheet'}
                >
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                연결 과제
                <select
                  aria-label="연결 과제"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                >
                  <option value="">과제 연결 안 함</option>
                  {state.tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.subject} · {t.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!current && (
              <details>
                <summary>문제 여러 개 등록 (선택)</summary>
                <label>
                  등록할 실제 문제 수
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value))))}
                  />
                </label>
                <label>
                  여러 문제 일괄 입력 (한 줄에 한 문제, 선택)
                  <textarea
                    rows={4}
                    maxLength={100000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <p className="muted">
                  직접 입력하면 줄 수만큼 등록합니다. 비우면 번호만 만들고 원본 자료를 보며 풉니다.
                  문제 내용은 자동 생성하지 않습니다.
                </p>
              </details>
            )}
            <label>
              여러 페이지 사진 첨부
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  setBusy(true);
                  setError('');
                  let next = [...photos];
                  try {
                    for (const file of files) {
                      const id = await storePhoto(file, []);
                      next = [...next, id];
                      setPhotos(next);
                      if (
                        current &&
                        !onChange((s) => ({
                          ...s,
                          learning: {
                            ...learning(s),
                            resources: learning(s).resources.map((r) =>
                              r.id === current.id
                                ? { ...r, linkedMediaIds: next, updatedAt: iso(Date.now()) }
                                : r,
                            ),
                          },
                        }))
                      )
                        throw new Error(
                          '사진 연결을 저장하지 못했습니다. 원본은 사진 보관함에 유지됩니다.',
                        );
                    }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '사진 저장 실패');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {task?.attachmentIds?.some((id) => !photos.includes(id)) && (
              <button
                type="button"
                onClick={() => setPhotos([...new Set([...photos, ...task.attachmentIds!])])}
              >
                기존 과제 사진 연결
              </button>
            )}
            {photos.length > 0 && (
              <div className="resource-pages">
                {photos.map((id, i) => (
                  <div key={id}>
                    <span>페이지 {i + 1}</span>
                    <PrivatePhotoCard id={id} />
                    <div className="learning-actions">
                      <button
                        type="button"
                        aria-label={`페이지 ${i + 1} 앞으로`}
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...photos];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          setPhotos(next);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`페이지 ${i + 1} 뒤로`}
                        disabled={i === photos.length - 1}
                        onClick={() => {
                          const next = [...photos];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          setPhotos(next);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((x) => x !== id))}
                      >
                        연결 해제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {photos.length > 0 && (
              <Suspense fallback={<p>글자 읽기 준비 중…</p>}>
                <PhotoText
                  photoIds={photos}
                  disabled={busy}
                  onUse={(value) => {
                    setText(value);
                    setBatch(value);
                  }}
                />
              </Suspense>
            )}
            <p className="muted">
              사진 원본은 이 기기에만 저장되며 Cloud v2로 동기화되지 않습니다.
            </p>
            <p className="muted">
              OCR은 한글·영어 인쇄물을 대상으로 합니다. 수식·손글씨는 원문과 비교해 수정하세요.
            </p>
            <div className="learning-actions">
              <button className="primary" type="submit" disabled={busy}>
                자료 저장
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                편집 닫기
              </button>
            </div>
          </form>
          {current && (
            <>
              <h3>문제 관리 · {resourceProblems(d, current.id).length}개</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const bodies = batch.trim()
                    ? batch
                        .split('\n')
                        .map((x) => x.trim())
                        .filter(Boolean)
                    : Array(batchCount).fill('');
                  const max = Math.max(0, ...resourceProblems(d, current.id).map((p) => p.ordinal));
                  if (
                    onChange((s) => ({
                      ...s,
                      learning: {
                        ...learning(s),
                        problems: [
                          ...learning(s).problems,
                          ...bodies.map((b, i) => makeProblem(current.id, max + i + 1, b)),
                        ],
                      },
                    }))
                  ) {
                    setBatch('');
                    setBatchCount(1);
                  }
                }}
              >
                <label>
                  추가 문제 수
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={batchCount}
                    onChange={(e) =>
                      setBatchCount(Math.max(1, Math.min(500, Number(e.target.value))))
                    }
                  />
                </label>
                <label>
                  추가할 문제 (한 줄씩, 선택)
                  <textarea
                    value={batch}
                    maxLength={100000}
                    onChange={(e) => setBatch(e.target.value)}
                  />
                </label>
                <button type="submit">문제 추가 · 일괄 등록</button>
              </form>
              <ol className="resource-problem-list">
                {resourceProblems(d, current.id).map((p, i, list) => (
                  <li key={p.id}>
                    <div className="learning-actions">
                      <span>
                        {p.ordinal}번 · {isCompleted(d, p.id) ? '풀이 확인' : '미완료'} · {p.title}
                      </span>
                      <button
                        onClick={() => setProblemEditor(problemEditor === p.id ? null : p.id)}
                      >
                        문제 수정
                      </button>
                      <button
                        aria-label={`${p.ordinal}번 앞으로`}
                        disabled={!i}
                        onClick={() => reorder(p, -1)}
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`${p.ordinal}번 뒤로`}
                        disabled={i === list.length - 1}
                        onClick={() => reorder(p, 1)}
                      >
                        ↓
                      </button>
                    </div>
                    {problemEditor === p.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          if (
                            patchProblem(p, {
                              title: String(f.get('title')),
                              body: String(f.get('body')),
                              sourceReference: String(f.get('sourceReference')),
                              concept: String(f.get('concept')),
                              referenceAnswer: String(f.get('referenceAnswer')),
                              example: String(f.get('example')),
                              mediaId: String(f.get('mediaId')) || null,
                            })
                          )
                            setProblemEditor(null);
                        }}
                      >
                        <label>
                          문제 제목
                          <input name="title" maxLength={200} defaultValue={p.title} />
                        </label>
                        <label>
                          문제 본문 · 영어 원문
                          <textarea name="body" maxLength={3000} defaultValue={p.body} />
                        </label>
                        <label>
                          출처·원본 문제 번호
                          <input
                            name="sourceReference"
                            maxLength={200}
                            defaultValue={p.sourceReference}
                          />
                        </label>
                        <label>
                          연결 개념
                          <input name="concept" maxLength={200} defaultValue={p.concept} />
                        </label>
                        <label>
                          문제 페이지
                          <select
                            aria-label="문제 페이지"
                            name="mediaId"
                            defaultValue={p.mediaId ?? ''}
                          >
                            <option value="">자료 전체에서 확인</option>
                            {photos.map((id, i) => (
                              <option key={id} value={id}>
                                페이지 {i + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          참고 정답·번역 (풀이 중 가림)
                          <textarea
                            name="referenceAnswer"
                            maxLength={3000}
                            defaultValue={p.referenceAnswer}
                          />
                        </label>
                        <label>
                          내 예제·해설 (선택)
                          <textarea name="example" maxLength={3000} defaultValue={p.example} />
                        </label>
                        <button type="submit" className="primary">
                          문제 저장
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
              <button
                className="danger-button"
                disabled={state.active?.resourceId === current.id}
                onClick={() => {
                  if (
                    confirm(
                      '자료를 보관함으로 옮길까요? PDF·사진·필기·문제·풀이 이력은 모두 보존합니다.',
                    )
                  ) {
                    if (
                      onChange((s) => ({
                        ...s,
                        learning: {
                          ...learning(s),
                          resources: learning(s).resources.map((r) =>
                            r.id === current.id
                              ? { ...r, archived: true, updatedAt: iso(Date.now()) }
                              : r,
                          ),
                        },
                      }))
                    )
                      setEditing(null);
                  }
                }}
              >
                자료 삭제
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}
      <div className="resource-grid">
        {d.resources
          .filter(
            (r) =>
              (showArchived || !r.archived) &&
              matchesResourceSearch(
                query,
                r.subject,
                r.title +
                  ' ' +
                  resourceProblems(d, r.id)
                    .map((p) => p.body + ' ' + p.concept)
                    .join(' '),
              ),
          )
          .map((r) => {
            const progress = resourceProgress(d, r.id),
              p = d.problems.find((p) => p.id === progress.currentProblemId);
            return (
              <article className="resource-card" key={r.id}>
                <small>
                  {r.subject} · {SOURCE_LABELS[r.sourceType]} · {r.linkedMediaIds.length}페이지
                </small>
                <h3>
                  {r.title}
                  {r.archived ? ' · 보관됨' : ''}
                </h3>
                <p>
                  풀이 확인 {progress.completedCount}/{progress.total} · 남은{' '}
                  {progress.remainingCount}문제
                </p>
                <progress
                  max={Math.max(1, progress.total)}
                  value={progress.completedCount}
                  aria-label={r.title + ' 진행도'}
                />
                <p>
                  {r.linkedTaskId
                    ? (state.tasks.find((t) => t.id === r.linkedTaskId)?.title ??
                      '이전 과제 연결 보존')
                    : '독립 학습 자료'}
                  {r.lastOpenedAt
                    ? ' · 마지막 열람 ' + new Date(r.lastOpenedAt).toLocaleDateString()
                    : ''}
                </p>
                <div className="learning-actions">
                  <button
                    className="primary"
                    disabled={!progress.total}
                    onClick={() => onOpen(r.id)}
                  >
                    {p ? `${p.ordinal}번부터 이어 풀기` : '문제 등록 필요'}
                  </button>
                  <button onClick={() => edit(r)}>자료 수정</button>
                  {r.archived && (
                    <button
                      onClick={() =>
                        onChange((s) => ({
                          ...s,
                          learning: {
                            ...learning(s),
                            resources: learning(s).resources.map((x) =>
                              x.id === r.id ? { ...x, archived: false } : x,
                            ),
                          },
                        }))
                      }
                    >
                      보관 해제
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
      {!d.resources.length && (
        <p className="muted">
          학습지 한 장이나 직접 쓴 질문으로 시작하세요. 기존 과제 사진을 연결할 수 있습니다.
        </p>
      )}
    </section>
  );
}
