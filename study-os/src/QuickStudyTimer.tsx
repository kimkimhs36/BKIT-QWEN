import { useEffect, useState } from 'react';
import { Check, Pause, Play, RotateCcw, Timer, Clock3, ChevronDown } from 'lucide-react';
import type { State, Session, Task } from './model';
import { quickSeconds, quickClock } from './quickTimer';
import './quick-timer.css';
import { QuickSessionEditor } from './QuickSessionEditor';

type Props = {
  timer: State['quickTimer'];
  now: number;
  todaySeconds: number;
  last: Session | undefined;
  tasks: Task[];
  editingId: string | null;
  focusBusy: boolean;
  onStart: (mode: 'stopwatch' | 'countdown', target: number) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onLabel: (
    id: string,
    subject: string,
    activity: string,
    note: string,
    taskId?: string,
  ) => boolean;
  onCloseEdit: () => void;
  compact?: boolean;
};
export function QuickStudyTimer({
  timer,
  now,
  todaySeconds,
  last,
  tasks,
  editingId,
  focusBusy,
  onStart,
  onPause,
  onResume,
  onFinish,
  onLabel,
  onCloseEdit,
  compact,
}: Props) {
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [minutes, setMinutes] = useState(25);
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  useEffect(() => {
    if (editingId && editingId === last?.id) {
      setShowEditor(true);
    }
  }, [editingId, last?.id]);
  const seconds = timer ? quickSeconds(timer, now) : 0;
  const remaining =
    timer?.mode === 'countdown' ? Math.max(0, timer.targetMinutes * 60 - seconds) : seconds;
  const reached = timer?.mode === 'countdown' && seconds >= timer.targetMinutes * 60;
  const running = Boolean(timer?.segmentStart);
  return (
    <section
      id={compact ? undefined : 'quick-timer-now'}
      className={
        'quick-timer panel ' +
        (timer ? 'quick-timer-active ' : '') +
        (compact ? 'quick-timer-compact' : '')
      }
      aria-label="바로 시작 타이머"
    >
      <header className="quick-timer-head">
        <div className="quick-timer-intro">
          <span className="eyebrow">START FIRST · RECORD LATER</span>
          <h2>
            <Timer size={20} aria-hidden="true" /> 먼저 시작하는 공부
          </h2>
          <p>과목과 목표는 나중에. 지금 바로 시작해.</p>
        </div>
        <span className="quick-timer-today">
          오늘 바로 시작 <strong>{quickClock(todaySeconds)}</strong>
        </span>
      </header>
      {!timer ? (
        <div className="quick-timer-idle">
          <div className="quick-timer-modes" role="group" aria-label="빠른 타이머 종류">
            <button
              type="button"
              aria-pressed={mode === 'stopwatch'}
              className={mode === 'stopwatch' ? 'selected' : ''}
              onClick={() => setMode('stopwatch')}
            >
              <Clock3 size={16} /> 스톱워치
            </button>
            <button
              type="button"
              aria-pressed={mode === 'countdown'}
              className={mode === 'countdown' ? 'selected' : ''}
              onClick={() => setMode('countdown')}
            >
              <Timer size={16} /> 심플 타이머
            </button>
          </div>
          {mode === 'countdown' && (
            <div className="quick-timer-lengths" aria-label="타이머 목표">
              {[10, 25, 45, 60].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={minutes === n ? 'selected' : ''}
                  onClick={() => setMinutes(n)}
                >
                  {n}분
                </button>
              ))}
              <label>
                직접{' '}
                <input
                  aria-label="간단 타이머 시간"
                  type="number"
                  min="1"
                  max="480"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />{' '}
                분
              </label>
            </div>
          )}
          <button
            className="quick-timer-begin"
            disabled={
              focusBusy ||
              (mode === 'countdown' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 480))
            }
            onClick={() => onStart(mode, mode === 'stopwatch' ? 480 : minutes)}
          >
            <Play size={20} fill="currentColor" /> 지금 시작
          </button>
          {focusBusy && (
            <p className="muted" role="status">
              기존 집중 타이머를 종료한 뒤 시작할 수 있어요.
            </p>
          )}
        </div>
      ) : (
        <div className="quick-timer-running">
          <div
            className="quick-timer-display"
            role="timer"
            aria-label={timer.mode === 'countdown' ? '남은 집중 시간' : '공부한 시간'}
          >
            {quickClock(remaining)}
          </div>
          <div className="quick-timer-under" role="status">
            {timer.mode === 'stopwatch'
              ? running
                ? '시간이 쌓이고 있어 · 무엇을 했는지는 나중에 적어도 돼'
                : '잠시 쉬는 중 · 기록은 그대로 남아 있어'
              : reached
                ? '목표에 도착했어! 원하면 더 공부하고 종료해도 돼'
                : running
                  ? '목표 ' + timer.targetMinutes + '분 · 끝난 뒤 기록하기'
                  : '일시정지 중'}
          </div>
          <div className="quick-timer-actions">
            <button type="button" className="secondary" onClick={running ? onPause : onResume}>
              {running ? (
                <>
                  <Pause size={17} /> 일시정지
                </>
              ) : (
                <>
                  <Play size={17} /> 이어하기
                </>
              )}
            </button>
            <button type="button" className="primary" onClick={onFinish}>
              <Check size={17} /> 끝내고 시간 저장
            </button>
          </div>
        </div>
      )}
      {!timer && last?.quick && (editingId === last.id || expanded || showEditor) && (
        <div className="quick-timer-after">
          <button
            type="button"
            className="quick-timer-review"
            aria-expanded={showEditor}
            onClick={() => setShowEditor((v) => !v)}
          >
            <Check size={17} /> 최근 기록 저장됨 · {quickClock(last.seconds)}{' '}
            <ChevronDown size={16} />
          </button>
          {showEditor && (
            <QuickSessionEditor
              key={last.id}
              session={last}
              tasks={tasks}
              onSave={onLabel}
              onClose={() => {
                setShowEditor(false);
                onCloseEdit();
              }}
            />
          )}
        </div>
      )}
      {!timer && last?.quick && !editingId && !expanded && !showEditor && (
        <button
          className="quick-timer-reopen"
          type="button"
          onClick={() => {
            setExpanded(true);
            setShowEditor(true);
          }}
        >
          <RotateCcw size={14} /> 최근 공부 기록 정리하기 (선택)
        </button>
      )}
    </section>
  );
}
