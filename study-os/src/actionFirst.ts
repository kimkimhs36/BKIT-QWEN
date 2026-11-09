/**
 * A single truthful next action at the top of the study home.
 * Uses existing schedules and real tasks. No inferred submission or sleep tracking.
 */
export type HomeNextAction = {
  kind: 'sleep' | 'resume' | 'study' | 'blocked';
  title: string;
  detail: string;
  label: string;
  minutes: 5 | 10 | null;
};

type ScheduleEdge = { start: number; end?: number };
type Current = { kind: string; title: string };

export function chooseHomeNextAction(
  now: number,
  options: {
    busy: boolean;
    current?: Current;
    bedtime?: ScheduleEdge;
    next?: ScheduleEdge;
    unavailable: string;
    task?: { subject: string; title: string };
  },
): HomeNextAction {
  const { busy, current, bedtime, next, unavailable, task } = options;
  const isSleepTime =
    current?.kind === 'sleep' ||
    Boolean(
      bedtime &&
        bedtime.start - 60 * 60_000 <= now &&
        now < (bedtime.end ?? bedtime.start + 12 * 60 * 60_000),
    );

  if (isSleepTime) {
    return {
      kind: 'sleep',
      title: '오늘은 여기까지. 이제 취침 준비',
      detail: busy
        ? '진행 중인 공부는 집중 화면에서 직접 정리하고, 수면 루틴을 시작해요.'
        : '씻기 → 기기 내려놓기 → 눕기. 실제 취침은 확인한 뒤 기록해요.',
      label: busy ? '진행 중인 공부 마무리' : '취침 루틴 열기',
      minutes: null,
    };
  }

  if (busy)
    return {
      kind: 'resume',
      title: '이미 시작한 공부부터 이어가자',
      detail: '타이머를 새로 만들지 않고 이어서 공부해요.',
      label: '공부 이어가기',
      minutes: null,
    };

  if (unavailable)
    return {
      kind: 'blocked',
      title: '지금은 고정 일정부터 지킬 시간',
      detail: unavailable + ' 남은 공부는 일정에 맞게 다시 배치할 수 있어요.',
      label: '남은 계획 재조정',
      minutes: null,
    };

  // Never promise a five-minute session when a confirmed appointment begins sooner.
  // Keep the user's task untouched; guide them to the existing plan recovery flow.
  if (next && next.start > now && next.start - now < 5 * 60_000) {
    return {
      kind: 'blocked',
      title: '곧 다음 일정이 시작돼요',
      detail: '5분도 남지 않아 새 집중을 시작하지 않아요. 등록된 과제는 그대로 유지돼요.',
      label: '남은 계획 재조정',
      minutes: null,
    };
  }

  const minutes: 5 | 10 = next && next.start > now && next.start - now < 10 * 60_000 ? 5 : 10;
  return {
    kind: 'study',
    title: task ? task.subject + ' · ' + task.title : '질문 하나부터 바로 시작',
    detail: task
      ? '자료에서 첫 문제를 해설 없이 시작해요. 다음 행동은 기록된 과제에서 골랐어요.'
      : '아무것도 등록하지 않아도 돼요. 자료 한 장을 펴고 첫 질문에 답해 보세요.',
    label: minutes + '분 집중 시작',
    minutes,
  };
}

/** Route the named priority into a linked session instead of an unlinked timer. */
export type HomeStudyStart =
  | { kind: 'task'; taskId: string; minutes: 5 | 10 }
  | { kind: 'quick'; minutes: 5 | 10 }
  | null;

export function resolveHomeStudyStart(action: HomeNextAction, taskId?: string): HomeStudyStart {
  if (action.kind !== 'study' || action.minutes === null) return null;
  // Empty or whitespace-only identifiers must never create an orphan task session.
  // Fall back to the existing quick-session flow without altering the user's task list.
  const validTaskId = taskId?.trim();
  return validTaskId
    ? { kind: 'task', taskId: validTaskId, minutes: action.minutes }
    : { kind: 'quick', minutes: action.minutes };
}
