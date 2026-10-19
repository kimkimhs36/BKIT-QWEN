import { useEffect, useState } from 'react';
import { uid } from './model';
import { documentSchema } from './paperModel';
import type { State } from './model';
import type { PaperDocument, SourceProvenance } from './paperModel';
import { addResource, learning } from './learningEngine';
import { listPaperDocuments, savePaperDocument, readPaperFile } from './paperStorage';
import { importPaper } from './paperPdf';
import { DigitalPaperRoom } from './DigitalPaperRoom';
import { ExamLibrary } from './ExamLibrary';
export function DigitalLibrary({
  state,
  onChange,
}: {
  state: State;
  onChange: (fn: (s: State) => State) => boolean;
}) {
  const [docs, setDocs] = useState<PaperDocument[]>([]),
    [opened, setOpened] = useState<PaperDocument | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState(''),
    [subject, setSubject] = useState('수학'),
    [count, setCount] = useState(20),
    [taskId, setTaskId] = useState('');
  async function refresh() {
    try {
      setDocs(await listPaperDocuments());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function take(file: File, source: SourceProvenance | null = null) {
    setBusy(true);
    setError('');
    try {
      const planned = link
        ? null
        : addResource(
            state,
            {
              title: (source?.title || file.name).slice(0, 200),
              subject: source?.subject || subject,
              sourceType: source ? 'official-resource' : 'school-worksheet',
              linkedTaskId: taskId || null,
              linkedMediaIds: [],
            },
            Array(count).fill(''),
          );
      const resource = planned?.learning!.resources.at(-1),
        resourceId = link || resource!.id;
      const data = await importPaper(file, resourceId, source);
      await savePaperDocument(data.document, data.bytes);
      if (resource && planned) {
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
            'PDF 원본은 보관했지만 자료 연결을 저장하지 못했습니다. 아래 문서의 자료 연결을 다시 지정하세요.',
          );
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="digital-library">
      <h3>디지털 종이 · PDF</h3>
      <p>PDF·촬영 학습지를 넣고 필기한 뒤, 자료의 문제별 답변과 오답 복습으로 이어갑니다.</p>
      {!opened && (
        <details>
          <summary>미저장 필기 JSON 복구</summary>
          <p>
            저장 실패 화면에서 보존한 구조 JSON을 가져옵니다. 원본 PDF·사진이 이 기기에 있어야
            합니다. 기존 문서와 필기를 보존하고 복구 사본을 추가합니다.
          </p>
          <label>
            필기 구조 JSON
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setBusy(true);
                setError('');
                void (async () => {
                  if (f.size > 20 * 1024 * 1024) throw new Error('필기 JSON 20MB 한도 초과');
                  const d = documentSchema.parse(JSON.parse(await f.text())),
                    all = await listPaperDocuments(),
                    match = all.find((x) => x.digest === d.digest),
                    bytes = await readPaperFile(match?.fileId ?? d.fileId);
                  await savePaperDocument(
                    {
                      ...d,
                      id: uid(),
                      fileId: uid(),
                      revision: 0,
                      name: d.name.slice(0, 970) + ' · 복구 사본',
                    },
                    bytes,
                  );
                  await refresh();
                })()
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            />
          </label>
        </details>
      )}
      {opened ? (
        <DigitalPaperRoom
          key={opened.id}
          initial={opened}
          onClose={() => {
            setOpened(null);
            void refresh();
          }}
        />
      ) : (
        <>
          <details>
            <summary>PDF·사진 가져오기</summary>
            <div className="form-grid">
              <label>
                연결할 학습 자료
                <select
                  aria-label="연결할 학습 자료"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                >
                  <option value="">새 학습 자료 만들기</option>
                  {learning(state).resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
              {!link && (
                <>
                  <label>
                    PDF 자료 과목
                    <input
                      value={subject}
                      maxLength={100}
                      onChange={(e) => setSubject(e.target.value || '일반')}
                    />
                  </label>
                  <label>
                    PDF 실제 문제 수
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={count}
                      onChange={(e) =>
                        setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                      }
                    />
                  </label>
                  <label>
                    PDF 연결 과제
                    <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                      <option value="">독립 자료</option>
                      {state.tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label>
                PDF·학습지 사진 파일
                <input
                  aria-label="PDF·학습지 사진 파일"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void take(f);
                  }}
                />
              </label>
            </div>
            <p className="muted">
              파일당 20MB·500페이지 이하. 여러 문서를 같은 자료에 연결할 수 있습니다. 문제 번호와
              페이지 영역은 학습실에서 직접 지정합니다.
            </p>
          </details>
          <div className="paper-document-list">
            {docs.map((d) => (
              <article key={d.id}>
                <strong>{d.name}</strong>
                <p>
                  {d.pages.length}페이지 · 필기 {d.layers.reduce((n, l) => n + l.strokes.length, 0)}
                  획 ·{' '}
                  {learning(state).resources.find((r) => r.id === d.resourceId)?.title ||
                    '미연결 원본 보존'}
                </p>
                <button onClick={() => setOpened(d)}>종이 열기</button>
                <label>
                  문서의 자료 연결
                  <select
                    aria-label={d.name + ' 자료 연결'}
                    value={d.resourceId ?? ''}
                    disabled={busy}
                    onChange={(e) => {
                      const resourceId = e.target.value || null;
                      setBusy(true);
                      void savePaperDocument({ ...d, resourceId })
                        .then(refresh)
                        .catch((e) => setError(e.message))
                        .finally(() => setBusy(false));
                    }}
                  >
                    <option value="">원본만 보관</option>
                    {learning(state).resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
          <ExamLibrary
            documents={docs}
            onImport={async (f, p) => {
              await take(f, p);
            }}
            onOpen={setOpened}
          />
        </>
      )}
      {busy && <p role="status">원본 확인·보관 중…</p>}
      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}
    </div>
  );
}
