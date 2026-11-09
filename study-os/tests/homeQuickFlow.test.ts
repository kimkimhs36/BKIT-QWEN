import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PremiumHome } from '../src/PremiumHome';
import { newState, stateSchema, type State } from '../src/model';
import { startQuick, pauseQuick, resumeQuick, finishQuick } from '../src/quickTimer';
import type { SleepController } from '../src/useSleepGuard';

const began = Date.parse('2026-11-09T13:00:00+09:00');
const noop = () => {};
const guard = {
  state: { enabled: false, records: [] },
  status: { available: false, phase: 'day' },
} as unknown as SleepController;

function home(state: State, now: number) {
  return renderToStaticMarkup(createElement(PremiumHome, {
    state, now, tasks: state.tasks, sleepGuard: guard, unavailable: '',
    inboxPending: 0, accountConnected: false, onStart: noop, onQuick: noop,
    onQuickPause: noop, onQuickResume: noop, onQuickFinish: noop, onIndependentRetry: noop,
    onOpenDueProblem: noop,
    onNavigate: noop, onAdd: noop, onRecover: noop, onInbox: noop, onOpenNotice: noop,
    onAssessment: noop, onExportCalendar: noop, onAssistant: noop,
    onEdit: noop, onAssessments: noop, onSubmissions: noop,
    onResource: noop, onHelp: noop, onAccount: noop,
  }));
}

describe('actual home quick focus lifecycle', () => {
  it('shows only real controls and a saved receipt after start, pause, reload, resume, finish', () => {
    let state = newState();
    expect(home(state, began)).not.toContain('진행 중인 빠른 집중 관리');

    state = startQuick(state, 'countdown', 10, began, 'home-quick');
    expect(home(state, began + 90_000)).toContain('잠깐 멈추기');
    expect(home(state, began + 90_000)).toContain('01:30 실제 집중');

    state = stateSchema.parse(JSON.parse(JSON.stringify(pauseQuick(state, began + 90_000))));
    const paused = home(state, began + 9 * 60_000);
    expect(paused).toContain('계속 공부하기');
    expect(paused).toContain('01:30 실제 집중');

    state = resumeQuick(state, began + 9 * 60_000);
    state = stateSchema.parse(finishQuick(state, began + 10 * 60_000));
    expect(state.quickTimer).toBeNull();
    expect(state.sessions[0]).toMatchObject({
      id: 'home-quick', seconds: 150, subject: '미분류', taskId: null,
    });
    const finished = home(state, began + 10 * 60_000);
    expect(finished).toContain('최근 집중 02:30 저장됨');
    expect(finished).toContain('혼자 다시 풀기 · 5분');
    expect(finished).toContain('다시 풀 문제 (선택)');
    expect(finished).not.toContain('진행 중인 빠른 집중 관리');
    expect(state.tasks).toHaveLength(0);
  });

  it('does not claim a saved receipt for an unsaved or old session', () => {
    let state = startQuick(newState(), 'countdown', 10, began, 'old-quick');
    state = finishQuick(state, began + 5 * 60_000);
    expect(home(state, began + 40 * 60_000)).not.toContain('최근 집중 05:00 저장됨');
  });
});
