import { describe, it, expect } from 'vitest';
import { newState, stateSchema } from '../src/model';
import {
  addResource,
  learning,
  recordResourceAttempt,
  checkResourceAttempt,
} from '../src/learningEngine';
import {
  attachQuickResource,
  finishQuickResource,
  startQuick,
  pauseQuick,
  labelQuick,
} from '../src/quickTimer';
const began = Date.parse('2026-10-19T12:00:00Z');
function material() {
  return addResource(
    newState(),
    {
      title: '내 학습지',
      subject: '생명과학',
      sourceType: 'school-worksheet',
      linkedTaskId: null,
      linkedMediaIds: [],
    },
    ['세포 호흡을 설명하라'],
    began,
  );
}
describe('study first, open real material afterwards', () => {
  it('retains the ID, elapsed time and pause state through reload and immediate finish', () => {
    let s = material();
    const resource = learning(s).resources[0];
    s = pauseQuick(startQuick(s, 'stopwatch', 480, began, 'same-session'), began + 65000);
    s = stateSchema.parse(attachQuickResource(s, resource.id));
    expect(s.quickTimer).toBeNull();
    expect(s.active).toMatchObject({
      id: 'same-session',
      quickMode: 'stopwatch',
      elapsed: 65,
      segmentStart: null,
      quick: true,
    });
    s = stateSchema.parse(finishQuickResource(s, began + 600000));
    expect(s.active).toBeNull();
    expect(s.sessions[0]).toMatchObject({
      id: 'same-session',
      seconds: 65,
      subject: '생명과학',
      action: '내 학습지',
      quick: true,
      resourceId: resource.id,
    });
  });
  it('counts checked actual problems, preserves all attempts and does not auto-complete tasks', () => {
    let s = material();
    const resource = learning(s).resources[0];
    s = attachQuickResource(startQuick(s, 'countdown', 10, began, 'answer-session'), resource.id);
    s.learning!.problems[0].draft = '내 설명';
    s = recordResourceAttempt(
      s,
      s.learning!.problems[0].id,
      { hintUsed: false, confidence: 'low' },
      began + 30000,
    );
    s = checkResourceAttempt(s, s.learning!.attempts[0].id, 'incorrect', 'concept', began + 40000);
    s = stateSchema.parse(finishQuickResource(s, began + 80000));
    expect(s.sessions[0].seconds).toBe(80);
    expect(s.sessions[0].problems).toBe(1);
    expect(s.learning!.attempts[0]).toMatchObject({ selfCheck: 'incorrect', errorTag: 'concept' });
  });
  it('invalid or foreign problem references never consume the running stopwatch', () => {
    const s = startQuick(material(), 'stopwatch', 480, began, 'invalid-link');
    expect(attachQuickResource(s, 'missing')).toBe(s);
    expect(attachQuickResource(s, s.learning!.resources[0].id, 'foreign')).toBe(s);
  });
  it('editing an older record does not modify its duration, resource, attempts or newer history', () => {
    let s = material();
    const id = s.learning!.resources[0].id;
    s = finishQuickResource(
      attachQuickResource(startQuick(s, 'stopwatch', 480, began, 'older'), id),
      began + 65000,
    );
    const before = JSON.stringify(s.sessions[0]);
    s = finishQuickResource(
      attachQuickResource(startQuick(s, 'stopwatch', 480, began + 100000, 'newer'), id),
      began + 120000,
    );
    const newest = JSON.stringify(s.sessions[1]);
    s = stateSchema.parse(labelQuick(s, 'older', '생명과학', '복습한 내용', '수정'));
    expect(s.sessions[0].seconds).toBe(JSON.parse(before).seconds);
    expect(s.sessions[0].resourceId).toBe(id);
    expect(s.sessions[1]).toEqual(JSON.parse(newest));
  });
});
