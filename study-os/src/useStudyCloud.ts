import { useEffect, useRef, useState, useMemo } from 'react';
import type { State } from './model';
import {
  authorizeGoogle, loadCloudConfig, storeCloudConfig,
  StudySheetClient, type CloudConfig,
} from './cloudClient';
import {
  cloudSignature, localSignature, remoteIsEmpty, type StudyCloudData,
} from './cloudSheet';

type CloudStatus = 'disconnected' | 'connecting' | 'connected' | 'conflict' | 'error';
export function useStudyCloud(state:State, applyRemote:(remote:StudyCloudData)=>boolean) {
  const [status,setStatus]=useState<CloudStatus>('disconnected');
  const [message,setMessage]=useState('아직 Google 계정 연결 전이야.');
  const [configuration,setConfiguration]=useState<CloudConfig>(()=>loadCloudConfig());
  const [syncedAt,setSyncedAt]=useState('');
  const client=useRef<StudySheetClient|null>(null);
  const busy=useRef(false);
  const connection=useRef(0);
  const lastCloud=useRef('');
  const lastLocal=useRef('');
  const local=useRef(state);
  const apply=useRef(applyRemote);
  const statusRef=useRef(status);
  local.current=state;apply.current=applyRemote;statusRef.current=status;
  useEffect(()=>()=>{connection.current++;client.current=null;},[]);

  useEffect(()=>{
    const u=new URL(window.location.href);
    const id=u.searchParams.get('bkit_sheet');
    if(id) {
      setConfiguration(v=>({...v,sheetId:id}));
      u.searchParams.delete('bkit_sheet');
      history.replaceState(null,'',u.pathname+u.search+u.hash);
    }
  },[]);
  function setConfig(config:CloudConfig) {
    connection.current++;busy.current=false;
    setConfiguration(config);
    setStatus('disconnected');
    client.current=null;
    lastCloud.current='';
    lastLocal.current='';
  }
  function markSuccess(message:string,sig:string) {
    lastCloud.current=sig;
    // Record the version actually read/written, not changes made during an in-flight request.
    lastLocal.current=sig;
    setSyncedAt(new Date().toLocaleTimeString('ko-KR'));
    setMessage(message);
    setStatus('connected');
  }
  async function connect() {
    if(busy.current)return;
    const ticket=++connection.current;
    busy.current=true;setStatus('connecting');setMessage('Google 로그인 요청 중…');
    try{
      const saved=storeCloudConfig(configuration);
      setConfiguration(saved);
      const token=await authorizeGoogle(saved.oauthClientId);
      if(ticket!==connection.current)return;
      const bridge=new StudySheetClient(saved.sheetId,token);
      const remote=await bridge.read();
      if(ticket!==connection.current)return;
      const cloudHash=cloudSignature(remote), localHash=localSignature(local.current);
      client.current=bridge;
      lastCloud.current=cloudHash;
      if(cloudHash===localHash){
        markSuccess('Google Sheets와 BKIT가 일치해. 양방향 자동 확인 시작.',cloudHash);
      } else if(remoteIsEmpty(remote) && local.current.tasks.length===0 && local.current.schedules.length===0) {
        // The only local difference may be the stock goal text. Ask before
        // publishing personal study preferences to an external account.
        setStatus('conflict');
        setMessage('새 클라우드는 비어 있어. 기존 학습 목표를 보낼지, 빈 클라우드를 받을지 선택해.');
      } else {
        setStatus('conflict');
        setMessage('처음 연결한 BKIT와 시트 내용이 달라. 어느 쪽을 기준으로 할지 선택해.');
      }
    }catch(e){
      if(ticket!==connection.current)return;
      client.current=null;setStatus('error');
      setMessage(e instanceof Error?e.message:'Google 연결에 실패했어.');
    }finally{if(ticket===connection.current)busy.current=false;}
  }
  async function pull(allowOverwrite=false) {
    if(!client.current||busy.current)return;
    const ticket=connection.current;
    busy.current=true;
    try{
      const remote=await client.current.read();
      if(ticket!==connection.current)return;
      const sig=cloudSignature(remote);
      const localHash=localSignature(local.current);
      if(!allowOverwrite && lastLocal.current && localHash!==lastLocal.current){
        setStatus('conflict');setMessage('이 기기의 미동기화 변경사항이 있어. 클라우드 가져오기로 덮어쓰기 전에 확인해.');
        return;
      }
      // Only the shared plan portion is updated; no focus sessions,
      // passwords, private chat history or other local evidence are read.
      if(!apply.current(remote)) throw new Error('클라우드 계획을 적용할 수 없어. 현재 BKIT 입력을 확인해 줘.');
      // Applying triggers an App state commit; the callback writes to
      // localStorage synchronously but React may render on the next tick.
      lastCloud.current=sig;
      lastLocal.current=sig;
      setSyncedAt(new Date().toLocaleTimeString('ko-KR'));
      setStatus('connected');setMessage('클라우드 과제·시간표·목표를 불러왔어.');
    }catch(e){if(ticket===connection.current){setStatus('error');setMessage(e instanceof Error?e.message:'가져오기 실패');}}
    finally{if(ticket===connection.current)busy.current=false;}
  }
  async function push(force=false) {
    if(!client.current||busy.current)return;
    const ticket=connection.current;
    busy.current=true;
    try{
      const remote=await client.current.read();
      if(ticket!==connection.current)return;
      const remoteHash=cloudSignature(remote);
      const snapshot=local.current;
      const ours=localSignature(snapshot);
      if(!force && lastCloud.current && remoteHash!==lastCloud.current && remoteHash!==ours) {
        setStatus('conflict');
        setMessage('ChatGPT/Sheets에서 계획이 바뀌었어. 덮어쓰기 전에 어느 쪽을 남길지 선택해.');
        return;
      }
      await client.current.write(snapshot);
      if(ticket!==connection.current)return;
      markSuccess('BKIT의 과제·시간표·목표를 Google Sheets에 저장했어.',ours);
    }catch(e){if(ticket===connection.current){setStatus('error');setMessage(e instanceof Error?e.message:'업로드 실패');}}
    finally{if(ticket===connection.current)busy.current=false;}
  }
  async function refresh() {
    if(!client.current||busy.current||statusRef.current!=='connected')return;
    const ticket=connection.current;
    busy.current=true;
    try{
      const remote=await client.current.read();
      if(ticket!==connection.current)return;
      const remoteSig=cloudSignature(remote),localSig=localSignature(local.current);
      if(remoteSig===lastCloud.current){
        if(localSig!==lastLocal.current){
          busy.current=false;
          await push(false);
        }
      }else if(localSig===lastLocal.current || remoteSig===localSig){
        if(remoteSig!==localSig){
          if(!apply.current(remote))throw new Error('클라우드 데이터가 유효하지 않아.');
        }
        lastCloud.current=remoteSig;
        lastLocal.current=remoteSig;
        setSyncedAt(new Date().toLocaleTimeString('ko-KR'));
        setMessage('클라우드 변경사항을 반영했어.');
      }else{
        setStatus('conflict');
        setMessage('이 기기와 Google Sheet가 동시에 변경됐어. 데이터를 확인한 뒤 선택해.');
      }
    }catch(e){if(ticket===connection.current){setStatus('error');setMessage(e instanceof Error?e.message:'동기화 실패');}}
    finally{if(ticket===connection.current)busy.current=false;}
  }
  const sig=useMemo(()=>localSignature(state),[state.tasks,state.schedules,state.settings.goal]);
  useEffect(()=>{
    if(status!=='connected'||sig===lastLocal.current)return;
    const handle=setTimeout(()=>{void refresh();},1400);
    return ()=>clearTimeout(handle);
  },[sig,status]);
  useEffect(()=>{
    if(status!=='connected')return;
    const timer=setInterval(()=>{void refresh();},30000);
    const focus=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',focus);
    window.addEventListener('online',focus);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',focus);window.removeEventListener('online',focus);};
  },[status]);
  function getAccessToken(){return client.current?.token||'';}
  function disconnect(){
    connection.current++;busy.current=false;
    client.current=null;lastCloud.current='';lastLocal.current='';
    setStatus('disconnected');setMessage('동기화를 중지했어. 오프라인 로컬 기록은 유지돼.');
  }
  return {status,message,configuration,setConfig,syncedAt,connect,pull,push,refresh,disconnect,getAccessToken};
}
export type StudyCloudBridge=ReturnType<typeof useStudyCloud>;
