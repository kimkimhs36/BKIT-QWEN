import type { State } from './model';
import {
  exportStudySheets, readStudySheets, TASK_COLUMNS, SCHEDULE_COLUMNS,
  type SheetBundle, type StudyCloudData,
} from './cloudSheet';

const SHEETS_SCOPE='https://www.googleapis.com/auth/spreadsheets';
const EMAIL_SCOPE='https://www.googleapis.com/auth/userinfo.email';
const SCOPES=SHEETS_SCOPE+' '+EMAIL_SCOPE;
export const CONFIG_KEY='bkit.cloud-settings.v1';
export type CloudConfig={sheetId:string;oauthClientId:string};
type TokenResponse={access_token?:string;scope?:string;error?:string;error_description?:string};
type TokenClient={requestAccessToken:(options?:{prompt?:string})=>void};
type GoogleOAuth={
  accounts:{oauth2:{initTokenClient:(args:{
    client_id:string;scope:string;callback:(result:TokenResponse)=>void;
    error_callback?:(result:{type?:string;message?:string})=>void;
  })=>TokenClient}}
};
declare global { interface Window { google?:GoogleOAuth } }

export function parseSheetId(input:string):string{
  const match=input.match(/\/spreadsheets\/d\/([\w-]+)/);
  const id=match?.[1]||input.trim();
  if(!/^[\w-]{20,}$/.test(id)) throw new Error('유효한 Google Sheets 주소 또는 ID를 넣어줘.');
  return id;
}
export function loadCloudConfig():CloudConfig{
  try{
    const raw=localStorage.getItem(CONFIG_KEY);
    const config=raw?JSON.parse(raw):{};
    return {sheetId:typeof config.sheetId==='string'?config.sheetId:'',
      oauthClientId:typeof config.oauthClientId==='string'?config.oauthClientId:''};
  }catch{return {sheetId:'',oauthClientId:''};}
}
export function storeCloudConfig(config:CloudConfig){
  const sheetId=parseSheetId(config.sheetId);
  if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(config.oauthClientId.trim()))
    throw new Error('Google Cloud 웹 OAuth 클라이언트 ID가 올바른지 확인해 줘.');
  const saved={sheetId,oauthClientId:config.oauthClientId.trim()};
  localStorage.setItem(CONFIG_KEY,JSON.stringify(saved));
  return saved;
}
let scriptPromise:Promise<void>|null=null;
export function prepareGoogleIdentity():Promise<void>{
  if(window.google?.accounts?.oauth2)return Promise.resolve();
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';
    script.async=true;
    script.onload=()=>window.google?.accounts?.oauth2?resolve():reject(new Error('Google 로그인 도구를 열 수 없어.'));
    script.onerror=()=>reject(new Error('Google 로그인 스크립트가 차단됐어.'));
    document.head.appendChild(script);
  }).catch(e=>{scriptPromise=null;throw e;});
  return scriptPromise;
}
/** Browser OAuth consent. Access token stays in memory, never in a URL, sheet or localStorage. */
export function authorizeGoogle(clientId:string):Promise<string>{
  // Do not await script loading here: on iOS Safari the OAuth popup must
  // open synchronously from the user's Connect tap.
  if(!window.google?.accounts?.oauth2)
    return Promise.reject(new Error('Google 로그인 준비가 끝나지 않았어. 설정 화면을 다시 열어줘.'));
  return new Promise((resolve,reject)=>{
    let done=false;
    const fail=(message:string)=>{if(!done){done=true;reject(new Error(message));}};
    try{
      const client=window.google!.accounts.oauth2.initTokenClient({
        client_id:clientId,scope:SCOPES,
        callback:(result)=>{
          if(done)return;
          if(result.error||!result.access_token)fail(result.error_description||result.error||'Google 로그인이 취소됐어.');
          else if(result.scope && !SCOPES.split(' ').every(scope=>result.scope!.split(/\s+/).includes(scope)))
            fail('Google Sheets와 이메일 확인 권한을 승인해야 BKIT 비서를 연결할 수 있어.');
          else {done=true;resolve(result.access_token);}
        },
        error_callback:(result)=>{
          fail(result.type==='popup_closed'?'Google 로그인 창을 닫았어. 다시 연결을 눌러줘.':
            result.type==='popup_failed_to_open'?'Google 로그인 팝업이 차단됐어. Safari의 팝업 차단 설정을 확인해 줘.':
            result.message||'Google 로그인 창을 열 수 없어.');
        },
      });
      // Called after a real Connect button interaction. Never automatically
      // display an OAuth consent popup on page load.
      // A returning user should not be forced through consent on every visit.
      client.requestAccessToken({prompt:'consent'});
    }catch(e){fail(e instanceof Error?e.message:'Google 로그인을 시작할 수 없어.');}
  });
}
const base='https://sheets.googleapis.com/v4/spreadsheets/';
type Headers={headers:Record<string,string>};
export class StudySheetClient{
  private ids:Record<string,number>|null=null;
  constructor(readonly sheetId:string,readonly token:string){}
  private async request<T>(path:string,options:RequestInit={}):Promise<T>{
    const res=await fetch(base+encodeURIComponent(this.sheetId)+path,{
      ...options,headers:{Authorization:'Bearer '+this.token,
        ...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})},
    });
    if(!res.ok){
      if(res.status===401)throw new Error('Google 로그인 세션이 만료됐어. 다시 연결해 줘.');
      if(res.status===403)throw new Error('Google Sheets 접근이 거부됐어. 시트 편집 권한과 Google Cloud의 Sheets API 활성화 여부를 확인해 줘.');
      if(res.status===404)throw new Error('공유 Google Sheet를 찾을 수 없어. 주소를 확인해 줘.');
      throw new Error('Google Sheets 연결 오류 ('+res.status+').');
    }
    return res.json() as Promise<T>;
  }
  private async sheetIds():Promise<Record<string,number>>{
    if(this.ids)return this.ids;
    const r=await this.request<{sheets?:{properties?:{title:string;sheetId:number}}[]}>('?fields=sheets(properties(sheetId,title))');
    const ids=Object.fromEntries((r.sheets||[]).filter(s=>s.properties).map(s=>[s.properties!.title,s.properties!.sheetId]));
    for(const name of ['Meta','Tasks','Schedules','LearningContext']){
      if(!(name in ids))throw new Error('BKIT Cloud 시트 구조가 달라. '+name+' 탭을 확인해 줘.');
    }
    this.ids=ids;
    return ids;
  }
  async read():Promise<StudyCloudData>{
    await this.sheetIds();
    const p=new URLSearchParams();
    for(const range of ['Tasks!A1:S501','Schedules!A1:M301','LearningContext!A1:C100'])
      p.append('ranges',range);
    const r=await this.request<{valueRanges?:{values?:unknown[][]}[]}>('/values:batchGet?'+p.toString());
    const ranges=r.valueRanges||[];
    const clean=(i:number):string[][]=>(ranges[i]?.values||[]).map(row=>row.map(v=>String(v??'')));
    return readStudySheets({tasks:clean(0),schedules:clean(1),context:clean(2)});
  }
  async write(s:State):Promise<void>{
    const ids=await this.sheetIds();
    const sheets=exportStudySheets(s);
    const cells=(values:string[])=>({values:values.map(v=>({userEnteredValue:{stringValue:v}}))});
    const rows=(r:string[][])=>r.slice(1).map(cells);
    if(s.tasks.length>500||s.schedules.length>300)throw new Error('클라우드 저장 허용 행 수를 초과했어.');
    const requests=[
      {updateCells:{range:{sheetId:ids.Tasks,startRowIndex:1,endRowIndex:501,startColumnIndex:0,endColumnIndex:TASK_COLUMNS.length},
        rows:rows(sheets.tasks),fields:'userEnteredValue'}},
      {updateCells:{range:{sheetId:ids.Schedules,startRowIndex:1,endRowIndex:301,startColumnIndex:0,endColumnIndex:SCHEDULE_COLUMNS.length},
        rows:rows(sheets.schedules),fields:'userEnteredValue'}},
      {updateCells:{start:{sheetId:ids.LearningContext,rowIndex:2,columnIndex:0},
        rows:[cells(['GOAL',s.settings.goal,new Date().toISOString()])],fields:'userEnteredValue'}},
      {updateCells:{start:{sheetId:ids.Meta,rowIndex:2,columnIndex:0},
        rows:[cells(['revision',String(Date.now()),'Last BKIT write'])],fields:'userEnteredValue'}},
      {updateCells:{start:{sheetId:ids.Meta,rowIndex:3,columnIndex:0},
        rows:[cells(['updated_at',new Date().toISOString(),'UTC ISO 8601'])],fields:'userEnteredValue'}},
      {updateCells:{start:{sheetId:ids.Meta,rowIndex:4,columnIndex:0},
        rows:[cells(['updated_by','BKIT WEB','ChatGPT can edit sheet rows'])],fields:'userEnteredValue'}},
    ];
    await this.request(':batchUpdate',{method:'POST',body:JSON.stringify({requests})});
  }
}
