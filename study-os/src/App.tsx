import { AnimatedClock } from './AnimatedClock';
import { MaterialEffects } from './themes/MaterialEffects';
import { RecordOverview } from './RecordOverview';
import { PremiumHome } from './PremiumHome';
import { Modal } from './Modal';
import { MotionConfig } from 'motion/react';
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
  type FormEvent,
} from 'react';
import { TaskMaterials, emptyTaskMaterials, type TaskMaterialDraft } from './TaskMaterials';
import { flushLearning } from './learningFlush';
import { QuickStudyTimer } from './QuickStudyTimer';
import { useGarage } from './drive/useGarage';
import { BREAK_KEY, restoreBrowserBreak, type StudyBreak, type BreakActivity } from './drive/break';
import {
  startQuick,
  pauseQuick,
  resumeQuick,
  finishQuick,
  attachQuickResource,
  attachQuickTask,
  finishQuickResource,
  labelQuick,
  quickSeconds,
  quickClock,
  quickDaySeconds,
  pausedStudySnapshot,
} from './quickTimer';
import {
  learning,
  resourceProgress,
  resourceForTask,
  linkedTaskProgress,
  moveProblem,
  protectResourceTask,
  buildResourceReviews,
  isCompleted,
} from './learningEngine';
import { expireMockExam } from './mockExam';
import { sleepConstraints, studyFixedNow } from './sleepConstraints';
import {
  addProblemRetest,
  buildProblemReviews,
  type AttemptMeta,
  type ErrorTag,
  type ProblemSourceMeta,
} from './problemReview';
import { appendLearningEvent, firstLearningAction, rankInstantTasks, canStartSprint } from './now';
import { QuickCapture } from './QuickCapture';
import { TaskCheckIn } from './TaskCheckIn';
import { LandscapeNote } from './LandscapeNote';
import { HomeEntry } from './HomeEntry';
import { SleepSummary } from './SleepSummary';
import { useViewport } from './useViewport';
import { useSleepGuard } from './useSleepGuard';
import { applyStudyProgress } from './taskProgress';
import { AssistantPanel } from './AssistantPanel';

import { AtelierMissions, StudyAtelier, PrivatePhotoCard } from './StudyAtelier';
import { mergeMissions, sameMission } from './atelier';
import type { AssistantAction } from './assistantLogic';
import { CloudSyncPanel } from './CloudSyncPanel';
import { PrivateSyncPanel, usePrivateStudySync, mergePrivateStudyState } from './PrivateSync';
import { useStudyCloud } from './useStudyCloud';
import { ProblemWorkspace } from './ProblemWorkspace';
import { captureDeadline, formatTaskDeadline, formatQuantity } from './capture';
import { QuickSessionEditor } from './QuickSessionEditor';
import { NowFocus } from './NowFocus';
import { DeadlinePulse } from './DeadlinePulse';
import { AssessmentRadar } from './AssessmentRadar';
import { ApiReadinessPanel } from './ApiReadinessPanel';
import { StudyRhythm } from './StudyRhythm';
import { FocusStayAwake } from './FocusStayAwake';
import { ReviewDeck } from './ReviewDeck';
import { buildReviewQueue, recordReviewOutcome, type ReviewOutcome } from './review';
import { shouldAutoHideFocusUi } from './focusQuiet';
import { FocusHalo } from './FocusHalo';
import {
  materials,
  restoreMaterial,
  saveMaterial,
  type MaterialPreferences,
} from './themes/material';
import { applyTheme, nextTheme, restoreTheme, saveTheme } from './theme';
import { LiquidOptics } from './LiquidOptics';
import { SurrealLiquid } from './themes/SurrealLiquid';
import { WaterDrop } from './WaterDrop';
import { MaterialObject } from './themes/MaterialObject';
import { materialCharacter } from './themes/material';
import { DayTimeline } from './DayTimeline';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Download,
  Focus,
  Home,
  Leaf,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Palette,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
  Menu,
  Moon,
  Sun,
  LockKeyhole,
  Pencil,
  CheckSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  stateSchema,
  newState,
  uid,
  taskSchema,
  scheduleSchema,
  gradeSchema,
  type State,
  type Task,
  type Schedule,
} from './model';
import { at, MIN, clock, dayKey, addDays, fullDate, iso, localInput, fromInput } from './time';
import {
  fixedForDay,
  nextSchedule,
  recover,
  validatePlan,
  validateRecovery,
  delayMinutes,
  recoverySchema,
  type Recovery,
} from './engine';
import { elapsed, studySeconds, todayOutput, closeSegment } from './session';
import { needsSubmission, needsAttention, filteredTasks } from './tasks';
import { inputError } from './input-error';
import { requestAI } from './ai';
import { protectedBoundary, fixedConflicts } from './safety';
import {
  KEY,
  readState,
  writeState,
  parseBackup,
  pausedImportedState,
  StorageConflict,
  LEARNING_BACKUP_KEY,
} from './storage';
const ResourceLibrary = lazy(() =>
  import('./ResourceLibrary').then((m) => ({ default: m.ResourceLibrary })),
);
const MultiProblemWorkspace = lazy(() =>
  import('./MultiProblemWorkspace').then((m) => ({ default: m.MultiProblemWorkspace })),
);
const ResourceReviews = lazy(() =>
  import('./ResourceReviews').then((m) => ({ default: m.ResourceReviews })),
);
const CompleteBackupPanel = lazy(() =>
  import('./CompleteBackupPanel').then((m) => ({ default: m.CompleteBackupPanel })),
);
const SleepGuard = lazy(() => import('./SleepGuard').then((m) => ({ default: m.SleepGuard })));
const MoreHub = lazy(() => import('./MoreHub').then((m) => ({ default: m.MoreHub })));
const ExamPanel = lazy(() => import('./ExamPanel').then((m) => ({ default: m.ExamPanel })));
const LearningEvidence = lazy(() =>
  import('./LearningEvidence').then((m) => ({ default: m.LearningEvidence })),
);
const ProblemReviewQueue = lazy(() =>
  import('./ProblemReviewQueue').then((m) => ({ default: m.ProblemReviewQueue })),
);
const AwakeAssist = lazy(() => import('./AwakeAssist').then((m) => ({ default: m.AwakeAssist })));
const GlobalSearch = lazy(() =>
  import('./GlobalSearch').then((m) => ({ default: m.GlobalSearch })),
);
const StudyDirectory = lazy(() =>
  import('./StudyDirectory').then((m) => ({ default: m.StudyDirectory })),
);
const AIZone = lazy(() => import('./AIZone').then((m) => ({ default: m.AIZone })));
const MaterialSettings = lazy(() =>
  import('./themes/MaterialSettings').then((m) => ({ default: m.MaterialSettings })),
);
const NAV = [
  { id: 'today', en: 'NOW', label: '오늘', icon: Home },
  { id: 'school', en: 'SCHOOL', label: '시간표', icon: CalendarDays },
  { id: 'tasks', en: 'TASKS', label: '과제', icon: CheckSquare },
  { id: 'study', en: 'LEARN', label: '집중', icon: Focus },
  { id: 'progress', en: 'PROGRESS', label: '기록', icon: Target },
  { id: 'settings', en: 'SETTINGS', label: '설정', icon: Settings },
  { id: 'exams', en: 'EXAMS', label: '시험 관리', icon: CalendarDays },
  { id: 'sites', en: 'STUDY LIBRARY', label: '공부 사이트', icon: BookOpen },
  { id: 'ai-zone', en: 'AI INDEX', label: 'BKIT AI ZONE', icon: Sparkles },
  { id: 'materials', en: '', label: '공부 자료', icon: BookOpen },
  { id: 'more', en: 'TOOLS', label: '도구', icon: Menu },
];
const PRIMARY_NAV = ['today', 'study', 'tasks', 'progress', 'more'].map((id) =>
  NAV.find((n) => n.id === id)!,
);
const MORE_ROUTES = ['school', 'settings', 'sleep', 'exams', 'sites', 'ai-zone', 'materials'];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <BookOpen size={25} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export default function App() {
  const modalTrigger = useRef<HTMLElement | null>(null);
  useViewport();
  const [initial] = useState(() => readState(localStorage));
  const [s, setS] = useState<State>(initial.state),
    [storageError, setStorageError] = useState(initial.error),
    [readBlocked, setReadBlocked] = useState(!!initial.error);
  const garageController = useGarage(s, readBlocked, false);
  const [theme, setTheme] = useState(() => restoreTheme(window.localStorage));
  const [material, setMaterial] = useState(() => restoreMaterial(window.localStorage, theme));
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.material = material.id;
    document.documentElement.style.removeProperty('background-color');
    const background = getComputedStyle(document.documentElement)
      .getPropertyValue('--mat-bg')
      .trim();
    if (background)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    document.documentElement.dataset.motion = material.lowPower ? 'off' : material.motion;
    window.dispatchEvent(new Event('bkit:effects'));
  }, [material]);
  function changeMaterial(next: MaterialPreferences) {
    setMaterial(next);
    const base = materials.find((m) => m.id === next.id)!.base;
    setTheme(base);
    if (!saveMaterial(window.localStorage, next) || !saveTheme(window.localStorage, base))
      setNotice('테마를 적용했지만 저장하지 못했어요. 저장 공간을 확인하세요.');
  }
  const changeTheme = () => {
    const next = nextTheme(theme);
    setTheme(next);
    const nextMaterial = {
      ...material,
      id: next === 'dark' ? ('forest' as const) : ('classic' as const),
    };
    setMaterial(nextMaterial);
    saveMaterial(window.localStorage, nextMaterial);
    if (!saveTheme(window.localStorage, next))
      setNotice(
        '화면 모드는 바뀌었지만 브라우저가 설정 저장을 막았어요. 다시 접속하면 원래대로 돌아올 수 있어요.',
      );
  };
  const [atelierOpen, setAtelierOpen] = useState(false);
  const [atelierStep, setAtelierStep] = useState<'capture' | undefined>();
  function openAtelier(step?: 'capture') {
    setAtelierStep(step);
    setAtelierOpen(true);
  }
  const [tab, setTabState] = useState<string>(() => 'today'),
    [now, setNow] = useState(Date.now()),
    [online, setOnline] = useState(navigator.onLine),
    [notice, setNotice] = useState(''),
    [modal, setModal] = useState<
      | null
      | 'capture'
      | 'assistant'
      | 'tools'
      | 'theme'
      | 'task'
      | 'schedule'
      | 'finish'
      | 'recover'
      | 'grade'
      | 'pause'
      | 'block'
      | 'import'
    >(null);
  // A route trail, not browser history: back must never leave the study app.
  const routeTrail = useRef<string[]>([]);
  function setTab(route: string, remember = true) {
    if (['garage', 'juggernaut'].includes(route) || route === tab) return;
    if (flushLearning(() => setTab(route, remember))) {
      if (remember) routeTrail.current = [...routeTrail.current.slice(-39), tab];
      setTabState(route);
    }
  }
  function goBack() {
    const previous = routeTrail.current.at(-1) ?? 'today';
    if (previous === tab) return;
    if (flushLearning(goBack)) {
      routeTrail.current.pop();
      setTabState(previous);
    }
  }
  function toggleSettings() {
    tab === 'settings' ? goBack() : setTab('settings');
  }
  const sleep = useSleepGuard(now, Boolean(s.active));
  const [energy, setEnergy] = useState<'low' | 'normal'>('normal');
  const [taskPresetKind, setTaskPresetKind] = useState<Task['kind']>('숙제');
  const [taskDraftId, setTaskDraftId] = useState<string>(uid);
  const [taskMaterials, setTaskMaterials] = useState<TaskMaterialDraft>(() => emptyTaskMaterials());
  const [taskMaterialBusy, setTaskMaterialBusy] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null),
    [editSchedule, setEditSchedule] = useState<Schedule | null>(null),
    [day, setDay] = useState(dayKey()),
    [duration, setDuration] = useState(25),
    [selected, setSelected] = useState(''),
    [filter, setFilter] = useState('pending'),
    [busy, setBusy] = useState(false),
    [proposal, setProposal] = useState<Recovery | null>(null),
    [proposalRevision, setProposalRevision] = useState(0),
    [mode, setMode] = useState('Demo AI Mode · 규칙 기반'),
    [formError, setFormError] = useState(''),
    [imported, setImported] = useState<State | null>(null),
    [coach, setCoach] = useState(''),
    [focusUiVisible, setFocusUiVisible] = useState(true),
    [updateAvailable, setUpdateAvailable] = useState(false),
    [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const todayDetailsRef = useRef<HTMLDetailsElement>(null);
  const [orbitOpen, setOrbitOpen] = useState(false);
  // A fixed tab bar changes content but not the document's scroll position.
  // Reset before paint, then again after Safari has laid out the new section.
  useLayoutEffect(() => {
    const reset = () => {
      window.scrollTo(0, 0);
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    };
    reset();
    const frame = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(frame);
  }, [tab]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (document.querySelector('dialog[open], [role="dialog"][data-state="open"]')) return;
        e.preventDefault();
        setModal('capture');
        setFormError('');
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  // Quiet mode is deliberate: primary controls never disappear on a timeout.
  useEffect(() => {
    const canHide =
      !s.active?.resourceId &&
      shouldAutoHideFocusUi(tab === 'study', Boolean(s.active?.segmentStart), Boolean(modal)) &&
      !!s.active &&
      !s.active.workspace &&
      elapsed(s.active, Date.now()) < s.active.target * 60;
    if (!canHide) {
      setFocusUiVisible(true);
      return;
    }
    const reveal = (event?: Event) => {
      // Let the dedicated restore button receive its click/keyboard activation
      // before removing it; hover/pointerdown must not detach the target.
      if (event?.target instanceof Element && event.target.closest('.focus-reveal-control')) return;
      setFocusUiVisible(true);
    };
    const mouseMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') reveal(e);
    };
    window.addEventListener('pointerdown', reveal, { passive: true });
    window.addEventListener('touchstart', reveal, { passive: true });
    window.addEventListener('touchmove', reveal, { passive: true });
    window.addEventListener('keydown', reveal);
    window.addEventListener('pointermove', mouseMove, { passive: true });
    reveal();
    return () => {
      window.removeEventListener('pointerdown', reveal);
      window.removeEventListener('touchstart', reveal);
      window.removeEventListener('touchmove', reveal);
      window.removeEventListener('keydown', reveal);
      window.removeEventListener('pointermove', mouseMove);
    };
  }, [
    tab,
    s.active?.id,
    s.active?.segmentStart,
    s.active?.target,
    modal,
    Boolean(s.active?.workspace),
    Boolean(s.active && elapsed(s.active, now) >= s.active.target * 60),
  ]);

  // Default worker lifecycle protects old lazy chunks until all old tabs close.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const report = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller)
        setUpdateAvailable(true);
    };
    const found = () => {
      installing?.removeEventListener('statechange', report);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', report);
      report();
    };
    void navigator.serviceWorker.ready.then((value) => {
      if (disposed) return;
      registration = value;
      registration.addEventListener('updatefound', found);
      found();
    });
    return () => {
      disposed = true;
      registration?.removeEventListener('updatefound', found);
      installing?.removeEventListener('statechange', report);
    };
  }, []);

  const [foregroundId, setForegroundId] = useState(0);
  const foregroundAt = useRef(iso(Date.now()));
  const shownRecommendations = useRef(new Set<string>());
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') {
        foregroundAt.current = iso(Date.now());
        shownRecommendations.current.clear();
        setForegroundId((i) => i + 1);
      }
    };
    document.addEventListener('visibilitychange', visible);
    return () => document.removeEventListener('visibilitychange', visible);
  }, []);
  const storedRaw = useRef(initial.raw);
  const memory = useRef(s);
  memory.current = s;
  // The full learning shell is large: do not re-render it every second when
  // the student is only browsing. Any running study, exam or break keeps the
  // precise 1-second clock; idle screens refresh every 15 seconds instead.
  const precisionClock = Boolean(s.active || s.quickTimer);
  useEffect(() => {
    const tick = () => {
      // Time accounting uses wall-clock timestamps; hidden Safari tabs need no
      // animation work and catch up immediately upon returning to the foreground.
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    tick();
    const timer = window.setInterval(tick, precisionClock ? 1000 : 15000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [precisionClock]);
  useEffect(() => {
    const net = () => setOnline(navigator.onLine);
    const sync = (e: StorageEvent) => {
      if (e.key === KEY) {
        setReadBlocked(true);
        setStorageError(
          '다른 탭에서 데이터가 변경되었습니다. 현재 탭의 기록을 내보낸 뒤 새로고침하세요. 충돌을 막기 위해 저장을 잠갔습니다.',
        );
      }
    };
    window.addEventListener('online', net);
    window.addEventListener('offline', net);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('online', net);
      window.removeEventListener('offline', net);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function commit(change: (v: State) => State, force = false) {
    if (force) {
      const live = readState(localStorage).state;
      if (memory.current.active || memory.current.quickTimer || live.active || live.quickTimer) {
        setFormError('진행 중이거나 일시정지한 타이머를 먼저 종료하세요. 기록은 유지됩니다.');
        setNotice('타이머를 먼저 종료한 뒤 백업을 가져와 주세요.');
        return false;
      }
      if (!flushLearning()) return false;
    }
    if (readBlocked && !force) {
      setNotice('저장 잠금 상태입니다. 설정에서 백업을 먼저 보관하세요.');
      return false;
    }
    try {
      const previous = memory.current;
      let changed = change(previous);
      if (!force && changed !== previous)
        changed = {
          ...changed,
          tasks: changed.tasks.map((t) => {
            const old = previous.tasks.find((p) => p.id === t.id);
            return old?.completedAt
              ? { ...t, completedAt: old.completedAt }
              : old && old.status !== 'done' && t.status === 'done'
                ? { ...t, completedAt: iso(Date.now()) }
                : t;
          }),
        };
      if (changed === previous) return false;
      const next = stateSchema.parse({ ...changed, revision: previous.revision + 1 });
      if (!force)
        for (const task of next.tasks)
          if (
            task.status === 'done' &&
            previous.tasks.find((t) => t.id === task.id)?.status !== 'done'
          )
            protectResourceTask(next, task);
      storedRaw.current = writeState(
        localStorage,
        next,
        force ? undefined : storedRaw.current,
        force ? KEY + '.before-restore.' + Date.now() + '.' + uid() : undefined,
      );
      memory.current = next;
      setS(next);
      setStorageError('');
      if (force) setReadBlocked(false);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message.includes('풀지 않은')) {
        setNotice(e.message);
        setFormError(e.message);
        return false;
      }
      if (e instanceof StorageConflict) {
        setReadBlocked(true);
        setStorageError(e.message);
        return false;
      }
      setStorageError(
        '저장하지 못했습니다. 저장 공간과 입력값을 확인하세요. 화면의 기존 기록은 유지됩니다.',
      );
      setFormError('입력값을 확인하거나 저장 공간을 비운 뒤 다시 시도해주세요.');
      return false;
    }
  }
  const privateSync = usePrivateStudySync(s, (incoming) =>
    commit((v) => mergePrivateStudyState(v, incoming)),
  );
  const cloud = useStudyCloud(s, (incoming) =>
    commit((v) => ({
      ...v,
      tasks: incoming.tasks.map((t) => ({
        ...t,
        attachmentIds: v.tasks.find((local) => local.id === t.id)?.attachmentIds,
        submissionRequired:
          t.submissionRequired ?? v.tasks.find((local) => local.id === t.id)?.submissionRequired,
        capture: t.capture ?? v.tasks.find((local) => local.id === t.id)?.capture,
      })),
      schedules: incoming.schedules,
      // Remote changes may remove/move tasks; never retain orphaned plan blocks.
      plan: [],
      undo: null,
      settings: { ...v.settings, goal: incoming.goal },
    })),
  );
  function applyAssistantAction(action: AssistantAction): boolean {
    if (action.kind === 'add') {
      if (s.tasks.some((t) => sameMission(t, action.task))) return false;
      return commit((v) => ({ ...v, tasks: [...v.tasks, action.task] }));
    }
    const existing = s.tasks.find((t) => t.id === action.taskId && t.title === action.title);
    if (!existing) return false;
    if (action.kind === 'complete') {
      if (existing.status === 'done') return false;
      return commit((v) => ({
        ...v,
        tasks: v.tasks.map((t) => (t.id === action.taskId ? { ...t, status: 'done' as const } : t)),
      }));
    }
    if (existing.status === 'done') return false;
    return commit((v) => ({
      ...v,
      tasks: v.tasks.map((t) =>
        t.id === action.taskId
          ? {
              ...t,
              minutes: action.minutes,
              remaining: Math.min(t.remaining, action.minutes),
              estimate: {
                minMinutes: action.minutes,
                maxMinutes: action.minutes,
                source: 'user' as const,
              },
            }
          : t,
      ),
    }));
  }
  function open(kind: NonNullable<typeof modal>) {
    if (kind === 'finish' && !flushLearning(() => open(kind))) return;
    setFormError('');
    setModal(kind);
  }
  function taskEditor(t: Task | null = null) {
    setTaskDraftId(t?.id ?? uid());
    setTaskMaterials(emptyTaskMaterials(t));
    setEditTask(t);
    setTaskPresetKind(t?.kind ?? '숙제');
    open(t ? 'task' : 'capture');
  }
  function addAssessmentNow() {
    setTaskDraftId(uid());
    setTaskMaterials(emptyTaskMaterials());
    setEditTask(null);
    setTaskPresetKind('수행평가');
    open('task');
  }
  function scheduleEditor(t: Schedule | null = null) {
    setEditSchedule(t);
    open('schedule');
  }
  const sleepFixed = sleepConstraints(sleep.state, now - 86400000, now + 8 * 86400000);
  const today = dayKey(now),
    fixed = studyFixedNow(s, sleep.state, now),
    next = nextSchedule(s, now),
    pending = s.tasks.filter((t) => t.status !== 'done'),
    awaiting = s.tasks.filter(needsSubmission),
    attention = s.tasks.filter(needsAttention),
    todayBlocks = s.plan
      .filter(
        (b) =>
          dayKey(b.start) === today &&
          s.tasks.some((t) => t.id === b.taskId && t.status !== 'done'),
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  const reviewQueue = buildReviewQueue(s, today);
  const problemQueue = useMemo(() => buildProblemReviews(s, today), [s, today]);
  const resourceDue = useMemo(
    () => buildResourceReviews(s, today).filter((c) => c.due <= today),
    [s, today],
  );
  const dueProblems = problemQueue.overdue.length + problemQueue.today.length + resourceDue.length;
  const resumeResource = learning(s)
    .resources.filter((r) => !r.archived && resourceProgress(learning(s), r.id).remainingCount > 0)
    .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))[0];
  const ordered = [...pending].sort(
    (a, b) =>
      (a.due ? +new Date(a.due) : Infinity) - (b.due ? +new Date(b.due) : Infinity) ||
      b.priority - a.priority,
  );
  const attentionOrdered = [...attention].sort(
    (a, b) =>
      (a.due ? +new Date(a.due) : Infinity) - (b.due ? +new Date(b.due) : Infinity) ||
      b.priority - a.priority,
  );
  const visibleTasks = filteredTasks(s.tasks, filter);
  const activeMaterials = s.tasks.find((t) => t.id === s.active?.taskId)?.attachmentIds || [];
  const current = fixed.find((f) => f.start <= now && f.end > now),
    nextBlock = todayBlocks.find((b) => +new Date(b.end) > now),
    actionTask = rankInstantTasks(
      pending,
      now,
      Math.max(
        0,
        Math.floor(((fixed.find((f) => f.start > now)?.start ?? now + 60 * MIN) - now) / MIN),
      ),
      energy === 'low',
    )[0];
  const recommendationTask =
    selected === '__free__' ? undefined : (pending.find((t) => t.id === selected) ?? actionTask);
  const recommendationReady = canStartSprint(
    now,
    !!current,
    fixed.find((f) => f.start > now)?.start ?? null,
  );
  useEffect(() => {
    if (
      !recommendationReady ||
      tab !== 'today' ||
      s.active ||
      current ||
      document.visibilityState !== 'visible' ||
      readBlocked
    )
      return;
    const key =
      (recommendationTask?.id ?? '__free__') +
      '|' +
      firstLearningAction(recommendationTask, energy === 'low');
    if (shownRecommendations.current.has(key)) return;
    shownRecommendations.current.add(key);
    commit((v) =>
      appendLearningEvent(v, {
        id: uid(),
        type: 'RecommendationShown',
        at: iso(Date.now()),
        foregroundAt: foregroundAt.current,
        taskId: recommendationTask?.id ?? null,
        sessionId: null,
        action: firstLearningAction(recommendationTask, energy === 'low'),
      }),
    );
  }, [
    tab,
    recommendationTask?.id,
    s.active?.id,
    current?.id,
    readBlocked,
    foregroundId,
    recommendationReady,
    energy,
    recommendationTask?.quantity?.remaining,
  ]);
  const conflicts = fixedConflicts(s, day);
  useEffect(() => {
    const a = s.active;
    if (!a?.segmentStart) return;
    const boundary = protectedBoundary(
      s,
      +new Date(a.segmentStart),
      now,
      sleepConstraints(sleep.state, +new Date(a.segmentStart), now),
    );
    if (
      boundary &&
      commit((v) => ({
        ...v,
        active: {
          ...closeSegment(a, boundary.at),
          pauses: [
            ...a.pauses,
            { at: iso(boundary.at), reason: boundary.title + ' 시작 · 자동 일시정지' },
          ],
        },
      }))
    )
      setNotice(boundary.title + '에 맞춰 타이머를 멈췄습니다. 실제 공부한 양만 기록하세요.');
  }, [now, s.active, sleep.state]);
  const canStudy = !current;
  const seconds = s.active ? elapsed(s.active, now) : 0;
  const quickElapsed = s.quickTimer ? quickSeconds(s.quickTimer, now) : 0;
  const quickRecent = [...s.sessions].reverse().find((entry) => entry.quick);
  const [historyEditingId, setHistoryEditingId] = useState<string | null>(null);
  const quickToday = quickDaySeconds(s, now);
  function beginQuick(mode: 'stopwatch' | 'countdown', target: number) {
    if (!flushLearning(() => beginQuick(mode, target))) return;
    if (s.active || s.quickTimer) {
      setNotice('기존 타이머가 진행 중입니다. 먼저 마무리해 주세요.');
      return;
    }
    const started = Date.now();
    if (commit((v) => startQuick(v, mode, target, started, uid())))
      setNotice('기록 없이 바로 시작! 공부가 끝나면 시간을 먼저 저장할게요.');
  }
  function pauseQuickNow() {
    commit((v) => pauseQuick(v, Date.now()));
  }
  function resumeQuickNow() {
    if (s.quickTimer && s.quickTimer.segments.length >= 10000) {
      setNotice('이 세션의 구간 한도에 도달했어요. 시간을 저장한 뒤 새 공부를 시작하세요.');
      return;
    }
    commit((v) => resumeQuick(v, Date.now()));
  }
  function finishQuickNow() {
    if (!flushLearning(finishQuickNow)) return;
    if (memory.current.sessions.length >= 5000) {
      setNotice(
        '기록 한도 5,000개에 도달했어요. 타이머는 유지됩니다. 설정에서 ZIP 백업을 보관하세요.',
      );
      return;
    }
    const id = memory.current.quickTimer?.id;
    if (id && commit((v) => finishQuick(v, Date.now()))) {
      setQuickEditingId(id);
      setNotice('공부 시간 저장 완료. 과목이나 메모는 나중에 적어도 돼요.');
    }
  }
  function saveQuickLabel(
    id: string,
    subject: string,
    action: string,
    note: string,
    taskId?: string,
  ) {
    return commit((v) => labelQuick(v, id, subject, action, note, taskId));
  }
  const quickProps = {
    timer: s.quickTimer,
    now,
    todaySeconds: quickToday,
    last: quickRecent,
    tasks: s.tasks,
    editingId: quickEditingId,
    focusBusy: !!s.active,
    onStart: beginQuick,
    onPause: pauseQuickNow,
    onResume: resumeQuickNow,
    onFinish: finishQuickNow,
    onAttachTask: (id: string) => start(5, id),
    onLabel: saveQuickLabel,
    onCloseEdit: () => setQuickEditingId(null),
  };
  const late = delayMinutes(s, now);
  function start(
    minutes: number,
    task = selected || actionTask?.id || null,
    resourceId?: string,
    problemId?: string,
    examCount?: number,
  ) {
    if (!flushLearning(() => start(minutes, task, resourceId, problemId, examCount))) return;
    if (examCount && (s.active || s.quickTimer)) {
      setNotice('진행 중인 학습을 저장하고 종료한 뒤 모의시험을 시작하세요.');
      return;
    }
    if (s.quickTimer && resourceId) {
      if (commit((v) => attachQuickResource(v, resourceId, problemId))) {
        setTab('study');
        setNotice('먼저 시작한 시간 그대로, 자료를 이어서 공부해요.');
      }
      return;
    }
    if (s.quickTimer) {
      const linked = resourceForTask(s, task ?? undefined);
      if (
        commit((v) => (linked ? attachQuickResource(v, linked.id) : attachQuickTask(v, task ?? '')))
      ) {
        setTab('study');
        setNotice('시작한 시간 그대로 과제에 연결했어요. 완료와 제출은 따로 기록해 주세요.');
      } else {
        setTab('today');
        setNotice('연결할 미완료 과제를 선택해 주세요. 타이머는 유지돼요.');
      }
      return;
    }
    if (s.active) {
      if (resourceId && resourceId !== s.active.resourceId)
        setNotice('현재 학습을 종료한 뒤 다른 자료를 열어 주세요.');
      else if (resourceId && problemId) commit((v) => moveProblem(v, resourceId, problemId));
      setTab('study');
      return;
    }
    const currentTime = Date.now(),
      block = studyFixedNow(s, sleep.state, currentTime).find(
        (f) => f.start <= currentTime && f.end > currentTime,
      );
    if (block) {
      setNotice(`${block.title} 시간입니다. 고정 일정과 수면을 먼저 지켜주세요.`);
      return;
    }
    const future = studyFixedNow(s, sleep.state, currentTime).find((f) => f.start > currentTime);
    if (future && future.start < currentTime + minutes * MIN) {
      setNotice(`${clock(future.start)} ${future.title} 전에 끝나는 짧은 세션을 선택하세요.`);
      return;
    }
    const t = s.tasks.find((t) => t.id === task && t.status !== 'done');
    const resource =
      learning(s).resources.find((r) => r.id === resourceId) ??
      (!resourceId ? resourceForTask(s, t?.id) : undefined);
    if (t?.quantity?.remaining === 0 && !resource) {
      setFilter('pending');
      setTab('tasks');
      setNotice('기록한 남은 분량은 0입니다. 학습 완료와 제출 여부를 직접 확인해 주세요.');
      return;
    }
    const sessionId = uid();
    if (
      commit((v) => ({
        ...appendLearningEvent(v, {
          id: uid(),
          type: 'StudyStarted',
          at: iso(currentTime),
          foregroundAt: foregroundAt.current,
          taskId: t?.id ?? null,
          sessionId,
          action: firstLearningAction(t, energy === 'low'),
        }),
        active: {
          id: sessionId,
          taskId: t?.id || null,
          resourceId: resource?.id,
          exam:
            examCount && resource
              ? {
                  duration: minutes * 60,
                  problemIds: learning(v)
                    .problems.filter((p) => p.resourceId === resource.id)
                    .sort((a, b) => a.ordinal - b.ordinal)
                    .slice(0, examCount)
                    .map((p) => p.id),
                  finishedAt: null,
                }
              : undefined,
          questionPace: resource
            ? {
                current:
                  problemId ?? resourceProgress(learning(v), resource.id).currentProblemId ?? '',
                anchor: 0,
                enteredAt: iso(currentTime),
                seconds: {},
                target: 240,
                review: [],
              }
            : undefined,
          subject: resource?.subject || t?.subject || '자율 학습',
          action: resource?.title || t?.title || '첫 개념을 가리고 떠올린 뒤, 문제 하나 풀기',
          target: minutes,
          started: iso(currentTime),
          segmentStart: iso(currentTime),
          elapsed: 0,
          pauses: [],
          segments: [],
        },
        tasks: v.tasks.map((x) => (x.id === t?.id ? { ...x, status: 'doing' } : x)),
        learning: resource
          ? learning(
              moveProblem(
                v,
                resource.id,
                problemId ?? resourceProgress(learning(v), resource.id).currentProblemId ?? '',
              ),
            )
          : v.learning,
      }))
    ) {
      setTab('study');
      setNotice('시작했어요. 첫 한 문제에 집중하세요.');
    }
  }
  function openResource(id: string, problemId?: string) {
    const r = learning(memory.current).resources.find((r) => r.id === id);
    if (r) start(5, r.linkedTaskId, id, problemId);
  }
  useEffect(() => {
    if (s.active?.exam && !s.active.exam.finishedAt && seconds >= s.active.exam.duration)
      commit((v) => expireMockExam(v, Date.now()));
  }, [now, s.active?.id, s.active?.exam?.finishedAt, seconds]);
  function startMockExam(id: string, minutes: number, count: number) {
    const r = learning(memory.current).resources.find((r) => r.id === id);
    const first = learning(memory.current)
      .problems.filter((p) => p.resourceId === id)
      .sort((a, b) => a.ordinal - b.ordinal)[0];
    if (r && first) start(minutes, r.linkedTaskId, id, first.id, count);
  }
  function finishResource() {
    if (!flushLearning(finishResource)) return;
    const a = memory.current.active;
    if (!a) return;
    if (a.quick) {
      if (commit((v) => finishQuickResource(v, Date.now()))) {
        setQuickEditingId(a.id);
        setTab('today');
        setNotice('공부 시간과 문제 기록을 저장했어요. 메모는 나중에 적어도 돼요.');
      } else if (memory.current.sessions.length >= 5000)
        setNotice('기록 한도에 도달했어요. 타이머와 답안은 유지됩니다. ZIP 백업을 보관하세요.');
      return;
    }
    if (commit((v) => ({ ...v, active: closeSegment(a, Date.now()) }))) open('finish');
  }
  function handleReview(sessionId: string, outcome: ReviewOutcome) {
    const saved = commit((v) => recordReviewOutcome(v, sessionId, outcome, Date.now()));
    if (saved)
      setNotice(
        outcome === 'retry' ? '내일 다시 연습하도록 기록했어요.' : '다음 복습 날짜를 갱신했어요.',
      );
    return saved;
  }
  function setLearningProblem(problem: string, source: string, meta: ProblemSourceMeta) {
    if (!s.active || s.active.workspace) return;
    if (
      commit((v) =>
        v.active
          ? {
              ...v,
              active: { ...v.active, workspace: { problem, source, ...meta, attempts: [] } },
            }
          : v,
      )
    )
      setNotice('문제를 준비했어. 이제 내 답을 먼저 적어봐.');
  }
  function addLearningAttempt(answer: string, meta: AttemptMeta) {
    if (!s.active?.workspace || s.active.workspace.attempts.length >= 20) return false;
    const saved = commit((v) => {
      if (!v.active?.workspace) return v;
      return {
        ...appendLearningEvent(v, {
          id: uid(),
          type: 'FirstLearningAttempt',
          at: iso(Date.now()),
          foregroundAt: foregroundAt.current,
          taskId: v.active.taskId,
          sessionId: v.active.id,
          action: v.active.action,
        }),
        active: {
          ...v.active,
          workspace: {
            ...v.active.workspace,
            attempts: [
              ...v.active.workspace.attempts,
              {
                id: uid(),
                answer,
                submittedAt: iso(Date.now()),
                selfCheck: 'unreviewed' as const,
                ...meta,
              },
            ],
          },
        },
      };
    });
    if (saved) setNotice('내 답을 저장했어. 해설을 확인한 뒤 스스로 평가해.');
    return saved;
  }
  function markLearningAttempt(
    attemptId: string,
    outcome: 'remembered' | 'retry',
    errorTag?: ErrorTag,
  ) {
    if (!s.active?.workspace) return;
    if (
      commit((v) => {
        if (!v.active?.workspace) return v;
        return {
          ...v,
          active: {
            ...v.active,
            workspace: {
              ...v.active.workspace,
              attempts: v.active.workspace.attempts.map((a) =>
                a.id === attemptId && a.selfCheck === 'unreviewed'
                  ? {
                      ...a,
                      selfCheck: outcome,
                      errorTag: outcome === 'retry' ? (errorTag ?? 'unknown') : undefined,
                    }
                  : a,
              ),
            },
          },
        };
      })
    )
      setNotice(
        outcome === 'retry' ? '재시도할 수 있어. 답을 다시 써봐.' : '자가 확인을 기록했어.',
      );
  }
  function recordProblemRetest(sessionId: string, answer: string, meta: AttemptMeta) {
    if (!answer.trim()) return false;
    return commit((v) =>
      addProblemRetest(
        v,
        sessionId,
        {
          id: uid(),
          answer: answer.trim(),
          submittedAt: iso(Date.now()),
          selfCheck: 'unreviewed',
          ...meta,
        },
        Date.now(),
      ),
    );
  }
  function checkProblemRetest(id: string, outcome: 'remembered' | 'retry') {
    commit((v) => ({
      ...v,
      problemRetests: (v.problemRetests ?? []).map((a) =>
        a.id === id && a.selfCheck === 'unreviewed' ? { ...a, selfCheck: outcome } : a,
      ),
      sessions: v.sessions.map((session) =>
        session.workspace
          ? {
              ...session,
              workspace: {
                ...session.workspace,
                attempts: session.workspace.attempts.map((a) =>
                  a.id === id && a.selfCheck === 'unreviewed' ? { ...a, selfCheck: outcome } : a,
                ),
              },
            }
          : session,
      ),
    }));
  }
  function finish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const a = memory.current.active;
    if (!a) return;
    const f = new FormData(e.currentTarget),
      ended = Date.now(),
      sec = elapsed(a, ended),
      complete = f.has('complete'),
      remaining = Number(f.get('remaining'));
    if (
      a.resourceId &&
      complete &&
      linkedTaskProgress(memory.current, a.taskId ?? '').some((p) => p.remainingCount > 0)
    ) {
      setFormError('풀지 않은 문제가 있어 과제를 완료할 수 없습니다.');
      return;
    }
    const actualProblems = a.resourceId
      ? new Set(
          learning(memory.current)
            .attempts.filter((x) => x.sessionId === a.id && x.selfCheck !== 'unreviewed')
            .map((x) => x.problemId),
        ).size
      : Number(f.get('problems'));
    const linked = a.resourceId
      ? learning(memory.current).resources.find((r) => r.id === a.resourceId)
      : undefined;
    const nextProblem = linked
      ? learning(memory.current)
          .problems.filter((p) => p.resourceId === linked.id)
          .sort((a, b) => a.ordinal - b.ordinal)
          .find((p) => !isCompleted(learning(memory.current), p.id))
      : undefined;
    if (
      commit((v) => ({
        ...v,
        learning:
          linked && nextProblem ? learning(moveProblem(v, linked.id, nextProblem.id)) : v.learning,
        active: null,
        sessions: [
          ...v.sessions,
          {
            id: a.id,
            taskId: a.taskId,
            subject: a.subject,
            action: a.action,
            started: a.started,
            ended: iso(ended),
            workspace: a.workspace,
            resourceId: a.resourceId,
            questionPace: a.questionPace,
            exam: a.exam,
            seconds: sec,
            target: a.target,
            problems: actualProblems,
            concepts: String(f.get('concepts')),
            rating: String(f.get('rating')) as '어려움' | '보통' | '이해함',
            reason: String(f.get('reason')),
            pauses: a.pauses,
            segments: a.segments,
            mistake: String(f.get('mistake')),
            reviewDate: f.get('mistake') ? addDays(dayKey(ended), 1) : null,
          },
        ],
        tasks: v.tasks.map((t) =>
          t.id === a.taskId
            ? applyStudyProgress(t, {
                complete,
                remainingMinutes: remaining,
                completedProblems: a.resourceId ? 0 : Number(f.get('problems')),
                quantityRemaining: a.resourceId
                  ? undefined
                  : f.get('quantityRemaining')
                    ? Number(f.get('quantityRemaining'))
                    : undefined,
              })
            : t,
        ),
        plan: complete ? v.plan.filter((b) => b.taskId !== a.taskId) : v.plan,
        undo: null,
      }))
    ) {
      setModal(null);
      setTab('progress');
      setNotice('집중을 기록으로 남겼습니다. 제출 여부는 과제에서 확인하세요.');
    }
  }
  function saveTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (taskMaterialBusy) {
      setFormError('첨부 원본 보관이 끝난 뒤 저장해 주세요.');
      return;
    }
    const f = new FormData(e.currentTarget);
    try {
      const dueDate = String(f.get('dueDate') || '');
      const duePrecision = String(f.get('duePrecision') || 'unknown') as
        'unknown' | 'date-only' | 'exact-time';
      const deadline = captureDeadline({
        due: dueDate,
        precision: dueDate ? duePrecision : 'unknown',
        dueTime: String(f.get('dueTime') || ''),
        provenance: 'user-confirmed',
      });
      const unit = String(f.get('quantityUnit') || '');
      const amount = Number(f.get('quantityTotal') || 0);
      const quantity =
        unit && amount > 0
          ? {
              unit,
              total: amount,
              remaining:
                f.get('status') === 'done'
                  ? 0
                  : f.get('quantityRemaining') !== ''
                    ? Number(f.get('quantityRemaining') ?? amount)
                    : amount,
            }
          : undefined;
      const duration = Number(f.get('minutes'));
      const t = taskSchema.parse({
        id: editTask?.id || taskDraftId,
        attachmentIds: taskMaterials.photoIds,
        subject: f.get('subject'),
        title: f.get('title'),
        kind: f.get('kind'),
        ...deadline,
        quantity,
        estimate: { minMinutes: duration, maxMinutes: duration, source: 'user' },
        priority: Number(f.get('priority')),
        minutes: duration,
        remaining: Number(f.get('remaining')),
        status: f.get('status'),
        submitted: f.has('submitted'),
        submissionRequired: f.has('submissionRequired'),
        capture: editTask?.capture ?? { source: 'manual', confirmedByUser: true },
        optional: f.has('optional'),
        notes: f.get('notes'),
        link: f.get('link'),
      });
      if (s.tasks.some((existing) => existing.id !== t.id && sameMission(existing, t))) {
        setFormError('같은 과제가 이미 있습니다. 기존 과제를 수정해 주세요.');
        return;
      }
      if (s.active?.taskId === t.id && t.status === 'done') {
        setFormError('진행 중인 공부를 먼저 종료하고 학습 완료를 기록하세요.');
        return;
      }
      if (
        commit((v) => ({
          ...v,
          tasks: editTask ? v.tasks.map((x) => (x.id === t.id ? t : x)) : [...v.tasks, t],
          learning: taskMaterials.papers.length
            ? {
                ...learning(v),
                resources: [
                  ...learning(v).resources,
                  ...taskMaterials.papers.map((p) => ({
                    ...p.resource,
                    subject: t.subject,
                    linkedTaskId: t.id,
                  })),
                ],
                problems: [
                  ...learning(v).problems,
                  ...taskMaterials.papers.flatMap((p) => p.problems),
                ],
              }
            : v.learning,
          plan: v.plan.filter(
            (b) =>
              b.taskId !== t.id ||
              (t.status !== 'done' && (!t.due || +new Date(b.end) <= +new Date(t.due))),
          ),
          undo: null,
        }))
      ) {
        setModal(null);
        if (!editTask && t.kind === '수행평가') {
          setFilter('pending');
          setTab('tasks');
        }
        setNotice(
          t.kind === '수행평가'
            ? '수행평가를 저장했어요. 할 일 목록에서 확인하세요.'
            : '과제를 저장했습니다. 변경된 마감과 분량은 계획 복구에 반영됩니다.',
        );
      }
    } catch (e) {
      setFormError(inputError(e));
    }
  }
  function saveSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const date = String(f.get('date') || '');
      const t = scheduleSchema.parse({
        id: editSchedule?.id || uid(),
        title: f.get('title'),
        subject: f.get('subject'),
        kind: f.get('kind'),
        days: date
          ? [new Date(date + 'T12:00:00+09:00').getUTCDay()]
          : f.getAll('days').map(Number),
        start: f.get('start'),
        end: f.get('end'),
        prep: Number(f.get('prep')),
        travel: Number(f.get('travel')),
        buffer: Number(f.get('buffer')),
        materials: f.get('materials'),
        date: date || null,
        excluded: String(f.get('excluded'))
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      });
      if (
        commit((v) => ({
          ...v,
          schedules: editSchedule
            ? v.schedules.map((x) => (x.id === t.id ? t : x))
            : [...v.schedules, t],
          undo: null,
        }))
      ) {
        setModal(null);
        setNotice('고정 일정을 저장했습니다. 충돌이 생긴 계획은 복구 버튼으로 다시 검토하세요.');
      }
    } catch (e) {
      setFormError(inputError(e));
    }
  }
  async function recovery() {
    open('recover');
    setProposal(null);
    setBusy(true);
    const snapshot = s,
      time = Date.now();
    setProposalRevision(snapshot.revision);
    setMode('Demo AI Mode · 규칙 기반');
    const fallback = recover(snapshot, time, sleepFixed);
    try {
      if (!online) throw new Error('offline');
      const payload = await requestAI(
          'plan',
          { state: privateSnapshot(snapshot), now: time },
          cloud.getAccessToken(),
        ),
        r = recoverySchema.parse(payload.result);
      if (validateRecovery(snapshot, r, time, sleepFixed).length) throw new Error('안전 규칙 위반');
      setProposal(r);
      setMode(payload.mode === 'live' ? '서버 AI · 검증 완료' : 'Demo AI Mode · 규칙 기반');
    } catch {
      setProposal(fallback);
      setMode('Demo AI Mode · 규칙 기반 (API 미연결 또는 오프라인)');
    } finally {
      setBusy(false);
    }
  }
  function privateSnapshot(v: State) {
    return {
      ...v,
      tasks: v.tasks.map((t) => ({ ...t, notes: '', link: '' })),
      sessions: [],
      learningEvents: undefined,
      problemRetests: undefined,
      exams: undefined,
      learning: undefined,
      active: null,
      grades: [],
      reviewsDone: [],
      settings: { ...v.settings, goal: '' },
      schedules: v.schedules.map((x) => ({ ...x, materials: '' })),
      undo: null,
    };
  }
  async function getCoach() {
    setBusy(true);
    const weak = s.sessions.filter((x) => x.rating === '어려움'),
      dueReview = s.sessions.filter(
        (x) => x.reviewDate && x.reviewDate <= today && !s.reviewsDone.includes(x.id),
      );
    const local = `미완료 과제 ${pending.length}개, 오늘 기록한 문제 ${todayOutput(s.sessions, now)}개. ${dueReview.length ? `복습할 오답 ${dueReview.length}개부터 다시 풀어보세요.` : weak.length ? `${weak.at(-1)?.subject}에서 어려웠던 개념 하나를 다시 떠올려 보세요.` : '과제 하나를 고르고 첫 문제부터 5분 시작하세요.'} 시간 기록만으로 이해도나 성적 향상을 판단하지 않습니다.`;
    setCoach(local);
    try {
      const d = await requestAI(
        'coach',
        {
          pending: pending.map((t) => ({ subject: t.subject, remaining: t.remaining, due: t.due })),
          sessions: s.sessions.slice(-20).map((x) => ({
            subject: x.subject,
            problems: x.problems,
            rating: x.rating,
            seconds: x.seconds,
          })),
        },
        cloud.getAccessToken(),
      );
      if (typeof d.summary === 'string' && d.summary.length <= 2000)
        setCoach(`${d.mode === 'live' ? '서버 AI' : 'Demo AI Mode'} · ${d.summary}`);
    } catch {
      setCoach(`Demo AI Mode · ${local}`);
    } finally {
      setBusy(false);
    }
  }
  function exportCalendar() {
    const format = (n: number) =>
      new Date(n)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const esc = (v: string) =>
      v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&');
    const events = Array.from({ length: 14 }, (_, i) => fixedForDay(s, addDays(today, i)))
      .flat()
      .filter((f) => !['sleep', 'meal'].includes(f.kind))
      .map(
        (f) =>
          `BEGIN:VEVENT\r\nUID:${esc(f.id)}-${format(f.classStart)}@bkit\r\nDTSTAMP:${format(Date.now())}\r\nDTSTART:${format(f.start)}\r\nDTEND:${format(f.end)}\r\nSUMMARY:${esc(f.title + ' · 준비부터 수업 종료까지')}\r\nDESCRIPTION:${esc('준비 ' + clock(f.start) + ' / 출발 ' + clock(f.depart) + ' / 수업 ' + clock(f.classStart) + ' / ' + f.materials)}\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:DISPLAY\r\nDESCRIPTION:준비 시작 확인\r\nEND:VALARM\r\nEND:VEVENT`,
      );
    download(
      'bkit-next-14-days.ics',
      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BKIT//STUDY OS//KO\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`,
      'text/calendar',
    );
    setNotice('14일 일정 파일을 만들었습니다. 캘린더 앱에서 가져온 뒤 알림 설정을 확인하세요.');
  }
  const planErrors = validatePlan(
    s,
    todayBlocks.filter((b) => +new Date(b.end) > now),
    now,
    sleepFixed,
  );
  const proposalErrors = proposal ? validateRecovery(s, proposal, now, sleepFixed) : [];
  const taskRow = (t: Task) => (
    <div className="task-row" key={t.id}>
      <button
        className={'check-button ' + (t.status === 'done' ? 'checked' : '')}
        aria-label={t.status === 'done' ? `${t.title} 완료됨` : `${t.title} 학습 완료로 변경`}
        disabled={t.status === 'done' || s.active?.taskId === t.id}
        onClick={() =>
          commit((v) => ({
            ...v,
            tasks: v.tasks.map((x) =>
              x.id === t.id
                ? {
                    ...x,
                    status: 'done',
                    quantity: x.quantity ? { ...x.quantity, remaining: 0 } : undefined,
                  }
                : x,
            ),
            plan: v.plan.filter((b) => b.taskId !== t.id),
            undo: null,
          }))
        }
      >
        {t.status === 'done' && <Check size={16} />}
      </button>
      <button className="task-content" onClick={() => taskEditor(t)}>
        <span className="subject">
          {t.subject} <span>· {t.kind}</span>
        </span>
        <strong>{t.title}</strong>
        <span
          className={t.due && +new Date(t.due) < now && t.status !== 'done' ? 'danger' : 'muted'}
        >
          {formatTaskDeadline(t)} · {t.remaining}분
          {t.quantity ? ' · ' + formatQuantity(t.quantity) : ''}{' '}
          {t.status === 'done'
            ? t.submitted
              ? '· 제출 완료'
              : needsSubmission(t)
                ? '· 제출 여부 확인'
                : '· 학습 완료'
            : ''}
        </span>
      </button>
      {needsSubmission(t) && (
        <button
          className="submission-button"
          aria-label={t.title + ' 제출 완료 기록'}
          onClick={() => {
            if (
              commit((v) => ({
                ...v,
                tasks: v.tasks.map((x) => (x.id === t.id ? { ...x, submitted: true } : x)),
              }))
            )
              setNotice('제출 완료를 기록했습니다.');
          }}
        >
          <CheckCheck size={16} /> 제출
        </button>
      )}
      <ChevronRight size={18} className="muted" />
    </div>
  );
  const FocusContainer = s.active ? 'div' : 'details';
  return (
    <MotionConfig
      reducedMotion={material.motion !== 'auto' || material.lowPower ? 'always' : 'user'}
    >
      <div
        onPointerDownCapture={(event) => {
          const target =
            event.target instanceof Element ? event.target.closest<HTMLElement>('button,a') : null;
          if (target) modalTrigger.current = target;
        }}
        className={
          'app-shell visual-v2 atelier-os premium-os page-' +
          tab +
          (tab === 'study' && s.active ? ' is-focusing' : '') +
          (tab === 'study' && s.active?.workspace ? ' focus-learning' : '') +
          (tab === 'study' && s.active?.resourceId ? ' focus-resource' : '') +
          (tab === 'study' &&
          s.active?.segmentStart &&
          !s.active.workspace &&
          seconds < s.active.target * 60 &&
          !focusUiVisible &&
          !modal
            ? ' focus-quiet'
            : '')
        }
      >
        <SurrealLiquid
          prefs={material}
          studying={!!(s.active?.segmentStart || s.quickTimer?.segmentStart)}
          protectedStudy={
            !!(s.active?.exam || (tab === 'study' && (s.active?.workspace || s.active?.resourceId)))
          }
        />
        <MaterialEffects
          prefs={material}
          studying={!!(s.active?.resourceId || s.active?.workspace)}
        />
        <div className="theme-scenery" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <a className="skip" href="#main">
          본문으로 이동
        </a>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-leading">
              {tab !== 'today' && (
                <button
                  type="button"
                  className="icon-button topbar-back"
                  aria-label="이전 화면으로 돌아가기"
                  title="이전 화면"
                  onClick={goBack}
                >
                  <ArrowLeft size={19} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="brand-theme-button"
                aria-label="BKIT 로고 · 테마 선택"
                aria-haspopup="dialog"
                onClick={() => open('theme')}
              >
                <span className="mobile-brand">
                  BKIT <small>STUDY OS</small>
                </span>
              </button>
            </div>
            <div className="home-top-tools">
              {!online && <span className="offline-label">오프라인</span>}
              <button
                type="button"
                className="icon-button palette-button"
                aria-label="테마 선택"
                aria-haspopup="dialog"
                onClick={() => open('theme')}
              >
                <Palette size={21} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={tab === 'settings' ? '설정 닫기' : '설정 열기'}
                onClick={toggleSettings}
              >
                <SlidersHorizontal size={20} />
              </button>
            </div>
          </header>
          <nav className="tablet-primary-nav" aria-label="태블릿 및 데스크톱 주 메뉴">
            {PRIMARY_NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                className={
                  tab === n.id || (n.id === 'more' && MORE_ROUTES.includes(tab)) ? 'active' : ''
                }
                aria-current={
                  tab === n.id || (n.id === 'more' && MORE_ROUTES.includes(tab))
                    ? 'page'
                    : undefined
                }
                onClick={() => setTab(n.id)}
              >
                <n.icon size={20} strokeWidth={tab === n.id ? 2.3 : 1.9} aria-hidden="true" />
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
          <main id="main" tabIndex={-1} key={tab}>
            <div className="page-head">
              <div>
                {tab === 'today' && <p className="eyebrow">{fullDate(now)}</p>}
                <h1>
                  {
                    (
                      {
                        today: '오늘의 공부',
                        school: '시간표',
                        tasks: '과제',
                        materials: '공부 자료',
                        study: '집중',
                        progress: '공부 기록',
                        garage: 'TOHEŞAR GARAGE',
                        settings: '설정',
                        sleep: 'Sleep Guard',
                        more: '학습 도구',
                        exams: '시험 관리',
                        sites: '공부 사이트 백과사전',
                        'ai-zone': 'BKIT AI ZONE',
                      } as Record<string, string>
                    )[tab]
                  }
                </h1>
                {!['today', 'study', 'tasks', 'progress', 'more', 'materials'].includes(tab) && (
                  <p className="subtitle">
                    {
                      (
                        {
                          today: '할 일을 정리하고, 한 가지에 집중해요.',
                          school: '학교부터 학원까지, 준비할 시간도 함께 챙겨요.',
                          tasks: '기억하는 대신 여기에 내려놓으세요.',
                          study: '시간을 채우기보다, 한 문제를 이해하는 시간.',
                          progress: '직접 답한 문제와 지연 복습 기록을 확인해요.',
                          garage: '공부로 완성하는 나만의 자동차.',
                          more: '시간표, 학습 증거, 수면과 데이터 관리를 한곳에서.',
                          exams: '확인된 시험 범위와 실제 자료를 연결하세요.',
                          sites: '필요한 강의·기출·자료로 한 번에 이동해요.',
                          'ai-zone': '이해와 정리를 도와줄 AI 도구를 찾아보세요.',
                          settings: '이 기기의 기록과 생활 리듬을 관리하세요.',
                        } as Record<string, string>
                      )[tab]
                    }
                  </p>
                )}
              </div>
            </div>
            {['more', 'sites', 'ai-zone'].includes(tab) && (
              <Suspense fallback={null}>
                <GlobalSearch onNavigate={setTab} />
              </Suspense>
            )}
            {storageError && (
              <div className="alert" role="alert">
                {storageError}
                <button
                  onClick={() =>
                    download(
                      'bkit-memory-backup.json',
                      JSON.stringify(pausedStudySnapshot(s, Date.now()), null, 2),
                    )
                  }
                >
                  현재 기록 내보내기
                </button>
              </div>
            )}
            {notice && (
              <div className="toast" role="status">
                <Check size={16} />
                {notice}
              </div>
            )}
            {updateAvailable && (
              <div className="app-update-notice" role="status">
                <span>
                  새 버전이 준비됐어요. 공부를 마치고 모든 BKIT 탭을 닫은 뒤 다시 열면 적용돼요.
                </span>
                <button
                  className="primary"
                  onClick={() => {
                    if (flushLearning())
                      setNotice(
                        '작성 중인 내용을 확인했어요. 모든 BKIT 탭을 닫고 다시 열어 주세요.',
                      );
                  }}
                >
                  업데이트 전 저장 확인 <ArrowUpRight size={16} />
                </button>
              </div>
            )}
            {tab !== 'today' && tab !== 'study' && !!s.quickTimer && (
              <button
                type="button"
                className="quick-timer-top-chip"
                onClick={() => setTab('study')}
              >
                <Clock size={15} /> {s.quickTimer.segmentStart ? '공부 중' : '일시정지'} ·{' '}
                {quickClock(quickElapsed)} · 타이머 열기
              </button>
            )}
            {tab === 'sites' && (
              <Suspense fallback={<p role="status">사이트 목록을 여는 중…</p>}>
                <StudyDirectory onNotice={setNotice} />
              </Suspense>
            )}
            {tab === 'ai-zone' && (
              <Suspense fallback={<p role="status">BKIT AI ZONE을 여는 중…</p>}>
                <AIZone />
              </Suspense>
            )}
            {tab === 'more' && (
              <Suspense fallback={<p role="status">학습 도구를 여는 중…</p>}>
                <MoreHub
                  onNavigate={setTab}
                  onCapture={() => openAtelier('capture')}
                  onAssistant={() => open('assistant')}
                />
              </Suspense>
            )}
            {tab === 'today' && (
              <PremiumHome
                state={s}
                now={now}
                tasks={ordered}
                next={next}
                current={current}
                resource={resumeResource}
                onStart={(id) => start(5, id)}
                onQuick={(minutes) => {
                  beginQuick(minutes ? 'countdown' : 'stopwatch', minutes ?? 480);
                  setTab('study');
                }}
                onNavigate={setTab}
                onAdd={() => taskEditor()}
                onEdit={taskEditor}
                onSubmissions={() => {
                  setFilter('submission');
                  setTab('tasks');
                }}
                onResource={openResource}
              />
            )}
            {tab === 'materials' && (
              <Suspense fallback={<p role="status">공부 자료를 여는 중…</p>}>
                <ResourceLibrary state={s} onChange={commit} onOpen={openResource} />
              </Suspense>
            )}
            {tab === 'school' && (
              <>
                <div className="toolbar">
                  <div className="segmented">
                    <button
                      className={day === today ? 'selected' : ''}
                      onClick={() => setDay(today)}
                    >
                      오늘
                    </button>
                    <button
                      className={day === addDays(today, 1) ? 'selected' : ''}
                      onClick={() => setDay(addDays(today, 1))}
                    >
                      내일
                    </button>
                  </div>
                  <input
                    aria-label="조회 날짜"
                    type="date"
                    value={day}
                    onChange={(e) => e.target.value && setDay(e.target.value)}
                  />
                  <button className="primary" onClick={() => scheduleEditor()}>
                    <Plus size={16} /> 일정 등록
                  </button>
                </div>
                <section className="panel">
                  {conflicts.length > 0 && (
                    <p className="warning">
                      고정 일정 충돌: {conflicts.join(', ')}. 원본 일정은 유지됩니다. 시간을
                      확인하세요.
                    </p>
                  )}
                  <div className="section-head">
                    <h2>{fullDate(at(day, '12:00'))}의 일정</h2>
                    <button className="text-button" onClick={exportCalendar}>
                      <Download size={16} /> 캘린더
                    </button>
                  </div>
                  {fixedForDay(s, day).filter((f) => !['sleep', 'meal'].includes(f.kind)).length ? (
                    fixedForDay(s, day)
                      .filter((f) => !['sleep', 'meal'].includes(f.kind))
                      .map((f) => (
                        <div className="schedule-row" key={f.id}>
                          <div className="schedule-time">
                            {clock(f.classStart)}
                            <small>{clock(f.end)}</small>
                          </div>
                          <div>
                            <span className="chip">
                              {f.kind === 'school'
                                ? '학교'
                                : f.kind === 'academy'
                                  ? '학원'
                                  : '고정'}
                            </span>
                            <h3>{f.title}</h3>
                            <p>
                              준비 {clock(f.start)} → 출발 {clock(f.depart)} → 도착{' '}
                              {clock(f.arrive)}
                            </p>
                            <p>준비물: {f.materials || '아직 입력하지 않았어요'}</p>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={f.title + ' 수정'}
                            onClick={() =>
                              scheduleEditor(s.schedules.find((x) => x.id === f.id) || null)
                            }
                          >
                            <Pencil size={17} />
                          </button>
                        </div>
                      ))
                  ) : (
                    <Empty title="등록된 수업이 없어요">
                      예시 시간표를 실제 일정으로 넣지 않습니다. 수업별로 요일과 시간을 등록하세요.
                    </Empty>
                  )}
                </section>
                <section className="panel spaced">
                  <div className="section-head">
                    <h2>매주 반복하는 일정</h2>
                    <span className="muted">월요일부터 일요일까지</span>
                  </div>
                  <div className="week-grid" tabIndex={0} role="region" aria-label="요일별 시간표">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <div key={d}>
                        <h3>{DAYS[d]}</h3>
                        {s.schedules
                          .filter((x) => !x.date && x.days.includes(d))
                          .sort((a, b) => a.start.localeCompare(b.start))
                          .map((x) => (
                            <button
                              key={x.id}
                              className="week-class"
                              onClick={() => scheduleEditor(x)}
                            >
                              <small>
                                {x.start}–{x.end}
                              </small>
                              <strong>{x.title}</strong>
                            </button>
                          ))}
                        {!s.schedules.some((x) => !x.date && x.days.includes(d)) && (
                          <span className="muted">미등록</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="note-card">
                  <h3>과거 학원 일정, 확인 후 추가하세요</h3>
                  <p>
                    수·금 수학 18:00–22:00 / 일 국어 19:00–22:00. 현재 확정 일정으로 등록되어 있지
                    않습니다. 일정 등록에서 직접 확인하고 입력하세요.
                  </p>
                  <p>
                    휴업·시험일에는 원래 수업의 제외 날짜를 입력하고, 해당 날짜의 임시 일정을 추가할
                    수 있습니다.
                  </p>
                </section>
              </>
            )}
            {tab === 'exams' && (
              <Suspense fallback={<p>시험 정보를 여는 중…</p>}>
                <ExamPanel
                  state={s}
                  today={today}
                  onStart={(id) => start(5, id)}
                  onOpenResource={openResource}
                  onSave={(exam) =>
                    commit((v) => ({
                      ...v,
                      exams: [...(v.exams ?? []).filter((e) => e.id !== exam.id), exam],
                    }))
                  }
                />
              </Suspense>
            )}
            {tab === 'tasks' && (
              <>
                <div className="toolbar task-toolbar">
                  <div className="task-add-actions">
                    <button className="primary" onClick={() => taskEditor()}>
                      <Plus size={17} /> 과제 추가
                    </button>
                    <button className="secondary" onClick={addAssessmentNow}>
                      <Plus size={16} /> 수행평가
                    </button>
                  </div>
                  <div className="segmented" role="group" aria-label="과제 필터">
                    {[
                      ['pending', '미완료'],
                      ['submission', '제출 확인'],
                      ['done', '학습 완료'],
                      ['all', '전체'],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        className={filter === v ? 'selected' : ''}
                        onClick={() => setFilter(v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleTasks.length ? (
                  <section className="panel task-list" aria-label="과제 목록">
                    {visibleTasks.map(taskRow)}
                  </section>
                ) : (
                  <p className="task-empty">
                    {filter === 'submission'
                      ? '제출을 확인할 과제가 없어요.'
                      : filter === 'done'
                        ? '완료한 과제가 없어요.'
                        : filter === 'all'
                          ? '과제를 추가해 보세요.'
                          : '남은 과제가 없어요.'}
                  </p>
                )}
                {s.tasks.flatMap((task) =>
                  linkedTaskProgress(s, task.id).map((p) => (
                    <section className="resource-resume" key={p.resource.id}>
                      <div>
                        <strong>
                          {task.title} · {p.resource.title}
                        </strong>
                        <p>
                          실제 풀이 확인 {p.completedCount}/{p.total} · 미완료 {p.remainingCount} ·
                          제출 {task.submitted ? '완료' : '별도 확인'}
                        </p>
                      </div>
                      <button onClick={() => openResource(p.resource.id)}>
                        연결 자료 이어 풀기
                      </button>
                    </section>
                  )),
                )}
                {!!s.exams?.length && (
                  <details className="compact-section compact-task-exams">
                    <summary>
                      시험 일정 · 준비 항목 <ChevronRight size={16} />
                    </summary>
                    <Suspense fallback={<p role="status">시험 정보를 여는 중…</p>}>
                      <ExamPanel
                        state={s}
                        today={today}
                        onStart={(id) => start(5, id)}
                        onOpenResource={openResource}
                        onSave={(exam) =>
                          commit((v) => ({
                            ...v,
                            exams: [...(v.exams ?? []).filter((e) => e.id !== exam.id), exam],
                          }))
                        }
                      />
                    </Suspense>
                  </details>
                )}
              </>
            )}
            {tab === 'study' && (
              <>
                {!s.active && <QuickStudyTimer {...quickProps} compact />}
                {!s.active && (
                  <button className="focus-library-link" onClick={() => setTab('materials')}>
                    <BookOpen size={18} />
                    공부 자료 열기
                    <ChevronRight size={17} />
                  </button>
                )}
                <FocusContainer className="study-advanced-focus">
                  {!s.active && (
                    <summary>
                      과제에 연결해 집중하기
                      <ChevronRight size={16} />
                    </summary>
                  )}
                  <div className="study-layout">
                    <section
                      className={
                        'focus-card ' +
                        (s.active?.segmentStart ? 'focus-running ' : '') +
                        (s.active && seconds >= s.active.target * 60 ? 'focus-complete' : '')
                      }
                    >
                      {s.active && (
                        <button className="focus-exit text-button" onClick={() => setTab('today')}>
                          <ArrowRight size={15} /> 오늘로 · 타이머 유지
                        </button>
                      )}
                      <h2>{s.active ? s.active.action : '과제와 연결해 공부하기'}</h2>
                      {s.active && <p className="focus-subject">{s.active.subject}</p>}
                      <div className="focus-instrument">
                        <div className="focus-readout">
                          <span>
                            {s.active
                              ? seconds >= s.active.target * 60
                                ? '목표 시간 도착'
                                : s.active.segmentStart
                                  ? '집중 중'
                                  : '일시정지'
                              : '집중 시간'}
                          </span>
                          <div className="timer" role="timer" aria-label="집중 타이머">
                            <AnimatedClock
                              value={
                                s.active
                                  ? s.active.quickMode === 'stopwatch'
                                    ? quickClock(seconds)
                                    : `${String(Math.floor(Math.max(0, s.active.target * 60 - seconds) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, s.active.target * 60 - seconds) % 60)).padStart(2, '0')}`
                                  : `${String(duration).padStart(2, '0')}:00`
                              }
                            />
                          </div>
                          <small className="focus-counter">
                            {s.active
                              ? s.active.quickMode === 'stopwatch'
                                ? `${Math.floor(seconds / 60)}분 경과 · 스톱워치`
                                : `${Math.floor(seconds / 60)}분 경과 / ${s.active.target}분 목표`
                              : '오직 하나에 집중하는 시간'}
                          </small>
                        </div>
                      </div>
                      {!s.active ? (
                        <>
                          <Field label="공부할 과제">
                            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                              <option value="">추천 과제</option>
                              <option value="__free__">자율 학습 · 과제 연결 없음</option>
                              {pending.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.subject} · {t.title}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <div className="duration-options">
                            {[5, 15, 25].map((n) => (
                              <button
                                className={duration === n ? 'selected' : ''}
                                onClick={() => setDuration(n)}
                                key={n}
                              >
                                {n}분
                              </button>
                            ))}
                            <label>
                              직접{' '}
                              <input
                                aria-label="사용자 지정 집중 시간"
                                type="number"
                                min="1"
                                max="480"
                                value={duration}
                                onChange={(e) =>
                                  setDuration(Math.max(1, Math.min(480, Number(e.target.value))))
                                }
                              />{' '}
                              분
                            </label>
                          </div>
                          <button
                            className="primary large"
                            disabled={!canStudy}
                            onClick={() => start(duration)}
                          >
                            <Play size={18} /> 집중 시작
                          </button>
                          {current && (
                            <p className="warning">
                              {current.title} 시간에는 집중 시작을 잠시 쉬어요.
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="focus-actions">
                          {s.active.segmentStart ? (
                            <button className="secondary" onClick={() => open('pause')}>
                              <Pause size={17} /> 일시정지
                            </button>
                          ) : (
                            <button
                              className="secondary"
                              disabled={!!s.active.exam?.finishedAt}
                              onClick={() => {
                                const a = s.active!;
                                const f = studyFixedNow(s, sleep.state, Date.now()).find(
                                  (x) => x.start <= Date.now() && x.end > Date.now(),
                                );
                                if (f) {
                                  setNotice(f.title + ' 시간입니다.');
                                  return;
                                }
                                commit((v) => ({
                                  ...v,
                                  active: { ...a, segmentStart: iso(Date.now()) },
                                }));
                              }}
                            >
                              <Play size={17} /> 다시 시작
                            </button>
                          )}
                          <button
                            className="primary"
                            onClick={() => {
                              if (s.active?.quick) {
                                finishResource();
                                return;
                              }
                              const a = s.active!;
                              if (
                                commit((v) => ({
                                  ...v,
                                  active: closeSegment(a, Date.now()),
                                }))
                              )
                                open('finish');
                            }}
                          >
                            <Check size={17} /> 학습량 기록 · 종료
                          </button>
                        </div>
                      )}
                      {s.active?.segmentStart && (
                        <div className="focus-quiet-tools">
                          <button
                            type="button"
                            className="text-button quiet-now"
                            onClick={() => setFocusUiVisible(false)}
                          >
                            <EyeOff size={16} />
                            몰입 화면
                          </button>
                          <FocusStayAwake running />
                        </div>
                      )}
                      {s.active && (
                        <details
                          className="focus-workspace-tools"
                          open={!!(s.active.resourceId || s.active.workspace)}
                        >
                          <summary>
                            학습 자료 · 문제 풀이
                            <ChevronRight size={16} />
                          </summary>
                          {s.active && activeMaterials.length > 0 && (
                            <details className="focus-materials">
                              <summary>공부할 자료 펼치기 ({activeMaterials.length}장)</summary>
                              <div className="atelier-photos">
                                {activeMaterials.map((id) => (
                                  <PrivatePhotoCard key={id} id={id} large />
                                ))}
                              </div>
                            </details>
                          )}
                          {s.active && !s.active.resourceId && (
                            <ProblemWorkspace
                              active={s.active}
                              onSetProblem={setLearningProblem}
                              onRecordAttempt={addLearningAttempt}
                              onSelfCheck={markLearningAttempt}
                            />
                          )}
                          {s.active?.resourceId && (
                            <Suspense fallback={<p role="status">자료 학습실을 여는 중…</p>}>
                              <MultiProblemWorkspace
                                controller={garageController}
                                totalSeconds={seconds}
                                state={s}
                                onChange={commit}
                                onFinish={finishResource}
                                onSleep={() => {
                                  const a = memory.current.active;
                                  if (
                                    a &&
                                    commit((v) => ({ ...v, active: closeSegment(a, Date.now()) }))
                                  )
                                    setTab('sleep');
                                }}
                              />
                            </Suspense>
                          )}
                        </details>
                      )}
                    </section>
                    <details className="compact-section focus-reviews">
                      <summary>
                        복습 도구
                        <ChevronRight size={16} />
                      </summary>
                      <div className="study-review-sidebar" id="learn-problem-reviews">
                        <Suspense fallback={<p>자료 복습을 여는 중…</p>}>
                          <ResourceReviews state={s} today={today} onOpen={openResource} />
                        </Suspense>
                        <Suspense fallback={<p role="status">복습 문제를 여는 중…</p>}>
                          <ProblemReviewQueue
                            state={s}
                            today={today}
                            onAttempt={recordProblemRetest}
                            onCheck={checkProblemRetest}
                          />
                        </Suspense>
                        <ReviewDeck queue={reviewQueue} onReview={handleReview} />
                      </div>
                    </details>
                  </div>
                </FocusContainer>
              </>
            )}
            {tab === 'progress' && (
              <>
                <RecordOverview
                  sessions={s.sessions}
                  today={today}
                  onStart={() => {
                    beginQuick('stopwatch', 480);
                    setTab('study');
                  }}
                />
                <details className="compact-section compact-progress-detail">
                  <summary>
                    과목별 분석 · 오답 복습 · 성적 · 코치 <ChevronRight size={16} />
                  </summary>
                  <div className="compact-progress-content">
                    <Suspense fallback={<p>자료 복습을 여는 중…</p>}>
                      <ResourceReviews state={s} today={today} onOpen={openResource} />
                    </Suspense>
                    <Suspense fallback={<p role="status">학습 증거를 여는 중…</p>}>
                      <LearningEvidence state={s} today={today} />
                    </Suspense>
                    <Suspense fallback={<p role="status">복습 문제를 여는 중…</p>}>
                      <ProblemReviewQueue
                        state={s}
                        today={today}
                        onAttempt={recordProblemRetest}
                        onCheck={checkProblemRetest}
                      />
                    </Suspense>
                    {s.sessions.some((entry) => entry.workspace?.attempts.length) && (
                      <section className="panel problem-history">
                        <div className="section-head">
                          <h2>내가 실제로 답한 문제</h2>
                          <span className="muted">이 기기에만 저장</span>
                        </div>
                        {s.sessions
                          .filter((entry) => entry.workspace?.attempts.length)
                          .slice(-5)
                          .reverse()
                          .map((entry) => (
                            <details key={entry.id}>
                              <summary>
                                {entry.subject} · {entry.workspace!.problem.slice(0, 45)} · 내 답{' '}
                                {entry.workspace!.attempts.length}회
                              </summary>
                              {entry.workspace!.source && (
                                <p className="muted">출처: {entry.workspace!.source}</p>
                              )}
                              <ol>
                                {entry.workspace!.attempts.map((a) => (
                                  <li key={a.id}>
                                    {a.answer} ·{' '}
                                    {a.selfCheck === 'remembered'
                                      ? '자가 확인'
                                      : a.selfCheck === 'retry'
                                        ? '다시 풀기'
                                        : '미확인'}
                                  </li>
                                ))}
                              </ol>
                            </details>
                          ))}
                      </section>
                    )}
                    <section className="panel">
                      <div className="section-head">
                        <h2>학습 코치</h2>
                        <button className="text-button" disabled={busy} onClick={getCoach}>
                          <Sparkles size={16} />
                          {busy ? '분석 중…' : '기록으로 살펴보기'}
                        </button>
                      </div>
                      <p className="coach-copy">
                        {coach || '공부 기록을 바탕으로 다음에 할 공부를 정리해요.'}
                      </p>
                    </section>
                    <section className="panel spaced">
                      <div className="section-head">
                        <h2>과목별 학습량</h2>
                      </div>
                      {[...new Set(s.sessions.map((x) => x.subject))].map((subject) => (
                        <div className="stat-row" key={subject}>
                          <strong>{subject}</strong>
                          <span>
                            {Math.floor(
                              s.sessions
                                .filter((x) => x.subject === subject)
                                .reduce((n, x) => n + x.seconds, 0) / 60,
                            )}
                            분 타이머 ·{' '}
                            {s.sessions
                              .filter((x) => x.subject === subject)
                              .reduce((n, x) => n + x.problems, 0)}
                            문제
                          </span>
                        </div>
                      ))}
                      {!s.sessions.length && (
                        <p className="muted">첫 세션을 마치면 과목별 실제 기록이 나타납니다.</p>
                      )}
                    </section>
                    <section className="panel spaced">
                      <div className="section-head">
                        <h2>시험 목표 · 실제 결과</h2>
                        <button className="text-button" onClick={() => open('grade')}>
                          <Plus size={16} /> 성적 입력
                        </button>
                      </div>
                      {s.grades.map((g) => (
                        <div className="stat-row" key={g.id}>
                          <div>
                            <strong>
                              {g.subject} · {g.exam}
                            </strong>
                            <p>{g.date || '시험 날짜 확인 필요'}</p>
                          </div>
                          <span>
                            목표 {g.target ?? '—'} / 실제 {g.score ?? '—'}점
                          </span>
                          <button
                            className="icon-button"
                            aria-label={g.exam + ' 삭제'}
                            onClick={() => {
                              if (confirm('이 시험 기록을 삭제할까요?'))
                                commit((v) => ({
                                  ...v,
                                  grades: v.grades.filter((x) => x.id !== g.id),
                                }));
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {!s.grades.length && (
                        <p className="muted">
                          내신·모의고사 원점수(0–100)를 기록합니다. 등급 예측 기능은 제공하지
                          않습니다.
                        </p>
                      )}
                    </section>
                    <section className="panel spaced">
                      <div className="section-head">
                        <h2>학습 기록</h2>
                      </div>
                      {[...s.sessions]
                        .reverse()
                        .slice(0, 50)
                        .map((x) => (
                          <div className="session-row" key={x.id}>
                            <div>
                              {x.exam && (
                                <details>
                                  <summary>모의시험 · {x.exam.problemIds.length}문항 결과</summary>
                                  <p>
                                    {x.exam.finishedAt ? '시험 시간 종료' : '직접 종료'} · 실제{' '}
                                    {quickClock(x.seconds)} / {quickClock(x.exam.duration)}
                                  </p>
                                  <p>
                                    검토 {x.questionPace?.review.length ?? 0} · 건너뜀{' '}
                                    {x.questionPace?.skipped?.length ?? 0}
                                  </p>
                                  {x.questionPace &&
                                    x.exam.problemIds.map((id, i) => (
                                      <p key={id}>
                                        {i + 1}번 ·{' '}
                                        {quickClock(
                                          (x.questionPace!.seconds[id] ?? 0) +
                                            (x.questionPace!.current === id
                                              ? Math.max(0, x.seconds - x.questionPace!.anchor)
                                              : 0),
                                        )}
                                      </p>
                                    ))}
                                </details>
                              )}
                              <span className="subject">
                                {x.subject} · {dayKey(x.ended)}
                              </span>
                              <h3>{x.action}</h3>
                              <p>
                                {clock(x.started)}–{clock(x.ended)} · {Math.floor(x.seconds / 60)}분
                                타이머 · {x.problems}문제 · {x.rating}
                              </p>
                              {x.concepts && <p>개념: {x.concepts}</p>}
                              {x.quick && (
                                <button
                                  type="button"
                                  className="secondary"
                                  aria-expanded={historyEditingId === x.id}
                                  onClick={() =>
                                    setHistoryEditingId(historyEditingId === x.id ? null : x.id)
                                  }
                                >
                                  공부 기록 수정
                                </button>
                              )}
                              {x.quick && historyEditingId === x.id && (
                                <QuickSessionEditor
                                  key={x.id}
                                  session={x}
                                  tasks={s.tasks}
                                  onSave={saveQuickLabel}
                                  onClose={() => setHistoryEditingId(null)}
                                />
                              )}

                              {x.reason && <p>종료 사유: {x.reason}</p>}
                              {x.pauses.map((p, i) => (
                                <p key={i}>
                                  일시정지 {clock(p.at)}: {p.reason}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      {!s.sessions.length && (
                        <Empty title="기록은 시작한 뒤 쌓여요">
                          실제 학습량과 자기평가를 기록하면 여기에서 확인할 수 있어요.
                        </Empty>
                      )}
                    </section>
                  </div>
                </details>
              </>
            )}
            {tab === 'settings' && (
              <>
                <section className="theme-preferences panel" aria-label="화면 모드 설정">
                  <div>
                    <h2>화면 모드</h2>
                    <p>눈이 편한 다크모드로 전환해도 공부 기록과 파일은 변경되지 않아요.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary theme-preferences-action"
                    aria-pressed={theme === 'dark'}
                    onClick={changeTheme}
                  >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{' '}
                    {theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환'}
                  </button>
                </section>
                <button className="settings-theme-entry" onClick={() => open('theme')}>
                  <Palette size={20} />
                  <span>테마와 움직임</span>
                  <ChevronRight size={18} />
                </button>
                <details className="compact-section">
                  <summary>
                    백업 · 복구
                    <ChevronRight size={16} />
                  </summary>
                  <div className="settings-detail-body">
                    <button className="secondary" disabled={!pending.length} onClick={recovery}>
                      <RotateCcw size={17} />
                      공부 계획 다시 정리
                    </button>
                    <div className="plan-tools" role="region" aria-label="계획 관리">
                      <button
                        className="text-button"
                        disabled={!pending.length}
                        onClick={() => open('block')}
                      >
                        <LockKeyhole size={15} /> 학습 시간 직접 고정
                      </button>
                      {s.plan.some((b) => b.locked) && (
                        <button
                          className="text-button"
                          onClick={() => {
                            if (confirm('직접 고정한 학습 시간의 고정을 해제할까요?'))
                              commit((v) => ({
                                ...v,
                                plan: v.plan.map((b) => ({ ...b, locked: false })),
                                undo: null,
                              }));
                          }}
                        >
                          고정 해제
                        </button>
                      )}
                      {s.undo && (
                        <button
                          className="text-button"
                          onClick={() => {
                            if (commit((v) => ({ ...v, plan: v.undo || [], undo: null })))
                              setNotice(
                                '승인 전 계획으로 되돌렸습니다. 현재 시각에서 충돌 여부를 다시 확인하세요.',
                              );
                          }}
                        >
                          <RotateCcw size={15} /> 계획 실행 취소
                        </button>
                      )}
                    </div>
                    <Suspense fallback={<p role="status">전체 백업을 여는 중…</p>}>
                      <CompleteBackupPanel studying={!!s.active || !!s.quickTimer} />
                    </Suspense>
                  </div>
                </details>
                <details className="compact-section">
                  <summary>
                    실험실
                    <ChevronRight size={16} />
                  </summary>
                  <section className="panel experimental-settings">
                    <span className="eyebrow">EXPERIMENTAL · 기본 OFF</span>
                    <h2>실험실</h2>
                    <p>기기와 환경에 따라 정확도가 달라지는 보조 도구예요.</p>
                    <Suspense fallback={<p role="status">실험 도구를 여는 중…</p>}>
                      <AwakeAssist onRest={() => setTab('sleep')} />
                    </Suspense>
                  </section>
                </details>
                <div className="settings-layout">
                  <section className="panel">
                    <div className="section-head">
                      <h2>생활 리듬</h2>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        if (
                          commit((v) => ({
                            ...v,
                            settings: {
                              wake: String(f.get('wake')),
                              bed: String(f.get('bed')),
                              minSleep: Number(f.get('minSleep')),
                              focus: Number(f.get('focus')),
                              mealStart: String(f.get('mealStart')),
                              mealMinutes: Number(f.get('mealMinutes')),
                              breakMinutes: Number(f.get('breakMinutes')),
                              goal: String(f.get('goal')),
                            },
                            undo: null,
                          }))
                        )
                          setNotice(
                            '생활 리듬을 저장했습니다. 기존 계획은 복구로 다시 확인하세요.',
                          );
                      }}
                    >
                      <div className="form-grid">
                        <Field label="기상">
                          <input type="time" name="wake" required defaultValue={s.settings.wake} />
                        </Field>
                        <Field label="취침">
                          <input type="time" name="bed" required defaultValue={s.settings.bed} />
                        </Field>
                        <Field label="최소 수면 (시간)">
                          <input
                            type="number"
                            name="minSleep"
                            min="7"
                            max="12"
                            step="0.5"
                            required
                            defaultValue={s.settings.minSleep}
                          />
                        </Field>
                        <Field label="계획의 집중 구간 (분)">
                          <input
                            type="number"
                            name="focus"
                            min="5"
                            max="120"
                            required
                            defaultValue={s.settings.focus}
                          />
                        </Field>
                        <Field label="식사 시작">
                          <input
                            type="time"
                            name="mealStart"
                            required
                            defaultValue={s.settings.mealStart}
                          />
                        </Field>
                        <Field label="식사 · 쉬는 시간 (분)">
                          <input
                            type="number"
                            name="mealMinutes"
                            min="15"
                            max="120"
                            required
                            defaultValue={s.settings.mealMinutes}
                          />
                        </Field>
                        <Field label="세션 사이 휴식 (분)">
                          <input
                            type="number"
                            name="breakMinutes"
                            min="5"
                            max="30"
                            required
                            defaultValue={s.settings.breakMinutes}
                          />
                        </Field>
                      </div>
                      <Field label="장기 목표">
                        <textarea name="goal" maxLength={200} defaultValue={s.settings.goal} />
                      </Field>
                      <p className="hint">
                        기본값은 생활 선호 설정입니다. 최소 수면이 부족하면 계획 엔진은 취침을
                        앞당겨 보호합니다. 여러 식사·휴식은 고정 일정으로 추가하세요.
                      </p>
                      <button className="primary" type="submit">
                        설정 저장
                      </button>
                    </form>
                  </section>
                  <div>
                    <PrivateSyncPanel sync={privateSync} />
                    <details className="panel">
                      <summary>Google Sheets 연동 (이전 방식 · 별도 설정)</summary>
                      <CloudSyncPanel cloud={cloud} />
                    </details>
                    <section className="panel">
                      <div className="section-head">
                        <h2>내 데이터</h2>
                        <LockKeyhole size={18} />
                      </div>
                      <p className="muted">
                        기록은 우선 이 기기에 저장돼요. BKIT Private Cloud를 연결하면
                        과제·시간표·완료한 공부 세션 등을 본인 계정 아래에서 동기화할 수 있어요.
                        학습지 사진과 진행 중 타이머는 아직 이 기기에만 있으므로 원본을 보관해
                        주세요. 기기 변경 전에는 사진 포함 전체 ZIP 백업을 사용하세요. 이 JSON에는
                        사진 원본·PDF 원본·필기·페이지 영역이 포함되지 않습니다.
                      </p>
                      <div className="button-stack">
                        <button
                          className="secondary"
                          onClick={() =>
                            download(
                              `bkit-${today}.json`,
                              JSON.stringify(pausedStudySnapshot(s, Date.now()), null, 2),
                            )
                          }
                        >
                          <Download size={17} /> JSON 백업 내보내기
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            try {
                              const raw = localStorage.getItem(LEARNING_BACKUP_KEY);
                              if (raw) download('bkit-before-learning-v3.json', raw);
                              else
                                setNotice(
                                  '별도로 보관된 최초 원본이 없습니다. 현재 JSON 백업을 이용해 주세요.',
                                );
                            } catch {
                              setNotice(
                                '원본 백업을 읽지 못했습니다. 현재 화면의 JSON 백업을 보관해 주세요.',
                              );
                            }
                          }}
                        >
                          <Download size={17} />
                          최초 보관 원본 백업 내보내기
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            try {
                              const key = Object.keys(localStorage)
                                .filter((k) => k.startsWith(KEY + '.before-restore.'))
                                .sort()
                                .at(-1);
                              if (key)
                                download(
                                  'bkit-before-last-restore.json',
                                  localStorage.getItem(key)!,
                                );
                              else setNotice('아직 백업으로 교체한 기록이 없습니다.');
                            } catch {
                              setNotice(
                                '복구 전 원본을 읽지 못했습니다. 현재 JSON 백업을 보관해 주세요.',
                              );
                            }
                          }}
                        >
                          <Download size={17} />
                          최근 복구 전 원본 내보내기
                        </button>
                        <label className="secondary upload-button">
                          <Upload size={17} /> 백업 가져오기
                          <input
                            aria-label="JSON 백업 파일"
                            disabled={!!s.active || !!s.quickTimer}
                            type="file"
                            accept="application/json,.json"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              try {
                                if (file.size > 5_000_000) throw new Error();
                                setImported(pausedImportedState(parseBackup(await file.text())));
                                open('import');
                              } catch {
                                setNotice(
                                  '유효한 BKIT STUDY OS v1 백업이 아닙니다. 현재 기록은 그대로 유지됩니다.',
                                );
                              }
                            }}
                          />
                        </label>
                        <button className="secondary" onClick={exportCalendar}>
                          <CalendarDays size={17} /> 14일 캘린더 내보내기
                        </button>
                        {readBlocked && (
                          <button
                            className="secondary"
                            onClick={() => {
                              try {
                                download(
                                  'bkit-original-storage.txt',
                                  localStorage.getItem(KEY) || '',
                                );
                              } catch {
                                setNotice('원본 저장소에도 접근하지 못했습니다.');
                              }
                            }}
                          >
                            읽기 실패 원본 내보내기
                          </button>
                        )}
                      </div>
                      <p className="hint">
                        CRASH//WEEK의 crashweek.v3는 읽거나 삭제하지 않습니다. 자동 마이그레이션은
                        제공하지 않습니다.
                      </p>
                    </section>
                    <section className="panel spaced">
                      <div className="section-head">
                        <h2>PWA · 알림</h2>
                      </div>
                      <p>iPhone Safari 공유 → ‘홈 화면에 추가’로 설치할 수 있습니다.</p>
                      <p className="muted">
                        오프라인 기능은 한 번 온라인으로 연 뒤 사용할 수 있습니다. 백그라운드 Web
                        Push는 현재 구현되지 않았습니다. iOS 16.4 이상 설치형 PWA에서도 서버
                        예약·권한 설정이 추가로 필요합니다.
                      </p>
                      <p className="hint">
                        캘린더 파일을 가져온 뒤 캘린더 앱에서 알림을 직접 확인하세요. 앱이 꺼져 있을
                        때 알림을 보낸다고 표시하지 않습니다.
                      </p>
                    </section>
                    <details className="compact-section">
                      <summary>
                        API 연결 · 고급 설정
                        <ChevronRight size={16} />
                      </summary>
                      <ApiReadinessPanel />
                    </details>
                    <section className="note-card">
                      <h3>AI 연결 상태</h3>
                      <p className="mode-label">
                        {'과제 브리핑 AI · Google 본인 인증 후 선택 사용'}
                      </p>
                      <p>
                        계획 복구·코치·일반 비서는 로컬 규칙 기반입니다. 현재 운영 API는 이 세 AI
                        기능을 지원하지 않습니다.
                      </p>
                      <p>
                        과제 브리핑은 공지 정리 화면에서 Google로 연결하고 정리 버튼을 누를 때만
                        입력 글자를 보냅니다. 사진·PDF는 보내지 않으며 초안을 확인한 뒤 저장합니다.
                      </p>
                    </section>
                  </div>
                </div>
              </>
            )}
            {tab === 'sleep' && (
              <Suspense fallback={<p role="status">수면 루틴을 여는 중…</p>}>
                <SleepGuard guard={sleep} now={now} onStudy={() => setTab('study')} />
              </Suspense>
            )}
            <footer className="page-footer">
              <span>BKIT / A LITTLE FOCUS, A LITTLE GROWTH.</span>
              <span>나의 속도로, 나의 흐름으로.</span>
            </footer>
          </main>
        </div>
        {atelierOpen &&
          createPortal(
            <StudyAtelier
              startAt={atelierStep}
              onClose={() => setAtelierOpen(false)}
              onSave={(tasks) => {
                const merged = mergeMissions(
                  memory.current.tasks,
                  tasks.map((t) => ({
                    ...t,
                    capture: {
                      source: t.attachmentIds?.length ? ('photo' as const) : ('text' as const),
                      confirmedByUser: true,
                    },
                  })),
                );
                if (!commit((v) => ({ ...v, tasks: merged.tasks }))) return null;
                setSelected(merged.ids[0] || '');
                setTab('today');
                // A successful arrival returns to the mission desk even when briefing
                // was opened from a button far down TODAY. Run after dialog focus restore.
                requestAnimationFrame(() => {
                  window.scrollTo(0, 0);
                  document.getElementById('main')?.focus({ preventScroll: true });
                });
                setNotice(
                  merged.duplicates
                    ? `BKIT에 정리했습니다. 같은 과제 ${merged.duplicates}개는 기존 항목에 연결했어요.`
                    : `${merged.ids.length}개 과제를 BKIT에 저장했습니다. 첫 5분을 골라 시작해 보세요.`,
                );
                return { duplicates: merged.duplicates };
              }}
            />,
            document.body,
          )}
        {createPortal(
          <nav className="orbit-nav" aria-label="주 메뉴">
            {PRIMARY_NAV.map((n) => (
              <button
                key={n.id}
                className={
                  tab === n.id || (n.id === 'more' && MORE_ROUTES.includes(tab)) ? 'active' : ''
                }
                aria-current={
                  tab === n.id || (n.id === 'more' && MORE_ROUTES.includes(tab))
                    ? 'page'
                    : undefined
                }
                onClick={() => setTab(n.id)}
              >
                <n.icon size={20} strokeWidth={tab === n.id ? 2.3 : 1.9} aria-hidden="true" />
                <span>{n.label}</span>
              </button>
            ))}
          </nav>,
          document.body,
        )}
        {tab === 'study' &&
          s.active?.segmentStart &&
          !s.active.workspace &&
          !focusUiVisible &&
          !modal &&
          seconds < s.active.target * 60 &&
          createPortal(
            <button
              className="focus-reveal-control focus-reveal-control--visible"
              type="button"
              aria-label="조작 표시"
              onClick={() => setFocusUiVisible(true)}
            >
              <Eye size={16} />
              조작 표시
            </button>,
            document.body,
          )}
        {modal && (
          <Modal
            title={
              {
                capture: '무엇부터 해야 할까요?',
                tools: '도구와 설정',
                theme: '나의 공부 공간',
                assistant: 'BKIT 멀티 비서',
                task: editTask
                  ? '과제 수정'
                  : taskPresetKind === '수행평가'
                    ? '수행평가 등록'
                    : '새 과제',
                schedule: editSchedule ? '일정 수정' : '고정 일정 등록',
                finish: '집중을 기록으로 남기기',
                recover: '지금부터, 다시 시작',
                grade: '시험 기록',
                pause: '잠시 쉬어가기',
                block: '직접 학습 시간 고정',
                import: '백업 가져오기',
              }[modal]
            }
            onClose={() => {
              if (taskMaterialBusy) {
                setFormError('원본 보관 중이에요. 잠시 기다려 주세요.');
                return;
              }
              setModal(null);
            }}
            className={modal === 'theme' ? 'theme-dialog' : ''}
            nonModal={modal === 'tools'}
            returnFocus={modalTrigger.current}
          >
            {formError && (
              <p role="alert" className="warning form-error">
                {formError}
              </p>
            )}
            {modal === 'theme' && (
              <Suspense fallback={<p role="status">테마를 여는 중…</p>}>
                <MaterialSettings prefs={material} onChange={changeMaterial} />
              </Suspense>
            )}
            {modal === 'tools' && (
              <div className="home-tools-list">
                <button
                  onClick={() => {
                    setModal(null);
                    setTab('sleep');
                  }}
                >
                  <Moon size={21} />
                  <span>Sleep Guard · 수면 루틴</span>
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => open('capture')}>
                  <Plus size={21} />
                  <span>빠른 한 줄 입력</span>
                  <ChevronRight size={18} />
                </button>
                <button aria-label="BKIT 비서 열기" onClick={() => open('assistant')}>
                  <BookOpen size={21} />
                  <span>BKIT 비서</span>
                  <ChevronRight size={18} />
                </button>
                <button
                  aria-label="설정 열기"
                  onClick={() => {
                    setModal(null);
                    setTab('settings');
                  }}
                >
                  <Settings size={21} />
                  <span>설정</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            {modal === 'assistant' && (
              <AssistantPanel
                state={s}
                getAccessToken={cloud.getAccessToken}
                onAction={applyAssistantAction}
                onNavigate={(next) => {
                  setModal(null);
                  setTab(next);
                }}
              />
            )}
            {modal === 'capture' && (
              <QuickCapture
                onDetailed={() => {
                  setEditTask(null);
                  open('task');
                }}
                onSave={(task) => {
                  if (commit((v) => ({ ...v, tasks: mergeMissions(v.tasks, [task]).tasks }))) {
                    setModal(null);
                    setNotice('오늘에 담았습니다. 다음 행동이 준비됐습니다.');
                    return true;
                  }
                  return false;
                }}
              />
            )}
            {modal === 'task' && (
              <form onSubmit={saveTask}>
                <details className="study-task-materials">
                  <summary>
                    학교 공지 · 사진·PDF 첨부 (선택) <ChevronRight size={16} />
                  </summary>
                  <TaskMaterials
                    key={taskDraftId}
                    taskId={taskDraftId}
                    value={taskMaterials}
                    onChange={setTaskMaterials}
                    onBusy={setTaskMaterialBusy}
                  />
                </details>
                <div className="form-grid">
                  <Field label="과목">
                    <input
                      name="subject"
                      required
                      maxLength={200}
                      defaultValue={editTask?.subject || ''}
                      placeholder="예: 수학"
                    />
                  </Field>
                  <Field label="종류">
                    <select name="kind" defaultValue={editTask?.kind || taskPresetKind}>
                      {['숙제', '수행평가', '시험공부', '개인 일정'].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="과제 이름 · 바로 할 행동">
                  <input
                    name="title"
                    required
                    maxLength={200}
                    defaultValue={editTask?.title || ''}
                    placeholder="예: 학습지 4쪽 극한 문제 1–3번 풀기"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="마감 날짜 (모르면 비우기)">
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={
                        editTask?.deadline?.date ?? (editTask?.due ? dayKey(editTask.due) : '')
                      }
                    />
                  </Field>
                  <Field label="마감의 정확성">
                    <select
                      name="duePrecision"
                      defaultValue={
                        editTask?.deadline?.precision ??
                        (editTask?.due ? 'exact-time' : 'date-only')
                      }
                    >
                      <option value="date-only">날짜만 확인</option>
                      <option value="exact-time">시각까지 확인</option>
                      <option value="unknown">마감 미확인</option>
                    </select>
                  </Field>
                  <Field label="확정된 시각 (시각까지 알 때)">
                    <input
                      type="time"
                      name="dueTime"
                      defaultValue={
                        editTask?.due &&
                        (!editTask.deadline || editTask.deadline.precision === 'exact-time')
                          ? clock(editTask.due)
                          : ''
                      }
                    />
                  </Field>
                </div>
                <details className="study-task-details">
                  <summary>
                    학습 분량·시간·상태 · 제출 설정 <ChevronRight size={16} />
                  </summary>
                  <div className="form-grid">
                    <Field label="학습 분량 단위">
                      <select name="quantityUnit" defaultValue={editTask?.quantity?.unit ?? ''}>
                        <option value="">미확인</option>
                        <option value="problems">문제</option>
                        <option value="pages">쪽</option>
                        <option value="passages">지문</option>
                        <option value="chapters">단원</option>
                      </select>
                    </Field>
                    <Field label="남은 실제 분량">
                      <input
                        name="quantityRemaining"
                        type="number"
                        min="0"
                        max="10000"
                        defaultValue={editTask?.quantity?.remaining ?? ''}
                      />
                    </Field>
                    <Field label="총 분량">
                      <input
                        name="quantityTotal"
                        type="number"
                        min="0"
                        max="10000"
                        defaultValue={editTask?.quantity?.total ?? 0}
                      />
                    </Field>
                  </div>
                  <div className="form-grid">
                    <Field label="예상 전체 시간 (분)">
                      <input
                        name="minutes"
                        type="number"
                        min="1"
                        max="480"
                        required
                        defaultValue={editTask?.minutes || 25}
                      />
                    </Field>
                    <Field label="남은 분량 (분)">
                      <input
                        name="remaining"
                        type="number"
                        min="1"
                        max="480"
                        required
                        defaultValue={editTask?.remaining || 25}
                      />
                    </Field>
                    <Field label="중요도">
                      <select name="priority" defaultValue={editTask?.priority || 2}>
                        <option value="1">일반</option>
                        <option value="2">중요</option>
                        <option value="3">매우 중요</option>
                      </select>
                    </Field>
                    <Field label="학습 상태">
                      <select name="status" defaultValue={editTask?.status || 'todo'}>
                        <option value="todo">시작 전</option>
                        <option value="doing">진행 중</option>
                        <option value="done">학습 완료</option>
                      </select>
                    </Field>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      name="submissionRequired"
                      defaultChecked={
                        editTask?.submissionRequired ??
                        (!editTask || editTask.kind === '숙제' || editTask.kind === '수행평가')
                      }
                    />
                    완료 후 제출 확인이 필요한 과제
                  </label>
                  <label className="checkbox">
                    <input type="checkbox" name="submitted" defaultChecked={editTask?.submitted} />{' '}
                    제출 완료 (학습 완료 상태에서 체크)
                  </label>
                  <label className="checkbox">
                    <input type="checkbox" name="optional" defaultChecked={editTask?.optional} />{' '}
                    선택 활동 (마감이 없을 때만 계획에서 생략 가능)
                  </label>
                </details>
                <Field label="메모">
                  <textarea name="notes" maxLength={3000} defaultValue={editTask?.notes} />
                </Field>
                <Field label="자료 링크">
                  <input name="link" type="url" defaultValue={editTask?.link} />
                </Field>
                {editTask?.link && (
                  <a
                    className="secondary"
                    href={editTask.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    등록한 자료 열기 <ArrowUpRight size={16} />
                  </a>
                )}
                <div className="modal-actions">
                  {editTask && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        if (s.active?.taskId === editTask.id) {
                          setFormError('진행 중인 공부를 먼저 종료하세요.');
                          return;
                        }
                        if (
                          confirm('이 과제를 삭제할까요? 기존 학습 기록은 남습니다.') &&
                          commit((v) => ({
                            ...v,
                            tasks: v.tasks.filter((t) => t.id !== editTask.id),
                            plan: v.plan.filter((b) => b.taskId !== editTask.id),
                            undo: null,
                          }))
                        )
                          setModal(null);
                      }}
                    >
                      <Trash2 size={16} /> 삭제
                    </button>
                  )}
                  <button className="primary" type="submit" disabled={taskMaterialBusy}>
                    과제 저장
                  </button>
                </div>
              </form>
            )}
            {modal === 'schedule' && (
              <form onSubmit={saveSchedule}>
                <Field label="학교 과목 · 학원 이름 · 일정">
                  <input
                    name="title"
                    required
                    maxLength={200}
                    defaultValue={editSchedule?.title}
                    placeholder="예: 1교시 수학 / 수학 학원"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="구분">
                    <select name="kind" defaultValue={editSchedule?.kind || 'school'}>
                      <option value="school">학교</option>
                      <option value="academy">학원</option>
                      <option value="fixed">개인 고정 일정 · 식사 · 휴식</option>
                    </select>
                  </Field>
                  <Field label="연결 과목">
                    <input name="subject" maxLength={200} defaultValue={editSchedule?.subject} />
                  </Field>
                </div>
                <div className="field">
                  <span>반복 요일</span>
                  <div className="day-checks">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <label key={d}>
                        <input
                          type="checkbox"
                          name="days"
                          value={d}
                          defaultChecked={editSchedule?.days.includes(d)}
                        />
                        {DAYS[d]}
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="하루만 적용할 날짜 (입력하면 반복 요일보다 우선)">
                  <input name="date" type="date" defaultValue={editSchedule?.date || ''} />
                </Field>
                <div className="form-grid">
                  <Field label="수업 · 일정 시작">
                    <input
                      name="start"
                      type="time"
                      required
                      defaultValue={editSchedule?.start || '09:00'}
                    />
                  </Field>
                  <Field label="종료">
                    <input
                      name="end"
                      type="time"
                      required
                      defaultValue={editSchedule?.end || '09:50'}
                    />
                  </Field>
                  <Field label="준비 (분)">
                    <input
                      name="prep"
                      type="number"
                      min="0"
                      max="180"
                      required
                      defaultValue={editSchedule?.prep ?? 0}
                    />
                  </Field>
                  <Field label="이동 (분)">
                    <input
                      name="travel"
                      type="number"
                      min="0"
                      max="180"
                      required
                      defaultValue={editSchedule?.travel ?? 0}
                    />
                  </Field>
                  <Field label="안전 여유 (분)">
                    <input
                      name="buffer"
                      type="number"
                      min="0"
                      max="120"
                      required
                      defaultValue={editSchedule?.buffer ?? 0}
                    />
                  </Field>
                </div>
                <Field label="준비물 · 수업 전 숙제">
                  <input name="materials" maxLength={200} defaultValue={editSchedule?.materials} />
                </Field>
                <Field label="제외 날짜 (휴업 · 시험일, 쉼표로 구분)">
                  <input
                    name="excluded"
                    defaultValue={editSchedule?.excluded.join(', ') || ''}
                    placeholder="2026-10-20, 2026-10-21"
                  />
                </Field>
                <p className="hint">
                  고정 일정끼리 겹치면 원본을 유지하고 경고합니다. 임시 변경은 제외 날짜 + 하루 적용
                  일정으로 등록하세요.
                </p>
                <div className="modal-actions">
                  {editSchedule && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        if (
                          confirm('이 고정 일정을 삭제할까요?') &&
                          commit((v) => ({
                            ...v,
                            schedules: v.schedules.filter((x) => x.id !== editSchedule.id),
                            undo: null,
                          }))
                        )
                          setModal(null);
                      }}
                    >
                      <Trash2 size={16} /> 삭제
                    </button>
                  )}
                  <button className="primary" type="submit">
                    일정 저장
                  </button>
                </div>
              </form>
            )}
            {modal === 'pause' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const a = s.active!;
                  const f = new FormData(e.currentTarget),
                    t = Date.now();
                  if (
                    commit((v) => ({
                      ...v,
                      active: {
                        ...closeSegment(a, t),
                        pauses: [...a.pauses, { at: iso(t), reason: String(f.get('reason')) }],
                      },
                    }))
                  )
                    setModal(null);
                }}
              >
                <Field label="일시정지 사유">
                  <input
                    name="reason"
                    required
                    maxLength={200}
                    placeholder="잠깐 휴식 / 어려운 개념 / 다른 일정"
                  />
                </Field>
                <button className="primary" type="submit">
                  일시정지
                </button>
              </form>
            )}
            {modal === 'finish' && s.active && (
              <form onSubmit={finish} className="finish-form">
                <div className="session-receipt">
                  <span>SESSION / CAPTURED</span>
                  <strong>
                    {Math.floor(seconds / 60)}
                    <small>min</small>
                  </strong>
                  <p>
                    {s.active.subject} · {s.active.action}
                  </p>
                  <Check size={23} />
                </div>
                <p className="hint">집중한 시간입니다. 실제로 풀거나 이해한 양을 기록하세요.</p>
                <Field label="완료한 문제 수">
                  <input
                    type="number"
                    name="problems"
                    required
                    min="0"
                    max="10000"
                    readOnly={!!s.active.resourceId}
                    defaultValue={
                      s.active.resourceId
                        ? new Set(
                            learning(s)
                              .attempts.filter(
                                (a) => a.sessionId === s.active!.id && a.selfCheck !== 'unreviewed',
                              )
                              .map((a) => a.problemId),
                          ).size
                        : 0
                    }
                  />
                </Field>
                {!s.active.resourceId &&
                  s.tasks.find((t) => t.id === s.active?.taskId)?.quantity && (
                    <Field label="남은 실제 분량 (비우면 문제 수에서 차감)">
                      <input
                        type="number"
                        name="quantityRemaining"
                        min="0"
                        max={s.tasks.find((t) => t.id === s.active?.taskId)?.quantity?.total}
                        placeholder="쪽·지문·단원은 직접 입력"
                      />
                    </Field>
                  )}
                <Field label="떠올리거나 이해한 개념">
                  <input name="concepts" maxLength={200} placeholder="빈칸이어도 괜찮아요" />
                </Field>
                <Field label="자기평가">
                  <select name="rating">
                    <option>어려움</option>
                    <option>보통</option>
                    <option>이해함</option>
                  </select>
                </Field>
                <details className="finish-details">
                  <summary>
                    오답과 종료 사유 남기기 <Plus size={14} />
                  </summary>
                  <Field label="오답 · 이해하지 못한 개념">
                    <textarea
                      name="mistake"
                      maxLength={3000}
                      placeholder="적으면 내일 복습 목록에 남아요"
                    />
                  </Field>
                  <Field label="종료 · 중단 사유">
                    <input
                      name="reason"
                      maxLength={200}
                      placeholder="계획한 분량 완료 / 다른 일정 / 집중 어려움"
                    />
                  </Field>
                </details>
                {s.active.taskId && (
                  <>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        name="complete"
                        disabled={
                          !!s.active.resourceId &&
                          linkedTaskProgress(s, s.active.taskId ?? '').some(
                            (p) => p.remainingCount > 0,
                          )
                        }
                      />{' '}
                      이 과제의 학습 분량을 모두 완료했어요 (제출은 별도)
                    </label>
                    <Field label="아직 남은 분량 (분)">
                      <input
                        name="remaining"
                        type="number"
                        min="1"
                        max="480"
                        required
                        defaultValue={
                          s.tasks.find((t) => t.id === s.active?.taskId)?.remaining || 25
                        }
                      />
                    </Field>
                  </>
                )}
                <button className="primary" type="submit">
                  학습 기록 저장 · 종료
                </button>
              </form>
            )}
            {modal === 'recover' && (
              <>
                <p className="mode-label">
                  <Sparkles size={16} />
                  {mode}
                </p>
                {busy ? (
                  <p role="status">현재 시각과 고정 일정으로 계획을 계산하고 있어요…</p>
                ) : (
                  proposal && (
                    <>
                      <div className="first-action">
                        <span>첫 5분 행동</span>
                        <p>{proposal.firstAction}</p>
                      </div>
                      <div className="proposal-list">
                        {proposal.decisions.map((d) => (
                          <div className="proposal-row" key={d.taskId}>
                            <span className={'decision ' + d.category.toLowerCase()}>
                              {d.category}
                            </span>
                            <div>
                              <strong>{s.tasks.find((t) => t.id === d.taskId)?.title}</strong>
                              <p>
                                변경 전:{' '}
                                {s.plan
                                  .filter((b) => b.taskId === d.taskId)
                                  .map(
                                    (b) => `${dayKey(b.start)} ${clock(b.start)}–${clock(b.end)}`,
                                  )
                                  .join(', ') || '미배치'}
                              </p>
                              <p>
                                변경 후:{' '}
                                {d.blocks
                                  .map(
                                    (b) => `${dayKey(b.start)} ${clock(b.start)}–${clock(b.end)}`,
                                  )
                                  .join(', ') || '배치 보류 · 과제는 유지'}
                              </p>
                              <small>{d.reason}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                      {proposalErrors.map((err, i) => (
                        <p key={i} className="warning">
                          {err}
                        </p>
                      ))}
                      {proposalRevision !== s.revision && (
                        <p className="warning">
                          계산 이후 데이터가 변경되었습니다. 다시 계산하세요.
                        </p>
                      )}
                      <div className="modal-actions">
                        <button className="secondary" onClick={recovery}>
                          <RotateCcw size={16} /> 다시 계산
                        </button>
                        <button
                          className="primary"
                          disabled={!!proposalErrors.length || proposalRevision !== s.revision}
                          onClick={() => {
                            const errors = validateRecovery(s, proposal, Date.now(), sleepFixed);
                            if (errors.length) {
                              setFormError(errors.join(' '));
                              return;
                            }
                            if (
                              commit((v) => ({
                                ...v,
                                undo: v.plan,
                                plan: proposal.decisions.flatMap((d) => d.blocks),
                              }))
                            ) {
                              setModal(null);
                              setNotice('검증한 계획을 승인했습니다. 되돌리기도 가능합니다.');
                            }
                          }}
                        >
                          검토한 계획 승인
                        </button>
                      </div>
                    </>
                  )
                )}
              </>
            )}
            {modal === 'grade' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  try {
                    const g = gradeSchema.parse({
                      id: uid(),
                      subject: f.get('subject'),
                      exam: f.get('exam'),
                      date: f.get('date') || null,
                      target: f.get('target') === '' ? null : Number(f.get('target')),
                      score: f.get('score') === '' ? null : Number(f.get('score')),
                    });
                    if (commit((v) => ({ ...v, grades: [...v.grades, g] }))) setModal(null);
                  } catch {
                    setFormError('날짜와 점수를 확인하세요.');
                  }
                }}
              >
                <Field label="과목">
                  <input name="subject" required maxLength={200} />
                </Field>
                <Field label="시험 (내신 / 모의고사 등)">
                  <input name="exam" required maxLength={200} />
                </Field>
                <Field label="시험 날짜 (확정 시에만)">
                  <input type="date" name="date" />
                </Field>
                <div className="form-grid">
                  <Field label="목표 원점수 (0–100)">
                    <input name="target" type="number" min="0" max="100" step="0.1" />
                  </Field>
                  <Field label="실제 원점수 (0–100)">
                    <input name="score" type="number" min="0" max="100" step="0.1" />
                  </Field>
                </div>
                <button type="submit" className="primary">
                  시험 기록 저장
                </button>
              </form>
            )}
            {modal === 'import' && imported && (
              <>
                <p>
                  과제 {imported.tasks.length}개 · 고정 일정 {imported.schedules.length}개 · 세션{' '}
                  {imported.sessions.length}개를 가져옵니다.
                </p>
                <p className="warning">
                  현재 BKIT STUDY OS 기록을 교체합니다. 먼저 현재 기록을 내보내 보관하세요. 가져온
                  타이머는 일시정지하며 구형 JSON은 마지막 저장된 시간만 복원합니다. CRASH//WEEK
                  기록은 영향을 받지 않습니다.
                </p>
                <div className="modal-actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        'bkit-before-import.json',
                        JSON.stringify(pausedStudySnapshot(s, Date.now()), null, 2),
                      )
                    }
                  >
                    현재 기록 백업
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      if (commit(() => ({ ...pausedImportedState(imported), undo: null }), true)) {
                        setModal(null);
                        setNotice('검증된 백업을 가져왔습니다.');
                      }
                    }}
                  >
                    백업으로 교체
                  </button>
                </div>
              </>
            )}
            {modal === 'block' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  try {
                    const b = {
                      id: uid(),
                      taskId: String(f.get('taskId')),
                      start: fromInput(String(f.get('start'))),
                      end: fromInput(String(f.get('end'))),
                      locked: true,
                    };
                    const blocks = [...s.plan.filter((x) => +new Date(x.end) > Date.now()), b];
                    const errors = validatePlan(s, blocks, Date.now());
                    if (errors.length) {
                      setFormError(errors.join(' '));
                      return;
                    }
                    if (commit((v) => ({ ...v, plan: blocks, undo: null }))) setModal(null);
                  } catch {
                    setFormError('시간을 확인하세요.');
                  }
                }}
              >
                <Field label="과제">
                  <select name="taskId" required>
                    {pending.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="시작 (한국 시각)">
                  <input name="start" type="datetime-local" required />
                </Field>
                <Field label="종료">
                  <input name="end" type="datetime-local" required />
                </Field>
                <button className="primary" type="submit">
                  충돌 검사 · 시간 고정
                </button>
              </form>
            )}
          </Modal>
        )}
      </div>
    </MotionConfig>
  );
}
