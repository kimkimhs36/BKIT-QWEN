import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pause, Play, RotateCcw, Timer, Clock3, ChevronDown } from 'lucide-react';
import type { State, Session } from './model';
import { quickSeconds, quickClock } from './quickTimer';
import './quick-timer.css';

type Props = {
  timer: State['quickTimer'];
  now: number;
  todaySeconds: number;
  last: Session | undefined;
  editingId: string | null;
  focusBusy: boolean;
  onStart: (mode: 'stopwatch' | 'countdown', target: number) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onLabel: (id: string, subject: string, activity: string, note: string) => boolean;
  onCloseEdit: () => void;
  compact?: boolean;
};
export function QuickStudyTimer({
  timer, now, todaySeconds, last, editingId, focusBusy,
  onStart, onPause, onResume, onFinish, onLabel, onCloseEdit, compact,
}: Props) {
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [minutes, setMinutes] = useState(25);
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [subject, setSubject] = useState('');
  const [activity, setActivity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (editingId) {
      setShowEditor(true);
      setSubject('');
      setActivity('');
      setNote('');
      setError('');
    }
  }, [editingId]);
  const seconds = timer ? quickSeconds(timer, now) : 0;
  const remaining = timer?.mode === 'countdown'
    ? Math.max(0, timer.targetMinutes * 60 - seconds)
    : seconds;
  const reached = timer?.mode === 'countdown' && seconds >= timer.targetMinutes * 60;
  const running = Boolean(timer?.segmentStart);
  const saveLabel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!last || !onLabel(last.id, subject, activity, note)) {
      setError('기록을 저장하지 못했어요. 입력을 유지했으니 다시 시도해 주세요.');
      return;
    }
    setError('');
    setShowEditor(false);
    onCloseEdit();
  };
  return (
    <section className={'quick-timer panel ' + (timer ? 'quick-timer-active ' : '') + (compact ? 'quick-timer-compact' : '')} aria-label="바로 시작 타이머">
      <header className="quick-timer-head">
        <div className="quick-timer-intro">
          <span className="eyebrow">START FIRST · RECORD LATER</span>
          <h2><Timer size={20} aria-hidden="true" /> 먼저 시작하는 공부</h2>
          <p>과목과 목표는 나중에. 지금 바로 시작해.</p>
        </div>
        <span className="quick-timer-today">오늘 기록한 공부 <strong>{quickClock(todaySeconds)}</strong></span>
      </header>
      {!timer ? (
        <div className="quick-timer-idle">
          <div className="quick-timer-modes" role="group" aria-label="빠른 타이머 종류">
            <button type="button" aria-pressed={mode === 'stopwatch'} className={mode === 'stopwatch' ? 'selected' : ''} onClick={() => setMode('stopwatch')}>
              <Clock3 size={16} /> 스톱워치
            </button>
            <button type="button" aria-pressed={mode === 'countdown'} className={mode === 'countdown' ? 'selected' : ''} onClick={() => setMode('countdown')}>
              <Timer size={16} /> 심플 타이머
            </button>
          </div>
          {mode === 'countdown' && (
            <div className="quick-timer-lengths" aria-label="타이머 목표">
              {[10, 25, 45, 60].map(n => (
                <button type="button" key={n} className={minutes === n ? 'selected' : ''} onClick={() => setMinutes(n)}>
                  {n}분
                </button>
              ))}
              <label>직접 <input aria-label="간단 타이머 시간" type="number" min="1" max="480" value={minutes} onChange={e => setMinutes(Number(e.target.value))}/> 분</label>
            </div>
          )}
          <button className="quick-timer-begin" disabled={focusBusy || (mode === 'countdown' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 480))} onClick={() => onStart(mode, mode === 'stopwatch' ? 480 : minutes)}>
            <Play size={20} fill="currentColor" /> 지금 시작
          </button>
          {focusBusy && <p className="muted" role="status">기존 집중 타이머를 종료한 뒤 시작할 수 있어요.</p>}
        </div>
      ) : (
        <div className="quick-timer-running">
          <div className="quick-timer-display" role="timer" aria-label={timer.mode === 'countdown' ? '남은 집중 시간' : '공부한 시간'}>
            {quickClock(remaining)}
          </div>
          <div className="quick-timer-under">
            {timer.mode === 'stopwatch'
              ? (running ? '시간이 쌓이고 있어 · 무엇을 했는지는 나중에 적어도 돼' : '잠시 쉬는 중 · 기록은 그대로 남아 있어')
              : reached ? '목표에 도착했어! 원하면 더 공부하고 종료해도 돼'
              : (running ? '목표 ' + timer.targetMinutes + '분 · 끝난 뒤 기록하기' : '일시정지 중')}
          </div>
          <div className="quick-timer-actions">
            <button type="button" className="secondary" onClick={running ? onPause : onResume}>
              {running ? <><Pause size={17} /> 일시정지</> : <><Play size={17} /> 이어하기</>}
            </button>
            <button type="button" className="primary" onClick={onFinish}>
              <Check size={17} /> 끝내고 시간 저장
            </button>
          </div>
        </div>
      )}
      {!timer && last?.quick && (editingId === last.id || expanded || showEditor) && (
        <div className="quick-timer-after">
          <button type="button" className="quick-timer-review" aria-expanded={showEditor} onClick={() => setShowEditor(v => !v)}>
            <Check size={17} /> 최근 기록 저장됨 · {quickClock(last.seconds)} <ChevronDown size={16} />
          </button>
          {showEditor && (
            <form onSubmit={saveLabel} className="quick-timer-form">
              <p>지금은 안 적어도 돼. 시간은 이미 저장했어.</p>
              <label>과목 (선택)
                <select value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="">나중에 선택</option>
                  {['국어', '영어', '수학', '물리', '화학', '경제', '기타'].map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>무엇을 공부했어? (선택)
                <input placeholder="예: 미적분 학습지 3쪽" maxLength={200} value={activity} onChange={e => setActivity(e.target.value)}/>
              </label>
              <label>짧은 메모 (선택)
                <textarea rows={2} maxLength={200} placeholder="기억하고 싶은 것 하나" value={note} onChange={e => setNote(e.target.value)}/>
              </label>
              {error && <p role="alert">{error}</p>}
              <div className="quick-timer-actions">
                <button type="submit" className="primary"><Check size={16}/> 내용 저장</button>
                <button type="button" className="secondary" onClick={() => {setShowEditor(false);onCloseEdit();}}>나중에 적기</button>
              </div>
            </form>
          )}
        </div>
      )}
      {!timer && last?.quick && !editingId && !expanded && !showEditor && (
        <button className="quick-timer-reopen" type="button" onClick={() => {setExpanded(true);setShowEditor(true);}}>
          <RotateCcw size={14}/> 최근 공부 기록 정리하기 (선택)
        </button>
      )}
    </section>
  );
}
