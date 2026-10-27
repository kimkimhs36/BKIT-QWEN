import type { SchoolNotice } from './schoolInbox';

/** Validate a clipboard notice before creating ANY new record or modifying local storage.
 * Clipboard content stays entirely on the current device.
 */
export type NoticePasteResult =
  | { kind: 'new'; text: string }
  | { kind: 'duplicate'; noticeId: string }
  | { kind: 'error'; message: string };

export function prepareNoticePaste(raw: string, notices: readonly SchoolNotice[]): NoticePasteResult {
  const text = raw.trim();
  if (!text) return { kind: 'error', message: '클립보드에 글이 없어요. 사진 공지는 새 공지 보관을 사용해 주세요.' };
  if (text.length > 12000)
    return { kind: 'error', message: '공지 글이 12,000자를 넘었어요. 중요한 내용을 나눠서 보관해 주세요.' };
  const matched = notices.find((notice) => notice.text.trim() === text);
  if (matched) return { kind: 'duplicate', noticeId: matched.id };
  return { kind: 'new', text };
}
