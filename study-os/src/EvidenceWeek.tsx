import type { State } from './model';
import type { SleepState } from './sleep';
import { summarizeEvidenceWeek } from './evidenceWeek';

type Props = {
  state: State;
  sleep: SleepState;
  today: string;
  studying: boolean;
  sleepProtected: boolean;
  onStartOrResume: () => void;
  onSleep: () => void;
};

/**
 * This reads the existing local study + Sleep Guard stores.
 * It never writes synthetic outcomes or declares that habits improved.
 */
export function EvidenceWeek({
  state, sleep, today, studying, sleepProtected, onStartOrResume, onSleep,
}: Props) {
  const evidence = summarizeEvidenceWeek(state, sleep, today);
  const todayRecord = evidence.days[6];
  return (
    <section className="bkit-evidence-week" aria-label="최근 7일 실제 행동 확인">
      <header className="bkit-evidence-header">
        <div>
          <span className="bkit-evidence-overline">REAL LIFE / 7 DAYS</span>
          <h2>지난 7일, 실제로 남긴 기록</h2>
          <p>클릭 수가 아니라 직접 저장한 집중 시간·재풀이·취침 준비를 보여줘요.</p>
        </div>
        <span className="bkit-evidence-honest">{evidence.evidenceDays}/7일 기록 확인</span>
      </header>
      <div className="bkit-evidence-figures" aria-label="기록된 행동 집계">
        <div><strong>{evidence.focusedDays}<small>일</small></strong><span>공부 시간 기록</span></div>
        <div><strong>{evidence.retestedDays}<small>일</small></strong><span>힌트 없이 재풀이 자가 확인</span></div>
        <div><strong>{evidence.checkedPrepDays}<small>일</small></strong><span>취침 준비 3단계 체크</span></div>
      </div>
      <div className="bkit-evidence-days" role="list" aria-label="날짜별 학습과 취침 준비 기록">
        {evidence.days.map((item) => (
          <div
            className={'bkit-evidence-day' + (item.day === today ? ' is-today' : '')}
            key={item.day}
            role="listitem"
          >
            <time dateTime={item.day}>{item.day.slice(5).replace('-', '.')}</time>
            <strong>{item.studyRecorded ? Math.floor(item.studySeconds / 60) + '분' : '미기록'}</strong>
            <small>{item.selfCheckedRetests > 0 ? '재풀이 확인 ' + item.selfCheckedRetests : '재풀이 미기록'}</small>
            <small>{item.bedtimeChecks > 0 ? '취침 준비 ' + item.bedtimeChecks + '/3' : '취침 준비 미기록'}</small>
          </div>
        ))}
      </div>
      <div className="bkit-evidence-today">
        <div>
          <strong>오늘의 다음 한 가지</strong>
          <p>
            {sleepProtected
              ? '지금은 취침 준비를 먼저 확인해 주세요. 실제 잠든 시각은 자동 계산하지 않아요.'
              : studying
                ? '진행 중인 공부를 직접 마무리하고 기록을 저장해 주세요.'
                : todayRecord.studyRecorded
                  ? '이미 저장한 시간이 있어요. 부담 없이 다음 5분을 선택할 수 있어요.'
                  : '오늘 완료된 공부 기록은 아직 없어요. 첫 5분부터 시작해 보세요.'}
          </p>
        </div>
        <button type="button" onClick={sleepProtected ? onSleep : onStartOrResume}>
          {sleepProtected ? '취침 준비 확인' : studying ? '공부 이어가기' : '자율 학습 5분 시작'}
        </button>
      </div>
      <p className="bkit-evidence-disclaimer">
        ‘미기록’은 실패를 뜻하지 않아요. 취침 준비 체크는 실제 수면이 아니며,
        재풀이 성공은 사용자 자가 확인입니다. 7일간의 기록만으로 생활 개선을 판정하지 않아요.
        저장하지 않은 공부는 계산되지 않습니다.
      </p>
    </section>
  );
}
