import { z } from 'zod';
import { taskSchema, uid, type Task } from './model';
import { parseCapture, captureDeadline } from './capture';
export const VISITED_KEY = 'bkit.atelier.visited.v1';
export const DRAFT_KEY = 'bkit.atelier.draft.v1';
export const missionSchema = z.object({
  id: z.string().max(100),
  title: z.string().max(200),
  subject: z.string().max(200),
  kind: z.enum(['숙제', '수행평가', '시험공부', '개인 일정']),
  due: z.string().max(10),
  dueTime: z.string().max(5),
  quantityUnit: z.enum(['', 'problems', 'pages', 'passages', 'chapters']),
  quantityTotal: z.string().max(5),
  minutes: z.string().max(3),
  attachmentIds: z.array(z.string().max(100)).max(12),
  checked: z.boolean(),
});
export type Mission = z.infer<typeof missionSchema>;
const draftSchema = z.object({
  version: z.literal(1),
  text: z.string().max(3000),
  step: z.enum(['briefing', 'capture', 'prepare']),
  attachmentIds: z.array(z.string().max(100)).max(12),
  missions: z.array(missionSchema).max(20),
});
export type AtelierDraft = z.infer<typeof draftSchema>;
export const emptyDraft = (): AtelierDraft => ({
  version: 1,
  text: '',
  step: 'briefing',
  attachmentIds: [],
  missions: [],
});
export function readDraft(): { draft: AtelierDraft; error: string } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return { draft: raw ? draftSchema.parse(JSON.parse(raw)) : emptyDraft(), error: '' };
  } catch {
    return {
      draft: emptyDraft(),
      error:
        '임시 작성 내용을 읽지 못했습니다. 이 화면에서 새로 입력할 수 있지만 이전 초안은 자동으로 덮어쓰지 않습니다.',
    };
  }
}
export function hasVisited() {
  try {
    return localStorage.getItem(VISITED_KEY) === '1';
  } catch {
    return false;
  }
}
export function rememberVisit() {
  try {
    localStorage.setItem(VISITED_KEY, '1');
  } catch {
    /* Input remains available. */
  }
}
export function createMission(title = '', attachmentIds: string[] = []): Mission {
  const parsed = parseCapture(title);
  // Only an explicitly typed full date is prefilled. Ambiguous dates need a human.
  const explicitDate = title.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/);
  return {
    id: uid(),
    title,
    subject: parsed.subject === '기타' ? '' : parsed.subject,
    kind: parsed.kind,
    due: explicitDate ? parsed.due : '',
    dueTime: explicitDate && parsed.due ? parsed.dueTime : '',
    quantityUnit: parsed.quantityUnit,
    quantityTotal: parsed.quantityTotal ? String(parsed.quantityTotal) : '',
    minutes: '25',
    attachmentIds,
    checked: false,
  };
}
export function prepareMissions(draft: AtelierDraft): Mission[] {
  const lines = draft.text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 20) throw new Error('한 번에 최대 20개 과제까지 준비할 수 있습니다.');
  if (lines.some((s) => s.length > 200)) throw new Error('과제 한 줄을 200자 이내로 나눠 주세요.');
  return (lines.length ? lines : ['']).map((line) => createMission(line, [...draft.attachmentIds]));
}
export function missionToTask(mission: Mission): Task {
  if (!mission.checked) throw new Error('각 과제의 마감과 내용을 확인해 주세요.');
  if (!mission.title.trim() || !mission.subject.trim())
    throw new Error('과목과 과제 내용을 입력해 주세요.');
  if (mission.dueTime && !mission.due)
    throw new Error('마감 시각을 쓰려면 날짜를 함께 입력해 주세요.');
  return taskSchema.parse({
    id: mission.id,
    title: mission.title.trim(),
    subject: mission.subject.trim(),
    kind: mission.kind,
    ...captureDeadline({
      due: mission.due,
      dueTime: mission.dueTime,
      precision: !mission.due ? 'unknown' : mission.dueTime ? 'exact-time' : 'date-only',
      provenance: 'user-confirmed',
    }),
    quantity: mission.quantityUnit
      ? {
          unit: mission.quantityUnit,
          total: Number(mission.quantityTotal),
          remaining: Number(mission.quantityTotal),
        }
      : undefined,
    estimate: {
      minMinutes: Number(mission.minutes),
      maxMinutes: Number(mission.minutes),
      source: 'user',
    },
    minutes: Number(mission.minutes),
    remaining: Number(mission.minutes),
    priority: 2,
    status: 'todo',
    submitted: false,
    optional: false,
    notes: '',
    link: '',
    attachmentIds: mission.attachmentIds,
  });
}
const normalize = (s: string) =>
  s.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
export function sameMission(a: Task, b: Task) {
  return (
    a.id === b.id ||
    (normalize(a.subject) === normalize(b.subject) &&
      normalize(a.title) === normalize(b.title) &&
      a.kind === b.kind &&
      a.due === b.due)
  );
}
/** Replays return existing IDs. New photo references merge without duplicating tasks. */
export function mergeMissions(existing: Task[], incoming: Task[]) {
  const tasks = [...existing],
    ids: string[] = [];
  let duplicates = 0;
  for (const item of incoming) {
    const index = tasks.findIndex((t) => sameMission(t, item));
    if (index >= 0) {
      duplicates++;
      const found = tasks[index];
      tasks[index] = {
        ...found,
        attachmentIds: [
          ...new Set([...(found.attachmentIds || []), ...(item.attachmentIds || [])]),
        ],
      };
      if (tasks[index].attachmentIds!.length > 12)
        throw new Error('같은 과제의 사진은 최대 12장입니다. 사진을 줄여 주세요.');
      ids.push(found.id);
    } else {
      tasks.push(item);
      ids.push(item.id);
    }
  }
  return { tasks, ids: [...new Set(ids)], duplicates };
}
