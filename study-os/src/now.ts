import { MIN } from './time';

// Display-layer guard only. App.start() repeats the authoritative fixed-schedule check.
export function canStartSprint(
  now: number,
  occupied: boolean,
  nextFixedStart: number | null,
  minutes = 5,
): boolean {
  if (!Number.isFinite(now) || !Number.isFinite(minutes) || minutes <= 0 || occupied) return false;
  return nextFixedStart === null || nextFixedStart - now >= minutes * MIN;
}

import type { Task, State } from './model';
import { dayKey } from './time';

/** An actionable instruction grounded only in the learner's actual task. */
export function firstLearningAction(task?: Task, tired = false): string {
  if (!task) return '공부할 자료에서 질문 하나를 골라, 기억나는 답을 먼저 써보기';
  const q = task.quantity;
  const prefix = task.title.slice(0, 120);
  if (q?.remaining === 0)
    return `${prefix} · 남은 분량이 0으로 기록되어 있어요. 과제에서 학습 완료와 제출 여부를 확인해요.`;
  if (q?.unit === 'problems')
    return `${prefix} · 남은 ${q.remaining}문제 중 하나를 골라 ${tired ? '첫 식 한 줄만' : '풀이 또는 답을'} 써보기`;
  if (q?.unit === 'passages') return /영어/.test(task.subject)
    ? `${prefix} · 지문 하나의 첫 문장을 가리고 직접 해석해 보기`
    : `${prefix} · 지문 하나의 첫 문단을 읽고 핵심 내용을 한 줄로 적기`;
  if (q?.unit === 'pages') return `${prefix} · 남은 ${q.remaining}쪽에서 핵심 질문 하나에 답하기`;
  if (/물리/.test(task.subject)) return `${prefix} · 주어진 물리량과 단위를 적고 적용할 법칙 하나 고르기`;
  if (/화학/.test(task.subject)) return `${prefix} · 조건과 단위를 확인하고 필요한 개념 하나 적기`;
  if (/경제/.test(task.subject)) return `${prefix} · 핵심 개념을 내 말로 정의하고 근거 하나 적기`;
  if (/국어/.test(task.subject)) return `${prefix} · 첫 문단을 읽고 핵심 내용과 근거 문장 찾기`;
  if (/영어/.test(task.subject)) return `${prefix} · 첫 문장을 읽고 뜻을 가린 채 떠올려 보기`;
  if (/오답/.test(task.title)) return `${prefix} · 해설을 가리고 오답 하나 다시 풀기`;
  return `${prefix} · ${tired ? '질문 하나의 첫 단계만' : '첫 질문에 내 답을'} 적어보기`;
}

export function rankInstantTasks(
  tasks: Task[],
  now: number,
  availableMinutes: number,
  tired = false,
): Task[] {
  const urgency = (t: Task) => {
    if (!t.due) return Infinity;
    // A date-only deadline is a calendar fact, not a confirmed clock time.
    return t.deadline?.precision === 'date-only'
      ? Date.parse(t.deadline.date + 'T00:00:00+09:00')
      : Date.parse(t.due);
  };
  return tasks
    .filter((t) => t.status !== 'done' && t.quantity?.remaining !== 0)
    .sort(
      (a, b) =>
        urgency(a) - urgency(b) ||
        b.priority - a.priority ||
        Number(b.remaining <= availableMinutes) - Number(a.remaining <= availableMinutes) ||
        Number(b.status === 'doing') - Number(a.status === 'doing') ||
        (tired ? a.remaining - b.remaining : 0) ||
        a.id.localeCompare(b.id),
    );
}

export function recommendationReason(task: Task, now: number): string {
  const today = dayKey(now);
  const dueDay = task.deadline?.date ?? (task.due ? dayKey(task.due) : null);
  if (dueDay && dueDay < today) return '마감일이 지났어요. 제출 가능 여부도 확인해 주세요.';
  if (dueDay === today) return '오늘 마감인 학습을 먼저 제안했어요.';
  if (dueDay) return `${dueDay} 마감과 중요도를 먼저 고려했어요.`;
  return task.status === 'doing'
    ? '이미 시작한 과제의 흐름을 이어가요.'
    : '확인된 중요도와 시작하기 쉬운 분량을 고려했어요. 마감은 확인이 필요해요.';
}

export function appendLearningEvent(
  s: State,
  event: NonNullable<State['learningEvents']>[number],
): State {
  const events = s.learningEvents ?? [];
  if (
    events.length >= 5000 ||
    events.some(
      (e) =>
        e.id === event.id ||
        (event.type === 'FirstLearningAttempt' &&
          e.type === event.type &&
          e.sessionId === event.sessionId),
    )
  )
    return s;
  return { ...s, learningEvents: [...events, event] };
}
