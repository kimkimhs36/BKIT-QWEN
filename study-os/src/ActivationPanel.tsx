import { useState } from 'react';
import { ACTIVATION_KEY, readActivation } from './activation';
import { dayKey } from './time';
const labels = {
  taskSaved: '과제 저장 성공',
  taskReopened: '저장한 과제 재열람',
  timetableNextDay: '시간표 다음 날 확인',
  studyStarted: '실제 타이머 시작',
  studySaved: '공부 기록 저장',
  resourceReused: '3일 뒤 같은 자료 다시 시작',
  storageFailure: '앱에서 발견한 기록 저장 실패',
};
export function ActivationPanel() {
  const [error, setError] = useState('');
  const [data, setData] = useState(() => {
    try {
      return readActivation();
    } catch {
      return null;
    }
  });
  return (
    <section className="daily-panel" aria-label="첫 주 사용 확인">
      <h2>첫 주 사용 확인 · 선택</h2>
      <p>
        켜면 이 기기에 성공·실패 횟수, 시작 날짜, 시간표 확인 날짜와 자료 ID별 사용 날짜만
        집계합니다. 과제 내용·사진은 수집하지 않고 서버로 보내지 않아요. 기본은 꺼짐입니다.
      </p>
      {!data ? (
        <p role="alert">집계 정보를 읽지 못했어요. 기존 집계는 덮어쓰지 않아요.</p>
      ) : (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={data.enabled}
              onChange={(e) => {
                try {
                  const next = { ...data, enabled: e.target.checked };
                  localStorage.setItem(ACTIVATION_KEY, JSON.stringify(next));
                  setData(next);
                  setError('');
                } catch {
                  setError('집계 설정을 저장하지 못했어요.');
                }
              }}
            />
            이 기기의 사용 결과 집계 켜기
          </label>
          <p>
            {data.since}부터 ·{' '}
            {Math.max(0, Math.floor((Date.parse(dayKey()) - Date.parse(data.since)) / 86400000))}일
            경과. 7일 이상 실제 사용한 뒤 생활에 도움이 됐는지 판단하세요. 횟수만으로 학습 성취나
            생활 개선을 판단하지 않아요.
          </p>
          <ul>
            {Object.entries(labels).map(([key, label]) => (
              <li key={key}>
                {label}: {data.counts[key] || 0}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              try {
                const next = { enabled: false, since: dayKey(), counts: {}, resources: {} };
                localStorage.setItem(ACTIVATION_KEY, JSON.stringify(next));
                setData(next);
                setError('');
              } catch {
                setError('집계 삭제 실패 · 기존 집계를 유지합니다.');
              }
            }}
          >
            집계 지우고 끄기
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
