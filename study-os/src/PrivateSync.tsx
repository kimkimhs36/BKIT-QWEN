import { useEffect, useRef, useState, useMemo } from 'react';
import { Cloud, CheckCircle2, DownloadCloud, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { z } from 'zod';
import { API_URL } from './ai';
import { authorizeGoogleIdentity, prepareGoogleIdentity } from './cloudClient';
import { stateSchema, type State } from './model';

/** Never send a live focus timer or device-only photo references to the cloud. */
export function portableStudyState(state: State): State {
  return {
    ...state,
    learningEvents: undefined,
    problemRetests: undefined,
    exams: undefined,
    learning: undefined,
    revision: 0,
    tasks: state.tasks.map(({ attachmentIds: _privatePhotos, ...task }) => task),
    active: null,
    quickTimer: null, // device-only live stopwatch must not sync or leak timer metadata
    plan: [],
    undo: null,
  };
}
/** Older production schemas omit local learning metadata; never erase it on download. */
export function mergePrivateStudyState(local: State, incoming: State): State {
  return {
    ...incoming, active:local.active, quickTimer:local.quickTimer,
    learningEvents:local.learningEvents, problemRetests:local.problemRetests,
    exams:local.exams, learning:local.learning,
    tasks:incoming.tasks.map(task => {
      const existing = local.tasks.find(t => t.id === task.id);
      return {...task, attachmentIds:existing?.attachmentIds,
        submissionRequired:task.submissionRequired ?? existing?.submissionRequired,
        capture:task.capture ?? existing?.capture};
    }),
    sessions:incoming.sessions.map(session => {
      const existing = local.sessions.find(s => s.id === session.id);
      return {...session, quick:session.quick ?? existing?.quick,
        resourceId:existing?.resourceId};
    }),
    plan:[], undo:null,
  };
}
const cloudSchema = z.object({
  version: z.number().int().nonnegative(),
  state: stateSchema.nullable(),
});
const versionSchema = z.object({ version: z.number().int().positive() });
type Connection = 'disconnected' | 'connecting' | 'connected' | 'conflict' | 'error';
const tokenHeaders = (token: string) => ({Authorization: 'Bearer ' + token});
function signature(s: State) {
  return JSON.stringify(portableStudyState(s));
}
function hasStudyRecords(s: State) {
  return Boolean(s.tasks.length || s.schedules.length || s.sessions.length || s.grades.length ||
    s.reviewsDone.length || s.reviewProgress?.length || s.active);
}
export function usePrivateStudySync(localState: State, applyIncoming: (state: State) => boolean) {
  const [status, setStatus] = useState<Connection>('disconnected');
  const [message, setMessage] = useState('이 기기에만 저장 중 · Google 연결 시 개인 클라우드 동기화');
  const [lastSynced, setLastSynced] = useState('');
  const [clientId, setClientId] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [busy, setBusy] = useState(false);
  const local = useRef(localState), apply = useRef(applyIncoming);
  const token = useRef(''), version = useRef(0), baseline = useRef('');
  const busyRef = useRef(false);
  const connection = useRef(0);
  local.current = localState;
  apply.current = applyIncoming;

  const preparing = useRef(false);
  // Load identity only when the learner visits the private cloud settings.
  // Ordinary study and OCR must make no external requests.
  async function prepare() {
    if (preparing.current || prepared) return;
    preparing.current = true;
    try {
      const res = await fetch(API_URL + '/api/config', {signal: AbortSignal.timeout(10000)});
      if (!res.ok) throw new Error('서버 연결을 확인하지 못했어요.');
      const config = z.object({googleClientId:z.string()}).parse(await res.json());
      if (!config.googleClientId) throw new Error('Google 계정 설정을 준비 중이에요.');
      await prepareGoogleIdentity();
      setClientId(config.googleClientId);
      setPrepared(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Google 연결 준비에 실패했어요.');
    } finally { preparing.current = false; }
  }
  useEffect(() => () => { connection.current++; token.current=''; }, []);

  async function readCloud() {
    const res = await fetch(API_URL + '/api/sync', {
      headers: tokenHeaders(token.current),
      cache:'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 401) throw new Error('Google 계정 인증이 만료됐어요. 다시 연결해 주세요.');
    if (!res.ok) throw new Error('클라우드 기록을 읽지 못했어요. 나중에 다시 시도해 주세요.');
    return cloudSchema.parse(await res.json());
  }
  async function writeCloud(expectedVersion: number, study: State) {
    if (study.sessions.some(s => (s.segments?.length ?? 0) > 102))
      throw new Error('현재 서버는 기록당 집중 구간 102개까지 지원해요. 이 기기의 전체 시간·구간은 보존되며 ZIP으로 옮길 수 있어요.');
    const res = await fetch(API_URL + '/api/sync', {
      method:'PUT',
      headers:{...tokenHeaders(token.current),'Content-Type':'application/json'},
      body:JSON.stringify({expectedVersion,state:portableStudyState(study)}),
      signal:AbortSignal.timeout(18000),
    });
    if (res.status === 409) throw new Error('다른 기기에서 먼저 수정했어요. 어느 기록을 유지할지 확인해 주세요.');
    if (res.status === 401) throw new Error('Google 계정 인증이 만료됐어요. 다시 연결해 주세요.');
    if (!res.ok) throw new Error('클라우드 저장에 실패했어요. 이 기기의 기록은 그대로 있어요.');
    return versionSchema.parse(await res.json()).version;
  }
  function markSuccess(nextVersion: number, study: State, description: string) {
    version.current = nextVersion;
    baseline.current = signature(study);
    setLastSynced(new Date().toLocaleTimeString('ko-KR'));
    setStatus('connected');
    setMessage(description);
  }
  async function connect() {
    if (busyRef.current || !prepared || !clientId) return;
    const ticket = ++connection.current;
    // This call opens the Google popup from the original click/tap (Safari).
    const authorization = authorizeGoogleIdentity(clientId);
    busyRef.current = true;
    setBusy(true);setStatus('connecting');setMessage('Google 본인 계정을 확인하고 있어요…');
    try {
      const authorized = await authorization;
      if (ticket !== connection.current) return;
      token.current = authorized;
      const remote = await readCloud();
      if (ticket !== connection.current) return;
      if (remote.state) {
        if (hasStudyRecords(local.current) && signature(local.current) !== signature(remote.state)) {
          version.current = remote.version;
          setStatus('conflict');
          setMessage('서로 다른 기록이 있어요. 아래에서 어느 쪽을 유지할지 선택해 주세요.');
          return;
        }
        if (!apply.current(remote.state)) throw new Error('클라우드 기록을 이 기기에 적용하지 못했어요.');
        markSuccess(remote.version, remote.state, '연결됐어요. 이 기기의 공부 기록도 자동으로 반영돼요.');
      } else {
        const snapshot = portableStudyState(local.current);
        const next = await writeCloud(0, snapshot);
        if (ticket !== connection.current) return;
        markSuccess(next, snapshot, '첫 개인 클라우드가 준비됐어요. 이제 공부를 시작해 보세요.');
      }
    } catch (e) {
      if (ticket !== connection.current) return;
      token.current = '';
      setStatus('error');
      setMessage(e instanceof Error ? e.message : '클라우드 연결을 확인하지 못했어요.');
    } finally { if (ticket === connection.current) { busyRef.current = false;setBusy(false); } }
  }
  async function sync() {
    if (busyRef.current || !token.current || !baseline.current || status !== 'connected') return;
    const ticket = connection.current;
    busyRef.current = true;setBusy(true);
    try {
      const remote = await readCloud();
      if (ticket !== connection.current) return;
      const current = portableStudyState(local.current);
      const localSig = signature(current);
      const cloudSig = remote.state ? signature(remote.state) : '';
      const ourChange = localSig !== baseline.current;
      const cloudChange = cloudSig !== baseline.current || remote.version !== version.current;
      if (ourChange && cloudChange) {
        version.current = remote.version;
        setStatus('conflict');setMessage('두 기기에서 동시에 변경됐어요. 덮어쓰기 전에 확인해 주세요.');
      } else if (cloudChange) {
        if (!remote.state || !apply.current(remote.state)) throw new Error('새 클라우드 기록을 적용하지 못했어요.');
        markSuccess(remote.version, remote.state, '다른 기기의 학습 변경사항을 불러왔어요.');
      } else if (ourChange) {
        const next = await writeCloud(remote.version, current);
        if (ticket !== connection.current) return;
        markSuccess(next, current, '이 기기의 새 공부 기록을 동기화했어요.');
      } else {
        version.current = remote.version;
        setLastSynced(new Date().toLocaleTimeString('ko-KR'));
      }
    } catch (e) {
      if (ticket !== connection.current) return;
      const msg = e instanceof Error ? e.message : '동기화를 확인하지 못했어요.';
      if (msg.includes('다른 기기에서')) {
        setStatus('conflict');
      } else {
        setStatus('error');
      }
      setMessage(msg);
    } finally {if (ticket === connection.current) {busyRef.current=false;setBusy(false);}}
  }
  async function resolve(which:'cloud'|'this') {
    if (busyRef.current || !token.current) return;
    const ticket = connection.current;
    busyRef.current=true;setBusy(true);
    try {
      const remote = await readCloud();
      if (ticket !== connection.current) return;
      if (which === 'cloud') {
        if (!remote.state || !apply.current(remote.state)) throw new Error('가져올 클라우드 기록이 없어요.');
        markSuccess(remote.version, remote.state, '클라우드 기록을 가져왔어요.');
      } else {
        const current = portableStudyState(local.current);
        const next = await writeCloud(remote.version,current);
        if (ticket !== connection.current) return;
        markSuccess(next,current,'이 기기의 기록을 개인 클라우드에 저장했어요.');
      }
    } catch (e) {if (ticket === connection.current) {setStatus('error');setMessage(e instanceof Error?e.message:'동기화 실패');}}
    finally {if (ticket === connection.current) {busyRef.current=false;setBusy(false);}}
  }
  const contentSignature = useMemo(() => signature(localState), [localState]);
  useEffect(() => {
    if (status !== 'connected') return;
    const t = window.setTimeout(() => void sync(), 1800);
    return () => window.clearTimeout(t);
  }, [contentSignature,status]);
  useEffect(() => {
    if (status !== 'connected') return;
    const timer = window.setInterval(() => void sync(), 30000);
    const onVisible = () => {if (document.visibilityState === 'visible') void sync();};
    document.addEventListener('visibilitychange',onVisible);
    window.addEventListener('online',onVisible);
    return () => {window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onVisible);};
  }, [status]);
  function disconnect() {
    connection.current++;busyRef.current=false;setBusy(false);
    token.current='';baseline.current='';version.current=0;
    setStatus('disconnected');setMessage('연결을 끊었어요. 이 기기의 기록은 그대로 있어요.');
  }
  return {status,message,lastSynced,prepared,busy,prepare,connect,sync,resolve,disconnect};
}
type PrivateStudyBridge = ReturnType<typeof usePrivateStudySync>;
export function PrivateSyncPanel({sync}:{sync:PrivateStudyBridge}) {
  const [advanced,setAdvanced] = useState(false);
  useEffect(() => { void sync.prepare(); }, []);
  return <section className="panel bkit-cloud-panel" aria-label="BKIT 개인 클라우드">
    <div className="section-head"><h2><Cloud size={20}/> BKIT Private Cloud</h2>
      <span className={'bkit-cloud-state bkit-cloud-state--'+sync.status}>
        {sync.status==='connected'?'연결됨':sync.status==='conflict'?'선택 필요':sync.status==='connecting'?'연결 중':sync.status==='error'?'재연결 필요':'이 기기만'}
      </span></div>
    <p className="muted">아이폰 · 아이패드 · PC의 과제, 일정, 집중 완료 기록을 같은 Google 본인 계정으로 연결해요.
      실시간 타이머·사진·PDF·필기 원본은 이 기기에만 보관돼요.</p>
    <p role="status" className="bkit-cloud-status">{sync.message}</p>
    {sync.lastSynced&&<p className="hint">마지막 확인: {sync.lastSynced}</p>}
    <div className="button-stack">
      {sync.status==='disconnected'||sync.status==='error'? <button type="button" className="primary"
        disabled={!sync.prepared || sync.busy} onClick={()=>void sync.connect()}>
        <ShieldCheck size={18}/> {sync.prepared?'Google로 개인 클라우드 연결':'Google 로그인 준비 중…'}
      </button>:null}
      {sync.status==='connected'&&<>
        <button type="button" className="secondary" disabled={sync.busy} onClick={()=>void sync.sync()}>
          <RefreshCw size={17}/> 지금 동기화
        </button>
        <button type="button" className="secondary" onClick={sync.disconnect}>이 기기 연결 해제</button>
      </>}
      {sync.status==='conflict'&&<>
        <p className="hint">주의: 선택한 기록으로 과제·일정·완료 기록이 교체될 수 있어요. 다른 기기에서 변경한 내용은 먼저 확인해 주세요.</p>
        <button type="button" className="secondary" disabled={sync.busy}
          onClick={()=>{if(window.confirm('클라우드 공부 기록을 이 기기로 가져올까요? 이 기기의 과제·공부 기록을 덮어씁니다.'))void sync.resolve('cloud');}}>
          <DownloadCloud size={17}/> 클라우드 기록 가져오기
        </button>
        <button type="button" className="secondary" disabled={sync.busy}
          onClick={()=>{if(window.confirm('이 기기의 공부 기록으로 클라우드를 교체할까요? 다른 기기의 미동기화 기록은 복구되지 않을 수 있어요.'))void sync.resolve('this');}}>
          <UploadCloud size={17}/> 이 기기의 기록 유지
        </button>
      </>}
    </div>
    <button className="text-button bkit-cloud-advanced" type="button"
      aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>
      {advanced?'동기화 안내 닫기':'어떤 정보가 동기화되나요?'}
    </button>
    {advanced&&<p className="hint">과제·수행평가·시간표·공부 완료 세션·성적·복습 진행·학습 목표를 개인 클라우드에 저장합니다.
      사진 원본, 사진 첨부 번호, 진행 중 타이머, 자동 계산 계획표는 공유하지 않습니다.
      현재 서버는 바로 시작 기록의 수정 표시와 자료 연결 정보를 다른 기기에 전달하지 못하며, 기록당 집중 구간 102개를 넘으면 동기화를 중단합니다. 모든 자료 이전에는 전체 ZIP을 사용하세요.
      로그인하지 않은 친구는 다른 사람의 기록을 볼 수 없습니다.
      서버는 설정된 본인 Google 계정만 허용합니다. 인터넷이 없어도 이 기기에서 공부할 수 있어요.</p>}
    <p className="bkit-cloud-privacy"><CheckCircle2 size={16}/>
      공부 기록은 우선 이 기기에 저장되며, 연결 중일 때 약 30초마다 클라우드를 확인합니다.</p>
  </section>;
}
