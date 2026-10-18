import { Moon, ArrowRight } from 'lucide-react';
import type { SleepController } from './useSleepGuard';
const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
export function SleepSummary({ guard, onOpen }: { guard: SleepController; onOpen: () => void }) {
  const { state, status } = guard;
  return (
    <button type="button" className="sleep-summary" onClick={onOpen}>
      <Moon size={20} aria-hidden="true" />
      <span>
        <strong>Sleep Guard</strong>
        <small>
          {!state.enabled
            ? '내일의 집중을 위한 수면 루틴'
            : status.skipped
              ? '오늘은 건너뛰는 중'
              : status.paused
                ? '일시 중지 중'
                : `${timeLabel(status.bed)} 취침 · ${timeLabel(status.wake)} 기상${status.phase === 'prepare' ? ' · 준비할 시간' : status.phase === 'night' ? ' · 야간 시간' : ''}`}
        </small>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}
