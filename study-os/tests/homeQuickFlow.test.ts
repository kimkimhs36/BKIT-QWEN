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
    onNavigate: noop, onAdd: noop, onRecover: noop, onInbox: noop, onBackup: noop, onOpenNotice: noop,
    onAssessment: noop, onExportCalendar: noop, onAssistant: noop,
    onEdit: noop, onAssessments: noop, onSubmissions: noop,
    onResource: noop, onHelp: noop, onAccount: noop,
  }));
}

describe('actual home quick focus lifecycle', () => {
  it('shows only real controls and a saved receipt after start, pause, reload, resume, finish', () => {
    let state = newState();
    expect(home(state, began)).not.toContain('진행 중인 빠른 집중 관리');
    // Study state keeps one primary start and the optional five-minute alternative;
    // the sleep routine remains reachable through the global navigation.
    expect(home(state, began)).toContain('5분만 시작하기');
    expect(home(state, began)).not.toContain('수면 루틴</button>');

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

  it('keeps school notice capture visible and progressive secondary actions accessible', () => {
    const html = home(newState(), began);
    expect(html).toContain('복사한 공지 한 번에 보관');
    expect(html).toContain('공지함 · 직접 붙여넣기');
    expect(html).toContain('<details class="bkit-assessment-more"');
    expect(html).toContain('<summary>수행평가 추가 작업</summary>');
    expect(html).toContain('빠진 수행평가 등록');
    expect(html).toContain('제출 미확인 수행평가 보기');
    expect(html).not.toContain('제출 미확인 0건 확인');
  });

  it('links notices to the complete ZIP backup without claiming a file was already saved', () => {
    const html = home(newState(), began);
    expect(html).toContain('공지·수행평가 ZIP 백업으로 이동');
    expect(html).toContain('기기 변경·브라우저 삭제 전에는');
    expect(html).not.toContain('ZIP 백업 완료');
  });

  it('links the learner to a read-only development verification page', () => {
    const html = home(newState(), began);
    expect(html).toContain('개발 현황 · 커밋·테스트 보기');
    expect(html).toContain('dev-status.html');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('does not claim a saved receipt for an unsaved or old session', () => {
    let state = startQuick(newState(), 'countdown', 10, began, 'old-quick');
    state = finishQuick(state, began + 5 * 60_000);
    expect(home(state, began + 40 * 60_000)).not.toContain('최근 집중 05:00 저장됨');
  });
});
