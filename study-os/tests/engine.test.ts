import { describe, it, expect } from 'vitest';
import { newState, type State, type Task, type Schedule } from '../src/model';
import {
  recover,
  validateRecovery,
  validatePlan,
  fixedForDay,
  nextSchedule,
  delayMinutes,
} from '../src/engine';
import { at, MIN, iso, dayKey, addDays, weekday } from '../src/time';
import { protectedBoundary, fixedConflicts } from '../src/safety';
const DAY = '2026-10-12',
  now = at(DAY, '15:00');
const task = (o: Partial<Task> = {}): Task => ({
  id: 't1',
  title: '학습지 1–3번 풀기',
  subject: '수학',
  kind: '숙제',
  due: iso(at(addDays(DAY, 1), '21:00')),
  priority: 2,
  minutes: 25,
  remaining: 25,
  status: 'todo',
  submitted: false,
  optional: false,
  notes: '',
  link: '',
  ...o,
});
const schedule = (o: Partial<Schedule> = {}): Schedule => ({
  id: 'a',
  title: '수학 학원',
  subject: '수학',
  kind: 'academy',
  days: [1],
  start: '18:00',
  end: '22:00',
  prep: 10,
  travel: 20,
  buffer: 10,
  materials: '학습지',
  date: null,
  excluded: [],
  ...o,
});
const state = (): State => ({ ...newState(), tasks: [task()] });
describe('Seoul scheduling safety', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('registers recurring weekday %i without UTC drift', (d) => {
    const s = state();
    s.schedules = [schedule({ days: [d] })];
    const day = Array.from({ length: 7 }, (_, i) => addDays(DAY, i)).find((x) => weekday(x) === d)!;
    expect(fixedForDay(s, day).filter((x) => x.kind === 'academy')).toHaveLength(1);
    expect(fixedForDay(s, addDays(day, 1)).filter((x) => x.kind === 'academy')).toHaveLength(0);
  });
  it('calculates preparation, departure, arrival and blocks a study session 30 min before academy', () => {
    const s = state();
    s.schedules = [schedule()];
    const f = fixedForDay(s, DAY).find((x) => x.kind === 'academy')!;
    expect(f.start).toBe(at(DAY, '17:20'));
    expect(f.depart).toBe(at(DAY, '17:30'));
    expect(f.arrive).toBe(at(DAY, '17:50'));
    expect(
      validatePlan(
        s,
        [
          {
            id: 'b',
            taskId: 't1',
            start: iso(at(DAY, '17:30')),
            end: iso(at(DAY, '17:55')),
            locked: false,
          },
        ],
        now,
      ),
    ).toContain('수업·준비·이동·식사·수면과 충돌합니다.');
  });
  it('recovers 90 minute delay from the actual current time', () => {
    const s = state();
    s.plan = [
      {
        id: 'old',
        taskId: 't1',
        start: iso(at(DAY, '13:30')),
        end: iso(at(DAY, '13:55')),
        locked: false,
      },
    ];
    expect(delayMinutes(s, now)).toBe(90);
    const r = recover(s, now);
    expect(validateRecovery(s, r, now)).toEqual([]);
    expect(r.decisions[0].blocks.every((b) => +new Date(b.start) >= now)).toBe(true);
  });
  it('never reopens a completed assignment', () => {
    const s = state();
    s.tasks[0].status = 'done';
    expect(recover(s, now).decisions).toEqual([]);
    expect(s.tasks[0].status).toBe('done');
  });
  it('honors a changed deadline', () => {
    const s = state();
    s.tasks[0].kind = '수행평가';
    s.tasks[0].due = iso(at(DAY, '15:10'));
    const r = recover(s, now);
    expect(validateRecovery(s, r, now)).toEqual([]);
    expect(r.decisions[0].category).toBe('REDUCE');
    expect(r.decisions[0].blocks.every((b) => +new Date(b.end) <= at(DAY, '15:10'))).toBe(true);
  });
  it('never drops a mandatory or dated task, even if overdue', () => {
    const s = state();
    s.tasks = [task({ due: iso(now - MIN) }), task({ id: 'optional', optional: true, due: null })];
    const r = recover(s, now);
    expect(r.decisions[0].category).toBe('REDUCE');
    expect(r.decisions[0].blocks).toEqual([]);
    expect(
      validateRecovery(
        s,
        {
          ...r,
          decisions: r.decisions.map((d) => (d.taskId === 't1' ? { ...d, category: 'DROP' } : d)),
        },
        now,
      ),
    ).toContain('마감이 있거나 필수인 과제는 생략할 수 없습니다.');
  });
  it('moves only before the deadline and protects minimum sleep', () => {
    const s = state();
    s.settings.bed = '23:30';
    s.settings.minSleep = 9;
    s.schedules = [schedule({ start: '15:00', end: '22:00', prep: 0, travel: 0, buffer: 0 })];
    const r = recover(s, now);
    expect(r.decisions[0].category).toBe('MOVE');
    expect(dayKey(r.decisions[0].blocks[0].start)).toBe(addDays(DAY, 1));
    expect(fixedForDay(s, DAY).find((f) => f.id === 'sleep-pm')?.start).toBe(at(DAY, '22:00'));
    expect(validateRecovery(s, r, now)).toEqual([]);
  });
  it('keeps manual locks and rejects arbitrary changes', () => {
    const s = state();
    const b = {
      id: 'locked',
      taskId: 't1',
      start: iso(now + 30 * MIN),
      end: iso(now + 55 * MIN),
      locked: true,
    };
    s.plan = [b];
    const r = recover(s, now);
    expect(r.decisions[0].blocks).toEqual([b]);
    expect(validateRecovery(s, r, now)).toEqual([]);
    expect(validatePlan(s, [], now)).toContain('직접 고정한 계획은 유지해야 합니다.');
  });
  it('rejects overlap, duplicate block IDs and excess task allocation', () => {
    const s = state();
    const b = {
      id: 'b',
      taskId: 't1',
      start: iso(now + 5 * MIN),
      end: iso(now + 25 * MIN),
      locked: false,
    };
    const errors = validatePlan(
      s,
      [b, { ...b, start: iso(now + 10 * MIN), end: iso(now + 30 * MIN) }],
      now,
    );
    expect(errors).toContain('중복된 학습 구간 ID입니다.');
    expect(errors).toContain('학습 구간 또는 휴식 시간이 겹칩니다.');
    expect(errors).toContain('남은 과제 시간보다 많이 배치할 수 없습니다.');
  });
  it('requires a rest between successive sessions', () => {
    const s = state();
    s.tasks.push(task({ id: 't2' }));
    const r = recover(s, now);
    expect(validateRecovery(s, r, now)).toEqual([]);
    const [a, b] = r.decisions.map((d) => d.blocks[0]);
    expect(+new Date(b.start) - +new Date(a.end)).toBeGreaterThanOrEqual(
      s.settings.breakMinutes * MIN,
    );
  });
  it('does not schedule at midnight and uses the new Seoul date', () => {
    const n = at(addDays(DAY, 1), '00:10'),
      s = state(),
      r = recover(s, n);
    expect(dayKey(n)).toBe('2026-10-13');
    expect(+new Date(r.decisions[0].blocks[0].start)).toBeGreaterThanOrEqual(
      at('2026-10-13', '07:00'),
    );
    expect(validateRecovery(s, r, n)).toEqual([]);
  });
  it('supports holidays and one-day replacement', () => {
    const s = state();
    s.schedules = [
      schedule({ excluded: [DAY] }),
      schedule({
        id: 'replacement',
        title: '시험',
        date: DAY,
        start: '09:00',
        end: '12:00',
        prep: 0,
        travel: 0,
        buffer: 0,
      }),
    ];
    expect(
      fixedForDay(s, DAY)
        .filter((x) => x.kind === 'academy')
        .map((x) => x.title),
    ).toEqual(['시험']);
  });
  it('does not invent lessons on first run', () => {
    const s = newState();
    expect(nextSchedule(s, now)).toBeUndefined();
    expect(recover(s, now).decisions).toEqual([]);
  });
  it('detects preparation crossing the date boundary', () => {
    const s = state();
    s.schedules = [
      schedule({ days: [2], start: '00:20', end: '01:00', prep: 20, travel: 20, buffer: 10 }),
    ];
    const f = fixedForDay(s, DAY).find((x) => x.title === '수학 학원')!;
    expect(f.start).toBe(at(DAY, '23:30'));
    expect(f.end).toBe(at(addDays(DAY, 1), '01:00'));
  });
  it('pauses a suspended timer at the first fixed boundary', () => {
    const s = state();
    s.schedules = [schedule()];
    expect(protectedBoundary(s, at(DAY, '16:00'), at(DAY, '22:30'))?.at).toBe(at(DAY, '17:20'));
    expect(protectedBoundary(s, at(DAY, '16:00'), at(DAY, '17:00'))).toBeUndefined();
  });
  it('warns when fixed lessons overlap with each other or meals', () => {
    const s = state();
    s.schedules = [schedule()];
    expect(fixedConflicts(s, DAY)).toContain('수학 학원 ↔ 식사 · 쉬어가기');
  });
  it('stress-checks randomized lengths and deadlines for conflicts', () => {
    for (let i = 0; i < 80; i++) {
      const s = state();
      s.schedules = [schedule()];
      s.tasks = Array.from({ length: 8 }, (_, j) =>
        task({
          id: 'task' + j,
          remaining: 5 + ((i * 13 + j * 17) % 120),
          minutes: 120,
          due: iso(at(addDays(DAY, (j % 3) + 1), '21:00')),
        }),
      );
      expect(validateRecovery(s, recover(s, now), now)).toEqual([]);
    }
  });
});
it('classifies next-day plans as MOVE when review margin crosses midnight', () => {
  const s = state(),
    n = at(DAY, '23:59');
  const r = recover(s, n);
  expect(r.decisions[0].category).toBe('MOVE');
  expect(validateRecovery(s, r, n)).toEqual([]);
});
