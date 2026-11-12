import { describe, expect, it } from 'vitest';
import { findNotices, needsDeadlineConfirmation } from '../src/noticeIndex';
import { formatTaskDeadline } from '../src/capture';
import { newNotice } from '../src/schoolInbox';
import { taskSchema } from '../src/model';

const task = taskSchema.parse({
  id: 'task',
  subject: '물질과 에너지',
  title: '실험 보고서',
  kind: '수행평가',
  due: null,
  priority: 2,
  minutes: 25,
  remaining: 25,
  status: 'done',
  submitted: false,
  submissionRequired: true,
  optional: false,
  notes: '',
  link: '',
});
describe('source-backed notice retrieval', () => {
  it('finds original, OCR, filenames and exact linked subjects without modifying any records', () => {
    const notice = {
      ...newNotice(),
      text: '실험 안내',
      ocrText: '보안경 지참',
      taskIds: [task.id],
    };
    const before = JSON.stringify(notice);
    for (const query of ['실험 안내', '보안경', '물질과 에너지 보고서'])
      expect(findNotices([notice], [task], query, 'inbox')).toEqual([notice]);
    expect(findNotices([notice], [task], '미적분', 'inbox')).toEqual([]);
    expect(JSON.stringify(notice)).toBe(before);
  });
  it('keeps finished work visible for submission until explicitly submitted', () => {
    const notice = { ...newNotice(), taskIds: [task.id], fullyRegistered: true };
    expect(findNotices([notice], [task], '', 'submission')).toEqual([notice]);
    expect(findNotices([notice], [{ ...task, submitted: true }], '', 'submission')).toEqual([]);
    expect(
      findNotices([notice], [{ ...task, submissionRequired: false }], '', 'submission'),
    ).toEqual([]);
    expect(findNotices([notice], [{ ...task, status: 'todo' }], '', 'submission')).toEqual([]);
  });
  it('reopens registration review when a linked task is missing; completed and archived are distinct', () => {
    const notice = { ...newNotice(), taskIds: [task.id], fullyRegistered: true };
    expect(findNotices([notice], [task], '', 'review')).toEqual([]);
    expect(findNotices([notice], [], '', 'review')).toEqual([notice]);
    const archived = { ...notice, archived: true };
    expect(findNotices([archived], [], '', 'review')).toEqual([]);
    expect(findNotices([archived], [], '', 'archived')).toEqual([archived]);
    expect(findNotices([archived], [], '', 'all')).toEqual([archived]);
  });

  it('surfaces only linked, unsubmitted performance assessments with unknown deadline dates', () => {
    const undated = { ...newNotice(), id: 'undated', createdAt: '2026-11-11T10:00:00.000Z', text: '날짜 확인 필요', taskIds: [task.id] };
    const dayOnlyTask = {
      ...task, id: 'day-only', due: '2026-11-15T14:59:00.000Z',
      deadline: { date: '2026-11-15', precision: 'date-only' as const, provenance: 'user-confirmed' as const },
    };
    const dated = { ...newNotice(), id: 'dated', text: '날짜만 확인됨', taskIds: ['day-only'] };
    const submitted = { ...newNotice(), id: 'submitted', text: '이미 제출 확인', taskIds: ['submitted-task'] };
    const archived = { ...newNotice(), id: 'archived', text: '보관함', archived: true, taskIds: [task.id] };
    const unlinked = { ...newNotice(), id: 'unlinked', text: '아직 과제 미등록' };
    const all = [dated, unlinked, submitted, undated, archived];
    const before = JSON.stringify(all);
    const found = findNotices(all, [task, dayOnlyTask, { ...task, id: 'submitted-task', submitted: true }], '', 'deadline');
    expect(found).toEqual([undated]);
    expect(JSON.stringify(all)).toBe(before);
    expect(findNotices([unlinked], [task], '', 'deadline')).toEqual([]);
  });

  it('does not treat inferred year or date as a confirmed school deadline', () => {
    const inferred = { ...task, id: 'inferred', due: '2026-11-20T14:59:00.000Z',
      deadline: { date: '2026-11-20', precision: 'date-only' as const, provenance: 'inferred' as const } };
    const exactInferred = { ...inferred, id: 'inferred-time',
      deadline: { date: '2026-11-20', precision: 'exact-time' as const, provenance: 'inferred' as const } };
    const confirmed = { ...inferred, id: 'confirmed',
      deadline: { ...inferred.deadline, provenance: 'user-confirmed' as const } };
    const notices = [
      { ...newNotice(), id: 'inferred-notice', taskIds: ['inferred'] },
      { ...newNotice(), id: 'inferred-time-notice', taskIds: ['inferred-time'] },
      { ...newNotice(), id: 'confirmed-notice', taskIds: ['confirmed'] },
    ];
    expect(findNotices(notices, [inferred, exactInferred, confirmed], '', 'deadline').map(n => n.id).sort())
      .toEqual(['inferred-notice', 'inferred-time-notice']);
    expect(needsDeadlineConfirmation(confirmed)).toBe(false);
    expect(formatTaskDeadline(inferred)).toContain('추정 날짜, 원문 재확인');
    expect(formatTaskDeadline(exactInferred)).toContain('시각도 재확인');
    expect(formatTaskDeadline(confirmed)).toBe('2026-11-20 · 시각 미확인');
  });
  it('sorts a copy by newest source time and keeps similar notices separate', () => {
    const old = { ...newNotice(), text: '학습지', createdAt: '2026-10-27T23:59:00Z' };
    const recent = { ...newNotice(), text: '학습지 2', createdAt: '2026-10-28T00:00:00Z' };
    const original = [old, recent];
    expect(findNotices(original, [], '학습지', 'all')).toEqual([recent, old]);
    expect(original).toEqual([old, recent]);
  });
});
