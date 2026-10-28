import { describe, expect, it } from 'vitest';
import { newState, type Schedule, type Task } from '../src/model';
import { academyGuidance } from '../src/academyGuidance';
import { localAssistant } from '../src/assistantLogic';

const WEDNESDAY = Date.parse('2026-10-28T17:00:00+09:00');
function academy(patch: Partial<Schedule> = {}): Schedule {
  return {
    id: 'school-chem', title: '화학 학원', subject: '화학', kind: 'academy',
    days: [3], start: '19:00', end: '21:00',
    prep: 20, travel: 30, buffer: 10, materials: '',
    date: null, excluded: [], ...patch,
  };
}
function assignment(patch: Partial<Task> = {}): Task {
  return {
    id: 'homework-1', subject: '화학', title: '화학 학원 숙제',
    kind: '숙제', due: null, priority: 2, minutes: 35, remaining: 35,
    status: 'todo', submitted: false, optional: false, notes: '', link: '', ...patch,
  };
}
function data(schedule = academy(), tasks: Task[] = [assignment()]) {
  const s = newState();
  s.schedules = [schedule];
  s.tasks = tasks;
  return s;
}
describe('BUILD 10 real-world academy guidance', () => {
  it('uses KST for school and academy planning and respects recorded prep/travel/buffer', () => {
    const answer = academyGuidance('오늘 학원 언제 가?', data(), WEDNESDAY)!;
    expect(answer.answer).toContain('19:00');
    expect(answer.answer).toContain('18:20');
    expect(answer.answer).toContain('18:00');
    expect(answer.navigate).toBe('school');
    const afterUtcDayShift = academyGuidance(
      '학원 언제?', data(academy({ days: [4] })),
      Date.parse('2026-10-29T00:10:00+09:00'),
    )!;
    expect(afterUtcDayShift.answer).toContain('오늘 BKIT에 등록된 학원');
    expect(afterUtcDayShift.answer).not.toContain('일정이 없어');
  });
  it('moves from dilemma to homework-based feasible micro-action, not repeated questioning', () => {
    const s = data();
    const first = localAssistant('학원 가기 싫어', s, WEDNESDAY);
    expect(first.answer).toContain('가장 걸리는 게');
    const followUp = localAssistant('숙제 때문', s, WEDNESDAY, [
      { role: 'user', text: '학원 가기 싫어' },
      { role: 'assistant', text: first.answer },
    ]);
    expect(followUp.answer).toContain('화학 학원 숙제');
    expect(followUp.answer).toContain('10분만');
    expect(followUp.focusMinutes).toBe(10);
    expect(s.tasks[0].status).toBe('todo');
    expect(s.active).toBeNull();
  });
  it('never offers an unfeasible focus timer once prep starts', () => {
    const nearPrep = academyGuidance(
      '학원 숙제 못했어', data(), Date.parse('2026-10-28T17:58:00+09:00'),
    )!;
    expect(nearPrep.focusMinutes).toBeUndefined();
    expect(nearPrep.answer).toContain('준비');
    const late = academyGuidance(
      '학원 지각이야', data(), Date.parse('2026-10-28T18:25:00+09:00'),
    )!;
    expect(late.focusMinutes).toBeUndefined();
    expect(late.answer).toContain('지났거나');
  });
  it('does not invent travel plans when timings are all zero', () => {
    const reply = academyGuidance(
      '학원 숙제 못했어', data(academy({ prep: 0, travel: 0, buffer: 0 })), WEDNESDAY,
    )!;
    expect(reply.answer).toContain('출발 시각은 판단할 수 없어');
    expect(reply.focusMinutes).toBeUndefined();
  });
  it('does not infer academy homework from every same-subject task', () => {
    const reply = academyGuidance(
      '학원 숙제 못했어', data(academy(), [assignment({ title: '화학 수행평가' })]), WEDNESDAY,
    )!;
    expect(reply.answer).toContain('학원 숙제인지는 확인되지 않아');
  });
  it('does not fabricate a class or open an unrelated thread from the initial greeting', () => {
    const s = newState();
    expect(academyGuidance('학원 언제 가?', s, WEDNESDAY)!.answer).toContain('일정이 없어');
    expect(academyGuidance('응', s, WEDNESDAY, [
      { role: 'assistant', text: '학원 이야기든 공부 고민이든 편하게 말해줘.' },
    ])).toBeUndefined();
    expect(academyGuidance('수학 과제 도움', s, WEDNESDAY)).toBeUndefined();
  });
  it('keeps task changes behind the original confirmation action', () => {
    const s = newState();
    const add = localAssistant('내일 학원 숙제 추가해줘', s, WEDNESDAY);
    expect(add.action?.kind).toBe('add');
    expect(s.tasks).toHaveLength(0);
  });
});
