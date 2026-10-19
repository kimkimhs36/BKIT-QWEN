import { describe, it, expect } from 'vitest';
import { newState, stateSchema } from '../src/model';
import { addResource, moveProblem, learning } from '../src/learningEngine';
import { switchQuestion, questionSeconds } from '../src/drive/questionPace';
import { closeSegment, elapsed } from '../src/session';

describe('question pace uses one study clock', () => {
  it('separates questions, pause time and revisits, including a serialized restore', () => {
    const t = Date.parse('2026-10-19T12:00:00Z');
    let s = addResource(
      newState(),
      {
        title: '수학',
        subject: '수학',
        sourceType: 'school-worksheet',
        linkedTaskId: null,
        linkedMediaIds: [],
      },
      ['첫 문제', '둘째 문제'],
    );
    const [a, b] = learning(s).problems;
    s.active = {
      id: 's',
      taskId: null,
      subject: '수학',
      action: '풀이',
      target: 5,
      resourceId: a.resourceId,
      started: new Date(t).toISOString(),
      segmentStart: new Date(t).toISOString(),
      elapsed: 0,
      pauses: [],
    };
    s.active = switchQuestion(s.active, a.id, t);
    s = moveProblem(s, a.resourceId, b.id, t + 160000);
    expect(questionSeconds(s.active!, a.id, elapsed(s.active!, t + 170000))).toBe(160);
    expect(questionSeconds(s.active!, b.id, elapsed(s.active!, t + 170000))).toBe(10);
    s.active = closeSegment(s.active!, t + 170000);
    s = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(questionSeconds(s.active!, b.id, elapsed(s.active!, t + 800000))).toBe(10);
    s = moveProblem(s, a.resourceId, a.id, t + 800000);
    s.active!.segmentStart = new Date(t + 800000).toISOString();
    expect(questionSeconds(s.active!, a.id, elapsed(s.active!, t + 900000))).toBe(260);
    expect(questionSeconds(s.active!, b.id, elapsed(s.active!, t + 900000))).toBe(10);
    expect(s.active!.questionPace!.review).toEqual([]);
  });
  it('does not invent question time for an older session or a backward clock', () => {
    const a = {
      id: 's',
      taskId: null,
      subject: '수학',
      action: '풀이',
      target: 5,
      started: new Date(0).toISOString(),
      segmentStart: null,
      elapsed: 120,
      pauses: [],
    };
    const initialized = switchQuestion(a, 'p', 0);
    expect(questionSeconds(initialized, 'p', 120)).toBe(0);
    expect(questionSeconds(initialized, 'p', 100)).toBe(0);
  });
});
