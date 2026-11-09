import { describe, expect, it } from 'vitest';
import { newState, scheduleSchema } from '../src/model';
import { defaultSleep } from '../src/sleep';
import { chooseEvidenceNextAction as next } from '../src/evidenceNextAction';
import { at } from '../src/time';

describe('seven-day evidence next action matches real focus protections', () => {
  const day = '2026-11-09';
  it('starts only when a real five-minute window is free', () => {
    expect(next(newState(), defaultSleep(), at(day, '14:00'), false, false)).toEqual({
      kind: 'start',
    });
  });
  it('refuses new study when school or academy time is in progress', () => {
    const state = newState();
    state.schedules = [scheduleSchema.parse({
      id:'class-1', title:'실제 학교 수업', subject:'물리',
      kind:'school', days:[1], start:'14:00', end:'15:00',
      prep:0, travel:0, buffer:0, materials:'', date:null, excluded:[],
    })];
    expect(next(state, defaultSleep(), at(day,'14:30'), false, false)).toEqual({
      kind:'schedule', title:'실제 학교 수업', upcoming:false,
    });
  });
  it('directs to the schedule rather than starting five minutes just before class', () => {
    const state = newState();
    state.schedules = [scheduleSchema.parse({
      id:'class-2', title:'과학 수업', subject:'화학', kind:'school',
      days:[1], start:'14:58', end:'15:50', prep:0, travel:0, buffer:0,
      materials:'', date:null, excluded:[],
    })];
    expect(next(state, defaultSleep(), at(day,'14:55'), false, false)).toEqual({
      kind:'schedule', title:'과학 수업', upcoming:true,
    });
  });
  it('prioritizes user-confirmed bedtime preparation if no study is active', () => {
    expect(next(newState(), defaultSleep(), at(day,'22:30'), false, true))
      .toEqual({ kind:'sleep' });
  });
  it('lets an existing study be finished without restarting its clock at bedtime', () => {
    expect(next(newState(), defaultSleep(), at(day,'22:30'), true, true))
      .toEqual({ kind:'finish' });
  });
});
