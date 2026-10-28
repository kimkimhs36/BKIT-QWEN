import { loginRecord, rememberLogin, forgetLogin, saveLoginCheckpoint } from './rememberLogin';
import {
  SyncFailure,
  syncResponse,
  transientFailure,
  MAX_SYNC_RETRIES,
  retryDelay,
} from './privateSyncProtocol';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { z } from 'zod';
import { API_URL } from './ai';
import { authorizeGoogleIdentity, prepareGoogleIdentity } from './cloudClient';
import { stateSchema, type State } from './model';

import { portableStudyState, mergePrivateStudyState, privateStudySignature } from './portableStudyState';
export { portableStudyState, mergePrivateStudyState, privateStudySignature } from './portableStudyState';
const cloudSchema = z.object({
  version: z.number().int().nonnegative(),
  state: stateSchema.nullable(),
  // Set by API only when an owner-scoped old snapshot exists but the new
  // cloud namespace is empty. Never inferred from a generic 503 response.
  resetNamespace: z.literal(2).optional(),
});
const versionSchema = z.object({ version: z.number().int().positive() });
export type Connection =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'conflict'
  | 'offline'
  | 'retrying'
  | 'unavailable'
  | 'expired'
  | 'forbidden'
  | 'storage-error'
  | 'invalid-data';
const tokenHeaders = (token: string) => ({ Authorization: 'Bearer ' + token });
const signature = privateStudySignature;
async function digest(s: State) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature(s)));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
function hasStudyRecords(s: State) {
  return !!(
    s.tasks.length ||
    s.schedules.length ||
    s.sessions.length ||
    s.grades.length ||
    s.reviewsDone.length ||
    s.reviewProgress?.length ||
    s.active
  );
}
export function usePrivateStudySync(localState: State, applyIncoming: (state: State) => boolean) {
  const [status, setStatus] = useState<Connection>('disconnected');
  const statusRef = useRef<Connection>('disconnected');
  const [message, setMessage] = useState(
    '이 기기에만 저장 중 · Google 연결 시 개인 클라우드 동기화',
  );
  const [lastSynced, setLastSynced] = useState('');
  const [prepared, setPrepared] = useState(false),
    [authError, setAuthError] = useState('');
  const [remember, setRemember] = useState(true),
    [rememberSupported, setRememberSupported] = useState(false);
  const [hasCredential, setHasCredential] = useState(false),
    [busy, setBusy] = useState(false);
  const [diagnostic, setDiagnostic] = useState<{
    kind: string;
    status?: number;
    requestId?: string;
  } | null>(null);
  const local = useRef(localState),
    apply = useRef(applyIncoming);
  local.current = localState;
  apply.current = applyIncoming;
  const token = useRef(''),
    clientId = useRef('');
  const creatingSession = useRef(false),
    initializing = useRef(false);
  const checkpoint = useRef<{ digest: string; version: number } | null>(null);
  const busyRef = useRef(false),
    pending = useRef(false),
    mounted = useRef(false),
    generation = useRef(0),
    retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    preparing = useRef(false);
  function current(epoch: number) {
    return mounted.current && epoch === generation.current;
  }
  function transition(next: Connection, text: string) {
    statusRef.current = next;
    setStatus(next);
    setMessage(text);
  }
  function clearRetry() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  async function prepare() {
    if (preparing.current || prepared || token.current) return;
    preparing.current = true;
    try {
      const res = await fetch(API_URL + '/api/config', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw Error();
      const config = z
        .object({ googleClientId: z.string(), rememberSyncEnabled: z.boolean().optional() })
        .parse(await res.json());
      if (!config.googleClientId) throw Error();
      await prepareGoogleIdentity();
      if (!mounted.current) return;
      clientId.current = config.googleClientId;
      setRememberSupported(config.rememberSyncEnabled === true);
      setPrepared(true);
      setAuthError('');
    } catch {
      if (mounted.current)
        setAuthError('Google 연결 준비에 실패했어요. 로컬 공부는 계속할 수 있어요.');
    } finally {
      preparing.current = false;
    }
  }
  async function request(path: string, init: RequestInit, epoch: number): Promise<unknown> {
    if (!navigator.onLine)
      throw new SyncFailure('network', '오프라인이에요. 로그인과 공부 기록은 이 기기에 유지돼요.');
    try {
      const response = await fetch(API_URL + path, {
        ...init,
        headers: {
          ...tokenHeaders(token.current),
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!current(epoch)) throw new Error('cancelled');
      return await syncResponse(response);
    } catch (error) {
      if (!current(epoch)) throw error;
      if (error instanceof SyncFailure) throw error;
      throw new SyncFailure(
        'network',
        '네트워크 연결이 불안정해요. 로그인과 이 기기의 공부 기록은 유지돼요.',
      );
    }
  }
  async function readCloud(epoch: number) {
    const data = await request('/api/sync', {}, epoch);
    const parsed = cloudSchema.safeParse(data);
    if (!parsed.success)
      throw new SyncFailure(
        'invalid-data',
        '클라우드 자료 형식을 확인하지 못했어요. 원본을 유지하고 동기화를 멈췄어요.',
      );
    return parsed.data;
  }
  async function writeCloud(expectedVersion: number, study: State, epoch: number) {
    if (study.sessions.some((s) => (s.segments?.length ?? 0) > 102))
      throw new SyncFailure(
        'invalid-data',
        '현재 서버의 집중 구간 지원 범위를 넘었어요. 이 기기의 원본은 유지돼요.',
      );
    const data = await request(
      '/api/sync',
      {
        method: 'PUT',
        body: JSON.stringify({ expectedVersion, state: portableStudyState(study) }),
      },
      epoch,
    );
    const parsed = versionSchema.safeParse(data);
    if (!parsed.success)
      throw new SyncFailure(
        'invalid-data',
        '클라우드 저장 확인 응답이 올바르지 않아요. 원본은 유지돼요.',
      );
    return parsed.data.version;
  }
  async function markSuccess(version: number, study: State, epoch: number, text: string) {
    const next = { version, digest: await digest(study) };
    if (!current(epoch)) return;
    // Keep a small local checkpoint across relaunches; never a second copy of learning content.
    if (token.current.startsWith('bkit_sync_')) {
      try {
        await saveLoginCheckpoint(token.current, next);
      } catch {
        throw new SyncFailure(
          'storage',
          '로그인 복구 기준을 저장하지 못했어요. 공부 원본은 유지돼요.',
        );
      }
    }
    if (!current(epoch)) return;
    initializing.current = false;
    checkpoint.current = next;
    retries.current = 0;
    setDiagnostic(null);
    setLastSynced(new Date().toLocaleTimeString('ko-KR'));
    transition('connected', text);
  }
  async function reconcile(epoch: number, mode: 'sync' | 'initial' | 'cloud' | 'this' = 'sync') {
    const before = signature(local.current);
    const remote = await readCloud(epoch);
    if (!current(epoch)) return;
    const latest = portableStudyState(local.current);
    const localDigest = await digest(latest),
      remoteDigest = remote.state ? await digest(remote.state) : null;
    if (!current(epoch)) return;
    if (mode === 'cloud') {
      if (before !== signature(local.current))
        throw new SyncFailure(
          'conflict',
          '확인하는 동안 이 기기의 기록이 바뀌었어요. 다시 확인해 주세요.',
        );
      if (!remote.state)
        throw new SyncFailure(
          'conflict',
          '가져올 클라우드 기록이 없어요. 이 기기의 기록은 유지돼요.',
        );
      if (!apply.current(remote.state))
        throw new SyncFailure(
          'storage',
          '클라우드 기록을 이 기기에 저장하지 못했어요. 기존 원본은 유지돼요.',
        );
      await markSuccess(remote.version, remote.state, epoch, '클라우드 기록을 가져왔어요.');
      return;
    }
    if (mode === 'this') {
      const version = await writeCloud(remote.version, latest, epoch);
      await markSuccess(
        version,
        latest,
        epoch,
        '과제와 공부 기록을 클라우드에 저장했어요. 사진·학습 자료와 풀이 기록은 이 기기에만 보관돼요.',
      );
      return;
    }
    if (remoteDigest === localDigest) {
      await markSuccess(
        remote.version,
        latest,
        epoch,
        '로그인이 유지됐어요. 공부 기록을 이어가요.',
      );
      return;
    }
    if (mode === 'initial' && !remote.state) {
      const version = await writeCloud(remote.version, latest, epoch);
      await markSuccess(
        version,
        latest,
        epoch,
        '첫 개인 클라우드가 준비됐어요. 이제 공부를 시작해 보세요.',
      );
      return;
    }
    // One-time clean-cloud migration: a saved v1 login checkpoint must not
    // prevent initial upload into the separate v2 storage namespace.
    // Only trust the server's explicit marker, not an arbitrary empty response.
    if (
      remote.resetNamespace === 2 &&
      remote.version === 0 &&
      remote.state === null &&
      (mode === 'sync' || mode === 'initial')
    ) {
      if (signature(local.current) !== before)
        throw new SyncFailure(
          'conflict',
          '초기화 확인 중 공부 기록이 바뀌었어요. 다시 확인해 주세요.',
        );
      const version = await writeCloud(0, latest, epoch);
      await markSuccess(version, latest, epoch, '새 개인 클라우드에 안전하게 연결했어요.');
      return;
    }
    const base = checkpoint.current;
    if (base && remote.version === base.version && remoteDigest === base.digest) {
      const version = await writeCloud(remote.version, latest, epoch);
      await markSuccess(version, latest, epoch, '오프라인에서 이어간 공부를 동기화했어요.');
      return;
    }
    if (
      remote.state &&
      ((base && localDigest === base.digest) ||
        (mode === 'initial' && !hasStudyRecords(local.current)))
    ) {
      // A last synchronous check prevents edits during async hashing from being overwritten.
      if (signature(local.current) !== signature(latest))
        throw new SyncFailure(
          'conflict',
          '동기화 확인 중 이 기기의 기록이 바뀌었어요. 두 기록을 확인해 주세요.',
        );
      if (!apply.current(remote.state))
        throw new SyncFailure(
          'storage',
          '새 클라우드 기록을 저장하지 못했어요. 이 기기의 원본은 유지돼요.',
        );
      await markSuccess(
        remote.version,
        remote.state,
        epoch,
        '다른 기기의 학습 변경사항을 불러왔어요.',
      );
      return;
    }
    throw new SyncFailure(
      'conflict',
      '로그인은 유지됐어요. 이 기기와 클라우드의 다른 기록을 확인해 주세요.',
    );
  }
  async function failure(error: unknown, epoch: number) {
    if (!current(epoch)) return;
    const problem =
      error instanceof SyncFailure
        ? error
        : new SyncFailure('invalid-data', '동기화 자료를 확인하지 못했어요. 원본은 유지돼요.');
    setDiagnostic({ kind: problem.kind, status: problem.httpStatus, requestId: problem.requestId });
    if (problem.kind === 'expired') {
      const expiredToken = token.current;
      token.current = '';
      checkpoint.current = null;
      setHasCredential(false);
      clearRetry();
      await forgetLogin(expiredToken).catch(() => {});
      if (current(epoch)) transition('expired', problem.message);
      return;
    }
    if (transientFailure(problem) && token.current) {
      if (!navigator.onLine) {
        transition('offline', '오프라인이에요. 로그인은 유지 중이며 연결되면 자동으로 동기화해요.');
        return;
      }
      if (retries.current < MAX_SYNC_RETRIES) {
        const attempt = ++retries.current,
          delay = retryDelay(attempt, problem.retryAfterMs);
        transition(
          'retrying',
          `${problem.message} 잠시 후 자동 재시도해요. (${attempt}/${MAX_SYNC_RETRIES})`,
        );
        clearRetry();
        timer.current = setTimeout(() => {
          timer.current = null;
          void run();
        }, delay);
        return;
      }
      transition(
        'unavailable',
        `${problem.message} 자동 재시도는 잠시 멈췄어요. 앱으로 돌아오거나 연결이 복구되면 다시 확인해요.`,
      );
      return;
    }
    const next: Connection =
      problem.kind === 'conflict'
        ? 'conflict'
        : problem.kind === 'forbidden'
          ? 'forbidden'
          : problem.kind === 'storage'
            ? 'storage-error'
            : 'invalid-data';
    transition(next, problem.message);
  }
  function finish(epoch: number) {
    if (!current(epoch)) return;
    busyRef.current = false;
    setBusy(false);
    if (pending.current && statusRef.current === 'connected') {
      pending.current = false;
      queueMicrotask(() => void run());
    }
  }
  async function establishRememberedSession(epoch: number) {
    if (!creatingSession.current) return;
    const raw = await request('/api/session', { method: 'POST' }, epoch);
    const parsed = z
      .object({
        token: z.string().regex(/^bkit_sync_[a-f0-9]{64}$/),
        expiresAt: z.number().positive(),
      })
      .safeParse(raw);
    if (!parsed.success)
      throw new SyncFailure('invalid-data', '로그인 유지 응답을 확인하지 못했어요.');
    try {
      await rememberLogin(parsed.data);
    } catch {
      throw new SyncFailure(
        'storage',
        '로그인을 저장하지 못했어요. 이 기기 공부 기록은 그대로예요.',
      );
    }
    if (!current(epoch)) return;
    token.current = parsed.data.token;
    creatingSession.current = false;
  }
  async function run(mode: 'sync' | 'initial' | 'cloud' | 'this' = 'sync') {
    if (!mounted.current || !token.current) return;
    if (busyRef.current) {
      if (mode === 'sync') pending.current = true;
      return;
    }
    clearRetry();
    const epoch = generation.current;
    busyRef.current = true;
    setBusy(true);
    try {
      await establishRememberedSession(epoch);
      await reconcile(epoch, mode === 'sync' && initializing.current ? 'initial' : mode);
    } catch (error) {
      await failure(error, epoch);
    } finally {
      finish(epoch);
    }
  }
  function sync() {
    if (
      ['conflict', 'expired', 'forbidden', 'invalid-data', 'storage-error'].includes(
        statusRef.current,
      )
    )
      return;
    void run();
  }
  function retry() {
    clearRetry();
    retries.current = 0;
    void run();
  }
  async function connect() {
    if (token.current) {
      retry();
      return;
    }
    if (busyRef.current || !prepared || !clientId.current) return;
    // Retain the existing Google popup gesture and session protocol.
    const authorization = authorizeGoogleIdentity(clientId.current);
    const epoch = ++generation.current;
    busyRef.current = true;
    setBusy(true);
    transition('connecting', 'Google 본인 계정을 확인하고 있어요…');
    try {
      const googleToken = await authorization;
      if (!current(epoch)) return;
      token.current = googleToken;
      if (!remember) await forgetLogin();
      creatingSession.current = remember && rememberSupported;
      initializing.current = true;
      await establishRememberedSession(epoch);
      setHasCredential(true);
      await reconcile(epoch, 'initial');
    } catch (error) {
      if (!current(epoch)) return;
      if (!token.current) {
        transition('disconnected', 'Google 연결을 마치지 못했어요. 다시 연결해 주세요.');
      } else {
        setHasCredential(true);
        await failure(error, epoch);
      }
    } finally {
      finish(epoch);
    }
  }
  async function resolve(which: 'cloud' | 'this') {
    await run(which);
  }
  async function disconnect() {
    const previous = token.current;
    const epoch = ++generation.current;
    busyRef.current = false;
    setBusy(false);
    clearRetry();
    pending.current = false;
    retries.current = 0;
    // Old in-flight reads/writes are ignored from here onward.
    try {
      await forgetLogin();
    } catch {
      transition('storage-error', '로그인 저장 해제에 실패했어요. 다시 시도해 주세요.');
      return;
    }
    if (!current(epoch)) return;
    token.current = '';
    creatingSession.current = false;
    initializing.current = false;
    checkpoint.current = null;
    busyRef.current = false;
    setBusy(false);
    setHasCredential(false);
    setDiagnostic(null);
    transition('disconnected', '연결을 끊었어요. 이 기기의 기록은 그대로 있어요.');
    if (previous.startsWith('bkit_sync_')) {
      try {
        const res = await fetch(API_URL + '/api/session', {
          method: 'DELETE',
          headers: tokenHeaders(previous),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok && res.status !== 401) throw Error();
      } catch {
        if (current(epoch))
          setMessage(
            '이 기기의 로그인 저장은 해제했어요. 서버 해제는 연결 문제로 확인하지 못했으며 세션은 최대 30일 후 만료돼요.',
          );
      }
    }
  }
  useEffect(() => {
    mounted.current = true;
    const epoch = ++generation.current;
    void loginRecord()
      .then(async (saved) => {
        if (!current(epoch) || !saved) return;
        if (saved.expiresAt <= Date.now()) {
          await forgetLogin();
          if (current(epoch))
            transition('expired', '저장된 로그인 유효 기간이 끝났어요. 다시 연결해 주세요.');
          return;
        }
        token.current = saved.token;
        checkpoint.current = saved.checkpoint ?? null;
        setHasCredential(true);
        transition('connecting', '저장된 로그인으로 동기화를 확인하고 있어요…');
        await run();
      })
      .catch(() => {
        if (current(epoch))
          transition(
            'storage-error',
            '저장된 로그인에 접근하지 못했어요. 이 기기 공부 기록은 유지돼요.',
          );
      });
    const resume = () => {
      if (
        !mounted.current ||
        !token.current ||
        busyRef.current ||
        ['conflict', 'expired', 'forbidden', 'storage-error', 'invalid-data'].includes(
          statusRef.current,
        )
      )
        return;
      clearRetry();
      retries.current = 0;
      void run();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') resume();
    };
    const offline = () => {
      if (token.current) {
        clearRetry();
        transition('offline', '오프라인이에요. 로그인과 공부 기록을 유지하며 연결을 기다려요.');
      }
    };
    window.addEventListener('online', resume);
    window.addEventListener('offline', offline);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      mounted.current = false;
      busyRef.current = false;
      pending.current = false;
      generation.current++;
      clearRetry();
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', offline);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  const contentSignature = useMemo(() => signature(localState), [localState]);
  useEffect(() => {
    if (status !== 'connected') return;
    const handle = setTimeout(sync, 1800);
    return () => clearTimeout(handle);
  }, [contentSignature, status]);
  useEffect(() => {
    if (status !== 'connected') return;
    const handle = setInterval(sync, 30000);
    return () => clearInterval(handle);
  }, [status]);
  return {
    status,
    message,
    lastSynced,
    prepared,
    busy,
    prepare,
    connect,
    sync,
    retry,
    resolve,
    disconnect,
    remember,
    setRemember,
    rememberSupported,
    hasCredential,
    authError,
    diagnostic,
  };
}

type PrivateStudyBridge = ReturnType<typeof usePrivateStudySync>;
export function PrivateSyncPanel({ sync }: { sync: PrivateStudyBridge }) {
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    if (!sync.hasCredential) void sync.prepare();
  }, [sync.hasCredential, sync.status === 'expired']);
  return (
    <section className="panel bkit-cloud-panel" aria-label="BKIT 개인 클라우드">
      <div className="section-head">
        <h2>
          <Cloud size={20} /> BKIT Private Cloud
        </h2>
        <span className={'bkit-cloud-state bkit-cloud-state--' + sync.status}>
          {
            {
              connected: '연결됨',
              conflict: '선택 필요',
              connecting: '로그인 확인 중',
              offline: '로그인 유지 · 오프라인',
              retrying: '로그인 유지 · 재시도 중',
              unavailable: '로그인 유지 · 연결 대기',
              expired: '로그인 만료',
              forbidden: '접근 확인 필요',
              'storage-error': '저장 확인 필요',
              'invalid-data': '자료 확인 필요',
              disconnected: '이 기기만',
            }[sync.status]
          }
        </span>
      </div>
      <p className="muted">
        아이폰 · 아이패드 · PC의 과제, 일정, 집중 완료 기록을 같은 Google 본인 계정으로 연결해요.
        실시간 타이머·사진·PDF·필기 원본은 이 기기에만 보관돼요.
      </p>
      <p role="status" className="bkit-cloud-status">
        {sync.message}
      </p>
      {sync.authError && !sync.hasCredential && <p className="hint">{sync.authError}</p>}
      {sync.diagnostic && (
        <details className="sync-diagnostic">
          <summary>연결 오류 정보</summary>
          <small>
            {sync.diagnostic.kind}
            {sync.diagnostic.status ? ` · HTTP ${sync.diagnostic.status}` : ''}
            {sync.diagnostic.requestId ? ` · 요청 ${sync.diagnostic.requestId}` : ''}
          </small>
        </details>
      )}
      {sync.lastSynced && <p className="hint">마지막 확인: {sync.lastSynced}</p>}
      {sync.rememberSupported && !sync.hasCredential && (
        <label className="private-remember-login">
          <input
            type="checkbox"
            checked={sync.remember}
            onChange={(e) => sync.setRemember(e.target.checked)}
          />
          이 기기에서 로그인 유지 (최대 30일 · 공용 기기는 해제)
        </label>
      )}
      {!sync.prepared && !sync.hasCredential && (
        <button type="button" className="text-button" onClick={() => void sync.prepare()}>
          로그인 연결 다시 확인
        </button>
      )}
      <div className="button-stack">
        {!sync.hasCredential && sync.status !== 'connecting' ? (
          <button
            type="button"
            className="primary"
            disabled={!sync.prepared || sync.busy}
            onClick={() => void sync.connect()}
          >
            <ShieldCheck size={18} />{' '}
            {sync.prepared ? 'Google로 개인 클라우드 연결' : 'Google 로그인 준비 중…'}
          </button>
        ) : null}
        {sync.hasCredential &&
          [
            'offline',
            'retrying',
            'unavailable',
            'forbidden',
            'invalid-data',
            'storage-error',
          ].includes(sync.status) && (
            <button type="button" className="secondary" disabled={sync.busy} onClick={sync.retry}>
              로그인 유지한 채 다시 동기화
            </button>
          )}
        {sync.status === 'connected' && (
          <>
            <button
              type="button"
              className="secondary"
              disabled={sync.busy}
              onClick={() => void sync.sync()}
            >
              <RefreshCw size={17} /> 지금 동기화
            </button>
            <button
              type="button"
              className="secondary"
              disabled={sync.busy}
              onClick={() => void sync.disconnect()}
            >
              이 기기 연결 해제
            </button>
          </>
        )}
        {sync.hasCredential && sync.status !== 'connected' && (
          <button
            type="button"
            className="secondary"
            disabled={sync.busy}
            onClick={() => void sync.disconnect()}
          >
            이 기기 연결 해제
          </button>
        )}
        {sync.status === 'conflict' && (
          <>
            <p className="hint">
              주의: 선택한 기록으로 과제·일정·완료 기록이 교체될 수 있어요. 다른 기기에서 변경한
              내용은 먼저 확인해 주세요.
            </p>
            <button
              type="button"
              className="secondary"
              disabled={sync.busy}
              onClick={() => {
                if (
                  window.confirm(
                    '클라우드 공부 기록을 이 기기로 가져올까요? 이 기기의 과제·공부 기록을 덮어씁니다.',
                  )
                )
                  void sync.resolve('cloud');
              }}
            >
              <DownloadCloud size={17} /> 클라우드 기록 가져오기
            </button>
            <button
              type="button"
              className="secondary"
              disabled={sync.busy}
              onClick={() => {
                if (
                  window.confirm(
                    '이 기기의 공부 기록으로 클라우드를 교체할까요? 다른 기기의 미동기화 기록은 복구되지 않을 수 있어요.',
                  )
                )
                  void sync.resolve('this');
              }}
            >
              <UploadCloud size={17} /> 이 기기의 기록 유지
            </button>
          </>
        )}
      </div>
      <button
        className="text-button bkit-cloud-advanced"
        type="button"
        aria-expanded={advanced}
        onClick={() => setAdvanced((v) => !v)}
      >
        {advanced ? '동기화 안내 닫기' : '어떤 정보가 동기화되나요?'}
      </button>
      {advanced && (
        <p className="hint">
          과제·수행평가·시간표·공부 완료 세션·성적·복습 진행·학습 목표를 개인 클라우드에 저장합니다.
          사진 원본, 사진 첨부 번호, 진행 중 타이머, 자동 계산 계획표는 공유하지 않습니다. 자료·문항
          연결 정보는 기기별로 보관하며, 기록당 집중 구간 102개를 넘으면 동기화를 중단합니다. 모든
          자료 이전에는 전체 ZIP을 사용하세요. 로그인 유지를 선택하면 Google 토큰 대신 동기화에만
          쓰는 BKIT 세션을 이 기기에 보관해요. 연결 해제로 삭제할 수 있어요. 사진·답안 원본은
          로그인만으로 다른 기기에 옮겨지지 않아요. 로그인하지 않은 친구는 다른 사람의 기록을 볼 수
          없습니다. 서버는 설정된 본인 Google 계정만 허용합니다. 인터넷이 없어도 이 기기에서 공부할
          수 있어요.
        </p>
      )}
      <p className="bkit-cloud-privacy">
        <CheckCircle2 size={16} />
        공부 기록은 우선 이 기기에 저장되며, 연결 중일 때 약 30초마다 클라우드를 확인합니다.
      </p>
      <p className="hint">
        사진·학습지 원본과 자료의 문항·풀이 기록은 클라우드에 저장되지 않아요. 다른 기기로 옮기거나
        보관하려면 전체 ZIP 백업을 사용하세요.
      </p>
    </section>
  );
}
