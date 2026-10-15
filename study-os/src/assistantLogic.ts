import type { State, Task } from './model';
import { uid } from './model';
import { parseCapture, captureDeadline, formatTaskDeadline } from './capture';
import { dayKey } from './time';

export type AssistantAction =
  | { kind: 'add'; task: Task }
  | { kind: 'complete'; taskId: string; title: string }
  | { kind: 'minutes'; taskId: string; title: string; minutes: number };
export type AssistantReply = { answer: string; action?: AssistantAction; navigate?: 'school' | 'tasks' | 'progress' };

function rankedPending(state: State): Task[] {
  return state.tasks.filter(t => t.status !== 'done').sort((a, b) => {
    const ad = a.deadline?.date || (a.due ? dayKey(a.due) : '9999-12-31');
    const bd = b.deadline?.date || (b.due ? dayKey(b.due) : '9999-12-31');
    return ad.localeCompare(bd) || b.priority - a.priority;
  });
}
export function assistantContext(state: State, now = Date.now()) {
  return {
    today: dayKey(now),
    goal: state.settings.goal,
    tasks: rankedPending(state).slice(0, 40).map(t => ({
      subject: t.subject, title: t.title,
      due: t.deadline?.date || (t.due ? dayKey(t.due) : null),
      remaining: t.remaining, priority: t.priority,
    })),
    schedules: state.schedules.slice(0, 40).map(s => ({
      title: s.title, subject: s.subject, days: s.days, start: s.start, end: s.end,
    })),
    sessions: state.sessions.slice(-15).map(s => ({
      subject: s.subject, problems: s.problems, rating: s.rating, seconds: s.seconds,
    })),
  };
}
export function localAssistant(question: string, state: State, now = Date.now()): AssistantReply {
  const q = question.trim().slice(0, 1000);
  const pending = rankedPending(state);
  if (!q) return { answer: '무엇을 도와줄까? 과제 추가, 완료 처리, 시간 변경, 오늘 우선순위, 복습 피드백을 물어봐.' };

  if (/시간표|일정/.test(q) && /추가|만들|등록|입력/.test(q)) {
    return { answer: '고정 일정은 요일·시작·종료 시간을 확인해야 해. 시간표 입력 화면으로 이동해서 정확하게 등록하자.', navigate: 'school' };
  }

  if (/완료|끝냈|다\s*했/.test(q) && /처리|표시|해줘|했어|바꿔|완료/.test(q)) {
    const matches = pending.filter(t => q.includes(t.title) || (t.title.length >= 3 && q.includes(t.title.replace(/\s+/g, ''))));
    if (matches.length === 1) {
      const t = matches[0];
      return {
        answer: `'${t.title}'을(를) 완료로 표시할까? 제출 여부는 별도로 유지할게.`,
        action: { kind: 'complete', taskId: t.id, title: t.title },
      };
    }
    if (matches.length > 1) return { answer: '일치하는 과제가 여러 개야. 정확한 과제 제목을 포함해서 다시 말해줘.', navigate: 'tasks' };
  }

  if (/분(?:으로)?\s*(?:변경|수정|바꿔)|분\s*잡아|예상\s*시간/.test(q)) {
    const minutes = q.match(/(\d{1,3})\s*분/);
    const matches = pending.filter(t => q.includes(t.title));
    if (minutes && matches.length === 1 && +minutes[1] >= 1 && +minutes[1] <= 480) {
      const t = matches[0];
      return {
        answer: `'${t.title}'의 예상 시간을 ${minutes[1]}분으로 변경할까? 남은 시간은 현재보다 커지지 않도록 조정할게.`,
        action: { kind: 'minutes', taskId: t.id, title: t.title, minutes: +minutes[1] },
      };
    }
    if (/바꿔|수정|변경/.test(q)) return { answer: '수정할 과제의 정확한 제목과 시간을 같이 써줘. 예: 수학 학습지 40분으로 바꿔줘.', navigate: 'tasks' };
  }

  if (/(?:등록|추가|기록|넣어|만들어)/.test(q) &&
      /숙제|학습지|수행평가|시험공부|과제|문제|제출/.test(q) && !/삭제|취소/.test(q)) {
    const title = q.replace(/^(?:과제\s*)?(?:하나\s*)?/, '')
      .replace(/(?:을|를)?\s*(?:등록|추가|기록|넣어|만들어)(?:해\s*줘|줘|주세요|해)?[.!?]*\s*$/, '').trim();
    if (title.length < 3 || title.length > 200) return { answer: '과제 이름을 조금 더 명확하게 적어줘. 예: 내일 수학 학습지 3장 추가해줘.' };
    const p = parseCapture(title, now);
    const t: Task = {
      id: uid(), title, subject: p.subject, kind: p.kind, ...captureDeadline(p),
      quantity: p.quantityUnit && p.quantityTotal ? {
        unit: p.quantityUnit, total: p.quantityTotal, remaining: p.quantityTotal,
      } : undefined,
      estimate: { minMinutes: p.minutes, maxMinutes: p.minutes, source: p.estimateSource },
      minutes: p.minutes, remaining: p.minutes,
      priority: 2, status: 'todo', submitted: false, optional: false, notes: '', link: '',
    };
    return {
      answer: `과제 초안을 만들었어. '${t.title}' · ${t.subject} · ${formatTaskDeadline(t)} · ${t.minutes}분. 내용 확인 후 등록을 눌러줘.`,
      action: { kind: 'add', task: t },
    };
  }

  if (/시간표|일정/.test(q)) {
    const lines = state.schedules.slice(0, 6).map(s =>
      `${s.title} (${s.start}~${s.end}, ${s.days.map(d => '일월화수목금토'[d]).join('·')}요일)`);
    return { answer: lines.length ? '등록된 주요 일정:\n' + lines.join('\n') + '\n정확한 날짜별 충돌은 시간표 화면에서 확인해.' : '아직 고정 일정이 없어. 시간표에서 학교·학원 일정을 입력할 수 있어.', navigate: 'school' };
  }

  if (/복습|피드백|진도|공부\s*기록|어려|틀린/.test(q)) {
    const weak = [...state.sessions].reverse().find(s => s.rating === '어려움');
    const latest = state.sessions.at(-1);
    const today = dayKey(now);
    const reviews = state.sessions.filter(s => s.reviewDate && s.reviewDate <= today && !state.reviewsDone.includes(s.id));
    return {
      answer: `기록된 학습 세션은 ${state.sessions.length}개, 복습 예정은 ${reviews.length}개야.` +
        (weak ? ` 최근 어렵다고 기록한 과목은 ${weak.subject}. 해당 개념을 설명 없이 떠올리고 예제 한 문제부터 풀어봐.` :
          latest ? ` 마지막 세션은 ${latest.subject}이고 문제 ${latest.problems}개를 기록했어.` :
            ' 아직 완료한 학습 세션이 없어서 실력 변화는 판단할 수 없어.') +
        ' 공부 시간만으로 이해도를 단정하지는 않을게.',
      navigate: 'progress',
    };
  }

  if (/계획|오늘|우선|뭐부터|무엇부터|할\s*일|숙제|과제/.test(q)) {
    if (!pending.length) return { answer: '현재 미완료 과제가 없어. 새 과제를 등록하거나 시간표를 점검해 봐.', navigate: 'tasks' };
    const lines = pending.slice(0, 3).map((t, i) =>
      `${i + 1}. ${t.subject} · ${t.title} (${t.remaining}분, ${formatTaskDeadline(t)})`);
    return {
      answer: `미완료 과제 ${pending.length}개 중 현재 마감과 우선순위로 정렬한 첫 3개야:\n${lines.join('\n')}\n먼저 1번을 5분만 시작해 봐. 마감 미확인 과제는 실제 날짜를 확인해줘.`,
      navigate: 'tasks',
    };
  }
  return {
    answer: '지금은 오프라인 비서야. 과제 등록·완료·시간 변경, 일정 확인, 오늘 계획, 복습 피드백을 도와줄 수 있어. 자유로운 질문과 심화 상담은 AI 서버 연결 후 지원할게. 예: "내일 화학 학습지 3장 추가해줘", "오늘 뭐부터 해?"',
  };
}
