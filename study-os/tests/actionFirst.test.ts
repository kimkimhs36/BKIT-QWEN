import { describe, expect, it } from 'vitest';
import { chooseHomeNextAction, resolveHomeStudyStart } from '../src/actionFirst';

const now = Date.parse('2026-11-09T13:00:00+09:00');
const basic = { busy: false, unavailable: '' };

describe('home next action', () => {
  it('starts a real 10-minute block without needing a registered task', () => {
    expect(chooseHomeNextAction(now, basic)).toMatchObject({ kind: 'study', minutes: 10, label: '10분 집중 시작' });
  });
  it('does not invent a task or deadline', () => {
    expect(chooseHomeNextAction(now, basic).detail).toContain('등록하지 않아도');
  });
  it('resumes the running session rather than starting a second timer', () => {
    expect(chooseHomeNextAction(now, { ...basic, busy: true })).toMatchObject({ kind: 'resume', minutes: null });
  });
  it('protects active sleep time ahead of a study action', () => {
    expect(chooseHomeNextAction(now, { ...basic, current: { kind: 'sleep', title: '수면' }, busy: true })).toMatchObject({ kind: 'sleep', label: '진행 중인 공부 마무리' });
  });
  it('protects the full user-configured preparation hour, not only the last 45 minutes', () => {
    const preparing = { kind: 'sleep', title: '취침 준비' };
    const result = chooseHomeNextAction(now, {
      ...basic,
      current: preparing,
      bedtime: { start: now + 55 * 60_000, end: now + 8 * 60 * 60_000 },
      task: { subject: '수학', title: '남은 숙제' },
    });
    expect(result.kind).toBe('sleep');
    expect(resolveHomeStudyStart(result, 'math-task')).toBeNull();
  });
  it('suggests preparing 45 minutes before a confirmed bedtime', () => {
    expect(chooseHomeNextAction(now, { ...basic, bedtime: { start: now + 20 * 60_000, end: now + 8 * 60 * 60_000 } }).kind).toBe('sleep');
  });
  it('keeps the sleep priority when Sleep Guard supplies an explicit night window', () => {
    const night = Date.parse('2026-11-09T23:15:00+09:00');
    const bedtime = {
      start: Date.parse('2026-11-09T23:00:00+09:00'),
      end: Date.parse('2026-11-10T07:00:00+09:00'),
    };
    expect(chooseHomeNextAction(night, { ...basic, bedtime })).toMatchObject({
      kind: 'sleep', minutes: null,
    });
    expect(resolveHomeStudyStart(chooseHomeNextAction(night, { ...basic, bedtime }))).toBeNull();
  });
  it('prioritizes user bedtime preparation over a suggested task', () => {
    const preparing = Date.parse('2026-11-09T22:35:00+09:00');
    const bedtime = {
      start: Date.parse('2026-11-09T23:00:00+09:00'),
      end: Date.parse('2026-11-10T07:00:00+09:00'),
    };
    expect(chooseHomeNextAction(preparing, {
      ...basic, bedtime, task: { subject: '수학', title: '미완료 숙제' },
    }).kind).toBe('sleep');
  });
  it('does not claim a bedtime if it was never supplied', () => {
    expect(chooseHomeNextAction(now, basic).kind).toBe('study');
  });
  it('does not start new study when a fixed activity is blocking', () => {
    expect(chooseHomeNextAction(now, { ...basic, unavailable: '학교 수업' })).toMatchObject({ kind: 'blocked', minutes: null });
  });
  it('does not start a nominal five-minute block with only two minutes before an appointment', () => {
    const action = chooseHomeNextAction(now, { ...basic, next: { start: now + 2 * 60_000 }, task: { subject: '수학', title: '숙제' } });
    expect(action).toMatchObject({ kind: 'blocked', minutes: null });
    expect(resolveHomeStudyStart(action, 'math-1')).toBeNull();
  });
  it('ignores an elapsed appointment instead of incorrectly shortening focus to five minutes', () => {
    expect(chooseHomeNextAction(now, { ...basic, next: { start: now - 60_000 } })).toMatchObject({ kind: 'study', minutes: 10 });
  });
  it('still allows exactly five minutes before the next appointment', () => {
    expect(chooseHomeNextAction(now, { ...basic, next: { start: now + 5 * 60_000 } })).toMatchObject({ kind: 'study', minutes: 5 });
  });
  it('shortens a study block when there are only five to nine minutes before the next fixed event', () => {
    expect(chooseHomeNextAction(now, { ...basic, next: { start: now + 8 * 60_000 } })).toMatchObject({ kind: 'study', minutes: 5 });
  });
  it('links a home recommendation to a real task and the selected ten minutes', () => {
    const a = chooseHomeNextAction(now, { ...basic, task: { subject: '미적분Ⅰ', title: '마플 시너지' } });
    expect(resolveHomeStudyStart(a, 'math-1')).toEqual({ kind: 'task', taskId: 'math-1', minutes: 10 });
  });
  it('keeps a one-tap quick timer for an empty task list', () => {
    expect(resolveHomeStudyStart(chooseHomeNextAction(now, basic))).toEqual({ kind: 'quick', minutes: 10 });
  });
  it('carries the five-minute schedule boundary into a linked task session', () => {
    const a = chooseHomeNextAction(now, { ...basic, next: { start: now + 8 * 60_000 } });
    expect(resolveHomeStudyStart(a, 'physics-1')).toEqual({ kind: 'task', taskId: 'physics-1', minutes: 5 });
  });
  it('never turns a sleep, resume, or blocked action into a new study session', () => {
    expect(resolveHomeStudyStart(chooseHomeNextAction(now, { ...basic, current: { kind: 'sleep', title: '수면' } }), 'a')).toBeNull();
    expect(resolveHomeStudyStart(chooseHomeNextAction(now, { ...basic, busy: true }), 'a')).toBeNull();
    expect(resolveHomeStudyStart(chooseHomeNextAction(now, { ...basic, unavailable: '학교 수업' }), 'a')).toBeNull();
  });

});
