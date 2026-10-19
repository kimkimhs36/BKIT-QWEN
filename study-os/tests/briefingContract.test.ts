import { describe, it, expect } from 'vitest';
import { briefingInput, parseBriefingResponse } from '../src/briefingContract';
const task = {
  title: '발표 준비',
  subject: '영어',
  kind: '수행평가',
  due: null,
  dueTime: null,
  quantityUnit: null,
  quantityTotal: null,
  minutes: null,
  sourceText: '영어 발표 준비',
};
const body = (patch = {}) => ({ mode: 'live', missions: [{ ...task, ...patch }] });
describe('private briefing browser contract', () => {
  it('keeps ambiguous dates and quantities unknown; rejects unsupported evidence', () => {
    expect(parseBriefingResponse(body(), '영어 발표 준비').missions[0].due).toBeNull();
    expect(() =>
      parseBriefingResponse(body({ sourceText: '없는 공지' }), '영어 발표 준비'),
    ).toThrow('원문 근거');
  });
  it('rejects invented calendar dates, date-free times and incomplete quantities', () => {
    for (const patch of [
      { due: '2026-02-30' },
      { dueTime: '09:00' },
      { quantityTotal: 3 },
      { quantityUnit: 'pages' },
    ])
      expect(() => parseBriefingResponse(body(patch), '영어 발표 준비')).toThrow();
  });
  it('bounds input before a paid request and does not accept demo output as inference', () => {
    expect(briefingInput.safeParse(' ').success).toBe(false);
    expect(briefingInput.safeParse('가'.repeat(3001)).success).toBe(false);
    expect(() => parseBriefingResponse({ ...body(), mode: 'demo' }, '영어 발표 준비')).toThrow();
  });
});
