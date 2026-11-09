import { describe, expect, it } from 'vitest';
import { INBOX_KEY, inboxSchema, newNotice } from '../src/schoolInbox';
import { saveCopiedSchoolNotice } from '../src/homeNoticeCapture';

function memory(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  return {
    getItem: (key: string) => key === INBOX_KEY ? raw : null,
    setItem: (key: string, next: string) => {
      if (key === INBOX_KEY) { raw = next; writes++; }
    },
    current: () => raw,
    writes: () => writes,
  };
}

describe('home -> existing school inbox: one-tap notice capture', () => {
  it('saves a copied announcement as an unreviewed original without inventing an assignment', () => {
    const storage = memory();
    const result = saveCopiedSchoolNotice('  내일 물리 수행평가 발표\n', storage);
    expect(result.kind).toBe('saved');
    const notices = inboxSchema.parse(JSON.parse(storage.current()!)).notices;
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      text: '내일 물리 수행평가 발표',
      reviewed: false, archived: false, taskIds: [],
    });
    expect(notices[0].fullyRegistered).toBeUndefined();
    expect(storage.writes()).toBe(1);
  });
  it('opens the original on a repeated copy without another write', () => {
    const storage = memory();
    const first = saveCopiedSchoolNotice('경제 평가 공지', storage);
    const before = storage.current();
    const next = saveCopiedSchoolNotice('  경제 평가 공지  ', storage);
    expect(next.kind).toBe('duplicate');
    if (first.kind !== 'error' && next.kind !== 'error') expect(next.noticeId).toBe(first.noticeId);
    expect(storage.current()).toBe(before);
    expect(storage.writes()).toBe(1);
  });
  it('leaves malformed existing records untouched rather than erasing them', () => {
    const storage = memory('{broken');
    expect(saveCopiedSchoolNotice('정상 공지', storage).kind).toBe('error');
    expect(storage.current()).toBe('{broken');
    expect(storage.writes()).toBe(0);
  });
  it('does not change an existing archive or reviewed state', () => {
    const old = { ...newNotice(), text: '오래된 공지', reviewed: true, archived: true };
    const initial = JSON.stringify({ version: 1, notices: [old] });
    const storage = memory(initial);
    const saved = saveCopiedSchoolNotice('새 공지', storage);
    expect(saved.kind).toBe('saved');
    expect(inboxSchema.parse(JSON.parse(storage.current()!)).notices[1]).toEqual(old);
  });
  it('never stores empty or oversized clipboard text', () => {
    for (const content of ['   ', '가'.repeat(12001)]) {
      const storage = memory();
      expect(saveCopiedSchoolNotice(content, storage).kind).toBe('error');
      expect(storage.writes()).toBe(0);
    }
  });
  it('does not overwrite a concurrent edit from a second tab', () => {
    const original = JSON.stringify({ version: 1, notices: [] });
    let current = original;
    let reads = 0;
    let writes = 0;
    const storage = {
      getItem: () => {
        reads++;
        if (reads === 2) current = JSON.stringify({ version: 1, notices: [{ ...newNotice(), text: '다른 탭' }] });
        return current;
      },
      setItem: () => { writes++; },
    };
    expect(saveCopiedSchoolNotice('새 공지', storage).kind).toBe('error');
    expect(writes).toBe(0);
  });
  it('reports storage exceptions and never claims a successful save', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(saveCopiedSchoolNotice('학교 공지', storage).kind).toBe('error');
  });
});
