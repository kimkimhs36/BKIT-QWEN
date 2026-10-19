import { useState } from 'react';
import type { PaperDocument, SourceProvenance } from './paperModel';
import { OFFICIAL_PORTALS, checkedProvenance, fetchOfficialPdf } from './examSources';
const EMPTY: SourceProvenance = {
  title: '',
  url: '',
  fileUrl: '',
  institution: '',
  year: '',
  exam: '',
  grade: '',
  subject: '',
  curriculum: '',
  kind: 'question',
  rights: '',
  verifiedAt: null,
};
const FIELDS = [
  ['year', '학년도'],
  ['exam', '시험 종류'],
  ['grade', '학년'],
  ['subject', '과목'],
  ['curriculum', '교육과정'],
  ['institution', '시행 기관'],
] as const;
export function ExamLibrary({
  documents,
  onImport,
  onOpen,
}: {
  documents: PaperDocument[];
  onImport: (file: File, source: SourceProvenance) => Promise<void>;
  onOpen: (d: PaperDocument) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [source, setSource] = useState<SourceProvenance>(EMPTY),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function take(file?: File) {
    setBusy(true);
    setError('');
    try {
      const p = checkedProvenance({
        ...source,
        verifiedAt: confirmed ? new Date().toISOString() : null,
      });
      const f = file ?? (await fetchOfficialPdf(p));
      await onImport(f, p);
    } catch (e) {
      setError((e as Error).message + ' 공식 자료실에서 직접 내려받은 PDF를 선택할 수 있습니다.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="exam-library">
      <summary>공식 기출 PDF 자료실</summary>
      <p>
        공식 자료실에서 실제 자료·문제지/정답지·이용 조건을 확인한 뒤 PDF를 등록하세요. 출처가
        확인되지 않은 문제나 파일 주소는 검색 결과로 만들지 않습니다.
      </p>
      <nav aria-label="확인된 공식 자료실">
        {OFFICIAL_PORTALS.map((p) => (
          <p key={p.url}>
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              {p.title} 열기 ↗
            </a>{' '}
            · {p.note}
          </p>
        ))}
      </nav>
      <h3>등록한 기출 자료 검색</h3>
      <div className="form-grid">
        {FIELDS.map(([k, label]) => (
          <label key={k}>
            {label} 검색
            <input
              aria-label={label + ' 검색'}
              value={filters[k] || ''}
              onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="paper-document-list">
        {documents
          .filter(
            (d) =>
              d.provenance &&
              Object.entries(filters).every(([k, v]) =>
                String(d.provenance![k as keyof SourceProvenance]).includes(v),
              ),
          )
          .map((d) => (
            <article key={d.id}>
              <strong>{d.provenance!.title}</strong>
              <p>
                {FIELDS.map(([k]) => d.provenance![k])
                  .filter(Boolean)
                  .join(' · ')}{' '}
                ·{' '}
                {d.provenance!.kind === 'answer'
                  ? '정답지'
                  : d.provenance!.kind === 'question'
                    ? '문제지'
                    : '기타'}
              </p>
              <p>사용자 출처·이용 조건 확인: {d.provenance!.verifiedAt?.slice(0, 10)}</p>
              <a href={d.provenance!.url} target="_blank" rel="noopener noreferrer">
                원문 공식 출처 ↗
              </a>
              <button onClick={() => onOpen(d)}>PDF 열기</button>
              <details>
                <summary>이용 조건·파일 출처</summary>
                <p>{d.provenance!.rights}</p>
                <p>{d.provenance!.fileUrl || '공식 사이트에서 사용자가 내려받은 원본'}</p>
              </details>
            </article>
          ))}
      </div>
      {!documents.some((d) => d.provenance) && (
        <p>
          등록한 기출 PDF가 없습니다. 위 공식 링크는 자료실 안내이며 개별 시험 검색 결과가 아닙니다.
        </p>
      )}
      <details>
        <summary>확인한 공식 자료 등록</summary>
        <form
          className="exam-source-form"
          onSubmit={(e) => {
            e.preventDefault();
            void take();
          }}
        >
          <label>
            실제 자료 제목
            <input
              required
              maxLength={200}
              value={source.title}
              onChange={(e) => setSource({ ...source, title: e.target.value })}
            />
          </label>
          {FIELDS.map(([k, label]) => (
            <label key={k}>
              {label}
              <input
                required
                value={source[k]}
                maxLength={k === 'year' ? 20 : k === 'grade' ? 50 : 100}
                onChange={(e) => setSource({ ...source, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            공식 자료 페이지 URL
            <input
              type="url"
              required
              value={source.url}
              onChange={(e) => setSource({ ...source, url: e.target.value })}
            />
          </label>
          <label>
            실제로 확인한 파일 URL (선택)
            <input
              type="url"
              value={source.fileUrl}
              onChange={(e) => setSource({ ...source, fileUrl: e.target.value })}
            />
          </label>
          <label>
            자료 유형
            <select
              value={source.kind}
              onChange={(e) =>
                setSource({ ...source, kind: e.target.value as SourceProvenance['kind'] })
              }
            >
              <option value="question">문제지</option>
              <option value="answer">정답지</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label>
            확인한 이용 조건·저작권
            <textarea
              required
              maxLength={2000}
              value={source.rights}
              onChange={(e) => setSource({ ...source, rights: e.target.value })}
            />
          </label>
          <label className="sleep-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            공식 출처와 이 자료의 개인 학습용 이용 조건을 직접 확인했습니다.
          </label>
          <button type="submit" disabled={busy || !confirmed || !source.fileUrl}>
            허용된 공식 PDF 직접 가져오기
          </button>
          <label>
            직접 내려받은 공식 PDF 등록
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy || !confirmed}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void take(f);
              }}
            />
          </label>
          <small>
            공식 기관 HTTPS 도메인만 연결합니다. CORS·로그인·접근 제한이 있으면 직접 다운로드를
            이용하세요. 자동 채점·정답 매칭은 하지 않습니다.
          </small>
        </form>
      </details>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
