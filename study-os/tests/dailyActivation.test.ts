import { it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { parseTimetable } from '../src/timetable';
import { entriesForDay } from '../src/calendar';
import { newState, taskSchema } from '../src/model';
import { INBOX_KEY, newNotice, noticeStatus, attachNoticeResources } from '../src/schoolInbox';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
} from '../src/completeBackup';
import { addVaultPhoto, readVaultPhoto } from '../src/photoVault';
import { sha256 } from '../src/localZip';
function store() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  } as Storage;
}
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
it('bulk schedules use actual weekdays, preserve electives and reject malformed or conflicting rows', () => {
  const schedules = parseTimetable(
    '월\t09:00\t09:50\t물리학Ⅰ\t과학실\n화\t09:00\t09:50\t물리학Ⅱ',
    [],
  );
  expect(entriesForDay({ ...newState(), schedules }, '2026-10-19').map((e) => e.title)).toEqual([
    '물리학Ⅰ',
  ]);
  expect(entriesForDay({ ...newState(), schedules }, '2026-10-20').map((e) => e.title)).toEqual([
    '물리학Ⅱ',
  ]);
  for (const line of [
    '달\t09:00\t09:50\t수학',
    '월\t09:00\t08:00\t수학',
    '월\t9:00\t09:50\t수학',
    '월 수학',
    '월\t09:20\t10:00\t수학',
  ])
    expect(() => parseTimetable(line, schedules)).toThrow();
});
it('notice completion is derived from saved tasks, never draft flags; missing tasks require review', () => {
  const n = newNotice();
  expect(noticeStatus(n, [])).toBe('받은 공지');
  n.reviewed = true;
  n.taskIds = ['not-saved'];
  expect(noticeStatus(n, [])).toBe('정리 확인 필요');
  const task = taskSchema.parse({
    id: 't',
    subject: '영어',
    title: '발표',
    kind: '수행평가',
    due: null,
    priority: 2,
    minutes: 25,
    remaining: 25,
    status: 'done',
    submitted: false,
    optional: false,
    notes: `[학교공지:${n.id}]`,
    link: '',
  });
  expect(noticeStatus(n, [task])).toBe('정리 확인 필요');
  n.taskIds = [task.id];
  n.fullyRegistered = true;
  expect(noticeStatus(n, [task])).toBe('과제 등록 완료');
  expect(attachNoticeResources(newState(), n, task).tasks[0].submitted).toBe(false);
});
it('complete ZIP restores inbox, photo references and exact bytes to a fresh device; merge preserves existing notices', async () => {
  const source = store(),
    target = store();
  const n = newNotice();
  n.text = 'OCR이 실패한 원본';
  n.materials.photoIds = ['original'];
  const blob = new Blob(['original-notice']);
  const digest = await sha256(blob);
  await addVaultPhoto('study', {
    id: 'original',
    name: 'notice.png',
    mime: 'image/png',
    size: blob.size,
    digest,
    bytes: await blob.arrayBuffer(),
  });
  source.setItem(INBOX_KEY, JSON.stringify({ version: 1, notices: [n] }));
  const archive = await exportCompleteBackup(source);
  globalThis.indexedDB = new IDBFactory();
  await restoreCompleteBackup(await inspectCompleteBackup(archive, target), 'merge', target);
  expect(JSON.parse(target.getItem(INBOX_KEY)!).notices[0].text).toBe(n.text);
  expect(await sha256(new Blob([(await readVaultPhoto('study', 'original'))!.bytes]))).toBe(digest);
  const second = newNotice();
  target.setItem(INBOX_KEY, JSON.stringify({ version: 1, notices: [second] }));
  await restoreCompleteBackup(await inspectCompleteBackup(archive, target), 'merge', target);
  expect(JSON.parse(target.getItem(INBOX_KEY)!).notices).toHaveLength(2);
});
it('a ZIP with a missing inbox original is refused rather than claiming backup success', async () => {
  const source = store(),
    n = newNotice();
  n.materials.photoIds = ['missing'];
  source.setItem(INBOX_KEY, JSON.stringify({ version: 1, notices: [n] }));
  await expect(exportCompleteBackup(source)).rejects.toThrow('누락');
});
