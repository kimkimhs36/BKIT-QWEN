import { it, expect } from 'vitest';
import { newState, type Task, type Session } from '../src/model';
import { needsSubmission, needsAttention, filteredTasks } from '../src/tasks';
import { closeSegment, studySeconds } from '../src/session';
import { recover, validateRecovery, delayMinutes } from '../src/engine';
import { parseBackup } from '../src/storage';
import { at, iso, MIN } from '../src/time';
const task = (extra: Partial<Task> = {}): Task => ({
  id: 't',
  subject: '수학',
  title: '테스트 · 풀이',
  kind: '숙제',
  due: null,
  priority: 2,
  minutes: 25,
  remaining: 25,
  status: 'done',
  submitted: false,
  optional: false,
  notes: '',
  link: '',
  ...extra,
});
it('completed homework remains in attention until actual submission', () => {
  const t = task();
  expect(needsSubmission(t)).toBe(true);
  expect(needsAttention(t)).toBe(true);
  expect(filteredTasks([t], 'submission')).toEqual([t]);
  expect(needsAttention({ ...t, submitted: true })).toBe(false);
  expect(needsSubmission({ ...t, kind: '시험공부' })).toBe(false);
});
it.each([1, 2, 3, 4, 5])('recovers a short task with %i minute remaining', (remaining) => {
  const s = { ...newState(), tasks: [task({ status: 'todo', remaining })] },
    now = at('2026-10-12', '15:00');
  const p = recover(s, now);
  expect(validateRecovery(s, p, now)).toEqual([]);
  expect(+new Date(p.decisions[0].blocks[0].end) - +new Date(p.decisions[0].blocks[0].start)).toBe(
    remaining * MIN,
  );
});
it('tracks exact focus ranges and excludes cross-date pauses', () => {
  const start = at('2026-10-12', '22:30');
  let a = {
    id: 'a',
    taskId: null,
    subject: '수학',
    action: '테스트 · 회상',
    target: 25,
    started: iso(start),
    segmentStart: iso(start),
    elapsed: 0,
    pauses: [],
    segments: [],
  } as NonNullable<ReturnType<typeof newState>['active']>;
  a = closeSegment(a, start + 5 * MIN);
  a = { ...a, segmentStart: iso(at('2026-10-13', '07:00')) };
  a = closeSegment(a, at('2026-10-13', '07:10'));
  const session: Session = {
    ...a,
    ended: iso(at('2026-10-13', '07:12')),
    seconds: a.elapsed,
    problems: 2,
    concepts: '',
    rating: '보통',
    reason: '',
    mistake: '',
    reviewDate: null,
  };
  expect(studySeconds([session], '2026-10-12')).toBe(300);
  expect(studySeconds([session], '2026-10-13')).toBe(600);
  expect(
    parseBackup(JSON.stringify({ ...newState(), sessions: [session] })).sessions[0].segments,
  ).toHaveLength(2);
});
it('keeps old v1 backup ranges optional and never invents legacy segments', () => {
  const started = iso(at('2026-10-12', '15:00'));
  const a = {
    id: 'a',
    taskId: null,
    subject: '수학',
    action: '테스트',
    target: 5,
    started,
    segmentStart: started,
    elapsed: 0,
    pauses: [],
  };
  expect(closeSegment(a, at('2026-10-12', '15:01')).segments).toBeUndefined();
  expect(parseBackup(JSON.stringify(newState())).version).toBe(1);
});
it('rejects inconsistent timer ranges on backup import', () => {
  const a = iso(at('2026-10-12', '15:00')),
    b = iso(at('2026-10-12', '15:10'));
  const session: Session = {
    id: 'a',
    taskId: null,
    subject: '수학',
    action: '테스트',
    target: 15,
    started: a,
    ended: b,
    seconds: 999,
    segments: [{ start: a, end: b }],
    problems: 0,
    concepts: '',
    rating: '보통',
    reason: '',
    mistake: '',
    reviewDate: null,
    pauses: [],
  };
  expect(() => parseBackup(JSON.stringify({ ...newState(), sessions: [session] }))).toThrow();
});
it('does not accumulate start delay while that task is actively being studied', () => {
  const now = at('2026-10-12', '15:00');
  const s = {
    ...newState(),
    tasks: [task({ status: 'doing' })],
    plan: [
      { id: 'b', taskId: 't', start: iso(now - 20 * MIN), end: iso(now + 5 * MIN), locked: false },
    ],
    active: {
      id: 'a',
      taskId: 't',
      subject: '수학',
      action: '테스트',
      target: 25,
      started: iso(now - 10 * MIN),
      segmentStart: iso(now - 10 * MIN),
      elapsed: 0,
      pauses: [],
    },
  };
  expect(delayMinutes(s, now)).toBe(0);
});
