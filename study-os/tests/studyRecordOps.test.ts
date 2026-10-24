import { describe, expect, it } from 'vitest';
import { newState, stateSchema } from '../src/model';
import { finishQuick, startQuick } from '../src/quickTimer';
import {
  deleteStudySessions,
  discardUnsavedTimer,
  editStudySession,
  restoreStudySessions,
} from '../src/studyRecordOps';

const began = Date.parse('2026-10-25T01:00:00Z');
function recorded() {
  let s = startQuick(newState(), 'stopwatch', 480, began, 'example-one');
  s = finishQuick(s, began + 120000);
  return s;
}

describe('skip-save timers and reversible history', () => {
  it('discards a running stopwatch without a new session or changed tasks', () => {
    const previous = recorded();
    const s = startQuick(previous, 'countdown', 5, began + 200000, 'test-clock');
    const next = discardUnsavedTimer(s);
    expect(next.quickTimer).toBeNull();
    expect(next.sessions).toEqual(previous.sessions);
    expect(next.tasks).toEqual(previous.tasks);
    expect(stateSchema.safeParse(next).success).toBe(true);
  });

  it('discards a focus clock but leaves existing homework and saved evidence untouched', () => {
    const before = recorded();
    const active = {
      id: 'focus-demo',
      quick: false,
      taskId: null,
      subject: '영어',
      action: '임시 집중',
      target: 5,
      started: new Date(began).toISOString(),
      segmentStart: new Date(began).toISOString(),
      elapsed: 0,
      pauses: [],
    };
    const s = { ...before, active };
    const next = discardUnsavedTimer(s);
    expect(next.active).toBeNull();
    expect(next.sessions).toEqual(before.sessions);
    expect(stateSchema.safeParse(next).success).toBe(true);
  });

  it('deletes selected records only and restores them without overwriting new records', () => {
    const first = recorded();
    const second = finishQuick(
      startQuick(first, 'stopwatch', 480, began + 200000, 'example-two'),
      began + 240000,
    );
    const deleted = [second.sessions[0]];
    const afterDelete = deleteStudySessions(second, ['example-one']);
    expect(afterDelete.sessions.map((s) => s.id)).toEqual(['example-two']);
    expect(afterDelete.learning).toEqual(second.learning);
    expect(afterDelete.tasks).toEqual(second.tasks);
    const afterUndo = restoreStudySessions(afterDelete, deleted);
    expect(afterUndo.sessions.map((s) => s.id)).toEqual(['example-one', 'example-two']);
    expect(restoreStudySessions(afterUndo, deleted)).toBe(afterUndo);
    expect(stateSchema.safeParse(afterUndo).success).toBe(true);
  });

  it('edits a saved study summary while preserving timestamps and problem data', () => {
    const old = recorded();
    const next = editStudySession(old, 'example-one', {
      subject: '물리',
      action: '역학 문제',
      concepts: '뉴턴 법칙',
      rating: '이해함',
      mistake: '',
    });
    expect(next.sessions[0]).toMatchObject({
      subject: '물리',
      action: '역학 문제',
      concepts: '뉴턴 법칙',
      rating: '이해함',
      seconds: old.sessions[0].seconds,
      started: old.sessions[0].started,
    });
    expect(stateSchema.safeParse(next).success).toBe(true);
  });
});
