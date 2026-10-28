import type { State, Schedule } from './model';
import type { ConversationTurn } from './assistantConversation';
import { at, clock, dayKey, MIN, weekday } from './time';

export type AcademyGuidance = {
  answer: string;
  navigate: 'school' | 'tasks';
  focusMinutes?: number;
};

function findAcademies(state: State, day: string): Schedule[] {
  return state.schedules
    .filter(s => s.kind === 'academy' &&
      (s.date ? s.date === day : s.days.includes(weekday(day))) &&
      !s.excluded.includes(day))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function shouldContinue(q: string, history: ConversationTurn[]): boolean {
  if (!/^(?:응|맞아|그래|그거|숙제\s*때문|피곤|지쳤|힘들|못\s*했|시간\s*때문|잘\s*모르|모르겠|아니)/.test(q)) return false;
  const recent = history.slice(-4);
  const previousUser = [...recent].reverse().find(t => t.role === 'user')?.text ?? '';
  const previousAssistant = [...recent].reverse().find(t => t.role === 'assistant')?.text ?? '';
  return /학원|과외/.test(previousUser) ||
    (!!previousUser && /숙제|피곤|힘들|지각/.test(previousUser) && /학원|과외/.test(previousAssistant));
}

function outstanding(state: State, current?: Schedule) {
  const pending = state.tasks.filter(t => t.status !== 'done')
    .sort((a, b) =>
      (a.deadline?.date ?? (a.due ? dayKey(a.due) : '9999-12-31')).localeCompare(
        b.deadline?.date ?? (b.due ? dayKey(b.due) : '9999-12-31'),
      ));
  const direct = pending.filter(t => /학원|과외/.test(t.title) &&
    (!current || !current.subject || t.subject === current.subject ||
      t.title.includes(current.subject)));
  const related = current?.subject
    ? pending.filter(t => t.subject === current.subject && !direct.includes(t))
    : [];
  return { direct, related };
}

/** No travel estimates are invented; only schedule prep/travel/buffer entered by the learner. */
export function academyGuidance(
  question: string, state: State, now: number, history: ConversationTurn[] = [],
): AcademyGuidance | undefined {
  const q = question.trim();
  const explicit = /학원|과외/.test(q);
  const continuation = shouldContinue(q, history);
  if ((!explicit && !continuation) ||
    /(?:추가해|등록해|완료했|완료로|\d+\s*분으로|삭제해)/.test(q)) return undefined;

  const day = dayKey(now);
  const appointments = findAcademies(state, day);
  const next = appointments.find(s => at(day, s.end) > now);
  const { direct, related } = outstanding(state, next);
  const task = direct[0] || related[0];
  const taskLabel = direct.length
    ? '등록된 학원 관련 미완료 과제: ' + direct.slice(0, 2).map(t => t.title).join(', ') + '.'
    : related.length
      ? '같은 과목에 미완료 과제 ' + related.length + '개가 있어. 학원 숙제인지는 확인되지 않아. 첫 항목: ' + related[0].title + '.'
      : '학원 숙제로 등록된 미완료 항목은 확인되지 않아. 실제 숙제가 없는 뜻은 아니야.';

  if (!next) {
    const ended = appointments.length > 0;
    const status = ended
      ? '오늘 BKIT에 등록된 학원 일정은 이미 끝난 상태야.'
      : '오늘 BKIT에 등록된 학원 일정이 없어. 실제 수업 시간과 출발 시각은 확인이 필요해.';
    return {
      answer: status + ' ' + taskLabel +
        (/숙제|못\s*했|힘들|피곤/.test(q)
          ? ' 숙제 분량을 알려주면 부담을 줄여 한 단계씩 나눠 볼게.'
          : ' 수업 시간이 바뀌었다면 시간표를 먼저 확인해 보자.'),
      navigate: 'school',
    };
  }

  const classStart = at(day, next.start);
  const prepareAt = classStart - (next.prep + next.travel + next.buffer) * MIN;
  const departAt = classStart - (next.travel + next.buffer) * MIN;
  const untilPrep = Math.floor((prepareAt - now) / MIN);
  const untilDepart = Math.floor((departAt - now) / MIN);
  const timingKnown = next.prep + next.travel + next.buffer > 0;
  const status = next.title + ' 수업은 ' + next.start + '에 시작해. ' +
    (!timingKnown
      ? '준비·이동 시간이 모두 0분으로 등록돼 있어 출발 시각은 판단할 수 없어.'
      : untilDepart > 0
        ? '등록된 이동·여유 시간을 적용한 출발 기준은 ' + clock(departAt) + '이야.'
        : '등록된 출발 기준 시각 ' + clock(departAt) + '이 지났거나 지금이야. 실제 상황을 확인해 줘.');
  const preparation = timingKnown
    ? ' 준비 시작 기준은 ' + clock(prepareAt) + '이야.'
    : ' 실제 이동·준비 시간을 먼저 확인해 줘.';
  const details = status + preparation;

  if (/몇\s*시|언제|시간|지각|늦었|늦을|출발|준비/.test(q) &&
      !/숙제/.test(q)) {
    return { answer: details + ' 등록된 일정이 현실과 다르면 시간을 수정해 줘.', navigate: 'school' };
  }

  if (/피곤|지쳤|힘들|졸려|잠/.test(q) && !/숙제/.test(q)) {
    return { answer: details + ' 피곤하다면 억지로 학습량을 늘리지 말고 물 마시고 준비물부터 챙기자. ' +
      (timingKnown && untilPrep >= 15 ? '준비 전까지 10분 정도 휴식하는 건 어때?' : '준비 시간을 확인하고 여유가 있으면 짧게 쉬자.') +
      ' 수업 참석 여부는 네 상황을 고려해 직접 결정하자.', navigate: 'school' };
  }

  if (/숙제|못\s*했/.test(q) || continuation) {
    const isHomeworkReason = /숙제|못\s*했/.test(q);
    if (!timingKnown) {
      return { answer: details + ' ' + taskLabel + ' 출발 준비 시간을 먼저 확인해야 해. 숙제를 어느 정도 못 했는지 말해주면 분량을 나눠 보자.', navigate: 'school' };
    }
    if (untilPrep <= 5) {
      return { answer: details + ' 준비할 시간이 거의 없으니 지금은 숙제를 억지로 끝내기보다 준비물을 챙기는 게 우선이야. ' +
        taskLabel + ' 숙제 상황을 선생님께 사실대로 이야기할 준비를 하자.', navigate: 'school' };
    }
    if (task) {
      const limit = Math.min(10, Math.max(5, untilPrep - 5));
      return {
        answer: details + ' ' + taskLabel +
          ' 지금은 ' + limit + '분만 ' + task.title +
          '의 첫 한 문제/한 단락부터 시작해 보자. 기록된 남은 예상 시간은 ' +
          task.remaining + '분이고, 이 시간만으로 다 끝낸다고 보장할 수는 없어.' +
          (isHomeworkReason ? ' 준비 시각이 되면 멈추고 출발 준비를 하자.' : ''),
        navigate: 'tasks',
        focusMinutes: limit,
      };
    }
    return {
      answer: details + ' ' + taskLabel +
        ' 무슨 과목이고 얼마나 남았는지 말해줘. 그동안 5분만 가장 쉬운 부분부터 시작해도 좋아. 준비 시각은 넘기지 말자.',
      navigate: 'tasks',
      focusMinutes: untilPrep >= 10 ? 5 : undefined,
    };
  }

  return {
    answer: details + ' ' + taskLabel + ' 지금 가장 걸리는 게 숙제, 체력, 아니면 학원 자체에 대한 고민이야?',
    navigate: 'school',
  };
}
