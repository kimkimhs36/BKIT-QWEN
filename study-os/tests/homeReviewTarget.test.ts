import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newState, type Session } from '../src/model';
import { ProblemReviewQueue } from '../src/ProblemReviewQueue';

const ended = '2026-11-08T13:00:00+09:00';
const saved = (n: number): Session => ({
  id: 'due-' + n, quick: true, taskId: null, subject: '수학', action: '독립 재풀이',
  started: '2026-11-08T12:50:00+09:00', ended, seconds: 600, target: 10,
  problems: 1, concepts: '', rating: '어려움', reason: '', pauses: [],
  mistake: '', reviewDate: null,
  workspace: {
    problem: '학생이 직접 적은 문제 ' + n, source: '',
    attempts: [{ id: 'ans-' + n, answer: '답안은 숨김', submittedAt: ended,
      selfCheck: 'retry', hintUsed: false }],
  },
});
const markup = (focusSessionId?: string) => renderToStaticMarkup(createElement(
  ProblemReviewQueue,
  { state: { ...newState(), sessions: Array.from({ length: 6 }, (_, i) => saved(i)) },
    today: '2026-11-09', focusSessionId, onAttempt: () => true, onCheck: () => {} },
));
describe('directly selected due review does not get lost in a long list', () => {
  it('shows the exact selected item first, even if it would otherwise be beyond four entries', () => {
    const output = markup('due-5');
    expect(output).toContain('data-review-session="due-5"');
    expect(output.indexOf('data-review-session="due-5"')).toBeLessThan(
      output.indexOf('data-review-session="due-0"'),
    );
    expect(output).toContain('bkit-review-card-selected');
    expect(output).toContain('다시 푼 내 답');
    expect(output).not.toContain('답안은 숨김');
  });
  it('keeps the original order and never fabricates a target for an unknown id', () => {
    const output = markup('absent');
    expect(output.indexOf('data-review-session="due-0"')).toBeLessThan(
      output.indexOf('data-review-session="due-1"'),
    );
    expect(output).not.toContain('bkit-review-card-selected');
  });
});
