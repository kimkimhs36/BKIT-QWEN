import { describe, expect, it } from 'vitest';
import { newState, stateSchema, segmentSchema } from '../src/model';
import { startQuick, pauseQuick, finishQuick } from '../src/quickTimer';
import { parseBackup, readState, KEY } from '../src/storage';

const start = Date.parse('2026-10-20T03:00:00Z');
const paused = () => pauseQuick(startQuick(newState(), 'stopwatch', 480, start, 'study'), start + 60_000);

describe('saved clock integrity', () => {
  it('accepts chronological segments with equivalent UTC and offset timestamps', () => {
    expect(segmentSchema.safeParse({
      start: '2026-10-20T12:00:00+09:00', end: '2026-10-20T03:01:00Z',
    }).success).toBe(true);
  });

  it('rejects offset timestamps whose apparent string order hides negative elapsed time', () => {
    expect(segmentSchema.safeParse({
      start: '2026-10-20T03:00:00Z', end: '2026-10-20T03:01:00+09:00',
    }).success).toBe(false);
  });

  it.each(['elapsed mismatch', 'overlap', 'before start', 'running overlap'])(
    'rejects a corrupt quick timer (%s) without replacing original bytes', (kind) => {
      const state = paused();
      const timer = state.quickTimer!;
      if (kind === 'elapsed mismatch') timer.elapsed = 120;
      if (kind === 'overlap') { timer.segments.push({ ...timer.segments[0] }); timer.elapsed = 120; }
      if (kind === 'before start') timer.started = new Date(start + 1_000).toISOString();
      if (kind === 'running overlap') timer.segmentStart = new Date(start + 30_000).toISOString();
      const raw = JSON.stringify(state);
      const storage = {
        getItem: (key: string) => key === KEY ? raw : null,
        setItem: () => { throw new Error('Read validation must never write'); },
      };
      expect(readState(storage).error).not.toBe('');
      expect(() => parseBackup(raw)).toThrow();
      expect(storage.getItem(KEY)).toBe(raw);
    },
  );

  it('rejects two simultaneous study clocks and a live ID already in completed history', () => {
    const state = paused();
    state.active = {
      id: 'other', taskId: null, subject: '수학', action: '복습', target: 5,
      started: new Date(start).toISOString(), elapsed: 0, segmentStart: null, pauses: [],
    };
    expect(stateSchema.safeParse(state).success).toBe(false);
    const finished = finishQuick(paused(), start + 60_000);
    finished.quickTimer = paused().quickTimer;
    expect(stateSchema.safeParse(finished).success).toBe(false);
  });

  it('validates active segment totals but retains older records without segment metadata', () => {
    const state = newState();
    state.active = {
      id: 'active', taskId: null, subject: '수학', action: '복습', target: 5,
      started: new Date(start).toISOString(), elapsed: 60, segmentStart: null, pauses: [],
    };
    expect(stateSchema.safeParse(state).success).toBe(true);
    state.active.segments = [];
    expect(stateSchema.safeParse(state).success).toBe(false);
  });

  it('does not allow non-finite elapsed time to become null during JSON serialization', () => {
    const state = paused();
    state.quickTimer!.elapsed = Infinity;
    expect(stateSchema.safeParse(state).success).toBe(false);
    const history = finishQuick(paused(), start + 60_000);
    history.sessions[0].seconds = Infinity;
    delete history.sessions[0].segments;
    expect(stateSchema.safeParse(history).success).toBe(false);
  });
});
