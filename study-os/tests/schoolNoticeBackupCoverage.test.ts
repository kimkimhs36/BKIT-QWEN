import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { newState } from '../src/model';
import { KEY } from '../src/storage';
import { INBOX_KEY, noticeStatus } from '../src/schoolInbox';
import {
  backupMatchesCurrent,
  schoolNoticeBackupContents,
  backupKeysUnchanged,
  snapshotKeys,
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
} from '../src/completeBackup';

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } as Storage;
}

const originalNotice = {
  version: 1,
  notices: [{
    id: 'notice-1',
    createdAt: '2026-11-10T00:00:00.000Z',
    text: '수행평가 공지 원본',
    ocrText: '',
    materials: { photoIds: [], papers: [] },
    reviewed: false,
    archived: false,
    taskIds: [],
  }],
};

describe('school notice ZIP coverage', () => {
  beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

  it('allows a prepared ZIP retry only while school notices and assessments remain unchanged', () => {
    const study = newState();
    const original = JSON.stringify(originalNotice);
    const source = storage({ [KEY]: JSON.stringify(study), [INBOX_KEY]: original });
    const captured = snapshotKeys(source);
    expect(backupKeysUnchanged(captured, source)).toBe(true);
    expect(backupKeysUnchanged(captured, source)).toBe(true); // download retry

    source.setItem(INBOX_KEY, JSON.stringify({ ...originalNotice, notices: [
      ...originalNotice.notices,
      { ...originalNotice.notices[0], id: 'later-notice', text: '새 수행평가 공지' },
    ] }));
    expect(backupKeysUnchanged(captured, source)).toBe(false);

    source.setItem(INBOX_KEY, original);
    study.tasks.push({
      id: 'new-assessment', subject: '역학과 에너지', title: '추가 발표',
      kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
      status: 'todo', submitted: false, submissionRequired: true, optional: false,
      notes: '', link: '',
    });
    source.setItem(KEY, JSON.stringify(study));
    expect(backupKeysUnchanged(captured, source)).toBe(false);
  });

  it('fails closed when another backed-up record changes or storage cannot be read', () => {
    const source = storage();
    const captured = snapshotKeys(source);
    source.setItem('bkit.material.v1', 'updated');
    expect(backupKeysUnchanged(captured, source)).toBe(false);
    expect(() => backupKeysUnchanged(captured, {
      getItem: () => { throw new Error('storage blocked'); },
    } as unknown as Storage)).toThrow('storage blocked');
  });

  it('detects newer local notices without calling an older ZIP complete', async () => {
    const source = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify(originalNotice),
    });
    const zip = await exportCompleteBackup(source);
    const checked = await inspectCompleteBackup(zip, source);
    expect(backupMatchesCurrent(checked).schoolNotices).toBe(true);

    source.setItem(INBOX_KEY, JSON.stringify({
      ...originalNotice,
      notices: [...originalNotice.notices, {
        ...originalNotice.notices[0],
        id: 'notice-2',
        text: '나중에 받은 새로운 공지',
      }],
    }));
    const outdated = await inspectCompleteBackup(zip, source);
    expect(backupMatchesCurrent(outdated).schoolNotices).toBe(false);
    expect(backupMatchesCurrent(outdated).study).toBe(false);
  });


  it('lists ZIP notice and submission without reading or changing live records', async () => {
    const study = newState();
    study.tasks.push({
      id: 'zip-assessment', subject: '역학과 에너지', title: '열기관 실험',
      kind: '수행평가', due: null, priority: 2, minutes: 25, remaining: 25,
      status: 'done', submitted: false, submissionRequired: true, optional: false,
      notes: '', link: '',
    });
    const archivedNotice = {
      ...originalNotice,
      notices: [{
        ...originalNotice.notices[0],
        text: '원본 수행평가 공지\n추가 정보',
        ocrText: 'OCR 인식 글\n정확도 확인 필요',
        taskIds: ['zip-assessment', 'missing-assessment'],
      }],
    };
    const source = storage({ [KEY]: JSON.stringify(study), [INBOX_KEY]: JSON.stringify(archivedNotice) });
    const zip = await exportCompleteBackup(source);
    const target = storage({
      [INBOX_KEY]: JSON.stringify({
        ...originalNotice,
        notices: [{ ...originalNotice.notices[0], id: 'local-only', text: '새 기기의 공지' }],
      }),
    });
    const before = target.getItem(INBOX_KEY);
    const rows = schoolNoticeBackupContents(await inspectCompleteBackup(zip, target));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      preview: '원본 수행평가 공지', savedText: '원본 수행평가 공지\n추가 정보',
      savedOcrText: 'OCR 인식 글\n정확도 확인 필요',
      missingTaskCount: 1, photoCount: 0, paperCount: 0,
    });
    expect(rows[0].tasks).toEqual([expect.objectContaining({
      id: 'zip-assessment', title: '열기관 실험', due: null,
      status: 'done', submitted: false, submissionRequired: true,
    })]);
    expect(target.getItem(INBOX_KEY)).toBe(before);
    expect(target.getItem(KEY)).toBeNull();
  });


  it('keeps the entire 21st ZIP notice available without changing current records', async () => {
    const notices = Array.from({ length: 21 }, (_, i) => ({
      ...originalNotice.notices[0], id: 'notice-' + i,
      text: '공지 ' + i + '\n전체 원문 ' + i, ocrText: i === 20 ? 'OCR 내용' : '',
    }));
    const source = storage({ [KEY]: JSON.stringify(newState()), [INBOX_KEY]: JSON.stringify({ version: 1, notices }) });
    const zip = await exportCompleteBackup(source);
    const target = storage({ [INBOX_KEY]: JSON.stringify(originalNotice) });
    const before = target.getItem(INBOX_KEY);
    const rows = schoolNoticeBackupContents(await inspectCompleteBackup(zip, target));
    expect(rows).toHaveLength(21);
    expect(rows[20]).toMatchObject({ preview: '공지 20', savedText: '공지 20\n전체 원문 20', savedOcrText: 'OCR 내용' });
    expect(target.getItem(INBOX_KEY)).toBe(before);
    expect(target.getItem(KEY)).toBeNull();
  });
  it('does not turn date-only ZIP deadlines into falsely confirmed 23:59 times', async () => {
    const state = newState();
    const common = {
      subject: '물질과 에너지', title: '보고서 제출', kind: '수행평가' as const,
      priority: 2, minutes: 25, remaining: 25,
      status: 'todo' as const, submitted: false, submissionRequired: true,
      optional: false, notes: '', link: '',
    };
    state.tasks.push(
      {
        ...common, id: 'confirmed-day-only', due: '2026-11-15T14:59:00.000Z',
        deadline: { date: '2026-11-15', precision: 'date-only', provenance: 'user-confirmed' },
      },
      {
        ...common, id: 'inferred-day-only', due: '2026-11-16T14:59:00.000Z',
        deadline: { date: '2026-11-16', precision: 'date-only', provenance: 'inferred' },
      },
    );
    const source = storage({
      [KEY]: JSON.stringify(state),
      [INBOX_KEY]: JSON.stringify({
        ...originalNotice,
        notices: [{ ...originalNotice.notices[0], taskIds: ['confirmed-day-only', 'inferred-day-only'] }],
      }),
    });
    const zip = await exportCompleteBackup(source);
    const inspected = await inspectCompleteBackup(zip, storage());
    const [confirmed, inferred] = schoolNoticeBackupContents(inspected)[0].tasks;
    expect(confirmed.deadlineLabel).toBe('2026-11-15 · 시각 미확인');
    expect(inferred.deadlineLabel).toBe('2026-11-16 · 시각 미확인 · 추정 날짜, 원문 재확인');
    expect(confirmed.deadlineLabel).not.toContain('23:59');
    expect(inferred.deadlineLabel).not.toContain('23:59');
  });

  it('does not confuse a live notice with the contents of an unrelated ZIP', async () => {
    const zip = await exportCompleteBackup(storage({ [KEY]: JSON.stringify(newState()) }));
    const target = storage({ [INBOX_KEY]: JSON.stringify(originalNotice) });
    expect(schoolNoticeBackupContents(await inspectCompleteBackup(zip, target))).toEqual([]);
  });

  it('merges an archived notice without deleting a newer local notice', async () => {
    const source = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify(originalNotice),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const newerNotice = {
      ...originalNotice.notices[0],
      id: 'notice-newer',
      text: '기기에서 새로 받은 수행평가 공지',
    };
    const target = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({ ...originalNotice, notices: [newerNotice] }),
    });
    const checked = await inspectCompleteBackup(zip, target);
    expect(backupMatchesCurrent(checked).schoolNotices).toBe(false);
    await restoreCompleteBackup(checked, 'merge', target);
    const restored = JSON.parse(target.getItem(INBOX_KEY)!);
    expect(restored.notices).toHaveLength(2);
    expect(restored.notices.find((notice: { id: string }) => notice.id === 'notice-newer')).toEqual(newerNotice);
    expect(restored.notices.find((notice: { id: string }) => notice.id === 'notice-1')).toEqual(originalNotice.notices[0]);
  });

  it('keeps local edited notice text but restores same-ID task links and review evidence', async () => {
    const assessment = {
      id: 'archived-assessment', subject: '역학과 에너지', title: '열기관 실험',
      kind: '수행평가' as const, due: null, priority: 2, minutes: 25,
      remaining: 25, status: 'done' as const, submitted: false,
      submissionRequired: true, optional: false, notes: '', link: '',
    };
    const archived = newState();
    archived.tasks.push(assessment);
    const source = storage({
      [KEY]: JSON.stringify(archived),
      [INBOX_KEY]: JSON.stringify({
        version: 1, notices: [{
          ...originalNotice.notices[0], reviewed: true,
          fullyRegistered: true, taskIds: [assessment.id],
        }],
      }),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const localNotice = {
      ...originalNotice.notices[0],
      text: '기기에서 수정한 최신 공지 원문',
      reviewed: false,
      taskIds: [] as string[],
    };
    const target = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({ version: 1, notices: [localNotice] }),
    });
    const inspected = await inspectCompleteBackup(zip, target);
    await restoreCompleteBackup(inspected, 'merge', target);
    const saved = JSON.parse(target.getItem(INBOX_KEY)!).notices[0];
    expect(saved).toMatchObject({
      text: localNotice.text, reviewed: true, fullyRegistered: true,
      taskIds: [assessment.id],
    });
    const state = JSON.parse(target.getItem(KEY)!);
    expect(state.tasks.find((task: { id: string }) => task.id === assessment.id))
      .toMatchObject({ status: 'done', submitted: false });
  });

  it('keeps local and archived assessment links when the notice ID matches', async () => {
    const source = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({
        version: 1, notices: [{
          ...originalNotice.notices[0], reviewed: true, taskIds: ['archived-task'],
        }],
      }),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const localNotice = {
      ...originalNotice.notices[0],
      text: '로컬 공지 내용', taskIds: ['local-task'],
    };
    const target = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({ version: 1, notices: [localNotice] }),
    });
    await restoreCompleteBackup(await inspectCompleteBackup(zip, target), 'merge', target);
    const saved = JSON.parse(target.getItem(INBOX_KEY)!).notices[0];
    expect(saved.taskIds).toEqual(['local-task', 'archived-task']);
    expect(saved.text).toBe(localNotice.text);
  });

  it('does not undo a local request to recheck a notice when an old ZIP says complete', async () => {
    const originalTask = {
      id: 'old-zip-assessment', subject: '역학과 에너지', title: '발표 준비',
      kind: '수행평가' as const, due: null, priority: 2, minutes: 25,
      remaining: 25, status: 'done' as const, submitted: false,
      submissionRequired: true, optional: false, notes: '', link: '',
    };
    const archived = newState();
    archived.tasks.push(originalTask);
    const source = storage({
      [KEY]: JSON.stringify(archived),
      [INBOX_KEY]: JSON.stringify({
        version: 1, notices: [{
          ...originalNotice.notices[0], reviewed: true,
          fullyRegistered: true, taskIds: [originalTask.id],
        }],
      }),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();

    // The user explicitly reopened this notice on the receiving device.
    // Importing an older "all checked" record must not close it again.
    const current = {
      ...originalNotice.notices[0],
      text: '현재 기기에서 추가 제출물을 확인 중',
      reviewed: true, fullyRegistered: false, taskIds: [] as string[],
    };
    const target = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({ version: 1, notices: [current] }),
    });
    const checked = await inspectCompleteBackup(zip, target);
    await restoreCompleteBackup(checked, 'merge', target);

    const merged = JSON.parse(target.getItem(INBOX_KEY)!).notices[0];
    const restored = JSON.parse(target.getItem(KEY)!);
    expect(merged.text).toBe(current.text);
    expect(merged.taskIds).toContain(originalTask.id);
    expect(merged.fullyRegistered).toBe(false);
    expect(restored.tasks.find((task: { id: string }) => task.id === originalTask.id))
      .toMatchObject({ status: 'done', submitted: false });
    expect(noticeStatus(merged, restored.tasks)).toBe('정리 확인 필요');
  });

  it('fails closed rather than truncate when same-ID notice links exceed schema capacity', async () => {
    const source = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({
        version: 1, notices: [{
          ...originalNotice.notices[0], taskIds: ['extra-task'],
        }],
      }),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const localNotice = {
      ...originalNotice.notices[0],
      taskIds: Array.from({ length: 100 }, (_, i) => 'local-task-' + i),
    };
    const target = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify({ version: 1, notices: [localNotice] }),
    });
    const before = target.getItem(INBOX_KEY);
    const inspected = await inspectCompleteBackup(zip, target);
    await expect(restoreCompleteBackup(inspected, 'merge', target)).rejects.toThrow();
    expect(target.getItem(INBOX_KEY)).toBe(before);
  });

  it('restores the original school notice from the ZIP on a fresh device', async () => {
    const source = storage({
      [KEY]: JSON.stringify(newState()),
      [INBOX_KEY]: JSON.stringify(originalNotice),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const target = storage();
    const checked = await inspectCompleteBackup(zip, target);
    await restoreCompleteBackup(checked, 'merge', target);
    expect(JSON.parse(target.getItem(INBOX_KEY)!)).toEqual(originalNotice);
  });

  it('restores a linked assessment with its original notice without inventing submission', async () => {
    const assessment = {
      id: 'assessment-1',
      subject: '물질과 에너지',
      title: '실험 보고서',
      kind: '수행평가' as const,
      due: null,
      priority: 2,
      minutes: 20,
      remaining: 20,
      status: 'done' as const,
      submitted: false,
      optional: false,
      notes: '',
      link: '',
    };
    const sourceState = newState();
    sourceState.tasks.push(assessment);
    const linkedNotice = {
      ...originalNotice,
      notices: [{ ...originalNotice.notices[0], taskIds: [assessment.id] }],
    };
    const source = storage({
      [KEY]: JSON.stringify(sourceState),
      [INBOX_KEY]: JSON.stringify(linkedNotice),
    });
    const zip = await exportCompleteBackup(source);
    globalThis.indexedDB = new IDBFactory();
    const target = storage();
    const checked = await inspectCompleteBackup(zip, target);
    await restoreCompleteBackup(checked, 'merge', target);
    const restoredState = JSON.parse(target.getItem(KEY)!);
    const restoredInbox = JSON.parse(target.getItem(INBOX_KEY)!);
    expect(restoredState.tasks.find((task: { id: string }) => task.id === assessment.id))
      .toMatchObject({ status: 'done', submitted: false });
    expect(restoredInbox.notices[0].taskIds).toContain(assessment.id);
    expect(restoredInbox.notices[0].text).toBe('수행평가 공지 원본');
  });
});
