import { useState, useRef } from 'react';
import { auditStudyStorage, type StorageAudit } from './storageReadiness';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
  latestRecovery,
  type InspectedBackup,
} from './completeBackup';
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function CompleteBackupPanel({ studying }: { studying: boolean }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [inspected, setInspected] = useState<InspectedBackup | null>(null),
    [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [restored, setRestored] = useState(false);
  const working = useRef(false);
  const [storageStatus, setStorageStatus] = useState('');
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [audit, setAudit] = useState<StorageAudit | null>(null);
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
            const blob = await exportCompleteBackup(localStorage, setMessage);
            saveBlob(blob, `bkit-complete-${new Date().toISOString().slice(0, 10)}.zip`);
            setMessage(
              `ZIP 생성 및 다운로드 요청 완료 · ${(blob.size / 1024 / 1024).toFixed(1)}MB. 브라우저의 다운로드/파일 앱에서 실제 파일 저장을 확인한 뒤, 아래 '전체 ZIP 백업 검사'로 다시 열어 무결성을 확인하세요.`,
            );
          })
        }
      >
        사진 포함 전체 ZIP 내보내기
      </button>
      <p className="muted">
        브라우저 안의 로컬 자료는 다른 기기에 자동 백업·동기화되지 않습니다. 특히 PDF와 필기 원본은
        백업 ZIP을 외부에 보관해야 기기나 브라우저 저장소가 지워져도 복원할 수 있습니다. 다운로드
        요청만으로 파일 저장이 확인되는 것은 아니니 실제 파일을 다시 선택해 검사하세요.
      </p>
      <button type="button" disabled={checkingStorage} onClick={() => void inspectLocalStorageHealth()}>
        {checkingStorage ? '저장 환경 확인 중…' : '현재 기기 저장 환경 확인'}
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
            기존 학습 사진 {audit.studyPhotos}장 · 수면 사진 {audit.sleepPhotos}장 ·
            확인한 PDF/학습지 원본 {audit.verifiedOriginals}개
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
            if (file)
              void work(async () => {
                const result = await inspectCompleteBackup(file, localStorage, setMessage);
                setInspected(result);
                setMessage('파일과 사진 무결성 검사를 마쳤습니다. 복원 방식을 선택하세요.');
              });
          }}
        />
      </label>
      {inspected && (
        <div className="resource-editor">
          <h3>가져오기 전 확인</h3>
          <p>백업 생성: {new Date(inspected.manifest.createdAt).toLocaleString()}</p>
          <p>
            PDF·디지털 종이 {inspected.paper.documents.length}개 · 원본 사진{' '}
            {inspected.manifest.photos.length}장 · 겹치는 기록 ID {inspected.conflicts.length}개 ·
            내용이 다른 사진 ID {inspected.photoConflicts.length}개
          </p>
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
          {studying && (
            <p role="alert">
              현재 학습을 종료한 뒤 파일을 다시 검사하세요. 작성 중인 답은 학습실에 저장됩니다.
            </p>
          )}
          <div className="learning-actions">
            <button
              className="primary"
              disabled={busy || studying || restored}
              onClick={() =>
                void work(async () => {
                  const journal = await restoreCompleteBackup(
                    inspected,
                    mode,
                    localStorage,
                    setMessage,
                  );
                  setRestored(true);
                  setMessage(`복원 완료. 앱을 다시 열어 기록을 확인하세요. 원본 보존: ${journal}`);
                })
              }
            >
              검사한 백업 {mode === 'merge' ? '병합' : '교체'}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setInspected(null);
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
