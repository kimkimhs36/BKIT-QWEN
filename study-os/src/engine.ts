import { z } from 'zod';
import { type State, type Block, blockSchema } from './model';
import { MIN, at, dayKey, addDays, weekday, iso } from './time';
export type Fixed = {
  id: string;
  title: string;
  kind: string;
  start: number;
  end: number;
  classStart: number;
  depart: number;
  arrive: number;
  materials: string;
};
export const overlap = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;
export function fixedForDay(s: State, day: string): Fixed[] {
  const result: Fixed[] = s.schedules
    .filter(
      (x) => (x.date ? x.date === day : x.days.includes(weekday(day))) && !x.excluded.includes(day),
    )
    .map((x) => {
      const classStart = at(day, x.start),
        depart = classStart - (x.travel + x.buffer) * MIN;
      return {
        id: x.id,
        title: x.title,
        kind: x.kind,
        start: depart - x.prep * MIN,
        end: at(day, x.end),
        classStart,
        depart,
        arrive: depart + x.travel * MIN,
        materials: x.materials,
      };
    });
  // Include previous-day preparation that crosses midnight and next-day early departure.
  for (const neighbor of [addDays(day, -1), addDays(day, 1)])
    for (const x of s.schedules.filter(
      (x) =>
        (x.date ? x.date === neighbor : x.days.includes(weekday(neighbor))) &&
        !x.excluded.includes(neighbor),
    )) {
      const classStart = at(neighbor, x.start),
        depart = classStart - (x.travel + x.buffer) * MIN,
        start = depart - x.prep * MIN,
        end = at(neighbor, x.end);
      if (start < at(addDays(day, 1), '00:00') && end > at(day, '00:00'))
        result.push({
          id: x.id + '@' + neighbor,
          title: x.title,
          kind: x.kind,
          start,
          end,
          classStart,
          depart,
          arrive: depart + x.travel * MIN,
          materials: x.materials,
        });
    }
  const wake = at(day, s.settings.wake),
    nextWake = at(addDays(day, 1), s.settings.wake);
  const bed = Math.min(at(day, s.settings.bed), nextWake - s.settings.minSleep * 60 * MIN);
  result.push(
    {
      id: 'sleep-am',
      title: '수면',
      kind: 'sleep',
      start: at(day, '00:00'),
      end: wake,
      classStart: wake,
      depart: wake,
      arrive: wake,
      materials: '',
    },
    {
      id: 'sleep-pm',
      title: '수면',
      kind: 'sleep',
      start: bed,
      end: at(addDays(day, 1), '00:00'),
      classStart: bed,
      depart: bed,
      arrive: bed,
      materials: '',
    },
  );
  const meal = at(day, s.settings.mealStart);
  result.push({
    id: 'meal',
    title: '식사 · 쉬어가기',
    kind: 'meal',
    start: meal,
    end: meal + s.settings.mealMinutes * MIN,
    classStart: meal,
    depart: meal,
    arrive: meal,
    materials: '',
  });
  return result.sort((a, b) => a.start - b.start);
}
export function nextSchedule(s: State, now: number) {
  return Array.from({ length: 8 }, (_, i) => fixedForDay(s, addDays(dayKey(now), i)))
    .flat()
    .filter((x) => !['sleep', 'meal'].includes(x.kind) && x.end > now)
    .sort((a, b) => a.start - b.start)[0];
}
export const decisionSchema = z.object({
  taskId: z.string(),
  category: z.enum(['KEEP', 'REDUCE', 'MOVE', 'DROP']),
  reason: z.string().min(1).max(400),
  blocks: z.array(blockSchema).max(50),
});
export const recoverySchema = z.object({
  decisions: z.array(decisionSchema).max(500),
  firstAction: z.string().min(1).max(400),
});
export type Recovery = z.infer<typeof recoverySchema>;
function gap(
  s: State,
  day: string,
  earliest: number,
  wanted: number,
  occupied: Block[],
  deadline: number,
  extraFixed: Pick<Fixed, 'start' | 'end'>[] = [],
) {
  const blocked = [
    ...fixedForDay(s, day),
    ...extraFixed,
    ...occupied.map((b) => ({
      start: +new Date(b.start),
      end: +new Date(b.end) + s.settings.breakMinutes * MIN,
    })),
  ].sort((a, b) => a.start - b.start);
  let cursor = Math.max(earliest, at(day, '00:00'));
  const end = Math.min(at(addDays(day, 1), '00:00'), deadline);
  for (const b of blocked) {
    if (b.end <= cursor) continue;
    const available = Math.min(b.start, end) - cursor;
    if (available >= Math.min(5, wanted) * MIN)
      return { start: cursor, end: cursor + Math.min(wanted * MIN, available) };
    cursor = Math.max(cursor, b.end);
    if (cursor >= end) return null;
  }
  return end - cursor >= Math.min(5, wanted) * MIN
    ? { start: cursor, end: cursor + Math.min(wanted * MIN, end - cursor) }
    : null;
}
export function recover(
  s: State,
  now: number,
  extraFixed: Pick<Fixed, 'start' | 'end'>[] = [],
): Recovery {
  const earliest = Math.ceil(now / MIN) * MIN + 2 * MIN;
  const decisions: Recovery['decisions'] = [],
    occupied = s.plan.filter((b) => b.locked && +new Date(b.end) > now);
  const tasks = s.tasks
    .filter((t) => t.status !== 'done')
    .sort(
      (a, b) =>
        (a.due ? +new Date(a.due) : Infinity) - (b.due ? +new Date(b.due) : Infinity) ||
        b.priority - a.priority ||
        a.remaining - b.remaining,
    );
  for (const t of tasks) {
    const locked = occupied.filter((b) => b.taskId === t.id);
    if (locked.length) {
      decisions.push({
        taskId: t.id,
        category: 'KEEP',
        reason: '직접 고정한 시간을 유지합니다. 충돌이 있으면 먼저 수정하세요.',
        blocks: locked,
      });
      continue;
    }
    const deadline = t.due ? +new Date(t.due) : Infinity;
    let found: { start: number; end: number } | null = null,
      dayOffset = 0;
    for (; dayOffset < 7; dayOffset++) {
      found = gap(
        s,
        addDays(dayKey(now), dayOffset),
        earliest,
        Math.min(t.remaining, s.settings.focus),
        occupied,
        deadline,
        extraFixed,
      );
      if (found) break;
    }
    if (found) {
      const b: Block = {
        id: 'recovery-' + t.id,
        taskId: t.id,
        start: iso(found.start),
        end: iso(found.end),
        locked: false,
      };
      occupied.push(b);
      const reduced = (found.end - found.start) / MIN < t.remaining;
      decisions.push({
        taskId: t.id,
        category: dayOffset > 0 ? 'MOVE' : reduced ? 'REDUCE' : 'KEEP',
        reason:
          dayOffset > 0
            ? '오늘의 빈 시간이 부족해 마감 전 가능한 시간으로 옮깁니다.'
            : reduced
              ? '집중 가능한 한 구간부터 합니다. 남은 분량은 과제에 그대로 남습니다.'
              : '마감과 고정 일정을 고려해 오늘 유지합니다.',
        blocks: [b],
      });
    } else
      decisions.push({
        taskId: t.id,
        category: t.optional && !t.due ? 'DROP' : 'REDUCE',
        reason:
          t.optional && !t.due
            ? '마감 없는 선택 활동은 이번 계획에서 제외합니다. 과제 자체는 삭제하지 않습니다.'
            : deadline < now
              ? '마감이 지났습니다. 제출 가능 여부를 확인하세요. 과제를 포기하지 않습니다.'
              : '마감 전 안전한 빈 시간이 없습니다. 범위·기한을 직접 확인해야 합니다.',
        blocks: [],
      });
  }
  const first = decisions
    .flatMap((d) => d.blocks)
    .filter((b) => dayKey(b.start) === dayKey(now) && +new Date(b.start) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  return {
    decisions,
    firstAction: first
      ? `${s.tasks.find((t) => t.id === first.taskId)?.title}: 첫 문제 또는 첫 개념 하나를 5분 동안 시작하세요.`
      : '지금 가능한 과제를 확인하고, 첫 개념 하나를 고르세요. 수면·고정 일정 중에는 쉬거나 이동을 준비하세요.',
  };
}
export function validatePlan(
  s: State,
  blocks: Block[],
  now: number,
  extraFixed: Pick<Fixed, 'start' | 'end'>[] = [],
) {
  const errors: string[] = [];
  if (new Set(blocks.map((b) => b.id)).size !== blocks.length)
    errors.push('중복된 학습 구간 ID입니다.');
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i],
      start = +new Date(b.start),
      end = +new Date(b.end),
      t = s.tasks.find((t) => t.id === b.taskId);
    if (!t || t.status === 'done') errors.push('완료했거나 삭제된 과제는 배치할 수 없습니다.');
    if (start < now) errors.push('이미 지난 시각에는 배치할 수 없습니다.');
    if (
      end <= start ||
      end - start < Math.min(5, t?.remaining || 5) * MIN ||
      dayKey(start) !== dayKey(end - 1)
    )
      errors.push('학습 구간은 같은 날에 남은 분량에 맞게 배치해야 합니다.');
    if (t?.due && end > +new Date(t.due)) errors.push('마감 이후에는 배치할 수 없습니다.');
    if ([...fixedForDay(s, dayKey(start)), ...extraFixed].some((f) => overlap({ start, end }, f)))
      errors.push('수업·준비·이동·식사·수면과 충돌합니다.');
    if (
      i > 0 &&
      overlap(
        { start, end },
        {
          start: +new Date(sorted[i - 1].start),
          end: +new Date(sorted[i - 1].end) + s.settings.breakMinutes * MIN,
        },
      )
    )
      errors.push('학습 구간 또는 휴식 시간이 겹칩니다.');
  }
  for (const t of s.tasks) {
    const total = blocks
      .filter((b) => b.taskId === t.id)
      .reduce((n, b) => n + (+new Date(b.end) - +new Date(b.start)) / MIN, 0);
    if (total > t.remaining) errors.push('남은 과제 시간보다 많이 배치할 수 없습니다.');
  }
  for (const b of s.plan.filter((b) => b.locked && +new Date(b.end) > now)) {
    if (
      !blocks.some(
        (x) =>
          x.id === b.id &&
          x.start === b.start &&
          x.end === b.end &&
          x.taskId === b.taskId &&
          x.locked,
      )
    )
      errors.push('직접 고정한 계획은 유지해야 합니다.');
  }
  return [...new Set(errors)];
}
export function validateRecovery(
  s: State,
  r: Recovery,
  now: number,
  extraFixed: Pick<Fixed, 'start' | 'end'>[] = [],
) {
  const errors = validatePlan(
      s,
      r.decisions.flatMap((d) => d.blocks),
      now,
      extraFixed,
    ),
    pending = s.tasks.filter((t) => t.status !== 'done');
  if (
    r.decisions.length !== pending.length ||
    new Set(r.decisions.map((d) => d.taskId)).size !== r.decisions.length
  )
    errors.push('각 미완료 과제를 한 번씩 검토해야 합니다.');
  for (const d of r.decisions) {
    const t = pending.find((t) => t.id === d.taskId);
    if (!t) errors.push('유효하지 않은 과제입니다.');
    if (d.category === 'DROP' && (!t?.optional || t.due || d.blocks.length))
      errors.push('마감이 있거나 필수인 과제는 생략할 수 없습니다.');
    if (d.blocks.some((b) => b.taskId !== d.taskId)) errors.push('과제 연결이 일치하지 않습니다.');
    if (
      d.category === 'KEEP' &&
      d.blocks.some((b) => dayKey(b.start) !== dayKey(now)) &&
      !d.blocks.every((b) => b.locked)
    )
      errors.push('KEEP은 오늘 계획입니다.');
    if (d.category === 'MOVE' && d.blocks.some((b) => dayKey(b.start) <= dayKey(now)))
      errors.push('MOVE는 이후 날짜여야 합니다.');
  }
  return [...new Set(errors)];
}
export function delayMinutes(s: State, now: number) {
  return s.plan
    .filter(
      (b) =>
        s.tasks.some((t) => t.id === b.taskId && t.status !== 'done') &&
        dayKey(b.start) === dayKey(now) &&
        +new Date(b.start) < now &&
        s.active?.taskId !== b.taskId &&
        !s.sessions.some((x) => x.taskId === b.taskId && dayKey(x.started) === dayKey(b.start)),
    )
    .reduce((n, b) => Math.max(n, Math.floor((now - +new Date(b.start)) / MIN)), 0);
}
