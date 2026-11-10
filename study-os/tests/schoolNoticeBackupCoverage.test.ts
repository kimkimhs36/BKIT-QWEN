import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { newState } from '../src/model';
import { KEY } from '../src/storage';
import { INBOX_KEY } from '../src/schoolInbox';
import {
  backupMatchesCurrent,
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
