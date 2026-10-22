import { describe, it, expect } from 'vitest';
import { newState, stateSchema, type Task } from '../src/model';
import { firstLearningAction } from '../src/now';
import { startQuick, attachQuickTask, finishQuickResource, finishQuick } from '../src/quickTimer';
import { pausedImportedState } from '../src/storage';
import { mergeStudy } from '../src/completeBackup';
const time = Date.parse('2026-10-22T05:00:00Z');
const task: Task = {
  id: 'task',
  title: '실제 지문',
  subject: '국어',
  kind: '숙제',
  due: null,
  minutes: 20,
  remaining: 20,
  priority: 2,
  status: 'todo',
  submitted: false,
  optional: false,
  notes: '',
  link: '',
};
const step = { note: '내 답 · 원본 보존', next: 'retry' as const };
describe('learning context compatibility', () => {
  it('preserves drafts, clock identity and context across quick-task attachment, finish and backup merge', () => {
    let state = startQuick({ ...newState(), tasks: [task] }, 'countdown', 5, time, 'session');
    state.quickTimer!.learningStep = step;
    const attached = attachQuickTask(stateSchema.parse(JSON.parse(JSON.stringify(state))), task.id);
    expect(attached.active?.id).toBe('session');
    expect(attached.active?.learningStep).toEqual(step);
    expect(attached.active?.started).toBe(state.quickTimer?.started);
    const finished = finishQuickResource(attached, time + 123000);
    expect(finished.sessions[0].seconds).toBe(123);
    expect(finished.sessions[0].learningStep).toEqual(step);
    expect(finished.sessions[0].problems).toBe(0);
    expect(finished.tasks[0].submitted).toBe(false);
    const restored = mergeStudy(
      newState(),
      stateSchema.parse(JSON.parse(JSON.stringify(finished))),
    );
    expect(restored.sessions).toEqual(finished.sessions);
  });
  it('keeps free-study notes in paused archives and completed records without fabricating answers', () => {
    const state = startQuick(newState(), 'stopwatch', 480, time, 'free');
    state.quickTimer!.learningStep = step;
    const restored = pausedImportedState(stateSchema.parse(JSON.parse(JSON.stringify(state))));
    expect(restored.quickTimer?.segmentStart).toBeNull();
    expect(restored.quickTimer?.learningStep).toEqual(step);
    const completed = finishQuick(restored, time + 86400000);
    expect(completed.sessions[0].learningStep).toEqual(step);
    expect(completed.sessions[0].seconds).toBe(0);
    expect(completed.sessions[0].problems).toBe(0);
    expect(completed.sessions[0].workspace).toBeUndefined();
  });
  it('reads old v1 state unchanged and validates optional draft limits', () => {
    const old = newState();
    expect(stateSchema.parse(old)).toEqual(old);
    const state = startQuick(old, 'countdown', 5, time, 'free');
    state.quickTimer!.learningStep = { note: 'x'.repeat(3001) };
    expect(stateSchema.safeParse(state).success).toBe(false);
  });
  it('grounds reading guidance in the actual subject without inventing question numbers', () => {
    const korean = { ...task, quantity: { unit: 'passages' as const, total: 3, remaining: 2 } };
    expect(firstLearningAction(korean)).toContain('핵심 내용');
    expect(firstLearningAction(korean)).not.toContain('해석');
    expect(firstLearningAction({ ...korean, subject: '영어' })).toContain('해석');
    expect(firstLearningAction({ ...task, subject: '물리' })).toContain('물리량');
    expect(firstLearningAction({ ...task, subject: '경제' })).not.toContain('1번');
  });
});

import { weeklyLearningEvidence } from '../src/learningEvidence';
it('computes local first-action percentiles separately from written answers and excludes unlinked conversions', () => {
  const state = newState();
  state.learningEvents = [20, 40, 80, 120].flatMap((seconds, i) => [
    {
      id: 'start' + i,
      type: 'StudyStarted' as const,
      at: new Date(time).toISOString(),
      foregroundAt: new Date(time).toISOString(),
      sessionId: 's' + i,
      taskId: null,
      action: '직접 공부',
    },
    {
      id: 'attempt' + i,
      type: 'FirstLearningAttempt' as const,
      at: new Date(time + seconds * 1000).toISOString(),
      foregroundAt: new Date(time).toISOString(),
      sessionId: 's' + i,
      taskId: null,
      action: '자가 보고',
    },
  ]);
  const evidence = weeklyLearningEvidence(state, '2026-10-22');
  expect(evidence).toMatchObject({
    starts: 4,
    attemptedStarts: 4,
    firstActionSamples: 4,
    medianSeconds: 60,
    p75Seconds: 80,
    attempts: 0,
  });
});
