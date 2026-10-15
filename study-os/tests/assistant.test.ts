import { describe, expect, it } from 'vitest';
import { newState, type Task } from '../src/model';
import { localAssistant, assistantContext } from '../src/assistantLogic';
const base = newState();
const task: Task = {
  id: 'test-task', subject: '수학', title: '수학 학습지', kind: '숙제',
  due: null, minutes: 25, remaining: 25, priority: 2, status: 'todo',
  submitted: false, optional: false, notes: '', link: '',
};
describe('offline multifunction assistant', () => {
  it('drafts tasks without mutating local study state', () => {
    const s = newState();
    const reply = localAssistant('내일 화학 학습지 3장 추가해줘', s, Date.parse('2026-10-15T05:00:00Z'));
    expect(reply.action?.kind).toBe('add');
    expect(reply.answer).toContain('화학');
    expect(reply.answer).toContain('2026-10-16');
    if (reply.action?.kind === 'add') {
      expect(reply.action.task.subject).toBe('화학');
      expect(reply.action.task.deadline?.date).toBe('2026-10-16');
      expect(reply.action.task.quantity?.total).toBe(3);
    }
    expect(s.tasks).toHaveLength(0);
  });
  it('requires explicit confirmation for completion and estimate changes', () => {
    const s = { ...base, tasks: [task] };
    expect(localAssistant('수학 학습지 완료했어',s).action).toEqual({
      kind: 'complete', taskId: 'test-task', title: '수학 학습지',
    });
    expect(localAssistant('수학 학습지 40분으로 바꿔줘',s).action).toEqual({
      kind: 'minutes', taskId: 'test-task', title: '수학 학습지', minutes: 40,
    });
    expect(s.tasks[0].status).toBe('todo');
    expect(s.tasks[0].minutes).toBe(25);
  });
  it('does not invent due dates or transmit private notes in AI context', () => {
    const s = { ...base, tasks: [{ ...task, notes: 'private info', link: 'https://example.com' }] };
    expect(localAssistant('오늘 뭐부터 해?',s).answer).toContain('마감 확인 필요');
    expect(JSON.stringify(assistantContext(s))).not.toContain('private info');
    expect(JSON.stringify(assistantContext(s))).not.toContain('https://example.com');
  });
  it('does not delete records', () => {
    expect(localAssistant('수학 학습지 삭제해줘', { ...base, tasks: [task] }).action).toBeUndefined();
  });
});
