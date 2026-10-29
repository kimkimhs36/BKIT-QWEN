import { describe, expect, it } from 'vitest';
import { newState, scheduleSchema } from '../src/model';
import { localAssistant } from '../src/assistantLogic';
import { isScheduleCommand, parseSpokenSchedule, recoverScheduleQuestion } from '../src/scheduleCapture';

const NOW = Date.parse('2026-10-29T12:00:00+09:00');

describe('BUILD 10: academy speech to approved records', () => {
  it('parses explicit weekly Korean appointments without altering study records', () => {
    const state = newState();
    const reply = localAssistant('매주 월수금 오후 6시부터 8시까지 수학 학원 등록해줘', state, NOW);
    expect(reply.action?.kind).toBe('add-schedule');
    if (reply.action?.kind === 'add-schedule') {
      const s = scheduleSchema.parse(reply.action.schedule);
      expect(s.days).toEqual([1, 3, 5]);
      expect(s.start).toBe('18:00');
      expect(s.end).toBe('20:00');
      expect(s.date).toBeNull();
      expect(s.kind).toBe('academy');
      expect(s.prep).toBe(0);
    }
    expect(state.schedules).toHaveLength(0);
    expect(reply.answer).toContain('아래 저장 버튼');
    expect(reply.answer).toContain('미입력');
  });
  it('parses specific date and prevents silently recurring it', () => {
    const parsed = parseSpokenSchedule('내일 오후 6시부터 8시까지 화학 학원 등록해줘', NOW);
    expect(parsed.kind).toBe('draft');
    if (parsed.kind === 'draft') {
      expect(parsed.schedule.date).toBe('2026-10-30');
      expect(parsed.schedule.days).toEqual([5]);
    }
  });
  it('does not roll a missed this-week day forward silently', () => {
    const missed = parseSpokenSchedule('이번 주 월요일 오후 6시부터 8시까지 수학 학원 추가해줘', NOW);
    expect(missed.kind).toBe('invalid');
    const future = parseSpokenSchedule('이번 주 금요일 오후 6시부터 8시까지 수학 학원 추가해줘', NOW);
    expect(future.kind).toBe('draft');
    if (future.kind === 'draft') expect(future.schedule.date).toBe('2026-10-30');
  });
  it('understands explicit two-sided meridian, no guessing about bare hours', () => {
    const explicit = parseSpokenSchedule('매주 화요일 오전 11시부터 오후 1시까지 영어 과외 추가해줘', NOW);
    expect(explicit.kind).toBe('draft');
    if (explicit.kind === 'draft') expect([explicit.schedule.start,explicit.schedule.end]).toEqual(['11:00','13:00']);
    expect(parseSpokenSchedule('매주 화요일 6시부터 8시까지 영어 과외 추가해줘', NOW).kind).toBe('incomplete');
    expect(parseSpokenSchedule('매주 화요일 오후 8시부터 6시까지 영어 과외 추가해줘', NOW).kind).toBe('invalid');
  });
  it('requires repeat/one-time selection when weekday recurrence is unspecified', () => {
    const p = parseSpokenSchedule('화요일 오후 6시부터 8시까지 영어 과외 추가해줘', NOW);
    expect(p.kind).toBe('incomplete');
    if (p.kind === 'incomplete') expect(p.answer).toContain('매주');
    expect(parseSpokenSchedule('매주 내일 오후 6시부터 8시까지 영어 과외 추가해줘', NOW).kind).toBe('invalid');
  });
  it('continues an unresolved schedule question with one follow-up, not a casual yes', () => {
    const prev='매주 화요일 화학 학원 등록해줘';
    const unresolved=localAssistant(prev, newState(), NOW);
    const history=[
      {role:'user' as const,text:prev},
      {role:'assistant' as const,text:unresolved.answer},
    ];
    expect(recoverScheduleQuestion('응',history)).toBe('응');
    expect(recoverScheduleQuestion('오후 6시부터 8시까지',history)).toContain('화학 학원');
    const resolved=localAssistant('오후 6시부터 8시까지',newState(),NOW,history);
    expect(resolved.action?.kind).toBe('add-schedule');
  });
  it('preserves homework action routing even if academy is mentioned', () => {
    expect(isScheduleCommand('내일 학원 숙제 추가해줘')).toBe(false);
    const result=localAssistant('내일 학원 숙제 추가해줘',newState(),NOW);
    expect(result.action?.kind).toBe('add');
    expect(localAssistant('학원 가기 싫어',newState(),NOW).action).toBeUndefined();
    expect(localAssistant('수학 학원 일정 삭제해줘',newState(),NOW).action).toBeUndefined();
  });
  it('shows the existing collision before user approves a new schedule', () => {
    const s=newState();
    s.schedules=[scheduleSchema.parse({
      id:'previous',title:'저녁 과외',subject:'영어',kind:'academy',
      days:[2],start:'18:30',end:'19:30',
      prep:0,travel:0,buffer:0,materials:'',date:null,excluded:[],
    })];
    const reply=localAssistant('매주 화요일 오후 6시부터 8시까지 화학 학원 추가해줘',s,NOW);
    expect(reply.action?.kind).toBe('add-schedule');
    expect(reply.answer).toContain('저녁 과외');
    expect(s.schedules).toHaveLength(1);
  });
  it('does not invent a name or a calendar day', () => {
    expect(parseSpokenSchedule('매주 화요일 오후 6시부터 8시까지 학원 추가해줘',NOW).kind).toBe('incomplete');
    expect(parseSpokenSchedule('매주 오후 6시부터 8시까지 수학 학원 추가해줘',NOW).kind).toBe('incomplete');
  });
});
