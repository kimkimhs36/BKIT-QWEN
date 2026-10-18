import { describe, it, expect } from 'vitest';
import { newState, stateSchema, examSchema, type Task } from '../src/model';
import { examScopeStatus, daysUntilExam, examStudyOptions } from '../src/exams';
import { defaultSleep, sleepDateKey } from '../src/sleep';
import { sleepConstraints, studyFixedNow } from '../src/sleepConstraints';
import { protectedBoundary } from '../src/safety';
import { recover, validateRecovery, validatePlan } from '../src/engine';
import { iso } from '../src/time';
const task: Task = {
  id: 't',
  subject: '수학',
  title: '등록한 학습지',
  kind: '시험공부',
  due: null,
  minutes: 25,
  remaining: 25,
  priority: 2,
  status: 'todo',
  submitted: false,
  optional: false,
  notes: '',
  link: '',
};
describe('source-confirmed exams and shared sleep constraints', () => {
  it('distinguishes unknown and partial scope and only links actual task materials', () => {
    const e = examSchema.parse({
      id: 'exam',
      title: '중간고사',
      subject: '수학',
      date: null,
      confirmedScope: '',
      uncertainScope: '교과서 3단원 포함 여부',
      source: '',
      availableMaterials: '',
      missingMaterials: '교과서',
      weakConcepts: '극한',
      updatedAt: iso(Date.now()),
    });
    expect(examScopeStatus(e)).toBe('미확인');
    expect(daysUntilExam(e, '2026-10-19')).toBeNull();
    expect(() => examSchema.parse({ ...e, confirmedScope: '학습지 1쪽' })).toThrow();
    const confirmed = examSchema.parse({
      ...e,
      confirmedScope: '학습지 1쪽',
      source: '교사 공지 직접 확인',
      date: '2026-10-22',
    });
    expect(examScopeStatus(confirmed)).toBe('부분 확인');
    expect(daysUntilExam(confirmed, '2026-10-19')).toBe(3);
    const s = {
      ...newState(),
      tasks: [task, { ...task, id: 'actual', attachmentIds: ['photo'] }],
      exams: [confirmed],
    };
    expect(examStudyOptions(confirmed, s).map((t) => t.id)).toEqual(['actual']);
    expect(stateSchema.parse(JSON.parse(JSON.stringify(s))).exams).toEqual([confirmed]);
  });
  it('guards an early bedtime, caps elapsed at its exact boundary and preserves source records', () => {
    const guard = { ...defaultSleep(), enabled: true };
    guard.schedule = guard.schedule.map(() => ({ bed: '20:00', wake: '06:00' }));
    const start = +new Date('2026-10-19T19:55:00'),
      end = +new Date('2026-10-19T21:00:00');
    const fixed = sleepConstraints(guard, start, end);
    const s = newState();
    s.settings.wake = '00:00';
    s.settings.bed = '16:00';
    expect(protectedBoundary(s, start, end, fixed)?.at).toBe(+new Date('2026-10-19T20:00:00'));
    expect(studyFixedNow(s, guard, end).some((f) => f.start <= end && f.end > end)).toBe(true);
    expect(s.sessions).toEqual([]);
    expect(guard.records).toEqual([]);
  });
  it('honors explicit skip and pause without weakening ordinary lifestyle sleep', () => {
    const guard = { ...defaultSleep(), enabled: true };
    const start = +new Date('2026-10-19T22:50:00'),
      end = start + 3600000;
    guard.skipped = [sleepDateKey(start)];
    expect(sleepConstraints(guard, start, end)).toEqual([]);
    guard.skipped = [];
    guard.pausedUntil = +new Date('2026-10-20T00:00:00');
    expect(sleepConstraints(guard, start, end)[0].start).toBe(guard.pausedUntil);
    guard.enabled = false;
    expect(sleepConstraints(guard, start, end)).toEqual([]);
  });
  it('Recovery rejects bedtime collisions and keeps locked blocks for explicit user repair', () => {
    const s = { ...newState(), tasks: [task] };
    const start = +new Date('2026-10-19T10:00:00+09:00');
    const protectedTime = [{ start, end: start + 3600000 }];
    const result = recover(s, start, protectedTime);
    expect(validateRecovery(s, result, start, protectedTime)).toEqual([]);
    expect(+new Date(result.decisions[0].blocks[0].start)).toBeGreaterThanOrEqual(
      protectedTime[0].end,
    );
    const block = {
      id: 'locked',
      taskId: 't',
      start: iso(start + 120000),
      end: iso(start + 25 * 60000),
      locked: true,
    };
    expect(validatePlan({ ...s, plan: [block] }, [block], start, protectedTime)).toContain(
      '수업·준비·이동·식사·수면과 충돌합니다.',
    );
    expect(recover({ ...s, plan: [block] }, start, protectedTime).decisions[0].blocks).toEqual([
      block,
    ]);
  });
});
