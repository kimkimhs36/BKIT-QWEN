import { useEffect, useState, lazy, Suspense, type FormEvent } from 'react';
import { BookOpen, Plus, ArrowLeft, ArrowUp, ArrowDown, Play, Search } from 'lucide-react';
import { uid, type State } from './model';
import {
  BOOKS_KEY,
  BOOK_SUBJECTS,
  newBook,
  moveChapter,
  linkMaterial,
  type Book,
  type BookChapter,
} from './books';
import { useBooks } from './useBooks';
import { Modal } from './Modal';
import { learning, addResource, resourceProgress } from './learningEngine';
import { listPaperDocuments, savePaperDocument } from './paperStorage';
import { importPaper } from './paperPdf';
import type { PaperDocument } from './paperModel';
import './books.css';
const DigitalPaperRoom = lazy(() =>
  import('./DigitalPaperRoom').then((m) => ({ default: m.DigitalPaperRoom })),
);
const statuses: Record<BookChapter['status'], string> = {
  todo: '시작 전',
  studying: '공부 중',
  review: '복습 필요',
  done: '학습 완료',
};
function Cover({ book }: { book: Book }) {
  return (
    <span className="books-cover">
      {book.cover ? (
        <img src={book.cover} alt="" />
      ) : (
        <>
          <small>BKIT / PERSONAL LIBRARY</small>
          <BookOpen size={28} aria-hidden="true" />
          <strong>{book.title}</strong>
          <span>{book.subject}</span>
        </>
      )}
      <span className="books-spine" />
    </span>
  );
}
export function Books({
  state,
  onChange,
  onStudy,
  onExam,
}: {
  state: State;
  onChange: (fn: (s: State) => State) => boolean;
  onStudy: (resourceId?: string, taskId?: string) => void;
  onExam: () => void;
}) {
  const { data, error, save, update, blocked } = useBooks();
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('bkit.books.selected');
    } catch {
      return null;
    }
  });
  const [query, setQuery] = useState(''),
    [sort, setSort] = useState('recent'),
    [shelf, setShelf] = useState('active');
  const [editor, setEditor] = useState<Book | null>(null),
    [chapterEditor, setChapterEditor] = useState<BookChapter | null>(null);
  const [docs, setDocs] = useState<PaperDocument[]>([]),
    [opened, setOpened] = useState<PaperDocument | null>(null);
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [kind, setKind] = useState<'document' | 'resource' | 'task'>('document'),
    [target, setTarget] = useState('');
  const book = data.books.find((b) => b.id === selected),
    chapterId = book?.bookmark.chapterId ?? null;
  const chapter = book?.chapters.find((c) => c.id === chapterId);
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    try {
      if (selected) sessionStorage.setItem('bkit.books.selected', selected);
      else sessionStorage.removeItem('bkit.books.selected');
    } catch {
      /* selection only */
    }
  }, [selected]);
  async function refresh() {
    try {
      setDocs(await listPaperDocuments());
    } catch {
      setMessage('기기 문서를 읽지 못했습니다. 파일은 삭제하지 않았습니다.');
    }
  }
  function openBook(b: Book) {
    if (update(b.id, (x) => ({ ...x, lastOpenedAt: new Date().toISOString() }))) {
      setSelected(b.id);
      setMessage('');
    }
  }
  function selectChapter(id: string | null) {
    if (book)
      update(book.id, (b) => ({
        ...b,
        lastOpenedAt: new Date().toISOString(),
        bookmark: { chapterId: id, materialId: null },
      }));
  }
  function saveBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    const f = new FormData(e.currentTarget);
    const next = {
      ...editor,
      lastOpenedAt: new Date().toISOString(),
      title: String(f.get('title')).trim(),
      subject: String(f.get('subject')).trim(),
      grade: String(f.get('grade')).trim(),
      curriculum: String(f.get('curriculum')).trim(),
      publisher: String(f.get('publisher')).trim(),
      updatedAt: new Date().toISOString(),
    };
    if (
      save((d) => ({
        ...d,
        books: d.books.some((b) => b.id === next.id)
          ? d.books.map((b) => (b.id === next.id ? next : b))
          : [...d.books, next],
      }))
    ) {
      setEditor(null);
      setSelected(next.id);
    }
  }
  async function cover(file?: File) {
    if (!file || !editor) return;
    setBusy(true);
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error('10MB 이하 PNG·JPEG·WebP 이미지를 선택하세요.');
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 420;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('표지를 만들지 못했습니다.');
        const scale = Math.max(300 / image.width, 420 / image.height);
        ctx.drawImage(
          image,
          (300 - image.width * scale) / 2,
          (420 - image.height * scale) / 2,
          image.width * scale,
          image.height * scale,
        );
        const data = canvas.toDataURL('image/jpeg', 0.72);
        if (data.length > 180000)
          throw new Error('표지가 너무 큽니다. 더 단순한 이미지를 선택하세요.');
        setEditor((b) => (b ? { ...b, cover: data } : b));
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function saveChapter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!book || !chapterEditor) return;
    const f = new FormData(e.currentTarget),
      next = {
        ...chapterEditor,
        title: String(f.get('title')).trim(),
        note: String(f.get('note')),
      };
    if (
      update(book.id, (b) => ({
        ...b,
        chapters: b.chapters.some((c) => c.id === next.id)
          ? b.chapters.map((c) => (c.id === next.id ? next : c))
          : [...b.chapters, next],
        bookmark: { chapterId: next.id, materialId: null },
      }))
    )
      setChapterEditor(null);
  }
  async function take(file?: File) {
    if (!file || !book) return;
    const bookId = book.id,
      linkedChapter = chapterId;
    setBusy(true);
    setMessage('');
    try {
      // Save the original through the existing document store first. A failed book write leaves it recoverable in DigitalLibrary.
      const planned = addResource(
        state,
        {
          title: file.name.slice(0, 200),
          subject: book.subject,
          sourceType: 'school-worksheet',
          linkedTaskId: null,
          linkedMediaIds: [],
        },
        [''],
      );
      const resource = planned.learning!.resources.at(-1)!;
      const imported = await importPaper(file, resource.id);
      await savePaperDocument(imported.document, imported.bytes);
      const problems = planned.learning!.problems.filter((p) => p.resourceId === resource.id);
      if (
        !onChange((s) => ({
          ...s,
          learning: {
            ...learning(s),
            resources: [...learning(s).resources, resource],
            problems: [...learning(s).problems, ...problems],
          },
        }))
      )
        throw new Error(
          '원본은 PDF 라이브러리에 보관됐지만 문제 자료 저장에 실패했습니다. 기존 문서 연결에서 다시 선택하세요.',
        );
      if (
        !update(bookId, (b) =>
          linkMaterial(b, {
            kind: 'document',
            targetId: imported.document.id,
            chapterId: linkedChapter,
          }),
        )
      )
        throw new Error(
          '원본은 PDF 라이브러리에 보관됐습니다. 기존 문서 연결에서 다시 선택하세요.',
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      await refresh();
      setBusy(false);
    }
  }
  const materials = book?.materials.filter((m) => m.chapterId === chapterId) ?? [];
  function study() {
    if (!book) return;
    const scope = [...materials, ...book.materials.filter((m) => !m.chapterId)];
    const resource = scope
      .map((m) =>
        m.kind === 'resource'
          ? m.targetId
          : m.kind === 'document'
            ? docs.find((d) => d.id === m.targetId)?.resourceId
            : null,
      )
      .find((id) => learning(state).resources.some((r) => r.id === id && !r.archived));
    const task = scope.find(
      (m) =>
        m.kind === 'task' && state.tasks.some((t) => t.id === m.targetId && t.status !== 'done'),
    )?.targetId;
    if (update(book.id, (b) => ({ ...b, lastOpenedAt: new Date().toISOString() })))
      onStudy(resource ?? undefined, task);
  }
  const visible = data.books
    .filter((b) =>
      shelf === 'trash' ? !!b.deletedAt : !b.deletedAt && b.archived === (shelf === 'archive'),
    )
    .filter((b) =>
      `${b.title} ${b.subject} ${b.publisher}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title, 'ko')
        : sort === 'created'
          ? b.createdAt.localeCompare(a.createdAt)
          : (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt),
    );
  return (
    <section className="books panel" aria-label="BKIT BOOKS">
      <header className="books-heading">
        <div>
          <small>THE LIVING LIBRARY</small>
          <h2>BKIT BOOKS</h2>
          <p>한 권에서 시작해, 다음 공부로 이어지는 서재.</p>
        </div>
        <button
          className="primary"
          disabled={blocked}
          onClick={() => {
            setEditor(newBook('', BOOK_SUBJECTS[0]));
            setMessage('');
          }}
        >
          <Plus size={16} /> 책 추가
        </button>
      </header>
      <p className="books-local">
        책·단원·파일은 이 기기에 저장됩니다. 다른 기기로 옮길 때 설정의 전체 ZIP 백업을 사용하세요.
        BOOKS 자동 클라우드 동기화는 지원하지 않습니다.
      </p>
      {(error || message) && <p role="alert">{error || message}</p>}
      {blocked && (
        <button
          onClick={() => {
            const raw = localStorage.getItem(BOOKS_KEY);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([raw ?? ''], { type: 'application/json' }));
            a.download = 'bkit-books-recovery.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          서재 원본 내보내기
        </button>
      )}
      {opened ? (
        <Suspense fallback={<p role="status">필기 도구를 여는 중…</p>}>
          <DigitalPaperRoom
            key={opened.id}
            initial={opened}
            onClose={() => {
              setOpened(null);
              void refresh();
            }}
          />
        </Suspense>
      ) : book ? (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> 내 책장
          </button>
          <div className="books-detail-heading">
            <Cover book={book} />
            <div>
              <small>{book.subject}</small>
              <h3>{book.title}</h3>
              <p>{[book.grade, book.curriculum, book.publisher].filter(Boolean).join(' · ')}</p>
              <div className="books-actions">
                <button onClick={() => setEditor(book)}>책 정보 수정</button>
                <button onClick={() => update(book.id, (b) => ({ ...b, archived: !b.archived }))}>
                  {book.archived ? '보관 해제' : '보관'}
                </button>
                {book.deletedAt ? (
                  <button onClick={() => update(book.id, (b) => ({ ...b, deletedAt: null }))}>
                    책 복구
                  </button>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}>삭제</button>
                )}
              </div>
            </div>
          </div>
          {book.deletedAt ? (
            <p>
              휴지통에 보관 중입니다. 원본 PDF·필기·문제·공부 기록은 유지됩니다. 책 복구 후 이어서
              공부할 수 있습니다.
            </p>
          ) : (
            <div className="books-workspace">
              <aside aria-label="단원 목록">
                <button aria-pressed={!chapterId} onClick={() => selectChapter(null)}>
                  책 전체 자료
                </button>
                <button
                  onClick={() =>
                    setChapterEditor({
                      id: uid(),
                      parentId: null,
                      title: '',
                      note: '',
                      status: 'todo',
                    })
                  }
                >
                  <Plus size={14} /> 대단원 추가
                </button>
                {!book.chapters.length && (
                  <p>첫 단원을 추가하거나, 오른쪽에서 자료를 연결하세요.</p>
                )}
                {book.chapters
                  .filter((c) => !c.parentId)
                  .flatMap((c) => [c, ...book.chapters.filter((x) => x.parentId === c.id)])
                  .map((c) => (
                    <div key={c.id} className={'books-chapter ' + (c.parentId ? 'is-child' : '')}>
                      <button aria-pressed={chapterId === c.id} onClick={() => selectChapter(c.id)}>
                        <span>{c.title}</span>
                        <small>
                          {statuses[c.status]} ·{' '}
                          {book.materials.filter((m) => m.chapterId === c.id).length}개
                        </small>
                      </button>
                      <div>
                        <button
                          aria-label={`${c.title} 위로`}
                          onClick={() => update(book.id, (b) => moveChapter(b, c.id, -1))}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          aria-label={`${c.title} 아래로`}
                          onClick={() => update(book.id, (b) => moveChapter(b, c.id, 1))}
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
              </aside>
              <div className="books-chapter-body">
                <div className="section-head">
                  <h3>{chapter?.title ?? '책 전체'}</h3>
                  <button className="primary" onClick={study}>
                    <Play size={15} /> 5분 공부 시작
                  </button>
                </div>
                {chapter && (
                  <>
                    <div className="books-actions">
                      <label>
                        공부 상태
                        <select
                          value={chapter.status}
                          onChange={(e) =>
                            update(book.id, (b) => ({
                              ...b,
                              chapters: b.chapters.map((c) =>
                                c.id === chapter.id
                                  ? { ...c, status: e.target.value as BookChapter['status'] }
                                  : c,
                              ),
                            }))
                          }
                        >
                          {Object.entries(statuses).map(([v, t]) => (
                            <option key={v} value={v}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button onClick={() => setChapterEditor(chapter)}>단원·메모 편집</button>
                      {!chapter.parentId && (
                        <button
                          onClick={() =>
                            setChapterEditor({
                              id: uid(),
                              parentId: chapter.id,
                              title: '',
                              note: '',
                              status: 'todo',
                            })
                          }
                        >
                          소단원 추가
                        </button>
                      )}
                    </div>
                    {chapter.note && <p className="books-note">{chapter.note}</p>}
                  </>
                )}
                <p className="books-hint">
                  완료 표시는 직접 기록하는 진도입니다. 문제 정답률과 별도로 보관됩니다. 공부 시간과
                  답안은 기존 학습 화면에서 저장하세요.
                </p>
                {/수학|미적분|대수/.test(book.subject) && (
                  <button className="books-foundation-link" type="button" onClick={onExam}>
                    BKIT 수능관 · 수학 선수개념 36문항으로 기초 다지기
                  </button>
                )}
                <div className="books-progress">
                  <span>
                    단원 완료 {book.chapters.filter((c) => c.status === 'done').length} /{' '}
                    {book.chapters.length}
                  </span>
                  <progress
                    aria-label="직접 표시한 단원 진도"
                    value={book.chapters.filter((c) => c.status === 'done').length}
                    max={book.chapters.length || 1}
                  />
                </div>
                <h4>연결된 학습 자료</h4>
                {!materials.length && (
                  <p>
                    PDF·사진을 가져오거나 기존 자료를 연결해 보세요. 파일 없이도 5분 공부를 시작할
                    수 있어요.
                  </p>
                )}
                <div className="books-materials">
                  {materials.map((m) => {
                    const doc =
                      m.kind === 'document' ? docs.find((d) => d.id === m.targetId) : undefined;
                    const r = learning(state).resources.find(
                      (r) =>
                        r.id === (doc?.resourceId ?? (m.kind === 'resource' ? m.targetId : null)),
                    );
                    const task =
                      m.kind === 'task' ? state.tasks.find((t) => t.id === m.targetId) : undefined;
                    const missing =
                      m.kind === 'document' ? !doc : m.kind === 'resource' ? !r : !task;
                    const progress = r ? resourceProgress(learning(state), r.id) : null;
                    return (
                      <article key={m.id}>
                        <strong>
                          {doc?.name ?? r?.title ?? task?.title ?? '이 기기에서 찾을 수 없는 자료'}
                        </strong>
                        <small>
                          {m.kind === 'document'
                            ? '기기 저장 · PDF/사진'
                            : m.kind === 'task'
                              ? '기존 과제 연결'
                              : '기존 문제 자료 연결'}
                          {progress ? ` · 남은 문제 ${progress.remainingCount}개` : ''}
                        </small>
                        {missing && (
                          <p>
                            원본은 삭제하지 않았습니다. 같은 기기의 자료 또는 전체 ZIP 백업을
                            확인하세요.
                          </p>
                        )}
                        <div className="books-actions">
                          {doc && (
                            <button
                              onClick={() => {
                                if (
                                  update(book.id, (b) => ({
                                    ...b,
                                    bookmark: { chapterId, materialId: m.id },
                                  }))
                                )
                                  setOpened(doc);
                              }}
                            >
                              자료 열기 · 필기
                            </button>
                          )}
                          {r && (
                            <button
                              onClick={() => {
                                if (
                                  update(book.id, (b) => ({
                                    ...b,
                                    lastOpenedAt: new Date().toISOString(),
                                  }))
                                )
                                  onStudy(r.id);
                              }}
                            >
                              문제 풀이 · 오답 복습
                            </button>
                          )}
                          {task && (
                            <button onClick={() => onStudy(undefined, task.id)}>과제로 공부</button>
                          )}
                          <button
                            onClick={() =>
                              update(book.id, (b) => ({
                                ...b,
                                materials: b.materials.filter((x) => x.id !== m.id),
                                bookmark: { ...b.bookmark, materialId: null },
                              }))
                            }
                          >
                            연결 해제
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <fieldset disabled={busy || blocked}>
                  <legend>자료 연결</legend>
                  <label>
                    자료 종류
                    <select
                      value={kind}
                      onChange={(e) => {
                        setKind(e.target.value as typeof kind);
                        setTarget('');
                      }}
                    >
                      <option value="document">기존 PDF·사진</option>
                      <option value="resource">문제 자료</option>
                      <option value="task">과제</option>
                    </select>
                  </label>
                  <label>
                    연결할 자료
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                      <option value="">선택하세요</option>
                      {(kind === 'document'
                        ? docs.map((d) => ({ id: d.id, title: d.name }))
                        : kind === 'resource'
                          ? learning(state).resources.filter((r) => !r.archived)
                          : state.tasks
                      ).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={!target}
                    onClick={() => {
                      if (
                        update(book.id, (b) =>
                          linkMaterial(b, { kind, targetId: target, chapterId }),
                        )
                      )
                        setTarget('');
                    }}
                  >
                    선택한 자료 연결
                  </button>
                  <label>
                    새 PDF·학습지 사진 가져오기
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        void take(file);
                      }}
                    />
                  </label>
                  {busy && <p role="status">기기에 원본을 저장하는 중…</p>}
                </fieldset>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="books-toolbar">
            <label>
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">책 검색</span>
              <input
                aria-label="책 검색"
                type="search"
                placeholder="제목·과목·출판사 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              정렬
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">최근 사용</option>
                <option value="created">최근 등록</option>
                <option value="title">제목순</option>
              </select>
            </label>
            <label>
              책장
              <select value={shelf} onChange={(e) => setShelf(e.target.value)}>
                <option value="active">내 책</option>
                <option value="archive">보관한 책</option>
                <option value="trash">휴지통</option>
              </select>
            </label>
          </div>
          <div className="books-shelf">
            {visible.map((b) => (
              <button key={b.id} className="books-tile" onClick={() => openBook(b)}>
                <Cover book={b} />
                <strong>{b.title}</strong>
                <span>{b.subject}</span>
                <small>
                  {b.bookmark.chapterId
                    ? b.chapters.find((c) => c.id === b.bookmark.chapterId)?.title
                    : '첫 공부를 시작해 보세요'}
                </small>
              </button>
            ))}
          </div>
          {!visible.length && (
            <div className="books-empty">
              <BookOpen size={36} />
              <h3>{query ? '검색된 책이 없어요' : '나의 공부를 담을 첫 번째 책'}</h3>
              <p>제목과 과목만으로 등록하세요. 목차와 자료는 천천히 채워도 괜찮아요.</p>
            </div>
          )}
        </>
      )}
      {editor && (
        <Modal
          title={data.books.some((b) => b.id === editor.id) ? '책 정보 수정' : '새 책 추가'}
          onClose={() => !busy && setEditor(null)}
        >
          <form onSubmit={saveBook} className="books-form">
            <label>
              책 제목
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={editor.title}
                placeholder="나의 미적분Ⅰ"
                autoFocus
              />
            </label>
            <label>
              과목
              <input
                name="subject"
                required
                maxLength={200}
                list="books-subjects"
                defaultValue={editor.subject}
              />
              <datalist id="books-subjects">
                {BOOK_SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <details>
              <summary>선택 정보 · 표지</summary>
              <label>
                학년
                <input name="grade" maxLength={100} defaultValue={editor.grade} />
              </label>
              <label>
                교육과정
                <input name="curriculum" maxLength={100} defaultValue={editor.curriculum} />
              </label>
              <label>
                출판사
                <input name="publisher" maxLength={100} defaultValue={editor.publisher} />
              </label>
              <label>
                표지 이미지
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => void cover(e.target.files?.[0])}
                />
              </label>
              {editor.cover && (
                <>
                  <img className="books-cover-preview" src={editor.cover} alt="선택한 표지" />
                  <button type="button" onClick={() => setEditor({ ...editor, cover: null })}>
                    기본 표지 사용
                  </button>
                </>
              )}
            </details>
            <p>입력하지 않은 출판사·목차를 임의로 채우지 않습니다.</p>
            <button className="primary" disabled={busy || blocked}>
              책 저장
            </button>
            {error && <p role="alert">{error}</p>}
            {message && <p role="alert">{message}</p>}
          </form>
        </Modal>
      )}
      {chapterEditor && (
        <Modal title="단원 편집" onClose={() => setChapterEditor(null)}>
          <form onSubmit={saveChapter} className="books-form">
            <label>
              단원명
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={chapterEditor.title}
                autoFocus
              />
            </label>
            <label>
              단원별 메모
              <textarea name="note" maxLength={5000} defaultValue={chapterEditor.note} />
            </label>
            <button className="primary">단원 저장</button>
            {error && <p role="alert">{error}</p>}
          </form>
        </Modal>
      )}
      {confirmDelete && book && (
        <Modal title="책을 휴지통으로 옮길까요?" onClose={() => setConfirmDelete(false)}>
          <p>책은 복구할 수 있습니다. 연결된 PDF·사진·필기·문제와 공부 기록은 삭제하지 않습니다.</p>
          <button
            onClick={() => {
              if (update(book.id, (b) => ({ ...b, deletedAt: new Date().toISOString() }))) {
                setConfirmDelete(false);
                setSelected(null);
              }
            }}
          >
            휴지통으로 이동
          </button>
        </Modal>
      )}
    </section>
  );
}
