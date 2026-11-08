import { describe, expect, it } from 'vitest';
import { localAssistant, needsLocalSubmissionPlan } from '../src/assistantLogic';
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
  it('uses Korea weekday for academy counselling even when browser timezone is UTC', () => {
    const state = newState();
    // Saturday 00:30 KST is still Friday 15:30 UTC.
    const saturdayKst = new Date('2026-11-07T00:30:00+09:00').getTime();
    state.schedules = [{
      id: 'academy-saturday', title: '토요일 물리 학원', subject: '물리',
      kind: 'academy', days: [6], start: '10:00', end: '12:00',
      prep: 0, travel: 0, buffer: 0, materials: '', date: null, excluded: [],
    }];
    const reply = localAssistant('오늘 학원 몇 시야?', state, saturdayKst);
    expect(reply.answer).toContain('토요일 물리 학원 10:00~12:00');
    expect(reply.answer).not.toContain('오늘 등록된 학원 일정은 확인되지 않아');
  });

  it('prevents repeated chat commands from duplicating active homework', () => {
    const state = newState();
    state.tasks = [task('existing', {
      title: '수학 학습지 3장', kind: '숙제', status: 'todo', submissionRequired: false,
    })];
    const reply = localAssistant('수학  학습지 3장 추가해줘', state, now);
    expect(reply.action).toBeUndefined();
    expect(reply.answer).toContain('중복 등록하지 않았어');
    expect(reply.navigate).toBe('tasks');
    expect(state.tasks).toHaveLength(1);
  });

  it('detects whitespace-only variants of active homework titles', () => {
    const state = newState();
    state.tasks = [task('active', { title: '수학 학습지 3장', status: 'todo', kind: '숙제' })];
    const reply = localAssistant('수학  학습지 3장 추가해줘', state, now);
    expect(reply.action).toBeUndefined();
    expect(reply.answer).toContain('중복 등록하지 않았어');
  });

  it('allows a recurring unfinished assignment with a different confirmed deadline', () => {
    const state = newState();
    state.tasks = [task('active', {
      title: '내일 수학 학습지 3장', status: 'todo', kind: '숙제',
      deadline: { date: '2026-11-05', precision: 'date-only', provenance: 'user-confirmed' },
    })];
    const reply = localAssistant('내일 수학 학습지 3장 추가해줘', state, new Date('2026-11-11T12:00:00+09:00').getTime());
    expect(reply.action?.kind).toBe('add');
    expect(state.tasks).toHaveLength(1);
  });

  it('allows new homework when an older same-title task is finished', () => {
    const state = newState();
    state.tasks = [task('old', {
      title: '수학 학습지 3장', kind: '숙제', status: 'done', submissionRequired: false,
    })];
    const reply = localAssistant('수학 학습지 3장 추가해줘', state, now);
    expect(reply.action?.kind).toBe('add');
    expect(state.tasks).toHaveLength(1);
  });

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
  it('limits the combined list of study actions and submission checks to three', () => {
    const state = newState();
    state.tasks = [
      task('submit1', { title: '화학 수행' }),
      task('submit2', { title: '물리 수행' }),
      task('study1', { title: '수학 복습', kind: '숙제', status: 'todo', submissionRequired: false }),
      task('study2', { title: '국어 독서', kind: '숙제', status: 'todo', submissionRequired: false }),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('화학 수행');
    expect(reply.answer).toContain('물리 수행');
    expect(reply.answer).toContain('수학 복습');
    expect(reply.answer).not.toContain('국어 독서');
  });

  it('prioritizes three submission checks over additional study suggestions', () => {
    const state = newState();
    state.tasks = [
      task('submit1', { title: '수행 A' }),
      task('submit2', { title: '수행 B' }),
      task('submit3', { title: '수행 C' }),
      task('study', { title: '수학 숙제', kind: '숙제', status: 'todo', submissionRequired: false }),
    ];
    const reply = localAssistant('오늘 할 일', state, now);
    expect(reply.answer).toContain('제출 확인 필요 (전체 3건, 우선 3건)');
    expect(reply.answer).toContain('미완료 공부 과제도 1개');
    expect(reply.answer).not.toContain('1. 역학과 에너지 · 수학 숙제');
  });

  it('reveals the real submission backlog without exceeding three immediate actions', () => {
    const state = newState();
    state.tasks = [
      task('s1', { title: '수행 A' }),
      task('s2', { title: '수행 B' }),
      task('s3', { title: '수행 C' }),
      task('s4', { title: '수행 D' }),
      task('s5', { title: '수행 E' }),
      task('study', { title: '영어 단어', kind: '숙제', status: 'todo', submissionRequired: false }),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('제출 확인 필요 (전체 5건, 우선 3건)');
    expect(reply.answer).toContain('추가로 2건이 남아 있어');
    expect(reply.answer).not.toContain('수행 D');
    expect(reply.answer).not.toContain('수행 E');
    expect(reply.answer).toContain('과제 화면에서 확인해');
  });

  it('keeps TODAY submission reminders on device even when AI mode is selected', () => {
    const state = newState();
    state.tasks = [task('awaiting')];
    expect(needsLocalSubmissionPlan('오늘 뭐부터 공부해?', state, now)).toBe(true);
    expect(needsLocalSubmissionPlan('제출 확인해줘', state, now)).toBe(true);
    expect(needsLocalSubmissionPlan('역학 개념 설명해줘', state, now)).toBe(false);
    state.tasks[0].submitted = true;
    expect(needsLocalSubmissionPlan('오늘 뭐부터 공부해?', state, now)).toBe(false);
  });

  it('keeps urgent unfinished assessments on device in AI mode without guessing submission', () => {
    const state = newState();
    state.tasks = [task('due-today', {
      status: 'todo', title: '오늘 제출 수행',
      deadline: { date: '2026-11-04', precision: 'date-only', provenance: 'user-confirmed' },
    })];
    expect(needsLocalSubmissionPlan('오늘 뭐부터 해?', state, now)).toBe(true);
    expect(localAssistant('오늘 뭐부터 해?', state, now).answer).toContain('오늘 제출 수행');
    expect(needsLocalSubmissionPlan('화학 개념 설명해줘', state, now)).toBe(false);
    state.tasks[0].deadline = { date: '2026-11-05', precision: 'date-only', provenance: 'user-confirmed' };
    expect(needsLocalSubmissionPlan('오늘 할 일', state, now)).toBe(true);
    state.tasks[0].deadline = { date: '2026-11-10', precision: 'date-only', provenance: 'user-confirmed' };
    expect(needsLocalSubmissionPlan('오늘 할 일', state, now)).toBe(false);
    state.tasks[0].submitted = true;
    expect(needsLocalSubmissionPlan('오늘 할 일', state, now)).toBe(false);
  });

  it('does not route unrelated AI questions or unfinished-only tasks through the submission guard', () => {
    const state = newState();
    state.tasks = [task('unfinished', { status: 'todo' })];
    expect(needsLocalSubmissionPlan('오늘 할 일', state, now)).toBe(false);
    expect(needsLocalSubmissionPlan('화학 반응식 알려줘', state, now)).toBe(false);
  });

  it('honors confirmed date-only deadlines even when legacy due is absent', () => {
    const state = newState();
    state.tasks = [task('dated', {
      title: '오늘 제출할 수행평가', status: 'todo',
      due: null,
      deadline: { date: '2026-11-04', precision: 'date-only', provenance: 'user-confirmed' },
    })];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('오늘 제출할 수행평가');
    expect(reply.answer).not.toContain('마감 미확인 수행·제출 과제 1개');
  });

  it('shows urgency on submission handoffs without inventing a due time', () => {
    const state = newState();
    state.tasks = [
      task('overdue', { title: '지난 수행', deadline: { date: '2026-11-03', precision: 'date-only', provenance: 'user-confirmed' } }),
      task('today', { title: '오늘 수행', deadline: { date: '2026-11-04', precision: 'date-only', provenance: 'user-confirmed' } }),
      task('unknown', { title: '미확인 수행' }),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('지난 수행 (마감 지남 · 날짜 재확인)');
    expect(reply.answer).toContain('오늘 수행 (오늘 마감)');
    expect(reply.answer).toContain('미확인 수행 (마감 확인 필요)');
    expect(reply.answer).not.toContain('23:59');
    expect(reply.answer).toContain('전체 3건, 우선 3건');
  });

  it('reserves three study actions for urgent unfinished assessments before undated homework', () => {
    const state = newState();
    state.tasks = [
      task('math', { title: '일반 수학 숙제', kind: '숙제', status: 'todo', submissionRequired: false, priority: 5 }),
      task('today', { title: '오늘 제출 수행', status: 'todo', deadline: { date: '2026-11-04', precision: 'date-only', provenance: 'user-confirmed' } }),
      task('tomorrow', { title: '내일 제출 수행', status: 'todo', deadline: { date: '2026-11-05', precision: 'date-only', provenance: 'user-confirmed' } }),
      task('overdue', { title: '지난 수행 확인', status: 'todo', deadline: { date: '2026-11-03', precision: 'date-only', provenance: 'user-confirmed' } }),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('1. 역학과 에너지 · 지난 수행 확인');
    expect(reply.answer).toContain('2. 역학과 에너지 · 오늘 제출 수행');
    expect(reply.answer).toContain('3. 역학과 에너지 · 내일 제출 수행');
    expect(reply.answer).not.toContain('일반 수학 숙제');
    expect(state.tasks.find(t => t.id === 'today')?.submitted).toBe(false);
  });

  it('does not hide urgent unfinished assessments behind three undated submission checks', () => {
    const state = newState();
    state.tasks = [
      task('s1', { title: '제출 확인 A' }),
      task('s2', { title: '제출 확인 B' }),
      task('s3', { title: '제출 확인 C' }),
      task('urgent', { title: '오늘 마감 화학 수행', status: 'todo',
        deadline: { date: '2026-11-04', precision: 'date-only', provenance: 'user-confirmed' } }),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('오늘 마감 화학 수행');
    expect(reply.answer).toContain('제출 확인 필요 (전체 3건, 우선 2건)');
    expect(reply.answer).toContain('추가로 1건이 남아 있어');
    expect(reply.answer).not.toContain('제출 확인 C');
    expect(state.tasks.find(t => t.id === 'urgent')?.status).toBe('todo');
  });

  it('still discloses submission checks when three urgent unfinished tasks occupy the plan', () => {
    const state = newState();
    state.tasks = [
      task('submitted-wait', { title: '제출 확인 대기 과제' }),
      ...['지난 마감', '오늘 마감', '내일 마감'].map((title, i) =>
        task('urgent-' + i, { title, status: 'todo',
          deadline: { date: ['2026-11-03', '2026-11-04', '2026-11-05'][i], precision: 'date-only', provenance: 'user-confirmed' } })),
    ];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('제출 확인 대기 1건이 추천 3개 밖에 남아 있어');
    expect(reply.answer).toContain('3. 역학과 에너지 · 내일 마감');
    expect(state.tasks.find(t => t.id === 'submitted-wait')?.submitted).toBe(false);
  });

  it('shows a confirmed date-only deadline in the study plan without a legacy timestamp', () => {
    const state = newState();
    state.tasks = [task('date-only', {
      title: '화학 수행평가 준비', status: 'todo', due: null,
      deadline: { date: '2026-11-04', precision: 'date-only', provenance: 'user-confirmed' },
    })];
    const reply = localAssistant('오늘 뭐부터 해?', state, now);
    expect(reply.answer).toContain('화학 수행평가 준비 (25분, 2026-11-04 · 시각 미확인)');
    expect(reply.answer).not.toContain('마감 확인 필요');
    expect(reply.answer).not.toContain('23:59');
  });

});
