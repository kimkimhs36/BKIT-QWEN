import { describe, expect, it } from 'vitest';
import { newNotice } from '../src/schoolInbox';
import { prepareNoticePaste } from '../src/noticePaste';

describe('BKIT school inbox clipboard quick-save', () => {
  it('rejects an empty clipboard rather than adding an empty notice', () => {
    expect(prepareNoticePaste('  \n\t  ', [])).toMatchObject({ kind: 'error' });
  });

  it('accepts useful school or ChatGPT text without interpreting unconfirmed deadlines', () => {
    const result = prepareNoticePaste('  내일 미적분Ⅰ 수행평가: 학습지 3장\n', []);
    expect(result).toEqual({ kind: 'new', text: '내일 미적분Ⅰ 수행평가: 학습지 3장' });
    expect(result).not.toHaveProperty('due');
    expect(result).not.toHaveProperty('submitted');
  });

  it('does not silently truncate long school notices', () => {
    expect(prepareNoticePaste('가'.repeat(12001), []).kind).toBe('error');
    const accepted = prepareNoticePaste('가'.repeat(12000), []);
    expect(accepted.kind).toBe('new');
    if (accepted.kind === 'new') expect(accepted.text.length).toBe(12000);
  });

  it('recognizes duplicates and leaves the original notice untouched', () => {
    const notice = { ...newNotice(), text: '화학 수행평가 안내문', reviewed: true, archived: true };
    const snapshot = JSON.stringify(notice);
    const result = prepareNoticePaste(' \n 화학 수행평가 안내문 \n', [notice]);
    expect(result).toEqual({ kind: 'duplicate', noticeId: notice.id });
    expect(JSON.stringify(notice)).toBe(snapshot);
  });

  it('keeps distinct notices separate and never silently merges coursework', () => {
    const notice = { ...newNotice(), text: '금요일 국어 수행평가' };
    expect(prepareNoticePaste('금요일 영어 수행평가', [notice])).toEqual({
      kind: 'new', text: '금요일 영어 수행평가',
    });
  });
});
