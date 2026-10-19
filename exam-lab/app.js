'use strict';
(() => {
const KEY='bkit.exam-lab.20261019.v1';
const QUESTIONS=Object.freeze(window.BKIT_EXAM_QUESTIONS || []);
const SUBJECTS=['영어','수학','통합과학','국어','통합사회','한국사'];
const PAPER_LENGTH={국어:45,수학:30,영어:45,한국사:20,통합사회:25,통합과학:25};
const PLANS={
  120:[['영어',35],['수학',35],['통합과학',25],['국어',15],['통합사회',5],['한국사',5]],
  180:[['영어',45],['수학',50],['통합과학',40],['국어',25],['통합사회',10],['한국사',10]]
};
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
const $=id=>document.getElementById(id);
const now=()=>Date.now();
const initial=()=>({v:1,view:'drills',subject:'영어',mode:'new',current:null,attempts:{},past:{},pastSubject:'영어',pastNumber:1,mission:null});
const toast=(s)=>{const el=$('backup-status');if(el){el.textContent=s;}};
function load(){
 try{
   const d=JSON.parse(localStorage.getItem(KEY));
   if(d&&d.v===1&&typeof d==='object'){
     return {...initial(),...d,
       attempts:d.attempts&&typeof d.attempts==='object'&&!Array.isArray(d.attempts)?d.attempts:{},
       past:d.past&&typeof d.past==='object'&&!Array.isArray(d.past)?d.past:{},
       mission:d.mission&&PLANS[d.mission.minutes]?d.mission:null};
   }
 }catch(e){}
 return initial();
}
let state=load(),response=null,hintOpen=false,fileUrl=null;
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));return true}
 catch(e){toast('브라우저 저장에 실패했어. 저장 공간 확인 후 진도 백업을 만들어 줘.');return false}
}
function clock(sec){const n=Math.max(0,Math.floor(sec));return String(Math.floor(n/3600)).padStart(2,'0')+':'+String(Math.floor(n%3600/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function stats(){
 const attempt=Object.values(state.attempts),done=attempt.length,correct=attempt.filter(v=>v.firstCorrect===true).length;
 $('stat-done').textContent=String(done);
 $('stat-rate').textContent=done?Math.round(100*correct/done)+'%':'—';
 $('stat-pending').textContent=String(attempt.filter(v=>v.firstCorrect===false&&!v.mastered).length);
 $('stat-past').textContent=String(Object.values(state.past).filter(v=>v&&v.pick!==null&&v.pick!==undefined).length);
 $('hero-count').innerHTML=QUESTIONS.length+'<span>문항</span>';
}
function go(view){
 if(!['drills','past','report'].includes(view))return;
 state.view=view;save();
 for(const v of ['drills','past','report']){
  const selected=v===view;
  $('tab-'+v).setAttribute('aria-selected',String(selected));
  $('view-'+v).hidden=!selected;
 }
 if(view==='drills')drawQuestion();
 if(view==='past')drawPast();
 if(view==='report')drawReport();
 stats();
}
function activePool(){
 let qs=state.subject==='추천'?QUESTIONS.slice():QUESTIONS.filter(q=>q.subject===state.subject);
 if(state.mode==='new')qs=qs.filter(q=>!state.attempts[q.id]);
 if(state.mode==='review')qs=qs.filter(q=>state.attempts[q.id]&&state.attempts[q.id].firstCorrect===false&&!state.attempts[q.id].mastered);
 if(state.subject==='추천')qs.sort((a,b)=>SUBJECTS.indexOf(a.subject)-SUBJECTS.indexOf(b.subject));
 return qs;
}
function chooseQuestion(){
 const pool=activePool();
 const match=pool.find(q=>q.id===state.current);
 if(match)return match;
 state.current=pool[0]?.id ?? null;save();
 return pool[0] ?? null;
}
function setSubject(subject){
 state.subject=subject;state.current=null;response=null;hintOpen=false;save();drawQuestion();
}
function setMode(mode){
 state.mode=mode;state.current=null;response=null;hintOpen=false;save();drawQuestion();
}
function drawSubjectButtons(){
 const items=['추천',...SUBJECTS];
 $('drill-subjects').innerHTML=items.map(s=>'<button type="button" data-subject="'+esc(s)+'" aria-pressed="'+(s===state.subject)+'">'+esc(s)+'</button>').join('');
 for(const mode of ['new','review','all'])$('mode-'+mode).setAttribute('aria-pressed',String(state.mode===mode));
}
function drawQuestion(){
 drawSubjectButtons();
 const q=chooseQuestion(),box=$('question-shell');
 if(!q){
  let label=state.mode==='review'?'현재 재시험할 오답이 없어.':'이 범위는 전부 확인했어.';
  box.innerHTML='<div class="empty"><strong>'+label+'</strong><p>다른 과목을 골라 계속하거나, 전체 보기에서 다시 풀 수 있어.</p><button class="solid" id="empty-action">전체 문제 보기</button></div>';
  $('empty-action').onclick=()=>setMode('all');return;
 }
 const old=state.attempts[q.id];
 const answered=response&&response.id===q.id;
 const reading=q.passage?'<div class="question-reading" aria-label="문제의 공통 지문">'+esc(q.passage)+'</div>':'';
 const choices=q.options.map((txt,i)=>{
  let cls='';if(answered){if(i===q.answer)cls='correct';else if(i===response.choice)cls='wrong'}
  return '<button type="button" class="'+cls+'" data-choice="'+i+'" '+(answered?'disabled':'')+'><span class="num">'+(i+1)+'</span><span>'+esc(txt)+'</span></button>'
 }).join('');
 box.innerHTML='<div class="question-meta"><span>'+esc(q.subject)+' / '+esc(q.topic)+'</span><span>문항 '+esc(q.id.slice(3))+' · '+(q.tier===3?'도전':'핵심')+'</span></div>'+
 reading+'<h3 class="question-stem">'+esc(q.stem)+'</h3><div class="choices" role="group" aria-label="정답 선택">'+choices+'</div>'+
 (!answered?'<div class="question-foot"><button type="button" id="hint-toggle" class="text-btn">'+(hintOpen?'힌트 감추기':'막히면 힌트 보기')+' ↗</button><span class="hint">생각 → 답 선택 → 해설 확인</span></div>'+(hintOpen?'<div class="hint-box">'+esc(q.hint)+'</div>':''):'')+
 (answered?makeFeedback(q,old):'');
 if(!answered){
  box.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>submitAnswer(q,Number(b.dataset.choice))));
  $('hint-toggle').onclick=()=>{hintOpen=!hintOpen;drawQuestion()};
 }else{
  box.querySelectorAll('[data-cause]').forEach(b=>b.addEventListener('click',()=>markCause(q.id,b.dataset.cause)));
  $('next-drill').onclick=nextDrill;
  $('ai-prompt').onclick=()=>copyTutorPrompt(q,response.choice);
 }
}
function makeFeedback(q,at){
 const correct=response.choice===q.answer;
 const causes=correct?'':'<p class="explain-label">이유를 한 번만 표시해 두면 재시험할 때 도움이 돼.</p><div class="cause-grid">'+
 ['개념','풀이방법','계산·실수','독해·해석','시간 부족','추측'].map(x=>'<button type="button" data-cause="'+esc(x)+'" class="'+(at?.cause===x?'active':'')+'">'+esc(x)+'</button>').join('')+'</div>';
 return '<div class="feedback '+(correct?'':'is-wrong')+'" role="status"><strong>'+(correct?'정답이야. 왜 맞는지도 확인하자.':'이번엔 틀렸어. 어디서 판단이 달라졌는지 보자.')+'</strong>'+
 '<p>정답 '+(q.answer+1)+'번 · '+esc(q.why)+'</p>'+causes+
 '<div class="feedback-actions"><button id="next-drill" type="button">다음 문제 풀기 →</button><button type="button" id="ai-prompt" class="ghost">AI 개인 과외 질문 복사 ↗</button></div><p class="accuracy-note">AI 버튼은 질문을 복사하는 기능이야. 별도 AI API를 호출하지 않아.</p></div>';
}
function submitAnswer(q,pick){
 if(response||!q||!Number.isInteger(pick)||pick<0||pick>4)return;
 const correct=pick===q.answer,previous=state.attempts[q.id];
 if(!previous)state.attempts[q.id]={firstCorrect:correct,lastCorrect:correct,tries:1,mastered:correct,when:new Date().toISOString(),cause:''};
 else state.attempts[q.id]={...previous,lastCorrect:correct,tries:(previous.tries||1)+1,mastered:correct||!!previous.mastered};
 save();response={id:q.id,choice:pick};hintOpen=false;drawQuestion();stats();
}
function markCause(id,cause){
 const at=state.attempts[id];if(!at)return;
 at.cause=String(cause).slice(0,40);save();drawQuestion();
}
function nextDrill(){
 const q=QUESTIONS.find(x=>x.id===state.current),pool=activePool();
 let next=pool.find(x=>x.id!==q?.id);
 if(state.mode==='all'&&q){const same=pool.findIndex(x=>x.id===q.id);next=pool[(same+1)%pool.length]}
 state.current=next?.id??null;response=null;hintOpen=false;save();drawQuestion();
}
async function copyTutorPrompt(q,pick){
 const msg='나는 내일 고2 10월 모의고사를 보는 학생이야. 문제의 정답만 말하지 말고, 아래 연습문제의 문장/조건부터 설명하고 비슷한 문제를 1개 내서 직접 풀게 해 줘.\n과목: '+q.subject+' / 개념: '+q.topic+'\n문제: '+q.stem+(q.passage?'\n지문: '+q.passage:'')+'\n선택지: '+q.options.map((x,i)=>(i+1)+'. '+x).join(' / ')+'\n내 선택: '+(pick+1)+'번\n정답: '+(q.answer+1)+'번\n기본 해설: '+q.why+'\n내 수준을 먼저 확인할 수 있는 짧은 질문부터 해 줘.';
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(msg);
  else{const t=document.createElement('textarea');t.value=msg;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();if(!document.execCommand('copy'))throw Error('copy failed');t.remove()}
  $('ai-prompt').textContent='질문 복사 완료 ✓'; 
 }catch{
  $('ai-prompt').textContent='복사 실패 · 질문 다시 누르기';
 }
}
function examKey(){return state.pastSubject+'#'+state.pastNumber}
function currentPast(){return state.past[examKey()]||{pick:null,mark:'unsure',note:''}}
function pastSave(next){
 state.past[examKey()]={...currentPast(),...next,updatedAt:new Date().toISOString()};
 save();renderPastGrid();stats();
}
function drawPast(){
 $('past-subject').innerHTML=SUBJECTS.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
 $('past-subject').value=state.pastSubject;
 renderPastGrid();renderPastEditor();
}
function renderPastGrid(){
 const count=PAPER_LENGTH[state.pastSubject]||20;
 $('past-grid').innerHTML=Array.from({length:count},(_,i)=>{
  const n=i+1,r=state.past[state.pastSubject+'#'+n];
  return '<button type="button" data-past-number="'+n+'" class="'+(n===state.pastNumber?'selected ':'')+(r?.mark==='correct'?'correct':r?.mark==='wrong'?'wrong':'')+'" aria-label="'+n+'번 '+(r?.mark==='correct'?'정답 확인':r?.mark==='wrong'?'오답 확인':'미채점')+'">'+n+'</button>';
 }).join('');
 $('past-grid').querySelectorAll('[data-past-number]').forEach(b=>b.onclick=()=>{state.pastNumber=Number(b.dataset.pastNumber);save();renderPastGrid();renderPastEditor()});
}
function renderPastEditor(){
 const a=currentPast();
 $('answer-heading').textContent=state.pastSubject+' '+state.pastNumber+'번 · 답안 기록';
 $('past-choices').innerHTML=[1,2,3,4,5].map(n=>'<button data-pick="'+n+'" class="'+(a.pick===n?'selected':'')+'" type="button" aria-pressed="'+(a.pick===n)+'">'+n+'</button>').join('');
 $('past-choices').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{pastSave({pick:Number(b.dataset.pick),mark:'unsure'});renderPastEditor()});
 document.querySelectorAll('.mark-options [data-mark]').forEach(b=>{
  b.classList.toggle('selected',b.dataset.mark===a.mark);
  b.disabled=a.pick===null;
 });
 $('past-note').value=a.note||'';
 $('past-status').textContent=a.pick===null?'먼저 내 답을 고르고 공식 정답표와 직접 대조해.':a.mark==='wrong'?'오답으로 기록했어. 막힌 조건을 적어 두고 나중에 다시 풀어.':a.mark==='correct'?'정답표 확인 완료. 이 결과는 네가 직접 채점한 결과야.':'내 답은 '+a.pick+'번. 공식 정답표 확인 후 O/X를 눌러.';
}
function reportData(){
 return SUBJECTS.map(subject=>{
  const qs=QUESTIONS.filter(q=>q.subject===subject);
  const done=qs.filter(q=>state.attempts[q.id]);
  const pass=done.filter(q=>state.attempts[q.id].firstCorrect===true).length;
  const pending=done.filter(q=>state.attempts[q.id].firstCorrect===false&&!state.attempts[q.id].mastered).length;
  return {subject,total:qs.length,done:done.length,correct:pass,pending,rate:done.length?Math.round(pass/done.length*100):null};
 });
}
function drawReport(){
 const data=reportData();
 $('report-subjects').innerHTML=data.map(d=>'<article class="report-subject"><h3>'+esc(d.subject)+'</h3><strong>'+ (d.rate===null?'—':d.rate+'%') +'</strong><p>첫 시도 '+d.correct+'/'+d.done+'문항 · 오답 '+d.pending+'개 · 전체 '+d.total+'개</p><div class="mini-track"><span style="width:'+(d.rate||0)+'%"></span></div></article>').join('');
 const used=data.filter(x=>x.done>0).sort((a,b)=>a.rate-b.rate);
 const worst=used[0]||null;
 const causeCounts={};
 for(const a of Object.values(state.attempts)){if(a.cause)causeCounts[a.cause]=(causeCounts[a.cause]||0)+1}
 const common=Object.entries(causeCounts).sort((a,b)=>b[1]-a[1])[0];
 $('report-next').innerHTML='<h3>다음 15분은 이렇게.</h3>'+
 (worst?'<p>현재 기록에서 정답률이 가장 낮은 과목은 <strong>'+esc(worst.subject)+'</strong> ('+worst.rate+'%)이야. 틀렸던 문항을 다시 풀고, 정답을 설명할 수 있는지 확인해.</p>':'<p>아직 진단한 문항이 없어. 영어 또는 수학 5문제부터 풀어야 개인 약점을 볼 수 있어.</p>')+
 (common?'<p>자주 기록한 오답 이유: <strong>'+esc(common[0])+'</strong> · '+common[1]+'회. 이 부분을 의식적으로 다시 확인해.</p>':'')+
 '<button type="button" id="review-recommend" class="solid">오답 재시험 바로 가기 →</button>';
 $('review-recommend').onclick=()=>{state.subject=worst?.subject||'영어';state.mode='review';state.current=null;response=null;save();go('drills')};
}
function missionSeconds(){
 const m=state.mission;
 if(!m||!PLANS[m.minutes])return 0;
 const old=Math.max(0,Number(m.elapsed)||0);
 return old+(m.running?Math.max(0,(now()-Number(m.startedAt||now()))/1000):0);
}
function pauseMission(){
 const m=state.mission;if(!m?.running)return;
 m.elapsed=missionSeconds();m.running=false;m.startedAt=0;save();renderMission();
}
function startMission(minutes){
 if(state.mission&&missionSeconds()<state.mission.minutes*60&&!confirm('진행 중인 기존 미션 시간을 초기화할까? 문제 풀이 기록은 유지돼.'))return;
 state.mission={minutes,elapsed:0,startedAt:now(),running:true};save();renderMission();
}
function missionStage(){
 const m=state.mission;if(!m||!PLANS[m.minutes])return null;
 let t=missionSeconds();
 for(let i=0;i<PLANS[m.minutes].length;i++){
  const [subject,minutes]=PLANS[m.minutes][i];
  if(t<minutes*60)return {subject,i,remaining:minutes*60-t};
  t-=minutes*60;
 }
 return {subject:'오답 재시험',i:PLANS[m.minutes].length,remaining:0};
}
function renderMission(){
 const m=state.mission;
 $('mission-120').hidden=!!m;$('mission-180').hidden=!!m;
 $('mission-toggle').hidden=!m;$('mission-focus').hidden=!m;
 $('mission-track').hidden=!m;$('mission-stages').hidden=!m;
 if(!m){$('mission-clock').textContent='READY';return}
 const elapsed=Math.min(m.minutes*60,missionSeconds());
 const stage=missionStage();
 if(elapsed>=m.minutes*60&&m.running){m.elapsed=m.minutes*60;m.running=false;m.startedAt=0;save()}
 $('mission-clock').textContent=clock(m.minutes*60-elapsed);
 $('mission-note').textContent=elapsed>=m.minutes*60?'미션을 완료했어. 오늘 틀린 것을 재시험하고 마무리해.':stage.subject+' 구간 · 약 '+Math.ceil(stage.remaining/60)+'분 남음 · 쉬는 시간에는 일시정지.';
 $('mission-fill').style.width=Math.min(100,100*elapsed/(m.minutes*60))+'%';
 $('mission-toggle').textContent=m.running?'일시정지':'이어하기';
 $('mission-focus').textContent=elapsed>=m.minutes*60?'오답 재시험 열기 →':stage.subject+' 문제 열기 →';
 $('mission-stages').innerHTML=PLANS[m.minutes].map(([subject,minutes],i)=>'<button type="button" data-stage="'+i+'" class="'+(i===stage.i?'active':'')+'">'+esc(subject)+' '+minutes+'분</button>').join('');
 $('mission-stages').querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>missionSubject(PLANS[m.minutes][Number(b.dataset.stage)][0]));
}
function missionSubject(subject){
 if(subject==='오답 재시험'){state.mode='review';state.subject='추천'}
 else{state.mode='new';state.subject=subject}
 state.current=null;response=null;save();go('drills');$('view-drills').scrollIntoView({behavior:'smooth',block:'start'});
}
function validImported(obj){
 if(!obj||typeof obj!=='object'||obj.app!=='BKIT_EXAM_LAB'||!obj.data||obj.data.v!==1)return false;
 const data=obj.data;
 if(!data.attempts||!data.past||typeof data.attempts!=='object'||typeof data.past!=='object')return false;
 if(Object.keys(data.attempts).length>500||Object.keys(data.past).length>500)return false;
 return true;
}
function exportData(){
 const content=JSON.stringify({app:'BKIT_EXAM_LAB',savedAt:new Date().toISOString(),data:state},null,2);
 const blob=new Blob([content],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='BKIT-EXAM-LAB-20261019.json';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
 toast('JSON 다운로드를 요청했어. 실제 파일 앱에 저장됐는지 직접 확인해.');
}
async function importData(file){
 if(!file)return;
 try{
  if(file.size>2_000_000)throw Error('파일이 너무 커.');
  const obj=JSON.parse(await file.text());
  if(!validImported(obj))throw Error('BKIT EXAM LAB 백업 형식이 아니야.');
  if(!confirm('현재 이 기기의 학습 진도를 백업 파일 내용으로 교체할까? 먼저 지금 진도를 내보내는 게 안전해.'))return;
  const next={...initial(),...obj.data,mission:null,view:'report'};
  const previous=state;state=next;
  if(!save()){state=previous;throw Error('브라우저가 저장을 거부했어.')}
  response=null;go('report');toast('검사한 학습 기록을 복원했어. 과목별 진도를 확인해.');
 }catch(e){toast('가져오기 실패: '+String(e.message||e))}
}
let timerHandle=null;
function init(){
 if(!QUESTIONS.length){$('question-shell').textContent='문항 파일이 로드되지 않았어. 인터넷 연결을 확인해.';return}
 for(const v of ['drills','past','report'])$('tab-'+v).onclick=()=>go(v);
 $('hero-start').onclick=()=>{state.mode='new';state.current=null;response=null;state.subject='영어';go('drills');$('view-drills').scrollIntoView({behavior:'smooth',block:'start'})};
 $('drill-subjects').onclick=e=>{const b=e.target.closest('[data-subject]');if(b)setSubject(b.dataset.subject)};
 for(const mode of ['new','review','all'])$('mode-'+mode).onclick=()=>setMode(mode);
 $('past-subject').onchange=e=>{state.pastSubject=e.target.value;state.pastNumber=1;save();drawPast()};
 document.querySelectorAll('.mark-options [data-mark]').forEach(b=>b.onclick=()=>{if(currentPast().pick!==null){pastSave({mark:b.dataset.mark});renderPastEditor()}});
 $('past-note').onchange=e=>pastSave({note:e.target.value.slice(0,180)});
 $('past-file').onchange=e=>{
  if(fileUrl){URL.revokeObjectURL(fileUrl);fileUrl=null}
  const file=e.target.files?.[0];
  if(!file){$('file-preview').hidden=true;return}
  if(file.size>40_000_000){$('file-name').textContent='파일이 너무 커. 40MB 이하 자료를 선택해.';return}
  const mime=file.type,ext=file.name.toLowerCase();
  if(!(mime==='application/pdf'||ext.endsWith('.pdf')||mime.startsWith('image/'))){$('file-name').textContent='PDF 또는 이미지 파일만 지원해.';return}
  fileUrl=URL.createObjectURL(file);
  const container=$('file-preview');container.textContent='';
  if(mime.startsWith('image/')){const img=document.createElement('img');img.src=fileUrl;img.alt='이 기기에서 선택한 시험지 이미지';container.appendChild(img)}
  else{const frame=document.createElement('iframe');frame.src=fileUrl;frame.title='선택한 기출문제 PDF';container.appendChild(frame)}
  container.hidden=false;$('file-name').textContent='열린 파일: '+file.name+' · 브라우저 안에서만 열람 중. 다시 접속하면 재선택이 필요해.';
 };
 $('export').onclick=exportData;
 $('import').onchange=e=>{importData(e.target.files?.[0]);e.target.value=''};
 $('reset').onclick=()=>{
  if(!confirm('학습문제 진도와 기출 기록을 모두 초기화할까? 취소하면 아무것도 지워지지 않아.'))return;
  if(!confirm('정말로 지울까? 복구하려면 미리 저장한 JSON 파일이 필요해.'))return;
  state=initial();response=null;save();go('report');toast('이 브라우저의 진도를 초기화했어.');
 };
 $('mission-120').onclick=()=>startMission(120);
 $('mission-180').onclick=()=>startMission(180);
 $('mission-toggle').onclick=()=>{if(state.mission?.running)pauseMission();else if(state.mission){state.mission.running=true;state.mission.startedAt=now();save();renderMission()}};
 $('mission-focus').onclick=()=>{const stage=missionStage();if(stage)missionSubject(stage.subject)};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMission()});
 window.addEventListener('pagehide',pauseMission);
 timerHandle=setInterval(()=>{if(state.mission){renderMission();if(state.mission.running&&Math.floor(now()/15000)!==Math.floor((now()-1000)/15000))save()}},1000);
 if(state.mission?.running){
  // A discarded Safari tab cannot count as continuous active study. Keep the
  // elapsed snapshot from the last successful periodic save; reopen paused.
  state.mission.running=false;state.mission.startedAt=0;save();
 }
 go(['drills','past','report'].includes(state.view)?state.view:'drills');
 renderMission();stats();
}
window.addEventListener('beforeunload',()=>{if(fileUrl)URL.revokeObjectURL(fileUrl)});
init();
})();