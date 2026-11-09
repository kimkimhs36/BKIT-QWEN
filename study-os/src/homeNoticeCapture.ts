import { INBOX_KEY, inboxSchema, newNotice } from './schoolInbox';
import { prepareNoticePaste } from './noticePaste';

/**
 * Explicit, device-only clipboard import for the real School Inbox.
 * Never mutates study tasks, deadlines or submissions.
 * This is intentionally synchronous after the user's clipboard permission.
 */
export type HomeNoticeSaveResult =
  | { kind: 'saved' | 'duplicate'; noticeId: string; message: string }
  | { kind: 'error'; message: string };

type NoticeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function saveCopiedSchoolNotice(text: string, storage: NoticeStorage): HomeNoticeSaveResult {
  let original: string | null;
  try {
    original = storage.getItem(INBOX_KEY);
  } catch {
    return { kind: 'error', message: '공지함을 읽지 못했어요. 원본을 덮어쓰지 않았습니다.' };
  }

  let existing;
  try {
    existing = original
      ? inboxSchema.parse(JSON.parse(original))
      : { version: 1 as const, notices: [] };
  } catch {
    return {
      kind: 'error',
      message: '기존 공지함을 읽을 수 없어 새 공지를 저장하지 않았어요. 공지함에서 원본을 먼저 백업해 주세요.',
    };
  }

  const prepared = prepareNoticePaste(text, existing.notices);
  if (prepared.kind === 'error') return prepared;
  if (prepared.kind === 'duplicate') {
    return {
      kind: 'duplicate',
      noticeId: prepared.noticeId,
      message: '이미 보관한 공지입니다. 원본을 다시 열어요.',
    };
  }
  if (existing.notices.length >= 1000) {
    return { kind: 'error', message: '공지함 보관 한도에 도달했어요. 기존 공지를 먼저 백업해 주세요.' };
  }

  const notice = { ...newNotice(), text: prepared.text };
  const updated = inboxSchema.safeParse({
    version: 1,
    notices: [notice, ...existing.notices],
  });
  if (!updated.success) {
    return { kind: 'error', message: '공지 내용을 검증하지 못해 저장하지 않았어요.' };
  }

  try {
    // Fail closed rather than overwrite an edit made in another tab.
    if (storage.getItem(INBOX_KEY) !== original) {
      return { kind: 'error', message: '다른 탭에서 공지가 바뀌었어요. 새로고침 후 다시 시도해 주세요.' };
    }
    storage.setItem(INBOX_KEY, JSON.stringify(updated.data));
  } catch {
    return { kind: 'error', message: '이 기기에 공지를 저장하지 못했어요. 저장 공간과 권한을 확인해 주세요.' };
  }

  return {
    kind: 'saved',
    noticeId: notice.id,
    message: '공지 원문을 이 기기에 보관했어요. 마감과 제출 여부는 직접 확인한 뒤 등록해 주세요.',
  };
}
