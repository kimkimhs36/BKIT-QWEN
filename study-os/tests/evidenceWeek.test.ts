import { describe, expect, it } from 'vitest';
import { newState, type Session } from '../src/model';
import { defaultSleep, type SleepRecord } from '../src/sleep';
import { formatRecordedFocus, summarizeEvidenceWeek } from '../src/evidenceWeek';
import { at, iso } from '../src/time';

const today = '2026-11-09';
const sample: Session = {
  id: 's1', taskId: null, subject: '수학', action: '실제로 시작한 문제',
  started: iso(at('2026-11-08', '23:58')),
  ended: iso(at('2026-11-09', '00:02')),
  seconds: 240, target: 5, problems: 0, concepts: '',
  rating: '보통', reason: '', pauses: [], mistake: '', reviewDate: null,
  segments: [{ start: iso(at('2026-11-08','23:58')), end: iso(at('2026-11-09','00:02')) }],
};
const sleepRecord = (checks: boolean[]): SleepRecord => ({
  date: today, targetBed: iso(at(today,'23:00')),
  targetWake: iso(at('2026-11-10','07:00')),
  checks, actualBed: null, actualWake: null, reflection: '', photoIds: [],
});

describe('7-day evidence based only on the learner’s existing records', () => {
  it('distinguishes zero recorded evidence from a failed day', () => {
    const result = summarizeEvidenceWeek(newState(), defaultSleep(), today);
    expect(result.days).toHaveLength(7);
    expect(result.days[0].day).toBe('2026-11-03');
    expect(result.days[6].day).toBe(today);
    expect(result).toMatchObject({
      focusedDays: 0, checkedPrepDays: 0, retestedDays: 0,
      evidenceDays: 0, focusMinutes: 0,
    });
    expect(result.days.every((d) => !d.anyEvidence)).toBe(true);
  });
  it('counts saved focus segments across Korean midnight without crediting inactive time', () => {
    const state = newState();
    state.sessions = [sample];
    const result = summarizeEvidenceWeek(state, defaultSleep(), today);
    expect(result.days[5].studySeconds).toBe(120);
    expect(result.days[6].studySeconds).toBe(120);
    expect(result.focusMinutes).toBe(4);
    expect(result.focusedDays).toBe(2);
  });
  it('does not count a paused but unsaved timer as completed study', () => {
    const state = newState();
    state.quickTimer = {
      id:'q1', mode:'countdown', targetMinutes:10,
      started:iso(at(today,'11:00')), segmentStart:null, elapsed:320, segments:[],
    };
    expect(summarizeEvidenceWeek(state, defaultSleep(), today).focusedDays).toBe(0);
  });
  it('does not treat preparation checkboxes as actual bedtime', () => {
    const sleep = defaultSleep();
    sleep.records = [sleepRecord([true,true,true,false])];
    const result = summarizeEvidenceWeek(newState(), sleep, today);
    expect(result.checkedPrepDays).toBe(1);
    expect(result.days[6]).toMatchObject({
      bedtimeChecks:3, actualBedEntered:false, actualWakeEntered:false, anyEvidence:true,
    });
  });
  it('requires all three preparation checks, separately from the fourth in-bed check', () => {
    const sleep = defaultSleep();
    sleep.records = [sleepRecord([true, true, false, true])];
    const result = summarizeEvidenceWeek(newState(), sleep, today);
    expect(result.checkedPrepDays).toBe(0);
    expect(result.days[6].bedtimeChecks).toBe(2);
  });
  it('counts only user-checked, explicitly hint-free retests, not initial guesses', () => {
    const state = newState();
    state.problemRetests = [
      { id:'a1', sessionId:'s1', answer:'내 답', submittedAt:iso(at(today,'13:00')),
        selfCheck:'remembered', hintUsed:false },
      { id:'a2', sessionId:'s1', answer:'내 답', submittedAt:iso(at(today,'14:00')),
        selfCheck:'remembered' },
      { id:'a3', sessionId:'s1', answer:'내 답', submittedAt:iso(at(today,'15:00')),
        selfCheck:'retry', hintUsed:false },
      { id:'a4', sessionId:'s1', answer:'내 답', submittedAt:iso(at(today,'16:00')),
        selfCheck:'remembered', hintUsed:true },
    ];
    const result = summarizeEvidenceWeek(state, defaultSleep(), today);
    expect(result.retestedDays).toBe(1);
    expect(result.days[6].selfCheckedRetests).toBe(1);
  });
  it('keeps user-entered bedtime separate from any prediction of sleep duration', () => {
    const sleep = defaultSleep();
    sleep.records = [{ ...sleepRecord([false,false,false,false]), actualBed:iso(at(today,'23:15')) }];
    const result = summarizeEvidenceWeek(newState(), sleep, today);
    expect(result.days[6].actualBedEntered).toBe(true);
    expect(result.days[6].actualWakeEntered).toBe(false);
    expect(result.checkedPrepDays).toBe(0);
  });
});

describe('honest display of short focus records', () => {
  it('shows missing records separately from a saved 30-second attempt', () => {
    expect(formatRecordedFocus(0)).toBe('미기록');
    expect(formatRecordedFocus(30)).toBe('30초');
    expect(formatRecordedFocus(59.9)).toBe('59초');
  });
  it('does not overstate fractional time and formats longer focus', () => {
    expect(formatRecordedFocus(0.4)).toBe('1초 미만');
    expect(formatRecordedFocus(60)).toBe('1분');
    expect(formatRecordedFocus(3720)).toBe('1시간 2분');
    expect(formatRecordedFocus(NaN)).toBe('미기록');
  });
});
