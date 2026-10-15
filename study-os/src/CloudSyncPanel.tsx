import {useEffect,useState} from 'react';
import {Cloud, ExternalLink, Link2, RefreshCw, ShieldCheck, UploadCloud, DownloadCloud, Unplug} from 'lucide-react';
import type {StudyCloudBridge} from './useStudyCloud';
import {prepareGoogleIdentity} from './cloudClient';

export function CloudSyncPanel({cloud}:{cloud:StudyCloudBridge}){
  const [advanced,setAdvanced]=useState(false);
  const [authReady,setAuthReady]=useState(false);
  const [authError,setAuthError]=useState('');
  useEffect(()=>{
    let active=true;
    // Prepare Google's script before the user presses Connect: Safari's
    // OAuth popup must open from an actual user gesture.
    void prepareGoogleIdentity().then(()=>{if(active)setAuthReady(true);})
      .catch(()=>{if(active)setAuthError('Google 로그인 준비에 실패했어. 네트워크나 콘텐츠 차단 설정을 확인하고 설정 화면을 다시 열어줘.');});
    return ()=>{active=false;};
  },[]);
  const {configuration:config}=cloud;
  const isLinked=cloud.status==='connected'||cloud.status==='conflict';
  const cloudUrl = config.sheetId && /^[\w-]{20,}$/.test(config.sheetId)
    ? 'https://docs.google.com/spreadsheets/d/'+config.sheetId+'/edit' : null;
  async function confirmPull(){
    if(!window.confirm('Google Sheet의 과제·시간표·목표를 기준으로 이 기기 계획을 교체할까? 진행 중 타이머와 이미 저장한 학습 기록은 그대로 둬.'))return;
    await cloud.pull(true);
  }
  async function confirmPush(){
    if(!window.confirm('이 기기의 과제·시간표·목표로 Google Sheet 내용을 덮어쓸까? 다른 곳에서 방금 수정한 계획이 사라질 수 있어.'))return;
    await cloud.push(true);
  }
  return (
    <section className="panel bkit-cloud-panel" aria-label="BKIT 클라우드 동기화">
      <div className="section-head">
        <h2><Cloud size={20} aria-hidden="true" /> BKIT Cloud</h2>
        <span className={'bkit-cloud-state bkit-cloud-state--'+cloud.status}>
          {cloud.status==='connected'?'동기화 중':
           cloud.status==='connecting'?'연결 중':
           cloud.status==='conflict'?'선택 필요':
           cloud.status==='error'?'확인 필요':'연결 전'}
        </span>
      </div>
      <p className="muted">
        ChatGPT와 BKIT가 같은 Google Sheet의 과제·시간표·목표를 공유해.
        공부 답변·건강 정보·전체 ChatGPT 대화는 자동으로 전송하지 않아.
      </p>
      <p className="bkit-cloud-status" role="status" aria-live="polite">{cloud.message}</p>
      {authError&&<p className="hint" role="alert">{authError}</p>}
      {cloud.syncedAt&&<p className="hint">마지막 확인: {cloud.syncedAt}</p>}
      <div className="button-stack bkit-cloud-actions">
        {cloudUrl&&<a href={cloudUrl} target="_blank" rel="noopener noreferrer" className="secondary">
          <ExternalLink size={17}/> 공유 시트 열기
        </a>}
        {!isLinked&&<button className="primary" type="button" disabled={cloud.status==='connecting'||!authReady}
          onClick={()=>void cloud.connect()}>
          <Link2 size={17}/> {cloud.status==='connecting'?'로그인 요청 중…':!authReady?'Google 로그인 준비 중…':'Google 계정 연결'}
        </button>}
        {cloud.status==='connected'&&<>
          <button className="secondary" type="button" onClick={()=>void cloud.refresh()}>
            <RefreshCw size={17}/> 지금 동기화 확인
          </button>
          <button className="secondary" type="button" onClick={()=>cloud.disconnect()}>
            <Unplug size={17}/> 이 기기 연결 끊기
          </button>
        </>}
        {cloud.status==='conflict'&&<>
          <button className="secondary" type="button" onClick={confirmPull}>
            <DownloadCloud size={17}/> 시트 내용을 BKIT로 가져오기
          </button>
          <button className="secondary" type="button" onClick={confirmPush}>
            <UploadCloud size={17}/> BKIT 내용을 시트로 올리기
          </button>
        </>}
      </div>
      <button type="button" className="text-button bkit-cloud-advanced"
        aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>
        {advanced?'연결 설정 닫기':'연결 설정 / 처음 사용하는 방법'}
      </button>
      {advanced&&<div className="bkit-cloud-config">
        <label className="field">
          <span>공유 Google Sheet 주소</span>
          <input type="url" autoComplete="off"
            value={config.sheetId.startsWith('https://')?config.sheetId:(config.sheetId?'https://docs.google.com/spreadsheets/d/'+config.sheetId+'/edit':'')}
            onChange={e=>cloud.setConfig({...config,sheetId:e.target.value})}
            placeholder="https://docs.google.com/spreadsheets/d/.../edit"/>
        </label>
        <label className="field">
          <span>Google OAuth 웹 클라이언트 ID (비밀번호 아님)</span>
          <input type="text" autoComplete="off" spellCheck={false}
            value={config.oauthClientId}
            onChange={e=>cloud.setConfig({...config,oauthClientId:e.target.value})}
            placeholder="xxxx.apps.googleusercontent.com"/>
        </label>
        <p className="hint">
          별도의 AI API 키는 필요 없어. Google Cloud Console에서 Sheets API를 사용 설정하고
          웹 OAuth 클라이언트를 만들어 승인된 JavaScript 원본에 https://teambkit.com 을 등록한 뒤,
          공개 클라이언트 ID만 입력하면 돼. Google에서 별도의 접근 동의를 요청해.
        </p>
        <p className="hint">
          Google Sheets를 수정할 수 있는 권한을 요청하므로 개인 Google 계정만 연결해.
          Google 이메일 확인 권한도 BKIT 서버 접근 제어에만 사용해. 인증 토큰은 브라우저 메모리에만 두고 저장하지 않아. 새로 방문하면 다시 연결해야 해.
        </p>
      </div>}
      <p className="bkit-cloud-privacy"><ShieldCheck size={16} aria-hidden="true"/>
        연결된 동안 변경 사항을 약 30초마다 확인해. 오프라인에서는 로컬에 저장하고,
        두 곳이 동시에 변경되면 자동으로 덮어쓰지 않고 선택을 요청해.
      </p>
    </section>
  );
}
