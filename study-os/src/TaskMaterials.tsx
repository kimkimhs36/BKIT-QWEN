import { useEffect, useRef, useState } from 'react';
import type { Task } from './model';
import { newState } from './model';
import { addResource } from './learningEngine';
import type { LearningResource, LearningProblem } from './learningModel';
import { storePhoto } from './atelierMedia';
import { savePaperDocument } from './paperStorage';
import { PrivatePhotoCard } from './StudyAtelier';

export type TaskMaterialDraft = {
  photoIds: string[];
  papers: { resource: LearningResource; problems: LearningProblem[]; name: string }[];
};
export const emptyTaskMaterials = (task?: Task | null): TaskMaterialDraft => ({
  photoIds: task?.attachmentIds ?? [],
  papers: [],
});
/** Store originals first. The parent commits task and resource references together. */
export function TaskMaterials({
  taskId,
  value,
  onChange,
  onBusy,
  photosOnly = false,
}: {
  taskId: string;
  value: TaskMaterialDraft;
  onChange: (value: TaskMaterialDraft) => void;
  onBusy: (busy: boolean) => void;
  photosOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [failed, setFailed] = useState<File | null>(null),
    [download, setDownload] = useState('');
  const working = useRef(false),
    current = useRef(value);
  current.current = value;
  useEffect(() => {
    if (!failed) {
      setDownload('');
      return;
    }
    const url = URL.createObjectURL(failed);
    setDownload(url);
    return () => URL.revokeObjectURL(url);
  }, [failed]);
  async function attach(files: File[]) {
    if (working.current || !files.length) return;
    working.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    setFailed(null);
    for (const file of files) {
      try {
        let next: TaskMaterialDraft;
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          const s = addResource(
            newState(),
            {
              title: file.name.slice(0, 200),
              subject: '기타',
              sourceType: 'school-worksheet',
              linkedTaskId: taskId,
              linkedMediaIds: [],
            },
            [''],
          );
          const resource = s.learning!.resources[0];
          const { importPaper } = await import('./paperPdf');
          const paper = await importPaper(file, resource.id);
          await savePaperDocument(paper.document, paper.bytes);
          next = {
            ...current.current,
            papers: [
              ...current.current.papers,
              { resource, problems: s.learning!.problems, name: file.name },
            ],
          };
        } else {
          const id = await storePhoto(file, current.current.photoIds);
          next = { ...current.current, photoIds: [...new Set([...current.current.photoIds, id])] };
        }
        current.current = next;
        onChange(next);
      } catch (e) {
        setFailed(file);
        setError(
          (e instanceof Error ? e.message : '자료를 저장하지 못했어요.') +
            ' 원본을 내려받고 다시 시도할 수 있어요.',
        );
        break;
      }
    }
    working.current = false;
    setBusy(false);
    onBusy(false);
  }
  return (
    <section aria-label="과제 사진 및 PDF 첨부" className="task-materials">
      <p>학교 공지·학습 자료 첨부 (선택)</p>
      <small>촬영이 열리지 않으면 사진 보관함을 선택하거나 직접 입력해 주세요.</small>
      <div className="form-grid">
        <label>
          카메라로 과제 촬영
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              void attach(files);
            }}
          />
        </label>
        <label>
          갤러리 사진 첨부
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              void attach(files);
            }}
          />
        </label>
        {!photosOnly && (
          <label>
            과제 PDF 첨부
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                void attach(files);
              }}
            />
          </label>
        )}
      </div>
      {busy && <p role="status">원본 보관 중… 저장이 끝날 때까지 기다려 주세요.</p>}
      {error && <p role="alert">{error}</p>}
      {failed && (
        <div className="modal-actions">
          <a href={download || undefined} download={failed.name}>
            미저장 원본 다운로드
          </a>
          <button type="button" disabled={busy} onClick={() => void attach([failed])}>
            자료 저장 재시도
          </button>
        </div>
      )}
      <div className="atelier-photos">
        {value.photoIds.map((id) => (
          <PrivatePhotoCard
            key={id}
            id={id}
            onRemove={() =>
              onChange({ ...value, photoIds: value.photoIds.filter((x) => x !== id) })
            }
          />
        ))}
      </div>
      {value.papers.map((p) => (
        <p key={p.resource.id}>PDF 원본 보관됨 · {p.name}</p>
      ))}
      <small>
        과제 저장에 실패해도 보관한 원본은 유지돼요. PDF 필기는 집중 → 디지털 종이에서 열 수 있어요.
      </small>
    </section>
  );
}
