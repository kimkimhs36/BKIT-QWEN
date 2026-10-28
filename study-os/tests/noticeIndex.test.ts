import { describe, expect, it } from 'vitest';
import { findNotices } from '../src/noticeIndex';
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
  it('sorts a copy by newest source time and keeps similar notices separate', () => {
    const old = { ...newNotice(), text: '학습지', createdAt: '2026-10-27T23:59:00Z' };
    const recent = { ...newNotice(), text: '학습지 2', createdAt: '2026-10-28T00:00:00Z' };
    const original = [old, recent];
    expect(findNotices(original, [], '학습지', 'all')).toEqual([recent, old]);
    expect(original).toEqual([old, recent]);
  });
});
