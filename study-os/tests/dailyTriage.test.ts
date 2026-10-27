import { describe, expect, it } from 'vitest';
import { newState, type Task } from '../src/model';
import { captureDeadline, parseCapture } from '../src/capture';
import { dailyTriage, taskDueDay, taskUrgencyLabel } from '../src/dailyTriage';

const now = Date.parse('2026-10-28T07:00:00+09:00');
const sample = newState();
function task(id: string, date?: string, options: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    subject: '미적분Ⅰ',
    kind: '숙제',
    due: date ? captureDeadline({
      due: date, precision: 'date-only', dueTime: '', provenance: 'explicit',
    }).due : null,
    ...(date ? { deadline: {
      date, precision: 'date-only' as const, provenance: 'explicit' as const,
    } } : {}),
    minutes: 25,
    remaining: 25,
    priority: 2,
    status: 'todo',
    submitted: false,
    optional: false,
    notes: '',
    link: '',
    ...options,
  };
}

describe('BKIT school-day command center', () => {
  it('does not mislabel every unfinished task as due today', () => {
    const group = dailyTriage([
      task('overdue', '2026-10-27'),
      task('today', '2026-10-28'),
      task('tomorrow', '2026-10-29'),
      task('later', '2026-11-20'),
      task('no-date'),
      task('completed', '2026-10-28', { status: 'done' }),
    ], now);
    expect(group.total).toBe(5);
    expect(group.overdue.map(t => t.id)).toEqual(['overdue']);
    expect(group.today.map(t => t.id)).toEqual(['today']);
    expect(group.soon.map(t => t.id)).toEqual(['tomorrow']);
    expect(group.later.map(t => t.id)).toEqual(['later']);
    expect(group.unknown.map(t => t.id)).toEqual(['no-date']);
    expect(group.spotlight.slice(0, 3).map(t => t.id))
      .toEqual(['overdue', 'today', 'tomorrow']);
  });

  it('keeps unknown dates unknown and never displays planning 23:59 as a confirmed deadline', () => {
    const unknown = task('uncertain');
    const todayDateOnly = task('exact-date-no-time', '2026-10-28');
    expect(taskDueDay(unknown)).toBeNull();
    expect(taskUrgencyLabel(unknown, now)).toBe('마감 확인 필요');
    expect(taskUrgencyLabel(todayDateOnly, now)).toBe('오늘 마감 · 시각 미확인');
    expect(taskUrgencyLabel(task('late', '2026-10-27'), now)).toContain('기한 지남');
  });

  it('distinguishes an actual clock deadline from a date-only estimate', () => {
    const atSix = task('at-six', undefined, {
      ...captureDeadline({
        due: '2026-10-28', precision: 'exact-time',
        dueTime: '18:00', provenance: 'explicit',
      }),
    });
    expect(taskUrgencyLabel(atSix, now)).toContain('18:00');
    expect(taskUrgencyLabel(atSix, now)).not.toContain('시각 미확인');
  });

  it('does not mutate original tasks while prioritizing', () => {
    const source = [task('later', '2026-11-20'), task('urgent', '2026-10-28')];
    const snapshot = JSON.stringify(source);
    const group = dailyTriage(source, now);
    expect(JSON.stringify(source)).toBe(snapshot);
    expect(group.spotlight[0].id).toBe('urgent');
  });

  it('separates completion from actual submission confirmation', () => {
    const finished = task('done-not-submitted', '2026-10-28', {
      status: 'done', submitted: false, submissionRequired: true,
    });
    expect(dailyTriage([finished], now).total).toBe(0);
    expect(finished.submitted).toBe(false);
  });

  it('recognizes elective courses without combining unrelated subjects', () => {
    const tests: Array<[string, string]> = [
      ['미적분Ⅰ 학습지 10문제', '미적분Ⅰ'],
      ['물질과 에너지 수행평가 3장', '물질과 에너지'],
      ['역학과 에너지 학습지 숙제', '역학과 에너지'],
      ['사회와 문화 수행평가 공지', '사회와 문화'],
      ['소프트웨어 기초 수행평가', '소프트웨어 기초'],
      ['경제 수행평가', '경제'],
      ['정보 학습지 풀기', '정보'],
      ['문학 수행평가', '문학'],
      ['수학 학습지 20문제', '수학'],
      ['화학 숙제 5문제', '화학'],
    ];
    for (const [input, expected] of tests)
      expect(parseCapture(input, now).subject).toBe(expected);
    expect(parseCapture('교실 청소', now).subject).toBe('기타');
    expect(sample.tasks.length).toBe(0);
  });
});
