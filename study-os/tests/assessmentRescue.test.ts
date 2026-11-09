import { describe, expect, it } from 'vitest';
import type { Task } from '../src/model';
import { assessmentRescue } from '../src/assessmentRescue';

const now = Date.parse('2026-11-10T10:00:00+09:00');
const example = (id: string, patch: Partial<Task> = {}): Task => ({
  id,
  subject: '물질과 에너지',
  title: '실험 보고서',
  kind: '수행평가',
  due: null,
  priority: 2,
  minutes: 20,
  remaining: 20,
  status: 'todo',
  submitted: false,
  optional: false,
  notes: '',
  link: '',
  ...patch,
});

describe('assessment rescue home', () => {
  it('does not invent missing assignments when no records exist', () => {
    expect(assessmentRescue([], now)).toEqual({
      registered: 0, outstanding: 0, submissionChecks: 0, deadlinesToVerify: 0, top: [],
    });
  });
  it('includes a done-but-not-submitted assessment without falsely marking it submitted', () => {
    const result = assessmentRescue([example('a', { status: 'done' })], now);
    expect(result).toMatchObject({ registered: 1, outstanding: 1, submissionChecks: 1 });
    expect(result.top[0].status).toContain('실제 제출 확인');
  });
  it('prioritizes actual overdue and today dates over an unknown deadline', () => {
    const tasks = [
      example('unknown'),
      example('today', { deadline: { date: '2026-11-10', precision: 'date-only', provenance: 'explicit' } }),
      example('overdue', { deadline: { date: '2026-11-09', precision: 'date-only', provenance: 'user-confirmed' } }),
    ];
    expect(assessmentRescue(tasks, now).top.map(({ task }) => task.id)).toEqual(['overdue', 'today', 'unknown']);
  });
  it('does not call an inferred deadline confirmed', () => {
    const result = assessmentRescue([example('guess', {
      deadline: { date: '2026-11-10', precision: 'date-only', provenance: 'inferred' },
    })], now);
    expect(result.deadlinesToVerify).toBe(1);
    expect(result.top[0].status).toContain('추정');
  });
  it('excludes user-confirmed submitted and no-submission-needed completed work from urgent actions', () => {
    const result = assessmentRescue([
      example('submitted', { status: 'done', submitted: true }),
      example('presentation', { status: 'done', submissionRequired: false }),
      example('math', { kind: '숙제', status: 'todo' }),
    ], now);
    expect(result).toMatchObject({ registered: 2, outstanding: 0, submissionChecks: 0, top: [] });
  });
  it('limits the home to three rows, keeping registered items and their original state intact', () => {
    const list = Array.from({ length: 8 }, (_, index) => example('task-' + index));
    const prior = JSON.stringify(list);
    const result = assessmentRescue(list, now);
    expect(result).toMatchObject({ registered: 8, outstanding: 8, deadlinesToVerify: 8 });
    expect(result.top).toHaveLength(3);
    expect(JSON.stringify(list)).toBe(prior);
  });
});
