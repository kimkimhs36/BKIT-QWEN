import { useState, useRef } from 'react';
import { auditStudyStorage, type StorageAudit } from './storageReadiness';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  backupMatchesCurrent,
  snapshotKeys,
  backupKeysUnchanged,
  restoreCompleteBackup,
  schoolNoticeBackupContents,
  latestRecovery,
  type InspectedBackup,
} from './completeBackup';
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  // Safari may ignore a programmatic download from a detached <a> element.
  // Use a connected anchor and always remove it after the click.
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
export function CompleteBackupPanel({ studying }: { studying: boolean }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [inspected, setInspected] = useState<InspectedBackup | null>(null),
    [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [restored, setRestored] = useState(false);
  const working = useRef(false);
  const [archiveNoticeLimit, setArchiveNoticeLimit] = useState(20);
  const [inspectedFile, setInspectedFile] = useState<{ name: string; bytes: number } | null>(null);
  // Keep the prepared ZIP for retry, but never offer stale localStorage-backed records.
  // Exporting can be asynchronous, which may outlive Safari's user-activation window.
  const [preparedDownload, setPreparedDownload] = useState<{
    blob: Blob;
    name: string;
    sourceKeys: ReturnType<typeof snapshotKeys>;
  } | null>(null);
  const [verifiedBackupAt, setVerifiedBackupAt] = useState(() => {
    try { return localStorage.getItem('bkit.backup.last-file-checked.v1') ?? ''; }
    catch { return ''; }
  });
  const [storageStatus, setStorageStatus] = useState('');
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [audit, setAudit] = useState<StorageAudit | null>(null);
  const [archiveCoverage, setArchiveCoverage] = useState<ReturnType<typeof backupMatchesCurrent> | null>(null);
  const archivedSchoolNotices = inspected ? schoolNoticeBackupContents(inspected) : [];
  async function inspectLocalStorageHealth() {
    setCheckingStorage(true);
    try {
      if (!navigator.storage?.estimate) {
        setStorageStatus('이 브라우저에서는 저장 공간 추정 정보를 제공하지 않습니다.');
        return;
      }
      const estimate = await navigator.storage.estimate();
      const persistent = navigator.storage.persisted
        ? await navigator.storage.persisted()
        : null;
      const size = (bytes: number | undefined) =>
        bytes === undefined ? '미제공' : (bytes / 1024 / 1024).toFixed(1) + 'MB';
      setStorageStatus(
        '이 사이트 저장 공간 추정: ' + size(estimate.usage) + ' 사용 / ' +
          size(estimate.quota) + ' 할당량. 영구 저장 보호: ' +
          (persistent === true ? '승인됨' : persistent === false ? '승인되지 않음' : '지원 정보 없음') +
          '. 이 수치는 저장 파일 무결성 검사나 외부 백업 완료를 보증하지 않습니다.',
      );
    } catch {
      setStorageStatus('저장 환경을 확인할 수 없습니다. ZIP 백업 파일을 내려받아 직접 재검사해 주세요.');
    } finally {
      setCheckingStorage(false);
    }
  }
  async function requestPersistentStorage() {
    setCheckingStorage(true);
    try {
      if (!navigator.storage?.persist) {
        setStorageStatus('이 브라우저는 영구 저장 요청을 지원하지 않습니다. 외부 ZIP 백업이 필요합니다.');
        return;
      }
      const granted = await navigator.storage.persist();
      setStorageStatus(
        granted
          ? '이 브라우저가 영구 저장 요청을 승인했습니다. 그래도 기기 삭제·손상 시에는 외부 ZIP 백업이 필요합니다.'
          : '영구 저장 요청이 승인되지 않았습니다. 브라우저의 저장 공간 정책에 따라 데이터가 정리될 수 있습니다. 외부 ZIP 백업을 보관하세요.',
      );
    } catch {
      setStorageStatus('영구 저장 권한을 확인할 수 없습니다. 외부 ZIP 백업을 보관하세요.');
    } finally {
      setCheckingStorage(false);
    }
  }
  async function work(fn: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '백업 작업에 실패했습니다. 기존 기록을 보존합니다.',
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel complete-backup" aria-label="사진 포함 전체 백업">
      <span className="eyebrow">COMPLETE LOCAL BACKUP</span>
      <h2>PDF와 필기까지, 내 공부 그대로</h2>
      <p>
        과제·시간표·세션·문제·정답·오답·복습·시험·수면 기록과 PDF·사진 원본, 편집 가능한 필기,
        페이지·문제 영역을 ZIP으로 묶습니다.
      </p>
      <p className="muted">
        PDF·사진 합계 250MB, 전체 파일 300MB까지 지원합니다. 한 장씩 검사하며 사진을 압축 해제하지
        않습니다. 큰 파일은 PC에서 작업하세요. 백업 파일에는 개인 학습 기록과 사진이 포함됩니다.
      </p>
      <button
        className="primary"
        disabled={busy || restored}
        onClick={() =>
          void work(async () => {
            setPreparedDownload(null);
            const sourceKeys = snapshotKeys(localStorage);
            const blob = await exportCompleteBackup(localStorage, setMessage);
            if (!backupKeysUnchanged(sourceKeys, localStorage)) {
              throw new Error('ZIP 생성 중 기록이 바뀌었습니다. 최신 기록으로 다시 내보내 주세요.');
            }
            const name = `bkit-complete-${new Date().toISOString().slice(0, 10)}.zip`;
            const isIOS =
              /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (isIOS) {
              setPreparedDownload({ blob, name, sourceKeys });
              setMessage(
                `ZIP 생성 완료 · ${(blob.size / 1024 / 1024).toFixed(1)}MB. iPhone/iPad에서는 아래 '준비한 ZIP 다운로드'를 직접 한 번 더 눌러야 다운로드가 시작됩니다. 생성만으로 파일이 저장된 것은 아닙니다.`,
              );
            } else {
              saveBlob(blob, name);
              setMessage(
                `ZIP 생성 및 다운로드 요청 완료 · ${(blob.size / 1024 / 1024).toFixed(1)}MB. 다운로드/파일 앱에서 실제 파일 저장을 확인한 뒤 '전체 ZIP 백업 검사'로 다시 열어 무결성을 확인하세요.`,
              );
            }
          })
        }
      >
        사진 포함 전체 ZIP 내보내기
      </button>
      {preparedDownload && (
        <button
          type="button"
          className="primary"
          disabled={busy || restored}
          onClick={() => {
            // Must remain synchronous: awaiting here loses iOS Safari's user activation.
            let unchanged = false;
            try {
              unchanged = backupKeysUnchanged(preparedDownload.sourceKeys, localStorage);
            } catch {
              setError('현재 저장 기록을 확인할 수 없어 다운로드하지 않았습니다. 저장소 접근을 확인한 뒤 ZIP을 다시 준비하세요.');
              return;
            }
            if (!unchanged) {
              setPreparedDownload(null);
              setMessage('');
              setError('ZIP을 만든 뒤 학교 공지·수행평가 또는 다른 학습 기록이 변경되었습니다. 오래된 ZIP 대신 위의 전체 ZIP 내보내기를 다시 실행하세요.');
              return;
            }
            try {
              // Called directly by a fresh user tap, not after an asynchronous export.
              saveBlob(preparedDownload.blob, preparedDownload.name);
              setMessage('ZIP 다운로드 요청 완료. Safari 다운로드 목록과 파일 앱에서 실제 저장을 확인하세요. 파일이 없다면 위 ‘준비한 ZIP 다운로드’를 다시 누를 수 있습니다. 저장된 ZIP을 다시 선택해 무결성을 검사하세요.');
              // Keep the prepared ZIP for another direct tap if Safari blocks or loses the download.
              // A download request is not evidence that a file was saved.
              setError('');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'ZIP 다운로드를 시작하지 못했습니다. 다시 눌러 주세요.');
            }
          }}
        >
          준비한 ZIP 다운로드
        </button>
      )}
      <details className="resource-editor">
        <summary>iPhone · ZIP을 파일 앱에 보관하고 다시 검사하는 방법</summary>
        <ol>
          <li>‘사진 포함 전체 ZIP 내보내기’를 누릅니다. iPhone/iPad에서는 ZIP이 준비되면 ‘준비한 ZIP 다운로드’를 한 번 더 눌러야 합니다. 생성만으로 파일이 보관되지는 않습니다.</li>
          <li>Safari 주소창 옆 다운로드 버튼에서 ZIP 다운로드가 끝났는지 확인하세요. 별도의 ‘파일에 저장’ 동작 없이도 Safari는 설정된 다운로드 폴더에 파일을 저장할 수 있습니다.</li>
          <li>‘파일’ 앱 → ‘둘러보기’에서 iCloud Drive → 다운로드 항목 또는 ‘나의 iPhone’ → 다운로드 항목을 찾아 ZIP 이름과 크기를 확인하세요. 없으면 ‘설정’ → ‘앱’ → ‘Safari’ → ‘다운로드’의 실제 저장 위치를 확인하세요.</li>
          <li>이 화면의 ‘전체 ZIP 백업 검사’에서 방금 저장한 ZIP을 다시 선택하고, 학교 공지 원본과 학습 기록의 일치 여부를 확인합니다.</li>
          <li>검사만 할 때는 ‘기존 기록 유지 · 닫기’를 누르세요. 실제 기록이 있는 기기에서 ‘교체’를 누르지 마세요.</li>
        </ol>
        <p className="muted">iOS 버전과 Safari 설정에 따라 다운로드/공유 메뉴 위치가 다를 수 있습니다. ZIP을 다른 서비스에 업로드할 필요는 없습니다.</p>
      </details>
      <p className="muted">
        {verifiedBackupAt
          ? '이 브라우저에서 마지막으로 외부 ZIP 파일을 직접 검사한 시각: ' + new Date(verifiedBackupAt).toLocaleString('ko-KR')
          : '이 브라우저에서 외부 ZIP 백업 파일을 다시 검사한 기록이 없습니다.'}
        {' '}검사 뒤 파일을 삭제하거나 이동했을 가능성은 앱이 확인할 수 없습니다.
        공부한 자료가 늘어나면 새 ZIP을 만들고 직접 검사를 반복하세요.
      </p>
      <p className="muted">
        브라우저 안의 로컬 자료는 다른 기기에 자동 백업·동기화되지 않습니다. 특히 PDF와 필기 원본은
        백업 ZIP을 외부에 보관해야 기기나 브라우저 저장소가 지워져도 복원할 수 있습니다. 다운로드
        요청만으로 파일 저장이 확인되는 것은 아니니 실제 파일을 다시 선택해 검사하세요.
      </p>
      <button type="button" disabled={checkingStorage} onClick={() => void inspectLocalStorageHealth()}>
        {checkingStorage ? '저장 환경 확인 중…' : '현재 기기 저장 환경 확인'}
      </button>
      <button type="button" disabled={checkingStorage} onClick={() => void requestPersistentStorage()}>
        이 기기에 오래 보관하도록 브라우저에 요청
      </button>
      {storageStatus && <p className="muted" role="status">{storageStatus}</p>}
      <button
        type="button"
        disabled={busy || checkingStorage}
        onClick={() =>
          void work(async () => {
            setAudit(null);
            const result = await auditStudyStorage(localStorage, setMessage);
            setAudit(result);
            setMessage('기기 안의 기록 및 연결된 원본 검사 완료. 결과를 아래에서 확인하세요.');
          })
        }
      >
        내 공부 기록·PDF·필기 원본 정밀 검사
      </button>
      {audit && (
        <section aria-label="저장 무결성 진단 결과" className="resource-editor">
          <h3>이 기기의 저장 상태</h3>
          <p>
            과제 {audit.tasks}개 · 문제 {audit.problems}개 · PDF/사진 문서 {audit.paperDocuments}개 ·
            페이지 {audit.paperPages}장 · 필기 획 {audit.strokes}개
          </p>
          <p>
            학습 사진 {audit.verifiedStudyPhotos}/{audit.studyPhotos}장 검증 ·
            수면 사진 {audit.verifiedSleepPhotos}/{audit.sleepPhotos}장 검증 ·
            PDF/학습지 원본 {audit.verifiedOriginals}/{audit.paperDocuments}개 확인
          </p>
          <p role="status">
            {audit.findings.some((finding) => finding.level === 'error')
              ? '원본 누락·손상 또는 기록 읽기 문제가 발견됐습니다. ZIP 복구 전 현재 파일을 먼저 보존하세요.'
              : '이 기기에서 확인 가능한 저장 데이터 검사 완료. 외부 ZIP 보관과 기기 간 복구는 별도로 확인하세요.'}
          </p>
          <ul>
            {audit.findings.map((finding, i) => (
              <li key={i} role={finding.level === 'error' ? 'alert' : undefined}>
                {finding.level === 'error' ? '점검 필요: ' : '안내: '}{finding.message}
              </li>
            ))}
          </ul>
          <p className="muted">
            이 검사는 현재 기기에서 읽을 수 있는 원본을 검사합니다. 브라우저 캐시 삭제, 기기 분실,
            외부 백업 파일의 실제 보존 여부와 다른 기기 동기화는 보장하지 않습니다.
          </p>
        </section>
      )}
      <label>
        전체 ZIP 백업 검사
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={busy || restored}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            setInspected(null);
            setInspectedFile(null);
            setArchiveCoverage(null);
            setArchiveNoticeLimit(20);
            // Never inherit the destructive replace choice from an earlier ZIP.
            setMode('merge');
            if (file)
              void work(async () => {
                const result = await inspectCompleteBackup(file, localStorage, setMessage);
                setInspected(result);
                setInspectedFile({ name: file.name, bytes: file.size });
                setArchiveCoverage(backupMatchesCurrent(result));
                const checked = new Date().toISOString();
                setVerifiedBackupAt(checked);
                try { localStorage.setItem('bkit.backup.last-file-checked.v1', checked); }
                catch { /* The file is still verified in this session; metadata is optional. */ }
                setMessage('선택한 ZIP 파일의 무결성을 확인했습니다. 복원할 필요가 없다면 기존 기록 유지를 누르세요. 파일이 외부에 계속 보관되는지는 직접 확인해야 합니다.');
              });
          }}
        />
      </label>
      {inspected && (
        <div className="resource-editor">
          <h3>가져오기 전 확인</h3>
          {inspectedFile && (
            <p role="status">직접 선택해 검사한 ZIP: <strong>{inspectedFile.name}</strong> · {(inspectedFile.bytes / 1024 / 1024).toFixed(2)}MB. 파일명만으로 백업 내용이나 현재 기기와의 일치를 보장하지 않습니다.</p>
          )}
          <p>백업 생성: {new Date(inspected.manifest.createdAt).toLocaleString()}</p>
          {archiveCoverage && (
            <p role="status">
              {archiveCoverage.schoolNotices
                ? '학교 공지 원본: 선택한 ZIP에 검사 시점의 이 기기 공지 보관함이 포함되어 있습니다.'
                : '학교 공지 원본 주의: 이 ZIP의 공지 보관함은 현재 기기와 다릅니다. 새로 받은 공지를 잃지 않도록 최신 ZIP을 다시 만들어 검사하세요.'}
              {' '}연결된 수행평가 기록은 아래 학습 기록 일치 여부도 함께 확인하세요.
            </p>
          )}
          {archiveCoverage && (
            <p role="status">
              {archiveCoverage.study && archiveCoverage.sleep && archiveCoverage.paper
                ? '선택한 ZIP은 검사 시점의 학습·수면·PDF/필기 저장 내용과 일치합니다. 파일을 외부에 보관했는지 확인하세요.'
                : '선택한 ZIP은 손상되지 않았지만 현재 기기의 모든 최신 기록과 일치하지는 않습니다. 이 파일만으로 지금의 기록 전체를 되찾을 수 있다고 가정하지 마세요.'}
            </p>
          )}
          <p>
            PDF·디지털 종이 {inspected.paper.documents.length}개 · 원본 사진{' '}
            {inspected.manifest.photos.length}장 · 겹치는 기록 ID {inspected.conflicts.length}개 ·
            내용이 다른 사진 ID {inspected.photoConflicts.length}개
          </p>
          <details className="resource-editor">
            <summary>ZIP에 기록된 학교 공지 {archivedSchoolNotices.length}건 · 연결된 과제 확인</summary>
            <p className="muted">
              선택한 ZIP 파일 안의 기록만 표시합니다. 현재 기기의 공지나 실제 학교 제출 내역을
              조회하지 않습니다. '제출됨'은 백업 당시 앱에 사용자가 기록한 상태일 뿐입니다.
              내용을 대조해도 복원 버튼을 누르기 전에는 현재 기록이 바뀌지 않습니다.
            </p>
            {archivedSchoolNotices.length === 0 ? (
              <p>이 ZIP에는 학교 공지 받은함 기록이 없습니다. 다른 기기의 공지까지 보관됐다고 가정하지 마세요.</p>
            ) : (
              <ul>
                {archivedSchoolNotices.slice(0, archiveNoticeLimit).map((notice) => (
                  <li key={notice.id}>
                    <strong>공지 원문 첫 줄: {notice.preview}</strong>
                     <details>
                       <summary>ZIP에 저장된 공지 텍스트 전체 보기 (공식 원문 별도 확인)</summary>
                       {notice.savedText.trim() ? (
                         <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit' }}>{notice.savedText}</pre>
                       ) : (
                         <p>ZIP에 저장된 공지 텍스트가 없습니다. 첨부 사진·PDF를 별도로 확인하세요.</p>
                       )}
                     </details>
                     {notice.savedOcrText.trim() && (
                       <details>
                         <summary>ZIP에 저장된 OCR 텍스트 보기 · 오인식 가능</summary>
                         <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit' }}>{notice.savedOcrText}</pre>
                       </details>
                     )}
                     {(notice.photoCount > 0 || notice.paperCount > 0) && (
                       <p className="muted">첨부 사진·PDF 내용은 여기서 표시하지 않습니다. 별도로 원본을 확인하세요.</p>
                     )}
                    <p>
                      ZIP 내 사진 {notice.photoCount}개 · PDF {notice.paperCount}개 ·
                      연결된 과제 {notice.tasks.length}개
                    </p>
                    {notice.tasks.length > 0 && (
                      <ul>
                        {notice.tasks.map((task) => (
                          <li key={task.id}>
                            {task.subject} · {task.title} ·
                            {task.deadlineLabel} ·
                            {task.status === 'done' ? '학습 완료 기록' : '학습 미완료 기록'} ·
                            {task.submitted
                              ? '앱 기록상 제출됨'
                              : task.submissionRequired === false
                                ? '제출 불필요'
                                : '제출 미확인'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {notice.missingTaskCount > 0 && (
                      <p className="warning" role="alert">
                        공지의 연결 과제 ID {notice.missingTaskCount}개가 이 ZIP의 학습 기록에 없습니다.
                        원문과 과제 목록을 직접 대조하세요.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {archivedSchoolNotices.length > archiveNoticeLimit && (
               <button type="button" onClick={() => setArchiveNoticeLimit((limit) => limit + 20)}>
                 ZIP 공지 20건 더 보기 · {Math.min(archiveNoticeLimit, archivedSchoolNotices.length)}/{archivedSchoolNotices.length}건 표시
               </button>
             )}
          </details>
          {(inspected.conflicts.length > 0 || inspected.photoConflicts.length > 0) && (
            <details>
              <summary>충돌 항목 보기</summary>
              <ul>
                {[...inspected.conflicts, ...inspected.photoConflicts.map((x) => '사진 원본: ' + x)]
                  .slice(0, 100)
                  .map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
              </ul>
            </details>
          )}
          {!inspected.manifest.paper && (
            <p>
              이 백업은 3.1 형식으로 PDF·필기를 포함하지 않습니다. 현재 기기의 디지털 종이는
              유지합니다.
            </p>
          )}
          <label>
            복원 방식
            <select
              aria-label="복원 방식"
              value={mode}
              disabled={busy}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="merge">병합 · 같은 ID는 현재 기록 유지</option>
              <option value="replace">교체 · 백업의 학습 기록 사용</option>
            </select>
          </label>
          <p>
            {mode === 'merge'
              ? '현재 설정·진행 세션·같은 ID 기록을 유지하고 새로운 기록을 추가합니다. 같은 ID의 두 버전은 합치지 않습니다.'
              : '백업에 포함된 저장 항목으로 교체합니다. 원래 JSON은 복구본으로 보존하고 기존 사진은 삭제하지 않습니다.'}
          </p>
          <p>
            원본 사진은 보존됩니다. 사진 ID 충돌은 새 ID로 연결합니다. 작업하지 않으면 현재 기록이
            그대로 유지됩니다.
          </p>
          {mode === 'replace' && (
            <p className="warning" role="alert">
              교체는 현재 기기의 학습 기록과 필기 문서 내용을 백업 버전으로 바꿀 수 있습니다.
              먼저 현재 기기의 ZIP 백업을 안전한 파일 앱에 별도로 보관하세요.
            </p>
          )}
          {studying && (
            <p role="alert">
              현재 학습을 종료한 뒤 파일을 다시 검사하세요. 작성 중인 답은 학습실에 저장됩니다.
            </p>
          )}
          <div className="learning-actions">
            <button
              className="primary"
              disabled={busy || studying || restored}
              onClick={() => {
                if (
                  mode === 'replace' &&
                  !window.confirm(
                    '현재 기기의 학습 기록과 PDF 필기를 검사한 백업 내용으로 교체합니다. ' +
                      '현재 기록의 별도 ZIP 백업 파일을 보관했나요? 취소하면 아무것도 변경하지 않습니다.',
                  )
                ) return;
                void work(async () => {
                  const journal = await restoreCompleteBackup(
                    inspected,
                    mode,
                    localStorage,
                    setMessage,
                  );
                  setRestored(true);
                  setMessage(`복원 완료. 앱을 다시 열어 기록을 확인하세요. 원본 보존: ${journal}`);
                });
              }}
            >
              검사한 백업 {mode === 'merge' ? '병합' : '교체'}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setInspected(null);
                setInspectedFile(null);
                setArchiveCoverage(null);
                setMode('merge');
                setMessage('현재 기록을 유지합니다.');
              }}
            >
              기존 기록 유지 · 닫기
            </button>
          </div>
        </div>
      )}
      {busy && <p role="status">{message || '백업 작업 중…'}</p>}
      {!busy && message && (
        <p className="backup-status" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      {restored && (
        <button className="primary" onClick={() => location.reload()}>
          복원한 앱 다시 열기
        </button>
      )}
      <details>
        <summary>복원 실패 시 원본 복구</summary>
        <p>
          복원은 기존 데이터를 지우고 시작하지 않습니다. 중간 실패 시 원본 JSON으로 되돌리며, 추가된
          사진 파일은 안전하게 보관합니다. 복구본을 내려받아 keys 안의 학습·수면 JSON을 각각 기존
          가져오기에 사용할 수 있습니다.
        </p>
        <button
          disabled={busy}
          onClick={() => {
            try {
              const key = latestRecovery(localStorage);
              if (!key) throw new Error('보관된 전체 복원 원본이 없습니다.');
              saveBlob(
                new Blob([localStorage.getItem(key)!], { type: 'application/json' }),
                'bkit-restore-recovery.json',
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          마지막 복원 전 원본 내보내기
        </button>
      </details>
    </section>
  );
}
