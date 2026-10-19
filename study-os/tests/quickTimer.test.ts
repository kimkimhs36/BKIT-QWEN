import { describe, expect, it } from 'vitest';
import { newState, stateSchema } from '../src/model';
import {
  startQuick,
  pauseQuick,
  resumeQuick,
  finishQuick,
  labelQuick,
  quickSeconds,
  quickClock,
  quickDaySeconds,
} from '../src/quickTimer';
const t = (s: string) => Date.parse(s);
describe('start first, record later', () => {
  it('starts without any subject or task, survives JSON reload, and records a stopwatch before labeling', () => {
    let s = startQuick(newState(), 'stopwatch', 480, t('2026-10-19T01:00:00Z'), 'free-1');
    expect(s.quickTimer?.id).toBe('free-1');
    s = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(quickSeconds(s.quickTimer!, t('2026-10-19T01:02:30Z'))).toBe(150);
    s = finishQuick(s, t('2026-10-19T01:02:30Z'));
    expect(s.quickTimer).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].seconds).toBe(150);
    expect(s.sessions[0].subject).toBe('미분류');
    s = labelQuick(s, 'free-1', '수학', '미적분 학습지 3쪽', '절댓값 좌극한');
    expect(stateSchema.parse(s).sessions[0].action).toBe('미적분 학습지 3쪽');
    expect(s.sessions[0].concepts).toBe('절댓값 좌극한');
    expect(quickDaySeconds(s, t('2026-10-19T12:00:00Z'))).toBe(150);
  });
  it('supports pause, reload, resume, and exact segment totals', () => {
    const began = t('2026-10-19T04:00:00Z');
    let s = startQuick(newState(), 'countdown', 25, began, 'free-2');
    s = pauseQuick(s, began + 3 * 60_000);
    s = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(quickSeconds(s.quickTimer!, began + 15 * 60_000)).toBe(180);
    s = resumeQuick(s, began + 20 * 60_000);
    s = finishQuick(s, began + 23 * 60_000);
    expect(s.sessions[0].seconds).toBe(360);
    expect(s.sessions[0].segments).toHaveLength(2);
    expect(stateSchema.safeParse(s).success).toBe(true);
  });
  it('does not overwrite running old-style focus or launch two quick timers', () => {
    const start = t('2026-10-19T04:00:00Z');
    const s = startQuick(newState(), 'stopwatch', 480, start, 'first');
    expect(startQuick(s, 'countdown', 5, start, 'second')).toBe(s);
    expect(startQuick(newState(), 'countdown', 0, start, 'invalid').quickTimer).toBeNull();
  });
  it('does not erase existing study history when a quick session finishes', () => {
    let s = startQuick(newState(), 'stopwatch', 480, t('2026-10-19T00:00:00Z'), 'keep-1');
    s = finishQuick(s, t('2026-10-19T00:01:01Z'));
    expect(s.sessions[0].seconds).toBe(61);
    const before = JSON.stringify(s.sessions[0]);
    s = startQuick(s, 'countdown', 10, t('2026-10-19T00:02:00Z'), 'keep-2');
    s = finishQuick(s, t('2026-10-19T00:03:00Z'));
    expect(JSON.stringify(s.sessions[0])).toBe(before);
    expect(s.sessions).toHaveLength(2);
  });
  it('correctly allocates a cross-midnight quick session to each Korean calendar day', () => {
    const begin = t('2026-10-19T14:59:00Z'); // 23:59 KST
    let s = startQuick(newState(), 'stopwatch', 480, begin, 'midnight');
    s = finishQuick(s, begin + 120_000); // 00:01 KST next day
    expect(quickDaySeconds(s, begin)).toBe(60);
    expect(quickDaySeconds(s, begin + 120_000)).toBe(60);
  });
  it('can attach a finished stopwatch to an existing homework only after studying', () => {
    const initial = newState();
    initial.tasks.push({
      id: 'homework',
      subject: '수학',
      title: '미적분 학습지',
      kind: '숙제',
      due: null,
      priority: 1,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    });
    let s = startQuick(initial, 'stopwatch', 480, t('2026-10-19T02:00:00Z'), 'quick-homework');
    s = finishQuick(s, t('2026-10-19T02:10:00Z'));
    expect(s.sessions[0].taskId).toBeNull();
    s = labelQuick(s, 'quick-homework', '', '', '2쪽까지', 'homework');
    expect(stateSchema.parse(s).sessions[0].taskId).toBe('homework');
    expect(s.sessions[0].subject).toBe('수학');
    expect(s.sessions[0].action).toBe('미적분 학습지');
    expect(s.tasks[0].status).toBe('todo'); // Never auto-complete homework.
  });
  it('formats stopwatch and countdown readouts', () => {
    expect(quickClock(0)).toBe('00:00');
    expect(quickClock(65)).toBe('01:05');
    expect(quickClock(3661)).toBe('1:01:01');
  });
});

// Regression cases exercise persisted schema and real material integration, not timer ticks.
describe('durable quick-study boundaries', () => {
  it('saves more than 102 pause segments without losing study time or midnight allocation', () => {
    const began = t('2026-10-19T14:59:00Z');
    let s = startQuick(newState(), 'stopwatch', 480, began, 'many-pauses');
    for (let i = 0; i < 110; i++) {
      s = resumeQuick(s, began + i * 2000);
      s = stateSchema.parse(pauseQuick(s, began + i * 2000 + 1000));
    }
    s = stateSchema.parse(finishQuick(s, began + 220000));
    expect(s.sessions[0].seconds).toBe(110);
    expect(s.sessions[0].segments).toHaveLength(110);
    expect(quickDaySeconds(s, began)).toBe(30);
    expect(quickDaySeconds(s, began + 220000)).toBe(80);
  });
  it('retains a running timer when session history reaches capacity', () => {
    let s = finishQuick(startQuick(newState(), 'stopwatch', 480, 0, 'original'), 1000);
    const template = s.sessions[0];
    s.sessions = Array.from({ length: 5000 }, (_, i) => ({ ...template, id: 'old-' + i }));
    s = startQuick(s, 'stopwatch', 480, 2000, 'live');
    expect(finishQuick(s, 3000)).toBe(s);
    expect(stateSchema.parse(s).quickTimer?.id).toBe('live');
  });
});

describe('live task attachment without material', () => {
  it('preserves paused segments across reload, linking, resume and finish', async () => {
    const { attachQuickTask, finishQuickResource } = await import('../src/quickTimer');
    const s = newState();
    s.tasks.push({
      id: 'task',
      subject: '영어',
      title: '수행 준비',
      kind: '수행평가',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    });
    let v = pauseQuick(startQuick(s, 'stopwatch', 480, 1000, 'live'), 66000);
    const timer = v.quickTimer!;
    v = stateSchema.parse(attachQuickTask(stateSchema.parse(v), 'task'));
    expect(v.active).toMatchObject({
      id: 'live',
      elapsed: 65,
      segmentStart: null,
      segments: timer.segments,
    });
    expect(v.quickTimer).toBeNull();
    v.active = { ...v.active!, segmentStart: new Date(100000).toISOString() };
    v = stateSchema.parse(finishQuickResource(v, 135000));
    expect(v.sessions[0]).toMatchObject({ seconds: 100, taskId: 'task', subject: '영어' });
    expect(v.tasks[0]).toMatchObject({ status: 'doing', submitted: false });
  });
});
