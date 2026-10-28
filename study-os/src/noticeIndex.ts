import type { Task } from './model';
import { noticeStatus, noticeTasks, type SchoolNotice } from './schoolInbox';
import { needsSubmission } from './tasks';

export type NoticeFilter = 'inbox' | 'review' | 'submission' | 'archived' | 'all';

/** Read-only index over the original notices and committed tasks. No inferred deadlines. */
export function findNotices(
  notices: readonly SchoolNotice[],
  tasks: Task[],
  query: string,
  filter: NoticeFilter,
): SchoolNotice[] {
  const terms = query
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return notices
    .filter((notice) => {
      const linked = noticeTasks(notice, tasks);
      if (filter === 'archived' ? !notice.archived : filter !== 'all' && notice.archived)
        return false;
      if (filter === 'review' && noticeStatus(notice, tasks) === '과제 등록 완료') return false;
      if (filter === 'submission' && !linked.some(needsSubmission)) return false;
      const text = [
        notice.text,
        notice.ocrText,
        ...notice.materials.papers.map((p) => p.name),
        ...linked.flatMap((task) => [task.subject, task.title]),
      ]
        .join(' ')
        .normalize('NFKC')
        .toLocaleLowerCase('ko-KR');
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
