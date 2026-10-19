import { useState } from 'react';
import { Activity, RotateCw, ShieldCheck } from 'lucide-react';
import { API_URL } from './ai';
import { checkApiHealth, type ApiHealth } from './apiReadiness';

export function ApiReadinessPanel() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const inspect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setHealth(await checkApiHealth(API_URL));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="note-card" aria-label="AI 및 비공개 API 연결 진단">
      <div className="section-head">
        <h3>
          <Activity size={17} aria-hidden="true" /> API · 연결 점검
        </h3>
        <button type="button" className="secondary" onClick={inspect} disabled={busy}>
          <RotateCw size={15} aria-hidden="true" /> {busy ? '진단 중…' : '서버 상태 다시 확인'}
        </button>
      </div>
      <p>비용이 발생하는 AI 호출이나 개인정보 전송 없이, 서버의 공개 상태 정보만 확인해요.</p>
      {!health ? (
        <p className="hint">아직 점검하지 않았어. AI 설정과 실제 접속 성공 여부는 별개야.</p>
      ) : (
        <div role="status" aria-live="polite">
          <p>
            <ShieldCheck size={15} aria-hidden="true" /> 서버 응답:{' '}
            <strong>{health.available ? '연결됨' : '확인 실패'}</strong>
          </p>
          {health.reason && <p>{health.reason}</p>}
          {health.available && (
            <>
              <p>
                과제 브리핑 AI:{' '}
                <strong>{health.briefingReady ? '서버 구성 확인' : '데모/미구성'}</strong>
              </p>
              <p>
                인증 설정: {health.authConfigured ? '환경 설정 확인' : '미완료'} · 비용 상한:{' '}
                {health.budgetConfigured ? '설정 확인' : '미완료'}
              </p>
              {health.model && <p>서버에 표시된 모델: {health.model}</p>}
              <p className="hint">
                이 결과는 계정 로그인·실제 AI 응답 성공을 증명하지 않아. 개인 계정으로 브리핑을
                시도해야 최종 검증할 수 있어.
              </p>
            </>
          )}
        </div>
      )}
      {
        <p className="hint">
          운영 서버는 과제 브리핑을 지원하고, 계획·코치·일반 AI 채팅은 미지원이에요. 로컬 계획
          복구와 규칙 기반 비서는 계속 사용할 수 있어요.
        </p>
      }
    </section>
  );
}
