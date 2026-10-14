import { stateSchema, taskSchema, scheduleSchema, type State, type Task, type Schedule } from './model';
import { dayKey, clock, at, iso } from './time';

/**
 * BKIT Cloud Study Hub schema v1. Tasks and Schedules are human-readable
 * Google Sheets tables so ChatGPT's connected Google Drive integration can
 * inspect/edit the same values as BKIT. Private profile/chat data is excluded.
 */
export const TASK_COLUMNS = [
  'id','subject','title','kind','due_date','due_time','deadline_precision',
  'quantity_unit','quantity_total','quantity_remaining','minutes',
  'minutes_remaining','status','submitted','priority','notes','link','optional','modified_at',
] as const;
export const SCHEDULE_COLUMNS = [
  'id','title','subject','kind','weekdays','start','end','prep_minutes',
  'travel_minutes','buffer_minutes','materials','single_date','excluded_dates',
] as const;
export type SheetRows = string[][];
export type SheetBundle = {
  tasks: SheetRows;
  schedules: SheetRows;
  context: SheetRows;
};
export type StudyCloudData = {
  tasks: Task[];
  schedules: Schedule[];
  goal: string;
};
function cell(row: string[], index: number): string {
  return String(row[index] ?? '').trim();
}
function bool(v: string): boolean { return /^(true|yes|1|예|완료)$/i.test(v.trim()); }
function number(v: string, fallback: number): number {
  if (!v.trim()) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function trimEmptyRows(rows: SheetRows): SheetRows {
  return rows.filter(r => r.some(c => String(c ?? '').trim()));
}
function stripHeaders(rows: SheetRows, firstHeader: string): SheetRows {
  const r = [...rows];
  if (r[0]?.[0]?.toLowerCase() === firstHeader) r.shift();
  return trimEmptyRows(r);
}
export function taskToRow(t: Task): string[] {
  const date = t.deadline?.date ?? (t.due ? dayKey(t.due) : '');
  const precision = t.deadline?.precision ?? (t.due ? 'exact-time' : 'unknown');
  return [
    t.id,t.subject,t.title,t.kind,date,
    t.due && precision==='exact-time' ? clock(t.due) : '',
    precision, t.quantity?.unit ?? '',
    String(t.quantity?.total ?? ''),String(t.quantity?.remaining ?? ''),
    String(t.minutes),String(t.remaining),t.status,String(t.submitted),
    String(t.priority),t.notes,t.link,String(t.optional),'',
  ];
}
function rowToTask(r: string[], rowNumber: number): Task {
  const title=cell(r,2),date=cell(r,4),time=cell(r,5),p=cell(r,6);
  const precision = date ? (p === 'date-only' ? 'date-only' : p === 'exact-time' ? 'exact-time' : time ? 'exact-time' : 'date-only') : 'unknown';
  if (date && precision==='exact-time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error(`Tasks ${rowNumber}행: 확정된 마감 시각이 잘못됐어.`);
  const due = date && precision!=='unknown' ? iso(at(date,precision==='date-only'?'23:59':time)) : null;
  const unit=cell(r,7),total=number(cell(r,8),0),remainingUnits=number(cell(r,9),total);
  const quantity=unit ? {unit,total,remaining:remainingUnits} : undefined;
  const mins=number(cell(r,10),25),minsLeft=number(cell(r,11),mins);
  const input={
    id:cell(r,0)||`bkit-cloud-task-${rowNumber}`,
    subject:cell(r,1)||'기타',
    title,kind:cell(r,3)||'숙제',due,
    deadline:date && precision!=='unknown' ? {date,precision,provenance:'user-confirmed'} : undefined,
    quantity,estimate:{minMinutes:mins,maxMinutes:mins,source:'user'},
    minutes:mins,remaining:minsLeft,status:cell(r,12)||'todo',
    submitted:bool(cell(r,13)),priority:number(cell(r,14),2),
    notes:cell(r,15),link:cell(r,16),optional:bool(cell(r,17)),
  };
  const parsed=taskSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Tasks ${rowNumber}행: ${parsed.error.issues[0]?.message ?? '입력 오류'}`);
  return parsed.data;
}
export function scheduleToRow(s: Schedule): string[] {
  return [
    s.id,s.title,s.subject,s.kind,s.days.join(','),s.start,s.end,
    String(s.prep),String(s.travel),String(s.buffer),s.materials,
    s.date ?? '',s.excluded.join('|'),
  ];
}
function rowToSchedule(r: string[], rowNumber: number): Schedule {
  const days=cell(r,4).split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
  const input={
    id:cell(r,0)||`bkit-cloud-schedule-${rowNumber}`,
    title:cell(r,1),subject:cell(r,2),kind:cell(r,3)||'fixed',days,
    start:cell(r,5),end:cell(r,6),prep:number(cell(r,7),0),
    travel:number(cell(r,8),0),buffer:number(cell(r,9),0),
    materials:cell(r,10),date:cell(r,11)||null,
    excluded:cell(r,12)?cell(r,12).split('|').map(s=>s.trim()).filter(Boolean):[],
  };
  const parsed=scheduleSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Schedules ${rowNumber}행: ${parsed.error.issues[0]?.message ?? '입력 오류'}`);
  return parsed.data;
}
export function readStudySheets(bundle: SheetBundle): StudyCloudData {
  const taskRows=stripHeaders(bundle.tasks,'id');
  const scheduleRows=stripHeaders(bundle.schedules,'id');
  const contextRows=stripHeaders(bundle.context,'topic');
  const goal=contextRows.find(row=>cell(row,0)==='GOAL');
  const data={
    tasks:taskRows.map((r,i)=>rowToTask(r,i+2)),
    schedules:scheduleRows.map((r,i)=>rowToSchedule(r,i+2)),
    goal:cell(goal||[],1),
  };
  // Empty study cloud is a valid starting state; unknown columns aren't
  // deserialized into user chat memory or local study state.
  const candidate=stateSchema.safeParse({...emptyState(),tasks:data.tasks,schedules:data.schedules});
  if (!candidate.success) throw new Error('클라우드 데이터에서 중복 ID 또는 잘못된 항목을 발견했어.');
  return data;
}
function emptyState():State {
  return stateSchema.parse({version:1,revision:0,tasks:[],schedules:[],sessions:[],
    active:null,plan:[],undo:null,
    settings:{wake:'07:00',bed:'23:00',minSleep:8,focus:25,mealStart:'18:00',
      mealMinutes:45,breakMinutes:5,goal:''},grades:[],reviewsDone:[],reviewProgress:[]});
}
export function exportStudySheets(s: State): SheetBundle {
  return {
    tasks:[Array.from(TASK_COLUMNS),...s.tasks.map(taskToRow)],
    schedules:[Array.from(SCHEDULE_COLUMNS),...s.schedules.map(scheduleToRow)],
    context:[['topic','note','updated_at'],['BKIT_STATUS','Shared study planning data only',''],['GOAL',s.settings.goal,'']],
  };
}
export function cloudSignature(data: StudyCloudData): string {
  // Avoid including timestamps unrelated to planning.
  return JSON.stringify({
    tasks:data.tasks.map(t=>taskToRow(t).slice(0,18)),
    schedules:data.schedules.map(scheduleToRow),
    goal:data.goal,
  });
}
export function localSignature(s: State): string {
  return cloudSignature({tasks:s.tasks,schedules:s.schedules,goal:s.settings.goal});
}
export function remoteIsEmpty(data: StudyCloudData): boolean {
  return data.tasks.length===0 && data.schedules.length===0 && !data.goal.trim();
}
