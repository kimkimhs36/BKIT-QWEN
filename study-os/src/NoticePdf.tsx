import { useEffect, useState } from 'react';
import { listPaperDocuments, readPaperFile } from './paperStorage';
import { sha256 } from './localZip';
/** Read original bytes without starting a study session or requiring a saved task. */
export function NoticePdf({ resourceId, name }: { resourceId: string; name: string }) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true,
      objectUrl = '';
    void (async () => {
      try {
        const doc = (await listPaperDocuments()).find((d) => d.resourceId === resourceId);
        if (!doc) throw new Error('이 기기에서 PDF 원본을 찾지 못했어요. ZIP 백업에서 복원하세요.');
        const bytes = await readPaperFile(doc.fileId),
          blob = new Blob([bytes], { type: doc.mime });
        if ((await sha256(blob)) !== doc.digest)
          throw new Error('PDF 원본 무결성 확인에 실패했어요. 파일을 다시 첨부해 주세요.');
        if (live) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'PDF를 열지 못했어요.');
      }
    })();
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resourceId]);
  return (
    <div>
      {error ? (
        <p role="alert">{error}</p>
      ) : url ? (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {name} PDF 원본 보기
          </a>
          {' · '}
          <a href={url} download={name}>
            원본 다운로드
          </a>
        </>
      ) : (
        <p role="status">PDF 원본 확인 중…</p>
      )}
    </div>
  );
}
