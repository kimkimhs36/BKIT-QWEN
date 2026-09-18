(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const D=['MON','TUE','WED','THU','FRI','SAT','SUN'],K=['월','화','수','목','금','토','일'],KEY='crashweek.v3';
let S={tasks:[],testCount:0,snapshots:[],constraints:{weekdayCap:120,weekendCap:180,sleep:7}},last=null,editId=null;
try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
  S=Object.assign(S,saved);
  S.constraints=Object.assign({weekdayCap:120,weekendCap:180,sleep:7},S.constraints||{});
  S.snapshots=Array.isArray(S.snapshots)?S.snapshots:[];
  S.tasks=Array.isArray(S.tasks)?S.tasks:[];
}catch(e){}
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function save(){
  S.constraints={weekdayCap:+$('#weekdayCap').value||120,weekendCap:+$('#weekendCap').value||180,sleep:+$('#sleep').value||7};
  localStorage.setItem(KEY,JSON.stringify(S));
}
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1900)}
function caps(){return D.map((_,i)=>i<5?(+$('#weekdayCap').value||120):(+$('#weekendCap').value||180))}
function mondayOfNow(){const d=new Date(),day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function analyze(){
  const c=caps(),daily=D.map((d,i)=>({load:0,cap:c[i],tasks:[]}));
  S.tasks.filter(t=>!t.done).forEach(t=>{daily[t.day].load+=t.minutes;daily[t.day].tasks.push(t)});
  const impacts=daily.map((x,i)=>({day:i,deficit:Math.max(0,x.load-x.cap),tasks:x.tasks})).filter(x=>x.deficit>0);
  const col=impacts.length,total=daily.reduce((a,x)=>a+x.load,0),cap=c.reduce((a,x)=>a+x,0),reserve=Math.max(0,cap-total);
  const peak=Math.max(...daily.map(x=>x.load/Math.max(1,x.cap)),0),loss=impacts.reduce((a,x)=>a+x.deficit,0)/60;
  const deadline=Math.max(0,100-col*24-Math.round(loss*10)),sleep=Math.max(0,100-Math.round(loss*18));
  const avg=daily.reduce((a,x)=>a+x.load/x.cap,0)/7,v=daily.reduce((a,x)=>a+Math.pow(x.load/x.cap-avg,2),0)/7;
  const balance=Math.max(0,Math.round(100-Math.sqrt(v)*70)),resScore=Math.max(0,Math.min(100,Math.round(reserve/Math.max(1,cap)*250)));
  const stability=Math.max(0,Math.min(100,Math.round(deadline*.35+sleep*.25+balance*.2+resScore*.2)));
  const worst=impacts.length?impacts.slice().sort((a,b)=>b.deficit-a.deficit)[0].day:-1;
  return{daily,impacts,collisions:col,reserve,peak,sleepLoss:loss,deadline,sleepScore:sleep,balance,reserveScore:resScore,stability,worst,total,cap};
}
function dots(a=-1,f=-1){$('#dayDots').innerHTML=D.map((_,i)=>'<i class="'+(i===a?'active ':'')+(i===f?'fail':'')+'"></i>').join('')}
function cancelEdit(){
  editId=null;$('#addBtn').textContent='+ ADD EVENT';$('#cancelEditBtn').hidden=true;$('#name').value='';
}
function beginEdit(id){
  const t=S.tasks.find(x=>String(x.id)===String(id));if(!t)return;
  editId=String(t.id);$('#name').value=t.name;$('#type').value=t.type;$('#day').value=t.day;$('#minutes').value=t.minutes;$('#priority').value=t.priority;$('#flexible').checked=!!t.flexible;
  $('#addBtn').textContent='SAVE EVENT';$('#cancelEditBtn').hidden=false;$('#name').focus();toast('수정 모드');
}
function render(){
  $('#taskCount').textContent=S.tasks.filter(t=>!t.done).length+' ACTIVE / '+S.tasks.length+' TOTAL';
  $('#taskList').innerHTML=S.tasks.length?S.tasks.map((t,i)=>'<div class="task '+(t.done?'done':'')+'"><i class="swatch" style="background:'+['#ffb08c','#cec1ff','#ace6c4','#ffd59b','#ff847b','#9bc9ff','#f0b7dc'][i%7]+'"></i><div><h4>'+esc(t.name)+'</h4><p>'+D[t.day]+' · '+esc(t.type)+' · '+t.minutes+'m · P'+t.priority+(t.flexible?' <span class="movable">MOVABLE</span>':'')+'</p></div><div class="task-actions"><button class="icon-btn done-btn '+(t.done?'active':'')+'" data-done="'+t.id+'" title="완료">'+(t.done?'✓':'○')+'</button><button class="icon-btn edit-btn" data-edit="'+t.id+'" title="수정">EDIT</button><button class="icon-btn" data-del="'+t.id+'" title="삭제">×</button></div></div>').join(''):'<div class="empty">일정을 추가하거나 <b>LOAD DEMO</b>를 눌러<br>충돌시험을 시작하세요.</div>';
  $$('[data-del]').forEach(b=>b.onclick=()=>{S.tasks=S.tasks.filter(t=>String(t.id)!==b.dataset.del);if(editId===b.dataset.del)cancelEdit();save();render();week();reset()});
  $$('[data-edit]').forEach(b=>b.onclick=()=>beginEdit(b.dataset.edit));
  $$('[data-done]').forEach(b=>b.onclick=()=>{const t=S.tasks.find(x=>String(x.id)===b.dataset.done);if(t)t.done=!t.done;save();render();week();reset();toast(t?.done?'완료 처리했습니다.':'다시 활성화했습니다.')});
}
function week(a=analyze()){
  const mon=mondayOfNow(),today=new Date();
  $('#weekBoard').innerHTML=a.daily.map((x,i)=>{
    const p=Math.round(x.load/Math.max(1,x.cap)*100),dt=new Date(mon);dt.setDate(mon.getDate()+i);
    const date=(dt.getMonth()+1)+'.'+String(dt.getDate()).padStart(2,'0');
    return '<div class="day-card '+(p>100?'over ':'')+(sameDay(dt,today)?'today':'')+'"><div class="dn">'+D[i]+'</div><span class="date">'+date+'</span><strong>'+x.load+'<small> / '+x.cap+'m</small></strong><small>'+p+'% LOAD</small><div class="fill"><i style="width:'+Math.min(100,p)+'%"></i></div></div>'
  }).join('');
}
function graph(a){
  const pts=a.daily.map((x,i)=>{const ratio=Math.min(1.5,x.load/Math.max(1,x.cap)),xv=20+i*110,y=110-ratio*62;return[xv,Math.max(12,y)]});
  const path='M'+pts.map(p=>p[0]+' '+p[1]).join('L');
  $('#graphPath').setAttribute('d',path);
  $('#graphFill').setAttribute('d',path+'L'+pts[pts.length-1][0]+' 130L'+pts[0][0]+' 130Z');
}
function reset(){
  last=null;$('#result').classList.remove('show');$('#compare').classList.remove('show');$('#impactLabel').classList.remove('show');
  ['stability','collisions','peakLoad','reserve'].forEach(i=>$('#'+i).textContent='—');dots();
}
function add(){
  const n=$('#name').value.trim();if(!n)return toast('일정 이름을 입력해 주세요.');
  const values={name:n,type:$('#type').value,day:+$('#day').value,minutes:Math.max(10,+$('#minutes').value||60),priority:+$('#priority').value||2,flexible:$('#flexible').checked};
  if(editId){
    const t=S.tasks.find(x=>String(x.id)===editId);if(t)Object.assign(t,values);toast('일정을 수정했습니다.');
  }else{
    S.tasks.push(Object.assign({id:Date.now()+Math.random(),done:false},values));toast('일정을 추가했습니다.');
  }
  cancelEdit();save();render();week();reset();
}
function demo(){
  S.tasks=[
    {id:1,name:'영어 수행평가 준비',type:'수행평가',day:3,minutes:100,priority:3,flexible:true,done:false},
    {id:2,name:'미적분 학습지',type:'숙제',day:3,minutes:95,priority:3,flexible:true,done:false},
    {id:3,name:'물리 복습',type:'시험공부',day:2,minutes:70,priority:2,flexible:true,done:false},
    {id:4,name:'영어 단어',type:'숙제',day:1,minutes:45,priority:2,flexible:true,done:false},
    {id:5,name:'학원',type:'고정일정',day:3,minutes:60,priority:3,flexible:false,done:false},
    {id:6,name:'경제 정리',type:'시험공부',day:5,minutes:130,priority:2,flexible:true,done:false}
  ];cancelEdit();save();render();week();reset();toast('실사용 데모를 불러왔습니다.');
}
function show(a){
  last=a;$('#stability').textContent=a.stability;$('#collisions').textContent=a.collisions;$('#peakLoad').textContent=Math.round(a.peak*100)+'%';$('#reserve').textContent=a.reserve>=60?(a.reserve/60).toFixed(1)+'h':a.reserve+'m';week(a);graph(a);$('#result').classList.add('show');
  const t=$('#impactTitle'),p=$('#impactText');
  if(a.collisions){const w=a.impacts.slice().sort((x,y)=>y.deficit-x.deficit)[0];t.textContent='IMPACT DETECTED';t.classList.add('bad');p.textContent=K[w.day]+'요일 작업량이 한계보다 '+w.deficit+'분 많습니다. 잠재적 수면 손실은 약 '+a.sleepLoss.toFixed(1)+'시간입니다.'}
  else{t.textContent='TEST COMPLETE';t.classList.remove('bad');p.textContent='직접적인 일정 충돌은 발견되지 않았습니다. 현재 조건에서 실행 가능한 한 주입니다.'}
  $('#report').innerHTML=[['WEEK STABILITY',a.stability],['DEADLINE SAFETY',a.deadline],['SLEEP PROTECTION',a.sleepScore],['LOAD BALANCE',a.balance],['RESERVE CAPACITY',a.reserveScore]].map(x=>'<div class="score"><span class="micro-label">'+x[0]+'</span><b>'+x[1]+'%</b><div class="bar"><i style="width:'+x[1]+'%"></i></div></div>').join('')+'<div class="score"><span class="micro-label">TEST STATUS</span><b>'+(a.collisions?'FAIL':'PASS')+'</b><p>'+(a.collisions?'RECONSTRUCT YOUR WEEK.':'0 COLLISIONS — YOU MAY PROCEED.')+'</p></div>';
}
function run(){
  if(!S.tasks.some(t=>!t.done))return toast('먼저 활성 일정을 추가해 주세요.');
  S.testCount++;save();const a=analyze();$('#testId').textContent='TEST '+String(S.testCount).padStart(2,'0');
  const car=$('#testCar'),mark=$('#impactLabel');car.style.left='7%';mark.classList.remove('show');$('#result').classList.remove('show');dots();void car.offsetWidth;car.classList.add('run');
  setTimeout(()=>car.style.left='90%',40);
  setTimeout(()=>{car.classList.remove('run');if(a.collisions){const pos=7+83*(a.worst/6);car.style.left=pos+'%';mark.style.left=pos+'%';mark.classList.add('show');car.classList.add('crash');dots(a.worst,a.worst)}},1800);
  setTimeout(()=>{car.classList.remove('crash');show(a)},2250);
}
function reconstruct(){
  const before=analyze();if(!before.collisions)return toast('재배치가 필요한 충돌이 없습니다.');
  const tasks=JSON.parse(JSON.stringify(S.tasks)),c=caps(),load=D.map((_,i)=>tasks.filter(t=>t.day===i&&!t.done).reduce((a,t)=>a+t.minutes,0));let moves=0;
  for(let z=0;z<24;z++){
    const over=load.map((x,i)=>x-c[i]).findIndex(x=>x>0);if(over<0)break;
    const cand=tasks.filter(t=>t.day===over&&t.flexible&&!t.done).sort((a,b)=>a.priority-b.priority||b.minutes-a.minutes);let moved=false;
    for(const t of cand){
      let best=-1,bf=-Infinity;
      for(let d=over-1;d>=0;d--){const free=c[d]-load[d];if(free>=t.minutes&&free>bf){best=d;bf=free}}
      if(best>=0){load[over]-=t.minutes;t.day=best;load[best]+=t.minutes;moves++;moved=true;break}
    }
    if(!moved)break;
  }
  if(!moves)return toast('자동 재배치 가능한 여유가 없습니다.');
  S.tasks=tasks;save();render();week();const after=analyze();last=after;show(after);
  $('#compare').classList.add('show');$('#beforeCol').innerHTML='<h4>BEFORE</h4><div class="big">'+before.stability+'</div><div class="tiny">'+before.collisions+' collisions</div>';
  $('#afterCol').innerHTML='<h4>RECONSTRUCTED</h4><div class="big">'+after.stability+'</div><div class="tiny">'+after.collisions+' collisions</div><div class="delta">'+(after.stability-before.stability>=0?'+':'')+(after.stability-before.stability)+' stability</div>';
  toast(moves+'개 일정을 재배치했습니다.');
}
function analysis(){
  if(!last)return toast('먼저 테스트를 실행해 주세요.');
  const a=last,items=a.collisions?[
    ['PRIMARY CAUSE',K[a.worst]+'요일의 작업량이 처리 한계를 초과했습니다.'],
    ['TIME DEFICIT','충돌 날짜 전체에서 '+Math.round(a.sleepLoss*60)+'분의 초과 작업이 발생합니다.'],
    ['CASCADE EFFECT','이 초과분은 수면 감소 또는 다음 날 작업 이월로 이어질 가능성이 있습니다.'],
    ['RECOMMENDED CHANGE','AUTO RECONSTRUCT로 이동 가능한 작업을 마감 이전의 빈 날로 옮겨보세요.']
  ]:[
    ['RESULT','현재 입력값에서는 직접적인 충돌이 없습니다.'],
    ['RESERVE','이번 주 여유시간은 '+a.reserve+'분입니다.'],
    ['NEXT CHECK','예상 소요시간이 달라지면 다시 테스트해 안전여유를 확인하세요.']
  ];
  $('#analysisList').innerHTML=items.map(x=>'<div class="analysis-item"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('');$('#modal').classList.add('show');
}
function renderSnapshots(){
  const tray=$('#snapshotTray');if(!tray)return;
  tray.innerHTML=S.snapshots.length?S.snapshots.map(s=>'<div class="snapshot-card"><b>'+s.stability+'</b><span>STABILITY · '+esc(s.time)+'</span><small>'+s.collisions+' collision'+(s.collisions===1?'':'s')+' · peak '+s.peak+'%</small></div>').join(''):'';
}
function snapshot(){
  if(!last)return toast('먼저 테스트를 실행해 주세요.');
  const d=new Date(),entry={time:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),stability:last.stability,collisions:last.collisions,peak:Math.round(last.peak*100),reserve:last.reserve};
  S.snapshots=[entry,...S.snapshots].slice(0,4);save();renderSnapshots();toast('테스트 스냅샷을 저장했습니다.');
}
async function copyReport(){
  if(!last)return toast('먼저 테스트를 실행해 주세요.');
  const a=last,text='CRASH//WEEK TEST REPORT\nStability '+a.stability+'% · Collisions '+a.collisions+' · Peak '+Math.round(a.peak*100)+'% · Reserve '+a.reserve+'m\n'+(a.collisions?'Impact detected on '+K[a.worst]+'요일.':'0 collisions — executable week.');
  try{await navigator.clipboard.writeText(text);toast('리포트를 복사했습니다.')}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('리포트를 복사했습니다.')}
}
function applyPreset(name){
  const p={light:[90,150,7.5],normal:[120,180,7],exam:[180,240,7]}[name]||[120,180,7];
  $('#weekdayCap').value=p[0];$('#weekendCap').value=p[1];$('#sleep').value=p[2];$$('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));save();week();reset();toast(name==='exam'?'EXAM MODE 적용':'한계값을 적용했습니다.');
}

$('#addBtn').onclick=add;$('#cancelEditBtn').onclick=cancelEdit;$('#demoBtn').onclick=demo;
$('#clearBtn').onclick=()=>{S.tasks=[];cancelEdit();save();render();week();reset();toast('일정을 비웠습니다.')};
$('#runBtn').onclick=run;$('#reconstructBtn').onclick=reconstruct;$('#replayBtn').onclick=run;$('#analysisBtn').onclick=analysis;
$('#snapshotBtn').onclick=snapshot;$('#copyReportBtn').onclick=copyReport;
$('#modalClose').onclick=()=>$('#modal').classList.remove('show');$('#modal').onclick=e=>{if(e.target===$('#modal'))$('#modal').classList.remove('show')};
['weekdayCap','weekendCap','sleep'].forEach(id=>$('#'+id).onchange=()=>{save();week();reset();$$('[data-preset]').forEach(b=>b.classList.remove('active'))});
$$('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
$$('[data-scroll]').forEach(b=>b.onclick=()=>$(b.dataset.scroll).scrollIntoView({behavior:'smooth'}));
$('#weekdayCap').value=S.constraints.weekdayCap;$('#weekendCap').value=S.constraints.weekendCap;$('#sleep').value=S.constraints.sleep;
render();dots();week();renderSnapshots();graph(analyze());

let n=0,li=setInterval(()=>{n+=Math.max(1,Math.ceil((100-n)/5));if(n>=100){n=100;clearInterval(li);setTimeout(()=>$('#loader').classList.add('hide'),180)}$('#loaderNum').textContent=String(n).padStart(2,'0')},45);
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});$$('.reveal').forEach(e=>io.observe(e));
const cur=$('#cursor');addEventListener('pointermove',e=>{cur.style.left=e.clientX+'px';cur.style.top=e.clientY+'px'},{passive:true});
const hero=$('#heroArt'),scene=$('#vehicleScene');
if(hero&&scene&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;scene.style.setProperty('--ry',(x*16)+'deg');scene.style.setProperty('--rx',(-4-y*10)+'deg')});
  hero.addEventListener('pointerleave',()=>{scene.style.setProperty('--ry','7deg');scene.style.setProperty('--rx','-4deg')});
}
function clock(){const d=new Date();$('#clock').textContent='SYS '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}clock();setInterval(clock,30000);
})();