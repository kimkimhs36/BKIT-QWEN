import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Clock3, Play, Plus } from 'lucide-react';
import type { State, Task } from './model';
import { fixedForDay, type Fixed } from './engine';
import { entriesForDay } from './calendar';
import { firstLearningAction, recommendationReason } from './now';
import { clock, dayKey, addDays } from './time';
import { dailyTriage, taskUrgencyLabel } from './dailyTriage';
import { needsAttention, needsSubmission, unsubmittedAssessment } from './tasks';
import { quickClock, quickSeconds } from './quickTimer';
import { studySeconds, elapsed } from './session';

type Props = {
  state: State;
  now: number;
  tasks: Task[];
  next?: Fixed;
  current?: Fixed;
  bedtime?: Fixed;
  resource?: { id: string; title: string } | null;
  onStart: (id?: string) => void;
  onQuick: (minutes?: number) => void;
  onNavigate: (route: string) => void;
  onAdd: () => void;
  onRecover: () => void;
  unavailable: string;
  inboxPending: number | null;
  onInbox: () => void;
  onAssessment: () => void;
  onExportCalendar: () => void;
  onEdit: (task: Task) => void;
  onAssessments: () => void;
  onSubmissions: () => void;
  onResource: (id: string) => void;
  onHelp: () => void;
  onAccount: () => void;
  accountConnected: boolean;
};
export function PremiumHome({
  state,
  now,
  tasks,
  next,
  current,
  bedtime,
  resource,
  onStart,
  onQuick,
  onNavigate,
  onAdd,
  onRecover,
  unavailable,
  inboxPending,
  onInbox,
  onAssessment,
  onExportCalendar,
  onEdit,
  onAssessments,
  onSubmissions,
  onResource,
  onHelp,
  onAccount,
  accountConnected,
}: Props) {
  const triage = dailyTriage(tasks, now);
  const pending = triage.spotlight;
  const awaiting = state.tasks.filter((t) => t.status !== 'done' && unsubmittedAssessment(t));
  const readyToSubmit = state.tasks.filter(needsSubmission);
  const recent = state.sessions.at(-1);
  const active = state.active,
    quick = state.quickTimer,
    busy = !!active || !!quick;
  const seconds = active ? elapsed(active, now) : quick ? quickSeconds(quick, now) : 0;
  const minutes = Math.floor(studySeconds(state.sessions, dayKey(now)) / 60);
  // Default sleep/meal boundaries protect timers, but are not learner appointments.
  const appointment = current && !['sleep', 'meal'].includes(current.kind) ? current : next;
  const todayEntries = entriesForDay(state, dayKey(now));
  const tomorrowEntries = entriesForDay(state, addDays(dayKey(now), 1));
  const schoolToday = todayEntries.filter((entry) => entry.kind === 'school' && entry.schedule);
  const schoolTomorrow = tomorrowEntries.filter((entry) => entry.kind === 'school' && entry.schedule);
  const tomorrowDue = tomorrowEntries.filter((entry) => !!entry.task && !entry.blockId && needsAttention(entry.task));
  const nowClock = clock(now);
  const schoolCurrent = schoolToday.find(
    (entry) => entry.schedule!.start <= nowClock && nowClock < entry.schedule!.end,
  );
  const schoolNext = schoolToday.find((entry) => entry.schedule!.start > nowClock);
  const hasSchoolTimetable = state.schedules.some((item) => item.kind === 'school');
  const deadlineCount = (entries: typeof todayEntries) =>
    entries.filter((e) => e.task && !e.blockId && needsAttention(e.task)).length;
  const remainingPlan = state.plan
    .filter(
      (block) => +new Date(block.end) > now && (!bedtime || +new Date(block.start) < bedtime.start),
    )
    .filter((block) =>
      state.tasks.some((task) => task.id === block.taskId && task.status !== 'done'),
    )
    .sort((a, b) => a.start.localeCompare(b.start));
  let freeMs = bedtime ? Math.max(0, bedtime.start - now) : 0;
  if (bedtime) {
    let cursor = now;
    for (const block of fixedForDay(state, dayKey(now))
      .filter((b) => b.kind !== 'sleep')
      .sort((a, b) => a.start - b.start)) {
      const start = Math.max(cursor, block.start),
        end = Math.min(bedtime.start, block.end);
      if (end > start) {
        freeMs -= end - start;
        cursor = end;
      }
    }
  }
  const availableMinutes = Math.max(0, Math.floor(freeMs / 60000));
  return (
    <div className="study-home">
      <div className="daily-activation" aria-label="첫 60초에 할 수 있는 일">
        <button onClick={onInbox}>학교 공지 보관</button>
        <button onClick={onAssessment}>수행평가 등록</button>
        <button onClick={() => onNavigate('school')}>학교 시간표</button>
        <button onClick={() => onNavigate('materials')}>학습지·공부 자료</button>
      </div>
      <section className="study-school-glance" aria-label="오늘 학교 시간표 빠른 확인">
        <div className="study-school-glance-heading">
          <div className="study-school-glance-title">
            <Clock3 size={18} aria-hidden="true" />
            <strong>오늘 학교 시간표</strong>
          </div>
          <button type="button" className="study-text-link" onClick={() => onNavigate('school')}>
            시간표 전체 <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        {schoolToday.length === 0 ? (
          <p>
            {hasSchoolTimetable
              ? '오늘 등록된 학교 수업이 없어요. 학교 공지의 시간표 변경 여부를 확인해 주세요.'
              : '아직 학교 시간표가 등록되지 않았어요. 등록하면 현재·다음 수업을 바로 확인할 수 있어요.'}
          </p>
        ) : (
          <div className="study-school-glance-entries">
            {schoolCurrent && (
              <p><span>현재 수업</span><strong>{schoolCurrent.title}</strong><small>{schoolCurrent.time}</small></p>
            )}
            {schoolNext && (
              <p><span>다음 수업</span><strong>{schoolNext.title}</strong><small>{schoolNext.time}</small></p>
            )}
            {!schoolCurrent && !schoolNext && (
              <p>오늘 등록된 수업이 모두 끝났거나 진행 중인 수업이 없어요.</p>
            )}
          </div>
        )}
        <small className="study-school-glance-note">
          등록된 정보만 표시해요. 임시 시간표 변경은 학교 공지와 대조해 주세요.
        </small>
        {state.schedules.length > 0 && (
          <button type="button" className="study-text-link study-calendar-export" onClick={onExportCalendar}>
            다음 14일 일정·준비 알림 캘린더로 내보내기
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
        {state.schedules.length > 0 && (
          <small className="study-school-glance-note">
            파일을 내려받은 다음 기기 캘린더에 직접 추가하고 알림 설정을 확인해 주세요.
          </small>
        )}
      </section>
      {(schoolTomorrow.length > 0 || tomorrowDue.length > 0 || hasSchoolTimetable) && (
        <details className="study-tomorrow-preview" aria-label="내일 학교·마감 준비">
          <summary>
            <span className="study-tomorrow-head">
              <strong>내일 미리 챙기기</strong>
              <small>
                {schoolTomorrow.length
                  ? `등록된 수업 ${schoolTomorrow.length}개 · 첫 수업 ${schoolTomorrow[0].title}`
                  : '내일 등록된 수업 미확인'}
                {' · '}마감·제출 확인 {tomorrowDue.length}개
              </small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          <div className="study-tomorrow-content">
            {schoolTomorrow.length > 0 ? (
              <>
                <strong>내일 수업</strong>
                <ol>
                  {schoolTomorrow.map((entry, i) => (
                    <li key={entry.id}>
                      {i + 1}. {entry.title} <small>{entry.time}</small>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p>내일 등록된 수업이 없어요. 시간표 변경이나 휴업 여부는 학교 공지로 확인해 주세요.</p>
            )}
            {tomorrowDue.length > 0 && (
              <>
                <strong>내일 마감·제출 확인</strong>
                {tomorrowDue.map((entry) => (
                  <button
                    type="button"
                    className="study-tomorrow-task"
                    key={entry.id}
                    onClick={() => onEdit(entry.task!)}
                  >
                    <span>{entry.task!.subject} · {entry.task!.title}</span>
                    <small>{needsSubmission(entry.task!) ? '학습 완료 · 제출 확인 필요' : taskUrgencyLabel(entry.task!, now)}</small>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ))}
              </>
            )}
            <small>실제 등록된 일정만 표시해요. 등록되지 않은 공지는 자동으로 알 수 없어요.</small>
          </div>
        </details>
      )}
      {inboxPending !== 0 && (
        <button className="study-submission has-pending" onClick={onInbox}>
          {inboxPending === null
            ? '공지 보관함 저장 상태 확인 필요'
            : `아직 과제로 확인하지 않은 공지 ${inboxPending}개`}
        </button>
      )}
      {appointment && (
        <section className="daily-priority" aria-label="지금 챙길 일정">
          <strong>
            {now < appointment.start
              ? `${clock(appointment.start)} 준비 시작`
              : now < appointment.depart
                ? '이제 준비할 시간이에요'
                : now < appointment.classStart
                  ? '출발 목표를 확인하세요'
                  : '지금 진행 중인 일정'}{' '}
            · {appointment.title}
          </strong>
          <p>
            준비 {clock(appointment.start)} · 출발 목표 {clock(appointment.depart)} · 수업{' '}
            {clock(appointment.classStart)}–{clock(appointment.end)}
          </p>
          {appointment.materials && <p>{appointment.materials}</p>}
          <small>앱 종료 후 알림은 지원하지 않아요.</small>
          <details>
            <summary>준비·이동 시간 계산 안내</summary>
            <p>
              입력한 준비·이동·여유 시간 기준이에요. 미입력 시간은 0분으로 계산돼요. 실제 도착은
              보장하지 않아요. 늦었더라도 안전하게 이동하세요.
            </p>
          </details>
          <button className="study-text-link" onClick={() => onNavigate('school')}>
            일정·준비 시간 확인
          </button>
        </section>
      )}

      <section className="study-start" aria-label="바로 공부 시작">
        <div className="study-start-copy">
          <h2>{busy ? '공부 이어하기' : '공부 시작'}</h2>
          <p>
            {busy
              ? `${active?.subject || '자율 학습'} · ${quickClock(seconds)}`
              : pending[0]
                ? `${pending[0].subject} · ${pending[0].title}`
                : '타이머를 켜고, 가볍게 시작해요.'}
          </p>
          {!busy && pending[0] && (
            <small className="study-recommendation-reason">
              {firstLearningAction(pending[0])} · {recommendationReason(pending[0], now)}
            </small>
          )}
        </div>
        <div className="study-start-actions">
          <button
            disabled={!busy && !!unavailable}
            className="study-start-primary"
            onClick={() =>
              busy ? onNavigate('study') : pending[0] ? onStart(pending[0].id) : onQuick()
            }
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            {busy ? '공부 이어가기' : '지금 공부 시작'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          {!busy && (
            <button
              disabled={!!unavailable}
              className="study-start-five"
              onClick={() => onQuick(5)}
            >
              5분만 시작하기
            </button>
          )}
        </div>
        {!busy && unavailable && (
          <p role="status">
            {unavailable} 과제는 그대로예요. <button onClick={onRecover}>남은 계획 재조정</button>
          </p>
        )}
      </section>
      <section className="study-agenda" aria-label="오늘 해야 할 일">
        {pending.length > 0 && (
          <div className="study-section-heading">
            <h2>
              챙길 과제<span>{triage.total}</span>
            </h2>
            <button className="study-icon" onClick={onAdd} aria-label="오늘 과제 추가">
              <Plus size={20} />
            </button>
          </div>
        )}
        {triage.total > 0 && (
          <p className="study-triage-summary">
            오늘 마감 {triage.today.length} · 기한 지남 {triage.overdue.length} ·
            마감 미확인 {triage.unknown.length}
          </p>
        )}
        {pending.length ? (
          <>
            <div className="study-task-list">
              {pending.slice(0, 3).map((task) => (
                <div className="study-task" key={task.id}>
                  <button className="study-task-copy" onClick={() => onEdit(task)}>
                    <small>
                      {task.subject}
                      <span>
                        {taskUrgencyLabel(task, now)}
                      </span>
                    </small>
                    <strong>{task.title}</strong>
                  </button>
                  <button
                    className="study-icon"
                    aria-label={`${task.title} 5분 시작`}
                    onClick={() => onStart(task.id)}
                  >
                    <Play size={17} />
                  </button>
                </div>
              ))}
            </div>
            <button className="study-text-link" onClick={() => onNavigate('tasks')}>
              {pending.length > 3 ? `${pending.length}개 전체 보기` : '할 일 전체 보기'}
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <div className="study-empty-agenda">
            <p>등록된 미완료 과제가 없어요. 학교 공지에서 빠진 과제가 없는지 확인해요.</p>
            <button className="study-icon" onClick={onAdd} aria-label="오늘 과제 추가">
              <Plus size={20} />
            </button>
          </div>
        )}
        {awaiting.length > 0 && (
          <button className="study-submission has-pending" onClick={onAssessments}>
            <span>아직 제출하지 않은 수행평가 {awaiting.length}개</span>
            <ChevronRight size={17} />
          </button>
        )}
        {readyToSubmit.length > 0 && (
          <button className="study-submission has-pending" onClick={onSubmissions}>
            <span>학습 완료 후 제출 확인 {readyToSubmit.length}개</span>
            <ChevronRight size={17} />
          </button>
        )}
      </section>
      {bedtime && (
        <section className="study-next" aria-label="취침까지 남은 계획">
          <Clock3 size={20} />
          <div>
            <span className="study-kicker">취침 목표 {clock(bedtime.start)}</span>
            <p>식사·등록 일정·준비·이동을 제외한 여유 최대 {availableMinutes}분</p>
            <h3>
              {bedtime.start <= now
                ? '지금은 취침 목표 이후예요'
                : `취침까지 ${Math.max(0, Math.floor((bedtime.start - now) / 60000))}분 · 남은 계획 ${remainingPlan.length}개`}
            </h3>
            <p>
              {remainingPlan.length
                ? '달력에서 남은 계획을 재조정해요. 수면 시간을 줄여 모두 끝낼 필요는 없어요.'
                : '배치된 공부 계획이 없어요. 수면 목표를 지키며 내일로 조정해도 괜찮아요.'}
            </p>
            <button type="button" className="study-text-link" onClick={() => onNavigate('sleep')}>
              취침·기상 목표 확인 <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <button className="study-icon" onClick={onRecover} aria-label="남은 계획 재조정">
            <ArrowUpRight size={20} />
          </button>
        </section>
      )}
      <button
        className="study-day-summary"
        onClick={() => onNavigate('progress')}
        aria-label={`오늘 공부 ${minutes}분, 기록 보기`}
      >
        <span>
          <Clock3 size={19} />
          오늘 공부 시간
        </span>
        <strong>
          {minutes}
          <small>분</small>
          <ChevronRight size={17} />
        </strong>
      </button>
      <section className="study-calendar-summary" aria-label="오늘과 내일 일정 요약">
        <button
          className="study-calendar-link"
          data-icon-feedback
          onClick={() => onNavigate('school')}
          aria-label={`오늘 일정 ${todayEntries.filter((e) => e.schedule).length} · 오늘 마감 ${deadlineCount(todayEntries)} · 내일 마감 ${deadlineCount(tomorrowEntries)} 달력 열기`}
        >
          <span className="study-calendar-stamp" data-touch-icon aria-hidden="true">
            <small>{Number(dayKey(now).slice(5, 7))}월</small>
            <strong>{Number(dayKey(now).slice(-2))}</strong>
          </span>
          <span className="study-calendar-copy">
            <strong>나의 달력</strong>
            <small>
              오늘 일정 {todayEntries.filter((e) => e.schedule).length} · 오늘 마감{' '}
              {deadlineCount(todayEntries)} · 내일 마감 {deadlineCount(tomorrowEntries)}
            </small>
          </span>
          <span className="study-calendar-open">
            달력 열기 <ChevronRight size={16} />
          </span>
        </button>
      </section>
      {(resource || recent) && (
        <section className="study-recent" aria-label="최근 공부 이어하기">
          <BookOpen size={20} />
          <div>
            <span className="study-kicker">{resource ? '최근 자료' : '최근 공부'}</span>
            <h3>{resource?.title || `${recent!.subject} · ${recent!.action}`}</h3>
            <p>
              {resource
                ? '마지막으로 공부한 위치에서 이어가요.'
                : `${Math.floor(recent!.seconds / 60)}분 · ${dayKey(recent!.ended)}`}
            </p>
          </div>
          <button
            className="study-icon"
            onClick={() => (resource ? onResource(resource.id) : onNavigate('progress'))}
            aria-label={resource ? '최근 자료 이어 풀기' : '최근 공부 기록 보기'}
          >
            <ArrowUpRight size={20} />
          </button>
        </section>
      )}
      <div className="study-home-links">
        <button className="study-help-link" onClick={onHelp}>
          처음이라면 · 30초 사용 가이드 <ArrowRight size={15} />
        </button>
        <button className="study-help-link" onClick={onAccount}>
          {accountConnected ? 'Google 연결됨' : 'Google로 이어가기'}
        </button>
      </div>
    </div>
  );
}
