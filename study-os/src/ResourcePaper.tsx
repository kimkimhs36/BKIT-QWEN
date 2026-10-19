import { flushLearning } from './learningFlush';
import { useEffect, useState } from 'react';
import type { LearningProblem, LearningResource } from './learningModel';
import type { PaperDocument } from './paperModel';
import { listPaperDocuments, savePaperDocument } from './paperStorage';
import { readVaultPhoto } from './photoVault';
import { importPaper } from './paperPdf';
import { DigitalPaperRoom } from './DigitalPaperRoom';
export function ResourcePaper({
  resource,
  problem,
  attemptKey,
  onReference,
}: {
  resource: LearningResource;
  problem: LearningProblem;
  attemptKey: string;
  onReference: () => boolean;
}) {
  const [docs, setDocs] = useState<PaperDocument[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function refresh() {
    const all = (await listPaperDocuments()).filter((d) => d.resourceId === resource.id);
    setDocs(all);
    const linked =
      all.find(
        (d) => d.provenance?.kind !== 'answer' && d.regions.some((r) => r.problemId === problem.id),
      ) ?? all.find((d) => d.regions.some((r) => r.problemId === problem.id));
    setSelected(
      linked?.id ??
        (problem.mediaId
          ? (all.find((d) => d.legacyMediaId === problem.mediaId)?.id ??
            all.find((d) => !d.legacyMediaId && d.provenance?.kind !== 'answer')?.id)
          : (all.find((d) => d.provenance?.kind !== 'answer') ?? all[0])?.id) ??
        '',
    );
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [resource.id, problem.id]);
  async function photo(id: string) {
    setBusy(true);
    try {
      const p = await readVaultPhoto('study', id);
      if (!p) throw new Error('기존 사진 원본을 찾을 수 없습니다.');
      const imported = await importPaper(
        new File([p.bytes], p.name, { type: p.mime }),
        resource.id,
      );
      const saved = await savePaperDocument(
        { ...imported.document, legacyMediaId: id },
        imported.bytes,
      );
      setDocs([...docs, saved]);
      setSelected(saved.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const doc = docs.find((d) => d.id === selected);
  return (
    <div className="resource-paper">
      {docs.length > 0 && (
        <label>
          문제 원본 문서
          <select
            aria-label="문제 원본 문서"
            value={selected}
            onChange={(e) => {
              const id = e.target.value;
              const change = () => {
                void listPaperDocuments()
                  .then((all) => {
                    setDocs(all.filter((d) => d.resourceId === resource.id));
                    setSelected(id);
                  })
                  .catch((e) => setError(e.message));
              };
              if (flushLearning(change)) change();
            }}
          >
            <option value="">원본 선택</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.provenance?.kind === 'answer' ? ' · 정답지' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {doc?.provenance?.kind === 'answer' ? (
        <details
          onToggle={(e) => {
            if (e.currentTarget.open && !onReference()) e.currentTarget.open = false;
          }}
        >
          <summary>연결된 정답지 표시 · 직접 확인용</summary>
          <DigitalPaperRoom
            key={doc.id}
            initial={doc}
            problemId={problem.id}
            attemptKey={attemptKey}
            onReference={onReference}
          />
        </details>
      ) : (
        doc && (
          <DigitalPaperRoom
            key={doc.id}
            initial={doc}
            problemId={problem.id}
            attemptKey={attemptKey}
            onReference={onReference}
          />
        )
      )}
      {(problem.mediaId ? !docs.some((d) => d.legacyMediaId === problem.mediaId) : !docs.length) &&
        (problem.mediaId || resource.linkedMediaIds.length > 0) && (
          <details>
            <summary>기존 사진 위에 필기하기</summary>
            {(problem.mediaId ? [problem.mediaId] : resource.linkedMediaIds).map((id, i) => (
              <button key={id} disabled={busy} onClick={() => void photo(id)}>
                {i + 1}번째 사진을 디지털 종이로 열기
              </button>
            ))}
          </details>
        )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
