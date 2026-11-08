import { describe, expect, it } from 'vitest';
import { chooseHomeNextAction } from '../src/actionFirst';

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
    expect(chooseHomeNextAction(now, { ...basic, current: { kind: 'sleep', title: '수면' }, busy: true }).kind).toBe('sleep');
  });
  it('suggests preparing 45 minutes before a confirmed bedtime', () => {
    expect(chooseHomeNextAction(now, { ...basic, bedtime: { start: now + 20 * 60_000, end: now + 8 * 60 * 60_000 } }).kind).toBe('sleep');
  });
  it('does not claim a bedtime if it was never supplied', () => {
    expect(chooseHomeNextAction(now, basic).kind).toBe('study');
  });
  it('does not start new study when a fixed activity is blocking', () => {
    expect(chooseHomeNextAction(now, { ...basic, unavailable: '학교 수업' })).toMatchObject({ kind: 'blocked', minutes: null });
  });
  it('shortens a study block when there are only five to nine minutes before the next fixed event', () => {
    expect(chooseHomeNextAction(now, { ...basic, next: { start: now + 8 * 60_000 } })).toMatchObject({ kind: 'study', minutes: 5 });
  });
});
