import { describe, expect, it } from 'vitest';
import { localAssistant } from '../src/assistantLogic';
import { newState, type Task } from '../src/model';

const now = new Date('2026-11-04T12:00:00+09:00').getTime();

function task(id: string, changes: Partial<Task> = {}): Task {
  return {
    id, subject: '역학과 에너지', title: '열기관 수행평가',
    kind: '수행평가', due: null, priority: 2, minutes: 25,
    remaining: 25, status: 'done', submitted: false,
    submissionRequired: true, optional: false, notes: '', link: '',
    ...changes,
  };
}

describe('LIFE OS assistant prioritizes submissions without guessing', () => {
  it('does not hide finished but unsubmitted assessments when no study tasks remain', () => {
    const state = newState();
    state.tasks = [task('completed')];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('제출 확인 필요');
    expect(reply.answer).toContain('열기관 수행평가');
    expect(reply.answer).not.toContain('현재 미완료 과제가 없어');
    expect(reply.navigate).toBe('tasks');
  });

  it('retains submission handoff alongside ordinary unfinished homework', () => {
    const state = newState();
    state.tasks = [
      task('completed'),
      task('math', { subject: '미적분Ⅰ', title: '마플 시너지 3문제',
        kind: '숙제', status: 'todo', submissionRequired: false }),
    ];
    const reply = localAssistant('오늘 할 일 알려줘', state, now);
    expect(reply.answer).toContain('마플 시너지 3문제');
    expect(reply.answer).toContain('제출 확인 필요');
    expect(reply.answer).toContain('열기관 수행평가');
  });

  it('does not flag already submitted or unrelated finished tasks', () => {
    const state = newState();
    state.tasks = [
      task('submitted', { submitted: true }),
      task('personal', { kind: '개인 일정', title: '휴식', submissionRequired: false }),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).not.toContain('제출 확인 필요');
    expect(reply.answer).not.toContain('열기관 수행평가');
    expect(reply.answer).not.toContain('휴식');
  });

  it('reports unknown deadlines as unknown rather than claiming a time', () => {
    const state = newState();
    state.tasks = [task('undated', { status: 'todo', title: '영어 추가 수행' })];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('마감 미확인 수행·제출 과제 1개');
    expect(reply.answer).toContain('마감 확인 필요');
  });
});
